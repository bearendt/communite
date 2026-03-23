// apps/web/lib/proximity.ts
// PostGIS-powered proximity query for event discovery.
// Uses ST_DWithin on a geography column — spherical distance, accurate globally.
// Falls back to haversine if PostGIS is not available (dev / migration pending).
//
// BEFORE: filter events in-memory after fetching all of them (doesn't scale)
// AFTER:  filter at the DB level, only fetching events within the radius

import { prisma } from "@/lib/db";

export type NearbyEvent = {
  id: string;
  title: string;
  description: string;
  eventType: string;
  theme: string | null;
  maxGuests: number;
  city: string;
  state: string;
  lat: number;
  lng: number;
  startsAt: Date;
  endsAt: Date;
  requiresIdVerif: boolean;
  distanceKm: number;
  host: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    trustScore: number;
    role: string;
  };
  spotsLeft: number;
};

type QueryOptions = {
  lat: number;
  lng: number;
  radiusKm: number;
  eventType?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
};

/**
 * Query nearby events using PostGIS ST_DWithin.
 * Falls back to haversine if spatial column not yet populated.
 */
export async function getNearbyEvents(opts: QueryOptions): Promise<NearbyEvent[]> {
  const {
    lat, lng, radiusKm,
    eventType, from, to,
    page = 1, limit = 30,
  } = opts;

  const radiusMeters = radiusKm * 1000;
  const offset = (page - 1) * limit;
  const fromDate = from ?? new Date();

  // Use Prisma $queryRaw for the PostGIS query
  // ST_DWithin uses a geography column for accurate spherical distance
  try {
    type RawRow = {
      id: string;
      title: string;
      description: string;
      event_type: string;
      theme: string | null;
      max_guests: number;
      city: string;
      state: string;
      lat: number;
      lng: number;
      starts_at: Date;
      ends_at: Date;
      requires_id_verif: boolean;
      distance_m: number;
      host_id: string;
      host_display_name: string;
      host_avatar_url: string | null;
      host_trust_score: number;
      host_role: string;
      confirmed_rsvps: bigint;
    };

    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        e.id,
        e.title,
        e.description,
        e."eventType"             AS event_type,
        e.theme,
        e."maxGuests"             AS max_guests,
        e.city,
        e.state,
        e.lat,
        e.lng,
        e."startsAt"              AS starts_at,
        e."endsAt"                AS ends_at,
        e."requiresIdVerif"       AS requires_id_verif,
        ST_Distance(
          e.location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        )                         AS distance_m,
        u.id                      AS host_id,
        u."displayName"           AS host_display_name,
        u."avatarUrl"             AS host_avatar_url,
        u."trustScore"            AS host_trust_score,
        u.role                    AS host_role,
        COUNT(r.id) FILTER (WHERE r.status = 'CONFIRMED')  AS confirmed_rsvps
      FROM "Event" e
      JOIN "User" u ON u.id = e."hostId"
      LEFT JOIN "RSVP" r ON r."eventId" = e.id
      WHERE
        e.status = 'PUBLISHED'
        AND e."isPrivate" = false
        AND e."deletedAt" IS NULL
        AND e."startsAt" >= ${fromDate}
        ${to ? prisma.$queryRaw`AND e."startsAt" <= ${to}` : prisma.$queryRaw``}
        ${eventType ? prisma.$queryRaw`AND e."eventType" = ${eventType}` : prisma.$queryRaw``}
        AND e.location IS NOT NULL
        AND ST_DWithin(
          e.location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )
      GROUP BY e.id, u.id
      ORDER BY distance_m ASC, e."startsAt" ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      eventType: r.event_type,
      theme: r.theme,
      maxGuests: r.max_guests,
      city: r.city,
      state: r.state,
      lat: r.lat,
      lng: r.lng,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      requiresIdVerif: r.requires_id_verif,
      distanceKm: Math.round(r.distance_m / 100) / 10,
      host: {
        id: r.host_id,
        displayName: r.host_display_name,
        avatarUrl: r.host_avatar_url,
        trustScore: r.host_trust_score,
        role: r.host_role,
      },
      spotsLeft: Math.max(0, r.max_guests - Number(r.confirmed_rsvps)),
    }));
  } catch (err) {
    // PostGIS not yet enabled or location column not populated — fall back
    console.warn("[proximity] PostGIS query failed, falling back to haversine:", err);
    return haversineFallback(opts);
  }
}

// ---- Haversine fallback ----
// Used during development or before the PostGIS migration runs.
async function haversineFallback(opts: QueryOptions): Promise<NearbyEvent[]> {
  const { lat, lng, radiusKm, eventType, from, to, page = 1, limit = 30 } = opts;

  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      isPrivate: false,
      startsAt: { gte: from ?? new Date(), ...(to ? { lte: to } : {}) },
      ...(eventType ? { eventType: eventType as never } : {}),
    },
    take: limit * 5, // over-fetch for client-side filtering
    skip: (page - 1) * limit,
    orderBy: { startsAt: "asc" },
    select: {
      id: true, title: true, description: true, eventType: true,
      theme: true, maxGuests: true, city: true, state: true,
      lat: true, lng: true, startsAt: true, endsAt: true, requiresIdVerif: true,
      host: { select: { id: true, displayName: true, avatarUrl: true, trustScore: true, role: true } },
      _count: { select: { rsvps: { where: { status: "CONFIRMED" } } } },
    },
  });

  return events
    .map((e) => ({
      ...e,
      distanceKm: haversineKm(lat, lng, e.lat, e.lng),
      spotsLeft: Math.max(0, e.maxGuests - e._count.rsvps),
      host: e.host,
    }))
    .filter((e) => e.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
