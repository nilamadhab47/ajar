"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Menu = Dropdown.Root;
export const MenuTrigger = Dropdown.Trigger;

export function MenuContent({ children, align = "start", side = "bottom", className }: { children: ReactNode; align?: "start" | "center" | "end"; side?: "top" | "bottom" | "left" | "right"; className?: string }) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content align={align} side={side} sideOffset={8} className={cn("z-[70] min-w-52 rounded-lg border border-line bg-panel p-1 shadow-float", className)}>
        {children}
      </Dropdown.Content>
    </Dropdown.Portal>
  );
}

export function MenuItem({ children, onSelect, disabled, hint, className }: { children: ReactNode; onSelect?: () => void; disabled?: boolean; hint?: string; className?: string }) {
  return (
    <Dropdown.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none data-[disabled]:opacity-45 data-[highlighted]:bg-hover",
        className,
      )}
    >
      {children}
      {hint && <span className="ml-auto pl-3 text-[11px] text-muted">{hint}</span>}
    </Dropdown.Item>
  );
}

export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <Dropdown.Label className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{children}</Dropdown.Label>
);
export const MenuSeparator = () => <Dropdown.Separator className="my-1 h-px bg-line" />;
