import type { AnimationState, Avatar, Direction } from "@/features/avatar/types/avatar.types";

/** Domain contracts shared with the backend. Nothing here depends on Phaser or React. */
export type PresenceStatus = "available" | "busy" | "focus" | "in-meeting" | "away" | "dnd" | "offline";

/** How someone wants to be approached. Separate from status. */
export type DoorState = "open" | "ask" | "closed";

export interface User {
  id: string;
  displayName: string;
  email?: string;
  avatar: Avatar;
  status: PresenceStatus;
  /** Preferred door. Focus and Do not disturb close it until that status ends. */
  door?: DoorState;
  profileImage?: string;
  /** Job title shown on profiles. */
  title?: string;
  /** True for locally simulated participants (mock mode only). */
  isDemo?: boolean;
}

export interface Player {
  id: string;
  userId: string;
  x: number;
  y: number;
  direction: Direction;
  currentFloorId: string;
  currentRoomId: string | null;
  status: PresenceStatus;
  isMoving: boolean;
  animationState: AnimationState;
  /** Seat the player occupies, if any. */
  seatId?: string | null;
  lastUpdatedAt: number;
}

export interface Floor {
  id: string;
  name: string;
  level: number;
  mapId: string;
  /** Public URL of the Tiled JSON for this floor. */
  mapUrl: string;
  spawnPoints: { id: string; x: number; y: number }[];
  dimensions: { width: number; height: number; tileSize: number };
  /** False while the floor is a structural placeholder. */
  ready: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  logo: string | null;
  activeFloorId: string;
  members: string[];
  floors: Floor[];
  officeName: string;
}

export interface Presence {
  userId: string;
  status: PresenceStatus;
  currentLocation: string | null;
  currentActivity: string | null;
  statusEmoji?: string;
  lastSeenAt: number;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}
export interface ChatAttachment {
  name: string;
  size: number;
}
export interface ChatMessage {
  id: string;
  senderId: string;
  channelId: string;
  message: string;
  timestamp: number;
  reactions: Reaction[];
  threadParentId?: string;
  attachments?: ChatAttachment[];
}
export type ChannelKind = "channel" | "dm" | "group";
export interface ChatChannel {
  id: string;
  kind: ChannelKind;
  name: string;
  memberIds: string[];
  topic?: string;
}

export type MeetingStatus = "scheduled" | "waiting" | "active" | "ended";
export type MeetingKind = "meeting" | "coworking-casual" | "coworking-focused";
export interface Meeting {
  id: string;
  title: string;
  kind: MeetingKind;
  roomId: string | null;
  hostId: string;
  participants: string[];
  invited: string[];
  status: MeetingStatus;
  startTime: number;
  endTime?: number;
}

export const STATUS_META: Record<PresenceStatus, { label: string; meaning: string; color: string }> = {
  available: { label: "Available", meaning: "Free to talk", color: "#21C879" },
  busy: { label: "Busy", meaning: "Currently working", color: "#EBA94B" },
  focus: { label: "Focus", meaning: "Deep work", color: "#8B7FE0" },
  "in-meeting": { label: "In a meeting", meaning: "Attending a meeting", color: "#4F9BE0" },
  away: { label: "Away", meaning: "Temporarily inactive", color: "#B4B7BD" },
  dnd: { label: "Do not disturb", meaning: "No interruptions", color: "#E56A72" },
  offline: { label: "Offline", meaning: "Not connected", color: "#6E727A" },
};
export const STATUS_ORDER: PresenceStatus[] = ["available", "busy", "focus", "in-meeting", "away", "dnd", "offline"];

export const DOOR_META: Record<DoorState, { label: string; meaning: string; prompt: string }> = {
  open: { label: "Door ajar", meaning: "Happy to be approached. A knock is accepted straight away.", prompt: "Knock?" },
  ask: { label: "Ask first", meaning: "Send a knock. They decide.", prompt: "Knock?" },
  closed: { label: "Door closed", meaning: "Leave a note instead of knocking.", prompt: "Leave a note" },
};

/** Focus and Do not disturb close the door. The saved door comes back when that status ends. */
export function effectiveDoor(status: PresenceStatus, door: DoorState | undefined): DoorState {
  if (status === "focus" || status === "dnd") return "closed";
  return door ?? "ask";
}
