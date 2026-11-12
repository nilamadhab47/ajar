import type { Avatar, Direction } from "@/features/avatar/types/avatar.types";
import { HAIR_COLORS as H, SKIN_TONES as S } from "@/features/avatar/data/avatar-options";
import type { DoorState, PresenceStatus, User } from "@/types/domain";

/**
 * Seeded demo participants. They only exist in mock mode and are always
 * labelled as demo participants in the UI.
 */
export type DemoRoutine = "desk" | "meeting" | "lounge" | "host" | "break";

export interface DemoParticipant {
  user: User;
  routine: DemoRoutine;
  /** Seat the participant returns to. */
  seatId?: string;
  /** Standing spot (tile) for participants without a seat. */
  tile?: [number, number];
  facing?: Direction;
  deskId?: string;
  activity: string;
  /** Leaves the seat now and then to visit a point of interest. */
  takesBreaks?: boolean;
}

function avatar(
  id: string, skin: number, hairstyle: string, hair: number, face: string,
  top: string, topColor: string, bottom: string, bottomColor: string, shoeColor: string,
  acc: Partial<Avatar["accessories"]> = {},
): Avatar {
  return {
    id: `avatar-${id}`, characterId: "base", skinTone: S[skin], hairstyle, hairColor: H[hair], face,
    clothing: { top, topColor, bottom, bottomColor, shoes: bottom === "skirt" ? "flats" : "sneakers", shoeColor },
    accessories: { glasses: "none", hat: "none", headphones: false, bag: "none", extra: "none", accentColor: "#E89B8C", ...acc },
    animationState: "idle", direction: "down",
  };
}

function person(
  id: string, displayName: string, title: string, status: PresenceStatus, door: DoorState, av: Avatar,
  rest: Omit<DemoParticipant, "user">,
): DemoParticipant {
  return { user: { id: `demo-${id}`, displayName, title, status, door, avatar: av, email: `${id}@demo.invalid`, isDemo: true }, ...rest };
}

