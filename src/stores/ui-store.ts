import { create } from "zustand";
import { persist } from "zustand/middleware";
import { migrateLegacyStorage } from "@/lib/storage";
import { uid } from "@/lib/utils";

migrateLegacyStorage();

export type SidebarTab = "people" | "chat" | "meetings" | "activity";
export type DialogState =
  | { type: "onboarding" }
  | { type: "avatar" }
  | { type: "desk"; objectId: string; deskId: string; label: string; hot: boolean }
  | { type: "leave" }
  | { type: "profile" }
  | { type: "room"; roomId: string }
  | { type: "whiteboard"; boardId: string; title: string }
  | { type: "meeting" }
  | { type: "floors"; via: "elevator" | "stairs" | "default" }
  | { type: "settings" }
  | { type: "help" }
  | { type: "note"; userId: string }
  | { type: "labels" };

export interface Toast {
  id: string;
  title: string;
  body?: string;
  tone: "info" | "success" | "warning" | "error";
  actions?: { label: string; run: () => void }[];
}
export interface ActivityEntry {
  id: string;
  text: string;
  at: number;
}

interface UiState {
  sidebar: SidebarTab | null;
  dialog: DialogState | null;
  /** Participant whose profile card is open. */
  selectedUserId: string | null;
  toasts: Toast[];
  activity: ActivityEntry[];
  emoteMenuOpen: boolean;
  focusPeopleSearch: number;
  focusNearbyChat: number;
  // persisted preferences
  showMinimap: boolean;
  workspaceId: string;
  keyOverrides: Record<string, string[]>;
  openSidebar: (tab: SidebarTab) => void;
  toggleSidebar: (tab: SidebarTab) => void;
  closeSidebar: () => void;
  openDialog: (dialog: DialogState) => void;
  closeDialog: () => void;
  selectUser: (id: string | null) => void;
  toast: (toast: Omit<Toast, "id" | "tone"> & { tone?: Toast["tone"] }) => void;
  dismissToast: (id: string) => void;
  logActivity: (text: string) => void;
  set: (patch: Partial<UiState>) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebar: null,
      dialog: null,
      selectedUserId: null,
      toasts: [],
      activity: [],
      emoteMenuOpen: false,
      focusPeopleSearch: 0,
      focusNearbyChat: 0,
      showMinimap: true,
      workspaceId: "demo",
      keyOverrides: {},
      openSidebar: (tab) => set({ sidebar: tab }),
      toggleSidebar: (tab) => set((s) => ({ sidebar: s.sidebar === tab ? null : tab })),
      closeSidebar: () => set({ sidebar: null }),
      openDialog: (dialog) => set({ dialog }),
      closeDialog: () => set({ dialog: null }),
      selectUser: (id) => set({ selectedUserId: id }),
      toast: (toast) => set((s) => ({ toasts: [...s.toasts.slice(-3), { tone: "info", ...toast, id: uid("toast") }] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      logActivity: (text) => set((s) => ({ activity: [{ id: uid("act"), text, at: Date.now() }, ...s.activity].slice(0, 40) })),
      set: (patch) => set(patch),
    }),
    {
      name: "ajar.ui",
      version: 1,
      partialize: (s) => ({ showMinimap: s.showMinimap, workspaceId: s.workspaceId, keyOverrides: s.keyOverrides }),
    },
  ),
);

export const toast = (t: Parameters<UiState["toast"]>[0]) => useUiStore.getState().toast(t);
