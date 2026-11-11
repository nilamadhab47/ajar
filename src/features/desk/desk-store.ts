import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LOCAL_USER_ID } from "@/data/demo-workspace";
import { migrateLegacyStorage } from "@/lib/storage";

migrateLegacyStorage();
import { MAX_DESK_DECOR } from "@/features/world/data/object-catalog";

interface DeskState {
  /** Server-side assignments: deskId → userId. */
  assignments: Record<string, string>;
  /** Desk claimed by the local user (persisted for the demo). */
  myDeskId: string | null;
  /** Decorations per desk; kept apart from the map's furniture layer. */
  decor: Record<string, string[]>;
  setAssignments: (assignments: Record<string, string>) => void;
  claim: (deskId: string) => void;
  release: () => void;
  toggleDecor: (deskId: string, item: string) => void;
}

export const useDeskStore = create<DeskState>()(
  persist(
    (set) => ({
      assignments: {},
      myDeskId: null,
      decor: {},
      setAssignments: (assignments) => set({ assignments }),
      claim: (deskId) => set({ myDeskId: deskId }),
      release: () => set({ myDeskId: null }),
      toggleDecor: (deskId, item) =>
        set((s) => {
          const current = s.decor[deskId] ?? [];
          const next = current.includes(item) ? current.filter((i) => i !== item) : current.length < MAX_DESK_DECOR ? [...current, item] : current;
          return { decor: { ...s.decor, [deskId]: next } };
        }),
    }),
    { name: "ajar.desk", version: 1, partialize: (s) => ({ myDeskId: s.myDeskId, decor: s.decor }) },
  ),
);

export function deskOwner(state: Pick<DeskState, "assignments" | "myDeskId">, deskId: string): string | null {
  if (state.myDeskId === deskId) return LOCAL_USER_ID;
  return state.assignments[deskId] ?? null;
}

/** Map convention: desk "W-05" ↔ chair object "seat-w05"; booth "Q-01" ↔ "seat-q1". */
export function deskSeatId(deskId: string): string {
  const [zone, num = ""] = deskId.split("-");
  return `seat-${zone.toLowerCase()}${zone === "Q" ? String(parseInt(num, 10)) : num}`;
}
