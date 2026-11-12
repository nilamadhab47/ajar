const statuses = new Set([
  "available",
  "busy",
  "focus",
  "in-meeting",
  "away",
  "dnd",
  "offline",
]);

/** Trims a company or office name and rejects an empty one. */
export function officeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 80) return null;
  return name;
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
