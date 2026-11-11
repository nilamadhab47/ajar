"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./tooltip";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong",
  secondary: "border border-line bg-panel text-ink hover:bg-hover",
  ghost: "text-ink hover:bg-hover",
  danger: "bg-dnd text-white hover:brightness-95",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "secondary", size = "md", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  /** Extra tooltip text, e.g. a shortcut or the reason it is disabled. */
  hint?: string;
  active?: boolean;
  tone?: "light" | "dark";
  side?: "top" | "bottom" | "left" | "right";
}

/** Square icon button with a mandatory accessible label and tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, hint, active, tone = "light", side = "top", className, children, ...props },
  ref,
) {
  return (
    <Tooltip label={label} hint={hint} side={side}>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "relative inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-45",
          tone === "dark"
            ? active ? "bg-white text-ink" : "text-white/85 hover:bg-white/12 hover:text-white"
            : active ? "bg-accent-soft text-accent" : "text-ink/75 hover:bg-hover hover:text-ink",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </Tooltip>
  );
});
