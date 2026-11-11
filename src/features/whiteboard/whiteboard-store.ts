import { create } from "zustand";
import { uid } from "@/lib/utils";

export interface Stroke {
  color: string;
  width: number;
  /** Flat [x0, y0, x1, y1, …] in board coordinates. */
  points: number[];
}
export interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}
export interface Board {
  strokes: Stroke[];
  notes: StickyNote[];
}

export const BOARD_SIZE = { width: 960, height: 540 };
export const NOTE_COLORS = ["#FCE9A8", "#F6C6BC", "#CFE6D2", "#CFE0EE", "#D9D4F1"];
const EMPTY: Board = { strokes: [], notes: [] };

interface WhiteboardState {
  boards: Record<string, Board>;
  addStroke: (boardId: string, stroke: Stroke) => void;
  addNote: (boardId: string) => void;
  updateNote: (boardId: string, noteId: string, patch: Partial<StickyNote>) => void;
  removeNote: (boardId: string, noteId: string) => void;
  undo: (boardId: string) => void;
  clear: (boardId: string) => void;
}

/** Local whiteboards (session memory). A backend would sync these as CRDT or op streams. */
export const useWhiteboardStore = create<WhiteboardState>((set) => {
  const edit = (boardId: string, fn: (b: Board) => Board) => set((s) => ({ boards: { ...s.boards, [boardId]: fn(s.boards[boardId] ?? EMPTY) } }));
  return {
    boards: {},
    addStroke: (boardId, stroke) => edit(boardId, (b) => ({ ...b, strokes: [...b.strokes, stroke] })),
    addNote: (boardId) =>
      edit(boardId, (b) => ({
        ...b,
        notes: [...b.notes, { id: uid("note"), text: "", color: NOTE_COLORS[b.notes.length % NOTE_COLORS.length], x: 60 + ((b.notes.length * 150) % 720), y: 50 + ((b.notes.length * 70) % 320) }],
      })),
    updateNote: (boardId, noteId, patch) => edit(boardId, (b) => ({ ...b, notes: b.notes.map((n) => (n.id === noteId ? { ...n, ...patch } : n)) })),
    removeNote: (boardId, noteId) => edit(boardId, (b) => ({ ...b, notes: b.notes.filter((n) => n.id !== noteId) })),
    undo: (boardId) => edit(boardId, (b) => ({ ...b, strokes: b.strokes.slice(0, -1) })),
    clear: (boardId) => edit(boardId, () => EMPTY),
  };
});

export const selectBoard = (boardId: string) => (s: WhiteboardState) => s.boards[boardId] ?? EMPTY;
