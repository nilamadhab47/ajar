const roles = ["owner", "admin", "member", "guest"] as const;

/** A role someone can hold in one office. */
export type OfficeRole = (typeof roles)[number];

/** Accepts an office role. */
export function officeRole(value: unknown): OfficeRole | null {
  return typeof value === "string" && roles.includes(value as OfficeRole)
    ? (value as OfficeRole)
    : null;
}

/** Owners and admins invite. Only an owner can invite another owner. */
export function canInvite(actor: OfficeRole, role: OfficeRole): boolean {
  if (actor !== "owner" && actor !== "admin") return false;
  if (role === "owner") return actor === "owner";
  return true;
}

/** Role changes that touch owner are owner-only. Admins can change the other roles. */
export function canChangeRole(actor: OfficeRole, from: OfficeRole, to: OfficeRole): boolean {
  if (actor !== "owner" && actor !== "admin") return false;
  if (from === "owner" || to === "owner") return actor === "owner";
  return true;
}

/** Owners can remove anyone. Admins can remove anyone except an owner. Anyone can leave. */
export function canRemove(actor: OfficeRole, target: OfficeRole, self: boolean): boolean {
  if (self) return true;
  if (actor === "owner") return true;
  if (actor === "admin") return target !== "owner";
  return false;
}
