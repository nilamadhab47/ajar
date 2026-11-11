import { Suspense } from "react";
import { LoadingState } from "@/components/common/LoadingState";
import { LobbyEntry } from "./lobby-entry";

async function Lobby({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <LobbyEntry workspaceId={workspaceId} />;
}

export default function LobbyPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  return (
    <Suspense fallback={<LoadingState label="Loading…" fullscreen />}>
      <Lobby params={params} />
    </Suspense>
  );
}
