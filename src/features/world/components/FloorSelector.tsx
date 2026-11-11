"use client";

import { Check, Layers } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useUiStore } from "@/stores/ui-store";
import { sendWorldCommand } from "../world-bridge";
import { useWorldStore } from "../world-store";

const VIA_LABEL = { elevator: "Elevator", stairs: "Stairs", default: "Floors" } as const;

/** Reusable floor switcher, opened from the elevator, the stairs or the mini-map. */
export function FloorSelector({ via }: { via: "elevator" | "stairs" | "default" }) {
  const floors = useAppStore((s) => s.workspace?.floors) ?? [];
  const current = useWorldStore((s) => s.floorId);
  const close = () => useUiStore.getState().closeDialog();
  return (
    <Dialog open onClose={close} title={VIA_LABEL[via]} description="Choose a floor. The office stays loaded; only the map changes." className="w-[min(92vw,380px)]">
      <ol className="space-y-1 p-3" reversed>
        {[...floors].sort((a, b) => b.level - a.level).map((f) => {
          const active = f.id === current;
          return (
            <li key={f.id}>
              <button
                type="button" aria-current={active} disabled={active}
                onClick={() => { sendWorldCommand({ type: "change-floor", floorId: f.id, via }); close(); }}
                className={cn("flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left", active ? "border-accent bg-accent-soft" : "border-line hover:bg-hover")}
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-app text-sm font-semibold tabular-nums">{f.level}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-tight">{f.name}</span>
                  <span className="block text-[11px] leading-tight text-muted">{f.ready ? "Fully furnished" : "Placeholder layout — walkable, not yet designed"}</span>
                </span>
                {active ? <Check className="size-4 text-accent" aria-label="Current floor" /> : <Layers className="size-4 text-muted" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ol>
    </Dialog>
  );
}
