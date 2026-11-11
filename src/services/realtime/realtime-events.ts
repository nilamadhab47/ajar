import type { AnimationState, Avatar, Direction } from "@/features/avatar/types/avatar.types";
import type { ChatMessage, Player, Presence, PresenceStatus, User } from "@/types/domain";

/**
 * Proposed wire contract between this frontend and the realtime backend.
 * Event names live in one place so they are easy to rename; adapters may also
 * translate them (see WebSocketRealtimeAdapter.encode/decode).
 */
export const ClientEvents = {
  PlayerJoin: "player:join",
  PlayerLeave: "player:leave",
  PlayerMove: "player:move",
  PlayerStop: "player:stop",
  PlayerStatusUpdate: "player:status:update",
  PlayerAvatarUpdate: "player:avatar:update",
  PlayerInteraction: "player:interaction",
  PlayerWave: "player:wave",
  RoomJoin: "room:join",
  RoomLeave: "room:leave",
  ConversationJoin: "conversation:join",
  ConversationLeave: "conversation:leave",
  ChatSend: "chat:send",
} as const;

export const ServerEvents = {
  WorldSnapshot: "world:snapshot",
  PlayerJoined: "player:joined",
  PlayerLeft: "player:left",
  PlayerMoved: "player:moved",
  PlayerStopped: "player:stopped",
  PlayerStatusUpdated: "player:status:updated",
  PlayerAvatarUpdated: "player:avatar:updated",
  PlayerInteraction: "player:interaction",
  PlayerWaved: "player:waved",
  RoomUpdated: "room:updated",
  ConversationParticipantJoined: "conversation:participant:joined",
  ConversationParticipantLeft: "conversation:participant:left",
  ChatMessage: "chat:message",
  WorldError: "world:error",
} as const;

export interface MovementPayload {
  playerId: string;
  x: number;
  y: number;
  direction: Direction;
  animationState: AnimationState;
  /** Sender clock, ms since epoch. */
  timestamp: number;
  /** Monotonic per player; lets receivers drop out-of-order packets. */
  seq: number;
  seatId?: string | null;
}
export interface StatusPayload {
  playerId: string;
  status: PresenceStatus;
  statusEmoji?: string;
  activity?: string | null;
}
export interface InteractionPayload {
  playerId: string;
  objectId: string;
  /** e.g. "sit", "stand", "gong", "coffee", "claim-desk" */
  action: string;
  seatId?: string;
}
export interface WavePayload {
  playerId: string;
  targetId?: string;
}
export interface RoomPayload {
  playerId: string;
  roomId: string;
}
export interface ConversationPayload {
  playerId: string;
  conversationId: string;
  targetIds?: string[];
}
/** `channelId: "nearby"` is proximity chat and is never persisted. */
export interface ChatPayload {
  message: ChatMessage;
}

export interface ClientEventMap {
  "player:join": { user: User; floorId: string; x: number; y: number; direction: Direction };
  "player:leave": { playerId: string };
  "player:move": MovementPayload;
  "player:stop": MovementPayload;
  "player:status:update": StatusPayload;
  "player:avatar:update": { playerId: string; avatar: Avatar };
  "player:interaction": InteractionPayload;
  "player:wave": WavePayload;
  "room:join": RoomPayload;
  "room:leave": RoomPayload;
  "conversation:join": ConversationPayload;
  "conversation:leave": ConversationPayload;
  "chat:send": ChatPayload;
}

export interface ServerEventMap {
  "world:snapshot": {
    floorId: string;
    players: Player[];
    users: User[];
    presence: Presence[];
    /** deskId → userId */
    deskAssignments: Record<string, string>;
  };
  "player:joined": { player: Player; user: User };
  "player:left": { playerId: string };
  "player:moved": MovementPayload;
  "player:stopped": MovementPayload;
  "player:status:updated": StatusPayload;
  "player:avatar:updated": { playerId: string; avatar: Avatar };
  "player:interaction": InteractionPayload;
  "player:waved": WavePayload;
  "room:updated": { roomId: string; participants: string[] };
  "conversation:participant:joined": ConversationPayload;
  "conversation:participant:left": ConversationPayload;
  "chat:message": ChatPayload;
  "world:error": { code: string; message: string };
}

export type ClientEventName = keyof ClientEventMap;
export type ServerEventName = keyof ServerEventMap;
