"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { OFFICE, ROW, type RowName } from "../config";
import { useInView, usePrefersReducedMotion } from "./hooks";

/** Office pixels → the percentages GSAP tweens `left` / `top` with. */
export const px = (x: number) => `${(x / OFFICE.width) * 100}%`;
export const py = (y: number) => `${(y / OFFICE.height) * 100}%`;

/** Points a sprite actor in a direction (and switches its frame speed between idle and walk). */
export function pose(el: Element | null, row: RowName): void {
  if (!el) return;
  (el as HTMLElement).style.setProperty("--row", String(ROW[row]));
  el.toggleAttribute("data-walking", row.startsWith("walk"));
}

/**
 * A looping scripted scene. The timeline is built once, plays only while the scene is on screen,
 * and is not built at all under reduced motion: the scene then shows its `data-static` end state
 * from CSS instead.
 */
export function useScene(build: (tl: gsap.core.Timeline, q: gsap.utils.SelectorFunc) => void): { ref: RefObject<HTMLDivElement | null>; still: boolean } {
  const ref = useRef<HTMLDivElement>(null);
  const still = usePrefersReducedMotion();
  const inView = useInView(ref, { margin: "-10% 0px" });
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const builder = useRef(build);
  useEffect(() => {
    builder.current = build;
  });

  useEffect(() => {
    if (still || !ref.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.4 });
      builder.current(tl, gsap.utils.selector(ref.current));
      timeline.current = tl;
    }, ref);
    return () => {
      timeline.current = null;
      ctx.revert();
    };
  }, [still]);

  useEffect(() => {
    const tl = timeline.current;
    if (!tl) return;
    if (inView) tl.play();
    else tl.pause();
  }, [inView, still]);

  return { ref, still };
}
