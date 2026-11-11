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

  /** Runs the callback in one transaction and rolls it back when the callback throws. */
  async transaction<T>(
    run: (
      query: <R extends QueryResultRow = QueryResultRow>(
        text: string,
        params?: unknown[],
      ) => Promise<QueryResult<R>>,
    ) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await run((text, params) => client.query(text, params));
      await client.query("commit");
      return result;
    } catch (error) {
      try {
        await client.query("rollback");
      } catch (rollbackError) {
        this.logger.error(
          rollbackError instanceof Error ? rollbackError.message : "rollback failed",
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /** Closes every pooled connection when the application shuts down. */
  async onModuleDestroy() {
    await this.pool.end();
  }
}
