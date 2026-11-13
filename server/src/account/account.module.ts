import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";
import { MembershipController } from "./membership.controller";
import { MembershipService } from "./membership.service";
import { PlacesController } from "./places.controller";
import { PlacesService } from "./places.service";

/** Companies, offices, the signed-in person, and who belongs in an office. */
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AccountController, MembershipController, PlacesController],
  providers: [AccountService, MembershipService, PlacesService],
})
export class AccountModule {}
