import type { NavGrid } from "./CollisionSystem";

export interface TilePoint {
  x: number;
  y: number;
}

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142],
] as const;

/** Nearest walkable tile to `target` (breadth-first), or null if none within `maxRadius`. */
export function nearestWalkable(grid: NavGrid, target: TilePoint, maxRadius = 6): TilePoint | null {
  if (!grid.isBlocked(target.x, target.y)) return target;
  let best: TilePoint | null = null;
  let bestD = Infinity;
  for (let r = 1; r <= maxRadius && !best; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = target.x + dx;
        const y = target.y + dy;
        if (grid.isBlocked(x, y)) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = { x, y };
        }
      }
  return best;
}

/**
 * A* over the tile grid with 8-way movement and no corner cutting.
 * Returns tiles from the step after `from` up to `to`, or null when unreachable.
 */
export function findPath(grid: NavGrid, from: TilePoint, to: TilePoint): TilePoint[] | null {
  if (grid.isBlocked(to.x, to.y)) return null;
  if (from.x === to.x && from.y === to.y) return [];
  const w = grid.width;
  const size = w * grid.height;
  const g = new Float32Array(size).fill(Infinity);
  const f = new Float32Array(size).fill(Infinity);
  const came = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const open: number[] = [];
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - to.x);
    const dy = Math.abs(y - to.y);
    return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy);
  };
  const start = from.y * w + from.x;
  const goal = to.y * w + to.x;
  g[start] = 0;
  f[start] = h(from.x, from.y);
  open.push(start);

  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (cur === goal) {
      const path: TilePoint[] = [];
      for (let n = cur; n !== start; n = came[n]) path.push({ x: n % w, y: Math.floor(n / w) });
      return path.reverse();
    }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % w;
    const cy = Math.floor(cur / w);
    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (grid.isBlocked(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (grid.isBlocked(cx + dx, cy) || grid.isBlocked(cx, cy + dy))) continue;
      const ni = ny * w + nx;
      if (closed[ni]) continue;
      const tentative = g[cur] + cost;
      if (tentative < g[ni]) {
        came[ni] = cur;
        g[ni] = tentative;
        f[ni] = tentative + h(nx, ny);
        open.push(ni);
      }
    }
  }
  return null;
}

/** Drops intermediate tiles on straight runs so characters walk in clean segments. */
export function simplifyPath(path: TilePoint[]): TilePoint[] {
  if (path.length < 3) return path;
  const out: TilePoint[] = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i - 1];
    const n = path[i + 1];
    const c = path[i];
    if (p && n && n.x - c.x === c.x - p.x && n.y - c.y === c.y - p.y) continue;
    out.push(c);
  }
  return out;
}
