/**
 * Bakes the marketing-site art from the purchased Imersa pack.
 *
 *   npm run site-assets
 *
 * Reads   ../Office_Pixel_Art_Premium_v1.0/   (beside this repository, never modified)
 *          or the path in AJAR_ART_PACK
 * Writes  public/assets/imersa/               (git-ignored, must be present when deploying)
 *
 * The pack is a neutral grey office. Ajar's world is warm and dusky, so every pixel goes through
 * one colour grade here (the licence allows recolouring). Originals stay untouched.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PNG } from "pngjs";

const PACK_NAME = "Office_Pixel_Art_Premium_v1.0";
const PACK = process.env.AJAR_ART_PACK ? resolve(process.env.AJAR_ART_PACK) : join("..", PACK_NAME);
const OUT = "public/assets/imersa";
const ROOM = join(PACK, "Rooms", "Office_Showcase");
const CELL = 16; // collision cell, half a tile
const CHARACTERS = ["developer", "office_lady", "office_worker", "manager", "receptionist"] as const;

if (!existsSync(PACK)) {
  console.error(
    `\n${PACK_NAME}/ not found at ${resolve(PACK)}.\nPut the purchased pack next to this repository, not inside it, and run this again.\nOr set AJAR_ART_PACK to the pack's path. A copy placed in the repository stays git-ignored.\n`,
  );
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

type Img = { w: number; h: number; data: Uint8Array };
const load = (path: string): Img => {
  const png = PNG.sync.read(readFileSync(path));
  return { w: png.width, h: png.height, data: new Uint8Array(png.data) };
};
const blank = (w: number, h: number): Img => ({ w, h, data: new Uint8Array(w * h * 4) });
const save = (name: string, img: Img, scale = 1) => {
  const png = new PNG({ width: img.w * scale, height: img.h * scale });
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      const s = (Math.floor(y / scale) * img.w + Math.floor(x / scale)) * 4;
      const d = (y * png.width + x) * 4;
      png.data[d] = img.data[s];
      png.data[d + 1] = img.data[s + 1];
      png.data[d + 2] = img.data[s + 2];
      png.data[d + 3] = img.data[s + 3];
    }
  writeFileSync(join(OUT, name), PNG.sync.write(png, { colorType: 6 }));
};

/** Alpha-blends a region of `src` onto `dst`. */
function blit(dst: Img, src: Img, sx: number, sy: number, w: number, h: number, dx: number, dy: number) {
  for (let y = 0; y < h; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dst.h) continue;
    for (let x = 0; x < w; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dst.w) continue;
      const s = ((sy + y) * src.w + sx + x) * 4;
      const a = src.data[s + 3] / 255;
      if (a === 0) continue;
      const d = (ty * dst.w + tx) * 4;
      const da = dst.data[d + 3] / 255;
      const oa = a + da * (1 - a);
      for (let k = 0; k < 3; k++) dst.data[d + k] = Math.round((src.data[s + k] * a + dst.data[d + k] * da * (1 - a)) / oa);
      dst.data[d + 3] = Math.round(oa * 255);
    }
  }
}

/**
 * The dusk grade: split toning. Shadows lean aubergine, highlights lean warm ivory, mid-tones keep
 * enough of their own colour for wood, plants and screens to stay readable.
 */
const SHADOW = [40, 24, 78];
const MID = [150, 128, 204];
const LIGHT = [255, 226, 188];
function grade(img: Img): Img {
  const out = { w: img.w, h: img.h, data: new Uint8Array(img.data) };
  for (let i = 0; i < out.data.length; i += 4) {
    const src = [out.data[i], out.data[i + 1], out.data[i + 2]];
    const max = Math.max(src[0], src[1], src[2]);
    const min = Math.min(src[0], src[1], src[2]);
    const lum = (0.299 * src[0] + 0.587 * src[1] + 0.114 * src[2]) / 255;
    const sat = max === 0 ? 0 : (max - min) / max;
    // Greys take the tint almost fully; wood, plants and screens keep more of their own colour.
    const weight = 0.74 - 0.46 * Math.min(1, sat * 2.2);
    for (let k = 0; k < 3; k++) {
      const tone = lum < 0.5 ? SHADOW[k] + (MID[k] - SHADOW[k]) * (lum / 0.5) : MID[k] + (LIGHT[k] - MID[k]) * ((lum - 0.5) / 0.5);
      const v = src[k] * (1 - weight) + tone * weight;
      out.data[i + k] = Math.max(0, Math.min(255, Math.round((v - 128) * 1.1 + 128)));
    }
  }
  return out;
}

