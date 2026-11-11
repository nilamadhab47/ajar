import { TILE, TILE_GID, TILE_NAMES, TILESET_COLUMNS } from "../src/art/tiles";
import { getObjectDef } from "../src/features/world/data/object-catalog";
import type { TiledMap, TiledObject, TiledProperty } from "../src/features/world/types/map.types";
import { createRng } from "../src/lib/random";

type Props = Record<string, string | number | boolean>;
type TileLayer = "ground" | "floor-decor" | "rugs" | "walls" | "foreground";

const toProps = (p: Props): TiledProperty[] =>
  Object.entries(p).map(([name, value]) => ({
    name, value,
    type: typeof value === "boolean" ? "bool" : typeof value === "number" ? (Number.isInteger(value) ? "int" : "float") : "string",
  }));

/** Tiny authoring DSL that emits a Tiled-compatible JSON map. */
export class MapBuilder {
  private layers: Record<TileLayer, number[]>;
  private wall: Uint8Array;
  private windows = new Set<number>();
  private objects: Record<string, TiledObject[]> = { furniture: [], interactive: [], rooms: [], collision: [], spawns: [], labels: [] };
  private nextId = 1;
  private counters: Record<string, number> = {};
  private rng = createRng(2026);

  constructor(readonly w: number, readonly h: number, private floorId: string, private name: string) {
    const blank = () => new Array<number>(w * h).fill(0);
    this.layers = { ground: blank(), "floor-decor": blank(), rugs: blank(), walls: blank(), foreground: blank() };
    this.wall = new Uint8Array(w * h);
  }

  set(layer: TileLayer, x: number, y: number, tile: string) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (!TILE_GID[tile]) throw new Error(`Unknown tile ${tile}`);
    this.layers[layer][y * this.w + x] = TILE_GID[tile];
  }
  fill(layer: TileLayer, x0: number, y0: number, x1: number, y1: number, tile: string | ((x: number, y: number) => string | null)) {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const t = typeof tile === "string" ? tile : tile(x, y);
        if (t) this.set(layer, x, y, t);
      }
  }
  grass(x0: number, y0: number, x1: number, y1: number) {
    this.fill("ground", x0, y0, x1, y1, () => ["grass1", "grass2", "grass3"][Math.floor(this.rng() * 3)]);
  }
  scatter(x0: number, y0: number, x1: number, y1: number, chance: number) {
    this.fill("floor-decor", x0, y0, x1, y1, (x, y) => {
      const g = this.layers.ground[y * this.w + x];
      if (g > TILE_GID.grass3 || this.wall[y * this.w + x]) return null;
      const r = this.rng();
      return r < chance ? ["flowers1", "flowers2", "flowers3", "pebbles"][Math.floor((r / chance) * 4)] : null;
    });
  }
  walls(x0: number, y0: number, x1: number, y1: number) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.wall[y * this.w + x] = 1;
  }
  /** Opens a doorway and gives it the floor of a neighbouring tile. */
  door(x: number, y: number, floor: string) {
    this.wall[y * this.w + x] = 0;
    this.set("ground", x, y, floor);
  }
  window(x: number, y: number) {
    this.windows.add(y * this.w + x);
  }
  rug(color: string, x0: number, y0: number, x1: number, y1: number) {
    this.fill("rugs", x0, y0, x1, y1, (x, y) => {
      const v = y === y0 ? "T" : y === y1 ? "B" : "";
      const hz = x === x0 ? "L" : x === x1 ? "R" : "";
      return `rug${color}${v + hz || "C"}`;
    });
  }

  /** Places a catalog object at a tile. Returns its id. */
  add(kind: string, tx: number, ty: number, props: Props = {}, oid?: string): string {
    const def = getObjectDef(kind);
    if (!def) throw new Error(`Unknown object kind ${kind}`);
    this.counters[kind] = (this.counters[kind] ?? 0) + 1;
    const id = oid ?? `${kind.replace(/_/g, "-")}-${this.counters[kind]}`;
    const layer = def.interaction === "none" ? "furniture" : "interactive";
    this.objects[layer].push({
      id: this.nextId++, name: def.label, type: kind,
      x: tx * TILE, y: ty * TILE, width: def.fw * TILE, height: def.fh * TILE,
      properties: toProps({ oid: id, ...props }),
    });
    return id;
  }
  room(id: string, name: string, x0: number, y0: number, x1: number, y1: number, props: Props) {
    this.objects.rooms.push({
      id: this.nextId++, name, type: "room",
      x: x0 * TILE, y: y0 * TILE, width: (x1 - x0 + 1) * TILE, height: (y1 - y0 + 1) * TILE,
      properties: toProps({ oid: id, ...props }),
    });
  }
  spawn(name: string, tx: number, ty: number, direction: string) {
    this.objects.spawns.push({ id: this.nextId++, name, type: "spawn", x: tx * TILE + 16, y: ty * TILE + 24, width: 0, height: 0, properties: toProps({ direction }) });
  }
  label(text: string, px: number, py: number) {
    this.objects.labels.push({ id: this.nextId++, name: text, type: "label", x: px, y: py, width: 0, height: 0 });
  }
  blocker(x0: number, y0: number, x1: number, y1: number) {
    this.objects.collision.push({ id: this.nextId++, name: "blocker", type: "collision", x: x0 * TILE, y: y0 * TILE, width: (x1 - x0 + 1) * TILE, height: (y1 - y0 + 1) * TILE });
  }

  build(): TiledMap {
    const { w, h } = this;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (this.wall[i]) {
          const below = y + 1 < h ? this.wall[i + w] : 1;
          this.layers.walls[i] = TILE_GID[below ? "wallCap" : this.windows.has(i) ? "wallWindow" : "wallFace"];
        } else if (y > 0 && this.wall[i - w] && !this.layers["floor-decor"][i]) {
          this.layers["floor-decor"][i] = TILE_GID.shadowTop;
        }
      }
    const tileRows = Math.ceil(TILE_NAMES.length / TILESET_COLUMNS);
    let layerId = 1;
    const tileLayers = (Object.keys(this.layers) as TileLayer[]).map((name) => ({
      id: layerId++, name, type: "tilelayer" as const, width: w, height: h, data: this.layers[name], visible: true, opacity: 1, x: 0, y: 0,
    }));
    const objectLayers = Object.entries(this.objects).map(([name, objects]) => ({
      id: layerId++, name, type: "objectgroup" as const, objects, visible: true, opacity: 1, x: 0, y: 0, draworder: "topdown" as const,
    }));
    return {
      type: "map", version: "1.10", tiledversion: "1.10.2", orientation: "orthogonal", renderorder: "right-down", infinite: false,
      width: w, height: h, tilewidth: TILE, tileheight: TILE, nextlayerid: layerId, nextobjectid: this.nextId,
      properties: toProps({ floorId: this.floorId, name: this.name }),
      tilesets: [{
        firstgid: 1, name: "office-tiles", image: "../assets/tiles/office-tiles.png",
        imagewidth: TILESET_COLUMNS * (TILE + 2), imageheight: tileRows * (TILE + 2),
        tilewidth: TILE, tileheight: TILE, margin: 1, spacing: 2, columns: TILESET_COLUMNS, tilecount: TILE_NAMES.length,
      }],
      layers: [...tileLayers, ...objectLayers],
    };
  }
}
