"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { apiRequest } from "@/services/api/api-client";
import { AuthShell, authInputClass } from "./auth-shell";
import { getAccessToken, restoreSession } from "./session";

type Office = {
  id: string;
  name: string;
  officeName: string;
  role: string;
  organizationName: string;
};

/** Lists the offices a person belongs to, and creates the first one. */
export function OfficesPage() {
  const router = useRouter();
  const [offices, setOffices] = useState<Office[] | null>(null);
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!env.apiBaseUrl) {
      router.replace("/workspace/demo/office");
      return;
    }
    void load();
  }, [router]);

  async function load() {
    if (!getAccessToken()) {
      const restored = await restoreSession();
      if (!restored) {
        router.replace("/login");
        return;
      }
    }
    const result = await apiRequest<{ offices: Office[] }>("/workspaces");
    setOffices(result.offices);
  }

  async function createOffice() {
    setBusy(true);
    setMessage(null);
    try {
      const created = await apiRequest<{ office: { id: string } }>("/organizations", {
        method: "POST",
        json: { name: company.trim() },
      });
      router.push(`/workspace/${created.office.id}/office`);
    } catch {
      setBusy(false);
      setMessage("The office could not be created.");
    }
  }

  if (!env.apiBaseUrl) {
    return (
      <AuthShell>
        <h1 className="text-xl font-semibold">Your offices</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">Opening the demo office…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold">Your offices</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">Each office is separate. You can belong to more than one.</p>
      <ul className="mt-5 space-y-2">
        {offices?.length === 0 && <li className="text-sm text-muted">You are not in an office yet.</li>}
        {offices?.map((office) => (
          <li key={office.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md border border-line px-3 py-2 text-left hover:bg-hover"
              onClick={() => router.push(`/workspace/${office.id}/office`)}
            >
              <span>
                <span className="block text-sm font-medium">{office.officeName}</span>
                <span className="block text-xs text-muted">{office.organizationName}</span>
              </span>
              <span className="text-xs text-muted">{office.role}</span>
            </button>
          </li>
        ))}
      </ul>
      <form className="mt-6 space-y-3 border-t border-line pt-5" onSubmit={(event) => { event.preventDefault(); void createOffice(); }}>
        <label className="block text-xs font-medium" htmlFor="company-name">Company name</label>
        <input id="company-name" required maxLength={80} value={company} onChange={(event) => setCompany(event.target.value)} className={authInputClass} />
        <Button variant="primary" type="submit" disabled={busy}>Create an office</Button>
      </form>
      {message && <p className="mt-4 text-sm" role="status">{message}</p>}
    </AuthShell>
  );
}