/** Fills fully transparent pixels (outside the building) with the page's aubergine. */
function backdrop(img: Img) {
  for (let i = 0; i < img.data.length; i += 4)
    if (img.data[i + 3] === 0) {
      img.data[i] = 33;
      img.data[i + 1] = 23;
      img.data[i + 2] = 47;
      img.data[i + 3] = 255;
    }
}

/** Soft additive pool of lamp light. */
function addGlow(img: Img, cx: number, cy: number, radius: number, strength: number) {
  for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(img.h, cy + radius); y++)
    for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(img.w, cx + radius); x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.25) / radius;
      if (d >= 1) continue;
      const f = (1 - d) * (1 - d) * strength;
      const i = (y * img.w + x) * 4;
      img.data[i] = Math.min(255, img.data[i] + 244 * f * 0.5);
      img.data[i + 1] = Math.min(255, img.data[i + 1] + 195 * f * 0.42);
      img.data[i + 2] = Math.min(255, img.data[i + 2] + 107 * f * 0.2);
    }
}

// ---------------------------------------------------------------- room
interface RoomObject { name: string; frame: string; x: number; y: number; w: number; h: number; pos: [number, number, number]; rot: number }
interface RoomJson {
  tile: number; size: [number, number]; origin: { col: number; row: number }; tileColumns: number;
  layers: { name: string; data: number[] }[]; objects: RoomObject[];
}
const room = JSON.parse(readFileSync(join(ROOM, "office_showcase.json"), "utf8")) as RoomJson;
const atlasMeta = JSON.parse(readFileSync(join(ROOM, "office_showcase_props.json"), "utf8")) as {
  frames: Record<string, { x: number; y: number; w: number; h: number; origin: { x: number; y: number } }>;
};
const tileset = load(join(ROOM, "office_showcase_tileset.png"));
const propsAtlas = load(join(ROOM, "office_showcase_props.png"));
const T = room.tile;
const [COLS, ROWS] = room.size;
const W = COLS * T;
const H = ROWS * T;

const base = blank(W, H);
for (const layer of room.layers)
  layer.data.forEach((id, i) => {
    if (id < 0) return;
    blit(base, tileset, (id % room.tileColumns) * T, Math.floor(id / room.tileColumns) * T, T, T, (i % COLS) * T, Math.floor(i / COLS) * T);
  });

// Prop sizes (metres) for collision, looked up from the per-prop metadata.
const propSize = new Map<string, [number, number, number]>();
for (const group of ["Props", "Architecture"]) {
  const root = join(PACK, group);
  const dirs = group === "Props" ? readdirSync(root).filter((c) => !c.startsWith("_")).flatMap((c) => readdirSync(join(root, c)).map((p) => join(root, c, p))) : readdirSync(root).map((p) => join(root, p));
  for (const dir of dirs) {
    const name = dir.split("/").pop()!;
    const file = join(dir, `${name}.json`);
    if (existsSync(file)) propSize.set(name, (JSON.parse(readFileSync(file, "utf8")) as { size: [number, number, number] }).size);
  }
}
const propName = (frame: string) => frame.replace(/_\d+$/, "").replace(/_(front|back|left|right)$/, "");

/** Rugs and mats are floor. Chairs don't block either, so rooms stay easy to walk through. */
const WALKABLE = new Set(["rug", "welcome_mat", "visitor_chair", "office_chair", "cafe_chair", "executive_chair"]);
const gw = W / CELL;
const gh = H / CELL;
const grid = new Uint8Array(gw * gh);
const wallLayer = room.layers[room.layers.length - 1];
wallLayer.data.forEach((id, i) => {
  if (id < 0) return;
  const cx = (i % COLS) * 2;
  const cy = Math.floor(i / COLS) * 2;
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) grid[(cy + dy) * gw + cx + dx] = 1;
});

