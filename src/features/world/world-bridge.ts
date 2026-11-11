import type { AvatarAction } from "@/features/avatar/types/avatar.types";
import { Emitter } from "@/lib/emitter";

/**
 * The only channel between React and the Phaser scene.
 * React → scene: imperative commands. Scene → React: zustand stores (low frequency)
 * and `worldRuntime` (per-frame data read on demand, never causing re-renders).
 */
export type WorldCommand =
  | { type: "recenter" }
  | { type: "zoom"; direction: "in" | "out" | "reset" }
  | { type: "pan-to"; x: number; y: number }
  | { type: "walk-to"; x: number; y: number }
  | { type: "walk-to-user"; userId: string; follow?: boolean }
  | { type: "walk-to-object"; objectId: string; then?: "sit" | "interact" }
  | { type: "walk-to-room"; roomId: string }
  | { type: "locate-user"; userId: string }
  | { type: "stop-follow" }
  | { type: "interact" }
  | { type: "stand" }
  | { type: "emote"; emoji: string }
  | { type: "action"; action: AvatarAction; targetId?: string }
  | { type: "say"; text: string }
  | { type: "change-floor"; floorId: string; via: "elevator" | "stairs" | "default" }
  | { type: "edit-add"; kind: string }
  | { type: "edit-delete" }
  | { type: "edit-reset" };

export const worldCommands = new Emitter<{ command: WorldCommand }>();
export const sendWorldCommand = (command: WorldCommand) => worldCommands.emit("command", command);

export const worldRuntime = {
  /** Live feet positions by user id (world px). */
  positions: new Map<string, { x: number; y: number }>(),
  /** Visible world rectangle of the main camera. */
  view: { x: 0, y: 0, width: 0, height: 0 },
  /** Touch joystick vector, each axis in [-1, 1]. */
  joystick: { x: 0, y: 0 },
};
