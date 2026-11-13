"use client";

import { Maximize2, Mic, MicOff, Minimize2, Minus, PhoneOff, Video, VideoOff } from "lucide-react";
import { useEffect, useState } from "react";
import { AvatarImage } from "@/components/common/AvatarImage";
import { StatusDot } from "@/components/common/StatusIndicator";
import { IconButton } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useConversationStore } from "@/features/conversation/conversation-store";
import { LocalVideo } from "@/features/media/components/LocalVideo";
import { mediaActions, useMediaStore } from "@/features/media/media-controller";
import { useLocalUser, usePeopleStore } from "@/features/people/people-store";
import { cn, firstName, formatDuration } from "@/lib/utils";
import type { User } from "@/types/domain";

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className="tabular-nums">{formatDuration(now - since)}</span>;
}

/** Honest about the demo: there is no media transport, so nothing is ever shown as "connected". */
export function SimulatedTag({ className }: { className?: string }) {
  const transport = useMediaStore((s) => s.transport);
  if (transport === "connected") return <span className={cn("rounded bg-available/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-available", className)}>Live</span>;
  return (
    <Tooltip label="Simulated conversation" hint="No audio or video is transmitted. Plug a MediaAdapter into your signalling backend to make this real.">
      <span tabIndex={0} className={cn("rounded bg-[#FFF6E4] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8A5A0B]", className)}>Simulated</span>
    </Tooltip>
  );
}

function Tile({ user, joined, large }: { user: User; joined: boolean; large: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-md bg-app", large ? "flex-col justify-center p-3 text-center" : "px-2 py-1.5")}>
      <AvatarImage avatar={user.avatar} size={large ? 56 : 28} />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-[13px] font-medium leading-tight"><StatusDot status={user.status} className="size-2" />{firstName(user.displayName)}</p>
        <p className="text-[11px] leading-tight text-muted">{joined ? "Joined · no audio yet" : "Connecting…"}</p>
      </div>
    </div>
  );
}

/** Compact conversation card that never blocks the world. */
export function ConversationOverlay() {
  const conversation = useConversationStore((s) => s.active);
  const minimized = useConversationStore((s) => s.minimized);
  const expanded = useConversationStore((s) => s.expanded);
  const users = usePeopleStore((s) => s.users);
  const me = useLocalUser();
  const mic = useMediaStore((s) => s.microphone);
  const camera = useMediaStore((s) => s.camera);
  if (!conversation) return null;

  const store = useConversationStore.getState();
  const participants = conversation.invitedIds.map((id) => users[id]).filter(Boolean);
  const title = conversation.scope.type === "room" ? conversation.scope.roomName : participants.length === 1 ? `With ${firstName(participants[0].displayName)}` : `With ${participants.length + 1} people`;

  if (minimized)
    return (
      <button type="button" onClick={() => store.set({ minimized: false })} className="pointer-events-auto flex h-9 items-center gap-2 rounded-full border border-line bg-panel/95 pl-1.5 pr-3 text-xs font-medium shadow-float hover:bg-panel">
        <span className="flex -space-x-1.5">{participants.slice(0, 3).map((u) => <AvatarImage key={u.id} avatar={u.avatar} size={24} className="rounded-full ring-2 ring-panel" />)}</span>
        {title} · <Elapsed since={conversation.startedAt} />
      </button>
    );

  return (
    <section aria-label="Conversation" className={cn("pointer-events-auto rounded-lg border border-line bg-panel/95 shadow-float", expanded ? "w-[min(420px,80vw)]" : "w-72")}>
      <header className="flex items-center gap-2 px-3 pt-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight">{title}</p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted"><SimulatedTag /><Elapsed since={conversation.startedAt} /></p>
        </div>
        <IconButton label={expanded ? "Compact view" : "Expand conversation"} className="size-7" onClick={() => store.set({ expanded: !expanded })}>
          {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </IconButton>
        <IconButton label="Minimise conversation" className="size-7" onClick={() => store.set({ minimized: true })}><Minus className="size-3.5" /></IconButton>
      </header>
      <div className={cn("grid gap-1.5 p-2.5", expanded && "grid-cols-2")}>
        <div className={cn("relative flex items-center gap-2 overflow-hidden rounded-md bg-app", expanded ? "aspect-video flex-col justify-center" : "px-2 py-1.5")}>
          {camera === "on" ? (
            <LocalVideo kind="camera" className={expanded ? "absolute inset-0 size-full" : "h-12 w-20 rounded"} />
          ) : (
            <AvatarImage avatar={me.avatar} size={expanded ? 56 : 28} />
          )}
          <div className={cn("min-w-0", expanded && camera === "on" && "absolute bottom-1 left-1 rounded bg-ink/70 px-1.5 py-0.5 text-white")}>
            <p className="text-[13px] font-medium leading-tight">You</p>
            {!(expanded && camera === "on") && <p className="text-[11px] leading-tight text-muted">{mic === "on" ? "Mic on (local only)" : "Muted"}</p>}
          </div>
        </div>
        {participants.map((u) => <Tile key={u.id} user={u} joined={conversation.joinedIds.includes(u.id)} large={expanded} />)}
      </div>
      <footer className="flex items-center gap-1 border-t border-line px-2.5 py-2">
        <IconButton label={mic === "on" ? "Mute microphone" : "Unmute microphone"} hint="M" active={mic === "on"} onClick={() => void mediaActions.toggleMicrophone()}>
          {mic === "on" ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </IconButton>
        <IconButton label={camera === "on" ? "Turn camera off" : "Turn camera on"} hint="V" active={camera === "on"} onClick={() => void mediaActions.toggleCamera()}>
          {camera === "on" ? <Video className="size-4" /> : <VideoOff className="size-4" />}
        </IconButton>
        <button type="button" onClick={() => store.leave()} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-dnd px-3 text-xs font-medium text-white hover:brightness-95">
          <PhoneOff className="size-3.5" aria-hidden />
          Leave
        </button>
      </footer>
    </section>
  );
}
