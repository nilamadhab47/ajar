"use client";

import { Armchair, Coffee, Headphones, PartyPopper, PenLine, Trees } from "lucide-react";
import { EmptyState } from "@/components/common/LoadingState";
import { meetingActions } from "@/features/meetings/meeting-actions";
import { sendWorldCommand } from "@/features/world/world-bridge";
import { useWorldStore } from "@/features/world/world-store";
import { walkToMyDesk } from "@/hooks/useOfficeBootstrap";
import { formatTime } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

/** Things to do in the office, plus the notification history. */
export function ActivityPanel() {
  const activity = useUiStore((s) => s.activity);
  const rooms = useWorldStore((s) => s.rooms);
  const goTo = (type: string) => {
    const room = rooms.find((r) => r.type === type);
    if (room) sendWorldCommand({ type: "walk-to-room", roomId: room.id });
    else useUiStore.getState().toast({ title: "Not on this floor", body: "Head back to the Main Office floor.", tone: "warning" });
  };
  const items = [
    { icon: Headphones, label: "Focused coworking", hint: "Quiet session, status set to Focus", run: () => meetingActions.start("Focused coworking", "coworking-focused", null) },
    { icon: Coffee, label: "Coffee break", hint: "Walk to the kitchen", run: () => goTo("kitchen") },
    { icon: PenLine, label: "Team whiteboard", hint: "Sketch and add sticky notes", run: () => useUiStore.getState().openDialog({ type: "whiteboard", boardId: "team", title: "Team whiteboard" }) },
    { icon: Armchair, label: "Back to my desk", hint: "Walk to your claimed desk", run: walkToMyDesk },
    { icon: Trees, label: "Stretch in the garden", hint: "Walk outside", run: () => goTo("garden") },
    { icon: PartyPopper, label: "Celebrate", hint: "Throw your hands up", run: () => sendWorldCommand({ type: "action", action: "celebrate" }) },
  ];
  return (
    <div className="thin-scroll h-full overflow-y-auto pb-4">
      <section className="px-3 pt-3">
        <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Activities</h3>
        <ul className="grid grid-cols-2 gap-1.5">
          {items.map((item) => (
            <li key={item.label}>
              <button type="button" onClick={item.run} className="flex h-full w-full flex-col gap-0.5 rounded-lg border border-line p-2.5 text-left hover:bg-hover">
                <item.icon className="size-4 text-accent" aria-hidden />
                <span className="text-[13px] font-medium leading-tight">{item.label}</span>
                <span className="text-[11px] leading-tight text-muted">{item.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="px-3 pt-4">
        <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Recent activity</h3>
        {activity.length === 0 ? <EmptyState title="Nothing yet" hint="Waves, meetings and office events show up here." /> : (
          <ul className="space-y-0.5">
            {activity.map((a) => (
              <li key={a.id} className="flex items-baseline gap-2 rounded-md px-1.5 py-1 text-[13px]">
                <span className="min-w-0 flex-1">{a.text}</span>
                <time className="shrink-0 text-[11px] text-muted">{formatTime(a.at)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
