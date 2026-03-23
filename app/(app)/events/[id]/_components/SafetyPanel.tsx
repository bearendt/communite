"use client";
import { useState } from "react";

type Props = { eventId: string; isHost: boolean };

export default function SafetyPanel({ eventId, isHost }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"checkin" | "escalate">("checkin");
  const [code, setCode] = useState("");
  const [desc, setDesc] = useState("");
  const [severity, setSeverity] = useState<"MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const body = mode === "checkin"
      ? { action: "checkin", safetyCode: code.toUpperCase() }
      : { action: "escalate", description: desc, severity };

    const res = await fetch(`/api/events/${eventId}/safety`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json() as any;
    setResult(json.data?.message ?? json.error ?? "Done");
    setLoading(false);
  }

  return (
    <div className="mt-8 border border-gray-200 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 text-sm font-medium">
        <span>🛡️ Safety Tools</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="p-5 space-y-4">
          <div className="flex gap-3 text-sm">
            <button onClick={() => setMode("checkin")}
              className={`px-3 py-1.5 rounded-lg ${mode === "checkin" ? "bg-[#C2714F] text-white" : "bg-gray-100"}`}>
              Check In
            </button>
            <button onClick={() => setMode("escalate")}
              className={`px-3 py-1.5 rounded-lg ${mode === "escalate" ? "bg-red-500 text-white" : "bg-gray-100"}`}>
              Report Issue
            </button>
          </div>

          {mode === "checkin" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Enter the 6-character safety code from your host.</p>
              <input value={code} onChange={(e: any) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123" maxLength={6}
                className="input font-mono text-lg tracking-widest uppercase" />
            </div>
          )}

          {mode === "escalate" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-medium text-red-600">
                CRITICAL severity will immediately suspend the event and alert our safety team.
              </p>
              <select value={severity} onChange={(e: any) => setSeverity(e.target.value as typeof severity)}
                className="input">
                <option value="MEDIUM">Medium — Uncomfortable situation</option>
                <option value="HIGH">High — Serious concern</option>
                <option value="CRITICAL">CRITICAL — Immediate safety risk</option>
              </select>
              <textarea value={desc} onChange={(e: any) => setDesc(e.target.value)}
                placeholder="Describe what's happening..." rows={3} className="input" />
            </div>
          )}

          {result ? (
            <p className="text-sm font-medium text-green-700 bg-green-50 rounded-lg px-4 py-3">{result}</p>
          ) : (
            <button onClick={submit} disabled={loading}
              className="bg-[#C2714F] text-white px-5 py-2 rounded-lg text-sm disabled:opacity-50">
              {loading ? "Submitting…" : mode === "checkin" ? "Check In" : "Submit Report"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
