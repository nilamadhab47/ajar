"use client";

import { useEffect } from "react";
import { currentUserId } from "@/features/people/people-store";
import { useAvatarStore } from "@/features/avatar/avatar-store";
import { useChatStore } from "@/features/chat/chat-store";
import { useConversationStore } from "@/features/conversation/conversation-store";
import { deskSeatId, useDeskStore } from "@/features/desk/desk-store";
import { mediaActions, useMediaStore } from "@/features/media/media-controller";
import { useMeetingStore } from "@/features/meetings/meeting-store";
import { usePeopleStore } from "@/features/people/people-store";
import { useProfileStore } from "@/features/presence/presence-store";
import { sendWorldCommand, worldRuntime } from "@/features/world/world-bridge";
import { useWorldStore } from "@/features/world/world-store";
import { env, isMockMode } from "@/lib/env";
import { shortcuts } from "@/lib/shortcuts";
import { firstName } from "@/lib/utils";
import { apiRequest } from "@/services/api/api-client";
import { chatApi } from "@/services/api/chat-api";
import { workspaceApi } from "@/services/api/workspace-api";
import { getRealtime } from "@/services/realtime/realtime-client";
import { useAppStore } from "@/stores/app-store";
import { useUiStore } from "@/stores/ui-store";

/**
 * Loads workspace data, connects realtime and wires server events and keyboard
 * shortcuts to the stores. Everything is torn down on unmount.
 */
