/**
 * Generates every bitmap asset from the procedural art in src/art.
 *   npm run assets
 * Output: public/assets/tiles/office-tiles.png, public/assets/furniture/furniture.{png,json},
 *         public/assets/characters/sample-*.png (reference sheets; avatars are composed at runtime).
 */
import { writeFileSync } from "node:fs";
import { PixelBuffer } from "../src/art/pixel-buffer";
import { buildSprite, SPRITE_NAMES } from "../src/art/furniture";
import { buildTileset } from "../src/art/tiles";
import { composeAvatarSheet } from "../src/features/avatar/render/compose-avatar";
import { DEFAULT_APPEARANCE, randomAppearance } from "../src/features/avatar/data/avatar-options";
import { createRng } from "../src/lib/random";
import { writePng } from "./png";

const out = "public/assets";

writePng(`${out}/tiles/office-tiles.png`, buildTileset());

// Shelf-pack the furniture atlas (Phaser JSON-hash format).
const sprites = SPRITE_NAMES.map((name) => ({ name, buf: buildSprite(name) })).sort((a, b) => b.buf.h - a.buf.h);
const ATLAS_W = 512;
let x = 1;
let y = 1;
let rowH = 0;
const placed: { name: string; buf: PixelBuffer; x: number; y: number }[] = [];
for (const s of sprites) {
  if (x + s.buf.w + 1 > ATLAS_W) {
    x = 1;
    y += rowH + 2;
    rowH = 0;
  }
  placed.push({ ...s, x, y });
  x += s.buf.w + 2;
  rowH = Math.max(rowH, s.buf.h);
}
const atlas = new PixelBuffer(ATLAS_W, y + rowH + 1);
const frames: Record<string, unknown> = {};
for (const p of placed) {
  atlas.blit(p.buf, p.x, p.y);
  const size = { w: p.buf.w, h: p.buf.h };
  frames[p.name] = {
    frame: { x: p.x, y: p.y, ...size }, rotated: false, trimmed: false,
    spriteSourceSize: { x: 0, y: 0, ...size }, sourceSize: size,
  };
}
writePng(`${out}/furniture/furniture.png`, atlas);
writeFileSync(
  `${out}/furniture/furniture.json`,
  JSON.stringify({ frames, meta: { image: "furniture.png", format: "RGBA8888", size: { w: atlas.w, h: atlas.h }, scale: "1" } }),
);

writePng(`${out}/characters/sample-default.png`, composeAvatarSheet(DEFAULT_APPEARANCE));
const rng = createRng(42);
for (let i = 1; i <= 3; i++) writePng(`${out}/characters/sample-${i}.png`, composeAvatarSheet(randomAppearance(rng)));

console.log(`assets: ${SPRITE_NAMES.length} sprites, atlas ${atlas.w}x${atlas.h}`);
