"use client";

import { RotateCcw, Trash2, Upload, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { OBJECT_CATALOG, PALETTE_KINDS } from "../data/object-catalog";
import { sendWorldCommand } from "../world-bridge";
import { useWorldStore } from "../world-store";
import { SpriteThumb } from "./SpriteThumb";

/** Developer/demo map editor. Deliberately separate from the normal player experience. */
export function EditPanel() {
  const selected = useWorldStore((s) => s.selectedObject);
  const count = useWorldStore((s) => s.objectCount);
  const tile = useWorldStore((s) => s.map?.tileSize ?? 32);
  const def = selected ? OBJECT_CATALOG[selected.type] : undefined;

  return (
    <section aria-label="Map editor" className="pointer-events-auto absolute bottom-[68px] left-3 top-24 z-10 flex w-60 flex-col overflow-hidden rounded-lg border border-accent/50 bg-panel shadow-float">
      <header className="flex items-center gap-2 border-b border-line bg-accent-soft px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-accent">Edit mode</p>
          <p className="text-[11px] leading-tight text-muted">{count} objects · click to select, drag to move</p>
        </div>
        <IconButton label="Exit edit mode" className="size-7" onClick={() => useWorldStore.getState().set({ editMode: false, selectedObject: null })}><X className="size-4" /></IconButton>
      </header>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-2.5">
        <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Add an object</h3>
        <ul className="grid grid-cols-4 gap-1">
          {PALETTE_KINDS.map((kind) => (
            <li key={kind}>
              <Tooltip label={OBJECT_CATALOG[kind].label}>
                <button type="button" aria-label={`Add ${OBJECT_CATALOG[kind].label}`} onClick={() => sendWorldCommand({ type: "edit-add", kind })} className="flex size-12 items-center justify-center rounded-md border border-line hover:border-accent hover:bg-accent-soft">
                  <SpriteThumb sprite={OBJECT_CATALOG[kind].sprite} box={36} />
                </button>
              </Tooltip>
            </li>
          ))}
        </ul>

        <h3 className="mb-1.5 mt-4 text-[11px] font-medium uppercase tracking-wide text-muted">Selected object</h3>
        {selected ? (
          <div className="rounded-md border border-line p-2">
            <p className="text-[13px] font-semibold">{def?.label ?? selected.type}</p>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              {[
                ["id", selected.id], ["type", selected.type], ["tile", `${Math.round(selected.x / tile)}, ${Math.round(selected.y / tile)}`],
                ["size", `${Math.round(selected.width / tile)} × ${Math.round(selected.height / tile)} tiles`], ["layer", selected.layer],
                ["interaction", selected.interactionType], ["collides", def?.collides ? "yes" : "no"],
                ...Object.entries(selected.properties).map(([k, v]) => [k, String(v)]),
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="truncate font-mono text-[11px]">{v}</dd>
                </div>
              ))}
            </dl>
            <Button size="sm" variant="danger" className="mt-2 w-full" onClick={() => sendWorldCommand({ type: "edit-delete" })}><Trash2 className="size-3.5" aria-hidden />Remove object</Button>
          </div>
        ) : (
          <p className="rounded-md bg-app px-2.5 py-2 text-xs text-muted">Nothing selected. Click any object on the map.</p>
        )}
      </div>
      <footer className="grid grid-cols-2 gap-1.5 border-t border-line p-2">
        <Button size="sm" onClick={() => sendWorldCommand({ type: "edit-reset" })}><RotateCcw className="size-3.5" aria-hidden />Revert all</Button>
        <Tooltip label="Publish needs a backend" hint="worldApi.saveObjects is wired for it.">
          <span tabIndex={0}><Button size="sm" disabled className="w-full"><Upload className="size-3.5" aria-hidden />Publish</Button></span>
        </Tooltip>
      </footer>
    </section>
  );
}
