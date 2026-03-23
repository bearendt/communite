// apps/web/app/(app)/events/page.tsx
// Public event discovery — no auth required to browse
// Address hidden until RSVP confirmed

import { prisma } from "@/lib/db";
import Link from "next/link";
import type { EventType } from "@/lib/db";

export const metadata = { title: "Find Gatherings" };

const EVENT_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  POTLUCK:          { label: "Potluck",            emoji: "🍲" },
  WINE_TASTING:     { label: "Wine Tasting",       emoji: "🍷" },
  FARM_TO_TABLE:    { label: "Farm-to-Table",      emoji: "🌿" },
  BLUE_ZONE:        { label: "Blue Zone",          emoji: "🫐" },
  CULTURAL_EXCHANGE:{ label: "Cultural Exchange",  emoji: "🌍" },
  ETHICAL_DINING:   { label: "Ethical Dining",     emoji: "♻️" },
  WELCOME_NEIGHBOR: { label: "Welcome Neighbor",   emoji: "🏘" },
};

type SearchParams = {
  type?: string;
  city?: string;
  from?: string;
};

async function getEvents(filters: SearchParams) {
  const now = new Date();

  return prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      isPrivate: false,
      startsAt: {
        gte: filters.from ? new Date(filters.from) : now,
      },
      ...(filters.type && { eventType: filters.type as EventType }),
      ...(filters.city && {
        city: { contains: filters.city, mode: "insensitive" as const },
      }),
    },
    orderBy: { startsAt: "asc" },
    take: 30,
    select: {
      id: true,
      title: true,
      description: true,
      eventType: true,
      theme: true,
      maxGuests: true,
      city: true,
      state: true,
      startsAt: true,
      requiresIdVerif: true,
      host: {
        select: {
          displayName: true,
          trustScore: true,
          role: true,
        },
      },
      _count: { select: { rsvps: { where: { status: "CONFIRMED" } } } },
    },
  });
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const events = await getEvents(searchParams);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-stone-900">Find a Gathering</h1>
        <p className="text-stone-500 mt-1">
          Non-transactional potlucks and community meals near you.
          No money changes hands — just good food and real connection.
        </p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 mb-8">
        {/* Event type filter */}
        <select
          name="type"
          defaultValue={searchParams.type ?? ""}
          className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white"
        >
          <option value="">All types</option>
          {Object.entries(EVENT_TYPE_LABELS).map(([val, cfg]) => (
            <option key={val} value={val}>{cfg.emoji} {cfg.label}</option>
          ))}
        </select>

        {/* City filter */}
        <input
          name="city"
          type="text"
          placeholder="City..."
          defaultValue={searchParams.city ?? ""}
          className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
        />

        <button
          type="submit"
          className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-700"
        >
          Filter
        </button>

        {(searchParams.type || searchParams.city) && (
          <Link
            href="/events"
            className="px-4 py-2 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Results */}
      {events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🍽</p>
          <h2 className="text-lg font-semibold text-stone-700">No gatherings found</h2>
          <p className="text-sm text-stone-400 mt-1">
            Try adjusting your filters, or be the first to{" "}
            <Link href="/events/new" className="underline text-stone-600">
              host one
            </Link>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => {
            const cfg = EVENT_TYPE_LABELS[event.eventType] ?? { label: event.eventType, emoji: "🍴" };
            const confirmedCount = event._count.rsvps;
            const spotsLeft = event.maxGuests - confirmedCount;
            const isFull = spotsLeft <= 0;

            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="bg-white border border-stone-100 rounded-2xl p-5 hover:border-stone-300 hover:shadow-sm transition-all group"
              >
                {/* Type badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium bg-stone-50 text-stone-600 px-2.5 py-1 rounded-full">
                    {cfg.emoji} {cfg.label}
                  </span>
                  {event.requiresIdVerif && (
                    <span className="text-xs text-stone-400">🪪 ID required</span>
                  )}
                </div>

                {/* Title */}
                <h2 className="font-semibold text-stone-900 group-hover:text-[#C2714F] transition-colors line-clamp-2 mb-1">
                  {event.title}
                </h2>
                {event.theme && (
                  <p className="text-xs text-stone-400 mb-2">Theme: {event.theme}</p>
                )}
                <p className="text-xs text-stone-500 line-clamp-2 mb-4">
                  {event.description}
                </p>

                {/* Meta */}
                <div className="space-y-1.5 text-xs text-stone-500">
                  <div className="flex items-center gap-1.5">
                    <span>📅</span>
                    <span>
                      {new Date(event.startsAt).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric",
                        hour: "numeric", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>📍</span>
                    <span>{event.city}, {event.state}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5">
                      <span>👤</span>
                      <span>
                        {event.host.displayName}
                        {event.host.role === "SUPER_HOST" && " ⭐"}
                      </span>
                    </div>
                    <span className={`font-medium ${isFull ? "text-stone-400" : spotsLeft <= 3 ? "text-amber-600" : "text-green-700"}`}>
                      {isFull ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {events.length === 30 && (
        <p className="text-center text-sm text-stone-400 mt-8">
          Showing first 30 results. Use filters to narrow down.
        </p>
      )}
    </main>
  );
}
