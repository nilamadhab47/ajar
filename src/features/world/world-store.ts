import { create } from "zustand";
import type { Room, WorldObject } from "./types/world.types";

export interface NearbyParticipant {
  userId: string;
  distanceTiles: number;
  /** 0 at the discovery radius, 1 inside the close radius. */
  strength: number;
  close: boolean;
}

export interface InteractionPrompt {
  objectId: string;
  title: string;
  detail?: string;
  action: string;
}

interface WorldState {
  status: "loading" | "ready" | "error";
  error: string | null;
  floorId: string;
  transitioning: boolean;
  map: { name: string; width: number; height: number; tileSize: number } | null;
  rooms: Room[];
  roomOccupants: Record<string, string[]>;
  currentRoomId: string | null;
  nearby: NearbyParticipant[];
  prompt: InteractionPrompt | null;
  camera: { zoom: number; following: boolean };
  sitting: boolean;
  followingUserId: string | null;
  editMode: boolean;
  selectedObject: WorldObject | null;
  objectCount: number;
  set: (patch: Partial<WorldState>) => void;
}

/** Low-frequency world state for React. Per-frame data lives in worldRuntime instead. */
export const useWorldStore = create<WorldState>((set) => ({
  status: "loading",
  error: null,
  floorId: "floor-1",
  transitioning: false,
  map: null,
  rooms: [],
  roomOccupants: {},
  currentRoomId: null,
  nearby: [],
  prompt: null,
  camera: { zoom: 1.5, following: true },
  sitting: false,
  followingUserId: null,
  editMode: false,
  selectedObject: null,
  objectCount: 0,
  set: (patch) => set(patch),
}));
