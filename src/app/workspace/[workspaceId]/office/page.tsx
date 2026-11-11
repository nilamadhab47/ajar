import { Suspense } from "react";
import { LoadingState } from "@/components/common/LoadingState";
import { OfficeEntry } from "./office-entry";

async function Office({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <OfficeEntry workspaceId={workspaceId} />;
}

export default function OfficePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  return (
    <Suspense fallback={<LoadingState label="Opening the office…" fullscreen />}>
      <Office params={params} />
    </Suspense>
  );
}
