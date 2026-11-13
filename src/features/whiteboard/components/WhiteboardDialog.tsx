"use client";

import { Eraser, GripHorizontal, Pencil, StickyNote as StickyNoteIcon, Trash2, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { BOARD_SIZE, selectBoard, useWhiteboardStore, type StickyNote, type Stroke } from "../whiteboard-store";

const PENS = ["#282A30", "#6C63C7", "#E56A72", "#21A86A", "#E0912F"];
const BOARD_BG = "#FFFFFF";

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke): void {
  if (s.points.length < 2) return;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(s.points[0], s.points[1]);
  if (s.points.length === 2) ctx.lineTo(s.points[0] + 0.01, s.points[1]);
  for (let i = 2; i < s.points.length; i += 2) ctx.lineTo(s.points[i], s.points[i + 1]);
  ctx.stroke();
}

function Note({ boardId, note, scale }: { boardId: string; note: StickyNote; scale: () => number }) {
  const store = useWhiteboardStore.getState;
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  return (
    <div className="absolute flex w-[15%] min-w-24 flex-col rounded-sm shadow-float" style={{ left: `${(note.x / BOARD_SIZE.width) * 100}%`, top: `${(note.y / BOARD_SIZE.height) * 100}%`, background: note.color }}>
      <div
        className="flex h-5 cursor-grab touch-none items-center justify-between px-1 text-ink/45 active:cursor-grabbing"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, x: note.x, y: note.y }; }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const k = scale();
          store().updateNote(boardId, note.id, {
            x: Math.min(BOARD_SIZE.width - 110, Math.max(0, d.x + (e.clientX - d.px) / k)),
            y: Math.min(BOARD_SIZE.height - 60, Math.max(0, d.y + (e.clientY - d.py) / k)),
          });
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <GripHorizontal className="size-3.5" aria-hidden />
        <button type="button" aria-label="Delete sticky note" onPointerDown={(e) => e.stopPropagation()} onClick={() => store().removeNote(boardId, note.id)} className="rounded hover:text-ink"><X className="size-3" /></button>
      </div>
      <textarea
        aria-label="Sticky note text" value={note.text} placeholder="Write a note…" rows={3} onChange={(e) => store().updateNote(boardId, note.id, { text: e.target.value })}
        className="resize-none bg-transparent px-1.5 pb-1.5 text-xs leading-snug placeholder:text-ink/40 focus:outline-none"
      />
    </div>
  );
}

/** Working local whiteboard: freehand drawing, eraser, undo and draggable sticky notes. */
export function WhiteboardDialog({ boardId, title }: { boardId: string; title: string }) {
  const board = useWhiteboardStore(selectBoard(boardId));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef<Stroke | null>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(PENS[0]);
  const store = useWhiteboardStore.getState;
  const scale = () => (canvasRef.current ? canvasRef.current.getBoundingClientRect().width / BOARD_SIZE.width : 1);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(0, 0, BOARD_SIZE.width, BOARD_SIZE.height);
    board.strokes.forEach((s) => drawStroke(ctx, s));
  }, [board.strokes]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * BOARD_SIZE.width, ((e.clientY - rect.top) / rect.height) * BOARD_SIZE.height];
  };

  return (
    <Dialog open onClose={() => useUiStore.getState().closeDialog()} title={title} description="Local to this browser. A backend would sync strokes and notes to everyone in the room." className="w-[min(96vw,1040px)]">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-3 py-2" role="toolbar" aria-label="Whiteboard tools">
        <IconButton label="Pen" active={tool === "pen"} className="border border-line" onClick={() => setTool("pen")}><Pencil className="size-4" /></IconButton>
        <IconButton label="Eraser" active={tool === "eraser"} className="border border-line" onClick={() => setTool("eraser")}><Eraser className="size-4" /></IconButton>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {PENS.map((c) => (
          <button key={c} type="button" aria-label={`Pen colour ${c}`} aria-pressed={tool === "pen" && color === c} onClick={() => { setColor(c); setTool("pen"); }}
            className={cn("size-6 rounded-full border border-ink/15", tool === "pen" && color === c && "ring-2 ring-accent ring-offset-1")} style={{ background: c }} />
        ))}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        <Button size="sm" onClick={() => store().addNote(boardId)}><StickyNoteIcon className="size-3.5" aria-hidden />Add sticky note</Button>
        <Button size="sm" disabled={!board.strokes.length} onClick={() => store().undo(boardId)}><Undo2 className="size-3.5" aria-hidden />Undo</Button>
        <Button size="sm" className="ml-auto" disabled={!board.strokes.length && !board.notes.length} onClick={() => store().clear(boardId)}><Trash2 className="size-3.5" aria-hidden />Clear board</Button>
      </div>
      <div className="bg-app p-3">
        <div className="relative mx-auto overflow-hidden rounded-md border border-line" style={{ aspectRatio: `${BOARD_SIZE.width} / ${BOARD_SIZE.height}` }}>
          <canvas
            ref={canvasRef} width={BOARD_SIZE.width} height={BOARD_SIZE.height} role="img" aria-label="Drawing surface"
            className={cn("absolute inset-0 size-full touch-none", tool === "pen" ? "cursor-crosshair" : "cursor-cell")}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              live.current = { color: tool === "pen" ? color : BOARD_BG, width: tool === "pen" ? 3 : 22, points: point(e) };
            }}
            onPointerMove={(e) => {
              const stroke = live.current;
              const ctx = canvasRef.current?.getContext("2d");
              if (!stroke || !ctx) return;
              stroke.points.push(...point(e));
              drawStroke(ctx, { ...stroke, points: stroke.points.slice(-4) });
            }}
            onPointerUp={() => {
              if (live.current) store().addStroke(boardId, live.current);
              live.current = null;
            }}
          />
          {board.notes.map((n) => <Note key={n.id} boardId={boardId} note={n} scale={scale} />)}
        </div>
      </div>
    </Dialog>
  );
}
