/** Chair tiles on the starter floor. The front door spawn is 27, 35. */
const SPAWN = { x: 27, y: 35 };

export const STARTER_DESKS = [
  { id: "W-01", area: "Product", x: 6, y: 18 },
  { id: "W-02", area: "Product", x: 9, y: 18 },
  { id: "W-03", area: "Product", x: 6, y: 22 },
  { id: "W-04", area: "Product", x: 9, y: 22 },
  { id: "W-05", area: "Engineering", x: 15, y: 18 },
  { id: "W-06", area: "Engineering", x: 18, y: 18 },
  { id: "W-07", area: "Engineering", x: 15, y: 22 },
  { id: "W-08", area: "Engineering", x: 18, y: 22 },
  { id: "W-09", area: "Design", x: 24, y: 18 },
  { id: "W-10", area: "Design", x: 27, y: 18 },
  { id: "W-11", area: "Design", x: 24, y: 22 },
  { id: "W-12", area: "Design", x: 27, y: 22 },
] as const;

const deskIds = new Set<string>(STARTER_DESKS.map((desk) => desk.id));

/** The closest free starter desk to the front door, or null when none are free. */
export function nearestFreeDesk(taken: ReadonlySet<string>): string | null {
  const free = STARTER_DESKS.filter((desk) => !taken.has(desk.id)).sort((a, b) => {
    const distance = (desk: { x: number; y: number }) =>
      (desk.x - SPAWN.x) ** 2 + (desk.y - SPAWN.y) ** 2;
    return distance(a) - distance(b) || a.id.localeCompare(b.id);
  });
  return free[0]?.id ?? null;
}

/** Accepts a starter desk that is free, or the nearest free desk when none was chosen. */
export function deskChoice(value: unknown, taken: ReadonlySet<string>): string | null {
  if (value === undefined || value === null || value === "") return nearestFreeDesk(taken);
  if (typeof value !== "string" || !deskIds.has(value) || taken.has(value)) return null;
  return value;
}
