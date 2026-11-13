"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDeskStore } from "@/features/desk/desk-store";
import { useProfileStore } from "@/features/presence/presence-store";
import { env } from "@/lib/env";
import { apiRequest } from "@/services/api/api-client";
import { AuthShell, authInputClass } from "./auth-shell";
import { getAccessToken, restoreSession } from "./session";
import { STARTER_DESKS } from "./starter-desks";

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
  const [officeName, setOfficeName] = useState("");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [deskId, setDeskId] = useState("");
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
      const created = await apiRequest<{ office: { id: string; title: string | null; deskId: string | null } }>("/organizations", {
        method: "POST",
        json: {
          name: company.trim(),
          officeName: officeName.trim(),
          description: description.trim(),
          title: title.trim(),
          department: department.trim(),
          ...(deskId ? { deskId } : {}),
        },
      });
      if (created.office.title) useProfileStore.setState({ title: created.office.title });
      if (created.office.deskId) useDeskStore.getState().claim(created.office.deskId);
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
        <p className="mt-2 text-sm leading-relaxed text-muted">Opening the office…</p>
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
        <label className="block text-xs font-medium" htmlFor="office-name">Office name</label>
        <input id="office-name" required maxLength={80} value={officeName} onChange={(event) => setOfficeName(event.target.value)} className={authInputClass} />
        <label className="block text-xs font-medium" htmlFor="office-description">One line about it <span className="font-normal text-muted">(optional)</span></label>
        <input id="office-description" maxLength={140} value={description} onChange={(event) => setDescription(event.target.value)} className={authInputClass} />
        <label className="block text-xs font-medium" htmlFor="owner-title">Your designation</label>
        <input id="owner-title" required maxLength={40} autoComplete="organization-title" value={title} onChange={(event) => setTitle(event.target.value)} className={authInputClass} />
        <label className="block text-xs font-medium" htmlFor="owner-department">Department</label>
        <input id="owner-department" required maxLength={40} placeholder="Engineering" value={department} onChange={(event) => setDepartment(event.target.value)} className={authInputClass} />
        <label className="block text-xs font-medium" htmlFor="owner-desk">Desk</label>
        <select id="owner-desk" value={deskId} onChange={(event) => setDeskId(event.target.value)} className={authInputClass}>
          <option value="">Nearest free desk</option>
          {STARTER_DESKS.map((desk) => (
            <option key={desk.id} value={desk.id}>{desk.id} · {desk.area}</option>
          ))}
        </select>
        <Button variant="primary" type="submit" disabled={busy}>Create the office</Button>
      </form>
      {message && <p className="mt-4 text-sm" role="status">{message}</p>}
    </AuthShell>
  );
}
