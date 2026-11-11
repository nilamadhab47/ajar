import { create } from "zustand";
import type { ConnectionState } from "@/services/realtime/realtime-adapter";
import type { Workspace } from "@/types/domain";

interface AppState {
  workspace: Workspace | null;
  connection: ConnectionState;
  connectionDetail: string | null;
  set: (patch: Partial<AppState>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  workspace: null,
  connection: "idle",
  connectionDetail: null,
  set: (patch) => set(patch),
}));
