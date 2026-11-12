import * as Phaser from "phaser";
import { NavGrid } from "@/features/world/engine/CollisionSystem";
import { findPath, nearestWalkable } from "@/features/world/engine/PathfindingSystem";
import { IMERSA } from "../config";
import { ROOMS, type Door, type MiniEvent, type MiniOfficeApi, type MiniOfficeOptions, type MiniPrompt } from "./mini-types";

/**
 * The playable miniature office on the landing page. Only ever imported dynamically (client-only),
 * like the app's own world. It is deliberately separate from OfficeScene: no stores, no realtime
 * adapter, no accounts. It reuses the app's NavGrid and A* so movement feels the same.
 *
 * Everything here is a scripted preview with simulated people. Nothing connects audio or video.
 */

interface OfficeData {
  width: number;
  height: number;
  frames: Record<string, { x: number; y: number; w: number; h: number }>;
  objects: { id: number; prop: string; frame: string; x: number; y: number; gx: number; gy: number; floor: boolean }[];
  grid: { cell: number; width: number; height: number; data: string };
}

type Facing = "down" | "left" | "right" | "up";
const SPEED = 92; // office px / s
const KNOCK_RANGE = 58;
const TALK_RANGE = 168;
const DEPTH = { floorProp: 1, label: 2, world: 10, tint: 9000, plate: 9500, bubble: 9600 };
const FLAT = new Set(["rug", "welcome_mat"]);

const SPRITE = { developer: 0, office_lady: 1, office_worker: 2, manager: 3, receptionist: 4 } as const;
const PLAYER_START = { x: 300, y: 500 };

interface PersonDef {
  id: string;
  name: string;
  sprite: number;
  x: number;
  y: number;
  facing: Facing;
  door: Door;
  note?: string;
  /** Where the visitor stands to interact, when it isn't next to the person (a closed room). */
  reach?: { x: number; y: number };
  noteAt?: { x: number; y: number };
  lines?: { from: "them" | "you"; text: string }[];
  patrol?: { x: number; y: number }[];
}

const PEOPLE: PersonDef[] = [
  {
    id: "maya", name: "Prayag", sprite: SPRITE.office_lady, x: 418, y: 258, facing: "right", door: "open",
    lines: [
      { from: "them", text: "Come on in. What's up?" },
      { from: "you", text: "Two minutes on the launch checklist?" },
      { from: "them", text: "Sure. Pull up a chair." },
    ],
  },
  {
    id: "tomas", name: "Yuri", sprite: SPRITE.office_worker, x: 648, y: 336, facing: "down", door: "ask",
    patrol: [{ x: 648, y: 336 }, { x: 648, y: 548 }],
    lines: [
      { from: "them", text: "Hey, give me one second to save this… okay." },
      { from: "you", text: "Thanks for letting me in." },
      { from: "them", text: "That's what the knock is for." },
    ],
  },
  {
    id: "zainab", name: "Steye", sprite: SPRITE.manager, x: 246, y: 198, facing: "down", door: "closed", note: "Focus until 3:45",
    reach: { x: 146, y: 334 }, noteAt: { x: 150, y: 322 },
  },
];

const HANA = { id: "hana", name: "Zenno", sprite: SPRITE.receptionist, desk: { x: 426, y: 522 }, noteAt: { x: 464, y: 488 }, plate: { x: 480, y: 468 }, enter: { x: 240, y: 588 } };

const LABELS = [
  { text: "RECEPTION", x: 176, y: 500, dark: true },
  { text: "DESKS", x: 512, y: 346, dark: false },
  { text: "ATLAS ROOM", x: 842, y: 242, dark: false },
  { text: "KITCHEN", x: 868, y: 436, dark: true },
  { text: "FOCUS ROOM", x: 246, y: 112, dark: false },
];

class Actor {
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;
  facing: Facing;
  path: { x: number; y: number }[] = [];
  onArrive: (() => void) | null = null;
  moving = false;

  constructor(scene: Phaser.Scene, readonly index: number, public x: number, public y: number, facing: Facing) {
    this.facing = facing;
    this.shadow = scene.add.ellipse(x, y - 1, 16, 6, 0x1a1226, 0.32);
    this.sprite = scene.add.sprite(x, y, "chars").setOrigin(0.5, 30 / 32);
    this.play();
    this.place();
  }

