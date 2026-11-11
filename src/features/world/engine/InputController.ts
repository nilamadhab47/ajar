import * as Phaser from "phaser";
import { shortcuts } from "@/lib/shortcuts";
import type { MoveInput } from "../entities/PlayerCharacter";
import { worldRuntime } from "../world-bridge";

const DRAG_THRESHOLD = 6;
const DOUBLE_CLICK_MS = 340;

export interface PointerCallbacks {
  /** Return true if the press was consumed (e.g. edit-mode drag start). */
  onPress: (worldX: number, worldY: number) => boolean;
  onDrag: (dxScreen: number, dyScreen: number, worldX: number, worldY: number, consumed: boolean) => void;
  onRelease: (consumed: boolean) => void;
  onClick: (worldX: number, worldY: number, overObject: boolean) => void;
  onDoubleClick: (worldX: number, worldY: number) => void;
  onWheel: (deltaY: number) => void;
}

/**
 * Turns raw input into intent. Keyboard state comes from the shared shortcut
 * manager; pointer gestures are classified as drag (camera), click or
 * double-click (walk) so camera panning can never trigger movement.
 */
export class InputController {
  private dragging = false;
  private consumed = false;
  private lastClickAt = 0;
  private lastClick = { x: 0, y: 0 };
  private wheelAccum = 0;

  constructor(private scene: Phaser.Scene, private cb: PointerCallbacks) {
    const input = scene.input;
    input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUpOutside, this);
    input.on(Phaser.Input.Events.POINTER_WHEEL, this.onWheel, this);
  }

  /** Movement intent this frame, from keys or the touch joystick. */
  readMovement(): MoveInput {
    let x = (shortcuts.isDown("moveRight") ? 1 : 0) - (shortcuts.isDown("moveLeft") ? 1 : 0);
    let y = (shortcuts.isDown("moveDown") ? 1 : 0) - (shortcuts.isDown("moveUp") ? 1 : 0);
    if (x === 0 && y === 0) {
      const j = worldRuntime.joystick;
      if (Math.hypot(j.x, j.y) > 0.15) {
        x = j.x;
        y = j.y;
      }
    }
    return { x, y, run: shortcuts.isDown("run") };
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    this.dragging = false;
    this.consumed = this.cb.onPress(pointer.worldX, pointer.worldY);
  }
  private onMove(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown) return;
    if (!this.dragging && Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y) < DRAG_THRESHOLD) return;
    this.dragging = true;
    this.cb.onDrag(pointer.x - pointer.prevPosition.x, pointer.y - pointer.prevPosition.y, pointer.worldX, pointer.worldY, this.consumed);
  }
  private onUp(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    const wasDragging = this.dragging;
    this.dragging = false;
    this.cb.onRelease(this.consumed);
    if (wasDragging || this.consumed) return;
    const now = performance.now();
    const isDouble = now - this.lastClickAt < DOUBLE_CLICK_MS && Phaser.Math.Distance.Between(this.lastClick.x, this.lastClick.y, pointer.x, pointer.y) < 12;
    this.lastClickAt = isDouble ? 0 : now;
    this.lastClick = { x: pointer.x, y: pointer.y };
    if (isDouble && over.length === 0) this.cb.onDoubleClick(pointer.worldX, pointer.worldY);
    else this.cb.onClick(pointer.worldX, pointer.worldY, over.length > 0);
  }
  private onUpOutside(): void {
    this.dragging = false;
    this.cb.onRelease(this.consumed);
  }
  private onWheel(_p: Phaser.Input.Pointer, _over: unknown, _dx: number, deltaY: number): void {
    // Trackpads emit many small deltas; accumulate into discrete zoom steps.
    this.wheelAccum += deltaY;
    if (Math.abs(this.wheelAccum) < 60) return;
    this.cb.onWheel(this.wheelAccum);
    this.wheelAccum = 0;
  }

  destroy(): void {
    const input = this.scene.input;
    input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUpOutside, this);
    input.off(Phaser.Input.Events.POINTER_WHEEL, this.onWheel, this);
  }
}
