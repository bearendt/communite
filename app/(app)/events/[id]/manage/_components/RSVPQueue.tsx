"use client";
// apps/web/app/(app)/events/[id]/manage/_components/RSVPQueue.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";

type Guest = {
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    trustScore: number;
    idVerified: boolean;
    phoneVerified: boolean;
    tier: string;
    dietaryNotes: string | null;
  };
  status: string;
  note: string | null;
  checkedIn: boolean;
  createdAt?: string;
};

type Props = {
  eventId: string;
  rsvpsByStatus: {
    PENDING: Guest[];
    CONFIRMED: Guest[];
    WAITLISTED: Guest[];
    DECLINED: Guest[];
  };
  spotsLeft: number;
};

type Tab = "PENDING" | "CONFIRMED" | "WAITLISTED" | "DECLINED";

export default function RSVPQueue({ eventId, rsvpsByStatus, spotsLeft }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("PENDING");
  const [loading, setLoading] = useState<string | null>(null);

  async function updateRSVP(guestId: string, status: "CONFIRMED" | "DECLINED" | "REMOVED") {
    setLoading(guestId);
    const res = await fetch(`/api/events/${eventId}/rsvp`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, status }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
  }

  const guests = rsvpsByStatus[tab];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "PENDING", label: "Pending", count: rsvpsByStatus.PENDING.length },
    { key: "CONFIRMED", label: "Confirmed", count: rsvpsByStatus.CONFIRMED.length },
    { key: "WAITLISTED", label: "Waitlisted", count: rsvpsByStatus.WAITLISTED.length },
    { key: "DECLINED", label: "Declined", count: rsvpsByStatus.DECLINED.length },
  ];

  return (
    <section className="bg-white border border-stone-100 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-stone-900 mb-4">Guest RSVPs</h2>

      {spotsLeft <= 0 && tab === "PENDING" && rsvpsByStatus.PENDING.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-amber-800 mb-4">
          Event is full. Confirming a pending guest will move them to confirmed — consider removing from the waitlist or increasing your max.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-stone-100">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key
                ? "bg-stone-900 text-white"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-stone-700 text-stone-300" : "bg-stone-100 text-stone-600"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {guests.length === 0 ? (
        <p className="text-sm text-stone-400 py-4 text-center">No {tab.toLowerCase()} guests</p>
      ) : (
        <ul className="space-y-3">
          {guests.map((g) => (
            <li key={g.user.id} className="flex items-start justify-between gap-4 p-4 bg-stone-50 rounded-xl">
              <div className="flex items-start gap-3 min-w-0">
                {g.user.avatarUrl ? (
                  <img src={g.user.avatarUrl} alt="" className="w-9 h-9 rounded-full shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-stone-200 shrink-0 flex items-center justify-center text-stone-500 text-sm font-medium">
                    {g.user.displayName[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-stone-900">{g.user.displayName}</p>
                    <div className="flex gap-1">
                      {g.user.idVerified && (
                        <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">ID ✓</span>
                      )}
                      {g.user.phoneVerified && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">📱 ✓</span>
                      )}
                      {g.user.tier === "SUNDAY_TABLE" && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">☀️</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Trust: {g.user.trustScore.toFixed(1)}
                    {g.checkedIn && " · ✓ Checked in"}
                  </p>
                  {g.user.dietaryNotes && (
                    <p className="text-xs text-stone-600 mt-1 bg-white rounded-lg px-2 py-1">
                      🥗 {g.user.dietaryNotes}
                    </p>
                  )}
                  {g.note && (
                    <p className="text-xs text-stone-500 mt-1 italic">"{g.note}"</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                {tab === "PENDING" && (
                  <>
                    <button
                      onClick={() => updateRSVP(g.user.id, "CONFIRMED")}
                      disabled={loading === g.user.id}
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => updateRSVP(g.user.id, "DECLINED")}
                      disabled={loading === g.user.id}
                      className="text-xs border border-stone-200 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </>
                )}
                {tab === "WAITLISTED" && (
                  <button
                    onClick={() => updateRSVP(g.user.id, "CONFIRMED")}
                    disabled={loading === g.user.id}
                    className="text-xs bg-stone-900 text-white px-3 py-1.5 rounded-lg hover:bg-stone-700 disabled:opacity-50"
                  >
                    Move up
                  </button>
                )}
                {tab === "CONFIRMED" && (
                  <button
                    onClick={() => updateRSVP(g.user.id, "REMOVED")}
                    disabled={loading === g.user.id}
                    className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
