import * as Phaser from "phaser";
import { LOCAL_USER_ID } from "@/data/demo-workspace";
import { useAvatarStore } from "@/features/avatar/avatar-store";
import { useConversationStore } from "@/features/conversation/conversation-store";
import { useDeskStore } from "@/features/desk/desk-store";
import { getLocalUser, usePeopleStore } from "@/features/people/people-store";
import { useProfileStore } from "@/features/presence/presence-store";
import { WORLD_CONFIG } from "@/lib/config";
import { shortcuts } from "@/lib/shortcuts";
import { getRealtime, MovementPublisher } from "@/services/realtime/realtime-client";
import type { MovementPayload, ServerEventMap } from "@/services/realtime/realtime-events";
import { useAppStore } from "@/stores/app-store";
import { useUiStore } from "@/stores/ui-store";
import type { Player, User } from "@/types/domain";
import { DeskObject } from "../entities/DeskObject";
import { InteractiveObject } from "../entities/InteractiveObject";
import { PlayerCharacter } from "../entities/PlayerCharacter";
import { RemoteCharacter } from "../entities/RemoteCharacter";
import type { Character } from "../entities/Character";
import { TILE_LAYER_NAMES, type LoadedMap, type TiledMap } from "../types/map.types";
import type { Room, Seat, WorldObject } from "../types/world.types";
import { sendWorldCommand, worldCommands, worldRuntime, type WorldCommand } from "../world-bridge";
import { useWorldStore } from "../world-store";
import { CameraController } from "./CameraController";
import { NavGrid } from "./CollisionSystem";
import { Depth, sortedDepth } from "./DepthSortingSystem";
import { EditController } from "./EditController";
import { InputController } from "./InputController";
import { InteractionSystem } from "./InteractionSystem";
import { parseTiledMap, roomAt } from "./MapLoader";
import { computeNearby, nearbySignature, type ProximitySubject } from "./ProximitySystem";
import { buildSeats, seatApproachTile } from "./seats";
import type { WorldContext } from "./world-context";

export interface OfficeSceneData {
  floorId?: string;
  spawn?: "default" | "elevator" | "stairs";
}

const T = WORLD_CONFIG.tileSize;
const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const LAYER_DEPTH: Record<(typeof TILE_LAYER_NAMES)[number], number> = {
  ground: Depth.ground, "floor-decor": Depth.floorDecor, rugs: Depth.rugs, walls: Depth.walls, foreground: Depth.foreground,
};

/**
 * The playable office. Owns rendering and simulation only; everything the UI
 * needs is published to stores, and everything the UI wants arrives as a WorldCommand.
 */
export class OfficeScene extends Phaser.Scene implements WorldContext {
  map!: LoadedMap;
  grid!: NavGrid;
  player!: PlayerCharacter;
  views = new Map<string, InteractiveObject>();
  seats = new Map<string, Seat>();
  objects: WorldObject[] = [];

  private remotes = new Map<string, RemoteCharacter>();
  private cameraCtl!: CameraController;
  private inputCtl!: InputController;
  private interaction!: InteractionSystem;
  private edit!: EditController;
  private publisher!: MovementPublisher;
  private labels: Phaser.GameObjects.Container[] = [];
  private disposers: (() => void)[] = [];
  private floorId = "floor-1";
  private spawnId: NonNullable<OfficeSceneData["spawn"]> = "default";
  private timers = { fast: 0, proximity: 0, room: 0, occupants: 0, follow: 0 };
  private nearbySig = "";
  private currentRoom: Room | null = null;
  private followTile = "";
  private ready = false;

  constructor() {
    super("office");
  }

  init(data: OfficeSceneData): void {
    this.floorId = data.floorId ?? useWorldStore.getState().floorId ?? "floor-1";
    this.spawnId = data.spawn ?? "default";
    this.views = new Map();
    this.seats = new Map();
    this.remotes = new Map();
    this.labels = [];
    this.disposers = [];
    this.ready = false;
    this.currentRoom = null;
    this.nearbySig = "";
  }

