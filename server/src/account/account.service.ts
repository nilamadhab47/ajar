import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

type PersonRow = {
  id: string;
  email: string;
  display_name: string;
  title: string | null;
  avatar: Record<string, unknown>;
  status: string;
  door: string;
};

type OfficeRow = {
  id: string;
  name: string;
  office_name: string;
  organization_id: string;
  organization_name: string;
  role: string;
};

/** A person, the companies they create, and the offices they belong to. */
@Injectable()
export class AccountService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  /** Creates a company, its first office and floor, and makes the caller the owner. */
  async createOrganization(userId: string, companyName: string, officeName: string) {
    return this.database.asOffice(userId, null, async (query) => {
      const ids = await query<{ organization_id: string; office_id: string; floor_id: string }>(
        "select uuidv7() as organization_id, uuidv7() as office_id, uuidv7() as floor_id",
      );
      const organizationId = ids.rows[0]?.organization_id;
      const officeId = ids.rows[0]?.office_id;
      const floorId = ids.rows[0]?.floor_id;
      if (!organizationId || !officeId || !floorId) throw new Error("organization was not created");

      await query("insert into organizations (id, name) values ($1, $2)", [
        organizationId,
        companyName,
      ]);
      await query(
        `insert into workspaces (id, organization_id, name, office_name)
         values ($1, $2, $3, $3)`,
        [officeId, organizationId, officeName],
      );

      await query(
        `insert into workspace_members (workspace_id, user_id, role)
         values ($1, $2, 'owner')`,
        [officeId, userId],
      );
      await query("insert into floors (id, workspace_id, name) values ($1, $2, $3)", [
        floorId,
        officeId,
        officeName,
      ]);
      await query(
        `insert into audit_log (workspace_id, actor_id, action, target)
         values ($1, $2, 'organization.created', $3)`,
        [officeId, userId, organizationId],
      );

      return {
        organization: { id: organizationId, name: companyName },
        office: {
          id: officeId,
          name: officeName,
          officeName,
          role: "owner",
        },
      };
    });
  }

  /** Lists the offices where this person has a role. */
  async listOffices(userId: string) {
    const rows = await this.database.asOffice(userId, null, (query) =>
      query<OfficeRow>(
      `select w.id, w.name, w.office_name, w.organization_id, o.name as organization_name, m.role
       from workspace_members m
       join workspaces w on w.id = m.workspace_id
       join organizations o on o.id = w.organization_id
       where m.user_id = $1
       order by m.created_at`,
      [userId],
    ),
    );
    return rows.rows.map((row) => ({
      id: row.id,
      name: row.name,
      officeName: row.office_name,
      role: row.role,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
    }));
  }

  /** Returns the signed-in person in the shape the office client already expects. */
  async currentPerson(userId: string) {
    const found = await this.database.asOffice(userId, null, (query) =>
      query<PersonRow>(
        `select id, email, display_name, title, avatar, status, door
         from users where id = $1`,
        [userId],
      ),
    );
    const person = found.rows[0];
    if (!person) return null;
    return toPerson(person);
  }

  /** Updates the profile fields the office client can change. */
  async updatePerson(
    userId: string,
    patch: { displayName?: string; status?: string; avatar?: Record<string, unknown>; door?: string },
  ) {
    const updated = await this.database.asOffice(userId, null, (query) =>
      query<PersonRow>(
      `update users
       set display_name = coalesce($2, display_name),
           status = coalesce($3, status),
           avatar = coalesce($4::jsonb, avatar),
           door = coalesce($5, door),
           updated_at = now()
       where id = $1
       returning id, email, display_name, title, avatar, status, door`,
      [
        userId,
        patch.displayName ?? null,
        patch.status ?? null,
        patch.avatar ? JSON.stringify(patch.avatar) : null,
        patch.door ?? null,
      ],
      ),
    );
    const person = updated.rows[0];
    return person ? toPerson(person) : null;
  }
}

/** Maps a database row to the client user. */
function toPerson(row: PersonRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    title: row.title,
    avatar: row.avatar ?? {},
    status: row.status,
    door: row.door,
  };
}
