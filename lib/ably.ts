// apps/web/lib/ably.ts
// Ably client singleton for the web app.
// Uses token auth — the API key never leaves the server.
// One client instance per browser session; channels are reused.

import Ably from "ably";

let client: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime {
  if (client) return client;

  client = new Ably.Realtime({
    authUrl: "/api/chat/token",
    authMethod: "GET",
    // Include credentials so Clerk session cookie is sent
    authHeaders: { "X-Requested-With": "XMLHttpRequest" },
    // Auto-reconnect on disconnect
    disconnectedRetryTimeout: 5_000,
    suspendedRetryTimeout: 15_000,
    // Log only errors in production
    logLevel: process.env.NODE_ENV === "development" ? 2 : 0,
  });

  // Clean up on page unload
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      client?.close();
      client = null;
    });
  }

  return client;
}

// Typed message shape from the server
export type ChatMessage = {
  id: string;
  body: string;
  channelId: string;
  channelType: "EVENT" | "DIRECT" | "PRIVATE_TABLE";
  createdAt: string;
  sender: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
};
