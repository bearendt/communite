// apps/web/lib/hooks/useGeolocation.ts
"use client";

import { useState, useEffect, useCallback } from "react";

export type Coordinates = {
  lat: number;
  lng: number;
};

type GeolocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; coords: Coordinates }
  | { status: "error"; message: string };

const CACHE_KEY = "communite:geolocation";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(): Coordinates | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { coords, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return coords;
  } catch {
    return null;
  }
}

function setCache(coords: Coordinates) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ coords, ts: Date.now() }));
  } catch { /* sessionStorage unavailable */ }
}

export function useGeolocation(auto = false) {
  const [state, setState] = useState<GeolocationState>({ status: "idle" });

  const request = useCallback(() => {
    // Check cache first
    const cached = getCached();
    if (cached) {
      setState({ status: "success", coords: cached });
      return;
    }

    setState({ status: "loading" });

    if (!navigator.geolocation) {
      setState({ status: "error", message: "Geolocation not supported by your browser" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCache(coords);
        setState({ status: "success", coords });
      },
      (err) => {
        let message: string;
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = "Location access denied. Enter your city to find nearby events.";
            break;
          case err.POSITION_UNAVAILABLE:
            message = "Location unavailable. Enter your city manually.";
            break;
          default:
            message = "Could not determine your location.";
        }
        setState({ status: "error", message });
      },
      {
        timeout: 8_000,
        maximumAge: CACHE_TTL_MS,
        enableHighAccuracy: false, // low accuracy is fine for event discovery
      }
    );
  }, []);

  // Auto-request on mount if opted in
  useEffect(() => {
    if (auto) request();
  }, [auto, request]);

  return {
    ...state,
    coords: state.status === "success" ? state.coords : null,
    isLoading: state.status === "loading",
    isError: state.status === "error",
    errorMessage: state.status === "error" ? state.message : null,
    request,
  };
}
