import type { InteractiveObject } from "../entities/InteractiveObject";
import type { PlayerCharacter } from "../entities/PlayerCharacter";
import type { LoadedMap } from "../types/map.types";
import type { Seat, WorldObject } from "../types/world.types";
import type { NavGrid } from "./CollisionSystem";

/** What interaction handlers and sub-systems may ask of the scene. */
export interface WorldContext {
  readonly map: LoadedMap;
  readonly grid: NavGrid;
  readonly player: PlayerCharacter;
  readonly views: Map<string, InteractiveObject>;
  readonly seats: Map<string, Seat>;
  readonly objects: WorldObject[];
  /** Sits on the nearest free seat of an object, walking there first if needed. */
  sitOn(object: WorldObject): void;
  standUp(): void;
  effect(kind: "confetti" | "steam" | "sparkle", x: number, y: number): void;
  shake(): void;
  /** Rebuilds collision and seats after objects changed. */
  refreshObjects(): void;
  addObject(object: WorldObject): InteractiveObject;
  removeObject(id: string): void;
}
