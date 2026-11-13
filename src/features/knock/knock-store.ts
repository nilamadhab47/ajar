"use client";

import { create } from "zustand";
import { useConversationStore } from "@/features/conversation/conversation-store";
import { usePeopleStore } from "@/features/people/people-store";
import { WORLD_CONFIG } from "@/lib/config";
import { firstName } from "@/lib/utils";
import { toast, useUiStore } from "@/stores/ui-store";
import { effectiveDoor } from "@/types/domain";

/** Stable demo replies so the same person always answers the same way. */
const DEMO_REPLY: Record<string, "accept" | "decline" | "later"> = {
  "demo-aarav": "accept",
  "demo-hana": "decline",
  "demo-amara": "later",
  "demo-tomas": "accept",
  "demo-zainab": "decline",
  "demo-dev": "later",
};

const DEMO_PRESET: Record<string, string> = {
  "demo-hana": "In a meeting",
  "demo-zainab": "Free after 3pm",
};

export interface DeskNote {
  id: string;
  userId: string;
  text: string;
  at: number;
}

interface KnockState {
  pendingId: string | null;
  cooloffUntil: Record<string, number>;
  knocksThisHour: number[];
  notes: DeskNote[];
  knock: (userId: string) => void;
  leaveNote: (userId: string, text: string) => void;
}

function replyFor(id: string): "accept" | "decline" | "later" {
  return DEMO_REPLY[id] ?? "accept";
}

/** Demo knock. An open door accepts on the click. Ask waits, then the other person answers. A closed door only takes a note. Nothing here turns a microphone on. */
export const useKnockStore = create<KnockState>((set, get) => ({
  pendingId: null,
  cooloffUntil: {},
  knocksThisHour: [],
  notes: [],
  knock: (userId) => {
    const user = usePeopleStore.getState().users[userId];
    if (!user) return;
    const door = effectiveDoor(user.status, user.door);
    const name = firstName(user.displayName);
    if (door === "closed") {
      useUiStore.getState().openDialog({ type: "note", userId });
      return;
    }
    if (useConversationStore.getState().active?.invitedIds.includes(userId)) {
      toast({ title: `You're already with ${name}` });
      return;
    }
    if (get().pendingId) {
      toast({ title: "You already knocked", body: "Wait for a reply before knocking again." });
      return;
    }
    const until = get().cooloffUntil[userId] ?? 0;
    if (until > Date.now()) {
      toast({ title: `${name} needs a minute`, body: "A knock was just declined. Try again shortly." });
      return;
    }
    const recent = get().knocksThisHour.filter((t) => Date.now() - t < 60 * 60 * 1000);
    if (recent.length >= 10) {
      toast({ title: "That's enough knocks for now", body: "Ten knocks an hour is the limit." });
      return;
    }
    if (door === "open") {
      set({ knocksThisHour: [...recent, Date.now()] });
      useConversationStore.getState().start([userId]);
      toast({ title: `${name} says come on in`, tone: "success" });
      useUiStore.getState().logActivity(`${name} accepted your knock.`);
      return;
    }
    set({ pendingId: userId, knocksThisHour: [...recent, Date.now()] });
    toast({ title: `You knocked on ${name}'s door`, body: "Waiting for a reply…" });
    const reply = replyFor(userId);
    window.setTimeout(() => {
      if (get().pendingId !== userId) return;
      set({ pendingId: null });
      if (reply === "accept") {
        useConversationStore.getState().start([userId]);
        toast({ title: `${name} says come on in`, tone: "success" });
        useUiStore.getState().logActivity(`${name} accepted your knock.`);
        return;
      }
      if (reply === "decline") {
        const preset = DEMO_PRESET[userId] ?? "Leave me a note";
        set((s) => ({ cooloffUntil: { ...s.cooloffUntil, [userId]: Date.now() + WORLD_CONFIG.knock.demoCooloffMs } }));
        toast({
          title: `${name} isn't free right now`,
          body: `Not right now. We've let them know you stopped by. They said: “${preset}”.`,
          tone: "warning",
        });
        useUiStore.getState().logActivity(`You stopped by ${name}'s door. They replied “${preset}”.`);
        return;
      }
      toast({ title: `${name} will reply later`, body: "Your knock is waiting. You can leave a note from their profile if the door closes." });
      useUiStore.getState().logActivity(`${name} will reply to your knock later.`);
    }, 900);
  },
  leaveNote: (userId, text) => {
    const trimmed = text.trim().slice(0, 280);
    if (!trimmed) return;
    const user = usePeopleStore.getState().users[userId];
    const name = user ? firstName(user.displayName) : "them";
    set((s) => ({ notes: [{ id: `note-${Date.now()}`, userId, text: trimmed, at: Date.now() }, ...s.notes].slice(0, 20) }));
    useUiStore.getState().closeDialog();
    toast({ title: `Note left for ${name}`, body: "They'll see it when they look up." });
    useUiStore.getState().logActivity(`You left ${name} a note: “${trimmed}”`);
  },
}));
