const windowMs = 15 * 60 * 1000;
const limit = 5;

/** Counts requests in a fixed window. Five requests are allowed per 15 minutes. */
export class RequestRateLimit {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  /** Returns false when the key is already at the limit for this window. */
  allow(key: string, now = Date.now()): boolean {
    this.prune(now);
    const current = this.hits.get(key);
    if (!current || current.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (current.count >= limit) return false;
    current.count += 1;
    return true;
  }

  private prune(now: number) {
    if (this.hits.size < 1000) return;
    for (const [key, value] of this.hits) {
      if (value.resetAt <= now) this.hits.delete(key);
    }
  }
}
