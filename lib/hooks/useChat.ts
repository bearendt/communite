// apps/web/lib/hooks/useChat.ts
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getAblyClient, type ChatMessage } from "@/lib/ably";
import type Ably from "ably";

type ChannelType = "EVENT" | "DIRECT" | "PRIVATE_TABLE";

type UseChatOptions = {
  channelId: string;
  channelType: ChannelType;
  userId: string;
};

type PresenceUser = {
  id: string;
  displayName: string;
};

export function useChat({ channelId, channelType, userId }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  const channelRef = useRef<Ably.RealtimeChannel | null>(null);

  // Build Ably channel name
  const ablyChannelName =
    channelType === "DIRECT"
      ? (() => {
          const [a, b] = [userId, channelId].sort();
          return `dm:${a}:${b}`;
        })()
      : channelType === "EVENT"
      ? `event:${channelId}`
      : `table:${channelId}`;

  // Load message history from API
  const loadHistory = useCallback(
    async (before?: string) => {
      const params = new URLSearchParams({
        channelId,
        channelType,
        limit: "50",
        ...(before ? { before } : {}),
      });

      const res = await fetch(`/api/chat/messages?${params}`);
      if (!res.ok) return;

      const json = await res.json() as any;
      const { messages: history, hasMore: more, nextCursor: cursor } = json.data;

      setMessages((prev) => (before ? [...history, ...prev] : history));
      setHasMore(more);
      setNextCursor(cursor);
    },
    [channelId, channelType]
  );

  // Load more (infinite scroll upward)
  const loadMore = useCallback(() => {
    if (hasMore && nextCursor) loadHistory(nextCursor);
  }, [hasMore, nextCursor, loadHistory]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);

    const ably = getAblyClient();
    const channel = ably.channels.get(ablyChannelName);
    channelRef.current = channel;

    // Subscribe to new messages
    channel.subscribe("message", (msg: Ably.Message) => {
      const data = msg.data as ChatMessage;
      setMessages((prev) => {
        // Deduplicate: skip if we already have this ID (from optimistic update)
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    // Handle deletions
    channel.subscribe("message:deleted", (msg: Ably.Message) => {
      const { id } = msg.data as { id: string };
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });

    // Presence — who's online in this channel
    channel.presence.subscribe((member: Ably.PresenceMessage) => {
      channel.presence.get((err, members) => {
        if (err || !members) return;
        setPresence(
          members.map((m) => ({
            id: m.clientId ?? "",
            displayName: (m.data as { displayName?: string })?.displayName ?? m.clientId ?? "",
          }))
        );
      });
    });

    // Enter presence
    channel.presence.enter({ displayName: "..." }); // displayName set after hydration

    // Connection state
    ably.connection.on("connected", () => setConnected(true));
    ably.connection.on("disconnected", () => setConnected(false));
    ably.connection.on("failed", () => setConnected(false));
    setConnected(ably.connection.state === "connected");

    // Load history
    loadHistory().finally(() => setLoading(false));

    return () => {
      channel.presence.leave();
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [ablyChannelName, loadHistory]);

  // Send a message
  const send = useCallback(
    async (body: string): Promise<boolean> => {
      const trimmed = body.trim();
      if (!trimmed || sending) return false;

      setSending(true);

      // Optimistic update
      const optimisticId = `optimistic-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: optimisticId,
        body: trimmed,
        channelId,
        channelType,
        createdAt: new Date().toISOString(),
        sender: { id: userId, displayName: "You", avatarUrl: null },
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const res = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed, channelType, channelId }),
        });

        if (!res.ok) {
          // Roll back optimistic update
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
          return false;
        }

        // Remove optimistic message — real one comes via Ably subscription
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        return true;
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        return false;
      } finally {
        setSending(false);
      }
    },
    [channelId, channelType, userId, sending]
  );

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    await fetch(`/api/chat/messages?messageId=${messageId}`, { method: "DELETE" });
    // Ably broadcast handles removal from state
  }, []);

  return {
    messages,
    presence,
    connected,
    loading,
    sending,
    hasMore,
    send,
    deleteMessage,
    loadMore,
  };
}
