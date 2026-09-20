"use client";

import { useState } from "react";
import { AlertCircle, Info, CheckCheck, RefreshCw, ExternalLink, ShieldAlert } from "lucide-react";

interface InboxMessage {
  id: string;
  category: "IMPORTANT" | "EVERYTHING_ELSE";
  title: string;
  summary: string;
  body?: string;
  severity: string;
  actionUrl?: string;
  isRead: boolean;
  dateLabel: string;
}

interface InboxData {
  important: InboxMessage[];
  everythingElse: InboxMessage[];
  unreadCount: number;
}

export function PlayConsoleInboxTab({ data, onRefresh }: { data: InboxData | null; onRefresh: () => void }) {
  const [readingId, setReadingId] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-zinc-900 dark:text-zinc-100" />
        <p className="text-sm font-medium">Loading console inbox...</p>
      </div>
    );
  }

  const handleMarkRead = async (id?: string, markAll = false) => {
    try {
      await fetch("/api/v1/play-console/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: id, markAllRead: markAll })
      });
      onRefresh();
    } catch {
      // ignore
    }
  };

  const renderMessageCard = (item: InboxMessage) => {
    const isImportant = item.category === "IMPORTANT";

    return (
      <div
        key={item.id}
        onClick={() => {
          if (!item.isRead) handleMarkRead(item.id);
          setReadingId(readingId === item.id ? null : item.id);
        }}
        className={`group bg-white dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs ${
          !item.isRead ? "ring-1 ring-zinc-900/20 dark:ring-zinc-100/20 bg-zinc-50/60 dark:bg-zinc-900/30" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Category Icon */}
            {isImportant ? (
              <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <span className="font-bold text-sm">!</span>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0 mt-0.5 border border-zinc-200 dark:border-zinc-700">
                <Info className="w-4 h-4" />
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug group-hover:underline transition-colors">
                {item.title}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {item.summary}
              </p>

              {/* Expandable Body */}
              {readingId === item.id && item.body && (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 space-y-2 animate-in fade-in duration-150">
                  <p>{item.body}</p>
                  {item.actionUrl && (
                    <a
                      href={item.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline pt-1"
                    >
                      <span>Open in Play Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">{item.dateLabel}</span>
            {!item.isRead && (
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100 shadow-2xs" title="Unread" />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Inbox</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Policy updates, pre-launch reports, and developer alerts</p>
        </div>

        {data.unreadCount > 0 && (
          <button
            onClick={() => handleMarkRead(undefined, true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Important Category */}
      {data.important.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span>Important</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </h3>
          <div className="space-y-3">
            {data.important.map(renderMessageCard)}
          </div>
        </div>
      )}

      {/* Everything else Category */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">Everything else</h3>
        {data.everythingElse.length > 0 ? (
          <div className="space-y-3">
            {data.everythingElse.map(renderMessageCard)}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
            No additional notifications.
          </div>
        )}
      </div>
    </div>
  );
}
