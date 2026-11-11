import * as Phaser from "phaser";
import { SPRITE_PAD_BOTTOM } from "@/art/furniture";
import { getObjectDef } from "../data/object-catalog";
import { Depth, sortedDepth } from "../engine/DepthSortingSystem";
import type { ObjectDef, WorldObject } from "../types/world.types";

/**
 * Phaser view of a WorldObject. All behaviour is data-driven from the object
 * catalog; this class only knows how to draw and position a sprite.
 */
export class InteractiveObject {
  readonly def: ObjectDef;
  readonly sprite: Phaser.GameObjects.Image;

  constructor(protected scene: Phaser.Scene, public object: WorldObject) {
    this.def = getObjectDef(object.type)!;
    this.sprite = scene.add.image(0, 0, "furniture", this.def.sprite).setOrigin(0, 1);
    this.sync();
  }

  get bottom(): number {
    return this.object.y + this.object.height;
  }
  /** Depth of the footprint's base line, used when seating characters. */
  get baseDepth(): number {
    return this.sprite.depth;
  }

  /** Re-reads position from the WorldObject (after edit-mode moves). */
  sync(): void {
    const o = this.object;
    const x = Math.round(o.x + (o.width - this.sprite.width) / 2);
    const y = this.bottom + SPRITE_PAD_BOTTOM + (this.def.offsetY ?? 0);
    this.sprite.setPosition(x, y);
    if (this.def.flat) this.sprite.setDepth(Depth.flat + o.y * 0.0001);
    else if (this.def.wall) this.sprite.setDepth(sortedDepth(this.bottom, -20));
    else this.sprite.setDepth(sortedDepth(this.bottom));
  }

  setHighlighted(on: boolean): void {
    if (on) this.sprite.setTint(0xdcd8ff);
    else this.sprite.clearTint();
  }

  /** Small squash-and-stretch used as generic interaction feedback. */
  nudge(): void {
    this.scene.tweens.add({ targets: this.sprite, scaleY: 0.94, duration: 70, yoyo: true, ease: "Quad.easeOut" });
  }

  contains(x: number, y: number): boolean {
    return this.sprite.getBounds().contains(x, y);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
