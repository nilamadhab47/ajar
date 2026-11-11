"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type Frames = Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
const ATLAS = "/assets/furniture/furniture";
let frames: Frames | null = null;
let size = { w: 512, h: 512 };
let request: Promise<void> | null = null;
const listeners = new Set<() => void>();

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  request ??= fetch(`${ATLAS}.json`)
    .then((r) => r.json())
    .then((json: { frames: Frames; meta: { size: { w: number; h: number } } }) => {
      size = json.meta.size;
      frames = json.frames;
      listeners.forEach((l) => l());
    })
    .catch(() => undefined);
  return () => listeners.delete(notify);
}

/** A furniture-atlas frame as a DOM thumbnail (edit palette, desk decorations). */
export function SpriteThumb({ sprite, box = 40, className }: { sprite: string; box?: number; className?: string }) {
  const loaded = useSyncExternalStore(subscribe, () => frames, () => null);
  const f = loaded?.[sprite]?.frame;
  const scale = f ? Math.min(box / f.w, box / f.h, 2) : 1;
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", className)} style={{ width: box, height: box }} aria-hidden>
      {f && (
        <span
          className="pixelated block"
          style={{
            width: f.w * scale, height: f.h * scale, backgroundImage: `url(${ATLAS}.png)`,
            backgroundPosition: `${-f.x * scale}px ${-f.y * scale}px`, backgroundSize: `${size.w * scale}px ${size.h * scale}px`,
          }}
        />
      )}
    </span>
  );
}
