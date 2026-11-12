import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";

/** Companies, offices, and the signed-in person. */
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
