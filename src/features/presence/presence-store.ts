import { create } from "zustand";
import { persist } from "zustand/middleware";
import { migrateLegacyStorage } from "@/lib/storage";
import { usersApi } from "@/services/api/users-api";
import type { DoorState, PresenceStatus } from "@/types/domain";

migrateLegacyStorage();

/** The local user's own profile and presence (persisted for the demo). */
interface ProfileState {
  displayName: string;
  title: string;
  status: PresenceStatus;
  statusEmoji: string;
  /** Saved door. Focus and Do not disturb close it without changing this. */
  door: DoorState;
  onboarded: boolean;
  setProfile: (patch: Partial<Pick<ProfileState, "displayName" | "title" | "onboarded">>) => void;
  setStatus: (status: PresenceStatus, statusEmoji?: string) => void;
  setDoor: (door: DoorState) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      displayName: "You",
      title: "",
      status: "available",
      statusEmoji: "",
      door: "ask",
      onboarded: false,
      setProfile: (patch) => {
        set(patch);
        if (patch.displayName) void usersApi.updateProfile({ displayName: patch.displayName });
      },
      setStatus: (status, statusEmoji) => {
        set((s) => ({ status, statusEmoji: statusEmoji ?? s.statusEmoji }));
        void usersApi.updateProfile({ status });
      },
      setDoor: (door) => {
        set({ door });
        void usersApi.updateProfile({ door });
      },
    }),
    { name: "ajar.profile", version: 1 },
  ),
);
