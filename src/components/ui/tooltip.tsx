"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement } from "react";

export const TooltipProvider = RadixTooltip.Provider;

export function Tooltip({ label, hint, side = "top", children }: { label: string; hint?: string; side?: "top" | "bottom" | "left" | "right"; children: ReactElement }) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content side={side} sideOffset={6} className="z-[80] max-w-56 rounded-md bg-ink px-2 py-1 text-xs text-white">
          {label}
          {hint && <span className="ml-1.5 text-white/60">{hint}</span>}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
