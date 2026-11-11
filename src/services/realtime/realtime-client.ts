import { env } from "@/lib/env";
import { WORLD_CONFIG } from "@/lib/config";
import { MockRealtimeAdapter } from "./mock-realtime-adapter";
import type { RealtimeAdapter } from "./realtime-adapter";
import type { MovementPayload } from "./realtime-events";
import { WebSocketRealtimeAdapter } from "./websocket-realtime-adapter";

let adapter: RealtimeAdapter | null = null;

/** Single realtime connection for the app. The implementation is chosen by NEXT_PUBLIC_REALTIME_MODE. */
export function getRealtime(): RealtimeAdapter {
  if (!adapter) adapter = env.realtimeMode === "websocket" ? new WebSocketRealtimeAdapter(env.wsUrl) : new MockRealtimeAdapter();
  return adapter;
}

/**
 * Publishes local movement at a fixed rate instead of every frame, and only
 * when something meaningful changed.
 */
export class MovementPublisher {
  private lastSentAt = 0;
  private last: Pick<MovementPayload, "x" | "y" | "direction" | "animationState"> | null = null;
  private seq = 0;

  constructor(private realtime: RealtimeAdapter, private playerId: string, private hz: number = WORLD_CONFIG.network.movementHz) {}

  update(state: Pick<MovementPayload, "x" | "y" | "direction" | "animationState" | "seatId">, moving: boolean, now: number): void {
    const l = this.last;
    const changed = !l || Math.abs(l.x - state.x) > 0.5 || Math.abs(l.y - state.y) > 0.5 || l.direction !== state.direction || l.animationState !== state.animationState;
    if (!changed) return;
    const stateChange = !l || l.animationState !== state.animationState;
    if (!stateChange && now - this.lastSentAt < 1000 / this.hz) return;
    this.lastSentAt = now;
    this.last = { x: state.x, y: state.y, direction: state.direction, animationState: state.animationState };
    this.realtime.send(moving ? "player:move" : "player:stop", { ...state, playerId: this.playerId, timestamp: Date.now(), seq: ++this.seq });
  }
}
