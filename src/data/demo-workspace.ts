import type { ChatChannel, ChatMessage, Floor, Meeting, Workspace } from "@/types/domain";
import { DEMO_PARTICIPANTS } from "./demo-participants";

export const LOCAL_USER_ID = "local-user";

const floor = (level: number, name: string, mapUrl: string, w: number, h: number, ready: boolean): Floor => ({
  id: `floor-${level}`, name, level, mapId: mapUrl.replace(/^.*\/|\.json$/g, ""), mapUrl, ready,
  spawnPoints: [], dimensions: { width: w, height: h, tileSize: 32 },
});

export const DEMO_FLOORS: Floor[] = [
  floor(1, "Main Office", "/maps/demo-office.json", 64, 40, true),
  floor(2, "Collaboration", "/maps/floor-2.json", 30, 20, false),
  floor(3, "Management", "/maps/floor-3.json", 30, 20, false),
  floor(4, "Events", "/maps/floor-4.json", 30, 20, false),
  floor(5, "Recreation", "/maps/floor-5.json", 30, 20, false),
];

export const DEMO_WORKSPACE: Workspace = {
  id: "demo", name: "Cruit", officeName: "Ajar", logo: "/brand/cruit-icon-filled.png", activeFloorId: "floor-1",
  members: [LOCAL_USER_ID, ...DEMO_PARTICIPANTS.map((p) => p.user.id)], floors: DEMO_FLOORS,
};

export const DEMO_CHANNELS: ChatChannel[] = [
  { id: "general", kind: "channel", name: "general", memberIds: DEMO_WORKSPACE.members, topic: "Company-wide announcements and chatter" },
  { id: "engineering", kind: "channel", name: "engineering", memberIds: DEMO_WORKSPACE.members, topic: "Builds, reviews and incidents" },
  { id: "random", kind: "channel", name: "random", memberIds: DEMO_WORKSPACE.members, topic: "Anything goes" },
  { id: "group-launch", kind: "group", name: "Launch crew", memberIds: [LOCAL_USER_ID, "demo-sofia", "demo-hana", "demo-lucas"] },
  { id: "dm-demo-sofia", kind: "dm", name: "Sofia Lindqvist", memberIds: [LOCAL_USER_ID, "demo-sofia"] },
  { id: "dm-demo-aarav", kind: "dm", name: "Prayag", memberIds: [LOCAL_USER_ID, "demo-aarav"] },
];

const MIN = 60_000;
type Seed = [channel: string, sender: string, minutesAgo: number, text: string, reactions?: [string, string[]][], parent?: string];
const SEED: Seed[] = [
  ["general", "priya", 190, "Good morning everyone! Fresh coffee beans in the kitchen today ☕", [["☕", ["demo-dev", "demo-noah"]], ["🙌", ["demo-hana"]]]],
  ["general", "tomas", 122, "Reminder: Design Crit is in the Atlas Room at 2pm. Bring questions."],
  ["general", "sofia", 64, "Q3 roadmap draft is ready for comments. I'll walk through it Thursday.", [["👀", ["demo-kenji", "demo-amara"]]]],
  ["general", "noah", 18, "A few of us are in the lounge if anyone wants to say hi."],
  ["engineering", "aarav", 140, "Deployed the presence service to staging. p95 is down to 38ms."],
  ["engineering", "kenji", 131, "Nice. Did the reconnect storm test pass?", undefined, "m-4"],
  ["engineering", "aarav", 128, "Yes — 2k sockets dropped and recovered in under 4s.", [["🚀", ["demo-kenji", "demo-lucas", "demo-tomas"]]], "m-4"],
  ["engineering", "lucas", 47, "Sprite batching PR is up. The office renders in a single draw pass now."],
  ["engineering", "elif", 22, "Heads-down in the quiet zone until 4. Ping me only if prod is on fire 🔥"],
  ["random", "mateo", 210, "Whoever keeps ringing the gong: respect."],
  ["random", "zainab", 95, "The pond in the garden has a fish now?? 🐟", [["😂", ["demo-mateo", "demo-ingrid", "demo-priya"]]]],
  ["random", "dev", 12, "Coffee break. Come find me in the kitchen."],
  ["group-launch", "hana", 75, "Onboarding illustrations are final. Uploading shortly."],
  ["group-launch", "lucas", 70, "Great, I'll wire them into the avatar picker."],
  ["dm-demo-sofia", "sofia", 33, "Hey! Got a minute later to look at the roadmap together?"],
  ["dm-demo-aarav", "aarav", 260, "Thanks for the review yesterday 🙏"],
];

/** Built on demand so timestamps are relative to "now". */
export function buildDemoMessages(now: number): ChatMessage[] {
  return SEED.map(([channelId, sender, minutesAgo, message, reactions, parent], i) => ({
    id: `m-${i}`, channelId, senderId: `demo-${sender}`, message, timestamp: now - minutesAgo * MIN,
    reactions: (reactions ?? []).map(([emoji, userIds]) => ({ emoji, userIds })),
    threadParentId: parent,
  }));
}

export function buildDemoMeetings(now: number): Meeting[] {
  return [
    { id: "mtg-crit", title: "Design Crit", kind: "meeting", roomId: "meeting-a", hostId: "demo-amara", participants: ["demo-amara", "demo-tomas", "demo-ingrid"], invited: [LOCAL_USER_ID], status: "active", startTime: now - 22 * MIN },
    { id: "mtg-1on1", title: "Roadmap 1:1 with Sofia", kind: "meeting", roomId: "meeting-b", hostId: "demo-sofia", participants: [], invited: [LOCAL_USER_ID, "demo-sofia"], status: "waiting", startTime: now - 1 * MIN },
    { id: "mtg-sprint", title: "Sprint Planning", kind: "meeting", roomId: "meeting-b", hostId: "demo-tomas", participants: [], invited: [LOCAL_USER_ID, "demo-aarav", "demo-kenji", "demo-lucas"], status: "scheduled", startTime: now + 45 * MIN },
    { id: "mtg-standup", title: "Daily Stand-up", kind: "meeting", roomId: null, hostId: "demo-tomas", participants: [], invited: [], status: "ended", startTime: now - 200 * MIN, endTime: now - 185 * MIN },
  ];
}

export const DEMO_CHANNEL_LINES: [channel: string, sender: string, text: string][] = [
  ["general", "hana", "New avatar hairstyles just landed — go try the customiser ✨"],
  ["engineering", "kenji", "Migration plan doc is ready for review."],
  ["random", "noah", "Lounge playlist recommendations welcome 🎧"],
  ["general", "priya", "Visitors arriving at 4pm, please say hello at reception."],
  ["engineering", "lucas", "Anyone free to pair on the mini-map?"],
  ["random", "mateo", "Garden bench is the best seat in the office. Fight me."],
];
export const DEMO_DM_REPLIES = [
  "Sounds good!",
  "Let me check and get back to you.",
  "Sure — walk over whenever.",
];
export const DEMO_NEARBY_REPLIES = ["Hey! 👋", "Oh hi!", "Good to see you", "What's up?", "😄"];
