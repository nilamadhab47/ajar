import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import { randomToken } from "../auth/tokens";
import { FloorTickets } from "./floor-tickets";

/** Opens a short-lived ticket for a floor the person belongs to. */
@Injectable()
export class FloorSessionService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(FloorTickets) private readonly tickets: FloorTickets,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  /** A stranger and an unknown floor look the same. The socket address carries no access token. */
  async open(userId: string, floorId: string): Promise<{ wsUrl: string; ticket: string }> {
    const floor = await this.database.asOffice(userId, null, (query) =>
      query<{ id: string; workspace_id: string }>(
        "select id, workspace_id from floors where id = $1",
        [floorId],
      ),
    );
    const row = floor.rows[0];
    if (!row) throw new NotFoundException({ ok: false });

    const ticket = randomToken();
    const payload = JSON.stringify({
      userId,
      floorId: row.id,
      workspaceId: row.workspace_id,
    });
    await this.tickets.save(ticket, payload);
    return { wsUrl: gatewayUrl(this.config.get<string>("GATEWAY_WS_URL")), ticket };
  }
}

/** The gateway address, without a query string. The ticket is returned beside it. */
function gatewayUrl(value: string | undefined): string {
  const raw = value?.trim() || "ws://127.0.0.1:4100";
  const url = new URL(raw);
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
