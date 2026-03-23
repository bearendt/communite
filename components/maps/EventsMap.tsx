"use client";
// apps/web/components/maps/EventsMap.tsx
// Google Maps-powered event discovery.
// Loads the Maps JS API via @vis.gl/react-google-maps (lighter than @react-google-maps/api).
// Falls back to list view if Maps fails to load or user denies location.

import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useGeolocation } from "@/lib/hooks/useGeolocation";

type EventPin = {
  id: string;
  title: string;
  eventType: string;
  city: string;
  state: string;
  startsAt: string;
  lat: number;
  lng: number;
  spotsLeft: number;
  hostName: string;
  requiresIdVerif: boolean;
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

const DEFAULT_CENTER = { lat: 38.0293, lng: -78.4767 }; // Charlottesville, VA (Phase 1 launch)
const DEFAULT_ZOOM = 11;

type Props = {
  apiKey: string;
  initialEvents?: EventPin[];
};

export default function EventsMap({ apiKey, initialEvents = [] }: Props) {
  const [events, setEvents] = useState<EventPin[]>(initialEvents);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [view, setView] = useState<"map" | "list">("map");
  const { coords, isLoading: geoLoading, request: requestGeo, errorMessage: geoError } =
    useGeolocation();

  const selectedEvent = events.find((e) => e.id === selectedId) ?? null;

  // Fetch events from API with current coordinates
  const fetchEvents = useCallback(
    async (lat: number, lng: number, km: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lng: lng.toString(),
          radiusKm: km.toString(),
          limit: "50",
        });
        const res = await fetch(`/api/events?${params}`);
        if (!res.ok) return;
        const json = await res.json() as any;
        setEvents(json.data.events ?? []);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch when location resolves
  useEffect(() => {
    if (coords) fetchEvents(coords.lat, coords.lng, radiusKm);
  }, [coords, radiusKm, fetchEvents]);

  const center = coords ?? DEFAULT_CENTER;

  return (
    <APIProvider apiKey={apiKey}>
      <div className="flex flex-col h-full">
        {/* Controls bar */}
        <div className="flex items-center justify-between gap-4 p-3 bg-white border-b border-stone-100">
          <div className="flex items-center gap-3">
            {/* Location button */}
            {!coords && (
              <button
                onClick={requestGeo}
                disabled={geoLoading}
                className="flex items-center gap-1.5 text-sm text-stone-600 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50 disabled:opacity-50"
              >
                {geoLoading ? (
                  <div className="h-3.5 w-3.5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                ) : (
                  <span>📍</span>
                )}
                Use my location
              </button>
            )}
            {coords && (
              <span className="text-xs text-green-700 flex items-center gap-1">
                📍 Location active
              </span>
            )}
            {geoError && (
              <span className="text-xs text-stone-400">{geoError}</span>
            )}

            {/* Radius slider */}
            {coords && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400">Radius:</span>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={radiusKm}
                  onChange={(e: any) => setRadiusKm(Number(e.target.value))}
                  className="w-24 accent-stone-900"
                />
                <span className="text-xs text-stone-600 w-12">{radiusKm} km</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {loading && (
              <div className="h-4 w-4 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
            )}
            <span className="text-xs text-stone-400">{events.length} events</span>

            {/* View toggle */}
            <div className="flex border border-stone-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setView("map")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "map" ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50"
                }`}
              >
                🗺 Map
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "list" ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50"
                }`}
              >
                ☰ List
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Map */}
          {view === "map" && (
            <div className="relative flex-1">
              <Map
                defaultCenter={center}
                defaultZoom={DEFAULT_ZOOM}
                mapId="communite-events"
                gestureHandling="greedy"
                disableDefaultUI={false}
                clickableIcons={false}
                style={{ width: "100%", height: "100%" }}
              >
                {/* User location marker */}
                {coords && (
                  <AdvancedMarker position={coords}>
                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                  </AdvancedMarker>
                )}

                {/* Event markers */}
                {events.map((event) => (
                  <AdvancedMarker
                    key={event.id}
                    position={{ lat: event.lat, lng: event.lng }}
                    onClick={() => setSelectedId(event.id === selectedId ? null : event.id)}
                  >
                    <EventMarker
                      emoji={EVENT_TYPE_EMOJI[event.eventType] ?? "🍴"}
                      isFull={event.spotsLeft <= 0}
                      isSelected={event.id === selectedId}
                    />
                  </AdvancedMarker>
                ))}

                {/* Info window for selected event */}
                {selectedEvent && (
                  <InfoWindow
                    position={{ lat: selectedEvent.lat, lng: selectedEvent.lng }}
                    onCloseClick={() => setSelectedId(null)}
                    pixelOffset={[0, -40]}
                  >
                    <EventInfoWindow event={selectedEvent} />
                  </InfoWindow>
                )}
              </Map>
            </div>
          )}

          {/* List view */}
          {view === "list" && (
            <div className="flex-1 overflow-y-auto p-4">
              <EventList events={events} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          )}

          {/* Side panel — always visible on desktop */}
          <div className="hidden lg:flex flex-col w-80 border-l border-stone-100 overflow-y-auto bg-white">
            {selectedEvent ? (
              <EventDetailPanel event={selectedEvent} onClose={() => setSelectedId(null)} />
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 border-b border-stone-100">
                  <p className="text-sm font-medium text-stone-700">
                    {events.length} gathering{events.length !== 1 ? "s" : ""} nearby
                  </p>
                </div>
                <EventList events={events} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </APIProvider>
  );
}

// ---- Sub-components ----

function EventMarker({
  emoji, isFull, isSelected,
}: {
  emoji: string;
  isFull: boolean;
  isSelected: boolean;
}) {
  return (
    <div
      className={`
        flex items-center justify-center w-9 h-9 rounded-full shadow-lg border-2 transition-transform
        text-lg cursor-pointer select-none
        ${isSelected ? "scale-125 border-stone-900 z-10" : "border-white"}
        ${isFull ? "opacity-50" : ""}
        bg-white
      `}
    >
      {emoji}
    </div>
  );
}

function EventList({
  events, selectedId, onSelect,
}: {
  events: EventPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-3xl mb-3">🍽</p>
        <p className="text-sm text-stone-500">No events in this area yet</p>
        <Link href="/events/new" className="mt-3 text-sm text-[#C2714F] underline">
          Host one
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2 p-4">
      {events.map((event) => {
        const emoji = EVENT_TYPE_EMOJI[event.eventType] ?? "🍴";
        const isFull = event.spotsLeft <= 0;
        return (
          <li key={event.id}>
            <button
              onClick={() => onSelect(event.id)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                selectedId === event.id
                  ? "border-stone-900 bg-stone-50"
                  : "border-stone-100 hover:border-stone-300"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{event.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {new Date(event.startsAt).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    })} · {event.city}
                  </p>
                  <p className={`text-xs font-medium mt-1 ${isFull ? "text-stone-300" : event.spotsLeft <= 3 ? "text-amber-600" : "text-green-700"}`}>
                    {isFull ? "Full" : `${event.spotsLeft} spot${event.spotsLeft === 1 ? "" : "s"} left`}
                  </p>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function EventDetailPanel({
  event, onClose,
}: {
  event: EventPin;
  onClose: () => void;
}) {
  const emoji = EVENT_TYPE_EMOJI[event.eventType] ?? "🍴";
  const isFull = event.spotsLeft <= 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-stone-100">
        <span className="text-xs font-medium text-stone-500">Event details</span>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg">×</button>
      </div>

      <div className="p-4 flex-1">
        <div className="mb-4">
          <span className="text-2xl">{emoji}</span>
          <h3 className="text-base font-semibold text-stone-900 mt-2">{event.title}</h3>
          <p className="text-xs text-stone-400 mt-1">{event.eventType.replace(/_/g, " ")}</p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-stone-400 w-16 shrink-0">When</span>
            <span className="text-stone-700">
              {new Date(event.startsAt).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
                hour: "numeric", minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-stone-400 w-16 shrink-0">Where</span>
            <span className="text-stone-700">{event.city}, {event.state}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-stone-400 w-16 shrink-0">Host</span>
            <span className="text-stone-700">{event.hostName}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-stone-400 w-16 shrink-0">Spots</span>
            <span className={`font-medium ${isFull ? "text-stone-400" : event.spotsLeft <= 3 ? "text-amber-600" : "text-green-700"}`}>
              {isFull ? "Full — join waitlist" : `${event.spotsLeft} remaining`}
            </span>
          </div>
          {event.requiresIdVerif && (
            <div className="flex gap-2">
              <span className="text-stone-400 w-16 shrink-0">Access</span>
              <span className="text-stone-700">🪪 ID verification required</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-stone-100">
        <Link
          href={`/events/${event.id}`}
          className="block w-full bg-stone-900 text-white text-sm font-medium text-center py-2.5 rounded-xl hover:bg-stone-700 transition-colors"
        >
          View & RSVP →
        </Link>
      </div>
    </div>
  );
}

function EventInfoWindow({ event }: { event: EventPin }) {
  return (
    <div className="p-1 max-w-xs">
      <p className="font-semibold text-stone-900 text-sm">{event.title}</p>
      <p className="text-xs text-stone-500 mt-0.5">
        {new Date(event.startsAt).toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric",
        })}
        {" · "}
        {event.spotsLeft <= 0 ? "Full" : `${event.spotsLeft} spots left`}
      </p>
      <Link
        href={`/events/${event.id}`}
        className="mt-2 block text-xs font-medium text-[#C2714F] hover:underline"
      >
        View event →
      </Link>
    </div>
  );
}
