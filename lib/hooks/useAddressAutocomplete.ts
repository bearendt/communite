// apps/web/lib/hooks/useAddressAutocomplete.ts
// Google Places Autocomplete for address input in event creation.
// Loads the Places library from the Maps JS API already present on the page.
// Returns a ref to attach to the input and a structured address result.

"use client";

import { useEffect, useRef, useState } from "react";

export type PlaceResult = {
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  formatted: string;
};

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: object
          ) => {
            addListener: (event: string, cb: () => void) => void;
            getPlace: () => {
              geometry?: { location: { lat: () => number; lng: () => number } };
              address_components?: Array<{
                long_name: string;
                short_name: string;
                types: string[];
              }>;
              formatted_address?: string;
            };
          };
        };
      };
    };
  }
}

export function useAddressAutocomplete() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<PlaceResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Wait for the Maps JS API to load
    const init = () => {
      if (!inputRef.current || !window.google?.maps?.places) return;

      const autocomplete = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["address"],
          componentRestrictions: { country: "us" },
          fields: ["address_components", "geometry", "formatted_address"],
        }
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.address_components) return;

        const components = place.address_components;

        const get = (type: string, short = false) =>
          components.find((c) => c.types.includes(type))?.[
            short ? "short_name" : "long_name"
          ] ?? "";

        const streetNumber = get("street_number");
        const route = get("route");
        const city =
          get("locality") ||
          get("sublocality") ||
          get("administrative_area_level_3");
        const state = get("administrative_area_level_1", true);
        const zip = get("postal_code");
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        setResult({
          addressLine1: `${streetNumber} ${route}`.trim(),
          city,
          state,
          zip,
          lat,
          lng,
          formatted: place.formatted_address ?? "",
        });
      });
    };

    // If Maps is already loaded
    if (window.google?.maps?.places) {
      init();
      return;
    }

    // Poll until it loads (it's loaded by EventsMap / the map page)
    const interval = setInterval(() => {
      if (window.google?.maps?.places) {
        clearInterval(interval);
        init();
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return { inputRef, result, loading };
}
