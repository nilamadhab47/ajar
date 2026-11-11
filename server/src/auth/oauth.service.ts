import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JsonWebKey } from "node:crypto";
import { DatabaseService } from "../database/database.service";
import { AuthService } from "./auth.service";
import {
  clearOauthCookie,
  createPkce,
  identityFromClaims,
  oauthCookie,
  openOauthCookie,
  readIdToken,
  sealOauthCookie,
  type OAuthProvider,
} from "./oauth-flow";
import { randomToken } from "./tokens";

type Start = { url: string; cookie: string };
type Finish = { location: string; refreshToken?: string; clearCookie: string };

const providers = {
  google: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    keys: "https://www.googleapis.com/oauth2/v3/certs",
    issuer: (issuer: string) => issuer === "https://accounts.google.com",
    clientId: "GOOGLE_CLIENT_ID",
    clientSecret: "GOOGLE_CLIENT_SECRET",
  },
  microsoft: {
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    keys: "https://login.microsoftonline.com/common/discovery/v2.0/keys",
    issuer: (issuer: string) =>
      /^https:\/\/login\.microsoftonline\.com\/[0-9a-f-]{36}\/v2\.0$/i.test(issuer),
    clientId: "MICROSOFT_CLIENT_ID",
    clientSecret: "MICROSOFT_CLIENT_SECRET",
  },
} as const;

/** Google and Microsoft authorization-code sign-in. */
@Injectable()
export class OauthService {
  private readonly keys = new Map<string, { keys: JsonWebKey[]; expiresAt: number }>();

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  /** Redirects the browser to the provider and stores the PKCE verifier in a cookie. */
  start(provider: OAuthProvider): Start {
    const client = this.client(provider);
    const pkce = createPkce();
    const state = randomToken();
    const redirectUri = `${this.apiOrigin()}/auth/${provider}/callback`;
    const params = new URLSearchParams({
      client_id: client.id,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: pkce.challenge,
      code_challenge_method: "S256",
    });
    if (provider === "microsoft") {
      params.set(
        "claims",
        JSON.stringify({ id_token: { email: null, xms_edov: null } }),
      );
    }
    const sealed = sealOauthCookie(
      { provider, state, verifier: pkce.verifier },
      this.secret(),
    );
    return { url: `${providers[provider].authorize}?${params.toString()}`, cookie: oauthCookie(sealed) };
  }

  /** Completes the provider redirect and opens a session when the account may be linked. */
  async finish(
    provider: OAuthProvider,
    query: { code?: string; state?: string; error?: string },
    sealedCookie: string | undefined,
    userAgent: string | undefined,
  ): Promise<Finish> {
    const clearCookie = clearOauthCookie();
    if (query.error || !query.code || !query.state || !sealedCookie) {
      return { location: this.failure("oauth_rejected"), clearCookie };
    }
    const saved = openOauthCookie(sealedCookie, this.secret());
    if (!saved || saved.provider !== provider || saved.state !== query.state) {
      return { location: this.failure("oauth_rejected"), clearCookie };
    }

    try {
      const client = this.client(provider);
      const idToken = await this.exchange(provider, client, query.code, saved.verifier);
      const claims = readIdToken(idToken, await this.jwks(provider), {
        audience: client.id,
        issuer: providers[provider].issuer,
      });
      const identity = identityFromClaims(provider, claims);
      if (!identity.subject) return { location: this.failure("oauth_rejected"), clearCookie };
      const userId = await this.linkAccount(provider, identity);
      if (!userId) return { location: this.failure("email_unverified"), clearCookie };
      const grant = await this.auth.openSession(userId, userAgent);
      const location = `${this.appOrigin()}/login#access_token=${encodeURIComponent(grant.accessToken)}&expires_in=${grant.expiresIn}`;
      return { location, refreshToken: grant.refreshToken, clearCookie };
    } catch {
      return { location: this.failure("oauth_rejected"), clearCookie };
    }
  }

  private async linkAccount(
    provider: OAuthProvider,
    identity: { subject: string; email: string | null; emailVerified: boolean; name: string | null },
  ): Promise<string | null> {
    return this.database.transaction(async (query) => {
      const existing = await query<{ user_id: string }>(
        `select user_id from oauth_accounts
         where provider = $1 and provider_user_id = $2`,
        [provider, identity.subject],
      );
      const linked = existing.rows[0]?.user_id;
      if (linked) return linked;
      if (!identity.email || !identity.emailVerified) return null;

      const user = await query<{ id: string }>(
        `insert into users (email, display_name)
         values ($1, $2)
         on conflict (email) do update set email = users.email
         returning id`,
        [identity.email, identity.name || nameFromEmail(identity.email)],
      );
      const userId = user.rows[0]?.id;
      if (!userId) return null;
      await query(
        `insert into oauth_accounts (user_id, provider, provider_user_id)
         values ($1, $2, $3)
         on conflict (provider, provider_user_id) do nothing`,
        [userId, provider, identity.subject],
      );
      return userId;
    });
  }

  private async exchange(
    provider: OAuthProvider,
    client: { id: string; secret: string },
    code: string,
    verifier: string,
  ): Promise<string> {
    const response = await fetch(providers[provider].token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${this.apiOrigin()}/auth/${provider}/callback`,
        client_id: client.id,
        client_secret: client.secret,
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("token exchange failed");
    const body = (await response.json()) as { id_token?: unknown };
    if (typeof body.id_token !== "string") throw new Error("token exchange failed");
    return body.id_token;
  }

  private async jwks(provider: OAuthProvider): Promise<JsonWebKey[]> {
    const cached = this.keys.get(provider);
    if (cached && cached.expiresAt > Date.now()) return cached.keys;
    const response = await fetch(providers[provider].keys, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("keys unavailable");
    const body = (await response.json()) as { keys?: JsonWebKey[] };
    const keys = body.keys ?? [];
    this.keys.set(provider, { keys, expiresAt: Date.now() + 60 * 60 * 1000 });
    return keys;
  }

  private client(provider: OAuthProvider): { id: string; secret: string } {
    const spec = providers[provider];
    const id = this.config.get<string>(spec.clientId);
    const secret = this.config.get<string>(spec.clientSecret);
    if (!id || !secret) {
      throw new ServiceUnavailableException(`${provider} sign-in is not configured`);
    }
    return { id, secret };
  }

  private secret(): string {
    const secret = this.config.get<string>("JWT_SECRET");
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException("JWT_SECRET is not configured");
    }
    return secret;
  }

  private apiOrigin(): string {
    return (this.config.get<string>("API_ORIGIN") ?? "http://localhost:4000").replace(/\/$/, "");
  }

  private appOrigin(): string {
    return (this.config.get<string>("APP_ORIGIN") ?? "http://localhost:3000").replace(/\/$/, "");
  }

  private failure(code: "oauth_rejected" | "email_unverified"): string {
    return `${this.appOrigin()}/login?error=${code}`;
  }
}

/** Uses the mailbox name when the provider does not send a display name. */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return local ? local.slice(0, 80) : "New member";
}
