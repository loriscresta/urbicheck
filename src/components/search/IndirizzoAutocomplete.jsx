import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, X } from "lucide-react";
import { getGoogleMapsKey } from "@/functions/getGoogleMapsKey";

function getApiKey() {
  // Try Vite env var first, fall back to backend function
  if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return Promise.resolve(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  }
  return getGoogleMapsKey({}).then(res => {
    const data = res?.data || res;
    return data?.key || null;
  }).catch(() => null);
}

export default function IndirizzoAutocomplete({ onComuneFound }) {
  const [comuneValue, setComuneValue] = useState("");
  const [mapAddress, setMapAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const onComuneFoundRef = useRef(onComuneFound);
  onComuneFoundRef.current = onComuneFound;

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current) return;
    if (autocompleteRef.current) {
      // Already initialized — clean up old listener before re-init
      if (window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      autocompleteRef.current = null;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "it" },
      types: ["address"],
      fields: ["address_components", "formatted_address", "geometry"],
    });
    autocompleteRef.current = autocomplete;

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place?.formatted_address) return;

      const locality =
        place.address_components?.find(
          c => c.types.includes("locality") || c.types.includes("administrative_area_level_3")
        )?.long_name || "";

      setComuneValue(locality);
      setMapAddress(place.formatted_address);

      if (locality && onComuneFoundRef.current) {
        onComuneFoundRef.current(locality);
      }
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    getApiKey().then(key => {
      if (cancelled || !key) { if (!cancelled) setLoading(false); return; }

      if (!window.google?.maps?.places) {
        const s = document.createElement("script");
        s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=it&region=IT`;
        s.async = true;
        s.onload = () => { if (!cancelled) initAutocomplete(); };
        document.head.appendChild(s);
      } else {
        initAutocomplete();
      }
    });

    return () => {
      cancelled = true;
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [initAutocomplete]);

  const handleClear = () => {
    setComuneValue("");
    setMapAddress(null);
    if (inputRef.current) inputRef.current.value = "";
    // Re-initialize autocomplete after clear
    if (window.google?.maps?.places && inputRef.current) {
      initAutocomplete();
    }
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <Label className="text-xs">Cerca per indirizzo <span className="text-muted-foreground">(opzionale)</span></Label>
        </div>
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Es: Via Roma 15, Torino"
            className="pr-8 text-sm"
            disabled={loading}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && mapAddress && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {comuneValue && (
          <p className="text-[10px] text-emerald-700 font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Comune rilevato: {comuneValue}
          </p>
        )}
      </div>

      {mapAddress && (
        <iframe
          width="100%"
          height="220"
          style={{ borderRadius: "8px", border: "none", marginTop: "8px" }}
          src={`https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&z=17&output=embed`}
          title="Mappa dell'indirizzo"
          allowFullScreen
          loading="lazy"
        />
      )}
    </div>
  );
}