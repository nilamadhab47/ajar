import { useProfileStore } from "@/features/presence/presence-store";
import { useUiStore } from "@/stores/ui-store";
import type { MeetingKind, PresenceStatus } from "@/types/domain";
import { useMeetingStore } from "./meeting-store";

let statusBeforeMeeting: PresenceStatus | null = null;

function enter(status: PresenceStatus): void {
  const profile = useProfileStore.getState();
  statusBeforeMeeting ??= profile.status;
  profile.setStatus(status);
  useUiStore.getState().openDialog({ type: "meeting" });
}

/** UI-level meeting actions: keep presence, the meeting view and the activity log in step. */
export const meetingActions = {
  start(title: string, kind: MeetingKind, roomId: string | null): void {
    const meeting = useMeetingStore.getState().start({ title, kind, roomId });
    enter(kind === "coworking-focused" ? "focus" : kind === "meeting" ? "in-meeting" : "available");
    useUiStore.getState().logActivity(`You started “${meeting.title}”`);
  },
  join(meetingId: string): void {
    const store = useMeetingStore.getState();
    const meeting = store.meetings.find((m) => m.id === meetingId);
    if (!meeting) return;
    store.join(meetingId);
    enter(meeting.kind === "coworking-focused" ? "focus" : meeting.kind === "meeting" ? "in-meeting" : "available");
    useUiStore.getState().logActivity(`You joined “${meeting.title}”`);
  },
  leave(): void {
    const store = useMeetingStore.getState();
    const meeting = store.meetings.find((m) => m.id === store.joinedMeetingId);
    if (!meeting) return;
    store.leave();
    if (statusBeforeMeeting) useProfileStore.getState().setStatus(statusBeforeMeeting);
    statusBeforeMeeting = null;
    const ui = useUiStore.getState();
    if (ui.dialog?.type === "meeting") ui.closeDialog();
    const ended = useMeetingStore.getState().meetings.find((m) => m.id === meeting.id)?.status === "ended";
    ui.toast({ title: ended ? "Meeting ended" : "You left the meeting", body: meeting.title });
  },
};
