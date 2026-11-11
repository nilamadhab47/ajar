/** Dev helper: flattens a map + a few avatars into PNGs for visual review. Not used by the app. */
import { readFileSync } from "node:fs";
import { PixelBuffer } from "../src/art/pixel-buffer";
import { buildSprite, SPRITE_PAD_BOTTOM } from "../src/art/furniture";
import { buildTileset, TILE, TILESET_COLUMNS } from "../src/art/tiles";
import { getObjectDef } from "../src/features/world/data/object-catalog";
import { composeAvatarSheet } from "../src/features/avatar/render/compose-avatar";
import { DEFAULT_APPEARANCE, randomAppearance } from "../src/features/avatar/data/avatar-options";
import { createRng } from "../src/lib/random";
import { writePng } from "./png";

const [, , mapFile = "public/maps/demo-office.json", outDir = "."] = process.argv;
const map = JSON.parse(readFileSync(mapFile, "utf8"));
const tiles = buildTileset();
const out = new PixelBuffer(map.width * TILE, map.height * TILE);
const tile = (gid: number) => {
  const t = new PixelBuffer(TILE, TILE);
  const i = gid - 1;
  const sx = (i % TILESET_COLUMNS) * (TILE + 2) + 1;
  const sy = Math.floor(i / TILESET_COLUMNS) * (TILE + 2) + 1;
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const s = ((sy + y) * tiles.w + sx + x) * 4;
      const d = (y * TILE + x) * 4;
      for (let k = 0; k < 4; k++) t.data[d + k] = tiles.data[s + k];
    }
  return t;
};
const cache = new Map<number, PixelBuffer>();
type Obj = { type: string; x: number; y: number; width: number; height: number };
const objs: Obj[] = [];
for (const layer of map.layers) {
  if (layer.type === "tilelayer")
    layer.data.forEach((gid: number, i: number) => {
      if (!gid) return;
      if (!cache.has(gid)) cache.set(gid, tile(gid));
      out.blit(cache.get(gid)!, (i % map.width) * TILE, Math.floor(i / map.width) * TILE);
    });
  else if (layer.name === "furniture" || layer.name === "interactive") objs.push(...layer.objects);
}
const depth = (o: Obj) => (getObjectDef(o.type)?.flat ? -1e6 : 0) + o.y + o.height;
objs.sort((a, b) => depth(a) - depth(b));
for (const o of objs) {
  const def = getObjectDef(o.type)!;
  const s = buildSprite(def.sprite);
  out.blit(s, Math.round(o.x + (o.width - s.w) / 2), o.y + o.height + SPRITE_PAD_BOTTOM - s.h + (def.offsetY ?? 0));
}
writePng(`${outDir}/map-preview.png`, out);

const rng = createRng(7);
const sheets = [DEFAULT_APPEARANCE, ...Array.from({ length: 5 }, () => randomAppearance(rng))].map(composeAvatarSheet);
const chars = new PixelBuffer(sheets[0].w * 2, sheets[0].h * 3);
chars.rect(0, 0, chars.w, chars.h, "#EDEAE4");
sheets.forEach((s, i) => chars.blit(s, (i % 2) * s.w, Math.floor(i / 2) * s.h));
writePng(`${outDir}/chars-preview.png`, chars, 3);
