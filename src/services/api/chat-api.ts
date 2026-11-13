import { isMockMode } from "@/lib/env";
import type { ChatChannel, ChatMessage } from "@/types/domain";
import { apiRequest } from "./api-client";

export const chatApi = {
  async listChannels(workspaceId: string): Promise<ChatChannel[]> {
    if (isMockMode) return [];
    return apiRequest<ChatChannel[]>(`/workspaces/${workspaceId}/channels`);
  },
  async getHistory(workspaceId: string): Promise<ChatMessage[]> {
    if (isMockMode) return [];
    return apiRequest<ChatMessage[]>(`/workspaces/${workspaceId}/messages`);
  },
};
