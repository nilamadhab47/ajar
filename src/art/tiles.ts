import { createRng } from "../lib/random";
import { PixelBuffer, shade } from "./pixel-buffer";

/**
 * Original tileset for the office. Every tile is drawn procedurally so the
 * whole set stays cohesive and can be regenerated with `npm run assets`.
 */
export const TILE = 32;
export const TILESET_COLUMNS = 10;

type Rng = () => number;
type TileDraw = (b: PixelBuffer, r: Rng) => void;

function speckle(b: PixelBuffer, r: Rng, color: string, count: number, w = 1, h = 1, alpha = 1) {
  for (let i = 0; i < count; i++) b.rect(Math.floor(r() * TILE), Math.floor(r() * TILE), w, h, color, alpha);
}

function grass(seed: number): TileDraw {
  return (b) => {
    const r = createRng(seed);
    b.rect(0, 0, TILE, TILE, "#A9D69B");
    speckle(b, r, "#9CCB8D", 26, 2, 1);
    speckle(b, r, "#B8E0AA", 16, 1, 1);
    for (let i = 0; i < 5; i++) {
      const x = 2 + Math.floor(r() * 28);
      const y = 3 + Math.floor(r() * 26);
      b.rect(x, y, 1, 3, "#86BC7B");
      b.px(x + 1, y + 1, "#86BC7B");
    }
  };
}

/** Basket-weave floor used for carpeted rooms. */
function weave(a: string, c: string, line: string): TileDraw {
  return (b) => {
    for (let ty = 0; ty < 4; ty++)
      for (let tx = 0; tx < 4; tx++) {
        const horizontal = (tx + ty) % 2 === 0;
        b.rect(tx * 8, ty * 8, 8, 8, horizontal ? a : c);
        if (horizontal) {
          b.rect(tx * 8, ty * 8 + 3, 8, 1, line, 0.55);
          b.rect(tx * 8, ty * 8 + 7, 8, 1, line, 0.8);
        } else {
          b.rect(tx * 8 + 3, ty * 8, 1, 8, line, 0.55);
          b.rect(tx * 8 + 7, ty * 8, 1, 8, line, 0.8);
        }
      }
  };
}

function bricks(base: string, mortar: string): TileDraw {
  return (b, r) => {
    b.rect(0, 0, TILE, TILE, base);
    for (let row = 0; row < 4; row++) {
      b.rect(0, row * 8 + 7, TILE, 1, mortar);
      const off = row % 2 === 0 ? 0 : 8;
      for (let x = off; x < TILE; x += 16) b.rect(x + 15 - (off ? 0 : 0), row * 8, 1, 7, mortar);
      for (let x = 0; x < TILE; x += 16) if (r() > 0.6) b.rect((x + off) % TILE, row * 8, 15, 7, shade(base, -0.025));
    }
  };
}

function planks(base: string): TileDraw {
  return (b, r) => {
    const seam = shade(base, -0.1);
    b.rect(0, 0, TILE, TILE, base);
    for (let row = 0; row < 4; row++) {
      if (r() > 0.5) b.rect(0, row * 8, TILE, 7, shade(base, r() > 0.5 ? 0.05 : -0.035));
      b.rect(0, row * 8 + 7, TILE, 1, seam);
      b.rect(row % 2 === 0 ? 11 : 25, row * 8, 1, 7, seam);
      for (let i = 0; i < 3; i++) b.rect(Math.floor(r() * 28), row * 8 + 1 + Math.floor(r() * 5), 3, 1, seam, 0.35);
    }
  };
}

function checker(a: string, c: string): TileDraw {
  return (b) => {
    for (let ty = 0; ty < 2; ty++)
      for (let tx = 0; tx < 2; tx++) {
        b.rect(tx * 16, ty * 16, 16, 16, (tx + ty) % 2 === 0 ? a : c);
        b.rect(tx * 16, ty * 16 + 15, 16, 1, shade(c, -0.07));
        b.rect(tx * 16 + 15, ty * 16, 1, 16, shade(c, -0.07));
      }
  };
}

const WALL_CAP = "#515D6B";
const WALL_FACE = "#8795A3";

