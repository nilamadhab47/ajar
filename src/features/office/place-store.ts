import { create } from "zustand";
import { areaIdForLabel, type OfficePlace, type PlaceKind } from "./places";

interface PlaceState {
  role: string | null;
  places: OfficePlace[];
  setRole: (role: string | null) => void;
  setPlaces: (places: OfficePlace[]) => void;
  reset: () => void;
}

/** Labels for the office that is open. They are not kept in this browser. */
export const usePlaceStore = create<PlaceState>((set) => ({
  role: null,
  places: [],
  setRole: (role) => set({ role }),
  setPlaces: (places) => set({ places }),
  reset: () => set({ role: null, places: [] }),
}));

/** The saved line for one place, when the owner has written one. */
export function placeNote(kind: PlaceKind, id: string): string | null {
  return usePlaceStore.getState().places.find((place) => place.kind === kind && place.id === id)?.note ?? null;
}

/** The name painted for an area, or the map's own word when the owner has not renamed it. */
export function areaLabel(defaultName: string): { name: string; note: string | null } {
  const id = areaIdForLabel(defaultName);
  const saved = id ? usePlaceStore.getState().places.find((place) => place.kind === "area" && place.id === id) : undefined;
  return { name: saved?.name || defaultName, note: saved?.note ?? null };
}