export function useOfficeBootstrap(workspaceId: string): void {
  useEffect(() => {
    const ui = useUiStore.getState;
    const realtime = getRealtime();
    const disposers: (() => void)[] = [];
    let cancelled = false;

    // Demo-only console handle for debugging and automated checks.
    if (isMockMode) Object.assign(window, { __ajar: { worldRuntime, world: useWorldStore, ui: useUiStore, send: sendWorldCommand } });

    shortcuts.setOverrides(ui().keyOverrides);
    disposers.push(shortcuts.attach());
    disposers.push(useUiStore.subscribe((s, prev) => s.keyOverrides !== prev.keyOverrides && shortcuts.setOverrides(s.keyOverrides)));

    // ---- shortcuts that belong to the application shell
    disposers.push(
      shortcuts.on("toggleMic", () => void mediaActions.toggleMicrophone()),
      shortcuts.on("toggleCamera", () => void mediaActions.toggleCamera()),
      shortcuts.on("openChat", () => ui().toggleSidebar("chat")),
      shortcuts.on("openPeople", () => ui().toggleSidebar("people")),
      shortcuts.on("quickPeople", () => ui().set({ sidebar: "people", focusPeopleSearch: Date.now() })),
      shortcuts.on("emoteMenu", () => ui().set({ emoteMenuOpen: !ui().emoteMenuOpen })),
      shortcuts.on("nearbyChat", () => ui().set({ focusNearbyChat: Date.now() })),
      shortcuts.on("walkToDesk", () => walkToMyDesk()),
      shortcuts.on("escape", () => ui().set({ selectedUserId: null, emoteMenuOpen: false })),
    );

    // ---- realtime → stores
    disposers.push(
      realtime.onStateChange((connection, detail) => {
        const prev = useAppStore.getState().connection;
        useAppStore.getState().set({ connection, connectionDetail: detail ?? null });
        if (connection === "connected" && prev === "reconnecting") ui().toast({ title: "Back online", body: "Realtime connection restored.", tone: "success" });
      }),
      realtime.on("world:snapshot", (s) => {
        usePeopleStore.getState().setSnapshot(s.users, s.presence);
        useDeskStore.getState().setAssignments(s.deskAssignments);
      }),
      realtime.on("player:joined", ({ user }) => {
        usePeopleStore.getState().upsertUser(user);
        ui().logActivity(`${user.displayName} entered the office`);
      }),
      realtime.on("player:left", ({ playerId }) => usePeopleStore.getState().removeUser(playerId)),
      realtime.on("player:status:updated", (p) => {
        if (p.playerId !== currentUserId()) usePeopleStore.getState().setStatus(p.playerId, p.status, p.activity);
      }),
      realtime.on("chat:message", ({ message }) => {
        useChatStore.getState().receive(message);
        if (message.channelId.startsWith("dm-") && ui().sidebar !== "chat") {
          const sender = usePeopleStore.getState().users[message.senderId];
          ui().toast({
            title: `Message from ${sender ? firstName(sender.displayName) : "a colleague"}`, body: message.message,
            actions: [{ label: "Open", run: () => useChatStore.getState().openDirectMessage(message.senderId, sender?.displayName ?? "Direct message") }],
          });
        }
      }),
      realtime.on("player:waved", (p) => {
        if (p.targetId !== currentUserId()) return;
        const user = usePeopleStore.getState().users[p.playerId];
        if (!user) return;
        ui().logActivity(`${user.displayName} waved at you`);
        ui().toast({
          title: `${firstName(user.displayName)} waved at you 👋`,
          actions: [
            { label: "Walk over", run: () => sendWorldCommand({ type: "walk-to-user", userId: user.id }) },
            { label: "Wave back", run: () => { ui().selectUser(user.id); sendWorldCommand({ type: "action", action: "wave" }); } },
          ],
        });
      }),
      realtime.on("conversation:participant:joined", (p) => useConversationStore.getState().participantJoined(p.conversationId, p.playerId)),
      realtime.on("conversation:participant:left", (p) => useConversationStore.getState().participantLeft(p.conversationId, p.playerId)),
      realtime.on("world:error", (e) => ui().toast({ title: "Something went wrong", body: e.message, tone: "error" })),
    );

    // ---- local changes → realtime
    disposers.push(
      useProfileStore.subscribe((s, prev) => {
        if (s.status !== prev.status || s.statusEmoji !== prev.statusEmoji)
          realtime.send("player:status:update", { playerId: currentUserId(), status: s.status, statusEmoji: s.statusEmoji });
      }),
      useAvatarStore.subscribe((s, prev) => {
        if (s.appearance !== prev.appearance)
          realtime.send("player:avatar:update", { playerId: currentUserId(), avatar: { ...s.appearance, id: "avatar-local", animationState: "idle", direction: "down" } });
      }),
      useMediaStore.subscribe((s, prev) => {
        if (s.error && s.error !== prev.error) ui().toast({ title: "Media", body: s.error, tone: "warning" });
      }),
    );

    void (async () => {
      try {
        const [workspace, channels, history, meetings] = await Promise.all([
          workspaceApi.getWorkspace(workspaceId), chatApi.listChannels(workspaceId), chatApi.getHistory(workspaceId), workspaceApi.listMeetings(workspaceId),
        ]);
        if (cancelled) return;
        useChatStore.getState().init(channels, history);
        useMeetingStore.getState().init(meetings);
        ui().set({ workspaceId });
        await realtime.connect();
        if (cancelled) return;
        useAppStore.getState().set({ workspace });
        if (env.apiBaseUrl) {
          try {
            const listed = await apiRequest<{ offices: { id: string; organizationName: string; officeName: string; title: string | null; deskId: string | null }[] }>("/workspaces");
            const mine = listed.offices.find((office) => office.id === workspaceId);
            if (!cancelled && mine) {
              const current = useAppStore.getState().workspace;
              if (current) useAppStore.getState().set({ workspace: { ...current, name: mine.organizationName, officeName: mine.officeName, logo: null } });
            }
            if (!cancelled && mine?.deskId) useDeskStore.getState().claim(mine.deskId);
            if (!cancelled && mine?.title) useProfileStore.setState({ title: mine.title });
          } catch {
            // The floor still opens when the saved desk cannot be read.
          }
        }
        if (!useProfileStore.getState().onboarded) ui().openDialog({ type: "onboarding" });
      } catch (err) {
        if (!cancelled) useAppStore.getState().set({ connection: "error", connectionDetail: err instanceof Error ? err.message : "Failed to load the workspace" });
      }
    })();

    return () => {
      cancelled = true;
      disposers.forEach((d) => d());
      realtime.disconnect();
      useAppStore.getState().set({ workspace: null, connection: "idle" });
    };
  }, [workspaceId]);
}

/** Walks to the local user's claimed desk and sits down. */
export function walkToMyDesk(): void {
  const deskId = useDeskStore.getState().myDeskId;
  if (!deskId) {
    useUiStore.getState().toast({ title: "You don't have a desk yet", body: "Walk up to an unassigned desk and press E to claim it." });
    return;
  }
  sendWorldCommand({ type: "walk-to-object", objectId: deskSeatId(deskId), then: "sit" });
}
