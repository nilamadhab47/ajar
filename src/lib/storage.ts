/** Browser storage prefix. Older builds used `veranda.`. */
export const STORAGE_PREFIX = "ajar.";
const LEGACY_STORAGE_PREFIX = "veranda.";

/** Copies `veranda.*` onto `ajar.*` once, then deletes the old keys. Safe to call more than once. */
export function migrateLegacyStorage(): void {
  if (typeof localStorage === "undefined") return;
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(LEGACY_STORAGE_PREFIX)) continue;
    const next = STORAGE_PREFIX + key.slice(LEGACY_STORAGE_PREFIX.length);
    if (localStorage.getItem(next) == null) {
      const value = localStorage.getItem(key);
      if (value != null) localStorage.setItem(next, value);
    }
    localStorage.removeItem(key);
  }
}

/** Removes saved profile, avatar, desk and UI prefs, including any leftover legacy keys. */
export function clearAppStorage(): void {
  if (typeof localStorage === "undefined") return;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(STORAGE_PREFIX) || key.startsWith(LEGACY_STORAGE_PREFIX)) localStorage.removeItem(key);
  }
}