  place(): void {
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y)).setDepth(DEPTH.world + this.y);
    this.shadow.setPosition(Math.round(this.x), Math.round(this.y) - 1).setDepth(DEPTH.world + this.y - 0.01);
  }
  play(): void {
    this.sprite.play(`c${this.index}-${this.moving ? "walk" : "idle"}-${this.facing}`, true);
  }
  face(dx: number, dy: number): void {
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  }
  setMoving(moving: boolean): void {
    if (this.moving === moving) return;
    this.moving = moving;
  }
  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.shadow.setVisible(visible);
  }
  /** Advances along `path`. Returns true while still walking. */
  follow(dt: number, speed = SPEED): boolean {
    const next = this.path[0];
    if (!next) {
      this.setMoving(false);
      this.play();
      return false;
    }
    const dx = next.x - this.x;
    const dy = next.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= step) {
      this.x = next.x;
      this.y = next.y;
      this.path.shift();
      if (!this.path.length) {
        this.setMoving(false);
        this.play();
        this.place();
        const done = this.onArrive;
        this.onArrive = null;
        done?.();
        return false;
      }
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      this.face(dx, dy);
    }
    this.setMoving(true);
    this.play();
    this.place();
    return true;
  }
  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}

/** Name tag with a lantern, drawn at constant screen size. */
class Plate {
  readonly container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private tag: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, font: string, name: string, private door: Door | null, private extra = "Demo") {
    const resolution = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 0, name, { fontFamily: font, fontSize: "11px", fontStyle: "600", color: "#F7F3EC", resolution }).setOrigin(0, 0.5);
    this.tag = scene.add.text(0, 0, extra, { fontFamily: font, fontSize: "9px", fontStyle: "600", color: "#BDB4D6", resolution }).setOrigin(0, 0.5);
    this.label.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.tag.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.container = scene.add.container(0, 0, [this.bg, this.label, this.tag]).setDepth(DEPTH.plate);
    this.draw();
  }
  setDoor(door: Door | null, extra?: string): void {
    this.door = door;
    if (extra !== undefined) this.extra = extra;
    this.draw();
  }
  private draw(): void {
    this.tag.setText(this.extra);
    const lantern = this.door ? 16 : 0;
    const w = Math.round(8 + lantern + this.label.width + 6 + this.tag.width + 9);
    const h = 19;
    const x = -w / 2;
    const g = this.bg.clear();
    g.fillStyle(0x21172f, 0.92).fillRoundedRect(x, -h, w, h, h / 2);
    if (this.door) {
      const cx = x + 13;
      const cy = -h / 2;
      if (this.door === "open") {
        g.fillStyle(0xf4c36b, 0.3).fillCircle(cx, cy, 7);
        g.fillStyle(0xf4c36b, 1).fillCircle(cx, cy, 4.2);
      } else if (this.door === "ask") {
        g.lineStyle(1.4, 0xf4c36b, 1).strokeCircle(cx, cy, 4.2);
        g.fillStyle(0xf4c36b, 1).slice(cx, cy, 4.2, Phaser.Math.DegToRad(90), Phaser.Math.DegToRad(270), false).fillPath();
      } else {
        g.lineStyle(1.4, 0x9a90b8, 1).strokeCircle(cx, cy, 4.2);
        g.lineBetween(cx - 3, cy + 3, cx + 3, cy - 3);
      }
    }
    this.label.setPosition(x + 8 + lantern, -h / 2);
    this.tag.setPosition(this.label.x + this.label.width + 6, -h / 2 + 0.5);
  }
  at(x: number, y: number, zoom: number): void {
    this.container.setPosition(Math.round(x), Math.round(y)).setScale(1 / zoom);
  }
  destroy(): void {
    this.container.destroy();
  }
}

interface Person {
  def: PersonDef;
  actor: Actor;
  plate: Plate;
  door: Door;
  patrolIndex: number;
  waitUntil: number;
}

