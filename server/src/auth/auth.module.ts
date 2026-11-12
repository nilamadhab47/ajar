import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CurrentUserService } from "./current-user";
import { OauthController } from "./oauth.controller";
import { OauthService } from "./oauth.service";

/** Sign-in by magic link, password, Google, and Microsoft. */
@Module({
  imports: [DatabaseModule],
  controllers: [AuthController, OauthController],
  providers: [AuthService, OauthService, CurrentUserService],
  exports: [CurrentUserService],
})
export class AuthModule {}
