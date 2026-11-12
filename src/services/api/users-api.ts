import type { Avatar } from "@/features/avatar/types/avatar.types";
import { env } from "@/lib/env";
import type { DoorState, PresenceStatus, User } from "@/types/domain";
import { apiRequest } from "./api-client";

export const usersApi = {
  /** Returns null when no API is configured. The demo profile stays in this browser. */
  async getCurrentUser(): Promise<User | null> {
    if (!env.apiBaseUrl) return null;
    return apiRequest<User>("/users/me");
  },
  async updateProfile(patch: { displayName?: string; status?: PresenceStatus; avatar?: Avatar; door?: DoorState }): Promise<void> {
    if (!env.apiBaseUrl) return;
    try {
      await apiRequest<User>("/users/me", { method: "PATCH", json: patch });
    } catch {
      // The local profile already changed. A missing session should not block the demo.
    }
  },
};