class MiniScene extends Phaser.Scene {
  private opts!: MiniOfficeOptions;
  private grid!: NavGrid;
  private data_!: OfficeData;
  private player!: Actor;
  private youPlate!: Plate;
  private people: Person[] = [];
  private hana: { actor: Actor | null; plate: Plate; state: "away" | "arriving" | "in" } | null = null;
  private notes = new Map<string, { sprite: Phaser.GameObjects.Image; text: string }>();
  private bubbles = new Map<string, Phaser.GameObjects.Container>();
  private night!: Phaser.GameObjects.Rectangle;
  private morning!: Phaser.GameObjects.Rectangle;
  private input_ = { x: 0, y: 0 };
  private promptKey = "";
  private pendingId: string | null = null;
  private talkingTo: string | null = null;
  private hasMoved = false;
  private busy = false;
  paused = false;

  constructor() {
    super("mini-office");
  }

  init(data: MiniOfficeOptions): void {
    this.opts = data;
    this.people = [];
    this.notes.clear();
    this.bubbles.clear();
    this.promptKey = "";
    this.pendingId = null;
    this.talkingTo = null;
    this.busy = false;
    this.hana = null;
  }

  preload(): void {
    this.load.image("base", IMERSA.base);
    this.load.image("props", IMERSA.props);
    this.load.spritesheet("chars", IMERSA.characters, { frameWidth: 32, frameHeight: 32 });
    this.load.json("office", IMERSA.data);
  }

