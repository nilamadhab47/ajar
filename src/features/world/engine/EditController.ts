import * as Phaser from "phaser";
import { WORLD_CONFIG } from "@/lib/config";
import { uid } from "@/lib/utils";
import { getObjectDef } from "../data/object-catalog";
import type { InteractiveObject } from "../entities/InteractiveObject";
import type { WorldObject } from "../types/world.types";
import { useWorldStore } from "../world-store";
import { Depth } from "./DepthSortingSystem";
import type { WorldContext } from "./world-context";

const T = WORLD_CONFIG.tileSize;

/**
 * Developer/demo map editing, kept apart from normal play: select, inspect,
 * drag (snapped to the grid), delete and add objects from the palette.
 * Edits live in memory; `worldApi.saveObjects` is the publish hook for a backend.
 */
export class EditController {
  private selected: InteractiveObject | null = null;
  private outline: Phaser.GameObjects.Graphics;
  private grab = { x: 0, y: 0 };
  private moved = false;
  enabled = false;

  constructor(private scene: Phaser.Scene, private ctx: WorldContext) {
    this.outline = scene.add.graphics().setDepth(Depth.overlay);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.select(null);
  }

  select(view: InteractiveObject | null): void {
    this.selected?.setHighlighted(false);
    this.selected = view;
    view?.setHighlighted(true);
    this.publish();
  }

  /** Returns true when an object was grabbed (so the drag moves it, not the camera). */
  press(x: number, y: number): boolean {
    let hit: InteractiveObject | null = null;
    for (const view of this.ctx.views.values()) if (view.contains(x, y) && (!hit || view.sprite.depth >= hit.sprite.depth)) hit = view;
    this.select(hit);
    if (!hit) return false;
    this.grab = { x: x - hit.object.x, y: y - hit.object.y };
    this.moved = false;
    return true;
  }

  drag(x: number, y: number): void {
    const view = this.selected;
    if (!view) return;
    const o = view.object;
    const nx = Phaser.Math.Clamp(Math.round((x - this.grab.x) / T) * T, 0, this.ctx.map.width * T - o.width);
    const ny = Phaser.Math.Clamp(Math.round((y - this.grab.y) / T) * T, 0, this.ctx.map.height * T - o.height);
    if (nx === o.x && ny === o.y) return;
    o.x = nx;
    o.y = ny;
    this.moved = true;
    view.sync();
    this.publish();
  }

  release(): void {
    if (this.moved) this.ctx.refreshObjects();
    this.moved = false;
  }

  add(kind: string, nearX: number, nearY: number): void {
    const def = getObjectDef(kind);
    if (!def) return;
    const object: WorldObject = {
      id: uid(kind), type: kind, name: def.label,
      x: Math.round(nearX / T) * T, y: Math.round(nearY / T) * T, width: def.fw * T, height: def.fh * T,
      layer: def.flat ? "floor" : def.interaction === "none" ? "furniture" : "interactive",
      interactionType: def.interaction, properties: {},
    };
    this.select(this.ctx.addObject(object));
    this.ctx.refreshObjects();
  }

  deleteSelected(): void {
    const view = this.selected;
    if (!view) return;
    this.select(null);
    this.ctx.removeObject(view.object.id);
    this.ctx.refreshObjects();
  }

  private publish(): void {
    const o = this.selected?.object;
    this.outline.clear();
    if (o) this.outline.lineStyle(2, 0x6c63c7, 1).strokeRect(o.x, o.y, o.width, o.height).fillStyle(0x6c63c7, 0.12).fillRect(o.x, o.y, o.width, o.height);
    useWorldStore.getState().set({ selectedObject: o ? { ...o, properties: { ...o.properties } } : null, objectCount: this.ctx.objects.length });
  }

  destroy(): void {
    this.outline.destroy();
    useWorldStore.getState().set({ selectedObject: null });
  }
}
