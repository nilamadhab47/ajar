"use client";

import { Mic, MicOff, MonitorUp, PhoneOff, SendHorizontal, UserPlus, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AvatarImage } from "@/components/common/AvatarImage";
import { EmptyState } from "@/components/common/LoadingState";
import { SimulatedTag } from "@/components/overlays/ConversationOverlay";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/menu";
import { LOCAL_USER_ID } from "@/data/demo-workspace";
import { useChatStore } from "@/features/chat/chat-store";
import { LocalVideo } from "@/features/media/components/LocalVideo";
import { mediaActions, useMediaStore } from "@/features/media/media-controller";
import { useAllUsers } from "@/features/people/use-people";
import { useWorldStore } from "@/features/world/world-store";
import { cn, firstName, formatDuration, formatTime } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import type { User } from "@/types/domain";
import { meetingActions } from "../meeting-actions";
import { useMeetingStore } from "../meeting-store";

const KIND_LABEL = { meeting: "Meeting", "coworking-casual": "Casual coworking", "coworking-focused": "Focused coworking" } as const;

function Duration({ since }: { since: number }) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className="tabular-nums" aria-label="Meeting duration">{formatDuration(now - since)}</span>;
}

function ParticipantTile({ user, self }: { user: User; self: boolean }) {
  const camera = useMediaStore((s) => s.camera);
  const mic = useMediaStore((s) => s.microphone);
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md bg-ink/90">
      {self && camera === "on" ? <LocalVideo kind="camera" className="absolute inset-0 size-full" /> : <AvatarImage avatar={user.avatar} size={48} />}
      <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-ink/75 px-1.5 py-0.5 text-[11px] text-white">
        {self ? "You" : firstName(user.displayName)}
        {self && mic !== "on" && <MicOff className="size-3" aria-label="Muted" />}
      </span>
      {!self && <span className="absolute right-1 top-1 rounded bg-ink/75 px-1 py-0.5 text-[10px] text-white/75">No media in demo</span>}
    </div>
  );
}

function MeetingChat({ channelId }: { channelId: string }) {
  const messages = useChatStore((s) => s.messages[channelId]);
  const users = useAllUsers();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages?.length]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul ref={listRef} className="thin-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-3" aria-label="Meeting chat">
        {!messages?.length && <EmptyState title="No messages yet" hint="Meeting chat stays with this meeting." />}
        {messages?.map((m) => (
          <li key={m.id} className="text-[13px]">
            <span className="font-semibold">{m.senderId === LOCAL_USER_ID ? "You" : (users[m.senderId]?.displayName ?? "Guest")}</span>{" "}
            <span className="text-[11px] text-muted">{formatTime(m.timestamp)}</span>
            <p className="whitespace-pre-wrap break-words leading-snug">{m.message}</p>
          </li>
        ))}
      </ul>
      <form className="flex gap-1 border-t border-line p-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { useChatStore.getState().send(text, { channelId }); setText(""); } }}>
        <label className="sr-only" htmlFor="meeting-chat-input">Message the meeting</label>
        <input id="meeting-chat-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the meeting" autoComplete="off"
          className="h-8 min-w-0 flex-1 rounded-md border border-line bg-app px-2 text-[13px] focus:border-accent focus:bg-panel focus:outline-none" />
        <IconButton label="Send" type="submit" disabled={!text.trim()} className="size-8"><SendHorizontal className="size-4" /></IconButton>
      </form>
    </div>
  );
}

