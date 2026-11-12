import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import {
  clearRefreshCookie,
  readCookie,
  refreshCookie,
  refreshCookieName,
} from "./tokens";

/** Magic-link sign-in, refresh, and logout. */
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  /** Accepts an email and always returns the same body when the address is well formed. */
  @Post("magic-link")
  @HttpCode(200)
  async requestLink(@Body() body: { email?: unknown }, @Req() request: Request) {
    if (typeof body?.email !== "string" || !isEmail(body.email)) {
      throw new BadRequestException({ ok: false });
    }
    await this.auth.requestMagicLink(body.email, clientKey(request));
    return { ok: true };
  }

  /** Accepts an email and password. A new address and an existing address get the same body. */
  @Post("password/sign-up")
  @HttpCode(200)
  async signUp(
    @Body() body: { email?: unknown; password?: unknown },
    @Req() request: Request,
  ) {
    if (typeof body?.email !== "string" || !isEmail(body.email) || !isPassword(body.password)) {
      throw new BadRequestException({ ok: false });
    }
    await this.auth.requestPasswordSignUp(body.email, body.password, clientKey(request));
    return { ok: true };
  }

  /** Signs in with email and password and sets the refresh cookie. */
  @Post("password/sign-in")
  @HttpCode(200)
  async signIn(
    @Body() body: { email?: unknown; password?: unknown },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (typeof body?.email !== "string" || !isEmail(body.email) || !isPassword(body.password)) {
      throw new BadRequestException({ ok: false });
    }
    const grant = await this.auth.signInWithPassword(
      body.email,
      body.password,
      clientKey(request),
      userAgent(request),
    );
    response.append("Set-Cookie", refreshCookie(grant.refreshToken));
    return { accessToken: grant.accessToken, expiresIn: grant.expiresIn };
  }

  /** Exchanges a single-use link for an access token and a refresh cookie. */
  @Post("magic-link/consume")
  @HttpCode(200)
  async consume(
    @Body() body: { token?: unknown },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (typeof body?.token !== "string" || body.token.length < 20) {
      throw new BadRequestException({ ok: false });
    }
    const grant = await this.auth.consumeMagicLink(body.token, userAgent(request));
    response.append("Set-Cookie", refreshCookie(grant.refreshToken));
    return { accessToken: grant.accessToken, expiresIn: grant.expiresIn };
  }

  /** Issues a new access token and replaces the refresh cookie. */
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const current = readCookie(request.headers.cookie, refreshCookieName);
    if (!current) {
      response.append("Set-Cookie", clearRefreshCookie());
      throw new UnauthorizedException({ ok: false });
    }
    try {
      const grant = await this.auth.refresh(current, userAgent(request));
      response.append("Set-Cookie", refreshCookie(grant.refreshToken));
      return { accessToken: grant.accessToken, expiresIn: grant.expiresIn };
    } catch (error) {
      response.append("Set-Cookie", clearRefreshCookie());
      throw error;
    }
  }

  /** Revokes the current session and clears the refresh cookie. */
  @Post("logout")
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(readCookie(request.headers.cookie, refreshCookieName));
    response.append("Set-Cookie", clearRefreshCookie());
  }

  /** Revokes every session for the signed-in user. */
  @Post("logout-all")
  @HttpCode(204)
  async logoutAll(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    if (!token) throw new BadRequestException({ ok: false });
    await this.auth.logoutAll(token);
    response.append("Set-Cookie", clearRefreshCookie());
  }
}

/** Requires a password long enough to be a secret, and short enough to hash safely. */
function isPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 10 && value.length <= 128;
}

/** Accepts a plain email address and rejects anything that could be a header. */
function isEmail(value: string): boolean {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Uses the socket address so a forwarded header cannot pick a new limit bucket. */
function clientKey(request: Request): string {
  return request.socket.remoteAddress ?? "unknown";
}

/** Keeps the user agent short enough for the session row. */
function userAgent(request: Request): string | undefined {
  const value = request.headers["user-agent"];
  return typeof value === "string" ? value : undefined;
}
