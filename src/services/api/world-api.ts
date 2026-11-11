import { isMockMode } from "@/lib/env";
import type { TiledMap } from "@/features/world/types/map.types";
import type { WorldObject } from "@/features/world/types/world.types";
import type { Floor } from "@/types/domain";
import { apiRequest } from "./api-client";

export const worldApi = {
  /** Maps are static JSON in mock mode; a backend can serve per-workspace maps from the same shape. */
  async getMap(floor: Floor): Promise<TiledMap> {
    const res = await fetch(floor.mapUrl);
    if (!res.ok) throw new Error(`Map ${floor.mapUrl} failed to load (${res.status})`);
    return (await res.json()) as TiledMap;
  },
  async claimDesk(workspaceId: string, deskId: string): Promise<void> {
    if (isMockMode) return;
    await apiRequest<void>(`/workspaces/${workspaceId}/desks/${deskId}/claim`, { method: "POST" });
  },
  async releaseDesk(workspaceId: string, deskId: string): Promise<void> {
    if (isMockMode) return;
    await apiRequest<void>(`/workspaces/${workspaceId}/desks/${deskId}/claim`, { method: "DELETE" });
  },
  /** Edit-mode publish. Mock mode keeps edits in memory only. */
  async saveObjects(workspaceId: string, floorId: string, objects: WorldObject[]): Promise<void> {
    if (isMockMode) return;
    await apiRequest<void>(`/workspaces/${workspaceId}/floors/${floorId}/objects`, { method: "PUT", json: objects });
  },
};
