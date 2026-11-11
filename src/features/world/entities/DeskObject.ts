import * as Phaser from "phaser";
import { sortedDepth } from "../engine/DepthSortingSystem";
import { InteractiveObject } from "./InteractiveObject";

/** Decoration slots on the desk surface, px from the footprint's top-left (sprite bottom-centre). */
const SLOTS = [
  { x: 9, y: 23 },
  { x: 70, y: 23 },
  { x: 87, y: 14 },
];

/** A desk with user-chosen decorations layered on top of the permanent furniture sprite. */
export class DeskObject extends InteractiveObject {
  private decor: Phaser.GameObjects.Image[] = [];

  get deskId(): string {
    return String(this.object.properties.deskId ?? this.object.id);
  }

  setDecor(items: string[]): void {
    this.decor.forEach((d) => d.destroy());
    this.decor = items.slice(0, SLOTS.length).map((item, i) =>
      this.scene.add
        .image(this.object.x + SLOTS[i].x, this.object.y + SLOTS[i].y, "furniture", item)
        .setOrigin(0.5, 1)
        .setDepth(sortedDepth(this.bottom, 0.5)),
    );
  }

  override sync(): void {
    super.sync();
    this.decor?.forEach((d, i) => d.setPosition(this.object.x + SLOTS[i].x, this.object.y + SLOTS[i].y).setDepth(sortedDepth(this.bottom, 0.5)));
  }

  override destroy(): void {
    this.decor.forEach((d) => d.destroy());
    super.destroy();
  }
}
