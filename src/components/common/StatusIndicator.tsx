import { cn } from "@/lib/utils";
import { STATUS_META, type PresenceStatus } from "@/types/domain";

export function StatusDot({ status, className }: { status: PresenceStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      title={meta.label}
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={status === "offline" ? { boxShadow: `inset 0 0 0 2px ${meta.color}` } : { background: meta.color }}
    />
  );
}

export function StatusIndicator({ status, className }: { status: PresenceStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted", className)}>
      <StatusDot status={status} />
      {STATUS_META[status].label}
    </span>
  );
}

