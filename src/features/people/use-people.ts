"use client";

import { useMemo } from "react";
import { LOCAL_USER_ID } from "@/data/demo-workspace";
import { useWorldStore } from "@/features/world/world-store";
import type { User } from "@/types/domain";
import { useLocalUser, usePeopleStore } from "./people-store";

/** Every known user by id, the local user included. */
export function useAllUsers(): Record<string, User> {
  const me = useLocalUser();
  const users = usePeopleStore((s) => s.users);
  return useMemo(() => ({ ...users, [LOCAL_USER_ID]: me }), [users, me]);
}

/** Human-readable location of a user ("Atlas Room"), or null when unknown. */
export function useRoomName(userId: string | null | undefined): string | null {
  const roomId = usePeopleStore((s) => (userId ? s.locations[userId] : null));
  const rooms = useWorldStore((s) => s.rooms);
  return rooms.find((r) => r.id === roomId)?.name ?? null;
}
