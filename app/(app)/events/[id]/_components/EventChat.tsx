"use client";
// apps/web/app/(app)/events/[id]/_components/EventChat.tsx
// Real-time event chat. Only visible to confirmed guests + host.
// Messages are persisted via POST /api/chat/messages then broadcast via Ably.

import { useEffect, useRef, useState, useCallback } from "react";
import { getAblyClient } from "@/lib/ably";
import type Ably from "ably";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

type PresenceMember = {
  clientId: string;
  displayName?: string;
};

type Props = {
  eventId: string;
  viewerId: string;
  viewerName: string;
};

const CHANNEL_NAME = (eventId: string) => `event:${eventId}`;

export default function EventChat({ eventId, viewerId, viewerName }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [presence, setPresence] = useState<PresenceMember[]>([]);
  const [connectionState, setConnectionState] = useState<string>("initialized");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);

  // Load message history from DB
  const loadHistory = useCallback(async () => {
    const res = await fetch(
      `/api/chat/messages?channelId=${eventId}&channelType=EVENT&limit=50`
    );
    if (res.ok) {
      const json = await res.json() as any;
      setMessages(json.data.messages);
      setHistoryLoaded(true);
    }
  }, [eventId]);

  useEffect(() => {
    if (!open) return;

    const ably = getAblyClient();
    const channel = ably.channels.get(CHANNEL_NAME(eventId));
    channelRef.current = channel;

    // Track connection state
    ably.connection.on((stateChange) => {
      setConnectionState(stateChange.current);
    });

    // Subscribe to new messages
    channel.subscribe("message", (msg) => {
      const newMsg = msg.data as Message;
      setMessages((prev) => {
        // Deduplicate by ID
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      if (!open) setUnread((n) => n + 1);
    });

    // Subscribe to deletions
    channel.subscribe("message:deleted", (msg) => {
      const { id } = msg.data as { id: string };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, body: "[Message deleted]" } : m
        )
      );
    });

    // Presence — who's online right now
    channel.presence.subscribe((member) => {
      channel.presence.get().then((members) => {
        setPresence(
          members.map((m) => ({
            clientId: m.clientId,
            displayName: (m.data as { displayName?: string })?.displayName,
          }))
        );
      });
    });

    // Enter presence
    channel.presence.enter({ displayName: viewerName });

    // Load history once
    if (!historyLoaded) loadHistory();

    return () => {
      channel.presence.leave();
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [open, eventId, viewerName, historyLoaded, loadHistory]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnread(0);
    }
  }, [messages, open]);

  async function sendMessage() {
    const body = input.trim();
    if (!body || sending) return;

    setSending(true);
    setInput("");

    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, channelType: "EVENT", channelId: eventId }),
    });

    if (!res.ok) {
      setInput(body); // restore on failure
    }

    setSending(false);
  }

  async function deleteMessage(id: string) {
    await fetch(`/api/chat/messages?messageId=${id}`, { method: "DELETE" });
  }

  const onlineCount = presence.filter((p) => p.clientId !== viewerId).length + 1;

  return (
    <div className="mt-8">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white border border-stone-200 rounded-2xl text-sm font-medium hover:border-stone-400 transition-colors"
      >
        <span className="flex items-center gap-2">
          💬 Event Chat
          {onlineCount > 1 && open && (
            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
              {onlineCount} online
            </span>
          )}
          {connectionState === "connecting" && (
            <span className="text-xs text-stone-400">connecting…</span>
          )}
          {connectionState === "failed" && (
            <span className="text-xs text-red-500">connection failed</span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {!open && unread > 0 && (
            <span className="bg-[#C2714F] text-white text-xs rounded-full px-2 py-0.5">
              {unread}
            </span>
          )}
          <span className="text-stone-400">{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open && (
        <div className="border border-stone-200 rounded-2xl rounded-t-none overflow-hidden bg-white">
          {/* Presence bar */}
          {presence.length > 0 && (
            <div className="px-4 py-2 bg-stone-50 border-b border-stone-100 flex items-center gap-1.5 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-stone-500">
                {presence
                  .slice(0, 5)
                  .map((p) => p.displayName ?? p.clientId.slice(0, 8))
                  .join(", ")}
                {presence.length > 5 && ` +${presence.length - 5} more`}{" "}
                online
              </span>
            </div>
          )}

          {/* Message list */}
          <div className="h-72 overflow-y-auto p-4 space-y-3">
            {!historyLoaded ? (
              <p className="text-xs text-stone-400 text-center pt-8">Loading…</p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-stone-400 text-center pt-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender.id === viewerId;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar */}
                    {msg.sender.avatarUrl ? (
                      <img
                        src={msg.sender.avatarUrl}
                        alt=""
                        className="w-7 h-7 rounded-full shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-stone-200 shrink-0 mt-0.5 flex items-center justify-center text-xs font-medium text-stone-500">
                        {msg.sender.displayName[0]}
                      </div>
                    )}

                    <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                      {!isOwn && (
                        <span className="text-xs text-stone-400 mb-0.5 ml-1">
                          {msg.sender.displayName}
                        </span>
                      )}
                      <div
                        className={`group relative px-3 py-2 rounded-2xl text-sm ${
                          isOwn
                            ? "bg-stone-900 text-white rounded-tr-sm"
                            : "bg-stone-100 text-stone-900 rounded-tl-sm"
                        }`}
                      >
                        {msg.body}
                        {isOwn && msg.body !== "[Message deleted]" && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="absolute -top-5 right-0 text-xs text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            delete
                          </button>
                        )}
                      </div>
                      <span className="text-xs text-stone-300 mt-0.5 mx-1">
                        {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-stone-100 flex gap-2">
            <input
              value={input}
              onChange={(e: any) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Message the group…"
              maxLength={2000}
              className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-700 disabled:opacity-40 transition-colors"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
