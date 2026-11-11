import type { Direction } from "@/features/avatar/types/avatar.types";
import { WORLD_CONFIG } from "@/lib/config";
import type { NavGrid } from "../engine/CollisionSystem";
import { findPath, nearestWalkable, simplifyPath, type TilePoint } from "../engine/PathfindingSystem";
import { seatApproachTile } from "../engine/seats";
import type { Seat } from "../types/world.types";
import { Character } from "./Character";

export interface MoveInput {
  x: number;
  y: number;
  run: boolean;
}

export type WalkResult = "started" | "arrived" | "unreachable";

/** The locally controlled character: keyboard movement, click-to-move paths and sitting. */
export class PlayerCharacter extends Character {
  private path: { x: number; y: number }[] = [];
  private onArrive: (() => void) | null = null;
  seat: Seat | null = null;
  /** Fired whenever the player sits or stands. */
  onSeatChange: ((seat: Seat | null, previous: Seat | null) => void) | null = null;

  get isWalkingPath(): boolean {
    return this.path.length > 0;
  }
  get tile(): TilePoint {
    return { x: Math.floor(this.x / WORLD_CONFIG.tileSize), y: Math.floor((this.y - 1) / WORLD_CONFIG.tileSize) };
  }

  update(dtSeconds: number, input: MoveInput, grid: NavGrid): void {
    const manual = input.x !== 0 || input.y !== 0;
    if (manual) {
      this.cancelPath();
      this.cancelAction();
      if (this.seat) this.stand(grid);
      const len = Math.hypot(input.x, input.y) || 1;
      const speed = WORLD_CONFIG.walkSpeed * (input.run ? WORLD_CONFIG.runMultiplier : 1) * Math.min(1, len);
      // Sub-step so high speeds or slow frames can never tunnel through a wall.
      let remaining = speed * dtSeconds;
      while (remaining > 0) {
        const step = Math.min(remaining, 6);
        const r = grid.move(this.x, this.y, (input.x / len) * step, (input.y / len) * step, WORLD_CONFIG.bodyHalfWidth, WORLD_CONFIG.bodyHeight);
        this.x = r.x;
        this.y = r.y;
        remaining -= step;
      }
      const dir: Direction = Math.abs(input.x) > Math.abs(input.y) ? (input.x > 0 ? "right" : "left") : input.y > 0 ? "down" : "up";
      this.play("walk", dir, input.run ? 1.5 : 1);
      return;
    }
    if (this.path.length) {
      this.cancelAction();
      let budget = WORLD_CONFIG.walkSpeed * 1.15 * dtSeconds;
      while (budget > 0 && this.path.length) {
        const target = this.path[0];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= budget) {
          this.x = target.x;
          this.y = target.y;
          this.path.shift();
          budget -= dist;
        } else {
          this.x += (dx / dist) * budget;
          this.y += (dy / dist) * budget;
          this.play("walk", Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
          budget = 0;
        }
      }
      if (!this.path.length) {
        this.play("idle", this.direction);
        const done = this.onArrive;
        this.onArrive = null;
        done?.();
      }
      return;
    }
    if (this.state === "walk") this.play("idle", this.direction);
  }

  /** Pathfinds to a tile (or the nearest reachable one) and starts walking. */
  walkToTile(grid: NavGrid, target: TilePoint, onArrive?: () => void): WalkResult {
    const from = this.seat ? (seatApproachTile(grid, this.seat) ?? this.tile) : grid.isBlocked(this.tile.x, this.tile.y) ? (nearestWalkable(grid, this.tile) ?? this.tile) : this.tile;
    const goal = nearestWalkable(grid, target, 4);
    if (!goal) return "unreachable";
    const path = findPath(grid, from, goal);
    if (!path) return "unreachable";
    if (this.seat) this.stand(grid);
    if (!path.length) {
      onArrive?.();
      return "arrived";
    }
    this.cancelAction();
    this.path = simplifyPath(path).map((t) => grid.tileCenter(t.x, t.y));
    this.onArrive = onArrive ?? null;
    return "started";
  }

  cancelPath(): void {
    this.path = [];
    this.onArrive = null;
  }

  sit(seat: Seat, seatDepth: number | null): void {
    const previous = this.seat;
    this.cancelPath();
    this.cancelAction();
    this.seat = seat;
    this.seatId = seat.id;
    this.seatDepth = seatDepth;
    this.x = seat.x;
    this.y = seat.y;
    this.play("sit", seat.facing);
    this.onSeatChange?.(seat, previous);
  }

  stand(grid: NavGrid): void {
    const previous = this.seat;
    if (!previous) return;
    const tile = seatApproachTile(grid, previous);
    if (tile) {
      const p = grid.tileCenter(tile.x, tile.y);
      this.x = p.x;
      this.y = p.y;
    }
    this.seat = null;
    this.seatId = null;
    this.seatDepth = null;
    this.play("idle", previous.facing === "up" ? "down" : previous.facing);
    this.onSeatChange?.(null, previous);
  }
}
