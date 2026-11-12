"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LoadingState } from "@/components/common/LoadingState";
import { env } from "@/lib/env";
import { restoreSession } from "./session";

/** Refreshes the session before the office reads who the local person is. */
export function SessionRoot({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!env.apiBaseUrl);

  useEffect(() => {
    if (!env.apiBaseUrl) return;
    void restoreSession().finally(() => setReady(true));
  }, []);

  if (!ready) return <LoadingState label="Checking your session…" fullscreen />;
  return children;
}
