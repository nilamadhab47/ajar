"use client";

import { Armchair, ChevronUp, Crosshair, LogOut, Mic, MicOff, Minus, MonitorUp, PersonStanding, Plus, Shirt, Smile, Video, VideoOff } from "lucide-react";
import { StatusDot } from "@/components/common/StatusIndicator";
import { IconButton } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Tooltip } from "@/components/ui/tooltip";
import type { AvatarAction } from "@/features/avatar/types/avatar.types";
import { mediaActions, useMediaStore } from "@/features/media/media-controller";
import { StatusMenuItems } from "@/features/presence/components/StatusMenu";
import { useProfileStore } from "@/features/presence/presence-store";
import { sendWorldCommand } from "@/features/world/world-bridge";
import { useWorldStore } from "@/features/world/world-store";
import { walkToMyDesk } from "@/hooks/useOfficeBootstrap";
import { cn } from "@/lib/utils";
import type { DeviceState } from "@/services/media/media-adapter";
import { useUiStore } from "@/stores/ui-store";
import { STATUS_META } from "@/types/domain";

export const EMOTES = ["👋", "👍", "❤️", "😂", "🎉", "👏", "🤔", "☕", "🙌", "💡", "🔥", "✅"];
const ACTIONS: { id: AvatarAction; label: string }[] = [
  { id: "wave", label: "Wave" }, { id: "dance", label: "Dance" }, { id: "clap", label: "Clap" }, { id: "celebrate", label: "Celebrate" },
];

const DEVICE_HINT: Record<DeviceState, string> = {
  off: "Off", on: "On · local only in demo", requesting: "Waiting for permission…", denied: "Blocked in browser settings", unavailable: "Not available on this device",
};

const Divider = () => <span className="mx-1 h-5 w-px shrink-0 bg-white/15" aria-hidden />;

function DeviceButton({ kind, state, shortcut, onClick }: { kind: "Microphone" | "Camera"; state: DeviceState; shortcut: string; onClick: () => void }) {
  const on = state === "on";
  const blocked = state === "denied" || state === "unavailable";
  const Icon = kind === "Microphone" ? (on ? Mic : MicOff) : on ? Video : VideoOff;
  return (
    <IconButton tone="dark" label={`${kind} (${shortcut})`} hint={DEVICE_HINT[state]} active={on} disabled={state === "requesting"} onClick={onClick} className={cn(blocked && "text-dnd")}>
      <Icon className="size-[18px]" />
    </IconButton>
  );
}

