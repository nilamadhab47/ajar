import * as Phaser from "phaser";
import { STATUS_META, type DoorState, type PresenceStatus } from "@/types/domain";
import { Depth } from "../engine/DepthSortingSystem";

const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const H = 20;

/** Compact name label above a character. Rendered at constant screen size. */
export class Nameplate {
  readonly container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private emoji: Phaser.GameObjects.Text;
  private width = 0;
  private compact = false;
  private talking = false;
  /** Smoothed vertical offset used to keep overlapping plates readable. */
  lift = 0;
  targetLift = 0;

  constructor(scene: Phaser.Scene, private name: string, private status: PresenceStatus, private isLocal: boolean, private statusEmoji = "", private door: DoorState = "ask") {
    const resolution = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
    this.bg = scene.add.graphics();
    this.text = scene.add.text(0, 0, name, { fontFamily: FONT, fontSize: "11px", fontStyle: "600", color: "#FFFFFF", resolution }).setOrigin(0, 0.5);
    this.emoji = scene.add.text(0, 0, statusEmoji, { fontFamily: FONT, fontSize: "11px", resolution }).setOrigin(0, 0.5);
    this.text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.emoji.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.container = scene.add.container(0, 0, [this.bg, this.text, this.emoji]).setDepth(Depth.nameplates + (isLocal ? 1 : 0));
    this.redraw();
  }

  get screenWidth(): number {
    return this.width;
  }

  set(patch: { name?: string; status?: PresenceStatus; statusEmoji?: string; compact?: boolean; talking?: boolean; door?: DoorState }): void {
    let dirty = false;
    for (const key of ["name", "status", "statusEmoji", "compact", "talking", "door"] as const) {
      const value = patch[key];
      if (value !== undefined && this[key] !== value) {
        (this[key] as typeof value) = value;
        dirty = true;
      }
    }
    if (dirty) this.redraw();
  }

  private redraw(): void {
    const showText = !this.compact || this.isLocal;
    this.text.setText(this.name).setVisible(showText);
    this.emoji.setText(this.statusEmoji).setVisible(showText && !!this.statusEmoji);
    const textW = showText ? this.text.width + (this.statusEmoji ? this.emoji.width + 4 : 0) : 0;
    const w = Math.round(showText ? 8 + 8 + 6 + textW + 22 : 28);
    this.width = w;
    const x = -w / 2;
    const g = this.bg.clear();
    g.fillStyle(0x282a30, 0.94).fillRoundedRect(x, -H, w, H, H / 2);
    if (this.isLocal) g.lineStyle(1.5, 0x8f88e8, 1).strokeRoundedRect(x, -H, w, H, H / 2);
    if (this.talking) g.lineStyle(1.5, 0x21c879, 1).strokeRoundedRect(x - 2, -H - 2, w + 4, H + 4, H / 2 + 2);
    const color = Phaser.Display.Color.HexStringToColor(STATUS_META[this.status].color).color;
    const cx = showText ? x + 12 : x + 10;
    if (this.status === "offline") g.lineStyle(1.5, color, 1).strokeCircle(cx, -H / 2, 3.2);
    else g.fillStyle(color, 1).fillCircle(cx, -H / 2, 4);
    if (this.status === "dnd") g.fillStyle(0xffffff, 1).fillRect(cx - 2.5, -H / 2 - 0.75, 5, 1.5);
    this.drawLantern(g, x + w - 11, -H / 2);
    this.text.setPosition(x + 22, -H / 2);
    this.emoji.setPosition(x + 22 + this.text.width + 4, -H / 2);
  }

  /** Lit, half-lit, or unlit. The shape differs so the door is not told by colour alone. */
  private drawLantern(g: Phaser.GameObjects.Graphics, lx: number, ly: number): void {
    if (this.door === "open") {
      g.fillStyle(0xf4c36b, 0.35).fillCircle(lx, ly, 6);
      g.fillStyle(0xf4c36b, 1).fillCircle(lx, ly, 3.2);
      g.fillStyle(0xfff6d8, 1).fillCircle(lx, ly - 0.6, 1.3);
    } else if (this.door === "ask") {
      g.lineStyle(1.4, 0xf4c36b, 1).strokeCircle(lx, ly, 3.2);
      g.fillStyle(0xf4c36b, 1).fillCircle(lx - 1.1, ly, 1.4);
    } else {
      g.lineStyle(1.4, 0x9aa0a8, 1).strokeCircle(lx, ly, 3.2);
      g.lineBetween(lx - 2.1, ly + 2.1, lx + 2.1, ly - 2.1);
    }
  }

  place(x: number, y: number, inverseZoom: number): void {
    this.lift += (this.targetLift - this.lift) * 0.2;
    this.container.setPosition(x, y - this.lift * inverseZoom).setScale(inverseZoom);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
