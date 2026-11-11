"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/common/LoadingState";

/** The office is a client-only experience (canvas, browser storage, media devices). */
const AppShell = dynamic(() => import("@/components/layout/AppShell").then((m) => m.AppShell), {
  ssr: false,
  loading: () => <LoadingState label="Opening the office…" fullscreen />,
});

export function OfficeEntry({ workspaceId }: { workspaceId: string }) {
  return <AppShell workspaceId={workspaceId} />;
}
