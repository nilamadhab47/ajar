import { Controller, HttpCode, Inject, NotFoundException, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { CurrentUserService } from "../auth/current-user";
import { FloorSessionService } from "./floor-session.service";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A one-time ticket for the floor socket. The access token stays on the API request. */
@Controller()
export class FloorSessionController {
  constructor(
    @Inject(CurrentUserService) private readonly current: CurrentUserService,
    @Inject(FloorSessionService) private readonly sessions: FloorSessionService,
  ) {}

  @Post("floors/:floorId/session")
  @HttpCode(200)
  async open(@Req() request: Request, @Param("floorId") floorId: string) {
    const person = await this.current.require(request);
    if (!uuidPattern.test(floorId)) throw new NotFoundException({ ok: false });
    return this.sessions.open(person.id, floorId);
  }
}
