"use client";

import { useSyncExternalStore } from "react";
import type { AvatarAppearance } from "@/features/avatar/types/avatar.types";
import { useAvatarStore } from "@/features/avatar/avatar-store";
import { usePeopleStore } from "@/features/people/people-store";
import { useProfileStore } from "@/features/presence/presence-store";
import { env } from "@/lib/env";
import { setAuthTokenProvider } from "@/services/api/api-client";
import { usersApi } from "@/services/api/users-api";
import type { User } from "@/types/domain";

const inviteTokenKey = "ajar.inviteToken";
let accessToken: string | null = null;
const listeners = new Set<() => void>();

/** The access token stays in memory. The refresh cookie is HttpOnly. */
export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-renders when a sign-in or refresh changes the in-memory token. */
export function useAccessToken(): string | null {
  return useSyncExternalStore(subscribe, getAccessToken, () => null);
}

setAuthTokenProvider(getAccessToken);

/** Restores a session from the refresh cookie, then loads the person. */
export async function restoreSession(): Promise<boolean> {
  if (!env.apiBaseUrl) return false;
  const refreshed = await authPost<{ accessToken?: string }>("/auth/refresh");
  const token = refreshed.ok ? refreshed.body?.accessToken : null;
  if (!token) {
    setAccessToken(null);
    return false;
  }
  setAccessToken(token);
  const me = await usersApi.getCurrentUser();
  if (me) await applySignedInUser(me);
  return true;
}

/** Sends a one-time sign-in link. The response does not say whether the email exists. */
export async function requestMagicLink(email: string): Promise<boolean> {
  const result = await authPost("/auth/magic-link", { email });
  return result.ok;
}

const consumedTokens = new Map<string, Promise<"ok" | "unavailable" | "rejected">>();

/** Uses a magic-link or confirmation token once and keeps the access token in memory. */
export function consumeSignInToken(token: string): Promise<"ok" | "unavailable" | "rejected"> {
  const existing = consumedTokens.get(token);
  if (existing) return existing;
  const pending = consumeOnce(token).then((outcome) => {
    if (outcome !== "ok") consumedTokens.delete(token);
    return outcome;
  });
  consumedTokens.set(token, pending);
  return pending;
}

async function consumeOnce(token: string): Promise<"ok" | "unavailable" | "rejected"> {
  const result = await authPost<{ accessToken?: string }>("/auth/magic-link/consume", { token });
  if (!result.ok || !result.body?.accessToken) {
    return result.status === 503 || result.status === 0 ? "unavailable" : "rejected";
  }
  setAccessToken(result.body.accessToken);
  const me = await usersApi.getCurrentUser();
  if (me) await applySignedInUser(me);
  return "ok";
}

/** Signs in with a password. An unknown email and a wrong password look the same. */
export async function signInWithPassword(email: string, password: string): Promise<boolean> {
  const result = await authPost<{ accessToken?: string }>("/auth/password/sign-in", { email, password });
  if (!result.ok || !result.body?.accessToken) return false;
  setAccessToken(result.body.accessToken);
  const me = await usersApi.getCurrentUser();
  if (me) await applySignedInUser(me);
  return true;
}

/** Asks for a confirmation email. The person is created when that link is used. */
export async function requestPasswordSignUp(email: string, password: string, displayName: string): Promise<boolean> {
  const result = await authPost("/auth/password/sign-up", { email, password, displayName });
  return result.ok;
}

/** Remembers an invitation token until the person can accept it. */
export function rememberInviteToken(token: string): void {
  sessionStorage.setItem(inviteTokenKey, token);
}

/** Returns the invitation token from this tab, if one is waiting. */
export function storedInviteToken(): string | null {
  return sessionStorage.getItem(inviteTokenKey);
}

/** Forgets the invitation token after it has been used or rejected. */
export function forgetInviteToken(): void {
  sessionStorage.removeItem(inviteTokenKey);
}

/** Copies the signed-in person into the office profile without writing it back. */
export async function applySignedInUser(user: User): Promise<void> {
  usePeopleStore.setState({ localUserId: user.id });
  await whenHydrated(useProfileStore, () => {
    useProfileStore.setState({
      displayName: user.displayName || "You",
      title: user.title ?? "",
      status: user.status,
      door: user.door ?? "ask",
      onboarded: true,
    });
  });
  const appearance = appearanceFrom(user);
  if (!appearance) return;
  await whenHydrated(useAvatarStore, () => {
    useAvatarStore.setState({ appearance, customised: true });
  });
}

/** Applies signed-in state after browser storage has loaded, so it is not overwritten. */
function whenHydrated(store: { persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } }, apply: () => void): Promise<void> {
  if (store.persist.hasHydrated()) {
    apply();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const unsubscribe = store.persist.onFinishHydration(() => {
      unsubscribe();
      apply();
      resolve();
    });
  });
}

function appearanceFrom(user: User): AvatarAppearance | null {
  const avatar = user.avatar;
  if (!avatar || typeof avatar !== "object" || !("characterId" in avatar) || !avatar.characterId) return null;
  const { id: _id, animationState: _animation, direction: _direction, ...appearance } = avatar;
  return appearance;
}

async function authPost<T>(path: string, json?: unknown): Promise<{ ok: boolean; status: number; body: T | null }> {
  if (!env.apiBaseUrl) return { ok: false, status: 0, body: null };
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  if (response.status === 204) return { ok: response.ok, status: response.status, body: null };
  const body = (await response.json().catch(() => null)) as T | null;
  return { ok: response.ok, status: response.status, body };
}
