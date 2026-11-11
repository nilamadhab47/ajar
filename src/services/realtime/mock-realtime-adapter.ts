import { DEMO_CHANNEL_LINES, DEMO_DM_REPLIES, DEMO_NEARBY_REPLIES, DEMO_FLOORS, LOCAL_USER_ID } from "@/data/demo-workspace";
import { DEMO_DESK_ASSIGNMENTS, DEMO_PARTICIPANTS, DEMO_POIS, type DemoParticipant } from "@/data/demo-participants";
import type { AnimationState, Direction } from "@/features/avatar/types/avatar.types";
import { NavGrid } from "@/features/world/engine/CollisionSystem";
import { parseTiledMap, roomAt } from "@/features/world/engine/MapLoader";
import { findPath, simplifyPath } from "@/features/world/engine/PathfindingSystem";
import { buildSeats, seatApproachTile } from "@/features/world/engine/seats";
import type { LoadedMap, TiledMap } from "@/features/world/types/map.types";
import type { Seat } from "@/features/world/types/world.types";
import { WORLD_CONFIG } from "@/lib/config";
import { createRng, pick } from "@/lib/random";
import { uid } from "@/lib/utils";
import type { Player, PresenceStatus } from "@/types/domain";
import { BaseRealtimeAdapter } from "./realtime-adapter";
import type { ClientEventMap, ClientEventName, MovementPayload } from "./realtime-events";

interface Bot {
  def: DemoParticipant;
  id: string;
  x: number;
  y: number;
  direction: Direction;
  anim: AnimationState;
  status: PresenceStatus;
  seatId: string | null;
  path: { x: number; y: number }[];
  /** What to do on arrival. */
  arrive: { seat?: Seat; facing?: Direction; returnAfterMs?: number } | null;
  nextDecisionAt: number;
  poi: number;
  seq: number;
  wavedAtLocal: boolean;
}

const TICK_MS = 100;
const BOT_SPEED = 105;
const FLOOR = "floor-1";

/**
 * In-browser stand-in for the realtime backend. It owns the simulated
 * participants and speaks exactly the same event contract as a real server, so
 * the rest of the app cannot tell the difference.
 */
export class MockRealtimeAdapter extends BaseRealtimeAdapter {
  readonly mode = "mock" as const;
  private rng = createRng(20261110);
  private bots: Bot[] = [];
  private map: LoadedMap | null = null;
  private grid: NavGrid | null = null;
  private seats = new Map<string, Seat>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private timeouts = new Set<ReturnType<typeof setTimeout>>();
  private lastTick = 0;
  private local = { floorId: FLOOR, x: 0, y: 0, status: "available" as PresenceStatus };
  private nextChatAt = 0;
  private nextStatusAt = 0;
  private lastWaveAt = 0;
  private chatLine = 0;
  /** Invalidates in-flight connects when disconnect() is called (React strict mode mounts twice). */
  private attempt = 0;

  async connect(): Promise<void> {
    if (this.getState() === "connected") return;
    this.setState("connecting");
    const attempt = ++this.attempt;
    const res = await fetch(DEMO_FLOORS[0].mapUrl);
    if (attempt !== this.attempt) return;
    if (!res.ok) {
      this.setState("error", "Could not load the demo map");
      throw new Error("Could not load the demo map");
    }
    const json = (await res.json()) as TiledMap;
    if (attempt !== this.attempt) return;
    this.map = parseTiledMap(json);
    this.grid = new NavGrid(this.map, this.map.objects);
    this.seats = new Map(buildSeats(this.map.objects).map((s) => [s.id, s]));
    const now = Date.now();
    this.bots = DEMO_PARTICIPANTS.map((def, i) => this.createBot(def, i, now));
    this.nextChatAt = now + 40_000;
    this.nextStatusAt = now + 55_000;
    this.lastTick = now;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.setState("connected");
  }

