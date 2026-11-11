/**
 * Central keyboard shortcut system. One window-level listener; everything else
 * (the Phaser scene included) asks this manager instead of listening to keys.
 */
export type ShortcutAction =
  | "moveUp" | "moveDown" | "moveLeft" | "moveRight" | "run" | "interact" | "toggleMic" | "toggleCamera"
  | "openChat" | "openPeople" | "quickPeople" | "locate" | "emoteMenu" | "nearbyChat" | "walkToDesk" | "escape";

export const DEFAULT_BINDINGS: Record<ShortcutAction, string[]> = {
  moveUp: ["KeyW", "ArrowUp"],
  moveDown: ["KeyS", "ArrowDown"],
  moveLeft: ["KeyA", "ArrowLeft"],
  moveRight: ["KeyD", "ArrowRight"],
  run: ["ShiftLeft", "ShiftRight"],
  interact: ["KeyE"],
  toggleMic: ["KeyM"],
  toggleCamera: ["KeyV"],
  openChat: ["KeyC"],
  openPeople: ["KeyP"],
  quickPeople: ["Tab"],
  locate: ["KeyL"],
  emoteMenu: ["KeyH"],
  nearbyChat: ["Enter"],
  walkToDesk: ["KeyG"],
  escape: ["Escape"],
};

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  moveUp: "Move up", moveDown: "Move down", moveLeft: "Move left", moveRight: "Move right", run: "Move faster (hold)",
  interact: "Interact", toggleMic: "Toggle microphone", toggleCamera: "Toggle camera", openChat: "Open chat",
  openPeople: "Open participants", quickPeople: "Quick participant search", locate: "Locate my character",
  emoteMenu: "Wave / emote menu", nearbyChat: "Say something nearby", walkToDesk: "Walk to my desk", escape: "Close / cancel",
};

export function keyLabel(code: string): string {
  return code.replace(/^Key|^Digit/, "").replace("Arrow", "").replace("ShiftLeft", "Shift").replace("ShiftRight", "Shift").replace("Escape", "Esc");
}

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
}
/** True when a dialog, menu or listbox owns the keyboard. */
function isUiCapturing(el: Element | null): boolean {
  if (document.querySelector('[role="dialog"][data-state="open"]')) return true;
  return !!el?.closest('[role="menu"], [role="listbox"], [role="dialog"]');
}

type Listener = () => void;

class ShortcutManager {
  private bindings: Record<ShortcutAction, string[]> = { ...DEFAULT_BINDINGS };
  private codeToAction = new Map<string, ShortcutAction>();
  private held = new Set<ShortcutAction>();
  private listeners = new Map<ShortcutAction, Set<Listener>>();
  private attached = 0;

  constructor() {
    this.index();
  }
  private index(): void {
    this.codeToAction.clear();
    (Object.keys(this.bindings) as ShortcutAction[]).forEach((a) => this.bindings[a].forEach((c) => this.codeToAction.set(c, a)));
  }

  setOverrides(overrides: Record<string, string[]>): void {
    this.bindings = { ...DEFAULT_BINDINGS, ...(overrides as Partial<Record<ShortcutAction, string[]>>) };
    this.index();
  }
  getBindings(): Record<ShortcutAction, string[]> {
    return this.bindings;
  }
  /** Whether a held action (movement, run) is currently pressed. */
  isDown(action: ShortcutAction): boolean {
    return this.held.has(action);
  }
  on(action: ShortcutAction, listener: Listener): () => void {
    if (!this.listeners.has(action)) this.listeners.set(action, new Set());
    this.listeners.get(action)!.add(listener);
    return () => this.listeners.get(action)?.delete(listener);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const action = this.codeToAction.get(e.code);
    if (!action || e.metaKey || e.ctrlKey || e.altKey) return;
    const active = document.activeElement;
    if (action === "escape") {
      if (isTypingTarget(active)) (active as HTMLElement).blur();
      if (!isUiCapturing(active)) this.listeners.get("escape")?.forEach((l) => l());
      return;
    }
    // Never steal keys from text fields, dialogs or menus.
    if (isTypingTarget(active) || isUiCapturing(active)) return;
    if (action === "run") {
      this.held.add(action);
      return;
    }
    e.preventDefault();
    if (e.repeat) return;
    if (action.startsWith("move")) this.held.add(action);
    this.listeners.get(action)?.forEach((l) => l());
  };
  private onKeyUp = (e: KeyboardEvent): void => {
    const action = this.codeToAction.get(e.code);
    if (action) this.held.delete(action);
  };
  private release = (): void => this.held.clear();

  /** Attach to the window. Reference-counted so React strict mode cannot double-bind. */
  attach(): () => void {
    if (this.attached++ === 0) {
      window.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("keyup", this.onKeyUp);
      window.addEventListener("blur", this.release);
      document.addEventListener("focusin", this.release);
    }
    return () => {
      if (--this.attached === 0) {
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        window.removeEventListener("blur", this.release);
        document.removeEventListener("focusin", this.release);
        this.held.clear();
      }
    };
  }
}

export const shortcuts = new ShortcutManager();
