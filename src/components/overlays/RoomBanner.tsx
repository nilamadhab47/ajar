"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lock, MapPin, VolumeX } from "lucide-react";
import { AvatarImage } from "@/components/common/AvatarImage";
import { Button } from "@/components/ui/button";
import { LOCAL_USER_ID } from "@/data/demo-workspace";
import { useConversationStore } from "@/features/conversation/conversation-store";
import { useAllUsers } from "@/features/people/use-people";
import { useWorldStore } from "@/features/world/world-store";
import { useUiStore } from "@/stores/ui-store";

/** Announces the area the player is standing in and, for private zones, who shares it. */
export function RoomBanner() {
  const room = useWorldStore((s) => s.rooms.find((r) => r.id === s.currentRoomId));
  const occupants = useWorldStore((s) => (s.currentRoomId ? s.roomOccupants[s.currentRoomId] : undefined));
  const conversation = useConversationStore((s) => s.active);
  const users = useAllUsers();
  const others = (occupants ?? []).filter((id) => id !== LOCAL_USER_ID && users[id]);
  const inRoomConversation = conversation?.scope.type === "room" && conversation.scope.roomId === room?.id;

  return (
    <AnimatePresence mode="wait">
      {room && (
        <motion.div
          key={room.id} role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}
          className="pointer-events-auto flex max-w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-line bg-panel/95 px-3 py-2 shadow-float"
        >
          <span className="size-2.5 shrink-0 rounded-sm" style={{ background: room.color }} aria-hidden />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold leading-tight">
              {room.name}
              {room.isPrivate && <Lock className="size-3 text-muted" aria-label="Private area" />}
              {room.zone === "open" && room.quiet && <VolumeX className="size-3 text-muted" aria-label="Quiet area" />}
            </p>
            <p className="text-[11px] leading-tight text-muted">
              {room.isPrivate ? "Private area — only people inside can hear each other" : room.zone === "open" && room.quiet ? "Quiet zone — keep voices down" : "Open area"}
              {room.capacity ? ` · ${(occupants ?? []).length}/${room.capacity}` : ""}
            </p>
          </div>
          {others.length > 0 && (
            <div className="flex items-center -space-x-1.5" aria-label={`${others.length} other people here`}>
              {others.slice(0, 5).map((id) => <AvatarImage key={id} avatar={users[id].avatar} size={22} className="ring-2 ring-panel" />)}
              {others.length > 5 && <span className="pl-2.5 text-[11px] text-muted">+{others.length - 5}</span>}
            </div>
          )}
          {room.isPrivate && (
            <div className="flex gap-1.5">
              {!inRoomConversation && others.length > 0 && (
                <Button size="sm" variant="primary" onClick={() => useConversationStore.getState().start(others, { type: "room", roomId: room.id, roomName: room.name })}>
                  Join room conversation
                </Button>
              )}
              <Button size="sm" onClick={() => useUiStore.getState().openDialog({ type: "room", roomId: room.id })}>
                <MapPin className="size-3.5" aria-hidden />
                Room details
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
