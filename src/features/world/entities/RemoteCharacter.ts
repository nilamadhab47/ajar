import type { MovementPayload } from "@/services/realtime/realtime-events";
import { WORLD_CONFIG } from "@/lib/config";
import { Character } from "./Character";

interface Snapshot extends Pick<MovementPayload, "x" | "y" | "direction" | "animationState"> {
  /** Local receive time (performance.now). */
  at: number;
}

/**
 * A player driven by network updates. Positions are buffered and rendered
 * slightly in the past so movement between packets is interpolated, never teleported.
 */
export class RemoteCharacter extends Character {
  private buffer: Snapshot[] = [];
  private lastSeq = -1;

  push(p: MovementPayload): void {
    if (p.seq <= this.lastSeq) return;
    this.lastSeq = p.seq;
    this.buffer.push({ x: p.x, y: p.y, direction: p.direction, animationState: p.animationState, at: performance.now() });
    if (this.buffer.length > 12) this.buffer.shift();
  }

  /** Jump straight to the newest state (after the tab was hidden, or on teleports). */
  snap(): void {
    const last = this.buffer[this.buffer.length - 1];
    if (!last) return;
    this.buffer = [last];
    this.x = last.x;
    this.y = last.y;
    if (!this.inAction) this.play(last.animationState, last.direction);
  }

  update(): void {
    const buf = this.buffer;
    if (!buf.length) return;
    const t = performance.now() - WORLD_CONFIG.network.interpolationDelayMs;
    while (buf.length > 2 && buf[1].at <= t) buf.shift();
    const a = buf[0];
    const b = buf[1];
    if (!b || t <= a.at) {
      if (!b && t > a.at + 400) return this.settle(a);
      if (!b) this.settle(a);
      return;
    }
    if (t >= b.at) return this.settle(b);
    const k = (t - a.at) / (b.at - a.at);
    this.x = a.x + (b.x - a.x) * k;
    this.y = a.y + (b.y - a.y) * k;
    this.cancelAction();
    this.play("walk", b.direction);
  }

  private settle(s: Snapshot): void {
    this.x += (s.x - this.x) * 0.35;
    this.y += (s.y - this.y) * 0.35;
    if (Math.abs(s.x - this.x) < 0.5 && Math.abs(s.y - this.y) < 0.5) {
      this.x = s.x;
      this.y = s.y;
    }
    // A stale "walk" snapshot means packets stopped; fall back to idle rather than walking in place.
    const state = s.animationState === "walk" ? "idle" : s.animationState;
    if (!this.inAction) this.play(state, s.direction);
  }
}
