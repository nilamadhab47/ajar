import type { Direction } from "../../avatar/types/avatar.types";
import type { InteractionType, ObjectCategory, ObjectDef, SeatDef } from "../types/world.types";

/**
 * Every placeable object kind. Map objects only store their `type` (kind) and
 * per-instance properties; sprite, footprint, collision and interaction
 * behaviour all come from here, so nothing is hard-coded per sprite.
 */
type Extra = Partial<Pick<ObjectDef, "prompt" | "range" | "seats" | "wall" | "flat" | "offsetY" | "palette">> & {
  sprite?: string;
  interaction?: InteractionType;
  collides?: boolean;
};

const catalog: Record<string, ObjectDef> = {};
function def(kind: string, label: string, fw: number, fh: number, category: ObjectCategory, extra: Extra = {}) {
  catalog[kind] = {
    kind, label, fw, fh, category,
    sprite: extra.sprite ?? kind,
    collides: extra.collides ?? true,
    interaction: extra.interaction ?? "none",
    ...extra,
  };
}
const seat = (dx: number, dy: number, facing: Direction): SeatDef => ({ dx, dy, facing });
const SIT = { interaction: "seat" as const, prompt: "Sit" };

for (const v of ["a", "b", "c"]) def(`desk_${v}`, "Desk", 3, 1, "desk", { interaction: "desk", prompt: "Open desk", palette: v === "a" });
def("booth", "Focus booth", 3, 1, "desk", { interaction: "desk", prompt: "Open booth" });

for (const p of ["chair", "mchair"]) {
  const label = p === "chair" ? "Office chair" : "Meeting chair";
  def(`${p}_up`, label, 1, 1, "seating", { ...SIT, seats: [seat(16, 25, "up")], palette: true });
  def(`${p}_down`, label, 1, 1, "seating", { ...SIT, seats: [seat(16, 24, "down")] });
  def(`${p}_right`, label, 1, 1, "seating", { ...SIT, seats: [seat(18, 24, "right")] });
  def(`${p}_left`, label, 1, 1, "seating", { ...SIT, seats: [seat(14, 24, "left")] });
}
def("stool", "Stool", 1, 1, "seating", { ...SIT, seats: [seat(16, 21, "down")], palette: true });
for (const p of ["sofa", "sofa_teal"]) {
  def(`${p}_down`, "Sofa", 3, 1, "seating", { ...SIT, seats: [seat(30, 29, "down"), seat(66, 29, "down")], palette: p === "sofa" });
  def(`${p}_up`, "Sofa", 3, 1, "seating", { ...SIT, seats: [seat(30, 8, "up"), seat(66, 8, "up")] });
  def(`${p}_right`, "Sofa", 1, 3, "seating", { ...SIT, seats: [seat(20, 40, "right"), seat(20, 80, "right")] });
  def(`${p}_left`, "Sofa", 1, 3, "seating", { ...SIT, seats: [seat(12, 40, "left"), seat(12, 80, "left")] });
}
def("armchair_down", "Armchair", 1, 1, "seating", { ...SIT, seats: [seat(16, 27, "down")], palette: true });
def("armchair_right", "Armchair", 1, 1, "seating", { ...SIT, seats: [seat(18, 27, "right")] });
def("armchair_left", "Armchair", 1, 1, "seating", { ...SIT, seats: [seat(14, 27, "left")] });
def("beanbag_coral", "Bean bag", 1, 1, "seating", { ...SIT, seats: [seat(16, 23, "down")], palette: true });
def("beanbag_lavender", "Bean bag", 1, 1, "seating", { ...SIT, seats: [seat(16, 23, "down")] });
def("bench_down", "Garden bench", 2, 1, "seating", { ...SIT, seats: [seat(20, 27, "down"), seat(44, 27, "down")], palette: true });

def("table_meet_l", "Meeting table", 6, 2, "table");
def("table_meet_s", "Meeting table", 4, 2, "table", { palette: true });
def("table_round", "Round table", 2, 1, "table", { palette: true });
def("coffee_table", "Coffee table", 2, 1, "table", { palette: true });
def("reading_table", "Reading table", 2, 1, "table");

def("plant_small", "Plant", 1, 1, "plant", { palette: true });
def("plant_tall", "Fiddle-leaf fig", 1, 1, "plant", { palette: true });
def("plant_fern", "Fern", 1, 1, "plant", { palette: true });
def("planter", "Bamboo planter", 2, 1, "plant", { palette: true });

