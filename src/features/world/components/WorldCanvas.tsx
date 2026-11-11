"use client";

import { useEffect, useRef } from "react";
import type * as PhaserTypes from "phaser";

/**
 * Hosts the Phaser game. The engine is imported dynamically on the client and
 * destroyed on unmount; the `cancelled` flag prevents a second instance when
 * React runs effects twice in development.
 */
export function WorldCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let game: PhaserTypes.Game | null = null;
    let observer: ResizeObserver | null = null;

    void import("../engine/game-config").then(({ createOfficeGame }) => {
      if (cancelled) return;
      game = createOfficeGame(host);
      observer = new ResizeObserver(() => game?.scale.refresh());
      observer.observe(host);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      game?.destroy(true);
      game = null;
    };
  }, []);

  return (
    <div
      ref={hostRef}
      role="application"
      aria-label="Virtual office. Use W A S D or the arrow keys to walk, E to interact with nearby objects, and double-click to walk to a spot."
      className="world-canvas absolute inset-0 overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="sr-only">
        Interactive 2D map of the office with rooms, desks and your colleagues&apos; avatars. Everything shown on the map is also
        available in the People, Chat and Meetings panels.
      </p>
    </div>
  );
}
