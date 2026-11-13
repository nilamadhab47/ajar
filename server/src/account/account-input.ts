const statuses = new Set([
  "available",
  "busy",
  "focus",
  "in-meeting",
  "away",
  "dnd",
  "offline",
]);

/** Trims one line and rejects an empty value or one past the limit. */
export function oneLine(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > max) return null;
  return name;
}

/** Trims a company or office name and rejects an empty one. */
export function officeName(value: unknown): string | null {
  return oneLine(value, 80);
}

/** A blank line is absent. A line past the limit is rejected. */
export function optionalLine(value: unknown, max: number): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) return null;
  if (name.length > max) return undefined;
  return name;
}

const doors = new Set(["open", "ask", "closed"]);

/** Accepts a door the office already understands. */
export function doorState(value: unknown): string | null {
  return typeof value === "string" && doors.has(value) ? value : null;
}

/** Accepts a presence status the office already understands. */
export function presenceStatus(value: unknown): string | null {
  return typeof value === "string" && statuses.has(value) ? value : null;
}

/** Accepts an avatar object small enough to store on the person. */
export function avatarPatch(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const encoded = JSON.stringify(value);
  if (encoded.length > 20_000) return null;
  return value as Record<string, unknown>;
}
