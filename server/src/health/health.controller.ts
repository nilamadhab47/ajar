import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Controller()
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

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
