import * as Phaser from "phaser";
import { OfficeScene } from "./OfficeScene";

/**
 * Creates the Phaser game. Only ever imported dynamically from WorldCanvas, so
 * Phaser never loads during server rendering.
 */
export function createOfficeGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#EDEAE4",
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    banner: false,
    disableContextMenu: true,
    // Keyboard is owned by the app's shortcut manager, not Phaser.
    input: { keyboard: false, gamepad: false, mouse: { preventDefaultWheel: true } },
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || 800, height: parent.clientHeight || 600, autoRound: true },
    // Real frame deltas: movement stays time-accurate on slow frames and unfocused tabs.
    fps: { target: 60, smoothStep: false },
    scene: [OfficeScene],
  });
}
