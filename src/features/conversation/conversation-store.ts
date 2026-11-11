import { create } from "zustand";
import { LOCAL_USER_ID } from "@/data/demo-workspace";
import { getMediaAdapter } from "@/features/media/media-controller";
import { getRealtime } from "@/services/realtime/realtime-client";
import { uid } from "@/lib/utils";

export interface Conversation {
  id: string;
  /** Where it happens: proximity bubble or a room's private zone. */
  scope: { type: "proximity" } | { type: "room"; roomId: string; roomName: string };
  invitedIds: string[];
  joinedIds: string[];
  startedAt: number;
}

interface ConversationState {
  active: Conversation | null;
  minimized: boolean;
  expanded: boolean;
  start: (targetIds: string[], scope?: Conversation["scope"]) => void;
  participantJoined: (conversationId: string, userId: string) => void;
  participantLeft: (conversationId: string, userId: string) => void;
  leave: () => void;
  set: (patch: Partial<Pick<ConversationState, "minimized" | "expanded">>) => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  active: null,
  minimized: false,
  expanded: false,
  start: (targetIds, scope = { type: "proximity" }) => {
    get().leave();
    const id = uid("conv");
    set({ active: { id, scope, invitedIds: targetIds, joinedIds: [], startedAt: Date.now() }, minimized: false, expanded: false });
    void getMediaAdapter().joinConversation(id, targetIds);
    getRealtime().send("conversation:join", { playerId: LOCAL_USER_ID, conversationId: id, targetIds });
  },
  participantJoined: (conversationId, userId) =>
    set((s) => (s.active?.id === conversationId && !s.active.joinedIds.includes(userId) ? { active: { ...s.active, joinedIds: [...s.active.joinedIds, userId] } } : s)),
  participantLeft: (conversationId, userId) =>
    set((s) =>
      s.active?.id === conversationId
        ? { active: { ...s.active, joinedIds: s.active.joinedIds.filter((u) => u !== userId), invitedIds: s.active.invitedIds.filter((u) => u !== userId) } }
        : s,
    ),
  leave: () => {
    const { active } = get();
    if (!active) return;
    getRealtime().send("conversation:leave", { playerId: LOCAL_USER_ID, conversationId: active.id });
    void getMediaAdapter().leaveConversation();
    set({ active: null });
  },
  set: (patch) => set(patch),
}));
