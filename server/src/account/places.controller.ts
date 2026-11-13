import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Put,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { CurrentUserService } from "../auth/current-user";
import { optionalLine } from "./account-input";
import { placeTarget } from "./places";
import { PlacesService } from "./places.service";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Area names and the one line left on an area, a room, or a desk. */
@Controller()
export class PlacesController {
  constructor(
    @Inject(CurrentUserService) private readonly current: CurrentUserService,
    @Inject(PlacesService) private readonly places: PlacesService,
  ) {}

  /** Lists the labels for an office the caller belongs to. */
  @Get("workspaces/:workspaceId/places")
  async list(@Req() request: Request, @Param("workspaceId") workspaceId: string) {
    const person = await this.current.require(request);
    if (!uuidPattern.test(workspaceId)) throw new BadRequestException({ ok: false });
    return { places: await this.places.listPlaces(person.id, workspaceId) };
  }

  /** Saves one label. Only an owner can change it. */
  @Put("workspaces/:workspaceId/places/:kind/:placeId")
  async save(
    @Req() request: Request,
    @Param("workspaceId") workspaceId: string,
    @Param("kind") kind: string,
    @Param("placeId") placeId: string,
    @Body() body: { name?: unknown; note?: unknown },
  ) {
    const person = await this.current.require(request);
    const target = placeTarget(kind, placeId);
    const note = optionalLine(body?.note, 140);
    const name = target?.kind === "area" ? optionalLine(body?.name, 40) : blankOnly(body?.name);
    if (!uuidPattern.test(workspaceId) || !target || name === undefined || note === undefined) {
      throw new BadRequestException({ ok: false });
    }
    return this.places.savePlace(person.id, workspaceId, target.kind, target.id, name, note);
  }
}

/** A room or desk keeps its map name. A blank name is absent. Anything else is rejected. */
function blankOnly(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  return value.trim() ? undefined : null;
}
