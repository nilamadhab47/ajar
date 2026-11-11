"use client";

import { ChevronDown, Layers, Map as MapIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { LOCAL_USER_ID } from "@/data/demo-workspace";
import { usePeopleStore } from "@/features/people/people-store";
import { useProfileStore } from "@/features/presence/presence-store";
import { useAppStore } from "@/stores/app-store";
import { useUiStore } from "@/stores/ui-store";
import { STATUS_META, effectiveDoor, type DoorState } from "@/types/domain";
import { sendWorldCommand, worldRuntime } from "../world-bridge";
import { useWorldStore } from "../world-store";

const WIDTH = 184;

/** Full ring when the door is ajar, a short arc when they want you to ask first. A closed door adds nothing. */
function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, door: DoorState): void {
  if (door === "closed") return;
  ctx.beginPath();
  ctx.strokeStyle = "#F4C36B";
  ctx.lineWidth = door === "open" ? 1.6 : 1;
  ctx.arc(x, y, 5.2, door === "open" ? 0 : -0.4, door === "open" ? Math.PI * 2 : Math.PI * 0.85);
  ctx.stroke();
}

/**
 * Mini-map. Rooms come from the store; positions and the camera rectangle are
 * read from `worldRuntime` on a timer, so the map animates without re-rendering React.
 */
export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const map = useWorldStore((s) => s.map);
  const rooms = useWorldStore((s) => s.rooms);
  const floorId = useWorldStore((s) => s.floorId);
  const floor = useAppStore((s) => s.workspace?.floors.find((f) => f.id === floorId));
  const show = useUiStore((s) => s.showMinimap);
  const worldW = map ? map.width * map.tileSize : 1;
  const worldH = map ? map.height * map.tileSize : 1;
  const height = Math.round((WIDTH * worldH) / worldW);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !show || !map) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    const k = WIDTH / worldW;
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#CFE3C4";
      ctx.fillRect(0, 0, WIDTH, height);
      for (const r of rooms) {
        ctx.fillStyle = r.color;
        ctx.fillRect(r.bounds.x * k, r.bounds.y * k, r.bounds.width * k, r.bounds.height * k);
        if (r.type !== "garden") {
          ctx.strokeStyle = "rgba(40,42,48,0.35)";
          ctx.lineWidth = 1;
          ctx.strokeRect(r.bounds.x * k + 0.5, r.bounds.y * k + 0.5, r.bounds.width * k - 1, r.bounds.height * k - 1);
        }
      }
      const { users } = usePeopleStore.getState();
      const nearby = new Set(useWorldStore.getState().nearby.map((n) => n.userId));
      for (const [id, p] of worldRuntime.positions) {
        if (id === LOCAL_USER_ID) continue;
        ctx.fillStyle = STATUS_META[users[id]?.status ?? "available"].color;
        ctx.beginPath();
        ctx.arc(p.x * k, p.y * k, nearby.has(id) ? 3.2 : 2.2, 0, Math.PI * 2);
        ctx.fill();
        if (nearby.has(id)) {
          ctx.strokeStyle = "#282A30";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        drawLantern(ctx, p.x * k, p.y * k, effectiveDoor(users[id]?.status ?? "available", users[id]?.door));
      }
      const v = worldRuntime.view;
      ctx.strokeStyle = "rgba(40,42,48,0.8)";
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.max(0, v.x * k) + 0.5, Math.max(0, v.y * k) + 0.5, Math.min(WIDTH, v.width * k) - 1, Math.min(height, v.height * k) - 1);
      const me = worldRuntime.positions.get(LOCAL_USER_ID);
      if (me) {
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(me.x * k, me.y * k, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#6C63C7";
        ctx.beginPath();
        ctx.arc(me.x * k, me.y * k, 3, 0, Math.PI * 2);
        ctx.fill();
        const profile = useProfileStore.getState();
        drawLantern(ctx, me.x * k, me.y * k, effectiveDoor(profile.status, profile.door));
      }
    };
    draw();
    const timer = setInterval(draw, 120);
    return () => clearInterval(timer);
  }, [rooms, map, show, height, worldW]);

  const panTo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    sendWorldCommand({ type: "pan-to", x: ((e.clientX - rect.left) / rect.width) * worldW, y: ((e.clientY - rect.top) / rect.height) * worldH });
  };

  return (
    <section aria-label="Mini-map" className="pointer-events-auto absolute bottom-3 right-3 z-10 hidden overflow-hidden rounded-lg border border-line bg-panel/95 shadow-float sm:block @max-[1060px]:bottom-[68px]">
      <header className="flex items-center gap-1 px-1.5 py-1">
        <Tooltip label="Switch floor">
          <button type="button" onClick={() => useUiStore.getState().openDialog({ type: "floors", via: "default" })} className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded px-1 text-left text-xs font-medium hover:bg-hover">
            <Layers className="size-3.5 shrink-0 text-muted" aria-hidden />
            <span className="truncate">{floor ? `Floor ${floor.level} · ${floor.name}` : "Floor"}</span>
          </button>
        </Tooltip>
        <Tooltip label={show ? "Hide mini-map" : "Show mini-map"}>
          <button type="button" aria-label={show ? "Hide mini-map" : "Show mini-map"} aria-expanded={show} onClick={() => useUiStore.getState().set({ showMinimap: !show })} className="flex size-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-ink">
            {show ? <ChevronDown className="size-3.5" /> : <MapIcon className="size-3.5" />}
          </button>
        </Tooltip>
      </header>
      {show && (
        <canvas
          ref={canvasRef} role="img" aria-label="Map of the current floor. Click to move the camera." style={{ width: WIDTH, height }} className="block cursor-pointer"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); panTo(e); }}
          onPointerMove={(e) => e.buttons === 1 && panTo(e)}
        />
      )}
    </section>
  );
}
