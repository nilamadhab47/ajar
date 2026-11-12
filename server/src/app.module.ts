import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountModule } from "./account/account.module";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { FloorModule } from "./floor/floor.module";
import { HealthController } from "./health/health.controller";

/** Wires configuration, the database, sign-in, offices, and floor tickets. */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, AuthModule, AccountModule, FloorModule],
  controllers: [HealthController],
})
export class AppModule {}
