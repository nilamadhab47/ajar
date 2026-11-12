"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";
import { AvatarPreview } from "@/components/common/AvatarImage";
import { DEFAULT_APPEARANCE, randomAppearance } from "@/features/avatar/data/avatar-options";
import type { AvatarAppearance } from "@/features/avatar/types/avatar.types";
import { track } from "../lib/analytics";

/** The app's real avatar compositor, running on the landing page. Loaded lazily, client-only. */
export default function AvatarShuffle() {
  const [looks, setLooks] = useState<AvatarAppearance[]>([DEFAULT_APPEARANCE]);
  const current = looks[looks.length - 1];
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="avatar-badge">
        <AvatarPreview appearance={current} scale={5} />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button" className="btn btn-ink"
          onClick={() => {
            setLooks((list) => [...list.slice(-11), randomAppearance()]);
            track("avatar_shuffle");
          }}
        >
          <Shuffle className="size-4" aria-hidden="true" /> Try another look
        </button>
        <button type="button" className="btn btn-ink" disabled={looks.length < 2} onClick={() => setLooks((list) => list.slice(0, -1))}>
          Back
        </button>
      </div>
      <p className="max-w-[18rem] text-center text-[0.84rem] text-evening">
        Drawn live by the avatar builder in the app: skin, hair, clothes, glasses, hats and more.
      </p>
    </div>
  );
}
