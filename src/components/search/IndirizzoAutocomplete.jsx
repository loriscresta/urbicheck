import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, X } from "lucide-react";
import { getGoogleMapsKey } from "@/functions/getGoogleMapsKey";

export default function IndirizzoAutocomplete({ onComuneFound }) {
  const [apiKey, setApiKey] = useState(null);
  const [comuneValue, setComuneValue] = useState("");
  const [mapAddress, setMapAddress] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // ── Fetch API key once ────────────────────────────────────────
  useEffect(() => {
    getGoogleMapsKey({}).then(res => {
      const data = res?.data || res;
      if (data?.key) setApiKey(data.key);
    }).catch(() => {});
  }, []);

  // ── Load Places script when key is ready ─────────────────────
  useEffect(() => {
    if (!apiKey || scriptLoaded) return;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=it`;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
    return () => {
      // Don't remove — other components may use it
    };
  }, [apiKey]);

  // ── Initialize autocomplete when script + input are ready ─────
  useEffect(() => {
    if (!scriptLoaded || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "it" },
      fields: ["address_components", "formatted_address", "geometry"],
      types: ["address"],
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

      if (locality && onComuneFound) {
        onComuneFound(locality);
      }
    });

    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [scriptLoaded, onComuneFound]);

  const handleClear = () => {
    setComuneValue("");
    setMapAddress(null);
    if (inputRef.current) inputRef.current.value = "";
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
            disabled={!scriptLoaded}
          />
          {!scriptLoaded && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {mapAddress && (
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