"use client";

import { Check } from "lucide-react";
import { StatusDot } from "@/components/common/StatusIndicator";
import { MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import { Lantern } from "@/features/knock/components/Lantern";
import { DOOR_META, STATUS_META, STATUS_ORDER, effectiveDoor, type DoorState } from "@/types/domain";
import { useProfileStore } from "../presence-store";

const STATUS_EMOJI = ["", "🎧", "🎯", "☕", "🍜", "🏠", "✈️"];

/** Menu body for choosing presence; used by the toolbar and the profile menu. */
export function StatusMenuItems() {
  const status = useProfileStore((s) => s.status);
  const emoji = useProfileStore((s) => s.statusEmoji);
  const door = useProfileStore((s) => s.door);
  const setStatus = useProfileStore((s) => s.setStatus);
  const setDoor = useProfileStore((s) => s.setDoor);
  const forced = effectiveDoor(status, door) === "closed" && door !== "closed";
  return (
    <>
      <MenuLabel>Set your status</MenuLabel>
      {STATUS_ORDER.filter((s) => s !== "offline").map((s) => (
        <MenuItem key={s} onSelect={() => setStatus(s)} hint={STATUS_META[s].meaning}>
          <StatusDot status={s} />
          <span>{STATUS_META[s].label}</span>
          {status === s && <Check className="size-3.5 text-accent" aria-label="Current status" />}
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuLabel>Your door</MenuLabel>
      {(["open", "ask", "closed"] as const satisfies readonly DoorState[]).map((d) => (
        <MenuItem key={d} onSelect={() => setDoor(d)} hint={d === "open" ? "Come on in" : d === "ask" ? "They decide" : "Leave a note"}>
          <Lantern door={d} />
          <span>{DOOR_META[d].label}</span>
          {door === d && <Check className="size-3.5 text-accent" aria-label="Current door" />}
        </MenuItem>
      ))}
      {forced && <p className="px-2 pb-1 text-[11px] leading-snug text-muted">Focus and Do not disturb close the door until you change status.</p>}
      <MenuSeparator />
      <MenuLabel>Status emoji</MenuLabel>
      <div className="flex gap-0.5 px-1 pb-1" role="group" aria-label="Status emoji">
        {STATUS_EMOJI.map((e) => (
          <button
            key={e || "none"} type="button" aria-label={e ? `Status emoji ${e}` : "No status emoji"} aria-pressed={emoji === e}
            onClick={() => setStatus(status, e)}
            className={cn("flex size-7 items-center justify-center rounded text-sm hover:bg-hover", emoji === e && "bg-accent-soft")}
          >
            {e || <span className="text-xs text-muted">–</span>}
          </button>
        ))}
      </div>
    </>
  );
}
