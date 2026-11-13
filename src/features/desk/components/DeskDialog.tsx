"use client";

import { Armchair, Check } from "lucide-react";
import { AvatarImage } from "@/components/common/AvatarImage";
import { StatusIndicator } from "@/components/common/StatusIndicator";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { currentUserId } from "@/features/people/people-store";
import { useUser } from "@/features/people/people-store";
import { SpriteThumb } from "@/features/world/components/SpriteThumb";
import { DESK_DECOR, MAX_DESK_DECOR } from "@/features/world/data/object-catalog";
import { sendWorldCommand } from "@/features/world/world-bridge";
import { cn } from "@/lib/utils";
import { worldApi } from "@/services/api/world-api";
import { useUiStore } from "@/stores/ui-store";
import { usePlaceStore } from "@/features/office/place-store";
import { deskOwner, deskSeatId, useDeskStore } from "../desk-store";

interface Props {
  workspaceId: string;
  deskId: string;
  label: string;
  hot: boolean;
}

/** Desk profile: who it belongs to, claiming, sitting and decorating. */
export function DeskDialog({ workspaceId, deskId, label, hot }: Props) {
  const ownerId = useDeskStore((s) => deskOwner(s, deskId));
  const myDeskId = useDeskStore((s) => s.myDeskId);
  const decor = useDeskStore((s) => s.decor[deskId]) ?? [];
  const owner = useUser(ownerId);
  const note = usePlaceStore((s) => s.places.find((place) => place.kind === "desk" && place.id === deskId)?.note ?? null);
  const mine = ownerId === currentUserId();
  const ui = useUiStore.getState;
  const close = () => ui().closeDialog();

  const claim = () => {
    if (myDeskId) void worldApi.releaseDesk(workspaceId, myDeskId);
    useDeskStore.getState().claim(deskId);
    void worldApi.claimDesk(workspaceId, deskId);
    ui().toast({ title: `${label} ${deskId} is yours`, body: "Press G any time to walk back to it.", tone: "success" });
    ui().logActivity(`You claimed desk ${deskId}`);
  };
  const release = () => {
    useDeskStore.getState().release();
    void worldApi.releaseDesk(workspaceId, deskId);
    ui().toast({ title: `You released ${label.toLowerCase()} ${deskId}` });
  };
  const sit = () => {
    sendWorldCommand({ type: "walk-to-object", objectId: deskSeatId(deskId), then: "sit" });
    close();
  };

  return (
    <Dialog open onClose={close} title={`${label} ${deskId}`} description={hot ? "Hot desk — anyone can sit here; claiming reserves it for you." : "Personal workspace"}>
      <div className="space-y-4 p-5">
        {note && <p className="text-sm text-ink">{note}</p>}
        <div className="flex items-center gap-3 rounded-lg bg-app p-3">
          {owner ? <AvatarImage avatar={owner.avatar} size={40} /> : <span className="flex size-10 items-center justify-center rounded-md border border-dashed border-ink/25 text-muted"><Armchair className="size-4" aria-hidden /></span>}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Assigned to</p>
            <p className="truncate text-sm font-semibold">{mine ? "You" : (owner?.displayName ?? "Nobody yet")}</p>
            {owner && !mine && <StatusIndicator status={owner.status} />}
          </div>
          {mine ? <Button size="sm" onClick={release}>Release</Button> : !owner && <Button size="sm" variant="primary" onClick={claim}>{myDeskId ? "Move here" : "Claim desk"}</Button>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant={mine ? "primary" : "secondary"} onClick={sit} disabled={!!owner && !mine && !hot}>
            <Armchair className="size-4" aria-hidden />
            {mine ? "Sit at my desk" : "Sit here"}
          </Button>
          {owner && !mine && <Button onClick={() => { ui().selectUser(owner.id); close(); }}>View {owner.displayName.split(" ")[0]}&apos;s profile</Button>}
        </div>
        {!!owner && !mine && !hot && <p className="-mt-2 text-xs text-muted">This desk belongs to someone else. Claim a free desk to get your own.</p>}

        <section aria-labelledby="desk-decor-heading">
          <div className="mb-1.5 flex items-baseline justify-between">
            <h3 id="desk-decor-heading" className="text-[11px] font-medium uppercase tracking-wide text-muted">Desk decorations</h3>
            <span className="text-[11px] text-muted">{decor.length}/{MAX_DESK_DECOR} placed</span>
          </div>
          {mine ? (
            <ul className="grid grid-cols-4 gap-1.5">
              {DESK_DECOR.map((item) => {
                const on = decor.includes(item.id);
                const full = !on && decor.length >= MAX_DESK_DECOR;
                return (
                  <li key={item.id}>
                    <button
                      type="button" aria-pressed={on} disabled={full} onClick={() => useDeskStore.getState().toggleDecor(deskId, item.id)}
                      className={cn("relative flex w-full flex-col items-center gap-1 rounded-lg border p-2 text-[11px] disabled:opacity-40", on ? "border-accent bg-accent-soft" : "border-line hover:bg-hover")}
                    >
                      <SpriteThumb sprite={item.id} box={32} />
                      {item.label}
                      {on && <Check className="absolute right-1 top-1 size-3 text-accent" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-md bg-app px-3 py-2 text-xs text-muted">Claim this desk to decorate it. Decorations are stored with the desk, separate from the office map.</p>
          )}
        </section>
      </div>
    </Dialog>
  );
}
