import { cn } from "@/lib/utils";

export function LoadingState({ label = "Loading…", fullscreen = false }: { label?: string; fullscreen?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center justify-center gap-3 text-muted", fullscreen ? "h-dvh w-full bg-app" : "h-full w-full p-6")}>
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2.5 animate-bounce bg-accent" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorState({ title, detail, onRetry }: { title: string; detail?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {detail && <p className="max-w-sm text-xs text-muted">{detail}</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-2 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white">
          Try again
        </button>
      )}
    </div>
  );
}
