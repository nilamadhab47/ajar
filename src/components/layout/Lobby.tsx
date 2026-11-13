"use client";

import Link from "next/link";
import { useState } from "react";
import { AvatarPreview } from "@/components/common/AvatarImage";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEMO_WORKSPACE } from "@/data/demo-workspace";
import { useAvatarStore } from "@/features/avatar/avatar-store";
import { AvatarEditor } from "@/features/avatar/components/AvatarEditor";
import { useProfileStore } from "@/features/presence/presence-store";
import { BRAND } from "@/lib/config";
import { isMockMode } from "@/lib/env";
import { Logo } from "./TopNavigation";

/** Where you land after leaving the office: adjust your character, then step back in. */
export function Lobby({ workspaceId }: { workspaceId: string }) {
  const appearance = useAvatarStore((s) => s.appearance);
  const name = useProfileStore((s) => s.displayName);
  const onboarded = useProfileStore((s) => s.onboarded);
  const [draft, setDraft] = useState<typeof appearance | null>(null);
  const office = `/workspace/${encodeURIComponent(workspaceId)}/office`;

  return (
    <TooltipProvider>
      <main className="flex h-dvh items-center justify-center overflow-y-auto bg-app p-4">
        <div className="w-full max-w-sm rounded-xl border border-line bg-panel p-6 text-center shadow-float">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold"><Logo />{BRAND.product}</div>
          <div className="mx-auto mt-5 flex h-40 w-32 items-end justify-center rounded-lg bg-wood/45 pb-3">
            <AvatarPreview appearance={appearance} scale={3} />
          </div>
          <h1 className="mt-4 text-lg font-semibold">{onboarded ? `See you soon, ${name}` : "Welcome"}</h1>
          <p className="mt-1 text-sm text-muted">
            {onboarded ? "You've left" : "You're about to enter"} {DEMO_WORKSPACE.officeName}.{isMockMode ? " Colleagues here are simulated." : ""}
          </p>
          <div className="mt-5 grid gap-2">
            <Link href={office} className="inline-flex h-10 items-center justify-center rounded-md bg-accent text-sm font-medium text-white hover:bg-accent-strong">
              {onboarded ? "Re-enter the office" : "Enter the office"}
            </Link>
            <Button onClick={() => setDraft(appearance)}>Customise avatar</Button>
          </div>
        </div>
        {draft && (
          <Dialog open onClose={() => setDraft(null)} title="Customise your avatar" className="w-[min(94vw,720px)]">
            <div className="p-5">
              <AvatarEditor value={draft} onChange={setDraft} />
              <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
                <Button onClick={() => setDraft(null)}>Cancel</Button>
                <Button variant="primary" onClick={() => { useAvatarStore.getState().setAppearance(draft); setDraft(null); }}>Save avatar</Button>
              </div>
            </div>
          </Dialog>
        )}
      </main>
    </TooltipProvider>
  );
}
