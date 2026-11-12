"use client";

import { cn } from "@/lib/utils";
import { DOOR_META, type DoorState } from "@/types/domain";

/** Door mark. Open is a filled lamp, ask is a half lamp, closed is an unlit lamp with a slash. */
export function Lantern({ door, className }: { door: DoorState; className?: string }) {
  const label = DOOR_META[door].label;
  return (
    <span title={label} aria-label={label} className={cn("inline-flex size-3.5 shrink-0 items-center justify-center", className)}>
      {door === "open" && <span className="size-2.5 rounded-full bg-[#F4C36B] shadow-[0_0_0_2px_rgba(244,195,107,0.35)]" />}
      {door === "ask" && <span className="size-2.5 rounded-full border border-[#F4C36B] bg-[linear-gradient(90deg,#F4C36B_50%,transparent_50%)]" />}
      {door === "closed" && <span className="relative size-2.5 rounded-full border border-[#9AA0A8] before:absolute before:left-1/2 before:top-1/2 before:h-px before:w-2.5 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-45 before:bg-[#9AA0A8]" />}
    </span>
  );
}
