/**
 * Authoring source for the demo maps. Emits Tiled-compatible JSON into public/maps.
 *   npm run maps
 * The JSON files are what the app loads; they can also be opened and edited in Tiled.
 */
import { writeFileSync } from "node:fs";
import { MapBuilder } from "./map-builder";

function mainOffice() {
  const m = new MapBuilder(64, 40, "floor-1", "Main Office");
  m.grass(0, 0, 63, 39);
  m.fill("ground", 3, 3, 46, 36, "wood");
  m.walls(2, 2, 47, 2);
  m.walls(2, 37, 47, 37);
  m.walls(2, 2, 2, 37);
  m.walls(47, 2, 47, 37);

  // ---- Meeting room A (Atlas)
  m.fill("ground", 3, 3, 14, 11, "lavender");
  m.walls(15, 2, 15, 12);
  m.walls(2, 12, 15, 12);
  m.door(8, 12, "lavender");
  m.door(9, 12, "lavender");
  m.add("table_meet_l", 6, 6);
  [6, 8, 9, 11].forEach((x, i) => m.add("mchair_down", x, 5, {}, `seat-a${i + 1}`));
  [6, 8, 9, 11].forEach((x, i) => m.add("mchair_up", x, 8, {}, `seat-a${i + 5}`));
  m.add("mchair_right", 5, 6, {}, "seat-a9");
  m.add("mchair_left", 12, 7, {}, "seat-a10");
  m.add("tv_wall", 5, 2, { roomId: "meeting-a" });
  m.add("whiteboard", 9, 2, { boardId: "board-atlas", title: "Atlas whiteboard" });
  m.add("room_panel", 7, 12, { roomId: "meeting-a" });
  m.add("frame_a", 4, 12);
  m.add("frame_b", 12, 12);
  m.add("plant_tall", 3, 3);
  m.add("plant_fern", 14, 3);
  m.add("plant_small", 3, 11);
  m.add("plant_tall", 14, 11);
  [13, 14].forEach((x) => m.window(x, 2));
  m.room("meeting-a", "Atlas Room", 3, 3, 14, 11, { roomType: "meeting", zone: "meeting", capacity: 10, color: "#A9A2D5", equipment: "display,whiteboard" });
  m.label("Atlas", 8.5 * 32, 10 * 32 + 4);

  // ---- Meeting room B (Birch)
  m.fill("ground", 16, 3, 24, 9, "blue");
  m.walls(25, 2, 25, 11);
  m.walls(15, 10, 25, 10);
  m.door(20, 10, "blue");
  m.door(21, 10, "blue");
  m.add("table_meet_s", 18, 5);
  m.add("mchair_down", 19, 4, {}, "seat-b1");
  m.add("mchair_down", 20, 4, {}, "seat-b2");
  m.add("mchair_up", 19, 7, {}, "seat-b3");
  m.add("mchair_up", 20, 7, {}, "seat-b4");
  m.add("mchair_right", 17, 5, {}, "seat-b5");
  m.add("mchair_left", 22, 6, {}, "seat-b6");
  m.add("tv_wall", 19, 2, { roomId: "meeting-b" });
  m.add("plant_tall", 16, 3);
  m.add("plant_fern", 24, 3);
  m.add("bookshelf_low", 23, 9);
  [17, 22, 23].forEach((x) => m.window(x, 2));
  m.room("meeting-b", "Birch Room", 16, 3, 24, 9, { roomType: "meeting", zone: "meeting", capacity: 6, color: "#A9C9DE", equipment: "display" });
  m.label("Birch", 20 * 32, 3 * 32 + 12);
  // Lift lobby below Birch
  m.add("elevator", 16, 10, { target: "elevator" }, "elevator");
  m.add("elevator_buttons", 18, 10);
  m.add("room_panel", 19, 10, { roomId: "meeting-b" });
  m.add("stairs", 22, 11, {}, "stairs");

  // ---- Kitchen
  m.fill("ground", 26, 3, 35, 10, "kitchen");
  m.walls(36, 2, 36, 12);
  m.walls(25, 11, 36, 11);
  m.door(30, 11, "kitchen");
  m.door(31, 11, "kitchen");
  m.add("fridge", 26, 3, {}, "fridge");
  m.add("counter", 27, 3);
  m.add("counter_sink", 28, 3);
  m.add("counter_coffee", 29, 3, {}, "coffee-machine");
  m.add("counter_micro", 30, 3);
  m.add("counter", 31, 3);
  m.add("water_dispenser", 33, 3, {}, "water-dispenser");
  m.add("plant_tall", 35, 3);
  m.add("clock", 32, 2);
  m.add("table_round", 29, 7);
  m.add("stool", 28, 7, { facing: "right" }, "stool-k1");
  m.add("stool", 31, 7, { facing: "left" }, "stool-k2");
  m.add("stool", 29, 6, { facing: "down" }, "stool-k3");
  m.add("stool", 30, 8, { facing: "up" }, "stool-k4");
  m.add("plant_small", 26, 10);
  m.add("trash", 35, 10);
  m.add("frame_c", 27, 11);
  m.add("frame_a", 34, 11);
  [34, 35].forEach((x) => m.window(x, 2));
  m.room("kitchen", "Kitchen", 26, 3, 35, 10, { roomType: "kitchen", zone: "open", color: "#F1E3C8" });
  m.label("Kitchen", 30.5 * 32, 5 * 32);

  // ---- Library
  m.fill("ground", 37, 3, 46, 11, "sage");
  m.walls(36, 12, 47, 12);
  m.door(41, 12, "sage");
  m.door(42, 12, "sage");
  [37, 39, 43, 45].forEach((x) => m.add("bookshelf", x, 3));
  m.add("reading_table", 39, 5);
  m.add("chair_up", 39, 6, {}, "seat-l1");
  m.add("chair_up", 40, 6, {}, "seat-l2");
  m.rug("Sage", 38, 8, 41, 10);
  m.add("armchair_right", 38, 9, {}, "seat-l3");
  m.add("coffee_table", 39, 9);
  m.add("armchair_left", 41, 9, {}, "seat-l4");
  m.add("reading_table", 44, 7);
  m.add("chair_up", 44, 8, {}, "seat-l5");
  m.add("chair_up", 45, 8, {}, "seat-l6");
  m.add("floor_lamp", 43, 7);
  m.add("plant_tall", 46, 11);
  m.add("plant_fern", 37, 11);
  m.add("frame_b", 38, 12);
  m.add("frame_a", 45, 12);
  [41, 42].forEach((x) => m.window(x, 2));
  m.room("library", "Library", 37, 3, 46, 11, { roomType: "library", zone: "open", quiet: true, color: "#A7C9AB" });
  m.label("Library", 41.5 * 32, 4 * 32 + 8);

  // ---- Garden doors
  [13, 14, 26, 27].forEach((y) => m.door(47, y, "wood"));

  // ---- Open workspace: three pods of four desks
  m.fill("ground", 3, 15, 29, 25, "cream");
  const variants = ["a", "b", "c"];
  let n = 0;
  [4, 13, 22].forEach((p, pod) => {
    m.rug("Grey", p, 16, p + 7, 23);
    for (const row of [17, 21])
      for (const dx of [1, 4]) {
        n += 1;
        const id = String(n).padStart(2, "0");
        m.add(`desk_${variants[(n + pod) % 3]}`, p + dx, row, { deskId: `W-${id}`, seatId: `seat-w${id}` }, `desk-w${id}`);
        m.add("chair_up", p + dx + 1, row + 1, { deskId: `W-${id}` }, `seat-w${id}`);
      }
    m.label(["Product", "Engineering", "Design"][pod], (p + 4) * 32, 15 * 32 + 14);
  });
  m.add("plant_tall", 3, 15);
  m.add("printer", 3, 24);
  m.add("bookshelf_low", 5, 25);
  m.add("plant_fern", 12, 25);
  m.add("whiteboard_stand", 15, 25, { boardId: "board-standup", title: "Stand-up board" });
  m.add("plant_small", 21, 25);
  m.add("planter", 25, 25);
  m.room("workspace", "Open Workspace", 3, 15, 29, 25, { roomType: "workspace", zone: "open", color: "#F1E8DA" });

  // ---- Collaboration lounge
  m.rug("Lavender", 33, 17, 43, 23);
  m.add("sofa_down", 37, 17, {}, "sofa-n");
  m.add("sofa_up", 37, 23, {}, "sofa-s");
  m.add("sofa_teal_right", 34, 19, {}, "sofa-w");
  m.add("sofa_teal_left", 42, 19, {}, "sofa-e");
  m.add("coffee_table", 38, 20);
  m.add("beanbag_coral", 35, 23, {}, "beanbag-1");
  m.add("beanbag_lavender", 41, 17, {}, "beanbag-2");
  m.add("floor_lamp", 36, 17);
  m.add("plant_tall", 30, 16);
  m.add("plant_fern", 30, 20);
  m.add("plant_tall", 30, 24);
  m.add("bookshelf_low", 31, 15);
  m.add("gong", 45, 16, {}, "gong");
  m.add("plant_tall", 46, 15);
  m.add("plant_small", 46, 25);
  m.room("lounge", "Collaboration Lounge", 30, 15, 46, 25, { roomType: "collaboration", zone: "open", color: "#B3ACE0" });
  m.label("Lounge", 38 * 32, 16 * 32 + 14);

  // ---- Quiet zone
  m.fill("ground", 3, 29, 18, 36, "quiet");
  m.walls(2, 28, 19, 28);
  m.walls(19, 28, 19, 37);
  m.door(10, 28, "quiet");
  m.door(11, 28, "quiet");
  [3, 7, 12, 16].forEach((x, i) => {
    m.add("booth", x, 29, { deskId: `Q-0${i + 1}`, seatId: `seat-q${i + 1}`, hot: true }, `desk-q${i + 1}`);
    m.add("chair_up", x + 1, 30, {}, `seat-q${i + 1}`);
  });
  [4, 8, 13].forEach((x, i) => {
    m.add("desk_c", x, 34, { deskId: `Q-0${i + 5}`, seatId: `seat-q${i + 5}`, hot: true }, `desk-q${i + 5}`);
    m.add("chair_up", x + 1, 35, {}, `seat-q${i + 5}`);
  });
  m.add("bookshelf", 17, 33);
  m.add("plant_tall", 3, 36);
  m.add("plant_fern", 18, 36);
  m.add("sign_quiet", 13, 28);
  m.add("frame_b", 5, 28);
  m.room("quiet", "Quiet Zone", 3, 29, 18, 36, { roomType: "quiet", zone: "open", quiet: true, color: "#C3D5E3" });
  m.label("Quiet Zone", 10.5 * 32, 32 * 32);

  // ---- Reception
  m.fill("ground", 20, 28, 33, 36, "coral");
  m.walls(23, 28, 30, 28);
  m.walls(34, 28, 34, 37);
  m.door(26, 37, "coral");
  m.door(27, 37, "coral");
  m.set("floor-decor", 26, 36, "doormat");
  m.set("floor-decor", 27, 36, "doormat");
  m.fill("ground", 26, 38, 27, 39, "path");
  m.add("sign_welcome", 25, 28);
  m.add("reception_desk", 24, 31, {}, "reception-desk");
  m.rug("Coral", 24, 33, 29, 35);
  m.add("sofa_right", 20, 31, {}, "sofa-r");
  m.add("armchair_left", 33, 32, {}, "seat-r1");
  m.add("plant_tall", 20, 36);
  m.add("plant_tall", 33, 36);
  m.add("plant_fern", 23, 29);
  m.add("plant_fern", 30, 29);
  m.room("reception", "Reception", 20, 28, 33, 36, { roomType: "reception", zone: "open", color: "#F1C3B7" });
  m.label("Reception", 28 * 32, 30 * 32);

  // ---- Creative studio
  m.fill("ground", 35, 29, 46, 36, "concrete");
  m.walls(34, 28, 47, 28);
  m.door(40, 28, "concrete");
  m.door(41, 28, "concrete");
  m.add("whiteboard", 36, 28, { boardId: "board-studio", title: "Studio wall" });
  m.add("frame_c", 44, 28);
  m.add("frame_a", 46, 28);
  m.add("table_meet_s", 39, 32);
  m.add("stool", 40, 31, { facing: "down" }, "stool-s1");
  m.add("stool", 41, 31, { facing: "down" }, "stool-s2");
  m.add("stool", 40, 34, { facing: "up" }, "stool-s3");
  m.add("stool", 41, 34, { facing: "up" }, "stool-s4");
  m.add("beanbag_coral", 36, 35, {}, "beanbag-3");
  m.add("beanbag_lavender", 45, 34, {}, "beanbag-4");
  m.add("plant_tall", 35, 29);
  m.add("plant_tall", 46, 29);
  m.add("bookshelf_low", 44, 36);
  m.add("floor_lamp", 35, 36);
  m.room("studio", "Creative Studio", 35, 29, 46, 36, { roomType: "studio", zone: "open", color: "#E7E2DB" });
  m.label("Studio", 41 * 32, 30 * 32);

  for (let x = 4; x < 46; x++) if (x % 4 === 1 && x !== 25) m.window(x, 37);

  // ---- Garden
  m.fill("ground", 48, 13, 56, 14, "path");
  m.fill("ground", 48, 26, 56, 27, "path");
  m.fill("ground", 55, 6, 56, 34, "path");
  m.fill("ground", 57, 30, 61, 31, "path");
  m.add("pond", 58, 16);
  m.add("bench_down", 59, 14, {}, "bench-pond");
  m.add("bench_down", 51, 12, {}, "bench-path");
  m.add("bench_down", 51, 25, {}, "bench-south");
  ([["tree_round", 50, 4], ["tree_round", 60, 4], ["tree_round", 52, 20], ["tree_round", 62, 25], ["tree_round", 50, 34],
    ["tree_birch", 58, 10], ["tree_birch", 49, 9], ["tree_birch", 62, 34], ["tree_birch", 59, 37],
    ["tree_pine", 63, 11], ["tree_pine", 53, 38], ["tree_pine", 49, 22], ["tree_pine", 53, 3],
    ["tree_birch", 0, 5], ["tree_round", 1, 11], ["tree_birch", 1, 18], ["tree_round", 0, 24], ["tree_birch", 0, 31], ["tree_round", 1, 37],
  ] as const).forEach(([k, x, y]) => m.add(k, x, y));
  [[48, 4], [48, 8], [48, 18], [48, 22], [48, 31], [48, 35], [6, 0], [22, 0], [38, 0], [8, 38], [34, 38]].forEach(([x, y]) => m.add("bush", x, y));
  [[54, 16], [54, 23], [63, 17], [14, 1], [30, 1], [44, 1], [16, 39], [42, 39]].forEach(([x, y]) => m.add("bush_flower", x, y));
  [[57, 19], [62, 19], [60, 22], [51, 30]].forEach(([x, y]) => m.add("rock", x, y));
  m.add("flower_bed", 50, 16);
  m.add("flower_bed", 58, 27);
  m.add("lamp_post", 54, 12);
  m.add("lamp_post", 57, 25);
  m.add("table_round", 59, 32);
  m.add("stool", 58, 32, { facing: "right" }, "stool-g1");
  m.add("stool", 61, 32, { facing: "left" }, "stool-g2");
  m.add("stool", 60, 33, { facing: "up" }, "stool-g3");
  m.scatter(0, 0, 63, 39, 0.07);
  m.room("garden", "Garden", 48, 0, 63, 39, { roomType: "garden", zone: "open", color: "#A9D69B" });
  m.label("Garden", 56 * 32 + 16, 8 * 32);

  m.spawn("default", 27, 35, "up");
  m.spawn("elevator", 17, 11, "down");
  m.spawn("stairs", 21, 12, "down");
  return m.build();
}

