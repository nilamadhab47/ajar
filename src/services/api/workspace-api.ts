import { buildDemoMeetings, DEMO_WORKSPACE } from "@/data/demo-workspace";
import { isMockMode } from "@/lib/env";
import type { Meeting, Workspace } from "@/types/domain";
import { apiRequest } from "./api-client";

/** Proposed REST endpoints; in mock mode each call resolves with seeded demo data. */
export const workspaceApi = {
  async getWorkspace(workspaceId: string): Promise<Workspace> {
    if (isMockMode) return { ...DEMO_WORKSPACE, id: workspaceId };
    return apiRequest<Workspace>(`/workspaces/${encodeURIComponent(workspaceId)}`);
  },
  async listMeetings(workspaceId: string): Promise<Meeting[]> {
    if (isMockMode) return buildDemoMeetings(Date.now());
    return apiRequest<Meeting[]>(`/workspaces/${encodeURIComponent(workspaceId)}/meetings`);
  },
  async saveMeeting(workspaceId: string, meeting: Meeting): Promise<Meeting> {
    if (isMockMode) return meeting;
    return apiRequest<Meeting>(`/workspaces/${encodeURIComponent(workspaceId)}/meetings/${meeting.id}`, { method: "PUT", json: meeting });
  },
};
