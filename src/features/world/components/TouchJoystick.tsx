"use client";

import { useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { worldRuntime } from "../world-bridge";

const RADIUS = 44;

/** Virtual joystick for touch devices. Writes straight into worldRuntime; no React state per frame. */
export function TouchJoystick() {
  const coarse = useMediaQuery("(pointer: coarse)");
  const knobRef = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);
  if (!coarse) return null;

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > RADIUS) {
      dx = (dx / length) * RADIUS;
      dy = (dy / length) * RADIUS;
    }
    worldRuntime.joystick.x = Math.abs(dx) < 8 ? 0 : dx / RADIUS;
    worldRuntime.joystick.y = Math.abs(dy) < 8 ? 0 : dy / RADIUS;
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const end = () => {
    worldRuntime.joystick.x = 0;
    worldRuntime.joystick.y = 0;
    if (knobRef.current) knobRef.current.style.transform = "";
    setActive(false);
  };

  return (
    <div
      role="application" aria-label="Movement joystick"
      className="pointer-events-auto absolute bottom-20 left-4 z-10 flex size-28 touch-none items-center justify-center rounded-full border border-ink/15 bg-panel/60"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setActive(true); move(e); }}
      onPointerMove={(e) => active && move(e)} onPointerUp={end} onPointerCancel={end}
    >
      <span ref={knobRef} className="size-12 rounded-full bg-ink/70 shadow-float" />
    </div>
  );
}
