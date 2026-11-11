import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

/** Reports whether the API can reach Postgres. */
@Controller()
export class HealthController {
  /** Uses the shared database service for the health query. */
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  /** Returns ok when `select 1` succeeds, and a database-down response when it rejects. */
  @Get("health")
  async health() {
    try {
      await this.database.query("select 1");
      return { ok: true, db: "up" };
    } catch {
      throw new ServiceUnavailableException({ ok: false, db: "down" });
    }
  }
}
