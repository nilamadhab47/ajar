import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OauthController } from "./oauth.controller";
import { OauthService } from "./oauth.service";

/** Sign-in by magic link, Google, and Microsoft. */
@Module({
  imports: [DatabaseModule],
  controllers: [AuthController, OauthController],
  providers: [AuthService, OauthService],
})
export class AuthModule {}
