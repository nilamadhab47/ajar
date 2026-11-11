import { BaseRealtimeAdapter } from "./realtime-adapter";
import type { ClientEventMap, ClientEventName, ServerEventMap, ServerEventName } from "./realtime-events";

interface Envelope {
  event: string;
  payload: unknown;
}

/** High-frequency events that are pointless to replay after a reconnect. */
const VOLATILE = new Set<string>(["player:move", "player:stop"]);

/**
 * Production adapter: JSON envelopes `{ event, payload }` over a native WebSocket,
 * with exponential-backoff reconnection. Override encode/decode to match a
 * different wire format or event naming scheme without touching the app.
 */
export class WebSocketRealtimeAdapter extends BaseRealtimeAdapter {
  readonly mode = "websocket" as const;
  private socket: WebSocket | null = null;
  private queue: string[] = [];
  private attempts = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closedByUser = false;

  constructor(private url: string, private options: { maxBackoffMs?: number; getAuthToken?: () => string | null } = {}) {
    super();
  }

  protected encode<E extends ClientEventName>(event: E, payload: ClientEventMap[E]): string {
    return JSON.stringify({ event, payload } satisfies Envelope);
  }
  protected decode(data: string): Envelope | null {
    try {
      const parsed = JSON.parse(data) as Envelope;
      return typeof parsed?.event === "string" ? parsed : null;
    } catch {
      return null;
    }
  }

  connect(): Promise<void> {
    if (!this.url) {
      this.setState("error", "NEXT_PUBLIC_WS_URL is not set");
      return Promise.reject(new Error("NEXT_PUBLIC_WS_URL is not set"));
    }
    this.closedByUser = false;
    return new Promise((resolve, reject) => {
      this.setState(this.attempts > 0 ? "reconnecting" : "connecting");
      const token = this.options.getAuthToken?.();
      const socket = new WebSocket(token ? `${this.url}${this.url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : this.url);
      this.socket = socket;
      socket.onopen = () => {
        this.attempts = 0;
        this.setState("connected");
        this.queue.splice(0).forEach((m) => socket.send(m));
        resolve();
      };
      socket.onmessage = (e) => {
        const env = typeof e.data === "string" ? this.decode(e.data) : null;
        if (env) this.emit(env.event as ServerEventName, env.payload as ServerEventMap[ServerEventName]);
      };
      socket.onerror = () => {
        if (socket.readyState !== WebSocket.OPEN) reject(new Error("WebSocket connection failed"));
      };
      socket.onclose = () => {
        this.socket = null;
        if (this.closedByUser) return this.setState("disconnected");
        this.scheduleReconnect();
      };
    });
  }

  private scheduleReconnect(): void {
    this.attempts += 1;
    const delay = Math.min(this.options.maxBackoffMs ?? 15000, 500 * 2 ** Math.min(this.attempts, 6)) * (0.75 + Math.random() * 0.5);
    this.setState("reconnecting", `Retrying in ${Math.round(delay / 1000)}s`);
    this.timer = setTimeout(() => this.connect().catch(() => undefined), delay);
  }

  disconnect(): void {
    this.closedByUser = true;
    if (this.timer) clearTimeout(this.timer);
    this.socket?.close();
    this.socket = null;
    this.setState("disconnected");
  }

  send<E extends ClientEventName>(event: E, payload: ClientEventMap[E]): void {
    const message = this.encode(event, payload);
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(message);
    else if (!VOLATILE.has(event) && this.queue.length < 200) this.queue.push(message);
  }
}
