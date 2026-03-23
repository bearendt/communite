"use client";
// apps/web/app/admin/_components/AdminReportQueue.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";

type Report = {
  id: string;
  type: string;
  severity: string;
  description: string;
  status: string;
  createdAt: Date;
  filer: { id: string; displayName: string };
  subject: { id: string; displayName: string; isBanned: boolean } | null;
  event: { id: string; title: string; status: string } | null;
};

const SEVERITY_CONFIG = {
  CRITICAL: { cls: "bg-red-100 text-red-800 border-red-200",    label: "CRITICAL" },
  HIGH:     { cls: "bg-orange-50 text-orange-700 border-orange-200", label: "HIGH" },
  MEDIUM:   { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "MEDIUM" },
  LOW:      { cls: "bg-stone-50 text-stone-600 border-stone-200",  label: "LOW" },
};

export default function AdminReportQueue({ reports: initial }: { reports: Report[] }) {
  const router = useRouter();
  const [reports, setReports] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function act(reportId: string, action: "resolve" | "dismiss" | "escalate") {
    setLoading(`${reportId}-${action}`);

    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId,
        action,
        resolution: resolution || undefined,
      }),
    });

    setLoading(null);

    if (res.ok) {
      setReports((r) => r.filter((x) => x.id !== reportId));
      setExpanded(null);
      setResolution("");
    }
  }

  if (reports.length === 0) {
    return (
      <p className="text-sm text-stone-400 text-center py-8">
        ✓ No open reports
      </p>
    );
  }

  return (
    <ul className="space-y-2 max-h-[500px] overflow-y-auto">
      {reports.map((r) => {
        const sev = SEVERITY_CONFIG[r.severity as keyof typeof SEVERITY_CONFIG] ??
          SEVERITY_CONFIG.MEDIUM;
        const isExpanded = expanded === r.id;

        return (
          <li key={r.id} className={`border rounded-xl overflow-hidden ${isExpanded ? "border-stone-300" : "border-stone-100"}`}>
            {/* Summary row */}
            <button
              onClick={() => setExpanded(isExpanded ? null : r.id)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-stone-50 transition-colors"
            >
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${sev.cls}`}>
                {sev.label}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {r.type.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-stone-400">
                  by {r.filer.displayName}
                  {r.subject && ` → ${r.subject.displayName}`}
                  {r.event && ` @ ${r.event.title}`}
                </p>
              </div>
              <span className="text-xs text-stone-400 shrink-0">
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
              <span className="text-stone-300">{isExpanded ? "▲" : "▼"}</span>
            </button>

            {/* Detail panel */}
            {isExpanded && (
              <div className="border-t border-stone-100 p-4 space-y-4 bg-white">
                <p className="text-sm text-stone-700 leading-relaxed">{r.description}</p>

                {r.subject?.isBanned && (
                  <p className="text-xs bg-red-50 text-red-700 rounded px-2 py-1">
                    ⚠️ Subject is already banned
                  </p>
                )}

                <div className="flex gap-2 flex-wrap text-xs">
                  {r.subject && (
                    <a href={`/profile/${r.subject.id}`} className="text-blue-600 underline">
                      View profile →
                    </a>
                  )}
                  {r.event && (
                    <a href={`/events/${r.event.id}/manage`} className="text-blue-600 underline">
                      View event →
                    </a>
                  )}
                </div>

                <textarea
                  value={resolution}
                  onChange={(e: any) => setResolution(e.target.value)}
                  placeholder="Resolution notes (optional for dismiss, required for resolve)"
                  rows={2}
                  className="w-full text-sm rounded-lg border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
                />

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => act(r.id, "resolve")}
                    disabled={!!loading}
                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading === `${r.id}-resolve` ? "…" : "✓ Resolve"}
                  </button>
                  <button
                    onClick={() => act(r.id, "escalate")}
                    disabled={!!loading}
                    className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 disabled:opacity-50"
                  >
                    {loading === `${r.id}-escalate` ? "…" : "↑ Escalate"}
                  </button>
                  <button
                    onClick={() => act(r.id, "dismiss")}
                    disabled={!!loading}
                    className="text-xs border border-stone-200 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50 disabled:opacity-50"
                  >
                    {loading === `${r.id}-dismiss` ? "…" : "Dismiss"}
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
