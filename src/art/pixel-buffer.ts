/**
 * Minimal RGBA pixel canvas shared by the build-time asset generator (Node)
 * and the runtime avatar compositor (browser). No DOM or Node dependencies.
 */
const colorCache = new Map<string, [number, number, number]>();

export function parseHex(hex: string): [number, number, number] {
  let c = colorCache.get(hex);
  if (!c) {
    const v = parseInt(hex.slice(1), 16);
    c = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    colorCache.set(hex, c);
  }
  return c;
}

/** Lighten (amount > 0) or darken (amount < 0) a hex colour. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const f = (v: number) =>
    Math.max(0, Math.min(255, Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))));
  return `#${((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1)}`;
}

export class PixelBuffer {
  readonly data: Uint8ClampedArray;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  px(x: number, y: number, color: string, alpha = 1): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = parseHex(color);
    const i = (y * this.w + x) * 4;
    const d = this.data;
    if (alpha >= 1) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
      return;
    }
    const da = d[i + 3] / 255;
    const oa = alpha + da * (1 - alpha);
    if (oa <= 0) return;
    d[i] = (r * alpha + d[i] * da * (1 - alpha)) / oa;
    d[i + 1] = (g * alpha + d[i + 1] * da * (1 - alpha)) / oa;
    d[i + 2] = (b * alpha + d[i + 2] * da * (1 - alpha)) / oa;
    d[i + 3] = oa * 255;
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.px(xx, yy, color, alpha);
  }

  /** Rectangle with clipped corners (r = 1 or 2). */
  round(x: number, y: number, w: number, h: number, color: string, r = 1): void {
    for (let yy = 0; yy < h; yy++) {
      const edge = Math.min(yy, h - 1 - yy);
      const inset = edge >= r ? 0 : r - edge;
      this.rect(x + inset, y + yy, w - inset * 2, 1, color);
    }
  }

  frame(x: number, y: number, w: number, h: number, color: string): void {
    this.rect(x, y, w, 1, color);
    this.rect(x, y + h - 1, w, 1, color);
    this.rect(x, y, 1, h, color);
    this.rect(x + w - 1, y, 1, h, color);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: string, alpha = 1): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, color, alpha);
      }
    }
  }

  clear(x: number, y: number, w: number, h: number): void {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || yy < 0 || xx >= this.w || yy >= this.h) continue;
        this.data[(yy * this.w + xx) * 4 + 3] = 0;
      }
  }

  alphaAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  /** Adds a 1px outline around everything opaque. */
  outline(color: string): void {
    const marks: number[] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alphaAt(x, y) > 0) continue;
        if (
          this.alphaAt(x - 1, y) > 200 ||
          this.alphaAt(x + 1, y) > 200 ||
          this.alphaAt(x, y - 1) > 200 ||
          this.alphaAt(x, y + 1) > 200
        )
          marks.push(x, y);
      }
    for (let i = 0; i < marks.length; i += 2) this.px(marks[i], marks[i + 1], color);
  }

  /** Paints only where the buffer is still transparent (soft ground shadows). */
  under(x: number, y: number, w: number, h: number, color: string, alpha: number): void {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) if (this.alphaAt(xx, yy) === 0) this.px(xx, yy, color, alpha);
  }

  blit(src: PixelBuffer, dx: number, dy: number, flipX = false): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const si = (y * src.w + (flipX ? src.w - 1 - x : x)) * 4;
        const a = src.data[si + 3];
        if (a === 0) continue;
        const tx = dx + x;
        const ty = dy + y;
        if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
        const ti = (ty * this.w + tx) * 4;
        if (a === 255) {
          this.data[ti] = src.data[si];
          this.data[ti + 1] = src.data[si + 1];
          this.data[ti + 2] = src.data[si + 2];
          this.data[ti + 3] = 255;
        } else {
          const sa = a / 255;
          const da = this.data[ti + 3] / 255;
          const oa = sa + da * (1 - sa);
          for (let k = 0; k < 3; k++)
            this.data[ti + k] = (src.data[si + k] * sa + this.data[ti + k] * da * (1 - sa)) / oa;
          this.data[ti + 3] = oa * 255;
        }
      }
  }
}

/** 3x5 pixel font for signage. */
const GLYPHS: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
  E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
  I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
  M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
  Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
  Y: "101101010010010", Z: "111001010100111", "0": "111101101101111", "1": "010110010010111",
  "2": "110001010100111", "3": "110001010001110", "4": "101101111001001", "5": "111100110001110",
  "-": "000000111000000", ".": "000000000000010", " ": "000000000000000",
};

export function pixelText(b: PixelBuffer, x: number, y: number, text: string, color: string, scale = 1): void {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (let i = 0; i < 15; i++)
      if (g[i] === "1") b.rect(cx + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale, color);
    cx += 4 * scale;
  }
}
