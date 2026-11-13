import { STARTER_DESKS } from "./desks";

/** Area labels on the starter floor. The id stays when the visible name changes. */
export const PLACE_AREAS = [
  { id: "product", name: "Product" },
  { id: "engineering", name: "Engineering" },
  { id: "design", name: "Design" },
] as const;

/** Rooms on the starter floor. Notes attach to the room id, not the painted name. */
export const PLACE_ROOMS = [
  { id: "meeting-a", name: "Atlas Room" },
  { id: "meeting-b", name: "Birch Room" },
  { id: "kitchen", name: "Kitchen" },
  { id: "library", name: "Library" },
  { id: "workspace", name: "Open Workspace" },
  { id: "lounge", name: "Collaboration Lounge" },
  { id: "quiet", name: "Quiet Zone" },
  { id: "reception", name: "Reception" },
  { id: "studio", name: "Dev Lounge" },
  { id: "garden", name: "Garden" },
] as const;

export type PlaceKind = "area" | "room" | "desk";

const kinds = new Set<PlaceKind>(["area", "room", "desk"]);

/** Accepts an area, a room, or a desk that exists on the starter floor. */
export function placeTarget(kind: unknown, id: unknown): { kind: PlaceKind; id: string } | null {
  if (typeof kind !== "string" || !kinds.has(kind as PlaceKind) || typeof id !== "string") return null;
  const placeKind = kind as PlaceKind;
  if (placeKind === "area" && PLACE_AREAS.some((place) => place.id === id)) return { kind: placeKind, id };
  if (placeKind === "room" && PLACE_ROOMS.some((place) => place.id === id)) return { kind: placeKind, id };
  if (placeKind === "desk" && STARTER_DESKS.some((desk) => desk.id === id)) return { kind: placeKind, id };
  return null;
}
