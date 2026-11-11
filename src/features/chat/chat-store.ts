import { create } from "zustand";
import { LOCAL_USER_ID } from "@/data/demo-workspace";
import { getRealtime } from "@/services/realtime/realtime-client";
import { useUiStore } from "@/stores/ui-store";
import { uid } from "@/lib/utils";
import type { ChatAttachment, ChatChannel, ChatMessage } from "@/types/domain";

interface ChatState {
  channels: ChatChannel[];
  messages: Record<string, ChatMessage[]>;
  unread: Record<string, number>;
  activeChannelId: string;
  threadParentId: string | null;
  init: (channels: ChatChannel[], messages: ChatMessage[]) => void;
  setActive: (channelId: string) => void;
  openThread: (messageId: string | null) => void;
  send: (text: string, options?: { attachments?: ChatAttachment[]; threadParentId?: string; channelId?: string }) => void;
  receive: (message: ChatMessage) => void;
  toggleReaction: (channelId: string, messageId: string, emoji: string) => void;
  openDirectMessage: (userId: string, displayName: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  channels: [],
  messages: {},
  unread: {},
  activeChannelId: "general",
  threadParentId: null,
  init: (channels, messages) => {
    const grouped: Record<string, ChatMessage[]> = {};
    for (const m of [...messages].sort((a, b) => a.timestamp - b.timestamp)) (grouped[m.channelId] ??= []).push(m);
    set({ channels, messages: grouped, unread: { "dm-demo-sofia": 1, engineering: 2 } });
  },
  setActive: (channelId) => set((s) => ({ activeChannelId: channelId, threadParentId: null, unread: { ...s.unread, [channelId]: 0 } })),
  openThread: (messageId) => set({ threadParentId: messageId }),
  send: (text, options = {}) => {
    const channelId = options.channelId ?? get().activeChannelId;
    const message: ChatMessage = {
      id: uid("m"), channelId, senderId: LOCAL_USER_ID, message: text.trim(), timestamp: Date.now(), reactions: [],
      attachments: options.attachments?.length ? options.attachments : undefined, threadParentId: options.threadParentId,
    };
    if (!message.message && !message.attachments) return;
    set((s) => ({ messages: { ...s.messages, [channelId]: [...(s.messages[channelId] ?? []), message] } }));
    getRealtime().send("chat:send", { message });
  },
  receive: (message) => {
    if (message.channelId === "nearby") return;
    set((s) => {
      const visible = useUiStore.getState().sidebar === "chat" && s.activeChannelId === message.channelId;
      return {
        messages: { ...s.messages, [message.channelId]: [...(s.messages[message.channelId] ?? []), message] },
        unread: visible ? s.unread : { ...s.unread, [message.channelId]: (s.unread[message.channelId] ?? 0) + 1 },
      };
    });
  },
  toggleReaction: (channelId, messageId, emoji) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [channelId]: (s.messages[channelId] ?? []).map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions.find((r) => r.emoji === emoji);
          if (!existing) return { ...m, reactions: [...m.reactions, { emoji, userIds: [LOCAL_USER_ID] }] };
          const userIds = existing.userIds.includes(LOCAL_USER_ID) ? existing.userIds.filter((u) => u !== LOCAL_USER_ID) : [...existing.userIds, LOCAL_USER_ID];
          return { ...m, reactions: m.reactions.map((r) => (r === existing ? { ...r, userIds } : r)).filter((r) => r.userIds.length) };
        }),
      },
    })),
  openDirectMessage: (userId, displayName) => {
    const id = `dm-${userId}`;
    set((s) => ({
      channels: s.channels.some((c) => c.id === id) ? s.channels : [...s.channels, { id, kind: "dm", name: displayName, memberIds: [LOCAL_USER_ID, userId] }],
      activeChannelId: id,
      threadParentId: null,
      unread: { ...s.unread, [id]: 0 },
    }));
    useUiStore.getState().openSidebar("chat");
  },
}));

export const totalUnread = (unread: Record<string, number>) => Object.values(unread).reduce((a, b) => a + b, 0);
