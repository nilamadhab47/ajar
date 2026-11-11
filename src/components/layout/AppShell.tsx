"use client";

import { ErrorState, LoadingState } from "@/components/common/LoadingState";
import { ConversationOverlay } from "@/components/overlays/ConversationOverlay";
import { DialogHost } from "@/components/overlays/DialogHost";
import { InteractionPrompt } from "@/components/overlays/InteractionPrompt";
import { LocalMediaTiles } from "@/components/overlays/LocalMediaTiles";
import { NearbyPanel } from "@/components/overlays/NearbyPanel";
import { NotificationContainer } from "@/components/overlays/NotificationContainer";
import { RoomBanner } from "@/components/overlays/RoomBanner";
import { StatusBadges } from "@/components/overlays/StatusBadges";
import { UserProfilePopover } from "@/components/overlays/UserProfilePopover";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditPanel } from "@/features/world/components/EditPanel";
import { Minimap } from "@/features/world/components/Minimap";
import { TouchJoystick } from "@/features/world/components/TouchJoystick";
import { WorldCanvas } from "@/features/world/components/WorldCanvas";
import { useWorldStore } from "@/features/world/world-store";
import { useOfficeBootstrap } from "@/hooks/useOfficeBootstrap";
import { useAppStore } from "@/stores/app-store";
import { BottomToolbar } from "./BottomToolbar";
import { NavigationRail } from "./NavigationRail";
import { RightSidebar } from "./RightSidebar";
import { TopNavigation } from "./TopNavigation";

/** Everything React draws on top of the Phaser canvas. None of it owns world state. */
function WorldOverlays() {
  const status = useWorldStore((s) => s.status);
  const error = useWorldStore((s) => s.error);
  const editMode = useWorldStore((s) => s.editMode);

  if (status === "error")
    return (
      <div className="absolute inset-0 z-20 bg-map">
        <ErrorState title="The office couldn't be loaded" detail={error ?? undefined} onRetry={() => window.location.reload()} />
      </div>
    );

  return (
    <>
      {status === "loading" && (
        <div className="absolute inset-0 z-20 bg-map">
          <LoadingState label="Drawing the office…" />
        </div>
      )}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[60%] flex-col items-start gap-2">
        <StatusBadges />
        <RoomBanner />
      </div>
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
        <UserProfilePopover />
        <ConversationOverlay />
        <LocalMediaTiles />
      </div>
      {editMode ? <EditPanel /> : <NearbyPanel />}
      <TouchJoystick />
      <Minimap />
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-2">
        <InteractionPrompt />
        <BottomToolbar />
      </div>
    </>
  );
}

export function AppShell({ workspaceId }: { workspaceId: string }) {
  useOfficeBootstrap(workspaceId);
  const workspace = useAppStore((s) => s.workspace);
  const connection = useAppStore((s) => s.connection);
  const detail = useAppStore((s) => s.connectionDetail);

  return (
    <TooltipProvider delayDuration={350}>
      <div className="flex h-dvh flex-col bg-app">
        <TopNavigation />
        <div className="relative flex min-h-0 flex-1">
          <NavigationRail />
          <main className="@container relative min-w-0 flex-1 overflow-hidden bg-map">
            {workspace ? (
              <>
                <WorldCanvas />
                <WorldOverlays />
              </>
            ) : connection === "error" ? (
              <ErrorState title="Couldn't open the workspace" detail={detail ?? undefined} onRetry={() => window.location.reload()} />
            ) : (
              <LoadingState label="Opening the office…" />
            )}
          </main>
          <RightSidebar />
        </div>
        <DialogHost workspaceId={workspaceId} />
        <NotificationContainer />
      </div>
    </TooltipProvider>
  );
}