/** Floating controls over the bottom of the map. */
export function BottomToolbar() {
  const media = useMediaStore();
  const status = useProfileStore((s) => s.status);
  const zoom = useWorldStore((s) => s.camera.zoom);
  const following = useWorldStore((s) => s.camera.following);
  const sitting = useWorldStore((s) => s.sitting);
  const emoteOpen = useUiStore((s) => s.emoteMenuOpen);
  const ui = useUiStore.getState;
  const screenSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  return (
    <div role="toolbar" aria-label="Office controls" className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-ink/95 p-1.5 shadow-float">
      <DeviceButton kind="Microphone" state={media.microphone} shortcut="M" onClick={() => void mediaActions.toggleMicrophone()} />
      <DeviceButton kind="Camera" state={media.camera} shortcut="V" onClick={() => void mediaActions.toggleCamera()} />
      <IconButton
        tone="dark" label="Share screen" active={media.screen === "on"} disabled={!screenSupported || media.screen === "requesting"}
        hint={!screenSupported ? "Not supported in this browser" : media.screen === "on" ? "Sharing locally · not broadcast in demo" : "Local preview · broadcasting needs a media backend"}
        onClick={() => void mediaActions.toggleScreenShare()}
      >
        <MonitorUp className="size-[18px]" />
      </IconButton>
      <Divider />

      <Menu>
        <Tooltip label="Set status">
          <MenuTrigger asChild>
            <button type="button" aria-label={`Status: ${STATUS_META[status].label}. Change status`} className="flex h-9 shrink-0 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-white/90 hover:bg-white/12">
              <StatusDot status={status} />
              <span className="hidden sm:inline">{STATUS_META[status].label}</span>
              <ChevronUp className="size-3.5 text-white/50" aria-hidden />
            </button>
          </MenuTrigger>
        </Tooltip>
        <MenuContent side="top" align="center" className="w-64"><StatusMenuItems /></MenuContent>
      </Menu>

      <Menu open={emoteOpen} onOpenChange={(open) => ui().set({ emoteMenuOpen: open })}>
        <MenuTrigger asChild>
          <IconButton tone="dark" label="Emotes (H)" active={emoteOpen}><Smile className="size-[18px]" /></IconButton>
        </MenuTrigger>
        <MenuContent side="top" align="center" className="w-56">
          <MenuLabel>React</MenuLabel>
          <div className="grid grid-cols-6 gap-0.5 px-1 pb-1">
            {EMOTES.map((e) => (
              <MenuItem key={e} className="justify-center px-0 text-lg" onSelect={() => sendWorldCommand(e === "👋" ? { type: "action", action: "wave" } : { type: "emote", emoji: e })}>
                <span role="img" aria-label={`Emote ${e}`}>{e}</span>
              </MenuItem>
            ))}
          </div>
        </MenuContent>
      </Menu>

      <Menu>
        <MenuTrigger asChild>
          <IconButton tone="dark" label="Avatar actions"><PersonStanding className="size-[18px]" /></IconButton>
        </MenuTrigger>
        <MenuContent side="top" align="center">
          <MenuLabel>Avatar actions</MenuLabel>
          {ACTIONS.map((a) => (
            <MenuItem key={a.id} onSelect={() => sendWorldCommand({ type: "action", action: a.id })}>{a.label}</MenuItem>
          ))}
          <MenuSeparator />
          {sitting ? (
            <MenuItem onSelect={() => sendWorldCommand({ type: "stand" })} hint="E"><PersonStanding className="size-4 text-muted" />Stand up</MenuItem>
          ) : (
            <MenuItem onSelect={walkToMyDesk} hint="G"><Armchair className="size-4 text-muted" />Sit at my desk</MenuItem>
          )}
          <MenuItem onSelect={() => ui().openDialog({ type: "avatar" })}><Shirt className="size-4 text-muted" />Customise avatar</MenuItem>
        </MenuContent>
      </Menu>
      <Divider />

      <IconButton tone="dark" label="Zoom out" onClick={() => sendWorldCommand({ type: "zoom", direction: "out" })}><Minus className="size-4" /></IconButton>
      <Tooltip label="Reset zoom">
        <button type="button" aria-label={`Zoom ${Math.round(zoom * 100)} percent. Reset zoom`} onClick={() => sendWorldCommand({ type: "zoom", direction: "reset" })} className="h-9 w-12 shrink-0 rounded-md text-xs font-medium tabular-nums text-white/85 hover:bg-white/12">
          {Math.round(zoom * 100)}%
        </button>
      </Tooltip>
      <IconButton tone="dark" label="Zoom in" onClick={() => sendWorldCommand({ type: "zoom", direction: "in" })}><Plus className="size-4" /></IconButton>
      <IconButton tone="dark" label="Recenter on me (L)" hint={following ? undefined : "Camera is free"} onClick={() => sendWorldCommand({ type: "recenter" })} className={cn(!following && "text-busy")}>
        <Crosshair className="size-[18px]" />
      </IconButton>
      <Divider />
      <IconButton tone="dark" label="Leave office" onClick={() => ui().openDialog({ type: "leave" })} className="bg-dnd/90 text-white hover:bg-dnd">
        <LogOut className="size-[18px]" />
      </IconButton>
    </div>
  );
}
