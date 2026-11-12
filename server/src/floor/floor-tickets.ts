import { Inject, Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

export const floorTicketTtlSeconds = 60;

/** One-time floor tickets. The gateway reads a ticket once; this store does not keep the access token. */
@Injectable()
export class FloorTickets implements OnModuleDestroy {
  private readonly logger = new Logger(FloorTickets.name);
  private client: RedisClient | null = null;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  /** Stores a ticket for 60 seconds. A second write of the same ticket does not replace it. */
  async save(ticket: string, payload: string): Promise<void> {
    const redis = await this.redis();
    const saved = await redis.set(`ticket:${ticket}`, payload, { EX: floorTicketTtlSeconds, NX: true });
    if (saved !== "OK") throw new ServiceUnavailableException("The floor session could not be opened.");
  }

  /** Returns the ticket payload and deletes it. A second read finds nothing. */
  async take(ticket: string): Promise<string | null> {
    const redis = await this.redis();
    return redis.getDel(`ticket:${ticket}`);
  }

  /** Seconds left before Redis drops the ticket. */
  async ttl(ticket: string): Promise<number> {
    const redis = await this.redis();
    return redis.ttl(`ticket:${ticket}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    await this.client.quit();
    this.client = null;
  }

  private async redis(): Promise<RedisClient> {
    if (this.client?.isOpen) return this.client;
    const client = createClient({
      url: this.config.get<string>("REDIS_URL") ?? "redis://127.0.0.1:16379",
    });
    client.on("error", (error: Error) => {
      this.logger.error(error.message);
    });
    try {
      await client.connect();
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : "Redis did not connect");
      throw new ServiceUnavailableException("The floor session could not be opened.");
    }
    this.client = client;
    return client;
  }
}
