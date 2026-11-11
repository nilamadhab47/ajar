import type { Direction } from "@/features/avatar/types/avatar.types";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type InteractionType =
  | "none" | "desk" | "seat" | "whiteboard" | "meeting-room" | "coffee" | "water" | "gong"
  | "elevator" | "stairs" | "reception" | "fridge" | "bookshelf" | "printer";

export type ObjectLayer = "floor" | "furniture" | "interactive" | "foreground";
export type ObjectCategory = "desk" | "seating" | "table" | "plant" | "storage" | "appliance" | "wall" | "outdoor" | "structure" | "decor";
export type PropertyValue = string | number | boolean;

/** A thing placed in the world. Independent of any Phaser sprite. */
export interface WorldObject {
  id: string;
  /** Catalog kind, see data/object-catalog.ts */
  type: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: ObjectLayer;
  interactionType: InteractionType;
  properties: Record<string, PropertyValue>;
}

export interface SeatDef {
  /** Seated feet position, px from the footprint's top-left. */
  dx: number;
  dy: number;
  facing: Direction;
}

/** Static description of an object kind (sprite, footprint, behaviour). */
export interface ObjectDef {
  kind: string;
  label: string;
  sprite: string;
  /** Footprint in tiles. */
  fw: number;
  fh: number;
  collides: boolean;
  category: ObjectCategory;
  interaction: InteractionType;
  /** Verb shown in the "[E] …" prompt. */
  prompt?: string;
  /** Interaction range in tiles (defaults to world config). */
  range?: number;
  seats?: SeatDef[];
  /** Mounted on a wall face. */
  wall?: boolean;
  /** Lies on the ground; always drawn beneath characters. */
  flat?: boolean;
  offsetY?: number;
  /** Offered in the edit-mode asset palette. */
  palette?: boolean;
}

// ---- Rooms: open areas, private zones and meeting rooms are distinct abstractions.
export type RoomType =
  | "workspace" | "collaboration" | "meeting" | "kitchen" | "quiet" | "garden" | "reception" | "library" | "studio" | "corridor";

interface RoomBase {
  id: string;
  name: string;
  type: RoomType;
  /** World pixels. */
  bounds: Rect;
  capacity: number | null;
  floorId: string;
  /** User ids currently inside (runtime). */
  participants: string[];
  /** Mini-map colour. */
  color: string;
}
/** Ordinary area: proximity rules apply. `quiet` narrows the audible radius. */
export interface OpenArea extends RoomBase {
  zone: "open";
  isPrivate: false;
  quiet: boolean;
}
/** Everyone inside shares one conversation; nobody outside can hear. */
export interface PrivateZone extends RoomBase {
  zone: "private";
  isPrivate: true;
}
export interface MeetingRoom extends RoomBase {
  zone: "meeting";
  isPrivate: true;
  capacity: number;
  equipment: string[];
}
export type Room = OpenArea | PrivateZone | MeetingRoom;

export interface SpawnPoint {
  id: string;
  x: number;
  y: number;
  direction: Direction;
}

export interface MapLabel {
  text: string;
  x: number;
  y: number;
}

export interface Seat {
  id: string;
  objectId: string;
  x: number;
  y: number;
  facing: Direction;
  occupantId: string | null;
}
