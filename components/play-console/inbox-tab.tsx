"use client";

import { useState, useMemo } from "react";
import { AlertCircle, Info, CheckCheck, RefreshCw, ExternalLink, ShieldAlert, BellRing, Filter, Search } from "lucide-react";

interface InboxMessage {
  id: string;
  category: "IMPORTANT" | "EVERYTHING_ELSE";
  title: string;
  summary: string;
  body?: string;
  severity: "CRITICAL" | "WARNING" | "INFO" | string;
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
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-zinc-900 dark:text-zinc-100" />
        <p className="text-sm font-medium">Loading console inbox...</p>
      </div>
    );
  }

  const handleMarkRead = async (id?: string, markAll = false) => {
    if (id) setMarkingId(id);
    try {
      await fetch("/api/v1/play-console/inbox/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: id, markAll, isRead: true })
      });
      onRefresh();
    } catch {
      // fallback
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
    } finally {
      setMarkingId(null);
    }
  };

  const allMessages = [...data.important, ...data.everythingElse];

  const filteredMessages = allMessages.filter((msg) => {
    const matchesSearch =
      msg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.summary.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeCategory === "IMPORTANT") return matchesSearch && msg.category === "IMPORTANT";
    if (activeCategory === "UNREAD") return matchesSearch && !msg.isRead;
    return matchesSearch;
  });

  const renderSeverityBadge = (severity: string) => {
    const sev = severity.toUpperCase();
    if (sev === "CRITICAL" || sev === "WARNING") {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 uppercase tracking-wider">
          {sev}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 uppercase tracking-wider">
        INFO
      </span>
    );
  };

  const renderMessageCard = (item: InboxMessage) => {
    const isImportant = item.category === "IMPORTANT";
    const isExpanded = readingId === item.id;

    return (
      <div
        key={item.id}
        onClick={() => {
          if (!item.isRead) handleMarkRead(item.id);
          setReadingId(isExpanded ? null : item.id);
        }}
        className={`group bg-white dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs ${
          !item.isRead ? "ring-1 ring-zinc-900/20 dark:ring-zinc-100/20 bg-zinc-50/70 dark:bg-zinc-900/30" : ""
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Category Icon */}
            {isImportant ? (
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs mt-0.5 border border-amber-200 dark:border-amber-800/40">
                <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0 mt-0.5 border border-zinc-200 dark:border-zinc-700">
                <BellRing className="w-4 h-4" />
              </div>
            )}

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug group-hover:underline transition-colors">
                    {item.title}
                  </h4>
                  {renderSeverityBadge(item.severity)}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 sm:hidden">
                  <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">{item.dateLabel}</span>
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 shadow-2xs" title="Unread notification" />
                  )}
                </div>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {item.summary}
              </p>

              {/* Expandable Body */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 space-y-2.5 animate-in fade-in duration-150">
                  <p className="leading-relaxed">{item.body || item.summary}</p>
                  {item.actionUrl && (
                    <div className="pt-1">
                      <a
                        href={item.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg transition"
                      >
                        <span>Open in Google Play Console</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">{item.dateLabel}</span>
            {!item.isRead && (
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100 shadow-2xs" title="Unread notification" />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Developer Console Inbox</h2>
            {data.unreadCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shrink-0">
                {data.unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Official developer policy notices, pre-launch report bug summaries, and Vitals alerts</p>
        </div>

        {data.unreadCount > 0 && (
          <button
            onClick={() => handleMarkRead(undefined, true)}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer w-full sm:w-auto shrink-0"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 w-full sm:w-auto overflow-x-auto scrollbar-none">
          {[
            { id: "ALL", label: `All (${allMessages.length})` },
            { id: "IMPORTANT", label: `Important (${data.important.length})` },
            { id: "UNREAD", label: `Unread (${data.unreadCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap text-center ${
                activeCategory === tab.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search inbox..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-zinc-900 dark:text-zinc-100 font-medium"
          />
        </div>
      </div>

      {/* Messages Feed */}
      <div className="space-y-3">
        {filteredMessages.length > 0 ? (
          filteredMessages.map(renderMessageCard)
        ) : (
          <div className="p-12 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/90 dark:border-zinc-800">
            <Filter className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600 stroke-[1.5]" />
            <p className="font-medium text-zinc-500 dark:text-zinc-400">No developer notifications match your filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
