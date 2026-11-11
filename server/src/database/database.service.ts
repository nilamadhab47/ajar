import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, type QueryResult, type QueryResultRow } from "pg";

const connectionTimeoutMillis = 5_000;
const queryTimeoutMillis = 2_000;

/** Postgres access for the API. Idle client failures stay on this pool. */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  /** Opens the pool from `DATABASE_URL`, or the local Compose database when that is unset. */
  constructor(@Inject(ConfigService) config: ConfigService) {
    this.pool = new Pool({
      connectionString:
        config.get<string>("DATABASE_URL") ??
        "postgres://ajar:ajar@localhost:55432/ajar",
      // pg uses this both to open a client and to wait for a free one.
      connectionTimeoutMillis,
      query_timeout: queryTimeoutMillis,
    });
    this.pool.on("error", (error: Error) => {
      this.logger.error(error.message, error.stack);
    });
  }

  /** Runs a query. A stalled connection or query rejects within the pool deadlines. */
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  /** Closes every pooled connection when the application shuts down. */
  async onModuleDestroy() {
    await this.pool.end();
  }
}
