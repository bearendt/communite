"use client";
import { useState } from "react";

type Props = {
  eventId: string;
  existingStatus: string | null;
  spotsLeft: number;
  requiresIdVerif: boolean;
  viewerIdVerified: boolean;
};

export default function RSVPButton({
  eventId, existingStatus, spotsLeft, requiresIdVerif, viewerIdVerified,
}: Props) {
  const [status, setStatus] = useState(existingStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (requiresIdVerif && !viewerIdVerified) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm">
        <p className="font-medium text-amber-800 mb-1">ID Verification Required</p>
        <p className="text-amber-700">
          This host requires guests to be ID-verified.{" "}
          <a href="/profile/verify" className="underline">Verify your identity</a> to attend.
        </p>
      </div>
    );
  }

  if (status === "CONFIRMED") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-800">
        ✓ You're confirmed for this gathering.
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        ⏳ Your RSVP is pending host confirmation.
      </div>
    );
  }

  if (status === "WAITLISTED") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
        You're on the waitlist. We'll notify you if a spot opens.
      </div>
    );
  }

  if (status === "REMOVED") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
        You've been removed from this event.
      </div>
    );
  }

  async function handleRSVP() {
    setLoading(true);
    const res = await fetch(`/api/events/${eventId}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json() as any;
    if (res.ok) {
      setStatus(json.data.rsvp.status);
      setMessage(json.data.message);
    } else {
      setMessage(json.error ?? "Something went wrong");
    }
    setLoading(false);
  }

  return (
    <div className="mb-6">
      <button
        onClick={handleRSVP}
        disabled={loading || spotsLeft <= 0}
        className="w-full bg-[#C2714F] text-white py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
      >
        {loading
          ? "Submitting…"
          : spotsLeft <= 0
          ? "Join Waitlist"
          : "Request to Attend"}
      </button>
      {message && <p className="text-sm text-gray-600 mt-2 text-center">{message}</p>}
    </div>
  );
}
