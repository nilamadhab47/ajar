"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Prevents closing via Escape / outside click (first-run onboarding). */
  modalOnly?: boolean;
  headerExtra?: ReactNode;
}

/** App dialog. While open it owns the keyboard, so world shortcuts are suspended. */
export function Dialog({ open, onClose, title, description, children, className, modalOnly, headerExtra }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={(next) => !next && !modalOnly && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[60] bg-ink/25" />
        <RadixDialog.Content
          tabIndex={-1}
          // Focus the dialog itself rather than its first control (which would pop a tooltip open).
          onOpenAutoFocus={(e) => {
            if (!(e.currentTarget as HTMLElement).querySelector("[autofocus], [data-autofocus]")) {
              e.preventDefault();
              (e.currentTarget as HTMLElement).focus();
            } else {
              e.preventDefault();
              (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[autofocus], [data-autofocus]")?.focus();
            }
          }}
          onEscapeKeyDown={(e) => modalOnly && e.preventDefault()}
          onPointerDownOutside={(e) => modalOnly && e.preventDefault()}
          className={cn(
            "fixed left-1/2 top-1/2 z-[61] flex focus:outline-none max-h-[92dvh] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-float",
            className,
          )}
        >
          <header className="flex items-start gap-3 border-b border-line px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="truncate text-[15px] font-semibold">{title}</RadixDialog.Title>
              <RadixDialog.Description className={cn("mt-0.5 text-xs text-muted", !description && "sr-only")}>{description ?? title}</RadixDialog.Description>
            </div>
            {headerExtra}
            {!modalOnly && (
              <RadixDialog.Close aria-label="Close" className="-mr-1.5 inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-ink">
                <X className="size-4" />
              </RadixDialog.Close>
            )}
          </header>
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
