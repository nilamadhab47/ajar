"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getMediaAdapter, useMediaStore } from "../media-controller";

/** Shows the local camera or screen capture. Purely local: nothing is sent anywhere. */
export function LocalVideo({ kind, className }: { kind: "camera" | "screen"; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const state = useMediaStore((s) => s[kind]);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = state === "on" ? getMediaAdapter().getLocalStream(kind) : null;
    return () => {
      video.srcObject = null;
    };
  }, [state, kind]);
  if (state !== "on") return null;
  return (
    <video
      ref={ref} autoPlay muted playsInline aria-label={kind === "camera" ? "Your camera preview" : "Your shared screen preview"}
      className={cn("bg-ink object-cover", kind === "camera" && "-scale-x-100", className)}
    />
  );
}
