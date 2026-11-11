import type { Direction } from "@/features/avatar/types/avatar.types";
import { getObjectDef } from "../data/object-catalog";
import type { Seat, WorldObject } from "../types/world.types";
import type { NavGrid } from "./CollisionSystem";
import { nearestWalkable, type TilePoint } from "./PathfindingSystem";

const STEP: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };
const SIDES: Record<Direction, Direction[]> = { up: ["left", "right"], down: ["left", "right"], left: ["up", "down"], right: ["up", "down"] };

/** Derives sit points from catalog seat definitions. Shared by the scene and the mock server. */
export function buildSeats(objects: WorldObject[]): Seat[] {
  const seats: Seat[] = [];
  for (const o of objects) {
    const def = getObjectDef(o.type);
    def?.seats?.forEach((s, i) => {
      const facing = (o.properties.facing as Direction | undefined) ?? s.facing;
      seats.push({ id: def.seats!.length > 1 ? `${o.id}:${i}` : o.id, objectId: o.id, x: o.x + s.dx, y: o.y + s.dy, facing, occupantId: null });
    });
  }
  return seats;
}

/** Walkable tile to stand on before sitting down / after standing up. */
export function seatApproachTile(grid: NavGrid, seat: Seat): TilePoint | null {
  const tile = { x: grid.toTile(seat.x), y: grid.toTile(seat.y - 1) };
  const order: Direction[] =
    seat.facing === "up" ? ["down", "left", "right", "up"] : [seat.facing, OPPOSITE[seat.facing], ...SIDES[seat.facing]];
  for (const d of order) {
    const t = { x: tile.x + STEP[d][0], y: tile.y + STEP[d][1] };
    if (!grid.isBlocked(t.x, t.y)) return t;
  }
  return nearestWalkable(grid, tile, 3);
}
