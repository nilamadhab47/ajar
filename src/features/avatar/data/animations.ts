import type { AnimationState, Direction } from "../types/avatar.types";

/** Sprite-sheet layout shared by the compositor, Phaser and the React preview. */
export const FRAME_W = 32;
export const FRAME_H = 48;
export const SHEET_COLS = 8;
export const SHEET_ROWS = 6;
/** Y of the character's feet inside a frame (used as the sprite origin). */
export const FEET_Y = 45;

export const DIRECTION_ROW: Record<Direction, number> = { down: 0, right: 1, up: 2, left: 3 };
const ACTION_ROW = 4;
const CELEBRATE_ROW = 5;

export interface AnimationDef {
  frames: number[];
  frameRate: number;
  repeat: number;
}

const f = (row: number, cols: number[]) => cols.map((c) => row * SHEET_COLS + c);

/** Resolves an animation to absolute frame indices. Actions are always drawn facing the camera. */
export function getAnimation(state: AnimationState, direction: Direction): AnimationDef {
  const row = DIRECTION_ROW[direction];
  switch (state) {
    case "walk":
      return { frames: f(row, [3, 4, 5, 6]), frameRate: 8, repeat: -1 };
    case "sit":
      return { frames: f(row, [7]), frameRate: 1, repeat: -1 };
    case "wave":
      return { frames: f(ACTION_ROW, [0, 1]), frameRate: 5, repeat: -1 };
    case "dance":
      return { frames: f(ACTION_ROW, [2, 3, 4, 5]), frameRate: 6, repeat: -1 };
    case "clap":
      return { frames: f(ACTION_ROW, [6, 7]), frameRate: 7, repeat: -1 };
    case "celebrate":
      return { frames: f(CELEBRATE_ROW, [0, 1]), frameRate: 5, repeat: -1 };
    default:
      // Breathing with an occasional blink.
      return { frames: f(row, [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 2]), frameRate: 4, repeat: -1 };
  }
}

export const ANIMATION_STATES: AnimationState[] = ["idle", "walk", "sit", "wave", "dance", "clap", "celebrate"];
export const DIRECTIONS: Direction[] = ["down", "right", "up", "left"];
