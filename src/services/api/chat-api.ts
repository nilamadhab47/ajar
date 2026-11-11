import { buildDemoMessages, DEMO_CHANNELS } from "@/data/demo-workspace";
import { isMockMode } from "@/lib/env";
import type { ChatChannel, ChatMessage } from "@/types/domain";
import { apiRequest } from "./api-client";

export const chatApi = {
  async listChannels(workspaceId: string): Promise<ChatChannel[]> {
    if (isMockMode) return DEMO_CHANNELS;
    return apiRequest<ChatChannel[]>(`/workspaces/${workspaceId}/channels`);
  },
  async getHistory(workspaceId: string): Promise<ChatMessage[]> {
    if (isMockMode) return buildDemoMessages(Date.now());
    return apiRequest<ChatMessage[]>(`/workspaces/${workspaceId}/messages`);
  },
};
