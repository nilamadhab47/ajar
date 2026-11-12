"use client";

import { create } from "zustand";

/**
 * Optional sound. Muted by default, never plays before the visitor switches it on, and the site is
 * complete without it. Files live in public/assets/audio (see README there); the shipped ones are
 * silent placeholders to be replaced with the generated audio, keeping the same names.
 */
export const SOUNDS = {
  "door-open": { loop: false, volume: 0.6 },
  "door-close": { loop: false, volume: 0.5 },
  knock: { loop: false, volume: 0.7 },
  "welcome-chime": { loop: false, volume: 0.5 },
  "note-place": { loop: false, volume: 0.6 },
  footsteps: { loop: false, volume: 0.35 },
  "office-ambience": { loop: true, volume: 0.25 },
  "night-ambience": { loop: true, volume: 0.25 },
} as const;
export type SoundName = keyof typeof SOUNDS;

const cache = new Map<SoundName, HTMLAudioElement>();
let ambience: SoundName | null = null;

function element(name: SoundName): HTMLAudioElement {
  let el = cache.get(name);
  if (!el) {
    el = new Audio(`/assets/audio/${name}.mp3`);
    el.loop = SOUNDS[name].loop;
    el.volume = SOUNDS[name].volume;
    el.preload = "auto";
    cache.set(name, el);
  }
  return el;
}

interface SoundState {
  enabled: boolean;
  toggle: () => void;
}

export const useSound = create<SoundState>((set, get) => ({
  enabled: false,
  toggle: () => {
    const enabled = !get().enabled;
    set({ enabled });
    if (enabled) {
      if (ambience) void element(ambience).play().catch(() => undefined);
    } else {
      cache.forEach((el) => el.pause());
    }
  },
}));

/** Plays a one-shot effect if sound is on. Missing or blocked audio is ignored. */
export function playSound(name: SoundName): void {
  if (!useSound.getState().enabled) return;
  const el = element(name);
  el.currentTime = 0;
  void el.play().catch(() => undefined);
}

/** Sets the looping bed (or none). It only becomes audible while sound is on. */
export function setAmbience(name: SoundName | null): void {
  if (ambience === name) return;
  if (ambience) cache.get(ambience)?.pause();
  ambience = name;
  if (name && useSound.getState().enabled) void element(name).play().catch(() => undefined);
}