export const DEMO_PARTICIPANTS: DemoParticipant[] = [
  person("priya", "Priya Nair", "Office Manager", "available", "open",
    avatar("priya", 3, "long", 0, "smile", "jacket", "#D9596B", "trousers", "#2F3340", "#F6F3EE", { extra: "lanyard", accentColor: "#6C63C7" }),
    { routine: "host", tile: [26, 30], facing: "down", activity: "At the front desk" }),
  person("aarav", "Prayag", "Engineering", "busy", "ask",
    avatar("aarav", 3, "side", 0, "beard", "hoodie", "#4F9E86", "trousers", "#2F3340", "#F6F3EE", { headphones: true }),
    { routine: "desk", seatId: "seat-w01", deskId: "W-01", activity: "Reviewing pull requests", takesBreaks: true }),
  person("sofia", "Sofia Lindqvist", "Product Manager", "available", "open",
    avatar("sofia", 0, "bob", 4, "blush", "sweater", "#A9A2D5", "skirt", "#566070", "#2F3340"),
    { routine: "desk", seatId: "seat-w02", deskId: "W-02", activity: "Writing the Q3 roadmap", takesBreaks: true }),
  person("kenji", "Steye", "CEO", "focus", "ask",
    avatar("kenji", 1, "spiky", 0, "neutral", "tee", "#2F3340", "trousers", "#566070", "#E89B8C", { glasses: "square" }),
    { routine: "desk", seatId: "seat-w06", deskId: "W-06", activity: "Deep work: migration plan" }),
  person("hana", "Zenno", "COO", "busy", "ask",
    avatar("hana", 1, "bun", 8, "wide", "shirt", "#F6F3EE", "trousers", "#8B6B4A", "#E89B8C", { glasses: "round" }),
    { routine: "desk", seatId: "seat-w09", deskId: "W-09", activity: "Polishing onboarding flows", takesBreaks: true }),
  person("lucas", "Lucas Ferreira", "Frontend Engineer", "available", "open",
    avatar("lucas", 2, "curly", 2, "smile", "tee", "#E3B84F", "shorts", "#5B8FC7", "#F6F3EE", { bag: "backpack", accentColor: "#5B8FC7" }),
    { routine: "desk", seatId: "seat-w07", deskId: "W-07", activity: "Pairing on the design system", takesBreaks: true }),
  person("elif", "Elif Demir", "Data Analyst", "dnd", "ask",
    avatar("elif", 2, "pony", 3, "neutral", "hoodie", "#566070", "trousers", "#2F3340", "#F6F3EE", { headphones: true, accentColor: "#E3B84F" }),
    { routine: "desk", seatId: "seat-q2", activity: "Heads-down in the quiet zone" }),
  person("amara", "Amara Okafor", "Design Lead", "in-meeting", "ask",
    avatar("amara", 5, "curly", 0, "smile", "jacket", "#E8915A", "trousers", "#2F3340", "#F6F3EE"),
    { routine: "meeting", seatId: "seat-a2", deskId: "W-03", activity: "Design Crit" }),
  person("tomas", "Yuri", "CTO", "in-meeting", "ask",
    avatar("tomas", 4, "short", 1, "moustache", "shirt", "#A9C9DE", "trousers", "#566070", "#8B6B4A", { extra: "tie", accentColor: "#6C63C7" }),
    { routine: "meeting", seatId: "seat-a6", deskId: "W-04", activity: "Design Crit" }),
  person("ingrid", "Ingrid Olsen", "UX Researcher", "in-meeting", "closed",
    avatar("ingrid", 0, "long", 4, "freckles", "sweater", "#A7C9AB", "skirt", "#8B6B4A", "#2F3340", { extra: "scarf", accentColor: "#E89B8C" }),
    { routine: "meeting", seatId: "seat-a3", deskId: "W-10", activity: "Design Crit" }),
  person("noah", "Noah Becker", "Customer Success", "available", "open",
    avatar("noah", 1, "short", 4, "smile", "sweater", "#5B8FC7", "trousers", "#8B6B4A", "#F6F3EE"),
    { routine: "lounge", seatId: "sofa-n:0", deskId: "W-12", activity: "Chatting in the lounge" }),
  person("zainab", "Zainab Hussain", "Marketing Lead", "available", "ask",
    avatar("zainab", 3, "bob", 1, "wide", "shirt", "#E89B8C", "trousers", "#F6F3EE", "#8B6B4A", { hat: "beanie", accentColor: "#A9A2D5" }),
    { routine: "lounge", seatId: "sofa-n:1", deskId: "W-11", activity: "Chatting in the lounge" }),
  person("mateo", "Mateo Rossi", "Account Executive", "available", "open",
    avatar("mateo", 2, "side", 2, "neutral", "jacket", "#566070", "trousers", "#2F3340", "#8B6B4A", { glasses: "shades" }),
    { routine: "lounge", seatId: "sofa-e:0", deskId: "W-08", activity: "Chatting in the lounge" }),
  person("dev", "Dev Kapoor", "DevOps Engineer", "away", "ask",
    avatar("dev", 4, "buzz", 0, "beard", "hoodie", "#E8915A", "shorts", "#2F3340", "#F6F3EE", { hat: "cap", accentColor: "#2F3340" }),
    { routine: "break", tile: [29, 4], facing: "up", activity: "On a coffee break" }),
];

/** Places demo participants visit: [tileX, tileY, facing]. */
export const DEMO_POIS: Record<string, [number, number, Direction]> = {
  coffee: [29, 4, "up"],
  water: [33, 4, "up"],
  fridge: [27, 4, "up"],
  kitchenTable: [32, 8, "left"],
  printer: [4, 24, "left"],
  standup: [16, 26, "up"],
  loungeEdge: [40, 21, "left"],
  library: [41, 6, "up"],
  garden: [55, 15, "right"],
  pond: [57, 20, "up"],
  reception: [29, 33, "left"],
};

export const DEMO_DESK_ASSIGNMENTS: Record<string, string> = Object.fromEntries(
  DEMO_PARTICIPANTS.filter((p) => p.deskId).map((p) => [p.deskId!, p.user.id]),
);
