import * as Phaser from "phaser";
import { ANIMATION_STATES, DIRECTIONS, FRAME_H, FRAME_W, SHEET_COLS, SHEET_ROWS, getAnimation } from "@/features/avatar/data/animations";
import { appearanceKey } from "@/features/avatar/data/avatar-options";
import { composeAvatarSheet } from "@/features/avatar/render/compose-avatar";
import type { AnimationState, AvatarAppearance, Direction } from "@/features/avatar/types/avatar.types";
import { hashString } from "@/lib/random";

export const animKey = (texture: string, state: AnimationState, direction: Direction) => `${texture}:${state}:${direction}`;

/**
 * Returns the texture key for an appearance, composing the sprite sheet and
 * registering its animations the first time. Identical appearances share one texture.
 */
export function ensureAvatarTexture(scene: Phaser.Scene, appearance: AvatarAppearance): string {
  const key = `avatar-${hashString(appearanceKey(appearance)).toString(36)}`;
  if (scene.textures.exists(key)) return key;
  const sheet = composeAvatarSheet(appearance);
  const canvas = document.createElement("canvas");
  canvas.width = sheet.w;
  canvas.height = sheet.h;
  canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(sheet.data), sheet.w, sheet.h), 0, 0);
  const texture = scene.textures.addCanvas(key, canvas)!;
  for (let row = 0; row < SHEET_ROWS; row++)
    for (let col = 0; col < SHEET_COLS; col++) texture.add(row * SHEET_COLS + col, 0, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
  for (const state of ANIMATION_STATES)
    for (const direction of DIRECTIONS) {
      const def = getAnimation(state, direction);
      scene.anims.create({
        key: animKey(key, state, direction),
        frames: def.frames.map((frame) => ({ key, frame })),
        frameRate: def.frameRate,
        repeat: def.repeat,
      });
    }
  return key;
}
