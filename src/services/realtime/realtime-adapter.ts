import type { ClientEventMap, ClientEventName, ServerEventMap, ServerEventName } from "./realtime-events";

export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error";
export type Unsubscribe = () => void;
type Handler<E extends ServerEventName> = (payload: ServerEventMap[E]) => void;

/** Transport-agnostic realtime contract. Components only ever talk to this. */
export interface RealtimeAdapter {
  readonly mode: "mock" | "websocket";
  connect(): Promise<void>;
  disconnect(): void;
  getState(): ConnectionState;
  onStateChange(listener: (state: ConnectionState, detail?: string) => void): Unsubscribe;
  /** Subscribe to a server event. Returns an unsubscribe function. */
  on<E extends ServerEventName>(event: E, handler: Handler<E>): Unsubscribe;
  off<E extends ServerEventName>(event: E, handler: Handler<E>): void;
  /** Publish a client event. Safe to call while disconnected (adapters decide what to queue). */
  send<E extends ClientEventName>(event: E, payload: ClientEventMap[E]): void;
}

/** Listener bookkeeping shared by every adapter. */
export abstract class BaseRealtimeAdapter implements RealtimeAdapter {
  abstract readonly mode: "mock" | "websocket";
  private handlers = new Map<string, Set<(payload: never) => void>>();
  private stateListeners = new Set<(state: ConnectionState, detail?: string) => void>();
  private state: ConnectionState = "idle";

  abstract connect(): Promise<void>;
  abstract disconnect(): void;
  abstract send<E extends ClientEventName>(event: E, payload: ClientEventMap[E]): void;

  getState(): ConnectionState {
    return this.state;
  }
  onStateChange(listener: (state: ConnectionState, detail?: string) => void): Unsubscribe {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }
  on<E extends ServerEventName>(event: E, handler: Handler<E>): Unsubscribe {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as (payload: never) => void);
    return () => this.off(event, handler);
  }
  off<E extends ServerEventName>(event: E, handler: Handler<E>): void {
    this.handlers.get(event)?.delete(handler as (payload: never) => void);
  }

  protected setState(state: ConnectionState, detail?: string): void {
    if (state === this.state) return;
    this.state = state;
    this.stateListeners.forEach((l) => l(state, detail));
  }
  protected emit<E extends ServerEventName>(event: E, payload: ServerEventMap[E]): void {
    this.handlers.get(event)?.forEach((h) => (h as Handler<E>)(payload));
  }
}
