"use client";
// apps/web/app/(app)/events/map/page.tsx
// Google Maps event discovery with live radius filter.
// Geolocation → fetch nearby events → render markers + sidebar list.

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import Link from "next/link";

type EventPin = {
  id: string;
  title: string;
  eventType: string;
  startsAt: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  spotsLeft: number;
  host: { displayName: string; trustScore: number };
};

const EVENT_TYPE_EMOJI: Record<string, string> = {
  POTLUCK: "🍲",
  WINE_TASTING: "🍷",
  FARM_TO_TABLE: "🌿",
  BLUE_ZONE: "🫐",
  CULTURAL_EXCHANGE: "🌍",
  ETHICAL_DINING: "♻️",
  WELCOME_NEIGHBOR: "🏘",
};

const LOADER = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  version: "weekly",
  libraries: ["marker", "geometry"],
});

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const circleRef = useRef<google.maps.Circle | null>(null);

  const [events, setEvents] = useState<EventPin[]>([]);
  const [selected, setSelected] = useState<EventPin | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch events from the API
  const fetchEvents = useCallback(
    async (lat: number, lng: number, radius: number) => {
      setLoading(true);
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radiusKm: radius.toString(),
        limit: "50",
      });
      const res = await fetch(`/api/events?${params}`);
      if (res.ok) {
        const json = await res.json() as any;
        setEvents(json.data.events);
      }
      setLoading(false);
    },
    []
  );

  // Init map once
  useEffect(() => {
    if (!mapRef.current) return;

    LOADER.load().then(async () => {
      const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;

      // Default center: Charlottesville, VA (Phase 1 launch city)
      const defaultCenter = { lat: 38.0293, lng: -78.4767 };

      const map = new Map(mapRef.current!, {
        center: defaultCenter,
        zoom: 11,
        mapId: "communite-events",
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          // Subtle map style — muted colors, focus on content
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "simplified" }] },
        ],
      });

      mapInstanceRef.current = map;

      // Try to get user location
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            setUserPos({ lat, lng });
            map.setCenter({ lat, lng });
            fetchEvents(lat, lng, radiusKm);

            // User location dot
            const userMarker = document.createElement("div");
            userMarker.innerHTML = `<div style="
              width:14px;height:14px;background:#4285F4;border-radius:50%;
              border:2px solid white;box-shadow:0 2px 8px rgba(66,133,244,0.5);
            "></div>`;

            new (google.maps.marker.AdvancedMarkerElement as unknown as new (opts: object) => google.maps.marker.AdvancedMarkerElement)({
              map,
              position: { lat, lng },
              content: userMarker,
              title: "Your location",
            });
          },
          () => {
            setLocationError("Enable location for nearby events, or browse the map.");
            fetchEvents(defaultCenter.lat, defaultCenter.lng, radiusKm);
          }
        );
      } else {
        fetchEvents(defaultCenter.lat, defaultCenter.lng, radiusKm);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw radius circle
  useEffect(() => {
    if (!mapInstanceRef.current || !userPos) return;

    circleRef.current?.setMap(null);
    circleRef.current = new google.maps.Circle({
      map: mapInstanceRef.current,
      center: userPos,
      radius: radiusKm * 1000, // km → meters
      fillColor: "#C2714F",
      fillOpacity: 0.05,
      strokeColor: "#C2714F",
      strokeOpacity: 0.3,
      strokeWeight: 1,
    });
  }, [userPos, radiusKm]);

  // Place / refresh event markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    events.forEach((event) => {
      const emoji = EVENT_TYPE_EMOJI[event.eventType] ?? "🍴";
      const isFull = event.spotsLeft <= 0;

      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          background:${isFull ? "#e5e7eb" : "#1c1917"};
          color:${isFull ? "#9ca3af" : "white"};
          padding:6px 10px;border-radius:20px;
          font-size:12px;font-weight:600;
          box-shadow:0 2px 8px rgba(0,0,0,0.2);
          cursor:pointer;white-space:nowrap;
          display:flex;align-items:center;gap:4px;
        ">
          <span>${emoji}</span>
          <span>${isFull ? "Full" : `${event.spotsLeft} left`}</span>
        </div>
      `;

      const marker = new (google.maps.marker.AdvancedMarkerElement as unknown as new (opts: object) => google.maps.marker.AdvancedMarkerElement)({
        map: mapInstanceRef.current!,
        position: { lat: event.lat, lng: event.lng },
        content: el,
        title: event.title,
      });

      marker.addListener("click", () => {
        setSelected(event);
        mapInstanceRef.current!.panTo({ lat: event.lat, lng: event.lng });
      });

      markersRef.current.push(marker);
    });
  }, [events]);

  // Re-fetch when radius changes
  useEffect(() => {
    if (!userPos) return;
    fetchEvents(userPos.lat, userPos.lng, radiusKm);
  }, [radiusKm, userPos, fetchEvents]);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-80 shrink-0 flex flex-col bg-white border-r border-stone-100 overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-stone-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-stone-900">
              {loading ? "Loading…" : `${events.length} gathering${events.length !== 1 ? "s" : ""}`}
            </h2>
            <Link
              href="/events/new"
              className="text-xs bg-stone-900 text-white px-2.5 py-1 rounded-full hover:bg-stone-700"
            >
              + Host
            </Link>
          </div>

          {locationError && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 mb-2">
              📍 {locationError}
            </p>
          )}

          <div>
            <div className="flex justify-between text-xs text-stone-500 mb-1">
              <span>Radius</span>
              <span>{radiusKm} km</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={radiusKm}
              onChange={(e: any) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-stone-900"
            />
          </div>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto">
          {events.length === 0 && !loading ? (
            <div className="text-center py-12 px-4">
              <p className="text-2xl mb-2">🍽</p>
              <p className="text-sm text-stone-400">No events in this area yet.</p>
              <Link href="/events/new" className="text-xs text-stone-600 underline mt-1 block">
                Be the first to host
              </Link>
            </div>
          ) : (
            events.map((event) => (
              <button
                key={event.id}
                onClick={() => {
                  setSelected(event);
                  mapInstanceRef.current?.panTo({ lat: event.lat, lng: event.lng });
                  mapInstanceRef.current?.setZoom(14);
                }}
                className={`w-full text-left p-4 border-b border-stone-50 hover:bg-stone-50 transition-colors ${
                  selected?.id === event.id ? "bg-stone-50 border-l-2 border-l-[#C2714F]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">
                      {EVENT_TYPE_EMOJI[event.eventType]} {event.title}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {new Date(event.startsAt).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric",
                        hour: "numeric", minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-stone-400">{event.city}, {event.state}</p>
                  </div>
                  <span
                    className={`text-xs shrink-0 px-2 py-0.5 rounded-full ${
                      event.spotsLeft <= 0
                        ? "bg-stone-100 text-stone-400"
                        : event.spotsLeft <= 3
                        ? "bg-amber-50 text-amber-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    {event.spotsLeft <= 0 ? "Full" : `${event.spotsLeft} left`}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Selected event detail card */}
        {selected && (
          <div className="p-4 border-t border-stone-200 bg-white">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-stone-900 text-sm leading-tight">
                {selected.title}
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="text-stone-300 hover:text-stone-600 text-lg ml-2 shrink-0"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-stone-500 mb-1">
              Hosted by {selected.host.displayName} · Trust {selected.host.trustScore.toFixed(1)}
            </p>
            <p className="text-xs text-stone-400 mb-3">
              {new Date(selected.startsAt).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
                hour: "numeric", minute: "2-digit",
              })}
            </p>
            <Link
              href={`/events/${selected.id}`}
              className="w-full block text-center bg-stone-900 text-white text-sm py-2 rounded-xl hover:bg-stone-700 transition-colors"
            >
              View & RSVP →
            </Link>
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1" />
    </div>
  );
}
