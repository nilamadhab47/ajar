"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import {
  applySignedInUser,
  consumeSignInToken,
  requestMagicLink,
  requestPasswordSignUp,
  setAccessToken,
  signInWithPassword,
  storedInviteToken,
} from "./session";
import { usersApi } from "@/services/api/users-api";
import { AuthShell, authInputClass } from "./auth-shell";

/** Sign-in for a person. An office comes after, from an invitation or the office list. */
export function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const token = hash.get("token");
    const error = params.get("error") ?? hash.get("error");
    if (error === "email_unverified") setMessage("That provider did not confirm the email, so no account was created.");
    if (error === "oauth_rejected") setMessage("Sign-in stopped before an account was opened.");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    if (accessToken) {
      void consumeAccessToken(accessToken);
      return;
    }
    if (token) void finishWithToken(token);
  }, [params]);

  async function consumeAccessToken(token: string) {
    setAccessToken(token);
    const me = await usersApi.getCurrentUser();
    if (me) await applySignedInUser(me);
    leave();
  }

  async function finishWithToken(token: string) {
    setBusy(true);
    const outcome = await consumeSignInToken(token);
    setBusy(false);
    if (outcome === "unavailable") {
      setMessage("Sign-in is not available right now.");
      return;
    }
    if (outcome !== "ok") {
      setMessage("That link has expired or was already used.");
      return;
    }
    leave();
  }

  function leave() {
    router.replace(storedInviteToken() ? "/invite" : "/offices");
  }

  async function sendLink() {
    setBusy(true);
    setMessage(null);
    const ok = await requestMagicLink(email.trim());
    setBusy(false);
    setMessage(ok ? "Check your email for a sign-in link. It works once." : "The sign-in link could not be sent.");
  }

  async function submitPassword() {
    setBusy(true);
    setMessage(null);
    if (creating) {
      const displayName = name.trim().replace(/\s+/g, " ");
      if (!displayName) {
        setBusy(false);
        setMessage("Add your name.");
        return;
      }
      const ok = await requestPasswordSignUp(email.trim(), password, displayName);
      setBusy(false);
      setMessage(ok ? "Check your email to finish creating the account. The link works once." : "The account email could not be sent.");
      return;
    }
    const ok = await signInWithPassword(email.trim(), password);
    setBusy(false);
    if (!ok) {
      setMessage("That email or password is not right.");
      return;
    }
    leave();
  }

  if (!env.apiBaseUrl) {
    return (
      <AuthShell>
        <h1 className="text-xl font-semibold">No account is needed here</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">This office is running on this computer. Sign-in starts when an API address is set.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold">{creating ? "Create an account" : "Sign in"}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">This is you. An office comes next, either one you create or one you were invited to.</p>
      <form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); void sendLink(); }}>
        <label className="block text-xs font-medium" htmlFor="sign-in-email">Email</label>
        <input id="sign-in-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={authInputClass} />
        <Button variant="primary" type="submit" disabled={busy}>Email me a sign-in link</Button>
      </form>
      <form className="mt-6 space-y-3 border-t border-line pt-5" onSubmit={(event) => { event.preventDefault(); void submitPassword(); }}>
        {creating && (
          <>
            <label className="block text-xs font-medium" htmlFor="sign-up-name">Your name</label>
            <input id="sign-up-name" autoComplete="name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className={authInputClass} />
          </>
        )}
        <label className="block text-xs font-medium" htmlFor="sign-in-password">Password</label>
        <input id="sign-in-password" type="password" autoComplete={creating ? "new-password" : "current-password"} required minLength={10} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className={authInputClass} />
        <Button variant="secondary" type="submit" disabled={busy}>{creating ? "Create account" : "Sign in with a password"}</Button>
        <button type="button" className="block text-sm text-accent" onClick={() => { setCreating((value) => !value); setMessage(null); }}>
          {creating ? "I already have an account" : "Create an account"}
        </button>
      </form>
      <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 text-sm">
        <a className="text-accent" href={`${env.apiBaseUrl}/auth/google`}>Continue with Google</a>
        <a className="text-accent" href={`${env.apiBaseUrl}/auth/microsoft`}>Continue with Microsoft</a>
      </div>
      {message && <p className="mt-4 text-sm leading-relaxed" role="status">{message}</p>}
    </AuthShell>
  );
}
