"use client";

import { useEffect, useRef } from "react";
import { FRAME_H, FRAME_W, SHEET_COLS, getAnimation } from "@/features/avatar/data/animations";
import { appearanceKey } from "@/features/avatar/data/avatar-options";
import { composeAvatarSheet } from "@/features/avatar/render/compose-avatar";
import type { AnimationState, AvatarAppearance, Direction } from "@/features/avatar/types/avatar.types";
import { cn } from "@/lib/utils";

const sheetCache = new Map<string, HTMLCanvasElement>();

/** Composed sprite sheet as a canvas, cached per appearance. */
export function getAvatarSheet(appearance: AvatarAppearance): HTMLCanvasElement {
  const key = appearanceKey(appearance);
  let canvas = sheetCache.get(key);
  if (!canvas) {
    const sheet = composeAvatarSheet(appearance);
    canvas = document.createElement("canvas");
    canvas.width = sheet.w;
    canvas.height = sheet.h;
    canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(sheet.data), sheet.w, sheet.h), 0, 0);
    if (sheetCache.size > 200) sheetCache.clear();
    sheetCache.set(key, canvas);
  }
  return canvas;
}

/** Static head-and-shoulders portrait of a character, used wherever a user is listed. */
export function AvatarImage({ avatar, size = 32, className }: { avatar: AvatarAppearance; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = appearanceKey(avatar);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 24, 24);
    ctx.drawImage(getAvatarSheet(avatar), 4, 3, 24, 24, 0, 0, 24, 24);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures every visual field of `avatar`
  }, [key]);
  return (
    <span className={cn("inline-block shrink-0 overflow-hidden rounded-md bg-wood/60", className)} style={{ width: size, height: size }} aria-hidden>
      <canvas ref={ref} width={24} height={24} className="pixelated size-full" />
    </span>
  );
}

/** Animated full-body preview (avatar builder, profile). */
export function AvatarPreview({ appearance, state = "idle", direction = "down", scale = 4, className }: {
  appearance: AvatarAppearance; state?: AnimationState; direction?: Direction; scale?: number; className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = appearanceKey(appearance);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const sheet = getAvatarSheet(appearance);
    const anim = getAnimation(state, direction);
    let i = 0;
    const draw = () => {
      const frame = anim.frames[i % anim.frames.length];
      ctx.clearRect(0, 0, FRAME_W, FRAME_H);
      ctx.drawImage(sheet, (frame % SHEET_COLS) * FRAME_W, Math.floor(frame / SHEET_COLS) * FRAME_H, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
      i += 1;
    };
    draw();
    const timer = setInterval(draw, 1000 / anim.frameRate);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures every visual field of `appearance`
  }, [key, state, direction]);
  return (
    <canvas
      ref={ref} width={FRAME_W} height={FRAME_H} role="img" aria-label="Avatar preview"
      className={cn("pixelated", className)} style={{ width: FRAME_W * scale, height: FRAME_H * scale }}
    />
  );
}
