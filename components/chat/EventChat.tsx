"use client";
// apps/web/components/chat/EventChat.tsx
// Real-time event chat via Ably.
// Only rendered for confirmed guests + host (enforced server-side on event detail page).

import { useRef, useEffect, useState, KeyboardEvent } from "react";
import { useChat } from "@/lib/hooks/useChat";
import type { ChatMessage } from "@/lib/ably";

type Props = {
  eventId: string;   // channelId — works for both event IDs and table IDs
  userId: string;
  userName?: string;
  channelType?: "EVENT" | "PRIVATE_TABLE";
  channelLabel?: string; // display name in header (defaults to "Event Chat")
};

export default function EventChat({
  eventId, userId, userName,
  channelType = "EVENT",
  channelLabel,
}: Props) {
  const { messages, presence, connected, loading, sending, hasMore, send, deleteMessage, loadMore } =
    useChat({ channelId: eventId, channelType, userId });

  const [input, setInput] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput("");
    await send(trimmed);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleDelete(messageId: string) {
    setDeletingId(messageId);
    await deleteMessage(messageId);
    setDeletingId(null);
  }

  const onlineCount = presence.length;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-stone-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-900">
            {channelLabel ?? "Event Chat"}
          </span>
          {onlineCount > 0 && (
            <span className="text-xs text-stone-400">
              · {onlineCount} online
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${connected ? "bg-green-400" : "bg-stone-300"}`} />
          <span className="text-xs text-stone-400">{connected ? "Live" : "Reconnecting…"}</span>
        </div>
      </div>

      {/* Presence avatars */}
      {presence.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-stone-50 bg-stone-50/50">
          <span className="text-xs text-stone-400 mr-1">Here now:</span>
          {presence.slice(0, 8).map((p) => (
            <div
              key={p.id}
              title={p.displayName}
              className="h-6 w-6 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600"
            >
              {p.displayName[0]?.toUpperCase()}
            </div>
          ))}
          {presence.length > 8 && (
            <span className="text-xs text-stone-400">+{presence.length - 8}</span>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
        style={{ maxHeight: "400px" }}
      >
        {hasMore && (
          <button
            onClick={loadMore}
            className="w-full text-xs text-stone-400 hover:text-stone-600 py-2"
          >
            Load earlier messages
          </button>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-stone-300 text-sm">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender.id === userId}
              isDeleting={deletingId === msg.id}
              onDelete={() => handleDelete(msg.id)}
            />
          ))
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-stone-100 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e: any) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            maxLength={2000}
            rows={1}
            disabled={!connected || sending}
            className="flex-1 resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 disabled:opacity-50 disabled:bg-stone-50"
            style={{ minHeight: "38px", maxHeight: "120px" }}
            onInput={(e) => {
              // Auto-grow
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !connected || sending}
            className="h-9 w-9 rounded-xl bg-stone-900 text-white flex items-center justify-center hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            aria-label="Send message"
          >
            {sending ? (
              <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M13 1L1 7l4.5 1.5L13 1zm0 0L8.5 13 6 8.5 13 1z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-stone-300 mt-1.5 px-1">
          Shift+Enter for new line · Chat is shared with all confirmed guests
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  message, isOwn, isDeleting, onDelete,
}: {
  message: ChatMessage;
  isOwn: boolean;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`flex items-end gap-2 group ${isOwn ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className="h-7 w-7 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600 shrink-0 mb-0.5">
          {message.sender.displayName[0]?.toUpperCase()}
        </div>
      )}

      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        {/* Sender name (others only) */}
        {!isOwn && (
          <span className="text-xs text-stone-400 ml-1">{message.sender.displayName}</span>
        )}

        <div className="flex items-end gap-1.5">
          {/* Delete button — own messages only */}
          {isOwn && showActions && (
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="text-stone-300 hover:text-red-400 text-xs mb-1"
              aria-label="Delete message"
            >
              {isDeleting ? "…" : "✕"}
            </button>
          )}

          {/* Bubble */}
          <div
            className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
              isOwn
                ? "bg-stone-900 text-white rounded-br-sm"
                : "bg-stone-100 text-stone-900 rounded-bl-sm"
            }`}
          >
            {message.body}
          </div>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-stone-300 mx-1">
          {new Date(message.createdAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