  private get floor() {
    const floors = useAppStore.getState().workspace?.floors ?? [];
    return floors.find((f) => f.id === this.floorId) ?? floors[0];
  }

  preload(): void {
    const floor = this.floor;
    this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) =>
      useWorldStore.getState().set({ status: "error", error: `Could not load ${file.key}. Check that public assets are being served.` }),
    );
    if (!this.textures.exists("tiles")) this.load.image("tiles", "/assets/tiles/office-tiles.png");
    if (!this.textures.exists("furniture")) this.load.atlas("furniture", "/assets/furniture/furniture.png", "/assets/furniture/furniture.json");
    if (floor && !this.cache.tilemap.exists(`map-${floor.id}`)) this.load.tilemapTiledJSON(`map-${floor.id}`, floor.mapUrl);
  }

  create(): void {
    const key = `map-${this.floorId}`;
    const json = this.cache.tilemap.get(key)?.data as TiledMap | undefined;
    if (!json || !this.textures.exists("tiles") || !this.textures.exists("furniture")) return;

    // ---- map
    this.map = parseTiledMap(json);
    const tilemap = this.make.tilemap({ key });
    const tileset = tilemap.addTilesetImage("office-tiles", "tiles", T, T, 1, 2)!;
    for (const name of TILE_LAYER_NAMES) tilemap.createLayer(name, tileset)?.setDepth(LAYER_DEPTH[name]);
    this.cameras.main.setBackgroundColor("#EDEAE4");

    this.objects = this.map.objects.map((o) => ({ ...o, properties: { ...o.properties } }));
    this.objects.forEach((o) => this.createView(o));
    this.grid = new NavGrid(this.map, this.objects);
    this.rebuildSeats();
    this.map.labels.forEach((l) => this.addLabel(l.text, l.x, l.y));

    // ---- local player
    const spawn = this.map.spawns.find((s) => s.id === this.spawnId) ?? this.map.spawns[0] ?? { x: 64, y: 64, direction: "down" as const };
    const me = getLocalUser();
    const profile = useProfileStore.getState();
    this.player = new PlayerCharacter(this, {
      id: LOCAL_USER_ID, name: me.displayName, x: spawn.x, y: spawn.y, direction: spawn.direction,
      appearance: me.avatar, status: me.status, statusEmoji: profile.statusEmoji, door: profile.door, isLocal: true,
    });
    this.player.sprite.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (p: Phaser.Input.Pointer) => {
      if (p.getDistance() < 6 && !this.edit.enabled) useUiStore.getState().selectUser(LOCAL_USER_ID);
    });
    this.player.onSeatChange = (seat, previous) => {
      if (previous) previous.occupantId = null;
      if (seat) seat.occupantId = LOCAL_USER_ID;
      useWorldStore.getState().set({ sitting: !!seat });
      const target = seat ?? previous!;
      getRealtime().send("player:interaction", { playerId: LOCAL_USER_ID, objectId: target.objectId, action: seat ? "sit" : "stand", seatId: target.id });
    };

    // ---- systems
    this.cameraCtl = new CameraController(this, this.map.width * T, this.map.height * T);
    this.cameraCtl.follow(this.player.sprite, true);
    this.interaction = new InteractionSystem(this, this);
    this.edit = new EditController(this, this);
    this.edit.setEnabled(useWorldStore.getState().editMode);
    this.inputCtl = new InputController(this, {
      onPress: (x, y) => (this.edit.enabled ? this.edit.press(x, y) : false),
      onDrag: (dx, dy, wx, wy, consumed) => (consumed ? this.edit.drag(wx, wy) : this.cameraCtl.panBy(dx, dy)),
      onRelease: (consumed) => consumed && this.edit.release(),
      onClick: (_x, _y, overObject) => {
        if (this.edit.enabled) this.edit.select(null);
        else if (!overObject) useUiStore.getState().selectUser(null);
      },
      onDoubleClick: (x, y) => !this.edit.enabled && this.requestWalk(x, y),
      onWheel: (delta) => this.cameraCtl.zoomStep(delta > 0 ? -1 : 1),
    });

    const realtime = getRealtime();
    this.publisher = new MovementPublisher(realtime, LOCAL_USER_ID);
    this.bindRealtime();
    this.bindStores();
    this.disposers.push(
      worldCommands.on("command", (c) => this.handleCommand(c)),
      shortcuts.on("interact", () => this.interaction.trigger()),
      shortcuts.on("locate", () => this.cameraCtl.recenter()),
      shortcuts.on("escape", () => {
        this.player.cancelPath();
        useWorldStore.getState().set({ followingUserId: null });
        if (this.edit.enabled) this.edit.select(null);
      }),
    );
    const onVisibility = () => document.visibilityState === "visible" && this.remotes.forEach((r) => r.snap());
    document.addEventListener("visibilitychange", onVisibility);
    this.disposers.push(() => document.removeEventListener("visibilitychange", onVisibility));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());

    // ---- publish & join
    useWorldStore.getState().set({
      status: "ready", error: null, floorId: this.floorId, transitioning: false, rooms: this.map.rooms, roomOccupants: {}, nearby: [],
      currentRoomId: null, sitting: false, followingUserId: null, objectCount: this.objects.length,
      map: { name: this.map.name, width: this.map.width, height: this.map.height, tileSize: T },
    });
    worldRuntime.positions.clear();
    realtime.send("player:join", { user: me, floorId: this.floorId, x: spawn.x, y: spawn.y, direction: spawn.direction });
    this.cameras.main.fadeIn(320, 246, 244, 242);
    this.ready = true;
  }

  // ------------------------------------------------------------------ frame loop
  update(time: number, delta: number): void {
    if (!this.ready) return;
    const dt = Math.min(delta, 100) / 1000;
    const input = this.inputCtl.readMovement();
    if (input.x !== 0 || input.y !== 0) {
      if (!this.cameraCtl.following) this.cameraCtl.follow(this.player.sprite);
      if (useWorldStore.getState().followingUserId) useWorldStore.getState().set({ followingUserId: null });
    }
    this.player.update(dt, input, this.grid);
    const zoom = this.cameraCtl.zoom;
    this.player.render(zoom);
    this.track(this.player);
    for (const remote of this.remotes.values()) {
      remote.update();
      remote.render(zoom);
      this.track(remote);
    }
    this.publisher.update(
      { x: this.player.x, y: this.player.y, direction: this.player.direction, animationState: this.player.state, seatId: this.player.seatId },
      this.player.state === "walk",
      time,
    );
    this.interaction.render(time);
    for (const label of this.labels) label.setScale(1 / zoom).setVisible(zoom > 0.5);
    this.cameraCtl.update();

    const t = this.timers;
    if ((t.fast += delta) >= 100) {
      t.fast = 0;
      this.interaction.scan();
      this.declutterNameplates(zoom);
    }
    if ((t.proximity += delta) >= 150) {
      t.proximity = 0;
      this.updateProximity();
    }
    if ((t.room += delta) >= 300) {
      t.room = 0;
      this.updateRoom();
    }
    if ((t.occupants += delta) >= 1000) {
      t.occupants = 0;
      this.updateOccupants();
    }
    if ((t.follow += delta) >= 700) {
      t.follow = 0;
      this.updateFollow();
    }
  }

  private track(c: Character): void {
    const p = worldRuntime.positions.get(c.id);
    if (p) {
      p.x = c.x;
      p.y = c.y;
    } else worldRuntime.positions.set(c.id, { x: c.x, y: c.y });
  }

  /** Nudges overlapping nameplates apart (smoothed, so they never flicker). */
  private declutterNameplates(zoom: number): void {
    const all: Character[] = [this.player, ...this.remotes.values()];
    all.sort((a, b) => b.y - a.y);
    const placed: { x: number; y: number; w: number }[] = [];
    for (const c of all) {
      const x = c.x * zoom;
      const baseY = (c.y - 42) * zoom;
      const w = c.plate.screenWidth;
      let lift = 0;
      for (let pass = 0; pass < 3; pass++) {
        const y = baseY - lift;
        if (placed.some((p) => Math.abs(p.x - x) < (p.w + w) / 2 + 3 && Math.abs(p.y - y) < 21)) lift += 22;
        else break;
      }
      c.plate.targetLift = lift;
      placed.push({ x, y: baseY - lift, w });
    }
  }

  private updateProximity(): void {
    const people = usePeopleStore.getState();
    const subject = (c: Character): ProximitySubject => ({ id: c.id, x: c.x, y: c.y, status: c.status, room: roomAt(this.map.rooms, c.x, c.y - 4) });
    const nearby = computeNearby(subject(this.player), [...this.remotes.values()].filter((r) => people.users[r.id]).map(subject));
    const conversation = useConversationStore.getState().active;
    const strength = new Map(nearby.map((n) => [n.userId, n.strength]));
    for (const remote of this.remotes.values()) {
      const talking = !!conversation?.joinedIds.includes(remote.id);
      const s = strength.get(remote.id);
      remote.ringTarget = talking ? 0.95 : s !== undefined ? 0.2 + s * 0.45 : 0;
      remote.setRingColor(talking ? 0x21c879 : 0xa7e3b4);
      remote.plate.set({ talking });
    }
    this.player.plate.set({ talking: !!conversation && conversation.joinedIds.length > 0 });
    const sig = nearbySignature(nearby);
    if (sig !== this.nearbySig) {
      this.nearbySig = sig;
      useWorldStore.getState().set({ nearby });
    }
    // A proximity conversation ends by itself once everyone is out of earshot.
    if (conversation?.scope.type === "proximity" && !conversation.invitedIds.some((id) => strength.has(id))) {
      useConversationStore.getState().leave();
      useUiStore.getState().toast({ title: "Conversation ended", body: "You moved out of range." });
    }
  }

  private updateRoom(): void {
    const room = roomAt(this.map.rooms, this.player.x, this.player.y - 4);
    if (room?.id === this.currentRoom?.id) return;
    const realtime = getRealtime();
    if (this.currentRoom) realtime.send("room:leave", { playerId: LOCAL_USER_ID, roomId: this.currentRoom.id });
    if (room) realtime.send("room:join", { playerId: LOCAL_USER_ID, roomId: room.id });
    const conversation = useConversationStore.getState();
    if (conversation.active?.scope.type === "room" && conversation.active.scope.roomId !== room?.id) {
      conversation.leave();
      useUiStore.getState().toast({ title: "You left the room conversation" });
    }
    this.currentRoom = room;
    useWorldStore.getState().set({ currentRoomId: room?.id ?? null });
  }

  private updateOccupants(): void {
    const occupants: Record<string, string[]> = {};
    const locations: Record<string, string | null> = {};
    for (const c of [this.player, ...this.remotes.values()] as Character[]) {
      const room = roomAt(this.map.rooms, c.x, c.y - 4);
      locations[c.id] = room?.id ?? null;
      if (room) (occupants[room.id] ??= []).push(c.id);
    }
    const prev = useWorldStore.getState().roomOccupants;
    const same = Object.keys(occupants).length === Object.keys(prev).length && Object.entries(occupants).every(([k, v]) => prev[k]?.join() === v.join());
    if (!same) {
      useWorldStore.getState().set({ roomOccupants: occupants });
      usePeopleStore.getState().setLocations(locations);
    }
  }

  /** Keeps walking after a followed user whenever they move to another tile. */
  private updateFollow(): void {
    const id = useWorldStore.getState().followingUserId;
    if (!id) return;
    const target = this.remotes.get(id);
    if (!target) return void useWorldStore.getState().set({ followingUserId: null });
    const tile = `${this.grid.toTile(target.x)},${this.grid.toTile(target.y - 1)}`;
    if (tile === this.followTile && !this.player.isWalkingPath) return;
    if (tile === this.followTile) return;
    this.followTile = tile;
    this.walkNear(target.x, target.y);
  }

  // ------------------------------------------------------------------ movement helpers
  private requestWalk(x: number, y: number, onArrive?: () => void): void {
    useWorldStore.getState().set({ followingUserId: null });
    const result = this.player.walkToTile(this.grid, { x: this.grid.toTile(x), y: this.grid.toTile(y) }, onArrive);
    if (result === "unreachable") return void useUiStore.getState().toast({ title: "Can't get there", body: "That spot isn't reachable on foot.", tone: "warning" });
    if (!this.cameraCtl.following) this.cameraCtl.recenter();
    this.pulse(x, y);
  }

  /** Walks to a free tile next to a point (used for people and objects). */
  private walkNear(x: number, y: number, onArrive?: () => void): boolean {
    const target = { x: this.grid.toTile(x), y: this.grid.toTile(y - 1) };
    const options = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [0, 2], [2, 0], [-2, 0]]
      .map(([dx, dy]) => ({ x: target.x + dx, y: target.y + dy }))
      .filter((t) => !this.grid.isBlocked(t.x, t.y));
    for (const tile of options) if (this.player.walkToTile(this.grid, tile, onArrive) !== "unreachable") return true;
    return this.player.walkToTile(this.grid, target, onArrive) !== "unreachable";
  }

  private pulse(x: number, y: number): void {
    const ring = this.add.image(x, y, "furniture", "ring").setDepth(Depth.rings).setTint(0x6c63c7).setScale(0.3).setAlpha(0.9);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 520, ease: "Quad.easeOut", onComplete: () => ring.destroy() });
  }

  private seatDepth(seat: Seat): number | null {
    // Facing up: natural Y-sorting already puts the chair back over the sitter.
    if (seat.facing === "up") return null;
    const view = this.views.get(seat.objectId);
    return view ? sortedDepth(view.bottom, 1) : null;
  }

  sitOn(object: WorldObject): void {
    const free = [...this.seats.values()].filter((s) => s.objectId === object.id && !s.occupantId);
    if (!free.length) return void useUiStore.getState().toast({ title: "Seat taken", body: "Someone is already sitting there.", tone: "warning" });
    free.sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y));
    const seat = free[0];
    const sit = () => {
      if (seat.occupantId) return;
      this.player.sit(seat, this.seatDepth(seat));
    };
    const approach = seatApproachTile(this.grid, seat);
    const here = this.player.tile;
    if (!approach || (Math.abs(approach.x - here.x) <= 1 && Math.abs(approach.y - here.y) <= 1)) sit();
    else if (this.player.walkToTile(this.grid, approach, sit) === "unreachable") sit();
  }
  standUp(): void {
    this.player.stand(this.grid);
  }

  // ------------------------------------------------------------------ objects
  private createView(object: WorldObject): InteractiveObject {
    const view = object.interactionType === "desk" ? new DeskObject(this, object) : new InteractiveObject(this, object);
    if (view instanceof DeskObject) view.setDecor(useDeskStore.getState().decor[view.deskId] ?? []);
    this.views.set(object.id, view);
    return view;
  }
  addObject(object: WorldObject): InteractiveObject {
    this.objects.push(object);
    return this.createView(object);
  }
  removeObject(id: string): void {
    this.views.get(id)?.destroy();
    this.views.delete(id);
    this.objects = this.objects.filter((o) => o.id !== id);
  }
  refreshObjects(): void {
    this.grid.rebuild(this.objects);
    this.rebuildSeats();
    useWorldStore.getState().set({ objectCount: this.objects.length });
  }
  private rebuildSeats(): void {
    const occupied = new Map([...this.seats.values()].filter((s) => s.occupantId).map((s) => [s.id, s.occupantId]));
    this.seats = new Map(buildSeats(this.objects).map((s) => [s.id, { ...s, occupantId: occupied.get(s.id) ?? null }]));
  }

  private addLabel(text: string, x: number, y: number): void {
    const label = this.add.text(0, 0, text, { fontFamily: FONT, fontSize: "12px", fontStyle: "500", color: "#6B6F78", resolution: 2 }).setOrigin(0.5);
    label.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const w = label.width + 20;
    const bg = this.add.graphics().fillStyle(0xffffff, 0.72).fillRoundedRect(-w / 2, -11, w, 22, 11);
    this.labels.push(this.add.container(x, y, [bg, label]).setDepth(Depth.labels));
  }

  // ------------------------------------------------------------------ effects
  effect(kind: "confetti" | "steam" | "sparkle", x: number, y: number): void {
    if (kind === "steam") {
      for (let i = 0; i < 4; i++) {
        const puff = this.add.image(x + (i - 1.5) * 3, y, "furniture", "steam").setDepth(Depth.effects).setAlpha(0);
        this.tweens.add({ targets: puff, y: y - 22 - i * 3, alpha: { from: 0.9, to: 0 }, scale: { from: 0.6, to: 1.6 }, delay: i * 160, duration: 900, onComplete: () => puff.destroy() });
      }
      return;
    }
    const emitter = this.add.particles(x, y, "furniture", {
      frame: "particle", lifespan: kind === "confetti" ? 1500 : 600,
      speed: kind === "confetti" ? { min: 90, max: 280 } : { min: 20, max: 70 },
      angle: kind === "confetti" ? { min: 215, max: 325 } : { min: 0, max: 360 },
      gravityY: kind === "confetti" ? 520 : 0, rotate: { min: 0, max: 360 }, scale: { start: 1, end: 0.5 },
      tint: [0xe89b8c, 0xa9a2d5, 0xa7c9ab, 0xa9c9de, 0xf0cf7a, 0x6c63c7], emitting: false,
    });
    emitter.setDepth(Depth.effects).explode(kind === "confetti" ? 56 : 12);
    this.time.delayedCall(1700, () => emitter.destroy());
  }
  shake(): void {
    this.cameras.main.shake(260, 0.004);
  }

  // ------------------------------------------------------------------ commands from React
  private handleCommand(c: WorldCommand): void {
    if (!this.ready) return;
    const ui = useUiStore.getState();
    switch (c.type) {
      case "recenter":
        return this.cameraCtl.recenter();
      case "zoom":
        return c.direction === "reset" ? this.cameraCtl.resetZoom() : this.cameraCtl.zoomStep(c.direction === "in" ? 1 : -1);
      case "pan-to":
        return this.cameraCtl.panTo(c.x, c.y);
      case "walk-to":
        return this.requestWalk(c.x, c.y);
      case "walk-to-user": {
        const target = this.remotes.get(c.userId);
        if (!target) return ui.toast({ title: "Not on this floor", tone: "warning" });
        this.followTile = `${this.grid.toTile(target.x)},${this.grid.toTile(target.y - 1)}`;
        useWorldStore.getState().set({ followingUserId: c.follow ? c.userId : null });
        if (!this.walkNear(target.x, target.y)) ui.toast({ title: "Can't reach them right now", tone: "warning" });
        else if (!this.cameraCtl.following) this.cameraCtl.recenter();
        return;
      }
      case "walk-to-object": {
        const view = this.views.get(c.objectId);
        if (!view) return ui.toast({ title: "That isn't on this floor", tone: "warning" });
        useWorldStore.getState().set({ followingUserId: null });
        if (!this.cameraCtl.following) this.cameraCtl.recenter();
        if (c.then === "sit") return this.sitOn(view.object);
        const o = view.object;
        this.walkNear(o.x + o.width / 2, o.y + o.height, c.then === "interact" ? () => this.interaction.trigger() : undefined);
        return;
      }
      case "walk-to-room": {
        const room = this.map.rooms.find((r) => r.id === c.roomId);
        if (!room) return ui.toast({ title: "That room is on another floor", tone: "warning" });
        if (!this.cameraCtl.following) this.cameraCtl.recenter();
        // Aim just inside the room, below its centre, where floor is usually free.
        return void this.walkNear(room.bounds.x + room.bounds.width / 2, room.bounds.y + room.bounds.height * 0.75);
      }
      case "locate-user": {
        const target = c.userId === LOCAL_USER_ID ? this.player : this.remotes.get(c.userId);
        if (!target) return ui.toast({ title: "Not on this floor", tone: "warning" });
        this.cameraCtl.panTo(target.x, target.y - 20);
        return this.pulse(target.x, target.y);
      }
      case "stop-follow":
        return useWorldStore.getState().set({ followingUserId: null });
      case "interact":
        return this.interaction.trigger();
      case "stand":
        return this.standUp();
      case "emote":
        this.player.showEmote(c.emoji);
        return getRealtime().send("player:interaction", { playerId: LOCAL_USER_ID, objectId: "self", action: `emote:${c.emoji}` });
      case "action":
        this.player.cancelPath();
        this.player.playAction(c.action);
        if (c.action === "wave") {
          const targetId = c.targetId ?? (ui.selectedUserId && ui.selectedUserId !== LOCAL_USER_ID ? ui.selectedUserId : useWorldStore.getState().nearby[0]?.userId);
          getRealtime().send("player:wave", { playerId: LOCAL_USER_ID, targetId });
        }
        return;
      case "say":
        this.player.say(c.text);
        return getRealtime().send("chat:send", {
          message: { id: `nearby-${Date.now()}`, channelId: "nearby", senderId: LOCAL_USER_ID, message: c.text, timestamp: Date.now(), reactions: [] },
        });
      case "change-floor":
        return this.changeFloor(c.floorId, c.via);
      case "edit-add": {
        const cam = this.cameras.main;
        return this.edit.add(c.kind, cam.midPoint.x, cam.midPoint.y);
      }
      case "edit-delete":
        return this.edit.deleteSelected();
      case "edit-reset":
        return void this.scene.restart({ floorId: this.floorId, spawn: "default" } satisfies OfficeSceneData);
    }
  }

  private changeFloor(floorId: string, via: NonNullable<OfficeSceneData["spawn"]>): void {
    if (floorId === this.floorId || useWorldStore.getState().transitioning) return;
    useWorldStore.getState().set({ transitioning: true });
    useConversationStore.getState().leave();
    getRealtime().send("player:leave", { playerId: LOCAL_USER_ID });
    this.cameras.main.fadeOut(280, 246, 244, 242);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart({ floorId, spawn: via } satisfies OfficeSceneData));
  }

  // ------------------------------------------------------------------ realtime → world
  private addRemote(player: Player, user: User): void {
    if (player.id === LOCAL_USER_ID || this.remotes.has(player.id) || player.currentFloorId !== this.floorId) return;
    const remote = new RemoteCharacter(this, {
      id: player.id, name: user.displayName.split(" ")[0], x: player.x, y: player.y, direction: player.direction,
      appearance: user.avatar, status: player.status, door: user.door,
    });
    remote.play(player.animationState, player.direction);
    remote.sprite.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (p: Phaser.Input.Pointer) => {
      if (p.getDistance() < 6 && !this.edit.enabled) useUiStore.getState().selectUser(player.id);
    });
    this.setRemoteSeat(remote, player.seatId ?? null);
    this.remotes.set(player.id, remote);
  }

  private setRemoteSeat(remote: RemoteCharacter, seatId: string | null): void {
    if (remote.seatId === seatId) return;
    const old = remote.seatId ? this.seats.get(remote.seatId) : undefined;
    if (old?.occupantId === remote.id) old.occupantId = null;
    const seat = seatId ? this.seats.get(seatId) : undefined;
    if (seat) seat.occupantId = remote.id;
    remote.seatId = seat ? seat.id : null;
    remote.seatDepth = seat ? this.seatDepth(seat) : null;
  }

  private onMovement = (p: MovementPayload): void => {
    const remote = this.remotes.get(p.playerId);
    if (!remote) return;
    remote.push(p);
    if (p.seatId !== undefined) this.setRemoteSeat(remote, p.animationState === "sit" ? (p.seatId ?? null) : null);
  };

  private bindRealtime(): void {
    const rt = getRealtime();
    const on = <E extends keyof ServerEventMap>(event: E, handler: (p: ServerEventMap[E]) => void) => this.disposers.push(rt.on(event, handler));
    on("world:snapshot", (s) => {
      if (s.floorId !== this.floorId) return;
      this.remotes.forEach((r) => r.destroy());
      this.remotes.clear();
      for (const seat of this.seats.values()) if (seat.occupantId !== LOCAL_USER_ID) seat.occupantId = null;
      const users = new Map(s.users.map((u) => [u.id, u]));
      for (const player of s.players) {
        const user = users.get(player.userId);
        if (user) this.addRemote(player, user);
      }
    });
    on("player:joined", ({ player, user }) => this.addRemote(player, user));
    on("player:left", ({ playerId }) => {
      const remote = this.remotes.get(playerId);
      if (!remote) return;
      this.setRemoteSeat(remote, null);
      remote.destroy();
      this.remotes.delete(playerId);
      worldRuntime.positions.delete(playerId);
    });
    on("player:moved", this.onMovement);
    on("player:stopped", this.onMovement);
    on("player:status:updated", (p) => this.remotes.get(p.playerId)?.setStatus(p.status, p.statusEmoji));
    on("player:avatar:updated", (p) => this.remotes.get(p.playerId)?.setAppearance(p.avatar));
    on("player:waved", (p) => this.remotes.get(p.playerId)?.playAction("wave"));
    on("player:interaction", (p) => {
      const remote = this.remotes.get(p.playerId);
      if (!remote) return;
      if (p.action === "stand") this.setRemoteSeat(remote, null);
      else if (p.action === "sit" && p.seatId) this.setRemoteSeat(remote, p.seatId);
      else if (p.action === "gong") {
        const o = this.views.get(p.objectId)?.object;
        if (o) this.effect("confetti", o.x + o.width / 2, o.y - 20);
      } else if (p.action.startsWith("emote:")) remote.showEmote(p.action.slice(6));
    });
    on("chat:message", ({ message }) => {
      if (message.channelId === "nearby") this.remotes.get(message.senderId)?.say(message.message);
    });
  }

  private bindStores(): void {
    this.disposers.push(
      useAvatarStore.subscribe((s, prev) => {
        if (s.appearance !== prev.appearance) this.player.setAppearance(s.appearance);
      }),
      useProfileStore.subscribe((s) => {
        this.player.setStatus(s.status, s.statusEmoji, s.door);
        this.player.plate.set({ name: s.displayName });
      }),
      useDeskStore.subscribe((s, prev) => {
        if (s.decor === prev.decor) return;
        for (const view of this.views.values()) if (view instanceof DeskObject) view.setDecor(s.decor[view.deskId] ?? []);
      }),
      useWorldStore.subscribe((s, prev) => {
        if (s.editMode !== prev.editMode) this.edit.setEnabled(s.editMode);
      }),
    );
  }

  private teardown(): void {
    this.ready = false;
    this.disposers.forEach((d) => d());
    this.disposers = [];
    this.inputCtl?.destroy();
    this.cameraCtl?.destroy();
    this.interaction?.destroy();
    this.edit?.destroy();
    worldRuntime.positions.clear();
  }
}

/** Convenience for UI code that wants to walk somewhere and then act. */
export const walkToDesk = (objectId: string) => sendWorldCommand({ type: "walk-to-object", objectId, then: "sit" });