function wallFace(window: boolean): TileDraw {
  return (b) => {
    b.rect(0, 0, TILE, 11, WALL_CAP);
    b.rect(0, 0, TILE, 1, shade(WALL_CAP, 0.12));
    b.rect(0, 11, TILE, 1, shade(WALL_CAP, -0.25));
    b.rect(0, 12, TILE, 16, WALL_FACE);
    b.rect(0, 12, TILE, 1, shade(WALL_FACE, 0.14));
    b.rect(0, 28, TILE, 4, shade(WALL_FACE, -0.24));
    b.rect(0, 28, TILE, 1, shade(WALL_FACE, -0.34));
    if (window) {
      b.rect(3, 14, 26, 12, "#EEF2F4");
      b.rect(5, 15, 22, 10, "#BFE2EF");
      b.rect(15, 15, 2, 10, "#EEF2F4");
      b.rect(7, 16, 3, 1, "#FFFFFF", 0.8);
      b.rect(8, 17, 3, 1, "#FFFFFF", 0.8);
      b.rect(19, 16, 3, 1, "#FFFFFF", 0.8);
    }
  };
}

/** Nine-slice rug pieces. Edges leave a little floor showing around the rug. */
function rug(color: string, e: { t?: boolean; l?: boolean; b?: boolean; r?: boolean }): TileDraw {
  return (b) => {
    const x0 = e.l ? 3 : 0;
    const y0 = e.t ? 3 : 0;
    const x1 = e.r ? TILE - 3 : TILE;
    const y1 = e.b ? TILE - 3 : TILE;
    const border = shade(color, -0.14);
    b.rect(x0, y0, x1 - x0, y1 - y0, color);
    for (let y = y0; y < y1; y += 4)
      for (let x = x0 + ((y / 4) % 2) * 2; x < x1; x += 4) b.px(x, y, shade(color, 0.1));
    if (e.t) b.rect(x0, y0, x1 - x0, 2, border);
    if (e.b) b.rect(x0, y1 - 2, x1 - x0, 2, border);
    if (e.l) b.rect(x0, y0, 2, y1 - y0, border);
    if (e.r) b.rect(x1 - 2, y0, 2, y1 - y0, border);
    if (e.b) b.rect(x0 + 1, y1, x1 - x0 - 2, 1, "#000000", 0.1);
  };
}

function flowers(seed: number, colors: string[]): TileDraw {
  return (b) => {
    const r = createRng(seed);
    for (let i = 0; i < 4; i++) {
      const x = 4 + Math.floor(r() * 24);
      const y = 4 + Math.floor(r() * 24);
      const c = colors[i % colors.length];
      b.rect(x, y + 1, 1, 3, "#6FA868");
      b.rect(x - 1, y, 3, 1, c);
      b.rect(x, y - 1, 1, 3, c);
      b.px(x, y, "#FFF3B0");
    }
  };
}

const RUGS: Record<string, string> = {
  rugLavender: "#B3ACE0",
  rugCoral: "#EDAA9C",
  rugSage: "#A9CCAE",
  rugGrey: "#B9BEC8",
  rugBlue: "#A6C6DC",
};
const SLICES = [
  ["TL", { t: true, l: true }], ["T", { t: true }], ["TR", { t: true, r: true }],
  ["L", { l: true }], ["C", {}], ["R", { r: true }],
  ["BL", { b: true, l: true }], ["B", { b: true }], ["BR", { b: true, r: true }],
] as const;

