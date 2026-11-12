import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { CurrentUserService } from "../auth/current-user";
import { officeRole } from "./membership-rules";
import { MembershipService } from "./membership.service";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Invitations and role changes for an office. */
@Controller()
export class MembershipController {
  constructor(
    @Inject(CurrentUserService) private readonly current: CurrentUserService,
    @Inject(MembershipService) private readonly membership: MembershipService,
  ) {}

  /** Invites someone by email. Owners and admins can invite. Only an owner can invite an owner. */
  @Post("workspaces/:workspaceId/invites")
  @HttpCode(201)
  async invite(
    @Req() request: Request,
    @Param("workspaceId") workspaceId: string,
    @Body() body: { email?: unknown; role?: unknown },
  ) {
    const person = await this.current.require(request);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = officeRole(body?.role);
    if (!isUuid(workspaceId) || !isEmail(email) || !role) throw new BadRequestException({ ok: false });
    return this.membership.createInvite(person.id, workspaceId, email, role);
  }

  /** Accepts an invitation when the signed-in email matches. */
  @Post("invites/accept")
  async accept(@Req() request: Request, @Body() body: { token?: unknown }) {
    const person = await this.current.require(request);
    const token = typeof body?.token === "string" ? body.token : "";
    if (token.length < 20 || token.length > 200) throw new BadRequestException({ ok: false });
    return this.membership.acceptInvite(person.id, token);
  }

  /** Lists the people in an office the caller belongs to. */
  @Get("workspaces/:workspaceId/members")
  async members(@Req() request: Request, @Param("workspaceId") workspaceId: string) {
    const person = await this.current.require(request);
    if (!isUuid(workspaceId)) throw new BadRequestException({ ok: false });
    return { members: await this.membership.listMembers(person.id, workspaceId) };
  }

  /** Changes one person's role. The last owner stays an owner. */
  @Patch("workspaces/:workspaceId/members/:userId")
  async changeRole(
    @Req() request: Request,
    @Param("workspaceId") workspaceId: string,
    @Param("userId") userId: string,
    @Body() body: { role?: unknown },
  ) {
    const person = await this.current.require(request);
    const role = officeRole(body?.role);
    if (!isUuid(workspaceId) || !isUuid(userId) || !role) throw new BadRequestException({ ok: false });
    return this.membership.changeRole(person.id, workspaceId, userId, role);
  }

  /** Removes a person from the office. The last owner cannot be removed. */
  @Delete("workspaces/:workspaceId/members/:userId")
  @HttpCode(204)
  async remove(
    @Req() request: Request,
    @Param("workspaceId") workspaceId: string,
    @Param("userId") userId: string,
  ) {
    const person = await this.current.require(request);
    if (!isUuid(workspaceId) || !isUuid(userId)) throw new BadRequestException({ ok: false });
    await this.membership.removeMember(person.id, workspaceId, userId);
  }
}

/** Accepts a UUID from a route. */
function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

/** Accepts a plain email address. */
function isEmail(value: string): boolean {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
