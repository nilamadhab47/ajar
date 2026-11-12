"use client";

import { useEffect, useState, type RefObject } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** True while the element is in (or near) the viewport. `once` latches it. */
export function useInView(ref: RefObject<Element | null>, { margin = "0px", once = false }: { margin?: string; once?: boolean } = {}): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) setInView(false);
      },
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, margin, once]);
  return inView;
}