const DEFS: [string, TileDraw][] = [
  ["grass1", grass(11)],
  ["grass2", grass(23)],
  ["grass3", grass(37)],
  ["path", (b, r) => {
    b.rect(0, 0, TILE, TILE, "#E6D9BF");
    speckle(b, r, "#D7C8AA", 14, 3, 2);
    speckle(b, r, "#F0E6D0", 10, 2, 1);
  }],
  ["wood", planks("#E5D3B9")],
  ["cream", bricks("#F1E8DA", "#E2D6C3")],
  ["lavender", weave("#B7B1E0", "#ABA4D7", "#9A92CB")],
  ["blue", weave("#B6D3E5", "#A9C9DE", "#96B9D1")],
  ["quiet", weave("#CFDDE8", "#C3D5E3", "#B0C6D7")],
  ["sage", weave("#B5D3B8", "#A7C9AB", "#94BA99")],
  ["kitchen", checker("#F6F1E8", "#E9E1D3")],
  ["coral", checker("#F5D0C6", "#F1C3B7")],
  ["concrete", (b, r) => {
    b.rect(0, 0, TILE, TILE, "#E7E2DB");
    speckle(b, r, "#DAD4CB", 30);
    speckle(b, r, "#F1EDE7", 18);
    b.rect(0, 31, TILE, 1, "#D5CEC4");
    b.rect(31, 0, 1, TILE, "#D5CEC4");
  }],
  ["wallCap", (b, r) => {
    b.rect(0, 0, TILE, TILE, WALL_CAP);
    speckle(b, r, shade(WALL_CAP, 0.06), 10, 2, 1);
  }],
  ["wallFace", wallFace(false)],
  ["wallWindow", wallFace(true)],
  ["shadowTop", (b) => {
    [0.16, 0.12, 0.09, 0.06, 0.04, 0.02].forEach((a, i) => b.rect(0, i, TILE, 1, "#1E2030", a));
  }],
  ["flowers1", flowers(5, ["#F2A7B8", "#FFFFFF"])],
  ["flowers2", flowers(9, ["#F6D56B", "#F2A7B8"])],
  ["flowers3", flowers(14, ["#C7B5F0", "#FFFFFF"])],
  ["pebbles", (b, r) => {
    for (let i = 0; i < 4; i++) {
      const x = 4 + Math.floor(r() * 22);
      const y = 4 + Math.floor(r() * 22);
      b.rect(x, y, 4, 3, "#C9C6BE");
      b.rect(x + 1, y, 2, 1, "#E4E1DA");
    }
  }],
  ["doormat", (b) => {
    b.rect(2, 10, 28, 14, "#8C7A66");
    b.rect(4, 12, 24, 10, "#A08D77");
    for (let x = 6; x < 27; x += 3) b.rect(x, 13, 1, 8, "#8C7A66");
  }],
  ...Object.entries(RUGS).flatMap(([name, color]) =>
    SLICES.map(([suffix, edges]) => [`${name}${suffix}`, rug(color, edges)] as [string, TileDraw]),
  ),
];

export const TILE_NAMES = DEFS.map(([name]) => name);
/** Tile name → Tiled global id (firstgid = 1). */
export const TILE_GID: Record<string, number> = Object.fromEntries(DEFS.map(([name], i) => [name, i + 1]));

/** Tileset image with 1px extruded edges (Tiled: margin 1, spacing 2) to prevent seams when zoomed. */
export function buildTileset(): PixelBuffer {
  const rows = Math.ceil(DEFS.length / TILESET_COLUMNS);
  const cell = TILE + 2;
  const sheet = new PixelBuffer(TILESET_COLUMNS * cell, rows * cell);
  DEFS.forEach(([, draw], i) => {
    const t = new PixelBuffer(TILE, TILE);
    draw(t, createRng(1000 + i * 7));
    const ox = (i % TILESET_COLUMNS) * cell + 1;
    const oy = Math.floor(i / TILESET_COLUMNS) * cell + 1;
    sheet.blit(t, ox, oy);
    for (let k = 0; k < TILE; k++) {
      copy(sheet, ox + k, oy, ox + k, oy - 1);
      copy(sheet, ox + k, oy + TILE - 1, ox + k, oy + TILE);
      copy(sheet, ox, oy + k, ox - 1, oy + k);
      copy(sheet, ox + TILE - 1, oy + k, ox + TILE, oy + k);
    }
  });
  return sheet;
}

function copy(b: PixelBuffer, sx: number, sy: number, dx: number, dy: number) {
  const s = (sy * b.w + sx) * 4;
  const d = (dy * b.w + dx) * 4;
  for (let k = 0; k < 4; k++) b.data[d + k] = b.data[s + k];
}
