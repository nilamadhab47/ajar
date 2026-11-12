import { create } from "zustand";
import { LOCAL_USER_ID } from "@/data/demo-workspace";
import { useAvatarStore } from "@/features/avatar/avatar-store";
import { useProfileStore } from "@/features/presence/presence-store";
import type { Presence, PresenceStatus, User } from "@/types/domain";

interface PeopleState {
  localUserId: string;
  /** Remote users by id. The local user is derived from the profile and avatar stores. */
  users: Record<string, User>;
  presence: Record<string, Presence>;
  /** userId → room id, refreshed by the world about once per second. */
  locations: Record<string, string | null>;
  setSnapshot: (users: User[], presence: Presence[]) => void;
  upsertUser: (user: User) => void;
  removeUser: (id: string) => void;
  setStatus: (id: string, status: PresenceStatus, activity?: string | null) => void;
  setLocations: (locations: Record<string, string | null>) => void;
}

/** The signed-in person, or the demo id when no API is configured. */
export function currentUserId(): string {
  return usePeopleStore.getState().localUserId;
}

export const usePeopleStore = create<PeopleState>((set) => ({
  localUserId: LOCAL_USER_ID,
  users: {},
  presence: {},
  locations: {},
  setSnapshot: (users, presence) =>
    set({ users: Object.fromEntries(users.map((u) => [u.id, u])), presence: Object.fromEntries(presence.map((p) => [p.userId, p])) }),
  upsertUser: (user) => set((s) => ({ users: { ...s.users, [user.id]: user } })),
  removeUser: (id) =>
    set((s) => {
      const users = { ...s.users };
      delete users[id];
      return { users };
    }),
  setStatus: (id, status, activity) =>
    set((s) => {
      const user = s.users[id];
      const prev = s.presence[id];
      return {
        users: user ? { ...s.users, [id]: { ...user, status } } : s.users,
        presence: prev ? { ...s.presence, [id]: { ...prev, status, currentActivity: activity ?? prev.currentActivity, lastSeenAt: Date.now() } } : s.presence,
      };
    }),
  setLocations: (locations) => set({ locations }),
}));

/** Builds the local User from persisted profile + avatar. */
export function getLocalUser(): User {
  const profile = useProfileStore.getState();
  const { appearance } = useAvatarStore.getState();
  return {
    id: currentUserId(),
    displayName: profile.displayName,
    title: profile.title,
    status: profile.status,
    door: profile.door,
    avatar: { ...appearance, id: "avatar-local", animationState: "idle", direction: "down" },
  };
}

/** React hook: the local user, re-rendering when profile or avatar changes. */
export function useLocalUser(): User {
  const id = usePeopleStore((s) => s.localUserId);
  const displayName = useProfileStore((s) => s.displayName);
  const title = useProfileStore((s) => s.title);
  const status = useProfileStore((s) => s.status);
  const door = useProfileStore((s) => s.door);
  const appearance = useAvatarStore((s) => s.appearance);
  return { id, displayName, title, status, door, avatar: { ...appearance, id: "avatar-local", animationState: "idle", direction: "down" } };
}

export function useUser(id: string | null | undefined): User | null {
  const local = useLocalUser();
  const remote = usePeopleStore((s) => (id ? s.users[id] : undefined));
  if (!id) return null;
  return id === local.id ? local : (remote ?? null);
}
