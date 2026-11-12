import { Controller, Get, Inject, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { OauthService } from "./oauth.service";
import { readCookie, refreshCookie } from "./tokens";

/** Starts and finishes Google and Microsoft sign-in. */
@Controller("auth")
export class OauthController {
  constructor(@Inject(OauthService) private readonly oauth: OauthService) {}

  /** Sends the browser to Google with a PKCE challenge. */
  @Get("google")
  google(@Res() response: Response) {
    const start = this.oauth.start("google");
    response.append("Set-Cookie", start.cookie);
    response.redirect(start.url);
  }

  /** Sends the browser to Microsoft with a PKCE challenge. */
  @Get("microsoft")
  microsoft(@Res() response: Response) {
    const start = this.oauth.start("microsoft");
    response.append("Set-Cookie", start.cookie);
    response.redirect(start.url);
  }

  /** Finishes Google sign-in and redirects back to the office. */
  @Get("google/callback")
  googleCallback(
    @Query() query: { code?: string; state?: string; error?: string },
    @Req() request: Request,
    @Res() response: Response,
  ) {
    return this.callback("google", query, request, response);
  }

  /** Finishes Microsoft sign-in and redirects back to the office. */
  @Get("microsoft/callback")
  microsoftCallback(
    @Query() query: { code?: string; state?: string; error?: string },
    @Req() request: Request,
    @Res() response: Response,
  ) {
    return this.callback("microsoft", query, request, response);
  }

  private async callback(
    provider: "google" | "microsoft",
    query: { code?: string; state?: string; error?: string },
    request: Request,
    response: Response,
  ) {
    const result = await this.oauth.finish(
      provider,
      query,
      readCookie(request.headers.cookie, "ajar_oauth"),
      typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : undefined,
    );
    response.append("Set-Cookie", result.clearCookie);
    if (result.refreshToken) response.append("Set-Cookie", refreshCookie(result.refreshToken));
    response.redirect(result.location);
  }
}
