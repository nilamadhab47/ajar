import { Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { DatabaseService } from "../database/database.service";
import { readAccessToken } from "./tokens";

/** The person behind a valid access token. */
export type SignedInUser = { id: string };

/** Reads the bearer token and checks that the session is still open. */
@Injectable()
export class CurrentUserService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  /** Returns the signed-in person, or rejects the request. */
  async require(request: Request): Promise<SignedInUser> {
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    if (!token) throw new UnauthorizedException({ ok: false });

    let claims: { sub: string; sid: string };
    try {
      claims = readAccessToken(token, this.secret());
    } catch {
      throw new UnauthorizedException({ ok: false });
    }

    const session = await this.database.query(
      `select 1 from sessions
       where id = $1 and user_id = $2 and revoked_at is null and expires_at > now()`,
      [claims.sid, claims.sub],
    );
    if (!session.rowCount) throw new UnauthorizedException({ ok: false });
    return { id: claims.sub };
  }

  private secret(): string {
    const secret = this.config.get<string>("JWT_SECRET");
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException("JWT_SECRET is not configured");
    }
    return secret;
  }
}