  disconnect(): void {
    this.attempt += 1;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.timeouts.forEach(clearTimeout);
    this.timeouts.clear();
    this.setState("disconnected");
  }

  /** Demo helper: drops the "connection" for a few seconds to exercise reconnect UI. */
  simulateDrop(ms = 3500): void {
    if (this.getState() !== "connected") return;
    this.setState("reconnecting", "Simulated network drop");
    const t = setTimeout(() => {
      this.timeouts.delete(t);
      this.setState("connected");
      this.sendSnapshot();
    }, ms);
    this.timeouts.add(t);
  }

  send<E extends ClientEventName>(event: E, payload: ClientEventMap[E]): void {
    if (this.getState() !== "connected") return;
    // Narrowing by event name keeps the handlers typed.
    switch (event) {
      case "player:join": {
        const p = payload as ClientEventMap["player:join"];
        this.local = { ...this.local, floorId: p.floorId, x: p.x, y: p.y, status: p.user.status };
        this.later(60, () => this.sendSnapshot());
        break;
      }
      case "player:move":
      case "player:stop": {
        const p = payload as MovementPayload;
        this.local.x = p.x;
        this.local.y = p.y;
        break;
      }
      case "player:status:update": {
        const p = payload as ClientEventMap["player:status:update"];
        this.local.status = p.status;
        this.emit("player:status:updated", p);
        break;
      }
      case "player:wave": {
        const p = payload as ClientEventMap["player:wave"];
        const bot = this.bots.find((b) => b.id === p.targetId);
        if (bot && bot.status !== "dnd" && bot.status !== "focus")
          this.later(900, () => this.emit("player:waved", { playerId: bot.id, targetId: LOCAL_USER_ID }));
        break;
      }
      case "conversation:join": {
        const p = payload as ClientEventMap["conversation:join"];
        (p.targetIds ?? []).forEach((id, i) =>
          this.later(450 + i * 250, () => this.emit("conversation:participant:joined", { playerId: id, conversationId: p.conversationId })),
        );
        break;
      }
      case "chat:send":
        this.onChat((payload as ClientEventMap["chat:send"]).message);
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------------ setup
  private createBot(def: DemoParticipant, index: number, now: number): Bot {
    const grid = this.grid!;
    const seat = def.seatId ? this.seats.get(def.seatId) : undefined;
    const tile = def.tile ? grid.tileCenter(def.tile[0], def.tile[1]) : { x: 0, y: 0 };
    if (seat) seat.occupantId = def.user.id;
    return {
      def, id: def.user.id,
      x: seat?.x ?? tile.x, y: seat?.y ?? tile.y,
      direction: seat?.facing ?? def.facing ?? "down",
      anim: seat ? "sit" : "idle",
      status: def.user.status,
      seatId: seat?.id ?? null,
      path: [], arrive: null,
      // Stagger first decisions so the office never moves in unison.
      nextDecisionAt: now + 14_000 + index * 9_000 + this.rng() * 20_000,
      poi: index, seq: 0, wavedAtLocal: false,
    };
  }

  private toPlayer(b: Bot): Player {
    return {
      id: b.id, userId: b.id, x: b.x, y: b.y, direction: b.direction, currentFloorId: FLOOR,
      currentRoomId: roomAt(this.map!.rooms, b.x, b.y - 4)?.id ?? null,
      status: b.status, isMoving: b.anim === "walk", animationState: b.anim, seatId: b.seatId, lastUpdatedAt: Date.now(),
    };
  }

  private sendSnapshot(): void {
    const here = this.local.floorId === FLOOR;
    const bots = here ? this.bots : [];
    this.emit("world:snapshot", {
      floorId: this.local.floorId,
      players: bots.map((b) => this.toPlayer(b)),
      users: this.bots.map((b) => ({ ...b.def.user, status: b.status })),
      presence: this.bots.map((b) => ({
        userId: b.id, status: b.status, currentLocation: roomAt(this.map!.rooms, b.x, b.y - 4)?.name ?? "Hallway",
        currentActivity: b.def.activity, lastSeenAt: Date.now(),
      })),
      deskAssignments: DEMO_DESK_ASSIGNMENTS,
    });
  }

  // ------------------------------------------------------------------ simulation
  private tick(): void {
    const now = Date.now();
    const dt = Math.min(0.25, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (this.getState() !== "connected") return;
    const visible = this.local.floorId === FLOOR;

    for (const b of this.bots) {
      if (b.path.length) this.advance(b, dt, visible);
      else if (now >= b.nextDecisionAt) this.decide(b, now);
      if (visible && !b.wavedAtLocal && b.status === "available" && b.def.routine !== "meeting" && now - this.lastWaveAt > 25_000) {
        const d = Math.hypot(b.x - this.local.x, b.y - this.local.y);
        if (d < WORLD_CONFIG.tileSize * 3 && this.local.x > 0) {
          b.wavedAtLocal = true;
          this.lastWaveAt = now;
          this.later(1200, () => this.emit("player:waved", { playerId: b.id, targetId: LOCAL_USER_ID }));
        }
      }
    }
    if (now >= this.nextChatAt) {
      const [channelId, sender, message] = DEMO_CHANNEL_LINES[this.chatLine++ % DEMO_CHANNEL_LINES.length];
      this.emit("chat:message", { message: { id: uid("m"), channelId, senderId: `demo-${sender}`, message, timestamp: now, reactions: [] } });
      this.nextChatAt = now + 55_000 + this.rng() * 40_000;
    }
    if (now >= this.nextStatusAt) {
      const flippable = this.bots.filter((b) => b.def.routine === "desk" && (b.status === "available" || b.status === "busy"));
      if (flippable.length) {
        const b = pick(this.rng, flippable);
        b.status = b.status === "available" ? "busy" : "available";
        this.emit("player:status:updated", { playerId: b.id, status: b.status, activity: b.def.activity });
      }
      this.nextStatusAt = now + 60_000 + this.rng() * 45_000;
    }
  }

  private movement(b: Bot): MovementPayload {
    return { playerId: b.id, x: b.x, y: b.y, direction: b.direction, animationState: b.anim, timestamp: Date.now(), seq: ++b.seq, seatId: b.seatId };
  }

  private advance(b: Bot, dt: number, visible: boolean): void {
    let budget = BOT_SPEED * dt;
    while (budget > 0 && b.path.length) {
      const target = b.path[0];
      const dx = target.x - b.x;
      const dy = target.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= budget) {
        b.x = target.x;
        b.y = target.y;
        b.path.shift();
        budget -= dist;
      } else {
        b.x += (dx / dist) * budget;
        b.y += (dy / dist) * budget;
        b.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
        budget = 0;
      }
    }
    if (b.path.length) {
      b.anim = "walk";
      if (visible) this.emit("player:moved", this.movement(b));
      return;
    }
    const a = b.arrive;
    b.arrive = null;
    if (a?.seat) {
      b.x = a.seat.x;
      b.y = a.seat.y;
      b.direction = a.seat.facing;
      b.anim = "sit";
      b.seatId = a.seat.id;
      a.seat.occupantId = b.id;
      if (visible) this.emit("player:interaction", { playerId: b.id, objectId: a.seat.objectId, action: "sit", seatId: a.seat.id });
    } else {
      b.anim = "idle";
      if (a?.facing) b.direction = a.facing;
    }
    b.nextDecisionAt = Date.now() + (a?.returnAfterMs ?? 50_000 + this.rng() * 90_000);
    if (visible) this.emit("player:stopped", this.movement(b));
  }

  private decide(b: Bot, now: number): void {
    const { def } = b;
    b.nextDecisionAt = now + 45_000 + this.rng() * 80_000;
    if (def.routine === "host" || def.routine === "meeting") {
      // Hosts and meeting attendees stay put; an occasional glance keeps them alive.
      if (def.routine === "host" && this.rng() < 0.5) {
        b.direction = pick(this.rng, ["down", "left", "right"] as const);
        if (this.local.floorId === FLOOR) this.emit("player:stopped", this.movement(b));
      }
      return;
    }
    if (def.routine === "break") {
      const spots = ["coffee", "kitchenTable", "water", "fridge"];
      const [tx, ty, facing] = DEMO_POIS[spots[b.poi++ % spots.length]];
      this.walkTo(b, tx, ty, { facing, returnAfterMs: 12_000 + this.rng() * 14_000 });
      return;
    }
    const home = def.seatId ? this.seats.get(def.seatId) : undefined;
    if (b.seatId === null && home) {
      // Away from the seat → head home.
      const approach = seatApproachTile(this.grid!, home);
      if (approach) this.walkTo(b, approach.x, approach.y, { seat: home });
      return;
    }
    if (!def.takesBreaks && !(def.routine === "lounge" && this.rng() < 0.25)) return;
    const options = def.routine === "lounge" ? ["loungeEdge", "coffee", "garden"] : ["coffee", "water", "printer", "standup", "library", "garden", "pond", "reception"];
    const [tx, ty, facing] = DEMO_POIS[pick(this.rng, options)];
    this.walkTo(b, tx, ty, { facing, returnAfterMs: 9_000 + this.rng() * 12_000 });
  }

  private walkTo(b: Bot, tx: number, ty: number, arrive: Bot["arrive"]): void {
    const grid = this.grid!;
    let from = { x: grid.toTile(b.x), y: grid.toTile(b.y - 1) };
    const seat = b.seatId ? this.seats.get(b.seatId) : undefined;
    if (seat) from = seatApproachTile(grid, seat) ?? from;
    const path = findPath(grid, from, { x: tx, y: ty });
    if (!path) return;
    if (seat) {
      seat.occupantId = null;
      b.seatId = null;
      if (this.local.floorId === FLOOR) this.emit("player:interaction", { playerId: b.id, objectId: seat.objectId, action: "stand", seatId: seat.id });
    }
    b.path = [from, ...simplifyPath(path)].map((t) => grid.tileCenter(t.x, t.y));
    b.arrive = arrive;
  }

  // ------------------------------------------------------------------ chat
  private onChat(message: ClientEventMap["chat:send"]["message"]): void {
    if (message.channelId === "nearby") {
      const radius = WORLD_CONFIG.proximity.discoveryTiles * WORLD_CONFIG.tileSize;
      const near = this.bots
        .filter((b) => b.status !== "dnd" && b.status !== "focus" && Math.hypot(b.x - this.local.x, b.y - this.local.y) <= radius)
        .sort((a, c) => Math.hypot(a.x - this.local.x, a.y - this.local.y) - Math.hypot(c.x - this.local.x, c.y - this.local.y))[0];
      if (near)
        this.later(1300, () =>
          this.emit("chat:message", {
            message: { id: uid("m"), channelId: "nearby", senderId: near.id, message: pick(this.rng, DEMO_NEARBY_REPLIES), timestamp: Date.now(), reactions: [] },
          }),
        );
      return;
    }
    if (message.channelId.startsWith("dm-")) {
      const senderId = message.channelId.slice(3);
      if (this.bots.some((b) => b.id === senderId))
        this.later(1700, () =>
          this.emit("chat:message", {
            message: { id: uid("m"), channelId: message.channelId, senderId, message: pick(this.rng, DEMO_DM_REPLIES), timestamp: Date.now(), reactions: [] },
          }),
        );
    }
  }

  private later(ms: number, fn: () => void): void {
    const t = setTimeout(() => {
      this.timeouts.delete(t);
      if (this.getState() === "connected") fn();
    }, ms);
    this.timeouts.add(t);
  }
}
