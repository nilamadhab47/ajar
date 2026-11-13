import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { QueryResult, QueryResultRow } from "pg";
import { DatabaseService } from "../database/database.service";
import type { PlaceKind } from "./places";

type Query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) => Promise<QueryResult<T>>;

export type OfficePlace = {
  kind: PlaceKind;
  id: string;
  name: string | null;
  note: string | null;
};

/** Names and one-line notes for areas, rooms, and desks in one office. */
@Injectable()
export class PlacesService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  /** Lists the labels a member of this office can see. */
  async listPlaces(userId: string, workspaceId: string): Promise<OfficePlace[]> {
    return this.database.asOffice(userId, workspaceId, async (query) => {
      await this.member(query, workspaceId, userId);
      const rows = await query<{ kind: PlaceKind; place_id: string; name: string | null; note: string | null }>(
        `select kind, place_id, name, note
         from office_places
         where workspace_id = $1
         order by kind, place_id`,
        [workspaceId],
      );
      return rows.rows.map((row) => ({
        kind: row.kind,
        id: row.place_id,
        name: row.name,
        note: row.note,
      }));
    });
  }

  /** Saves one label. An empty name and note removes it, so the map default shows again. */
  async savePlace(
    userId: string,
    workspaceId: string,
    kind: PlaceKind,
    placeId: string,
    name: string | null,
    note: string | null,
  ): Promise<OfficePlace> {
    return this.database.asOffice(userId, workspaceId, async (query) => {
      const role = await this.member(query, workspaceId, userId);
      if (role !== "owner") throw new ForbiddenException({ ok: false });
      if (!name && !note) {
        await query(
          "delete from office_places where workspace_id = $1 and kind = $2 and place_id = $3",
          [workspaceId, kind, placeId],
        );
        return { kind, id: placeId, name: null, note: null };
      }
      const saved = await query<{ name: string | null; note: string | null }>(
        `insert into office_places (workspace_id, kind, place_id, name, note)
         values ($1, $2, $3, $4, $5)
         on conflict (workspace_id, kind, place_id)
         do update set name = excluded.name, note = excluded.note
         returning name, note`,
        [workspaceId, kind, placeId, name, note],
      );
      return { kind, id: placeId, name: saved.rows[0]?.name ?? null, note: saved.rows[0]?.note ?? null };
    });
  }

  /** Returns the caller's role, or hides an office they cannot see. */
  private async member(query: Query, workspaceId: string, userId: string): Promise<string> {
    const found = await query<{ role: string }>(
      "select role from workspace_members where workspace_id = $1 and user_id = $2",
      [workspaceId, userId],
    );
    const role = found.rows[0]?.role;
    if (!role) throw new NotFoundException({ ok: false });
    return role;
  }
}
