import { create } from "zustand";
import { persist } from "zustand/middleware";
import { migrateLegacyStorage } from "@/lib/storage";
import { DEFAULT_APPEARANCE } from "./data/avatar-options";

migrateLegacyStorage();
import type { AvatarAppearance } from "./types/avatar.types";

interface AvatarState {
  appearance: AvatarAppearance;
  /** False until the user has saved an avatar at least once. */
  customised: boolean;
  setAppearance: (appearance: AvatarAppearance) => void;
  reset: () => void;
}

export const useAvatarStore = create<AvatarState>()(
  persist(
    (set) => ({
      appearance: DEFAULT_APPEARANCE,
      customised: false,
      setAppearance: (appearance) => set({ appearance, customised: true }),
      reset: () => set({ appearance: DEFAULT_APPEARANCE }),
    }),
    { name: "ajar.avatar", version: 1 },
  ),
);
