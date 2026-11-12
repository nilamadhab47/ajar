import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { QueryResult, QueryResultRow } from "pg";
import { DatabaseService } from "../database/database.service";
import { sendPreparedMessage } from "../auth/mailer";
import { randomToken, tokenHash } from "../auth/tokens";
import { buildInviteMessage, inviteLifetime } from "./invite-message";
import { canChangeRole, canInvite, canRemove, type OfficeRole } from "./membership-rules";

type Query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) => Promise<QueryResult<T>>;

type CreatedInvite = {
  id: string;
  email: string;
  role: OfficeRole;
  expiresAt: Date;
  mailed: boolean;
};

/** Invitations and membership changes for one office. */
@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  /** Invites an email into an office. A guest cannot grant owner, and only owners can. */
  async createInvite(
    actorId: string,
    workspaceId: string,
    email: string,
    role: OfficeRole,
  ): Promise<CreatedInvite> {
    const token = randomToken();
    const created = await this.database.transaction(async (query) => {
      const actor = await this.actor(query, workspaceId, actorId);
      if (!canInvite(actor.role, role)) throw new ForbiddenException({ ok: false });
      await query(
        `update invites
         set expires_at = now()
         where workspace_id = $1 and email = $2 and accepted_at is null and expires_at > now()`,
        [workspaceId, email],
      );
      const invite = await query<{ id: string; expires_at: Date }>(
        `insert into invites (workspace_id, email, role, token_hash, expires_at, invited_by)
         values ($1, $2, $3, $4, now() + $6::interval, $5)
         returning id, expires_at`,
        [workspaceId, email, role, tokenHash(token), actorId, inviteLifetime],
      );
      const row = invite.rows[0];
      if (!row) throw new Error("invite was not created");
      await this.audit(query, workspaceId, actorId, "invite.created", email, { role });
      return { id: row.id, expiresAt: row.expires_at, officeName: actor.officeName, inviterName: actor.displayName };
    });

    const origin = this.config.get<string>("APP_ORIGIN") ?? "http://localhost:3000";
    let mailed = true;
    try {
      await sendPreparedMessage(
        this.config,
        email,
        buildInviteMessage(origin, token, created.officeName, created.inviterName, role),
      );
    } catch (error) {
      mailed = false;
      this.logger.error(error instanceof Error ? error.message : "Invite mail failed");
    }
    return { id: created.id, email, role, expiresAt: created.expiresAt, mailed };
  }

  /** Accepts an invite when the signed-in person's email matches. */
  async acceptInvite(userId: string, token: string): Promise<{ officeId: string; role: OfficeRole }> {
    return this.database.transaction(async (query) => {
      const invite = await query<{
        id: string;
        workspace_id: string;
        email: string;
        role: OfficeRole;
        accepted_at: Date | null;
        expires_at: Date;
      }>(
        `select id, workspace_id, email, role, accepted_at, expires_at
         from invites
         where token_hash = $1
         for update`,
        [tokenHash(token)],
      );
      const row = invite.rows[0];
      if (!row || row.accepted_at || new Date(row.expires_at).getTime() <= Date.now()) {
        throw new UnauthorizedException({ ok: false });
      }
      const person = await query<{ email: string }>("select email from users where id = $1", [userId]);
      const email = person.rows[0]?.email;
      if (!email || email.toLowerCase() !== row.email.toLowerCase()) {
        throw new ForbiddenException({ ok: false });
      }
      const existing = await query(
        "select 1 from workspace_members where workspace_id = $1 and user_id = $2",
        [row.workspace_id, userId],
      );
      if (existing.rowCount) throw new ConflictException({ ok: false });

      await query(
        `insert into workspace_members (workspace_id, user_id, role) values ($1, $2, $3)`,
        [row.workspace_id, userId, row.role],
      );
      await query(
        "update invites set accepted_at = now(), accepted_by = $2 where id = $1",
        [row.id, userId],
      );
      await this.audit(query, row.workspace_id, userId, "invite.accepted", userId, { role: row.role });
      return { officeId: row.workspace_id, role: row.role };
    });
  }

  /** Lists the people in an office for someone who already belongs there. */
  async listMembers(actorId: string, workspaceId: string) {
    const actor = await this.database.query(
      "select 1 from workspace_members where workspace_id = $1 and user_id = $2",
      [workspaceId, actorId],
    );
    if (!actor.rowCount) throw new NotFoundException({ ok: false });
    const rows = await this.database.query<{
      id: string;
      email: string;
      display_name: string;
      role: OfficeRole;
    }>(
      `select u.id, u.email, u.display_name, m.role
       from workspace_members m
       join users u on u.id = m.user_id
       where m.workspace_id = $1
       order by m.created_at`,
      [workspaceId],
    );
    return rows.rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
    }));
  }

  /** Changes a member's role. The last owner cannot be demoted. */
  async changeRole(actorId: string, workspaceId: string, targetUserId: string, role: OfficeRole) {
    return this.database.transaction(async (query) => {
      const actor = await this.actor(query, workspaceId, actorId);
      const target = await this.lockedMember(query, workspaceId, targetUserId);
      if (target.role === role) return { userId: targetUserId, role };
      if (!canChangeRole(actor.role, target.role, role)) throw new ForbiddenException({ ok: false });
      if (target.role === "owner") await this.guardLastOwner(query, workspaceId);
      await query(
        "update workspace_members set role = $3 where workspace_id = $1 and user_id = $2",
        [workspaceId, targetUserId, role],
      );
      await this.audit(query, workspaceId, actorId, "member.role_changed", targetUserId, {
        from: target.role,
        to: role,
      });
      return { userId: targetUserId, role };
    });
  }

  /** Removes a member. The last owner cannot be removed. */
  async removeMember(actorId: string, workspaceId: string, targetUserId: string): Promise<void> {
    await this.database.transaction(async (query) => {
      const actor = await this.actor(query, workspaceId, actorId);
      const target = await this.lockedMember(query, workspaceId, targetUserId);
      if (!canRemove(actor.role, target.role, actorId === targetUserId)) {
        throw new ForbiddenException({ ok: false });
      }
      if (target.role === "owner") await this.guardLastOwner(query, workspaceId);
      await query("delete from workspace_members where workspace_id = $1 and user_id = $2", [
        workspaceId,
        targetUserId,
      ]);
      await this.audit(query, workspaceId, actorId, "member.removed", targetUserId, {
        role: target.role,
      });
    });
  }

  /** Loads the caller's role and the office name, or hides an office they cannot see. */
  private async actor(query: Query, workspaceId: string, actorId: string) {
    const found = await query<{ role: OfficeRole; office_name: string; display_name: string }>(
      `select m.role, w.office_name, u.display_name
       from workspace_members m
       join workspaces w on w.id = m.workspace_id
       join users u on u.id = m.user_id
       where m.workspace_id = $1 and m.user_id = $2`,
      [workspaceId, actorId],
    );
    const actor = found.rows[0];
    if (!actor) throw new NotFoundException({ ok: false });
    return { role: actor.role, officeName: actor.office_name, displayName: actor.display_name };
  }

  /** Locks one membership row. */
  private async lockedMember(query: Query, workspaceId: string, userId: string) {
    const found = await query<{ role: OfficeRole }>(
      `select role from workspace_members
       where workspace_id = $1 and user_id = $2
       for update`,
      [workspaceId, userId],
    );
    const member = found.rows[0];
    if (!member) throw new NotFoundException({ ok: false });
    return member;
  }

  /** Stops a change that would leave the office with no owner. */
  private async guardLastOwner(query: Query, workspaceId: string): Promise<void> {
    const owners = await query(
      `select user_id from workspace_members
       where workspace_id = $1 and role = 'owner'
       order by user_id
       for update`,
      [workspaceId],
    );
    if ((owners.rowCount ?? 0) < 2) throw new ConflictException({ ok: false });
  }

  /** Records a membership change. Knock outcomes are not written here. */
  private async audit(
    query: Query,
    workspaceId: string,
    actorId: string,
    action: string,
    target: string,
    meta: Record<string, string>,
  ): Promise<void> {
    await query(
      `insert into audit_log (workspace_id, actor_id, action, target, meta)
       values ($1, $2, $3, $4, $5::jsonb)`,
      [workspaceId, actorId, action, target, JSON.stringify(meta)],
    );
  }
}
