/** Integration configuration. All backend endpoints come from the environment. */
export type RealtimeMode = "mock" | "websocket";

export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "",
  realtimeMode: (process.env.NEXT_PUBLIC_REALTIME_MODE === "websocket" ? "websocket" : "mock") as RealtimeMode,
};
export const isMockMode = env.realtimeMode === "mock";
