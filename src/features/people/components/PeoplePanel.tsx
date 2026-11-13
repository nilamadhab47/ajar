"use client";

import { Footprints, MapPin, MessageSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarImage } from "@/components/common/AvatarImage";
import { EmptyState } from "@/components/common/LoadingState";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusDot } from "@/components/common/StatusIndicator";
import { IconButton } from "@/components/ui/button";
import { currentUserId } from "@/features/people/people-store";
import { useChatStore } from "@/features/chat/chat-store";
import { sendWorldCommand } from "@/features/world/world-bridge";
import { useWorldStore } from "@/features/world/world-store";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { Lantern } from "@/features/knock/components/Lantern";
import { DOOR_META, STATUS_META, effectiveDoor, type PresenceStatus, type User } from "@/types/domain";
import { usePeopleStore } from "../people-store";
import { useAllUsers } from "../use-people";

type Filter = "all" | "online" | "available" | "busy" | "meeting";
const FILTERS: { id: Filter; label: string; match: (s: PresenceStatus) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "online", label: "Online", match: (s) => s !== "offline" },
  { id: "available", label: "Available", match: (s) => s === "available" },
  { id: "busy", label: "Busy", match: (s) => s === "busy" || s === "focus" || s === "dnd" },
  { id: "meeting", label: "In a meeting", match: (s) => s === "in-meeting" },
];

function PersonRow({ user, location, activity }: { user: User; location: string | null; activity: string | null }) {
  const isMe = user.id === currentUserId();
  const selected = useUiStore((s) => s.selectedUserId === user.id);
  return (
    <li className={cn("group flex items-center gap-1 rounded-md px-1.5 py-1.5 hover:bg-hover", selected && "bg-accent-soft")}>
      <button type="button" aria-label={`Open profile of ${user.displayName}`} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" onClick={() => useUiStore.getState().selectUser(user.id)}>
        <span className="relative">
          <AvatarImage avatar={user.avatar} size={34} />
          <StatusDot status={user.status} className="absolute -bottom-0.5 -right-0.5 ring-2 ring-panel" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[13px] font-medium leading-tight">
            <span className="truncate">{user.displayName}{isMe ? " (you)" : ""}</span>
          </span>
          <span className="flex items-center gap-1 truncate text-xs leading-tight text-muted">
            <Lantern door={effectiveDoor(user.status, user.door)} />
            <span className="truncate">{STATUS_META[user.status].label} · {DOOR_META[effectiveDoor(user.status, user.door)].label}{location ? ` · ${location}` : ""}</span>
          </span>
          {activity && <span className="block truncate text-[11px] leading-tight text-muted/80">{activity}</span>}
        </span>
      </button>
      <div className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <IconButton label="Locate on map" className="size-7" onClick={() => sendWorldCommand({ type: "locate-user", userId: user.id })}><MapPin className="size-3.5" /></IconButton>
        {!isMe && (
          <>
            <IconButton label="Walk over" className="size-7" onClick={() => sendWorldCommand({ type: "walk-to-user", userId: user.id })}><Footprints className="size-3.5" /></IconButton>
            <IconButton label="Send message" className="size-7" onClick={() => useChatStore.getState().openDirectMessage(user.id, user.displayName)}><MessageSquare className="size-3.5" /></IconButton>
          </>
        )}
      </div>
    </li>
  );
}

export function PeoplePanel() {
  const users = useAllUsers();
  const presence = usePeopleStore((s) => s.presence);
  const locations = usePeopleStore((s) => s.locations);
  const rooms = useWorldStore((s) => s.rooms);
  const focusToken = useUiStore((s) => s.focusPeopleSearch);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusToken) searchRef.current?.focus();
  }, [focusToken]);

  const all = useMemo(() => Object.values(users).sort((a, b) => (a.id === currentUserId() ? -1 : b.id === currentUserId() ? 1 : a.displayName.localeCompare(b.displayName))), [users]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, all.filter((u) => f.match(u.status)).length])), [all]);
  const q = query.trim().toLowerCase();
  const match = FILTERS.find((f) => f.id === filter)!.match;
  const visible = all.filter((u) => match(u.status) && (!q || u.displayName.toLowerCase().includes(q) || u.title?.toLowerCase().includes(q)));
  const roomName = (id: string) => rooms.find((r) => r.id === locations[id])?.name ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 p-3 pb-2">
        <SearchInput ref={searchRef} label="Search people by name" value={query} onChange={setQuery} />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter participants">
          {FILTERS.map((f) => (
            <button
              key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
              className={cn("h-6 rounded-full border px-2 text-[11px] font-medium", filter === f.id ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:bg-hover")}
            >
              {f.label} <span className="tabular-nums opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>
      <ul className="thin-scroll min-h-0 flex-1 overflow-y-auto px-1.5 pb-3" aria-label="Participants">
        {visible.map((u) => <PersonRow key={u.id} user={u} location={roomName(u.id)} activity={presence[u.id]?.currentActivity ?? null} />)}
        {visible.length === 0 && <EmptyState title="Nobody matches" hint={q ? `No participant named “${query.trim()}” in this filter.` : "Try a different filter."} />}
      </ul>
      <p className="border-t border-line px-3 py-2 text-[11px] text-muted">Some colleagues are simulated locally and are not real people.</p>
    </div>
  );
}
