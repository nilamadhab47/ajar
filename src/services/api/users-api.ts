import type { Avatar } from "@/features/avatar/types/avatar.types";
import { isMockMode } from "@/lib/env";
import type { PresenceStatus, User } from "@/types/domain";
import { apiRequest } from "./api-client";

export const usersApi = {
  /** Returns null in mock mode: the local profile lives in browser storage. */
  async getCurrentUser(): Promise<User | null> {
    if (isMockMode) return null;
    return apiRequest<User>("/users/me");
  },
  async updateProfile(patch: { displayName?: string; status?: PresenceStatus; avatar?: Avatar }): Promise<void> {
    if (isMockMode) return;
    await apiRequest<void>("/users/me", { method: "PATCH", json: patch });
  },
};
