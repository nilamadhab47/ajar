"use client";

import { AnimatePresence, motion } from "framer-motion";
import { DoorOpen, Footprints, Hand, MapPin, MessageSquare, Pencil, Shirt, StickyNote, UserRoundSearch, X } from "lucide-react";
import { AvatarPreview } from "@/components/common/AvatarImage";
import { StatusIndicator } from "@/components/common/StatusIndicator";
import { Button, IconButton } from "@/components/ui/button";
import { currentUserId } from "@/features/people/people-store";
import { useChatStore } from "@/features/chat/chat-store";
import { useConversationStore } from "@/features/conversation/conversation-store";
import { Lantern } from "@/features/knock/components/Lantern";
import { useKnockStore } from "@/features/knock/knock-store";
import { deskOwner, useDeskStore } from "@/features/desk/desk-store";
import { usePeopleStore, useUser } from "@/features/people/people-store";
import { useRoomName } from "@/features/people/use-people";
import { sendWorldCommand } from "@/features/world/world-bridge";
import { useWorldStore } from "@/features/world/world-store";
import { firstName } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { DOOR_META, effectiveDoor } from "@/types/domain";

/** Profile card for the selected participant (click an avatar, or pick someone in People). */
export function UserProfilePopover() {
  const id = useUiStore((s) => s.selectedUserId);
  const user = useUser(id);
  const roomName = useRoomName(id);
  const activity = usePeopleStore((s) => (id ? s.presence[id]?.currentActivity : null));
  const nearby = useWorldStore((s) => s.nearby.some((n) => n.userId === id));
  const talking = useConversationStore((s) => !!id && !!s.active?.invitedIds.includes(id));
  const deskId = useDeskStore((s) => (id === currentUserId() ? s.myDeskId : (Object.keys(s.assignments).find((d) => deskOwner(s, d) === id) ?? null)));
  const ui = useUiStore.getState;
  const isMe = id === currentUserId();

  return (
    <AnimatePresence>
      {user && (
        <motion.section
          key={user.id} aria-label={`Profile of ${user.displayName}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.14 }}
          className="pointer-events-auto w-80 rounded-lg border border-line bg-panel shadow-float"
        >
          <div className="flex items-start gap-3 p-3">
            <div className="flex h-[76px] w-14 shrink-0 items-end justify-center rounded-md bg-wood/50">
              <AvatarPreview appearance={user.avatar} scale={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[15px] font-semibold leading-tight">
                <span className="truncate">{isMe ? `${user.displayName} (you)` : user.displayName}</span>
              </p>
              {user.title && <p className="truncate text-xs text-muted">{user.title}</p>}
              <StatusIndicator status={user.status} className="mt-1" />
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <Lantern door={effectiveDoor(user.status, user.door)} />
                {DOOR_META[effectiveDoor(user.status, user.door)].label}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <MapPin className="size-3" aria-hidden />
                {roomName ?? "Somewhere in the office"}
                {deskId ? ` · Desk ${deskId}` : ""}
              </p>
              {activity && <p className="mt-0.5 truncate text-xs text-muted">{activity}</p>}
            </div>
            <IconButton label="Close profile" className="-mr-1 -mt-1 size-7" onClick={() => ui().selectUser(null)}><X className="size-3.5" /></IconButton>
          </div>
          {isMe ? (
            <div className="grid grid-cols-2 gap-1.5 border-t border-line p-2.5">
              <Button size="sm" onClick={() => ui().openDialog({ type: "avatar" })}><Shirt className="size-3.5" aria-hidden />Edit avatar</Button>
              <Button size="sm" onClick={() => ui().openDialog({ type: "profile" })}><Pencil className="size-3.5" aria-hidden />Edit profile</Button>
            </div>
          ) : (
            <div className="border-t border-line p-2.5">
              <div className="flex gap-1.5">
                <Button variant="primary" className="flex-1" onClick={() => sendWorldCommand({ type: "action", action: "wave", targetId: user.id })}>
                  <Hand className="size-4" aria-hidden />
                  Wave
                </Button>
                <IconButton label={`Message ${firstName(user.displayName)}`} className="border border-line" onClick={() => useChatStore.getState().openDirectMessage(user.id, user.displayName)}>
                  <MessageSquare className="size-4" />
                </IconButton>
                <IconButton
                  label={!nearby ? "Walk closer first" : talking ? `Already with ${firstName(user.displayName)}` : effectiveDoor(user.status, user.door) === "closed" ? `Leave ${firstName(user.displayName)} a note` : `Knock for ${firstName(user.displayName)}`}
                  hint={nearby ? DOOR_META[effectiveDoor(user.status, user.door)].meaning : "Knock range is 5 tiles"}
                  disabled={!nearby || talking}
                  className="border border-line"
                  onClick={() => useKnockStore.getState().knock(user.id)}
                >
                  {effectiveDoor(user.status, user.door) === "closed" ? <StickyNote className="size-4" /> : <DoorOpen className="size-4" />}
                </IconButton>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 whitespace-nowrap">
                <Button size="sm" onClick={() => sendWorldCommand({ type: "locate-user", userId: user.id })}><UserRoundSearch className="size-3.5" aria-hidden />Locate</Button>
                <Button size="sm" onClick={() => sendWorldCommand({ type: "walk-to-user", userId: user.id })}><Footprints className="size-3.5" aria-hidden />Walk over</Button>
                <Button size="sm" onClick={() => sendWorldCommand({ type: "walk-to-user", userId: user.id, follow: true })}>Follow</Button>
              </div>
            </div>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
