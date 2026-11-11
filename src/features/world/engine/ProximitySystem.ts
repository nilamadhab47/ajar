import { WORLD_CONFIG } from "@/lib/config";
import type { PresenceStatus } from "@/types/domain";
import type { Room } from "../types/world.types";
import type { NearbyParticipant } from "../world-store";

export interface ProximitySubject {
  id: string;
  x: number;
  y: number;
  status: PresenceStatus;
  room: Room | null;
}

const { discoveryTiles, closeTiles, quietTiles } = WORLD_CONFIG.proximity;

/**
 * Who can the local player talk to right now?
 *  - Open areas: connection fades in from the discovery radius to the close radius.
 *  - Private zones / meeting rooms: everyone in the same zone, nobody outside it.
 *  - Quiet areas: only people right next to you.
 *  - Do-not-disturb (either side): never.
 * Pure function so the same rules can run on a server.
 */
export function computeNearby(local: ProximitySubject, others: ProximitySubject[], tileSize: number = WORLD_CONFIG.tileSize): NearbyParticipant[] {
  if (local.status === "dnd" || local.status === "offline") return [];
  const result: NearbyParticipant[] = [];
  for (const o of others) {
    if (o.status === "dnd" || o.status === "offline") continue;
    const distanceTiles = Math.hypot(o.x - local.x, o.y - local.y) / tileSize;
    const localPrivate = local.room?.isPrivate ?? false;
    const otherPrivate = o.room?.isPrivate ?? false;
    if (localPrivate || otherPrivate) {
      if (local.room?.id !== o.room?.id) continue;
      result.push({ userId: o.id, distanceTiles, strength: 1, close: true });
      continue;
    }
    const quiet = (local.room?.zone === "open" && local.room.quiet) || (o.room?.zone === "open" && o.room.quiet);
    const discovery = quiet ? quietTiles + 0.5 : discoveryTiles;
    const close = quiet ? quietTiles : closeTiles;
    if (distanceTiles > discovery) continue;
    const strength = distanceTiles <= close ? 1 : 1 - (distanceTiles - close) / (discovery - close);
    result.push({ userId: o.id, distanceTiles, strength, close: distanceTiles <= close });
  }
  return result.sort((a, b) => a.distanceTiles - b.distanceTiles);
}

/** Cheap equality so the store only updates when something visible changed. */
export function nearbySignature(list: NearbyParticipant[]): string {
  return list.map((n) => `${n.userId}:${n.close ? 1 : 0}:${Math.round(n.strength * 4)}`).join(",");
}
