"use client";
// apps/web/app/admin/hosts/_components/HostApplicationActions.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HostApplicationActions({
  userId,
  applicantName,
}: {
  userId: string;
  applicantName: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "approve" | "reject">(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!mode) return;
    setLoading(true);

    const res = await fetch("/api/host-application", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: mode, reason: reason || undefined }),
    });

    setLoading(false);

    if (res.ok) {
      setDone(true);
      router.refresh();
    }
  }

  if (done) {
    return (
      <p className="text-sm font-medium text-green-700">
        ✓ {mode === "approve" ? "Approved" : "Rejected"}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!mode ? (
        <div className="flex gap-3">
          <button
            onClick={() => setMode("approve")}
            className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Approve as Host
          </button>
          <button
            onClick={() => setMode("reject")}
            className="border border-stone-200 text-stone-600 text-sm px-4 py-2 rounded-lg hover:bg-stone-50"
          >
            Decline
          </button>
        </div>
      ) : (
        <div className="bg-stone-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-stone-800">
            {mode === "approve"
              ? `Approve ${applicantName} as a host?`
              : `Decline ${applicantName}'s application?`}
          </p>

          {mode === "reject" && (
            <textarea
              value={reason}
              onChange={(e: any) => setReason(e.target.value)}
              placeholder="Optional: brief reason (not shown to applicant in MVP)"
              rows={2}
              className="w-full text-sm rounded-lg border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={loading}
              className={`text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${
                mode === "approve"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {loading ? "…" : mode === "approve" ? "Confirm Approval" : "Confirm Decline"}
            </button>
            <button
              onClick={() => { setMode(null); setReason(""); }}
              className="text-sm text-stone-500 hover:text-stone-700 px-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
