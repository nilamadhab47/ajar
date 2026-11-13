/** Area labels on the starter floor. Keep these ids aligned with server/src/account/places.ts. */
export const OFFICE_AREAS = [
  { id: "product", name: "Product" },
  { id: "engineering", name: "Engineering" },
  { id: "design", name: "Design" },
] as const;

export type PlaceKind = "area" | "room" | "desk";

export interface OfficePlace {
  kind: PlaceKind;
  id: string;
  name: string | null;
  note: string | null;
}

/** Room ids on the starter floor. Keep these aligned with server/src/account/places.ts. */
export const OFFICE_ROOM_IDS = new Set([
  "meeting-a",
  "meeting-b",
  "kitchen",
  "library",
  "workspace",
  "lounge",
  "quiet",
  "reception",
  "studio",
  "garden",
]);

const areaIds = new Map<string, string>(OFFICE_AREAS.map((area) => [area.name, area.id]));

/** The starter area behind a painted map label, when that label is one of the three pods. */
export function areaIdForLabel(text: string): string | null {
  return areaIds.get(text) ?? null;
}
