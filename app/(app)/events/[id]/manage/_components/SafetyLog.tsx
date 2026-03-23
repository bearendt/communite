"use client";
// apps/web/app/(app)/events/[id]/manage/_components/SafetyLog.tsx

type LogEntry = {
  id: string;
  type: string;
  actorId: string | null;
  payload: unknown;
  createdAt: Date;
};

const LOG_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  EVENT_STARTED:        { label: "Event started",       emoji: "🟢", color: "text-green-700" },
  EVENT_ENDED:          { label: "Event ended",         emoji: "⚫", color: "text-stone-500" },
  GUEST_CHECKED_IN:     { label: "Guest checked in",    emoji: "✓",  color: "text-green-600" },
  GUEST_REMOVED:        { label: "Guest removed",       emoji: "✕",  color: "text-red-600" },
  REPORT_FILED:         { label: "Report filed",        emoji: "📋", color: "text-amber-700" },
  ESCALATED:            { label: "ESCALATED",           emoji: "🚨", color: "text-red-700" },
  ADMIN_NOTIFIED:       { label: "Admin notified",      emoji: "📣", color: "text-red-600" },
  STATUS_CHANGED:       { label: "Status changed",      emoji: "🔄", color: "text-blue-600" },
  SAFETY_CODE_GENERATED:{ label: "Safety code issued",  emoji: "🔑", color: "text-stone-600" },
};

export default function SafetyLog({ logs }: { logs: LogEntry[] }) {
  return (
    <section className="bg-white border border-stone-100 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-stone-900 mb-4">Safety Activity Log</h2>
      <ol className="relative border-l border-stone-100 space-y-4 ml-2">
        {logs.map((log) => {
          const cfg = LOG_CONFIG[log.type] ?? { label: log.type, emoji: "•", color: "text-stone-500" };
          return (
            <li key={log.id} className="ml-4">
              <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-stone-200" />
              <div className="flex items-start gap-2">
                <span>{cfg.emoji}</span>
                <div>
                  <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-xs text-stone-400">
                    {new Date(log.createdAt).toLocaleString("en-US", {
                      month: "short", day: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })}
                    {log.actorId && ` · User ${log.actorId.slice(0, 8)}…`}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
