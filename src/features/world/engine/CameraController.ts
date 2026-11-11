import * as Phaser from "phaser";
import { WORLD_CONFIG } from "@/lib/config";
import { worldRuntime } from "../world-bridge";
import { useWorldStore } from "../world-store";

const { zoomLevels, followLerp, defaultZoom } = WORLD_CONFIG.camera;

/** Follow, free-pan, zoom and recentre for the main camera. */
export class CameraController {
  private cam: Phaser.Cameras.Scene2D.Camera;
  private target: Phaser.GameObjects.Sprite | null = null;
  private zoomTween: Phaser.Tweens.Tween | null = null;
  following = true;
  private targetZoom: number = defaultZoom;

  constructor(private scene: Phaser.Scene, private worldWidth: number, private worldHeight: number) {
    this.cam = scene.cameras.main;
    this.cam.setRoundPixels(true);
    // Small screens start further out so more of the office is visible.
    this.targetZoom = scene.scale.width < 760 ? 1 : defaultZoom;
    this.cam.setZoom(this.targetZoom);
    this.updateBounds();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.updateBounds, this);
    this.publish();
  }

  get zoom(): number {
    return this.cam.zoom;
  }

  /** Bounds grow when the viewport is larger than the map so small floors stay centred. */
  private updateBounds(): void {
    const viewW = this.cam.width / this.targetZoom;
    const viewH = this.cam.height / this.targetZoom;
    const padX = Math.max(64, (viewW - this.worldWidth) / 2 + 16);
    const padY = Math.max(64, (viewH - this.worldHeight) / 2 + 16);
    this.cam.setBounds(-padX, -padY, this.worldWidth + padX * 2, this.worldHeight + padY * 2);
  }

  follow(target: Phaser.GameObjects.Sprite, snap = false): void {
    this.target = target;
    this.following = true;
    this.cam.startFollow(target, true, snap ? 1 : followLerp, snap ? 1 : followLerp, 0, 20);
    if (snap) this.scene.time.delayedCall(0, () => this.cam.setLerp(followLerp, followLerp));
    this.publish();
  }

  /** Drag-panning: detaches from the player until recentre or keyboard movement. */
  panBy(dxScreen: number, dyScreen: number): void {
    if (this.following) {
      this.cam.stopFollow();
      this.following = false;
      this.publish();
    }
    this.cam.scrollX -= dxScreen / this.cam.zoom;
    this.cam.scrollY -= dyScreen / this.cam.zoom;
  }

  panTo(x: number, y: number): void {
    this.cam.stopFollow();
    this.following = false;
    this.cam.pan(x, y, 450, "Sine.easeInOut", true);
    this.publish();
  }

  recenter(): void {
    if (!this.target || this.following) return;
    const target = this.target;
    this.following = true;
    this.publish();
    this.cam.pan(target.x, target.y - 20, 350, "Sine.easeInOut", true, (_cam, progress) => {
      if (progress === 1 && this.following) this.cam.startFollow(target, true, followLerp, followLerp, 0, 20);
    });
  }

  setZoom(zoom: number): void {
    const clamped = Phaser.Math.Clamp(zoom, zoomLevels[0], zoomLevels[zoomLevels.length - 1]);
    if (clamped === this.targetZoom) return;
    this.targetZoom = clamped;
    this.updateBounds();
    this.zoomTween?.stop();
    this.zoomTween = this.scene.tweens.add({ targets: this.cam, zoom: clamped, duration: 180, ease: "Sine.easeOut" });
    this.publish();
  }
  zoomStep(direction: 1 | -1): void {
    const levels: readonly number[] = zoomLevels;
    const i = levels.indexOf(this.targetZoom);
    const from = i >= 0 ? i : levels.findIndex((l) => l >= this.targetZoom);
    this.setZoom(levels[Phaser.Math.Clamp(from + direction, 0, levels.length - 1)]);
  }
  resetZoom(): void {
    this.setZoom(defaultZoom);
  }

  /** Publishes the visible world rectangle for the mini-map. */
  update(): void {
    const v = this.cam.worldView;
    worldRuntime.view.x = v.x;
    worldRuntime.view.y = v.y;
    worldRuntime.view.width = v.width;
    worldRuntime.view.height = v.height;
  }

  private publish(): void {
    useWorldStore.getState().set({ camera: { zoom: this.targetZoom, following: this.following } });
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.updateBounds, this);
    this.zoomTween?.stop();
  }
}
