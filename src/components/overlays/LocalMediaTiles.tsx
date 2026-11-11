"use client";

import { X } from "lucide-react";
import { useConversationStore } from "@/features/conversation/conversation-store";
import { LocalVideo } from "@/features/media/components/LocalVideo";
import { mediaActions, useMediaStore } from "@/features/media/media-controller";
import { useUiStore } from "@/stores/ui-store";

/** Self-view tiles for camera and screen capture when no conversation or meeting view is showing them. */
export function LocalMediaTiles() {
  const camera = useMediaStore((s) => s.camera);
  const screen = useMediaStore((s) => s.screen);
  const inConversation = useConversationStore((s) => !!s.active && !s.minimized);
  const inMeetingView = useUiStore((s) => s.dialog?.type === "meeting");
  if (inMeetingView) return null;
  return (
    <>
      {camera === "on" && !inConversation && (
        <figure className="pointer-events-auto relative overflow-hidden rounded-lg border border-line bg-ink shadow-float">
          <LocalVideo kind="camera" className="h-[104px] w-[184px]" />
          <figcaption className="absolute bottom-1 left-1 rounded bg-ink/70 px-1.5 py-0.5 text-[11px] text-white">Your camera · local preview</figcaption>
          <button type="button" aria-label="Turn camera off" onClick={() => void mediaActions.toggleCamera()} className="absolute right-1 top-1 rounded bg-ink/70 p-1 text-white hover:bg-ink"><X className="size-3" /></button>
        </figure>
      )}
      {screen === "on" && (
        <figure className="pointer-events-auto relative overflow-hidden rounded-lg border border-line bg-ink shadow-float">
          <LocalVideo kind="screen" className="h-[104px] w-[184px] object-contain" />
          <figcaption className="absolute bottom-1 left-1 rounded bg-ink/70 px-1.5 py-0.5 text-[11px] text-white">Your screen · not broadcast in demo</figcaption>
          <button type="button" aria-label="Stop sharing" onClick={() => void mediaActions.toggleScreenShare()} className="absolute right-1 top-1 rounded bg-ink/70 p-1 text-white hover:bg-ink"><X className="size-3" /></button>
        </figure>
      )}
    </>
  );
}
