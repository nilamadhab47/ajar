import type { SoundName } from "../lib/sound";

/** Shared between the React host and the Phaser scene. No Phaser import here, so React can use it freely. */
export type Door = "open" | "ask" | "closed";

export interface MiniPrompt {
  targetId: string;
  title: string;
  detail: string;
  action: string;
  kind: "knock" | "note";
  door: Door;
  /** A knock was sent and the other person hasn't answered yet. */
  pending: boolean;
}

export interface MiniConversation {
  name: string;
  lines: { from: "them" | "you"; text: string }[];
}

export type MiniEvent =
  | { type: "ready" }
  | { type: "moved" }
  | { type: "prompt"; prompt: MiniPrompt | null }
  | { type: "conversation"; conversation: MiniConversation | null; reason?: "left" | "walked" }
  | { type: "note-request"; targetId: string; name: string; hint: string }
  | { type: "note-placed"; targetId: string; name: string; canFastForward: boolean }
  | { type: "note-read"; name: string; text: string; reply: string }
  | { type: "time"; phase: "dusk" | "night" | "morning" }
  | { type: "toast"; title: string; body?: string }
  | { type: "sfx"; name: SoundName };

export interface MiniOfficeApi {
  destroy(): void;
  /** Held direction, each axis -1..1. (0, 0) stops. */
  setInput(x: number, y: number): void;
  /** Do the thing the current prompt offers. */
  act(): void;
  walkToRoom(id: string): void;
  leaveNote(targetId: string, text: string): void;
  fastForward(): void;
  leaveConversation(): void;
  reset(): void;
  setPaused(paused: boolean): void;
}

export interface MiniOfficeOptions {
  uiFont: string;
  pixelFont: string;
  onEvent: (event: MiniEvent) => void;
}

/** Rooms a visitor can jump to. `x, y` is where the character stands (office pixels). */
export const ROOMS = [
  { id: "reception", label: "Reception", x: 236, y: 468, blurb: "Where everyone arrives. The door stays ajar." },
  { id: "desks", label: "Desks", x: 390, y: 290, blurb: "Open desks. Lanterns show who is happy to be approached." },
  { id: "atlas", label: "Atlas Room", x: 736, y: 216, blurb: "A meeting room. Inside, you're together; outside, nobody hears." },
  { id: "kitchen", label: "Kitchen", x: 772, y: 432, blurb: "Coffee, and the conversations that happen near it." },
  { id: "focus", label: "Focus room", x: 146, y: 338, blurb: "A closed door. Notes are welcome, knocks are not." },
] as const;
