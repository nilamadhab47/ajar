"use client";

import { Coffee, DoorOpen, Footprints, Headphones, Video } from "lucide-react";
import { AvatarImage } from "@/components/common/AvatarImage";
import { EmptyState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { useAllUsers } from "@/features/people/use-people";
import { sendWorldCommand } from "@/features/world/world-bridge";
import { useWorldStore } from "@/features/world/world-store";
import { cn, formatTime } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import type { Meeting, MeetingStatus } from "@/types/domain";
import { meetingActions } from "../meeting-actions";
import { useMeetingStore } from "../meeting-store";

const STATUS_LABEL: Record<MeetingStatus, { text: string; className: string }> = {
  active: { text: "Live", className: "bg-available/15 text-available" },
  waiting: { text: "Waiting to start", className: "bg-busy/20 text-[#8A5A0B]" },
  scheduled: { text: "Scheduled", className: "bg-hover text-muted" },
  ended: { text: "Ended", className: "bg-hover text-muted" },
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="px-3 pt-3">
    <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{title}</h3>
    {children}
  </section>
);

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const users = useAllUsers();
  const rooms = useWorldStore((s) => s.rooms);
  const joinedId = useMeetingStore((s) => s.joinedMeetingId);
  const room = rooms.find((r) => r.id === meeting.roomId);
  const mine = joinedId === meeting.id;
  const label = STATUS_LABEL[meeting.status];
  const people = meeting.status === "active" ? meeting.participants : meeting.invited;
  return (
    <li className={cn("rounded-lg border border-line p-2.5", mine && "border-accent bg-accent-soft/50")}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight">{meeting.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {meeting.status === "ended" ? `${formatTime(meeting.startTime)} – ${formatTime(meeting.endTime ?? meeting.startTime)}` : meeting.status === "active" ? `Started ${formatTime(meeting.startTime)}` : formatTime(meeting.startTime)}
            {room ? ` · ${room.name}` : meeting.kind !== "meeting" ? " · Coworking" : ""}
          </p>
        </div>
        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", label.className)}>{label.text}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center -space-x-1.5" aria-label={`${people.length} ${meeting.status === "active" ? "participants" : "invited"}`}>
          {people.slice(0, 5).map((id) => users[id] && <AvatarImage key={id} avatar={users[id].avatar} size={22} className="ring-2 ring-panel" />)}
          <span className="pl-3 text-[11px] text-muted">{people.length} {meeting.status === "active" ? "in the meeting" : "invited"}</span>
        </div>
        {meeting.status !== "ended" && (mine ? (
          <>
            <Button size="sm" onClick={() => useUiStore.getState().openDialog({ type: "meeting" })}>Open</Button>
            <Button size="sm" variant="danger" onClick={() => meetingActions.leave()}>Leave</Button>
          </>
        ) : (
          <>
            {room && <Button size="sm" variant="ghost" aria-label={`Walk to ${room.name}`} onClick={() => sendWorldCommand({ type: "walk-to-room", roomId: room.id })}><Footprints className="size-3.5" /></Button>}
            <Button size="sm" variant="primary" onClick={() => meetingActions.join(meeting.id)}>{meeting.status === "active" ? "Join" : "Start"}</Button>
          </>
        ))}
      </div>
    </li>
  );
}

export function MeetingsPanel() {
  const meetings = useMeetingStore((s) => s.meetings);
  const rooms = useWorldStore((s) => s.rooms);
  const occupants = useWorldStore((s) => s.roomOccupants);
  const by = (status: MeetingStatus) => meetings.filter((m) => m.status === status).sort((a, b) => a.startTime - b.startTime);
  const current = [...by("active"), ...by("waiting")];
  const upcoming = by("scheduled");
  const ended = by("ended").reverse();
  const meetingRooms = rooms.filter((r) => r.zone === "meeting");
  const busyRoomIds = new Set(meetings.filter((m) => m.status === "active" && m.roomId).map((m) => m.roomId));

  return (
    <div className="thin-scroll h-full overflow-y-auto pb-4">
      <Section title="Start something">
        <div className="grid grid-cols-2 gap-1.5">
          <Button className="h-auto flex-col items-start gap-0.5 px-2.5 py-2 text-left" onClick={() => meetingActions.start("Casual coworking", "coworking-casual", null)}>
            <span className="flex items-center gap-1.5 text-[13px]"><Coffee className="size-3.5 text-coral" aria-hidden />Casual coworking</span>
            <span className="text-[11px] font-normal text-muted">Open room, chat welcome</span>
          </Button>
          <Button className="h-auto flex-col items-start gap-0.5 px-2.5 py-2 text-left" onClick={() => meetingActions.start("Focused coworking", "coworking-focused", null)}>
            <span className="flex items-center gap-1.5 text-[13px]"><Headphones className="size-3.5 text-accent" aria-hidden />Focused coworking</span>
            <span className="text-[11px] font-normal text-muted">Quiet, sets you to Focus</span>
          </Button>
          <Button variant="primary" className="col-span-2" onClick={() => meetingActions.start("Quick meeting", "meeting", null)}><Video className="size-4" aria-hidden />Start a meeting now</Button>
        </div>
      </Section>

      <Section title="Now">
        {current.length ? <ul className="space-y-1.5">{current.map((m) => <MeetingCard key={m.id} meeting={m} />)}</ul> : <EmptyState title="No active meeting" hint="Start one above, or walk into a meeting room." />}
      </Section>
      {upcoming.length > 0 && <Section title="Upcoming today"><ul className="space-y-1.5">{upcoming.map((m) => <MeetingCard key={m.id} meeting={m} />)}</ul></Section>}

      <Section title="Meeting rooms">
        {meetingRooms.length === 0 && <EmptyState title="No meeting rooms on this floor" />}
        <ul className="space-y-1">
          {meetingRooms.map((r) => {
            const count = occupants[r.id]?.length ?? 0;
            const busy = busyRoomIds.has(r.id) || count > 0;
            return (
              <li key={r.id} className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-hover">
                <span className="size-2.5 rounded-sm" style={{ background: r.color }} aria-hidden />
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => useUiStore.getState().openDialog({ type: "room", roomId: r.id })}>
                  <span className="block truncate text-[13px] font-medium leading-tight">{r.name}</span>
                  <span className="block text-[11px] leading-tight text-muted">{busy ? `In use · ${count}/${r.capacity}` : `Available · seats ${r.capacity}`}</span>
                </button>
                <Button size="sm" onClick={() => sendWorldCommand({ type: "walk-to-room", roomId: r.id })}><DoorOpen className="size-3.5" aria-hidden />Go</Button>
              </li>
            );
          })}
        </ul>
      </Section>
      {ended.length > 0 && <Section title="Earlier"><ul className="space-y-1.5">{ended.slice(0, 4).map((m) => <MeetingCard key={m.id} meeting={m} />)}</ul></Section>}
    </div>
  );
}
