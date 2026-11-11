import * as Phaser from "phaser";
import { FEET_Y, FRAME_H } from "@/features/avatar/data/animations";
import type { AnimationState, AvatarAction, AvatarAppearance, Direction } from "@/features/avatar/types/avatar.types";
import { WORLD_CONFIG } from "@/lib/config";
import { effectiveDoor, type DoorState, type PresenceStatus } from "@/types/domain";
import { Depth, sortedDepth } from "../engine/DepthSortingSystem";
import { animKey, ensureAvatarTexture } from "../engine/textures";
import { Nameplate } from "./Nameplate";

export interface CharacterInit {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
  appearance: AvatarAppearance;
  status: PresenceStatus;
  statusEmoji?: string;
  door?: DoorState;
  isLocal?: boolean;
}

const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

/** Visual representation shared by the local player and remote players. */
export class Character {
  readonly id: string;
  readonly isLocal: boolean;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly plate: Nameplate;
  x: number;
  y: number;
  direction: Direction;
  state: AnimationState = "idle";
  status: PresenceStatus;
  private preferredDoor: DoorState = "ask";
  /** When seated, overrides Y-sorting so the seat occludes (or is occluded) correctly. */
  seatDepth: number | null = null;
  seatId: string | null = null;
  protected shadow: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Image;
  private textureKey: string;
  private bubble: Phaser.GameObjects.Container | null = null;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;
  private actionTimer: Phaser.Time.TimerEvent | null = null;
  private currentAnim = "";
  private ringAlpha = 0;
  ringTarget = 0;

  constructor(protected scene: Phaser.Scene, init: CharacterInit) {
    this.id = init.id;
    this.isLocal = !!init.isLocal;
    this.x = init.x;
    this.y = init.y;
    this.direction = init.direction;
    this.status = init.status;
    this.preferredDoor = init.door ?? "ask";
    this.textureKey = ensureAvatarTexture(scene, init.appearance);
    this.ring = scene.add.image(this.x, this.y, "furniture", "ring").setDepth(Depth.rings).setAlpha(0);
    this.shadow = scene.add.image(this.x, this.y, "furniture", "char_shadow").setDepth(Depth.shadows);
    this.sprite = scene.add.sprite(this.x, this.y, this.textureKey, 0).setOrigin(0.5, FEET_Y / FRAME_H);
    this.plate = new Nameplate(scene, init.name, init.status, this.isLocal, init.statusEmoji, effectiveDoor(init.status, this.preferredDoor));
    if (this.isLocal) {
      this.ring.setTint(0x8f88e8);
      this.ringTarget = 0.55;
    }
    this.play("idle", this.direction);
  }

  play(state: AnimationState, direction: Direction = this.direction, timeScale = 1): void {
    this.state = state;
    this.direction = direction;
    const key = animKey(this.textureKey, state, direction);
    if (key !== this.currentAnim) {
      this.currentAnim = key;
      this.sprite.play(key);
    }
    this.sprite.anims.timeScale = timeScale;
  }

  /** Plays wave/dance/clap/celebrate for a while, then returns to idle. */
  playAction(action: AvatarAction, ms: number = WORLD_CONFIG.actionMs): void {
    this.cancelAction();
    if (this.state === "sit") return void this.showEmote(action === "wave" ? "👋" : action === "clap" ? "👏" : action === "dance" ? "🎵" : "🎉");
    this.play(action, "down");
    this.actionTimer = this.scene.time.delayedCall(ms, () => {
      this.actionTimer = null;
      if (this.state === action) this.play("idle", "down");
    });
  }
  cancelAction(): void {
    this.actionTimer?.remove();
    this.actionTimer = null;
  }
  get inAction(): boolean {
    return this.actionTimer !== null;
  }

  setAppearance(appearance: AvatarAppearance): void {
    this.textureKey = ensureAvatarTexture(this.scene, appearance);
    this.currentAnim = "";
    this.sprite.setTexture(this.textureKey, 0);
    this.play(this.state, this.direction);
  }
  setStatus(status: PresenceStatus, statusEmoji?: string, door?: DoorState): void {
    this.status = status;
    if (door) this.preferredDoor = door;
    this.plate.set({ status, statusEmoji, door: effectiveDoor(status, this.preferredDoor) });
  }

  /** Floating emoji reaction above the head. */
  showEmote(emoji: string): void {
    const text = this.scene.add
      .text(this.x, this.y - 58, emoji, { fontFamily: FONT, fontSize: "22px", resolution: 2 })
      .setOrigin(0.5, 1)
      .setDepth(Depth.nameplates + 5)
      .setScale(0.4 / this.scene.cameras.main.zoom);
    text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const scale = 1 / this.scene.cameras.main.zoom;
    this.scene.tweens.add({ targets: text, scale, duration: 180, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: text, y: text.y - 22, alpha: 0, delay: WORLD_CONFIG.emoteMs - 600, duration: 600, onComplete: () => text.destroy() });
  }

  /** Temporary speech bubble for nearby chat. */
  say(message: string, ms: number = WORLD_CONFIG.nearbyChat.bubbleMs): void {
    this.clearBubble();
    const text = this.scene.add
      .text(0, 0, message, { fontFamily: FONT, fontSize: "12px", color: "#282A30", wordWrap: { width: 180 }, resolution: 2 })
      .setOrigin(0.5, 1);
    text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const w = Math.ceil(text.width) + 18;
    const h = Math.ceil(text.height) + 12;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -h - 6, w, h, 9);
    bg.lineStyle(1, 0x282a30, 0.25).strokeRoundedRect(-w / 2, -h - 6, w, h, 9);
    bg.fillStyle(0xffffff, 1).fillTriangle(-5, -7, 5, -7, 0, 0);
    text.setPosition(0, -12);
    this.bubble = this.scene.add.container(this.x, this.y, [bg, text]).setDepth(Depth.nameplates + 4);
    this.bubbleTimer = this.scene.time.delayedCall(ms, () => this.clearBubble());
  }
  private clearBubble(): void {
    this.bubbleTimer?.remove();
    this.bubble?.destroy(true);
    this.bubble = null;
    this.bubbleTimer = null;
  }

  /** Syncs every visual to the logical position. Call once per frame. */
  render(zoom: number): void {
    const inv = 1 / zoom;
    this.sprite.setPosition(this.x, this.y).setDepth(this.seatDepth ?? sortedDepth(this.y));
    this.shadow.setPosition(this.x, this.y - 1).setVisible(this.state !== "sit");
    this.ringAlpha += (this.ringTarget - this.ringAlpha) * 0.15;
    this.ring.setPosition(this.x, this.y - 1).setAlpha(this.state === "sit" ? this.ringAlpha * 0.4 : this.ringAlpha);
    const headY = this.y - (this.state === "sit" ? 37 : 42);
    this.plate.set({ compact: zoom <= WORLD_CONFIG.camera.compactNameplateZoom });
    this.plate.place(this.x, headY, inv);
    this.bubble?.setPosition(this.x, headY - 24 * inv).setScale(inv);
  }

  setRingColor(color: number): void {
    if (!this.isLocal) this.ring.setTint(color);
  }

  destroy(): void {
    this.cancelAction();
    this.clearBubble();
    this.sprite.destroy();
    this.shadow.destroy();
    this.ring.destroy();
    this.plate.destroy();
  }
}
