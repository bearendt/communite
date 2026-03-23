"use client";
// apps/web/app/(app)/events/[id]/manage/_components/EventControls.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "DRAFT" | "PUBLISHED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "SUSPENDED";

type Props = {
  eventId: string;
  status: Status;
  startsAt: string;
};

export default function EventControls({ eventId, status, startsAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [safetyCode, setSafetyCode] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function action(name: string) {
    setLoading(name);
    setError(null);

    try {
      // publish and cancel go through PATCH /api/events/[id] action endpoint
      if (name === "publish" || name === "cancel") {
        const res = await fetch(`/api/events/${eventId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: name }),
        });
        const json = await res.json() as any;
        if (!res.ok) { setError(json.error); return; }
        router.refresh();
        return;
      }

      // start and end go through the safety endpoint
      const res = await fetch(`/api/events/${eventId}/safety`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: name }),
      });
      const json = await res.json() as any;
      if (!res.ok) { setError(json.error); return; }

      if (name === "start" && json.data?.safetyCode) {
        setSafetyCode(json.data.safetyCode);
      }

      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(null);
    }
  }

  const isUpcoming = new Date(startsAt) > new Date();

  return (
    <section className="bg-white border border-stone-100 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-stone-900 mb-4">Event Controls</h2>

      {/* Safety code display after event starts */}
      {safetyCode && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4 text-center">
          <p className="text-sm text-green-800 font-medium mb-2">
            Event is live. Share this code with your guests at arrival:
          </p>
          <p className="text-4xl font-mono font-bold tracking-widest text-green-900">
            {safetyCode}
          </p>
          <p className="text-xs text-green-700 mt-2">
            Guests use this to check in via the Safety Tools panel
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="flex flex-wrap gap-3">
        {status === "DRAFT" && (
          <ActionButton
            label="Publish Event"
            description="Make it visible to guests"
            color="primary"
            loading={loading === "publish"}
            onClick={() => action("publish")}
          />
        )}

        {status === "PUBLISHED" && isUpcoming && (
          <>
            <ActionButton
              label="Start Event"
              description="Generates the safety check-in code"
              color="primary"
              loading={loading === "start"}
              onClick={() => action("start")}
            />
            <ActionButton
              label="Edit Details"
              description="Modify title, time, or location"
              color="secondary"
              loading={false}
              onClick={() => router.push(`/events/${eventId}/edit`)}
            />
          </>
        )}

        {status === "ACTIVE" && (
          <ActionButton
            label="End Event"
            description="Marks event complete, prompts reviews"
            color="primary"
            loading={loading === "end"}
            onClick={() => action("end")}
          />
        )}

        {["DRAFT", "PUBLISHED"].includes(status) && !confirmCancel && (
          <ActionButton
            label="Cancel Event"
            description="Notifies all confirmed guests"
            color="danger"
            loading={false}
            onClick={() => setConfirmCancel(true)}
          />
        )}

        {confirmCancel && (
          <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium text-red-800 mb-3">
              Are you sure? All confirmed guests will be notified of the cancellation.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmCancel(false); action("cancel"); }}
                disabled={loading === "cancel"}
                className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading === "cancel" ? "Cancelling..." : "Yes, cancel event"}
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                className="text-stone-600 text-sm px-4 py-2 rounded-lg border border-stone-200 hover:bg-stone-50"
              >
                Never mind
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ActionButton({
  label, description, color, loading, onClick,
}: {
  label: string;
  description: string;
  color: "primary" | "secondary" | "danger";
  loading: boolean;
  onClick: () => void;
}) {
  const cls = {
    primary: "bg-stone-900 text-white hover:bg-stone-700",
    secondary: "border border-stone-200 text-stone-700 hover:bg-stone-50",
    danger: "border border-red-200 text-red-600 hover:bg-red-50",
  }[color];

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex flex-col items-start px-5 py-3 rounded-xl text-left transition-colors disabled:opacity-50 ${cls}`}
    >
      <span className="text-sm font-medium">{loading ? "..." : label}</span>
      <span className={`text-xs mt-0.5 ${color === "primary" ? "text-stone-300" : "text-stone-400"}`}>
        {description}
      </span>
    </button>
  );
}