  create(): void {
    const data = this.cache.json.get("office") as OfficeData;
    this.data_ = data;
    this.add.image(0, 0, "base").setOrigin(0).setDepth(0);

    const props = this.textures.get("props");
    for (const [name, f] of Object.entries(data.frames)) if (!props.has(name)) props.add(name, 0, f.x, f.y, f.w, f.h);
    for (const o of data.objects)
      this.add.image(o.x, o.y, "props", o.frame).setOrigin(0).setDepth(FLAT.has(o.prop) ? DEPTH.floorProp : DEPTH.world + o.gy + o.id * 0.001);

    this.grid = new NavGrid(
      { width: data.grid.width, height: data.grid.height, tileSize: data.grid.cell, baseCollision: Uint8Array.from(data.grid.data, (c) => (c === "1" ? 1 : 0)) },
      [],
    );

    const rows: Facing[] = ["down", "left", "right", "up"];
    for (let c = 0; c < 5; c++)
      rows.forEach((dir, r) => {
        for (const [kind, offset, rate] of [["idle", 0, 4], ["walk", 4, 8]] as const) {
          const key = `c${c}-${kind}-${dir}`;
          if (this.anims.exists(key)) continue;
          const start = (offset + r) * 20 + c * 4;
          this.anims.create({ key, frames: this.anims.generateFrameNumbers("chars", { start, end: start + 3 }), frameRate: rate, repeat: -1 });
        }
      });

    if (!this.textures.exists("note")) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x1a1226, 0.35).fillRect(1, 2, 9, 9);
      g.fillStyle(0xf4c36b, 1).fillRect(0, 0, 9, 9);
      g.fillStyle(0xd79f45, 1).fillTriangle(9, 9, 5, 9, 9, 5);
      g.fillStyle(0x8a6a2c, 1).fillRect(2, 2, 5, 1).fillRect(2, 4, 4, 1);
      g.generateTexture("note", 10, 11);
      g.destroy();
    }

    // Floor lettering. Drawn large and filtered, so the pixel font stays sharp at any camera zoom.
    for (const l of LABELS) {
      const label = this.add.text(l.x, l.y, l.text, { fontFamily: this.opts.pixelFont, fontSize: "8px", color: l.dark ? "#4A3B6B" : "#F7F3EC", resolution: 6 });
      label.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      label.setOrigin(0.5).setAlpha(l.dark ? 0.55 : 0.5).setDepth(DEPTH.label);
    }

    for (const def of PEOPLE) {
      const actor = new Actor(this, def.sprite, def.x, def.y, def.facing);
      const plate = new Plate(this, this.opts.uiFont, def.name, def.door, def.note ? `Demo · ${def.note}` : "Demo");
      this.people.push({ def, actor, plate, door: def.door, patrolIndex: 0, waitUntil: 2500 });
    }
    this.hana = { actor: null, plate: new Plate(this, this.opts.uiFont, "Zenno's desk", "closed", "Away · 2:10 am"), state: "away" };

    this.player = new Actor(this, SPRITE.developer, PLAYER_START.x, PLAYER_START.y, "right");
    this.youPlate = new Plate(this, this.opts.uiFont, "You", null, "");

    this.night = this.add.rectangle(0, 0, data.width, data.height, 0x0c0830, 1).setOrigin(0).setAlpha(0).setDepth(DEPTH.tint);
    this.morning = this.add.rectangle(0, 0, data.width, data.height, 0xffd9a3, 1).setOrigin(0).setAlpha(0).setDepth(DEPTH.tint + 1).setBlendMode(Phaser.BlendModes.ADD);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, data.width, data.height).setRoundPixels(true);
    cam.startFollow(this.player.sprite, true, 0.14, 0.14, 0, 12);
    this.fitCamera();
    this.scale.on("resize", this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off("resize", this.fitCamera, this));

    // A tap walks there. A drag is the visitor scrolling the page, so it is ignored.
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.busy || pointer.getDistance() > 12 || pointer.getDuration() > 600) return;
      this.walkTo(pointer.worldX, pointer.worldY);
    });

    this.emit({ type: "time", phase: "dusk" });
    this.emit({ type: "prompt", prompt: null });
    this.emit({ type: "conversation", conversation: null });
    this.emit({ type: "ready" });
  }

  private emit(event: MiniEvent): void {
    this.opts.onEvent(event);
  }

  private fitCamera(): void {
    const { width, height } = this.scale;
    const wanted = width >= 980 ? 2 : width >= 600 ? 1.75 : 1.5;
    this.cameras.main.setZoom(Math.max(wanted, width / this.data_.width, height / this.data_.height));
  }

  // ------------------------------------------------------------------ movement
  setInput(x: number, y: number): void {
    this.input_ = { x, y };
  }

  private cellOf(x: number, y: number) {
    return { x: this.grid.toTile(x), y: this.grid.toTile(y) };
  }

  private pathBetween(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number }[] | null {
    const start = nearestWalkable(this.grid, this.cellOf(from.x, from.y), 4);
    const goal = nearestWalkable(this.grid, this.cellOf(to.x, to.y), 8);
    if (!start || !goal) return null;
    const cells = findPath(this.grid, start, goal);
    if (!cells) return null;
    return cells.map((c) => this.grid.tileCenter(c.x, c.y));
  }

  walkTo(x: number, y: number, then?: () => void): void {
    const path = this.pathBetween(this.player, { x, y });
    if (!path) {
      this.emit({ type: "toast", title: "Can't get there", body: "That spot is behind a wall." });
      return;
    }
    this.player.path = path;
    this.player.onArrive = then ?? null;
    this.noteMoved();
  }

  private noteMoved(): void {
    if (this.hasMoved) return;
    this.hasMoved = true;
    this.emit({ type: "moved" });
  }

  update(_time: number, deltaMs: number): void {
    if (this.paused) return;
    const dt = Math.min(deltaMs, 100) / 1000;
    const zoom = this.cameras.main.zoom;
    const p = this.player;

    const { x: ix, y: iy } = this.input_;
    if ((ix || iy) && !this.busy) {
      p.path = [];
      p.onArrive = null;
      const length = Math.hypot(ix, iy) || 1;
      const total = SPEED * dt;
      const steps = Math.max(1, Math.ceil(total / 4));
      for (let i = 0; i < steps; i++) {
        const moved = this.grid.move(p.x, p.y, ((ix / length) * total) / steps, ((iy / length) * total) / steps, 5, 6);
        p.x = moved.x;
        p.y = moved.y;
      }
      p.face(ix, iy);
      p.setMoving(true);
      p.play();
      p.place();
      this.noteMoved();
    } else if (p.path.length) p.follow(dt);
    else if (p.moving) {
      p.setMoving(false);
      p.play();
    }
    this.youPlate.at(p.x, p.y - 34, zoom);

    for (const person of this.people) {
      this.patrol(person, dt);
      person.plate.at(person.actor.x, person.actor.y - 34, zoom);
    }
    if (this.hana) {
      const h = this.hana;
      if (h.actor) {
        h.actor.follow(dt, SPEED * 0.9);
        h.plate.at(h.actor.x, h.actor.y - 34, zoom);
      } else h.plate.at(HANA.plate.x, HANA.plate.y, zoom);
    }
    this.bubbles.forEach((bubble, id) => {
      const anchor = this.anchorOf(id);
      if (anchor) bubble.setPosition(Math.round(anchor.x), Math.round(anchor.y - 56)).setScale(1 / zoom);
    });

    this.updatePrompt();
    if (this.talkingTo) {
      const anchor = this.anchorOf(this.talkingTo);
      if (anchor && Phaser.Math.Distance.Between(p.x, p.y, anchor.x, anchor.y) > TALK_RANGE) this.endConversation("walked");
    }
  }

  private patrol(person: Person, dt: number): void {
    const { def, actor } = person;
    if (!def.patrol) return;
    const held = this.pendingId === def.id || this.talkingTo === def.id || Phaser.Math.Distance.Between(this.player.x, this.player.y, actor.x, actor.y) < KNOCK_RANGE;
    if (held) {
      if (actor.moving) {
        actor.setMoving(false);
        actor.play();
      }
      return;
    }
    if (actor.path.length) {
      actor.follow(dt, SPEED * 0.55);
      return;
    }
    if (this.time.now < person.waitUntil) return;
    person.patrolIndex = (person.patrolIndex + 1) % def.patrol.length;
    const path = this.pathBetween(actor, def.patrol[person.patrolIndex]);
    if (path) actor.path = path;
    person.waitUntil = this.time.now + 9000 + Math.random() * 4000;
    actor.onArrive = () => {
      actor.facing = "down";
      actor.play();
      person.waitUntil = this.time.now + 5000 + Math.random() * 3000;
    };
  }

  private anchorOf(id: string): { x: number; y: number } | null {
    if (id === "you") return this.player;
    if (id === HANA.id) return this.hana?.actor ?? null;
    return this.people.find((x) => x.def.id === id)?.actor ?? null;
  }

  // ------------------------------------------------------------------ prompt
  private targets(): { id: string; x: number; y: number; prompt: Omit<MiniPrompt, "pending"> }[] {
    const list: { id: string; x: number; y: number; prompt: Omit<MiniPrompt, "pending"> }[] = [];
    for (const person of this.people) {
      const { def, actor } = person;
      const spot = def.reach ?? actor;
      if (person.door === "closed") {
        list.push({
          id: def.id, x: spot.x, y: spot.y,
          prompt: { targetId: def.id, kind: "note", door: "closed", title: `${def.name}'s door is closed.`, detail: def.note ? `${def.note}. A note will be waiting when they look up.` : "Leave a note instead.", action: this.notes.has(def.id) ? "Leave another note" : "Leave a note" },
        });
      } else {
        list.push({
          id: def.id, x: spot.x, y: spot.y,
          prompt: {
            targetId: def.id, kind: "knock", door: person.door,
            title: person.door === "open" ? `${def.name}'s door is ajar.` : `${def.name} likes a knock first.`,
            detail: person.door === "open" ? "A knock is accepted straight away." : "They decide. Nothing connects until they say yes.",
            action: "Knock",
          },
        });
      }
    }
    if (this.hana) {
      if (this.hana.state === "away")
        list.push({
          id: HANA.id, x: HANA.desk.x, y: HANA.desk.y,
          prompt: { targetId: HANA.id, kind: "note", door: "closed", title: "Zenno isn't in.", detail: "It's the middle of the night there. Leave a note on the desk for the morning.", action: this.notes.has(HANA.id) ? "Leave another note" : "Leave a note on the desk" },
        });
      else if (this.hana.state === "in" && this.hana.actor)
        list.push({
          id: HANA.id, x: this.hana.actor.x, y: this.hana.actor.y,
          prompt: { targetId: HANA.id, kind: "knock", door: "open", title: "Zenno's door is ajar.", detail: "A knock is accepted straight away.", action: "Knock" },
        });
    }
    return list;
  }

  private updatePrompt(): void {
    let best: ReturnType<MiniScene["targets"]>[number] | null = null;
    let bestD = KNOCK_RANGE;
    if (!this.busy && !this.talkingTo)
      for (const t of this.targets()) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y);
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
    const pending = !!best && this.pendingId === best.id;
    const key = best ? `${best.id}|${best.prompt.action}|${best.prompt.door}|${pending}` : "";
    if (key === this.promptKey) return;
    this.promptKey = key;
    this.emit({ type: "prompt", prompt: best ? { ...best.prompt, pending } : null });
  }

  private currentTarget(): string | null {
    return this.promptKey ? this.promptKey.split("|")[0] : null;
  }

  // ------------------------------------------------------------------ knock
  act(): void {
    const id = this.currentTarget();
    if (!id || this.pendingId || this.busy) return;
    if (id === HANA.id && this.hana?.state === "away") {
      this.emit({ type: "note-request", targetId: HANA.id, name: "Zenno", hint: "They'll find it on the desk in the morning." });
      return;
    }
    const person = this.people.find((x) => x.def.id === id);
    if (person?.door === "closed") {
      this.emit({ type: "note-request", targetId: id, name: person.def.name, hint: "Her door is closed, so this stays a note." });
      return;
    }
    const actor = person?.actor ?? this.hana?.actor;
    const name = person?.def.name ?? "Zenno";
    if (!actor) return;
    this.emit({ type: "sfx", name: "knock" });
    this.knockRings(actor.x, actor.y - 20);
    const accept = () => {
      this.pendingId = null;
      actor.face(this.player.x - actor.x, this.player.y - actor.y);
      actor.play();
      this.say(id, "Come on in.", 2600);
      this.emit({ type: "sfx", name: "welcome-chime" });
      this.talkingTo = id;
      this.promptKey = "";
      this.emit({ type: "prompt", prompt: null });
      this.emit({
        type: "conversation",
        conversation: { name, lines: person?.def.lines ?? [{ from: "them", text: "Morning! Thanks for the note." }, { from: "you", text: "Any time. Welcome back." }] },
      });
    };
    if ((person?.door ?? "open") === "open") {
      this.time.delayedCall(420, accept);
      return;
    }
    this.pendingId = id;
    this.say(id, "…", 1700);
    this.time.delayedCall(1800, () => {
      if (this.pendingId === id) accept();
    });
  }

  private knockRings(x: number, y: number): void {
    for (const delay of [0, 190]) {
      const ring = this.add.circle(x, y, 4).setStrokeStyle(1.5, 0xf4c36b, 1).setDepth(DEPTH.plate - 1);
      this.tweens.add({ targets: ring, radius: 18, alpha: 0, duration: 520, delay, onComplete: () => ring.destroy() });
    }
  }

  endConversation(reason: "left" | "walked"): void {
    if (!this.talkingTo) return;
    this.talkingTo = null;
    this.emit({ type: "conversation", conversation: null, reason });
  }

  private say(id: string, text: string, ms: number): void {
    this.bubbles.get(id)?.destroy();
    const resolution = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
    const label = this.add.text(0, 0, text, { fontFamily: this.opts.uiFont, fontSize: "12px", fontStyle: "600", color: "#292630", resolution, wordWrap: { width: 190 } }).setOrigin(0.5, 1);
    label.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const w = Math.round(label.width + 20);
    const h = Math.round(label.height + 12);
    const bg = this.add.graphics();
    bg.fillStyle(0xf7f3ec, 1).fillRoundedRect(-w / 2, -h, w, h, 9).fillTriangle(-5, -1, 5, -1, 0, 6);
    label.setPosition(0, -6);
    const bubble = this.add.container(0, 0, [bg, label]).setDepth(DEPTH.bubble);
    this.bubbles.set(id, bubble);
    this.time.delayedCall(ms, () => {
      if (this.bubbles.get(id) !== bubble) return;
      this.bubbles.delete(id);
      bubble.destroy();
    });
  }

  // ------------------------------------------------------------------ notes and the time-lapse
  leaveNote(targetId: string, text: string): void {
    const clean = text.trim().slice(0, 140);
    if (!clean) return;
    const isHana = targetId === HANA.id;
    const person = this.people.find((x) => x.def.id === targetId);
    const at = isHana ? HANA.noteAt : person?.def.noteAt;
    if (!at) return;
    this.notes.get(targetId)?.sprite.destroy();
    const sprite = this.add.image(at.x, at.y - 10, "note").setDepth(DEPTH.world + at.y + 80).setAlpha(0);
    this.tweens.add({ targets: sprite, y: at.y, alpha: 1, duration: 320, ease: "Back.out" });
    this.notes.set(targetId, { sprite, text: clean });
    this.promptKey = "";
    this.emit({ type: "sfx", name: "note-place" });
    this.emit({ type: "note-placed", targetId, name: isHana ? "Zenno" : (person?.def.name ?? ""), canFastForward: isHana && this.hana?.state === "away" });
  }

  fastForward(): void {
    const hana = this.hana;
    const note = this.notes.get(HANA.id);
    if (!hana || hana.state !== "away" || !note || this.busy) return;
    this.busy = true;
    this.player.path = [];
    this.emit({ type: "prompt", prompt: null });
    this.promptKey = "";
    this.emit({ type: "time", phase: "night" });
    this.tweens.add({ targets: this.night, alpha: 0.66, duration: 1500, ease: "Sine.inOut" });
    this.time.delayedCall(2700, () => {
      this.emit({ type: "time", phase: "morning" });
      this.tweens.add({ targets: this.night, alpha: 0, duration: 1600, ease: "Sine.inOut" });
      this.tweens.add({ targets: this.morning, alpha: 0.2, duration: 1600, ease: "Sine.inOut" });
    });
    this.time.delayedCall(4300, () => {
      this.busy = false;
      hana.state = "arriving";
      const actor = new Actor(this, HANA.sprite, HANA.enter.x, HANA.enter.y, "up");
      hana.actor = actor;
      hana.plate.destroy();
      hana.plate = new Plate(this, this.opts.uiFont, "Zenno", "open", "Demo · 9:02 am");
      actor.path = this.pathBetween(actor, HANA.desk) ?? [HANA.desk];
      this.emit({ type: "sfx", name: "footsteps" });
      actor.onArrive = () => {
        actor.facing = "right";
        actor.play();
        hana.state = "in";
        this.say(HANA.id, "Found your note. Thanks!", 3600);
        this.emit({ type: "sfx", name: "welcome-chime" });
        this.tweens.add({ targets: note.sprite, y: note.sprite.y - 12, alpha: 0, duration: 500, onComplete: () => note.sprite.destroy() });
        this.notes.delete(HANA.id);
        this.emit({ type: "note-read", name: "Zenno", text: note.text, reply: "Read it first thing. Looks good, two small comments on your doc." });
        this.time.delayedCall(6000, () => {
          this.tweens.add({ targets: this.morning, alpha: 0, duration: 2600 });
          this.emit({ type: "time", phase: "dusk" });
        });
      };
    });
  }

  walkToRoom(id: string): void {
    const room = ROOMS.find((r) => r.id === id);
    if (room && !this.busy) this.walkTo(room.x, room.y);
  }
}

