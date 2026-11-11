import * as Phaser from "phaser";
import { WORLD_CONFIG } from "@/lib/config";
import type { InteractiveObject } from "../entities/InteractiveObject";
import { useWorldStore, type InteractionPrompt } from "../world-store";
import { Depth } from "./DepthSortingSystem";
import { INTERACTIONS } from "./interaction-handlers";
import type { WorldContext } from "./world-context";

/** Finds the interactable in range, shows its prompt and runs its handler on demand. */
export class InteractionSystem {
  private current: InteractiveObject | null = null;
  private marker: Phaser.GameObjects.Image;
  private signature = "";

  constructor(private scene: Phaser.Scene, private ctx: WorldContext) {
    this.marker = scene.add.image(0, 0, "furniture", "marker").setDepth(Depth.overlay).setVisible(false);
  }

  /** Call ~10x per second. */
  scan(): void {
    const { player } = this.ctx;
    let prompt: InteractionPrompt | null = null;
    let best: InteractiveObject | null = null;

    if (player.seat) {
      prompt = { objectId: player.seat.objectId, title: "Seated", action: "Stand up" };
    } else if (!useWorldStore.getState().editMode) {
      const px = player.x;
      const py = player.y - 4;
      let bestD = Infinity;
      for (const view of this.ctx.views.values()) {
        const { def, object: o } = view;
        if (def.interaction === "none") continue;
        const dx = Math.max(o.x - px, 0, px - (o.x + o.width));
        const dy = Math.max(o.y - py, 0, py - (o.y + o.height));
        const d = Math.hypot(dx, dy);
        if (d > (def.range ?? WORLD_CONFIG.interaction.defaultRangeTiles) * WORLD_CONFIG.tileSize || d >= bestD) continue;
        if (def.interaction === "seat" && !this.hasFreeSeat(o.id)) continue;
        best = view;
        bestD = d;
      }
      if (best) {
        const handler = INTERACTIONS[best.def.interaction as keyof typeof INTERACTIONS];
        prompt = {
          objectId: best.object.id,
          title: best.def.label,
          action: best.def.prompt ?? "Interact",
          ...handler.describe?.(best.object, this.ctx),
        };
      }
    }

    this.current = best;
    const signature = prompt ? `${prompt.objectId}|${prompt.title}|${prompt.detail}|${prompt.action}` : "";
    if (signature !== this.signature) {
      this.signature = signature;
      useWorldStore.getState().set({ prompt });
    }
  }

  private hasFreeSeat(objectId: string): boolean {
    for (const seat of this.ctx.seats.values()) if (seat.objectId === objectId && !seat.occupantId) return true;
    return false;
  }

  /** Animate the marker above the current target. Call every frame. */
  render(time: number): void {
    const view = this.current;
    this.marker.setVisible(!!view);
    if (!view) return;
    const top = view.sprite.getTopCenter();
    this.marker.setPosition(top.x ?? 0, (top.y ?? 0) - 8 + Math.sin(time / 180) * 2);
  }

  trigger(): void {
    if (this.ctx.player.seat) return this.ctx.standUp();
    this.scan();
    const view = this.current;
    if (!view) return;
    INTERACTIONS[view.def.interaction as keyof typeof INTERACTIONS]?.run(view.object, this.ctx);
  }

  destroy(): void {
    this.marker.destroy();
    useWorldStore.getState().set({ prompt: null });
  }
}
