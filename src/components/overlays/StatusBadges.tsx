"use client";

import { Footprints, Video, WifiOff, X } from "lucide-react";
import { useMeetingStore } from "@/features/meetings/meeting-store";
import { usePeopleStore } from "@/features/people/people-store";
import { sendWorldCommand } from "@/features/world/world-bridge";
import { useWorldStore } from "@/features/world/world-store";
import { firstName } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useUiStore } from "@/stores/ui-store";

const pill = "pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-panel/95 px-2.5 text-xs font-medium shadow-float";

/** Connection state, and the chips for a meeting or for following someone. */
export function StatusBadges() {
  const connection = useAppStore((s) => s.connection);
  const detail = useAppStore((s) => s.connectionDetail);
  const joinedId = useMeetingStore((s) => s.joinedMeetingId);
  const meeting = useMeetingStore((s) => s.meetings.find((m) => m.id === joinedId));
  const dialog = useUiStore((s) => s.dialog?.type);
  const followingId = useWorldStore((s) => s.followingUserId);
  const followed = usePeopleStore((s) => (followingId ? s.users[followingId] : undefined));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(connection === "reconnecting" || connection === "disconnected" || connection === "error") && (
        <span role="status" className={`${pill} border-dnd/40 text-dnd`}>
          <WifiOff className="size-3.5" aria-hidden />
          {connection === "reconnecting" ? "Reconnecting…" : (detail ?? "Offline")}
        </span>
      )}
      {meeting && dialog !== "meeting" && (
        <button type="button" className={`${pill} border-accent/40 text-accent hover:bg-accent-soft`} onClick={() => useUiStore.getState().openDialog({ type: "meeting" })}>
          <Video className="size-3.5" aria-hidden />
          In “{meeting.title}” · Return
        </button>
      )}
      {followed && (
        <span className={pill}>
          <Footprints className="size-3.5 text-muted" aria-hidden />
          Following {firstName(followed.displayName)}
          <button type="button" aria-label="Stop following" className="-mr-1 rounded-full p-0.5 text-muted hover:bg-hover hover:text-ink" onClick={() => sendWorldCommand({ type: "stop-follow" })}>
            <X className="size-3.5" />
          </button>
        </span>
      )}
    </div>
  );
}
