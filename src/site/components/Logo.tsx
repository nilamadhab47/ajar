import { cn } from "@/lib/utils";

/** The Ajar mark: a door left slightly open, lamp light in the gap. Drawn as vector, no raster. */
export function DoorMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ajar-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7d74d6" />
          <stop offset="1" stopColor="#5a50b4" />
        </linearGradient>
        <linearGradient id="ajar-mark-light" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffe3a8" />
          <stop offset="1" stopColor="#f4c36b" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#ajar-mark-bg)" />
      {/* light spilling onto the floor */}
      <path d="M25 39 L36 39 L42 45 L20 45 Z" fill="#f4c36b" opacity="0.45" />
      {/* doorway */}
      <rect x="14" y="9" width="22" height="30" rx="2" fill="#3c337f" />
      <rect x="16.5" y="11.5" width="17" height="27.5" fill="url(#ajar-mark-light)" />
      {/* door leaf, swung inwards on its left hinge */}
      <path d="M16.5 11.5 L28 14 L28 39 L16.5 39 Z" fill="#8a81e0" />
      <path d="M18.6 15.4 L25.9 17 L25.9 26 L18.6 25.2 Z" fill="#7067cf" />
      <circle cx="25.6" cy="28.6" r="1.25" fill="#f4c36b" />
    </svg>
  );
}

export function Logo({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <DoorMark className="size-8 shrink-0" />
      <span className={cn("relative font-site text-[1.45rem] font-bold leading-none tracking-[-0.03em]", tone === "light" ? "text-ivory" : "text-aubergine")}>
        ajar
        <svg viewBox="0 0 12 12" className="absolute -right-3 -top-1.5 size-3 text-lamp" aria-hidden="true">
          <path d="M2 4.5 L3.4 7 M6.2 1.2 L6.4 4.4 M10.6 4 L8.6 6.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" />
        </svg>
      </span>
    </span>
  );
}