/** Structured placeholder for floors that are not designed yet. */
function placeholderFloor(floorId: string, name: string, floor: string, rug: string) {
  const m = new MapBuilder(30, 20, floorId, name);
  m.fill("ground", 1, 1, 28, 18, floor);
  m.walls(0, 0, 29, 0);
  m.walls(0, 19, 29, 19);
  m.walls(0, 0, 0, 19);
  m.walls(29, 0, 29, 19);
  [8, 9, 14, 15, 20, 21].forEach((x) => m.window(x, 0));
  m.add("elevator", 3, 0, { target: "elevator" }, "elevator");
  m.add("elevator_buttons", 5, 0);
  m.add("stairs", 24, 1, {}, "stairs");
  m.rug(rug, 10, 7, 19, 12);
  m.add("sofa_down", 13, 7);
  m.add("sofa_up", 13, 12);
  m.add("coffee_table", 14, 9);
  m.add("plant_tall", 1, 1);
  m.add("plant_tall", 28, 18);
  m.add("plant_fern", 1, 18);
  m.add("planter", 10, 16);
  m.add("planter", 18, 16);
  m.add("whiteboard", 12, 0, { boardId: `board-${floorId}`, title: `${name} ideas` });
  m.room(`${floorId}-open`, name, 1, 1, 28, 18, { roomType: "collaboration", zone: "open", color: "#E7E2DB" });
  m.label("Space reserved — layout coming soon", 15 * 32, 4 * 32);
  m.spawn("default", 4, 2, "down");
  m.spawn("elevator", 4, 1, "down");
  m.spawn("stairs", 23, 3, "down");
  return m.build();
}

const write = (file: string, map: unknown) => writeFileSync(`public/maps/${file}`, JSON.stringify(map));
write("demo-office.json", mainOffice());
write("floor-2.json", placeholderFloor("floor-2", "Collaboration", "sage", "Sage"));
write("floor-3.json", placeholderFloor("floor-3", "Management", "blue", "Blue"));
write("floor-4.json", placeholderFloor("floor-4", "Events", "coral", "Coral"));
write("floor-5.json", placeholderFloor("floor-5", "Recreation", "lavender", "Lavender"));
console.log("maps written");
