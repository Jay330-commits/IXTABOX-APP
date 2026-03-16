"use client";

import { useState } from "react";

export type Message = {
  id: string;
  sender: "owner" | "renter";
  text: string;
  createdAt: string;
};

export type MessageThread = {
  bookingId: string;
  renterName: string;
  renterEmail?: string;
  bookingDates: string;
  boxModel: string;
  messages: Message[];
  unreadCount: number;
};

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-3 text-base min-h-[48px] md:min-h-0 md:py-2.5 md:text-sm text-white placeholder-slate-500 focus:border-cyan-500/70 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors touch-manipulation";

function lastMessagePreview(thread: MessageThread): string {
  if (thread.messages.length === 0) return "No messages yet";
  const last = thread.messages[thread.messages.length - 1];
  const prefix = last.sender === "renter" ? "" : "You: ";
  const text = last.text.slice(0, 60);
  return prefix + (last.text.length > 60 ? text + "…" : text);
}

export default function OwnerMessagesSection({
  threads,
  onSendMessage,
  onMarkRead,
}: {
  threads: MessageThread[];
  onSendMessage: (bookingId: string, text: string) => void;
  onMarkRead: (bookingId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const selected = threads.find((t) => t.bookingId === selectedId);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !selectedId) return;
    onSendMessage(selectedId, text);
    setDraft("");
  };

  // Full thread view: Back + conversation + reply
  if (selected) {
    return (
      <section className="flex flex-col min-h-[400px]">
        <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-800/30 px-4 py-3 sticky top-0 z-10">
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setDraft("");
            }}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors touch-manipulation"
            aria-label="Back to messages"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-white truncate">{selected.renterName}</p>
            <p className="text-xs text-slate-500 truncate">{selected.bookingDates} · {selected.boxModel}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {selected.messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "owner" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.sender === "owner"
                    ? "rounded-br-md bg-cyan-500/20 text-cyan-100"
                    : "rounded-bl-md bg-slate-700/80 text-slate-200"
                }`}
              >
                <p>{m.text}</p>
                <p className="mt-1 text-xs opacity-70">{new Date(m.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 p-4 md:p-5 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a message…"
              className={inputClass}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!draft.trim()}
              className="shrink-0 min-h-[48px] touch-manipulation rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-400 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </section>
    );
  }

  // List view: person name + message preview, tap to open full thread
  return (
    <section>
      <ul className="divide-y divide-slate-800">
        {threads.length === 0 ? (
          <li className="py-8 text-center text-sm text-slate-500">
            No conversations yet. Messages from renters will appear here after they book.
          </li>
        ) : (
          threads.map((t) => (
            <li key={t.bookingId}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(t.bookingId);
                  if (t.unreadCount > 0) onMarkRead(t.bookingId);
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-800/50 active:bg-slate-800/70 transition-colors touch-manipulation min-h-[44px]"
              >
                <p className="font-medium text-white truncate">{t.renterName}</p>
                <p className="mt-0.5 text-sm text-slate-400 line-clamp-2">{lastMessagePreview(t)}</p>
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
