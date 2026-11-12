import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { FloorSessionController } from "./floor-session.controller";
import { FloorSessionService } from "./floor-session.service";
import { FloorTickets } from "./floor-tickets";

/** Floor membership and the short-lived socket ticket. */
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [FloorSessionController],
  providers: [FloorTickets, FloorSessionService],
})
export class FloorModule {}
