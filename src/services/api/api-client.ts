import { env } from "@/lib/env";

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** Minimal JSON client. Base URL comes from NEXT_PUBLIC_API_BASE_URL; auth is injected by the host app. */
let authTokenProvider: () => string | null = () => null;
export function setAuthTokenProvider(provider: () => string | null): void {
  authTokenProvider = provider;
}

export async function apiRequest<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  if (!env.apiBaseUrl) throw new ApiError(0, "NEXT_PUBLIC_API_BASE_URL is not configured");
  const token = authTokenProvider();
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  if (!res.ok) throw new ApiError(res.status, `${init.method ?? "GET"} ${path} failed (${res.status})`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}