def("bookshelf", "Bookshelf", 2, 1, "storage", { interaction: "bookshelf", prompt: "Browse books", palette: true });
def("bookshelf_low", "Low shelf", 2, 1, "storage", { palette: true });
def("printer", "Printer", 1, 1, "appliance", { interaction: "printer", prompt: "Use printer" });
def("trash", "Bin", 1, 1, "decor", { collides: false });
def("floor_lamp", "Floor lamp", 1, 1, "decor", { palette: true });

def("whiteboard", "Whiteboard", 3, 1, "wall", { wall: true, collides: false, offsetY: -5, interaction: "whiteboard", prompt: "Open whiteboard", range: 2 });
def("whiteboard_stand", "Whiteboard", 3, 1, "structure", { interaction: "whiteboard", prompt: "Open whiteboard", palette: true });
def("tv_wall", "Display", 2, 1, "wall", { wall: true, collides: false, offsetY: -6, interaction: "meeting-room", prompt: "Open room", range: 2 });
def("room_panel", "Room panel", 1, 1, "wall", { wall: true, collides: false, offsetY: -8, interaction: "meeting-room", prompt: "Open room", range: 1.8 });
for (const f of ["frame_a", "frame_b", "frame_c", "clock"]) def(f, "Wall art", 1, 1, "wall", { wall: true, collides: false, offsetY: -8 });
def("sign_welcome", "Welcome sign", 4, 1, "wall", { wall: true, collides: false, offsetY: -1 });
def("sign_quiet", "Quiet zone sign", 2, 1, "wall", { wall: true, collides: false, offsetY: -9 });
def("elevator", "Elevator", 2, 1, "wall", { wall: true, collides: false, offsetY: 0, interaction: "elevator", prompt: "Call elevator", range: 1.8 });
def("elevator_buttons", "Call buttons", 1, 1, "wall", { wall: true, collides: false, offsetY: -10 });
def("stairs", "Stairs", 3, 2, "structure", { flat: true, interaction: "stairs", prompt: "Take the stairs" });

def("counter", "Counter", 1, 1, "appliance");
def("counter_sink", "Sink", 1, 1, "appliance");
def("counter_coffee", "Coffee machine", 1, 1, "appliance", { interaction: "coffee", prompt: "Brew coffee" });
def("counter_micro", "Microwave", 1, 1, "appliance");
def("fridge", "Refrigerator", 1, 1, "appliance", { interaction: "fridge", prompt: "Open fridge" });
def("water_dispenser", "Water dispenser", 1, 1, "appliance", { interaction: "water", prompt: "Get water" });

def("reception_desk", "Reception desk", 5, 1, "desk", { interaction: "reception", prompt: "Check in", range: 2 });
def("gong", "Gong", 1, 1, "structure", { interaction: "gong", prompt: "Ring the gong", palette: true });

def("tree_round", "Tree", 1, 1, "outdoor");
def("tree_birch", "Birch", 1, 1, "outdoor");
def("tree_pine", "Pine", 1, 1, "outdoor");
def("bush", "Bush", 1, 1, "outdoor", { palette: true });
def("bush_flower", "Flowering bush", 1, 1, "outdoor");
def("rock", "Stone", 1, 1, "outdoor");
def("pond", "Pond", 4, 3, "outdoor", { flat: true });
def("lamp_post", "Lamp post", 1, 1, "outdoor");
def("flower_bed", "Flower bed", 2, 1, "outdoor", { flat: true, collides: false });

export const OBJECT_CATALOG: Readonly<Record<string, ObjectDef>> = catalog;
export const PALETTE_KINDS = Object.values(catalog).filter((d) => d.palette).map((d) => d.kind);

export function getObjectDef(kind: string): ObjectDef | undefined {
  return catalog[kind];
}

/** Small items a user can place on their desk. Stored per desk, never in the map. */
export const DESK_DECOR = [
  { id: "decor_plant", label: "Succulent" }, { id: "decor_cactus", label: "Cactus" }, { id: "decor_mug", label: "Mug" },
  { id: "decor_photo", label: "Photo" }, { id: "decor_lamp", label: "Lamp" }, { id: "decor_books", label: "Books" },
  { id: "decor_duck", label: "Rubber duck" }, { id: "decor_trophy", label: "Trophy" },
];
export const MAX_DESK_DECOR = 3;
