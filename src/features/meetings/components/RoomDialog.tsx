"use client";

import { Footprints, Lock, Users, Video } from "lucide-react";
import { useState } from "react";
import { AvatarImage } from "@/components/common/AvatarImage";
import { EmptyState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { currentUserId } from "@/features/people/people-store";
import { useConversationStore } from "@/features/conversation/conversation-store";
import { useAllUsers } from "@/features/people/use-people";
import { sendWorldCommand } from "@/features/world/world-bridge";
import { usePlaceStore } from "@/features/office/place-store";
import { useWorldStore } from "@/features/world/world-store";
import { useUiStore } from "@/stores/ui-store";
import { meetingActions } from "../meeting-actions";
import { useMeetingStore } from "../meeting-store";

export function RoomDialog({ roomId }: { roomId: string }) {
  const room = useWorldStore((s) => s.rooms.find((r) => r.id === roomId));
  const note = usePlaceStore((s) => s.places.find((place) => place.kind === "room" && place.id === roomId)?.note ?? null);
  const occupants = useWorldStore((s) => s.roomOccupants[roomId]);
  const inside = useWorldStore((s) => s.currentRoomId === roomId);
  const meeting = useMeetingStore((s) => s.meetings.find((m) => m.roomId === roomId && (m.status === "active" || m.status === "waiting")));
  const joinedId = useMeetingStore((s) => s.joinedMeetingId);
  const users = useAllUsers();
  const [title, setTitle] = useState("");
  const close = () => useUiStore.getState().closeDialog();
  if (!room) return null;

  const present = (occupants ?? []).filter((id) => users[id]);
  const others = present.filter((id) => id !== currentUserId());
  const full = room.capacity !== null && present.length >= room.capacity && !inside;

  return (
    <Dialog open onClose={close} title={room.name} description={room.zone === "meeting" ? `Meeting room · ${room.equipment.join(", ")}` : room.isPrivate ? "Private area" : "Open area"}>
      <div className="space-y-4 p-5">
        {note && <p className="text-sm text-ink">{note}</p>}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-app px-2 py-1"><Users className="size-3.5 text-muted" aria-hidden />{present.length}{room.capacity ? ` / ${room.capacity}` : ""} inside</span>
          {room.isPrivate && <span className="inline-flex items-center gap-1.5 rounded-md bg-app px-2 py-1"><Lock className="size-3.5 text-muted" aria-hidden />Private audio zone</span>}
          <span className={`inline-flex items-center rounded-md px-2 py-1 font-medium ${meeting?.status === "active" ? "bg-available/15 text-available" : "bg-app text-muted"}`}>
            {meeting?.status === "active" ? `Live: ${meeting.title}` : meeting ? `Waiting: ${meeting.title}` : "No active meeting"}
          </span>
        </div>

        <section>
          <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">In the room</h3>
          {present.length === 0 ? <EmptyState title="The room is empty" hint="Walk in to claim it." /> : (
            <ul className="grid grid-cols-2 gap-1">
              {present.map((id) => (
                <li key={id} className="flex items-center gap-2 rounded-md bg-app px-2 py-1.5">
                  <AvatarImage avatar={users[id].avatar} size={24} />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{id === currentUserId() ? "You" : users[id].displayName}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {meeting ? (
          <div className="flex flex-wrap gap-2">
            {joinedId === meeting.id ? (
              <Button variant="primary" onClick={() => useUiStore.getState().openDialog({ type: "meeting" })}><Video className="size-4" aria-hidden />Return to meeting</Button>
            ) : (
              <Button variant="primary" disabled={full} onClick={() => meetingActions.join(meeting.id)}><Video className="size-4" aria-hidden />{full ? "Room is full" : `Join “${meeting.title}”`}</Button>
            )}
            {!inside && <Button onClick={() => { sendWorldCommand({ type: "walk-to-room", roomId }); close(); }}><Footprints className="size-4" aria-hidden />Walk there</Button>}
          </div>
        ) : (
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); meetingActions.start(title.trim() || `${room.name} meeting`, "meeting", room.id); }}>
            <label className="block text-xs font-medium" htmlFor="room-meeting-title">Start a meeting here</label>
            <div className="flex gap-2">
              <input id="room-meeting-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${room.name} meeting`} maxLength={60}
                className="h-9 min-w-0 flex-1 rounded-md border border-line bg-app px-2.5 text-sm focus:border-accent focus:bg-panel focus:outline-none" />
              <Button variant="primary" type="submit"><Video className="size-4" aria-hidden />Start</Button>
            </div>
            {!inside && <Button onClick={() => { sendWorldCommand({ type: "walk-to-room", roomId }); close(); }}><Footprints className="size-4" aria-hidden />Walk there first</Button>}
          </form>
        )}

        {room.isPrivate && inside && others.length > 0 && (
          <Button className="w-full" onClick={() => { useConversationStore.getState().start(others, { type: "room", roomId, roomName: room.name }); close(); }}>
            Join the room conversation ({others.length} {others.length === 1 ? "person" : "people"})
          </Button>
        )}
      </div>
    </Dialog>
  );
}
