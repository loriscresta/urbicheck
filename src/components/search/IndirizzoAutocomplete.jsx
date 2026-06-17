import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, X } from "lucide-react";
import { getGoogleMapsKey } from "@/functions/getGoogleMapsKey";

const EXTRACT_COMUNE = (addressComponents) => {
  if (!addressComponents?.length) return null;
  // Priority: locality > administrative_area_level_3 > sublocality
  const locality = addressComponents.find(c => c.types.includes("locality"));
  if (locality) return locality.long_name;
  const admin3 = addressComponents.find(c => c.types.includes("administrative_area_level_3"));
  if (admin3) return admin3.long_name;
  const sublocality = addressComponents.find(c => c.types.includes("sublocality"));
  return sublocality?.long_name || null;
};

// ── Singleton script loader — just once per app lifetime ───────────
let gmapsLoading = null;
let gmapsLoaded = false;

function ensureGoogleMaps(apiKey) {
  if (gmapsLoaded) return Promise.resolve();
  if (gmapsLoading) return gmapsLoading;
  if (window.google?.maps?.places) {
    gmapsLoaded = true;
    return Promise.resolve();
  }

  gmapsLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gmapsLoaded = true;
      resolve();
    };
    script.onerror = () => {
      gmapsLoading = null;
      reject(new Error("Google Maps script failed to load"));
    };
    document.head.appendChild(script);
  });
  return gmapsLoading;
}

export default function IndirizzoAutocomplete({ onComuneFound }) {
  const [apiKey, setApiKey] = useState(null);
  const [keyError, setKeyError] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null); // { fullAddress, comune, lat, lng }
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(false);

  // ── Fetch API key ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchKey = async () => {
      try {
        const res = await getGoogleMapsKey({});
        const data = res?.data || res;
        if (!cancelled) {
          if (data?.key) setApiKey(data.key);
          else setKeyError("Chiave API Google Maps non disponibile");
        }
      } catch {
        if (!cancelled) setKeyError("Errore nel caricamento della chiave API");
      }
    };
    fetchKey();
    return () => { cancelled = true; };
  }, []);

  // ── Load Maps script when key is ready ────────────────────────
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    ensureGoogleMaps(apiKey).then(() => {
      if (!cancelled) setScriptReady(true);
    }).catch(() => {
      if (!cancelled) setKeyError("Google Maps non disponibile — riprova");
    });
    return () => { cancelled = true; };
  }, [apiKey]);

  // ── Bind autocomplete to input once script is ready ───────────
  useEffect(() => {
    if (!scriptReady || !inputRef.current) return;
    if (autocompleteRef.current) return; // already bound

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "it" },
    });
    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place?.formatted_address) return;

      const comune = EXTRACT_COMUNE(place.address_components);
      const fullAddress = place.formatted_address;
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();

      setSelectedPlace({ fullAddress, comune, lat, lng });

      if (comune && onComuneFound) {
        onComuneFound(comune);
      }
    });

    return () => {
      if (listener && window.google?.maps?.event) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, [scriptReady, onComuneFound]);

  // ── Clear selection ───────────────────────────────────────────
  const handleClear = useCallback(() => {
    setSelectedPlace(null);
    if (inputRef.current) inputRef.current.value = "";
    if (autocompleteRef.current && window.google?.maps?.event) {
      // re-bind after clearing
      const ac = autocompleteRef.current;
      const oldListeners = window.google.maps.event.clearInstanceListeners(ac);
    }
  }, []);

  if (keyError) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs">Cerca per indirizzo <span className="text-muted-foreground">(non disponibile)</span></Label>
        </div>
        <p className="text-[10px] text-muted-foreground italic">{keyError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
            disabled={!scriptReady}
          />
          {!scriptReady && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {selectedPlace && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {!scriptReady && apiKey && (
          <p className="text-[10px] text-muted-foreground">Caricamento Google Maps…</p>
        )}
        {selectedPlace && (
          <p className="text-[10px] text-emerald-700 font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {selectedPlace.comune ? `Comune rilevato: ${selectedPlace.comune}` : "Indirizzo trovato"}
          </p>
        )}
      </div>

      {/* Google Maps iframe — solo dopo selezione */}
      {selectedPlace && (
        <iframe
          title="Mappa dell'indirizzo"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedPlace.fullAddress)}&z=17&output=embed`}
          width="100%"
          height="220"
          style={{ borderRadius: "8px", border: "1px solid #C4BAA8" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
    </div>
  );
}