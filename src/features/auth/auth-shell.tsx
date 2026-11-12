import type { ReactNode } from "react";
import { BRAND } from "@/lib/config";

/** The quiet frame shared by sign-in, invite, and the office list. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-full items-center justify-center bg-app px-4 py-10">
      <div className="w-full max-w-md">
        <p className="text-[13px] font-medium tracking-wide text-muted uppercase">{BRAND.product}</p>
        <p className="mt-1 text-sm text-muted">{BRAND.descriptor}</p>
        <div className="mt-6 rounded-xl border border-line bg-panel p-6 shadow-float">{children}</div>
      </div>
    </main>
  );
}

export const authInputClass =
  "h-10 w-full rounded-md border border-line bg-app px-3 text-sm focus:border-accent focus:outline-none";
