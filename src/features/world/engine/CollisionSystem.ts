import { getObjectDef } from "../data/object-catalog";
import type { LoadedMap } from "../types/map.types";
import type { WorldObject } from "../types/world.types";

/** Tile-resolution walkability grid plus box-vs-grid movement resolution. */
export class NavGrid {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
  private blocked: Uint8Array;

  constructor(private map: Pick<LoadedMap, "width" | "height" | "tileSize" | "baseCollision">, objects: WorldObject[]) {
    this.width = map.width;
    this.height = map.height;
    this.tileSize = map.tileSize;
    this.blocked = new Uint8Array(map.baseCollision);
    this.rebuild(objects);
  }

  /** Recomputes object footprints (after edit-mode changes). */
  rebuild(objects: WorldObject[]): void {
    this.blocked = new Uint8Array(this.map.baseCollision);
    const t = this.tileSize;
    for (const o of objects) {
      if (!getObjectDef(o.type)?.collides) continue;
      for (let y = Math.floor(o.y / t); y < Math.ceil((o.y + o.height) / t); y++)
        for (let x = Math.floor(o.x / t); x < Math.ceil((o.x + o.width) / t); x++)
          if (this.inBounds(x, y)) this.blocked[y * this.width + x] = 1;
    }
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }
  isBlocked(tx: number, ty: number): boolean {
    return !this.inBounds(tx, ty) || this.blocked[ty * this.width + tx] === 1;
  }
  toTile(px: number): number {
    return Math.floor(px / this.tileSize);
  }
  /** Standing position (feet) for a tile. */
  tileCenter(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * this.tileSize + this.tileSize / 2, y: ty * this.tileSize + this.tileSize * 0.75 };
  }

  boxBlocked(left: number, top: number, right: number, bottom: number): boolean {
    const t = this.tileSize;
    for (let ty = Math.floor(top / t); ty <= Math.floor((bottom - 0.01) / t); ty++)
      for (let tx = Math.floor(left / t); tx <= Math.floor((right - 0.01) / t); tx++) if (this.isBlocked(tx, ty)) return true;
    return false;
  }

  /**
   * Moves a feet-anchored body by (dx, dy), resolving each axis separately so
   * the character slides along walls instead of sticking.
   */
  move(x: number, y: number, dx: number, dy: number, halfW: number, bodyH: number): { x: number; y: number; hitX: boolean; hitY: boolean } {
    let nx = x;
    let ny = y;
    const hitX = dx !== 0 && this.boxBlocked(x + dx - halfW, y - bodyH, x + dx + halfW, y);
    if (!hitX) nx = x + dx;
    const hitY = dy !== 0 && this.boxBlocked(nx - halfW, y + dy - bodyH, nx + halfW, y + dy);
    if (!hitY) ny = y + dy;
    return { x: nx, y: ny, hitX, hitY };
  }
}
