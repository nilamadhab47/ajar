"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "../lib/hooks";

/** Fades content up once when it scrolls into view. With reduced motion it is simply visible. */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: {
  children: ReactNode; className?: string; delay?: number; as?: "div" | "li" | "figure" | "p";
}) {
  const ref = useRef<HTMLElement>(null);
  const shown = useInView(ref, { margin: "-8% 0px", once: true });
  return (
    // @ts-expect-error -- one ref type for a small set of block elements
    <Tag ref={ref} className={cn("reveal", className)} data-shown={shown ? "" : undefined} style={{ "--delay": `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}
