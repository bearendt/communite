"use client";
// apps/web/app/admin/_components/AdminUserSearch.tsx

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type UserResult = {
  id: string;
  displayName: string;
  email: string;
  role: string;
  tier: string;
  isBanned: boolean;
  trustScore: number;
  idVerified: boolean;
  createdAt: string;
  _count: {
    hostedEvents: number;
    rsvps: number;
    reportsFiled: number;
    reportsAbout: number;
  };
};

const ROLES = ["GUEST", "HOST", "SUPER_HOST", "ADMIN"] as const;

export default function AdminUserSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [banReason, setBanReason] = useState<Record<string, string>>({});
  const [showBanForm, setShowBanForm] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const json = await res.json() as any;
      setResults(json.data);
    }
    setLoading(false);
  }, []);

  async function adminAction(
    userId: string,
    action: "ban" | "unban" | "set_role",
    extras: Record<string, unknown> = {}
  ) {
    setActionLoading(`${userId}-${action}`);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId, ...extras }),
    });
    setActionLoading(null);
    if (res.ok) {
      search(query); // refresh
      setShowBanForm(null);
      setBanReason((r) => { const c = { ...r }; delete c[userId]; return c; });
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search by name or email…"
        value={query}
        onChange={(e: any) => {
          setQuery(e.target.value);
          search(e.target.value);
        }}
        className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
      />

      {loading && <p className="text-sm text-stone-400">Searching…</p>}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((u) => (
            <li key={u.id} className="border border-stone-100 rounded-xl overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                {/* Avatar placeholder */}
                <div className="w-9 h-9 rounded-full bg-stone-200 shrink-0 flex items-center justify-center text-sm font-medium text-stone-500">
                  {u.displayName[0]}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-stone-900">{u.displayName}</p>
                    {u.isBanned && (
                      <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100">
                        BANNED
                      </span>
                    )}
                    <span className="text-xs bg-stone-50 text-stone-500 px-2 py-0.5 rounded-full">
                      {u.role}
                    </span>
                    {u.tier === "SUNDAY_TABLE" && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                        ☀️ Sunday Table
                      </span>
                    )}
                    {u.idVerified && (
                      <span className="text-xs text-green-700">ID ✓</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">{u.email}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Trust: {u.trustScore.toFixed(1)} ·
                    {u._count.hostedEvents} events hosted ·
                    {u._count.reportsAbout} reports about them ·
                    Joined {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {/* Role selector */}
                  <select
                    value={u.role}
                    onChange={(e: any) => adminAction(u.id, "set_role", { role: e.target.value })}
                    disabled={!!actionLoading}
                    className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>

                  {/* Ban / unban */}
                  {u.isBanned ? (
                    <button
                      onClick={() => adminAction(u.id, "unban")}
                      disabled={!!actionLoading}
                      className="text-xs bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-lg hover:bg-green-100 disabled:opacity-50"
                    >
                      {actionLoading === `${u.id}-unban` ? "…" : "Unban"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowBanForm(showBanForm === u.id ? null : u.id)}
                      className="text-xs bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-lg hover:bg-red-100"
                    >
                      Ban
                    </button>
                  )}
                </div>
              </div>

              {/* Ban form */}
              {showBanForm === u.id && (
                <div className="border-t border-stone-100 bg-red-50 p-4 space-y-3">
                  <p className="text-xs font-medium text-red-800">
                    Ban {u.displayName}? This will immediately block their access.
                  </p>
                  <textarea
                    value={banReason[u.id] ?? ""}
                    onChange={(e: any) =>
                      setBanReason((r) => ({ ...r, [u.id]: e.target.value }))
                    }
                    placeholder="Reason for ban (min 10 characters) *"
                    rows={2}
                    className="w-full text-sm rounded-lg border border-red-200 px-3 py-2 focus:outline-none bg-white resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        adminAction(u.id, "ban", { reason: banReason[u.id] })
                      }
                      disabled={
                        !banReason[u.id] ||
                        banReason[u.id].length < 10 ||
                        !!actionLoading
                      }
                      className="text-xs bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading === `${u.id}-ban` ? "Banning…" : "Confirm ban"}
                    </button>
                    <button
                      onClick={() => setShowBanForm(null)}
                      className="text-xs text-stone-600 px-4 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
