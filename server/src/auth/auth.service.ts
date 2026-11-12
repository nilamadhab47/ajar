import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import { sendMagicLink, sendPreparedMessage } from "./mailer";
import { buildAccountExistsMessage, buildPasswordConfirmMessage } from "./password-message";
import { dummyPasswordHash, hashPassword, prepareDummyPasswordHash, verifyPassword } from "./passwords";
import { RequestRateLimit } from "./rate-limit";
import {
  accessTokenTtlSeconds,
  randomToken,
  readAccessToken,
  signAccessToken,
  tokenHash,
} from "./tokens";

export type SessionGrant = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  family_id: string;
  expires_at: Date;
  revoked_at: Date | null;
};

/** Magic links, passwords, and rotating sessions. Office membership is a later issue. */
@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly limits = new RequestRateLimit();

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  /** Prepares the unknown-account password check before the first sign-in. */
  async onModuleInit(): Promise<void> {
    await prepareDummyPasswordHash();
  }

  /** Stores a hashed 15-minute link and sends it. Every accepted email gets the same result. */
  async requestMagicLink(email: string, clientKey: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (!this.limits.allow(`ip:${clientKey}`) || !this.limits.allow(`email:${normalized}`)) {
      throw new HttpException({ ok: false }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const token = randomToken();
    await this.forgetExpiredLinks();
    await this.database.query(
      `insert into magic_links (email, token_hash, expires_at)
       values ($1, $2, now() + interval '15 minutes')`,
      [normalized, tokenHash(token)],
    );

    try {
      await sendMagicLink(this.config, normalized, token);
    } catch (error) {
      this.logger.error(
        error instanceof Error ? `Magic link mail failed: ${error.message}` : "Magic link mail failed",
      );
    }
  }

  /** Consumes a link once and opens a session for that email. */
  async consumeMagicLink(token: string, userAgent: string | undefined): Promise<SessionGrant> {
    const secret = this.jwtSecret();
    return this.database.transaction(async (query) => {
      const link = await query<{ email: string; password_hash: string | null }>(
        `update magic_links
         set used_at = now()
         where token_hash = $1
           and used_at is null
           and expires_at > now()
         returning email, password_hash`,
        [tokenHash(token)],
      );
      const email = link.rows[0]?.email;
      if (!email) throw new UnauthorizedException({ ok: false });

      const user = await query<{ id: string }>(
        `insert into users (email, display_name)
         values ($1, $2)
         on conflict (email) do update set email = users.email
         returning id`,
        [email, displayNameFromEmail(email)],
      );
      const userId = user.rows[0]?.id;
      if (!userId) throw new UnauthorizedException({ ok: false });
      if (link.rows[0]?.password_hash) {
        await query(
          `update users
           set password_hash = $2, updated_at = now()
           where id = $1 and password_hash is null`,
          [userId, link.rows[0].password_hash],
        );
      }
      await query("update magic_links set password_hash = null where token_hash = $1", [
        tokenHash(token),
      ]);

      return this.startSession(query, userId, userAgent, secret);
    });
  }

  /** Sends a confirmation link for a new person. An existing address gets the same response and a different email. */
  async requestPasswordSignUp(email: string, password: string, clientKey: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (
      !this.limits.allow(`password-ip:${clientKey}`) ||
      !this.limits.allow(`password-email:${normalized}`)
    ) {
      throw new HttpException({ ok: false }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const passwordHash = await hashPassword(password);
    const existing = await this.database.query<{ id: string }>(
      "select id from users where email = $1",
      [normalized],
    );
    if (existing.rows[0]) {
      await this.sendQuietly(normalized, buildAccountExistsMessage());
      return;
    }

    const token = randomToken();
    await this.forgetExpiredLinks();
    await this.database.query(
      `insert into magic_links (email, token_hash, expires_at, password_hash)
       values ($1, $2, now() + interval '15 minutes', $3)`,
      [normalized, tokenHash(token), passwordHash],
    );
    const origin = this.config.get<string>("APP_ORIGIN") ?? "http://localhost:3000";
    await this.sendQuietly(normalized, buildPasswordConfirmMessage(origin, token));
  }

  /** Signs in a person who already confirmed a password. Unknown and wrong passwords look the same. */
  async signInWithPassword(
    email: string,
    password: string,
    clientKey: string,
    userAgent: string | undefined,
  ): Promise<SessionGrant> {
    const normalized = email.trim().toLowerCase();
    if (
      !this.limits.allow(`sign-in-ip:${clientKey}`) ||
      !this.limits.allow(`sign-in-email:${normalized}`)
    ) {
      throw new HttpException({ ok: false }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const found = await this.database.query<{ id: string; password_hash: string | null }>(
      "select id, password_hash from users where email = $1",
      [normalized],
    );
    const stored = found.rows[0]?.password_hash ?? (await dummyPasswordHash());
    const matches = await verifyPassword(password, stored);
    const userId = found.rows[0]?.id;
    if (!userId || !found.rows[0]?.password_hash || !matches) {
      throw new UnauthorizedException({ ok: false });
    }

    const secret = this.jwtSecret();
    return this.database.transaction((query) =>
      this.startSession(query, userId, userAgent, secret),
    );
  }

  /** Rotates the refresh token. A reused token revokes the whole session family. */
  async refresh(refreshToken: string, userAgent: string | undefined): Promise<SessionGrant> {
    const secret = this.jwtSecret();
    const outcome = await this.database.transaction(async (query) => {
      const found = await query<SessionRow>(
        `select id, user_id, family_id, expires_at, revoked_at
         from sessions
         where refresh_token_hash = $1
         for update`,
        [tokenHash(refreshToken)],
      );
      const session = found.rows[0];
      if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
        return { kind: "reject" as const };
      }

      if (session.revoked_at) {
        await query(
          `update sessions
           set revoked_at = now()
           where family_id = $1 and revoked_at is null`,
          [session.family_id],
        );
        return { kind: "reject" as const };
      }

      await query("update sessions set revoked_at = now() where id = $1", [session.id]);
      const grant = await this.insertSession(
        query,
        session.user_id,
        session.family_id,
        userAgent,
        secret,
      );
      return { kind: "grant" as const, grant };
    });
    if (outcome.kind === "reject") throw new UnauthorizedException({ ok: false });
    return outcome.grant;
  }

  /** Opens a new session family for a user who already proved who they are. */
  async openSession(userId: string, userAgent: string | undefined): Promise<SessionGrant> {
    const secret = this.jwtSecret();
    return this.database.transaction(async (query) => {
      const family = await query<{ id: string }>("select uuidv7() as id");
      const familyId = family.rows[0]?.id;
      if (!familyId) throw new UnauthorizedException({ ok: false });
      return this.insertSession(query, userId, familyId, userAgent, secret);
    });
  }

  /** Revokes the session that matches the refresh cookie. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.database.query(
      `update sessions
       set revoked_at = now()
       where refresh_token_hash = $1 and revoked_at is null`,
      [tokenHash(refreshToken)],
    );
  }

  /** Revokes every session for the access token's user. */
  async logoutAll(accessToken: string): Promise<void> {
    const claims = this.readUser(accessToken);
    await this.database.query(
      `update sessions
       set revoked_at = now()
       where user_id = $1 and revoked_at is null`,
      [claims.sub],
    );
  }

  private async startSession(
    query: DatabaseService["query"],
    userId: string,
    userAgent: string | undefined,
    secret: string,
  ): Promise<SessionGrant> {
    const family = await query<{ id: string }>("select uuidv7() as id");
    const familyId = family.rows[0]?.id;
    if (!familyId) throw new UnauthorizedException({ ok: false });
    return this.insertSession(query, userId, familyId, userAgent, secret);
  }

  /** Drops unused links after they expire. There is no separate scheduler yet. */
  private async forgetExpiredLinks(): Promise<void> {
    await this.database.query(
      "delete from magic_links where used_at is null and expires_at <= now()",
    );
  }

  private async sendQuietly(
    email: string,
    message: { subject: string; text: string; html: string },
  ): Promise<void> {
    try {
      await sendPreparedMessage(this.config, email, message);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : "Mail failed");
    }
  }

  private async insertSession(
    query: DatabaseService["query"],
    userId: string,
    familyId: string,
    userAgent: string | undefined,
    secret: string,
  ): Promise<SessionGrant> {
    const refreshToken = randomToken();
    const inserted = await query<{ id: string }>(
      `insert into sessions (user_id, refresh_token_hash, family_id, expires_at, user_agent)
       values ($1, $2, $3, now() + interval '30 days', $4)
       returning id`,
      [userId, tokenHash(refreshToken), familyId, userAgent?.slice(0, 500) ?? null],
    );
    const sessionId = inserted.rows[0]?.id;
    if (!sessionId) throw new UnauthorizedException({ ok: false });
    return {
      accessToken: signAccessToken({ sub: userId, sid: sessionId }, secret),
      expiresIn: accessTokenTtlSeconds,
      refreshToken,
    };
  }

  private readUser(accessToken: string): { sub: string; sid: string } {
    try {
      return readAccessToken(accessToken, this.jwtSecret());
    } catch {
      throw new UnauthorizedException({ ok: false });
    }
  }

  private jwtSecret(): string {
    const secret = this.config.get<string>("JWT_SECRET");
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException("JWT_SECRET is not configured");
    }
    return secret;
  }
}

/** Uses the mailbox name as a first display name. */
function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return local ? local.slice(0, 80) : "New member";
}
