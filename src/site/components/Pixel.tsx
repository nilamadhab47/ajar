import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CHARACTER, IMERSA, OFFICE, ROW, type CharacterName, type RowName } from "../config";

/** Position (in office pixels) → percentages of the office layer. For a character this is where the feet go. */
export const at = (x: number, y: number): CSSProperties => ({ left: `${(x / OFFICE.width) * 100}%`, top: `${(y / OFFICE.height) * 100}%` });

/**
 * A pack character as a CSS sprite. It must sit inside an office-sized layer (`OfficeLayer` or
 * `OfficeCrop`), because its size is a fraction of that layer. Row and frame come from CSS variables, so
 * keyframes and GSAP can change direction without re-rendering.
 */
export function Sprite({ who, row = "idle_down", x, y, className, style, children }: {
  who: CharacterName; row?: RowName; x: number; y: number; className?: string; style?: CSSProperties; children?: ReactNode;
}) {
  return (
    <div
      className={cn("px-actor", className)}
      data-walking={row.startsWith("walk") ? "" : undefined}
      style={{ ...at(x, y), "--c": CHARACTER[who], "--row": ROW[row], ...style } as CSSProperties}
    >
      <div className="px-sprite" />
      {children}
    </div>
  );
}

/** Lantern glow above a character's head: lit, half-lit or unlit. Never colour alone: the label says it too. */
export function PixelLantern({ door }: { door: "open" | "ask" | "closed" }) {
  return <span className="px-lantern" data-door={door} aria-hidden="true" />;
}

/** The whole baked office, to be positioned and scaled by its parent. Children use `at()` / `Sprite`. */
export function OfficeLayer({ className, style, children, eager, hiRes }: {
  className?: string; style?: CSSProperties; children?: ReactNode; eager?: boolean; hiRes?: boolean;
}) {
  return (
    <div className={cn("office-layer", className)} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled by the image optimiser */}
      <img
        src={hiRes ? IMERSA.full2x : IMERSA.full} alt="" width={OFFICE.width} height={OFFICE.height}
        loading={eager ? "eager" : "lazy"} decoding="async" draggable={false}
        className="pixelated absolute inset-0 size-full select-none"
      />
      {children}
    </div>
  );
}

/** A window onto one part of the office. `x, y, w, h` are office pixels; children are placed in office pixels too. */
export function OfficeCrop({ x, y, w, h, className, children, label }: {
  x: number; y: number; w: number; h: number; className?: string; children?: ReactNode; label?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ aspectRatio: `${w} / ${h}` }} role={label ? "img" : undefined} aria-label={label}>
      <OfficeLayer
        className="absolute"
        style={{ width: `${(OFFICE.width / w) * 100}%`, left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` }}
      >
        {children}
      </OfficeLayer>
    </div>
  );
}
