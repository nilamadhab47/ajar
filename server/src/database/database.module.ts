import { Module } from "@nestjs/common";
import { DatabaseService } from "./database.service";

/** Shares the database service with the rest of the API. */
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
