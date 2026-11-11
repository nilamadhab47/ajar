"use client";

import { Search, X } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput({ value, onChange, label, className, ...props }, ref) {
  return (
    <label className={cn("relative flex items-center", className)}>
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted" aria-hidden />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="h-8 w-full rounded-md border border-line bg-app pl-8 pr-7 text-[13px] placeholder:text-muted focus:border-accent focus:bg-panel focus:outline-none"
        {...props}
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="absolute right-1.5 rounded p-0.5 text-muted hover:text-ink">
          <X className="size-3.5" />
        </button>
      )}
    </label>
  );
});
