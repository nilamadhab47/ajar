import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { CurrentUserService } from "../auth/current-user";
import { avatarPatch, doorState, officeName, presenceStatus } from "./account-input";
import { AccountService } from "./account.service";

/** The signed-in person and the offices they belong to. */
@Controller()
export class AccountController {
  constructor(
    @Inject(CurrentUserService) private readonly current: CurrentUserService,
    @Inject(AccountService) private readonly accounts: AccountService,
  ) {}

  /** Creates a company and makes the caller the owner of its first office. */
  @Post("organizations")
  async createOrganization(
    @Req() request: Request,
    @Body() body: { name?: unknown; officeName?: unknown },
  ) {
    const person = await this.current.require(request);
    const company = officeName(body?.name);
    if (!company) throw new BadRequestException({ ok: false });
    const office = body?.officeName === undefined ? company : officeName(body.officeName);
    if (!office) throw new BadRequestException({ ok: false });
    return this.accounts.createOrganization(person.id, company, office);
  }

  /** Lists offices for the signed-in person, including the role in each one. */
  @Get("workspaces")
  async listOffices(@Req() request: Request) {
    const person = await this.current.require(request);
    return { offices: await this.accounts.listOffices(person.id) };
  }

  /** Returns the signed-in person. */
  @Get("users/me")
  async me(@Req() request: Request) {
    const person = await this.current.require(request);
    return this.accounts.currentPerson(person.id);
  }

  /** Saves the profile fields the office client sends. */
  @Patch("users/me")
  async updateMe(
    @Req() request: Request,
    @Body() body: { displayName?: unknown; status?: unknown; avatar?: unknown; door?: unknown },
  ) {
    const person = await this.current.require(request);
    const patch: { displayName?: string; status?: string; avatar?: Record<string, unknown>; door?: string } = {};
    if (body?.displayName !== undefined) {
      const name = officeName(body.displayName);
      if (!name) throw new BadRequestException({ ok: false });
      patch.displayName = name;
    }
    if (body?.status !== undefined) {
      const status = presenceStatus(body.status);
      if (!status) throw new BadRequestException({ ok: false });
      patch.status = status;
    }
    if (body?.avatar !== undefined) {
      const avatar = avatarPatch(body.avatar);
      if (!avatar) throw new BadRequestException({ ok: false });
      patch.avatar = avatar;
    }
    if (body?.door !== undefined) {
      const door = doorState(body.door);
      if (!door) throw new BadRequestException({ ok: false });
      patch.door = door;
    }
    return this.accounts.updatePerson(person.id, patch);
  }
}
