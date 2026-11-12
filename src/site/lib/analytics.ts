/**
 * Provider-agnostic analytics. Events go to `window.dataLayer` and a DOM event (`ajar:track`), so any
 * privacy-friendly provider can be attached later without touching the call sites. Nothing is sent
 * anywhere by this file.
 */
export type SiteEvent =
  | "hero_door_opened"
  | "hero_skip"
  | "cta_click"
  | "office_started"
  | "office_room"
  | "office_knock"
  | "office_note"
  | "office_fast_forward"
  | "office_reset"
  | "sound_toggle"
  | "avatar_shuffle";

export function track(event: SiteEvent, props: Record<string, string | number | boolean> = {}): void {
  if (typeof window === "undefined") return;
  const payload = { event, ...props };
  const w = window as unknown as { dataLayer?: unknown[] };
  (w.dataLayer ??= []).push(payload);
  window.dispatchEvent(new CustomEvent("ajar:track", { detail: payload }));
}