for (let cy = 0; cy < gh; cy++)
  for (let cx = 0; cx < gw; cx++) if (cx < 2 || cx >= gw - 2 || cy >= gh - 4) grid[cy * gw + cx] = 1;

const objects = room.objects.map((o, index) => {
  const gx = (o.pos[0] - room.origin.col) * T;
  const gy = (o.pos[2] - room.origin.row) * T;
  const prop = propName(o.frame);
  const onFloor = o.pos[1] === 0;
  if (onFloor && !WALKABLE.has(prop)) {
    const size = propSize.get(prop) ?? [o.w / T, 0.5, 1];
    const sideways = o.rot === 90 || o.rot === 270;
    const halfW = ((sideways ? size[1] : size[0]) * T) / 2 - 3;
    const halfD = ((sideways ? size[0] : size[1]) * T) / 2 - 3;
    for (let cy = Math.floor((gy - halfD) / CELL); cy <= Math.floor((gy + halfD) / CELL); cy++)
      for (let cx = Math.floor((gx - halfW) / CELL); cx <= Math.floor((gx + halfW) / CELL); cx++)
        if (cx >= 0 && cy >= 0 && cx < gw && cy < gh) grid[cy * gw + cx] = 1;
  }
  return { id: index, prop, frame: o.frame, x: o.x, y: o.y, w: o.w, h: o.h, gx: Math.round(gx), gy: Math.round(gy * 100) / 100, floor: onFloor };
});

const lamps = objects.filter((o) => o.prop === "desk_lamp").map((o) => ({ x: o.x + o.w / 2, y: o.y + o.h / 2 }));
const lightAll = (img: Img) => {
  for (const lamp of lamps) addGlow(img, lamp.x, lamp.y + 10, 130, 0.62);
  // Low sun through the back-wall windows, the reception and the kitchen.
  for (const [x, y, r, s] of [[190, 60, 170, 0.3], [470, 60, 200, 0.3], [880, 60, 170, 0.3], [170, 400, 170, 0.34], [840, 370, 150, 0.3], [170, 560, 130, 0.22]] as const) addGlow(img, x, y, r, s);
};

const gradedBase = grade(base);
lightAll(gradedBase);
backdrop(gradedBase);
save("office-base.png", gradedBase);

const gradedProps = grade(propsAtlas);
save("office-props.png", gradedProps);

// Fully composed still, for the hero and the editorial sections.
const full = grade(base);
for (const o of [...objects].sort((a, b) => a.gy - b.gy || a.id - b.id)) {
  const f = atlasMeta.frames[o.frame];
  blit(full, gradedProps, f.x, f.y, f.w, f.h, o.x, o.y);
}
lightAll(full);
backdrop(full);
save("office-full.png", full);
save("office-full@2x.png", full, 2);

// ---------------------------------------------------------------- characters
// One sheet, 4 frames x 8 rows per character, characters side by side.
const sheet = blank(CHARACTERS.length * 4 * T, 8 * T);
CHARACTERS.forEach((name, i) => {
  const img = grade(load(join(PACK, "Characters", name, `${name}.png`)));
  blit(sheet, img, 0, 0, img.w, img.h, i * 4 * T, 0);
});
save("characters.png", sheet);
save("characters@3x.png", sheet, 3);

writeFileSync(
  join(OUT, "office.json"),
  JSON.stringify({
    credit: "Office Pixel Art by Imersa Studios (colour-graded for Ajar)",
    width: W, height: H, tile: T,
    frames: Object.fromEntries(Object.entries(atlasMeta.frames).map(([k, f]) => [k, { x: f.x, y: f.y, w: f.w, h: f.h }])),
    objects: objects.map(({ id, prop, frame, x, y, gx, gy, floor }) => ({ id, prop, frame, x, y, gx, gy, floor })),
    grid: { cell: CELL, width: gw, height: gh, data: Array.from(grid).join("") },
    lamps,
    characters: { names: CHARACTERS, frame: T, columns: 4, rows: ["idle_down", "idle_left", "idle_right", "idle_up", "walk_down", "walk_left", "walk_right", "walk_up"], feet: { x: 16, y: 30 } },
  }),
);

console.log(`site assets: ${W}x${H} office, ${objects.length} props, ${CHARACTERS.length} characters → ${OUT}`);
