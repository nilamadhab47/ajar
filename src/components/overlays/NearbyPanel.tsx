"use client";

import { DoorOpen, Hand, MessageSquare, SendHorizontal, StickyNote } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AvatarImage } from "@/components/common/AvatarImage";
import { StatusDot } from "@/components/common/StatusIndicator";
import { IconButton } from "@/components/ui/button";
import { useChatStore } from "@/features/chat/chat-store";
import { useConversationStore } from "@/features/conversation/conversation-store";
import { useKnockStore } from "@/features/knock/knock-store";
import { usePeopleStore } from "@/features/people/people-store";
import { sendWorldCommand } from "@/features/world/world-bridge";
import { useWorldStore } from "@/features/world/world-store";
import { WORLD_CONFIG } from "@/lib/config";
import { cn, firstName } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { DOOR_META, effectiveDoor } from "@/types/domain";

/** People within earshot, with the quick actions that make bumping into someone useful. */
export function NearbyPanel() {
  const nearby = useWorldStore((s) => s.nearby);
  const users = usePeopleStore((s) => s.users);
  const conversation = useConversationStore((s) => s.active);
  const focusToken = useUiStore((s) => s.focusNearbyChat);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const people = nearby.filter((n) => users[n.userId]);

  useEffect(() => {
    if (focusToken) inputRef.current?.focus();
  }, [focusToken]);

  const say = () => {
    const message = text.trim();
    if (!message) return;
    sendWorldCommand({ type: "say", text: message.slice(0, WORLD_CONFIG.nearbyChat.maxLength) });
    setText("");
    inputRef.current?.blur();
  };

  return (
    <section aria-label="Nearby" className="pointer-events-auto absolute bottom-3 left-3 z-10 hidden w-60 rounded-lg border border-line bg-panel/95 shadow-float sm:block @max-[1060px]:bottom-[68px]">
      <header className="flex items-center justify-between px-3 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted">
        <span>Nearby</span>
        <span aria-live="polite">{people.length ? `${people.length} in range` : "Nobody in range"}</span>
      </header>
      {people.length > 0 && (
        <ul className="thin-scroll max-h-40 overflow-y-auto px-1.5 pt-1">
          {people.map((n) => {
            const user = users[n.userId];
            const talking = !!conversation?.invitedIds.includes(user.id);
            const door = effectiveDoor(user.status, user.door);
            const name = firstName(user.displayName);
            const where = n.close ? "Right here" : `${Math.round(n.distanceTiles)} tiles away`;
            return (
              <li key={user.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-hover">
                <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => useUiStore.getState().selectUser(user.id)}>
                  <AvatarImage avatar={user.avatar} size={24} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 truncate text-[13px] font-medium leading-tight"><StatusDot status={user.status} className="size-2" />{name}</span>
                    <span className="block truncate text-[11px] leading-tight text-muted">{talking ? "In conversation" : `${DOOR_META[door].label} · ${where}`}</span>
                  </span>
                </button>
                <IconButton label={`Wave at ${name}`} className="size-7" onClick={() => sendWorldCommand({ type: "action", action: "wave", targetId: user.id })}>
                  <Hand className="size-3.5" />
                </IconButton>
                <IconButton
                  label={talking ? `Already with ${name}` : door === "closed" ? `Leave ${name} a note` : `Knock for ${name}`}
                  hint={door === "closed" ? "Door closed" : DOOR_META[door].meaning}
                  disabled={talking}
                  className="size-7"
                  onClick={() => useKnockStore.getState().knock(user.id)}
                >
                  {door === "closed" ? <StickyNote className="size-3.5" /> : <DoorOpen className="size-3.5" />}
                </IconButton>
                <IconButton label={`Message ${firstName(user.displayName)}`} className="size-7" onClick={() => useChatStore.getState().openDirectMessage(user.id, user.displayName)}>
                  <MessageSquare className="size-3.5" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
      <form className="flex items-center gap-1 p-1.5" onSubmit={(e) => { e.preventDefault(); say(); }}>
        <label className="sr-only" htmlFor="nearby-say">Say something to people nearby</label>
        <input
          id="nearby-say" ref={inputRef} value={text} maxLength={WORLD_CONFIG.nearbyChat.maxLength} onChange={(e) => setText(e.target.value)}
          placeholder="Say something nearby… (Enter)" autoComplete="off"
          className="h-8 min-w-0 flex-1 rounded-md border border-line bg-app px-2 text-[13px] placeholder:text-muted focus:border-accent focus:bg-panel focus:outline-none"
        />
        <IconButton label="Say it" type="submit" disabled={!text.trim()} className={cn("size-8", text.trim() && "text-accent")}>
          <SendHorizontal className="size-4" />
        </IconButton>
      </form>
    </section>
  );
}