export function createMiniOffice(host: HTMLElement, options: MiniOfficeOptions): MiniOfficeApi {
  const scene = new MiniScene();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    backgroundColor: "#21172f",
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    banner: false,
    disableContextMenu: true,
    // Keys are handled by the React host, only while the office has focus, so the page keeps scrolling normally.
    input: { keyboard: false, gamepad: false, mouse: { preventDefaultWheel: false }, touch: { capture: false } },
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.RESIZE, width: host.clientWidth || 800, height: host.clientHeight || 500, autoRound: true },
    fps: { target: 60, smoothStep: false },
    scene: [],
  });
  game.scene.add("mini-office", scene, true, options);
  const observer = new ResizeObserver(() => game.scale.refresh());
  observer.observe(host);
  const live = () => scene.sys?.isActive();

  return {
    destroy() {
      observer.disconnect();
      game.destroy(true);
    },
    setInput: (x, y) => scene.setInput(x, y),
    act: () => live() && scene.act(),
    walkToRoom: (id) => live() && scene.walkToRoom(id),
    leaveNote: (targetId, text) => live() && scene.leaveNote(targetId, text),
    fastForward: () => live() && scene.fastForward(),
    leaveConversation: () => live() && scene.endConversation("left"),
    reset: () => {
      scene.setInput(0, 0);
      scene.scene.restart(options);
    },
    setPaused(paused) {
      scene.paused = paused;
      if (paused) game.loop.sleep();
      else game.loop.wake();
    },
  };
}
