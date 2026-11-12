"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { apiRequest } from "@/services/api/api-client";
import { AuthShell } from "./auth-shell";
import { forgetInviteToken, getAccessToken, rememberInviteToken, restoreSession, storedInviteToken } from "./session";

type AcceptResult = { officeId: string | null; message: string };
const acceptations = new Map<string, Promise<AcceptResult>>();

/** One acceptance per token, so a remount does not spend the link twice. */
function acceptInvite(token: string): Promise<AcceptResult> {
  const existing = acceptations.get(token);
  if (existing) return existing;
  const pending = acceptOnce(token).then((result) => {
    if (result.message === "sign-in") acceptations.delete(token);
    return result;
  });
  acceptations.set(token, pending);
  return pending;
}

async function acceptOnce(token: string): Promise<AcceptResult> {
  if (!getAccessToken()) {
    const restored = await restoreSession();
    if (!restored) return { officeId: null, message: "sign-in" };
  }
  try {
    const result = await apiRequest<{ officeId: string; role: string }>("/invites/accept", {
      method: "POST",
      json: { token },
    });
    forgetInviteToken();
    return { officeId: result.officeId, message: "You're in. The invitation was for this email." };
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 0;
    if (status === 403) return { officeId: null, message: "This invitation was sent to a different email." };
    if (status === 409) return { officeId: null, message: "You are already in this office." };
    return { officeId: null, message: "This invitation has expired or was already used." };
  }
}

/** Accepts an invitation for the signed-in person. The email has to match. */
export function InvitePage() {
  const router = useRouter();
  const [message, setMessage] = useState(
    env.apiBaseUrl ? "Checking the invitation…" : "Invitations need the API. This copy of the office is running on its own.",
  );
  const [officeId, setOfficeId] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const fromHash = hash.get("token");
    if (fromHash) rememberInviteToken(fromHash);
    window.history.replaceState(null, "", window.location.pathname);
    const token = fromHash ?? storedInviteToken();
    if (!env.apiBaseUrl) return;
    if (!token) {
      setMessage("This invitation link is missing a token.");
      return;
    }
    void acceptInvite(token).then((result) => {
      if (result.message === "sign-in") {
        router.replace("/login");
        return;
      }
      setMessage(result.message);
      setOfficeId(result.officeId);
    });
  }, [router]);

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold">Invitation</h1>
      <p className="mt-2 text-sm leading-relaxed" role="status">{message}</p>
      {officeId && (
        <Button variant="primary" className="mt-6" onClick={() => router.push(`/workspace/${officeId}/office`)}>
          Open the office
        </Button>
      )}
    </AuthShell>
  );
}
