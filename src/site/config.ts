import { BRAND } from "@/lib/config";

/** Marketing-site constants. Product name, descriptor and tagline stay in `BRAND` (src/lib/config.ts). */
export const SITE = {
  url: "https://meetajar.com",
  title: `${BRAND.product} — A Quiet Virtual Office for Remote Teams`,
  description:
    "Ajar brings remote and distributed teams together in a shared virtual office. See who's around, knock before talking, and stay connected across time zones.",
  /** Sign-in is the way into an office. */
  demoPath: "/login",
  /**
   * Where "Request early access" goes (a form URL or a mailto:). Empty hides the button, because a
   * visible button has to work.
   */
  earlyAccessUrl: "",
  /** Social profiles shown in the footer. Empty until real handles exist. */
  social: [] as { label: string; href: string }[],
} as const;

export const NAV_LINKS = [
  { href: "#world", label: "The office" },
  { href: "#knock", label: "Knock" },
  { href: "#desk-drops", label: "Desk drops" },
  { href: "#clocks", label: "Time zones" },
] as const;

/** Pixel size of the baked office still (public/assets/imersa/office-full.png). */
export const OFFICE = { width: 1024, height: 672 } as const;

/** Column of each character's first frame in the baked sheet (4 frames each). */
export const CHARACTER = { developer: 0, office_lady: 4, office_worker: 8, manager: 12, receptionist: 16 } as const;
export type CharacterName = keyof typeof CHARACTER;

export const ROW = { idle_down: 0, idle_left: 1, idle_right: 2, idle_up: 3, walk_down: 4, walk_left: 5, walk_right: 6, walk_up: 7 } as const;
export type RowName = keyof typeof ROW;

export const IMERSA = {
  full: "/assets/imersa/office-full.png",
  full2x: "/assets/imersa/office-full@2x.png",
  base: "/assets/imersa/office-base.png",
  props: "/assets/imersa/office-props.png",
  characters: "/assets/imersa/characters.png",
  data: "/assets/imersa/office.json",
} as const;
