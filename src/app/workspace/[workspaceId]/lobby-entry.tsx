"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/common/LoadingState";

/** Reads the saved avatar from browser storage, so it renders on the client only. */
const Lobby = dynamic(() => import("@/components/layout/Lobby").then((m) => m.Lobby), {
  ssr: false,
  loading: () => <LoadingState label="Loading…" fullscreen />,
});

export function LobbyEntry({ workspaceId }: { workspaceId: string }) {
  return <Lobby workspaceId={workspaceId} />;
}