/** Dedicated meeting view. Closing it keeps you in the meeting (a chip on the map brings it back). */
export function MeetingView() {
  const joinedId = useMeetingStore((s) => s.joinedMeetingId);
  const meeting = useMeetingStore((s) => s.meetings.find((m) => m.id === joinedId));
  const room = useWorldStore((s) => s.rooms.find((r) => r.id === meeting?.roomId));
  const users = useAllUsers();
  const media = useMediaStore();
  const [tab, setTab] = useState<"people" | "chat">("people");
  const ui = useUiStore.getState;
  const screenSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  if (!meeting)
    return (
      <Dialog open onClose={() => ui().closeDialog()} title="No active meeting">
        <EmptyState title="You're not in a meeting" hint="Start or join one from the Meetings panel." />
      </Dialog>
    );

  const participants = meeting.participants.map((id) => users[id]).filter(Boolean);
  const invitable = Object.values(users).filter((u) => u.id !== LOCAL_USER_ID && !meeting.participants.includes(u.id) && !meeting.invited.includes(u.id));

  return (
    <Dialog
      open onClose={() => ui().closeDialog()} title={meeting.title} className="h-[min(88dvh,640px)] w-[min(96vw,980px)]"
      description={`${KIND_LABEL[meeting.kind]}${room ? ` · ${room.name}` : ""} · ${participants.length} ${participants.length === 1 ? "participant" : "participants"}`}
      headerExtra={<span className="flex items-center gap-2 text-xs text-muted"><SimulatedTag /><Duration since={meeting.startTime} /></span>}
    >
      <div className="flex h-full min-h-0 flex-col md:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-3">
          <div className="relative flex min-h-40 flex-1 items-center justify-center overflow-hidden rounded-lg bg-ink">
            {media.screen === "on" ? (
              <>
                <LocalVideo kind="screen" className="absolute inset-0 size-full object-contain" />
                <span className="absolute left-2 top-2 rounded bg-ink/75 px-2 py-1 text-[11px] text-white">Your screen · local preview only. Distribution to others needs the media backend.</span>
              </>
            ) : (
              <div className="px-6 text-center text-white/80">
                <MonitorUp className="mx-auto size-7 text-white/50" aria-hidden />
                <p className="mt-2 text-sm font-medium">Nobody is sharing a screen</p>
                <p className="mt-0.5 text-xs text-white/55">{screenSupported ? "Share yours to preview it here." : "Screen capture isn't supported in this browser."}</p>
              </div>
            )}
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {participants.map((u) => <ParticipantTile key={u.id} user={u} self={u.id === LOCAL_USER_ID} />)}
          </div>
          <div className="flex shrink-0 items-center justify-center gap-1.5">
            <IconButton label={media.microphone === "on" ? "Mute microphone" : "Unmute microphone"} active={media.microphone === "on"} className="border border-line" onClick={() => void mediaActions.toggleMicrophone()}>
              {media.microphone === "on" ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            </IconButton>
            <IconButton label={media.camera === "on" ? "Turn camera off" : "Turn camera on"} active={media.camera === "on"} className="border border-line" onClick={() => void mediaActions.toggleCamera()}>
              {media.camera === "on" ? <Video className="size-4" /> : <VideoOff className="size-4" />}
            </IconButton>
            <IconButton label={media.screen === "on" ? "Stop sharing" : "Share screen"} hint={screenSupported ? "Local preview" : "Not supported here"} disabled={!screenSupported} active={media.screen === "on"} className="border border-line" onClick={() => void mediaActions.toggleScreenShare()}>
              <MonitorUp className="size-4" />
            </IconButton>
            <Menu>
              <MenuTrigger asChild><Button><UserPlus className="size-4" aria-hidden />Invite</Button></MenuTrigger>
              <MenuContent side="top" className="thin-scroll max-h-64 overflow-y-auto">
                <MenuLabel>Invite participants</MenuLabel>
                {invitable.length === 0 && <MenuItem disabled>Everyone is already invited</MenuItem>}
                {invitable.map((u) => (
                  <MenuItem key={u.id} onSelect={() => { useMeetingStore.getState().invite(meeting.id, [u.id]); ui().toast({ title: `Invited ${firstName(u.displayName)}`, body: "Demo participants don't accept invitations — a backend would notify them." }); }}>
                    <AvatarImage avatar={u.avatar} size={20} />{u.displayName}
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>
            <Button variant="danger" onClick={() => meetingActions.leave()}><PhoneOff className="size-4" aria-hidden />Leave</Button>
          </div>
        </div>
        <aside className="flex min-h-48 w-full shrink-0 flex-col border-t border-line md:w-72 md:border-l md:border-t-0">
          <div role="tablist" className="flex gap-1 border-b border-line p-1.5">
            {(["people", "chat"] as const).map((t) => (
              <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("h-7 flex-1 rounded-md text-xs font-medium", tab === t ? "bg-accent-soft text-accent" : "text-muted hover:bg-hover")}>
                {t === "people" ? `Participants (${participants.length})` : "Meeting chat"}
              </button>
            ))}
          </div>
          {tab === "people" ? (
            <ul className="thin-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
              {participants.map((u) => (
                <li key={u.id} className="flex items-center gap-2 rounded-md px-1.5 py-1">
                  <AvatarImage avatar={u.avatar} size={26} />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{u.id === LOCAL_USER_ID ? `${u.displayName} (you)` : u.displayName}</span>
                  {u.id === meeting.hostId && <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Host</span>}
                </li>
              ))}
              {meeting.invited.filter((id) => !meeting.participants.includes(id) && users[id]).map((id) => (
                <li key={id} className="flex items-center gap-2 rounded-md px-1.5 py-1 opacity-60">
                  <AvatarImage avatar={users[id].avatar} size={26} />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{users[id].displayName}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Invited</span>
                </li>
              ))}
            </ul>
          ) : (
            <MeetingChat channelId={`meeting-${meeting.id}`} />
          )}
        </aside>
      </div>
    </Dialog>
  );
}
