import { writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import type { PixelBuffer } from "../src/art/pixel-buffer";

export function writePng(path: string, buffer: PixelBuffer, scale = 1): void {
  const png = new PNG({ width: buffer.w * scale, height: buffer.h * scale });
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      const s = (Math.floor(y / scale) * buffer.w + Math.floor(x / scale)) * 4;
      const d = (y * png.width + x) * 4;
      for (let k = 0; k < 4; k++) png.data[d + k] = buffer.data[s + k];
    }
  writeFileSync(path, PNG.sync.write(png));
}
