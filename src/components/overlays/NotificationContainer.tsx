"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUiStore, type Toast } from "@/stores/ui-store";

const TONE = {
  info: { icon: Info, color: "text-accent" },
  success: { icon: CircleCheck, color: "text-available" },
  warning: { icon: TriangleAlert, color: "text-busy" },
  error: { icon: CircleAlert, color: "text-dnd" },
} as const;

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useUiStore((s) => s.dismissToast);
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.actions ? 9000 : 4500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.actions, dismiss]);
  const { icon: Icon, color } = TONE[toast.tone];
  return (
    <motion.li
      layout initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.16 }}
      className="pointer-events-auto flex w-[min(92vw,360px)] items-start gap-2.5 rounded-lg border border-line bg-panel p-3 shadow-float"
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", color)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-snug">{toast.title}</p>
        {toast.body && <p className="mt-0.5 line-clamp-3 text-xs text-muted">{toast.body}</p>}
        {toast.actions && (
          <div className="mt-2 flex gap-1.5">
            {toast.actions.map((a, i) => (
              <Button key={a.label} size="sm" variant={i === 0 ? "primary" : "secondary"} onClick={() => { a.run(); dismiss(toast.id); }}>{a.label}</Button>
            ))}
          </div>
        )}
      </div>
      <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)} className="-m-1 rounded p-1 text-muted hover:bg-hover hover:text-ink">
        <X className="size-3.5" />
      </button>
    </motion.li>
  );
}

export function NotificationContainer() {
  const toasts = useUiStore((s) => s.toasts);
  return (
    <ul aria-live="polite" aria-label="Notifications" className="pointer-events-none fixed left-1/2 top-14 z-[90] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => <ToastCard key={t.id} toast={t} />)}
      </AnimatePresence>
    </ul>
  );
}
