"use client";

import { AvatarDialog, OnboardingDialog, ProfileDialog } from "@/features/avatar/components/AvatarDialogs";
import { DeskDialog } from "@/features/desk/components/DeskDialog";
import { MeetingView } from "@/features/meetings/components/MeetingView";
import { RoomDialog } from "@/features/meetings/components/RoomDialog";
import { HelpDialog, LeaveDialog, SettingsDialog } from "@/features/settings/components/SettingsDialogs";
import { WhiteboardDialog } from "@/features/whiteboard/components/WhiteboardDialog";
import { NoteDialog } from "@/features/knock/components/NoteDialog";
import { LabelsDialog } from "@/features/office/components/LabelsDialog";
import { FloorSelector } from "@/features/world/components/FloorSelector";
import { useUiStore } from "@/stores/ui-store";

/** Renders whichever dialog the UI store asks for. One at a time, by design. */
export function DialogHost({ workspaceId }: { workspaceId: string }) {
  const dialog = useUiStore((s) => s.dialog);
  if (!dialog) return null;
  switch (dialog.type) {
    case "onboarding":
      return <OnboardingDialog />;
    case "avatar":
      return <AvatarDialog />;
    case "profile":
      return <ProfileDialog />;
    case "desk":
      return <DeskDialog key={dialog.deskId} workspaceId={workspaceId} deskId={dialog.deskId} label={dialog.label} hot={dialog.hot} />;
    case "room":
      return <RoomDialog key={dialog.roomId} roomId={dialog.roomId} />;
    case "whiteboard":
      return <WhiteboardDialog key={dialog.boardId} boardId={dialog.boardId} title={dialog.title} />;
    case "meeting":
      return <MeetingView />;
    case "floors":
      return <FloorSelector via={dialog.via} />;
    case "settings":
      return <SettingsDialog />;
    case "help":
      return <HelpDialog />;
    case "leave":
      return <LeaveDialog workspaceId={workspaceId} />;
    case "note":
      return <NoteDialog key={dialog.userId} userId={dialog.userId} />;
    case "labels":
      return <LabelsDialog workspaceId={workspaceId} />;
  }
}
