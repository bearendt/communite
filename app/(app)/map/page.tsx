// apps/web/app/(app)/map/page.tsx
// Map-based event discovery.
// Server renders initial events (no coords yet) for fast paint.
// Client takes over with geolocation + radius filtering.

import { prisma } from "@/lib/db";
import EventsMap from "@/components/maps/EventsMap";

export const metadata = { title: "Find Gatherings Near You" };

// Fetch upcoming published events for initial render
async function getInitialEvents() {
  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      isPrivate: false,
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 100,
    select: {
      id: true,
      title: true,
      eventType: true,
      city: true,
      state: true,
      startsAt: true,
      lat: true,
      lng: true,
      maxGuests: true,
      requiresIdVerif: true,
      host: { select: { displayName: true } },
      _count: { select: { rsvps: { where: { status: "CONFIRMED" } } } },
    },
  });

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    eventType: e.eventType,
    city: e.city,
    state: e.state,
    startsAt: e.startsAt.toISOString(),
    lat: e.lat,
    lng: e.lng,
    spotsLeft: Math.max(0, e.maxGuests - e._count.rsvps),
    hostName: e.host.displayName,
    requiresIdVerif: e.requiresIdVerif,
  }));
}

export default async function MapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full text-stone-400 text-sm">
        Google Maps API key not configured
      </div>
    );
  }

  const initialEvents = await getInitialEvents();

  return (
    <div style={{ height: "calc(100vh - 64px)" }}>
      <EventsMap apiKey={apiKey} initialEvents={initialEvents} />
    </div>
  );
}
