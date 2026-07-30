import React, { useState, useRef, useEffect } from "react";
import { MapPin, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { lookupParcelByCoords } from "@/functions/lookupParcelByCoords";
import { geocodeAddressCascade } from "@/functions/geocodeAddressCascade";

// ── Helpers ────────────────────────────────────────────────────────────

/** Parsa input per estrarre numero civico, via e città */
function parseAddressInput(val) {
  const trimmed = val.trim();
  const numMatch = trimmed.match(/\b(\d+[a-zA-Z]?)\b/);
  if (!numMatch) return { street: trimmed, city: "", housenumber: "" };

  const numIdx = numMatch.index;
  const housenumber = numMatch[1];
  const beforeNum = trimmed.slice(0, numIdx).trim();
  const afterNum = trimmed.slice(numIdx + housenumber.length).trim().replace(/^[,\s]+/, "");

  const street = beforeNum ? `${beforeNum} ${housenumber}` : housenumber;
  const city = afterNum || "";

  return { street, city, housenumber };
}

/** Formatta un suggerimento Nominatim per la dropdown */
function formatSuggestionDisplay(item) {
  const a = item.address || {};
  if (a.house_number && a.road) {
    return `${a.road} ${a.house_number}, ${a.town || a.city || a.village || ""}, ${a.state || ""}`.replace(/,\s*,/g, ",").replace(/,\s*$/, "");
  }
  return `${a.road || (item.display_name || "").split(",")[0]}, ${a.town || a.city || a.village || ""}`.replace(/,\s*,/g, ",").replace(/,\s*$/, "");
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search?countrycodes=it&format=json&addressdetails=1";

export default function IndirizzoAutocomplete({ onComuneFound, onParcelFound, onResetParcel, onResetComune, initialAddress, onAddressResolved }) {
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [mapCoords, setMapCoords] = useState(null);
  const [comuneTrovato, setComuneTrovato] = useState("");
  const [parcelLoading, setParcelLoading] = useState(false);
  // idle | loading | found | snapped | not_found
  const [parcelStatus, setParcelStatus] = useState("idle");
  // true quando Nominatim (autocomplete browser) torna vuoto/bloccato: mostriamo
  // un fallback cliccabile che geocodifica via Google (backend) invece di lasciare l'utente fermo.
  const [nominatimEmpty, setNominatimEmpty] = useState(false);
  const [snapDistM, setSnapDistM] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const debounceRef = useRef(null);
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);
  const initialDoneRef = useRef(false);

  // ── Reset completo dello stato precedente (comune, particella, mappa, banner) ──
  const resetState = () => {
    setComuneTrovato("");
    setParcelStatus("idle");
    setSnapDistM(null);
    setMapCoords(null);
    setAddressSuggestions([]);
    setNominatimEmpty(false);
    onResetParcel?.();
    onResetComune?.();
  };

  // ── Carica Leaflet da CDN una volta ────────────────────────────────────
  useEffect(() => {
    if (window.L) {
      setMapReady(true);
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setMapReady(true);
    script.onerror = () => setMapReady(false);
    document.head.appendChild(script);
  }, []);

  // ── Catastomappe lookup condiviso ──────────────────────────────────────
  const doParcelLookup = async (lat, lon) => {
    setParcelLoading(true);
    setParcelStatus("loading");
    try {
      const res = await lookupParcelByCoords({ lat, lon });
      const data = res?.data || res;
      if (data?.found && data?.foglio && data?.particella) {
        if (data.snapped) {
          setParcelStatus("snapped");
          setSnapDistM(data.snap_dist_m ?? null);
        } else {
          setParcelStatus("found");
          setSnapDistM(null);
        }
        onParcelFound?.({
          foglio: String(data.foglio),
          particella: String(data.particella),
          sezione: data.sezione || null,
          snapped: data.snapped || false,
          snap_dist_m: data.snap_dist_m ?? null,
          geometry_geojson: data.geometry_geojson || null,
          centroid_lat: (data.centroid_lat ?? lat),
          centroid_lon: (data.centroid_lon ?? lon),
        });
      } else {
        setParcelStatus("not_found");
      }
    } catch (_) {
      setParcelStatus("not_found");
    } finally {
      setParcelLoading(false);
    }
  };

  // ── Fallback: se Nominatim non trova, cerca coordinata del comune in ComuneItalia ──
  const comuneFallbackLookup = async (queryString) => {
    const parts = queryString.split(",").map((p) => p.trim()).filter(Boolean);
    // Prova l'ultimo segmento dopo la virgola, poi il primo
    const candidates = [];
    if (parts.length > 1) candidates.push(parts[parts.length - 1]);
    candidates.push(parts[0]);

    for (const nome of candidates) {
      if (!nome) continue;
      try {
        const results = await base44.entities.ComuneItalia.filter({ nome }, "-created_date", 1);
        const c = results?.[0];
        if (c && typeof c.lat === "number" && typeof c.lon === "number") {
          setComuneTrovato(c.nome);
          onComuneFound?.(c.nome);
          setMapCoords({ lat: c.lat, lon: c.lon });
          setParcelStatus("not_found");
          return;
        }
      } catch (_) {}
    }
    // Nessun fallback disponibile
    setParcelStatus("not_found");
  };

  // ── Geocoding a cascata (backend: Google primario → Nominatim fallback) ──
  // La chiave Google resta lato server. Le coordinate alimentano lookupParcelByCoords.
  const geocodeAndResolve = async (queryStringRaw) => {
    // Normalizza l'input: collassa spazi, uniforma le virgole. Google è già indipendente
    // dall'ordine (via/civico/comune), questa è solo pulizia per un risultato deterministico.
    const queryString = String(queryStringRaw || '').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
    try {
      const res = await geocodeAddressCascade({ address: queryString });
      const d = res?.data || res;
      if (d && d.found !== false && d.lat != null && d.lng != null && isFinite(d.lat) && isFinite(d.lng)) {
        const comune = d.comune || "";
        if (comune) { setComuneTrovato(comune); onComuneFound?.(comune); }
        onAddressResolved?.(d.formatted_address || queryString);
        setMapCoords({ lat: d.lat, lon: d.lng });
        await doParcelLookup(d.lat, d.lng);
        return;
      }
    } catch (_) {}
    // Nessun risultato: pin sul centroide del comune (ComuneItalia) o stato not_found
    await comuneFallbackLookup(queryString);
  };

  // ── Risolve l'indirizzo iniziale (arrivo da /search?address=...) ─────────
  useEffect(() => {
    if (initialDoneRef.current) return;
    if (!initialAddress) return;
    initialDoneRef.current = true;
    setAddressQuery(initialAddress);
    geocodeAndResolve(initialAddress);
  }, [initialAddress]);

  // ── Inizializza / aggiorna mappa Leaflet ───────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapCoords || !mapContainerRef.current) return;

    // Rimuovi mappa precedente
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
      markerRef.current = null;
    }

    const { lat, lon } = mapCoords;
    const map = window.L.map(mapContainerRef.current).setView([lat, lon], 17);
    leafletMapRef.current = map;

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    const marker = window.L.marker([lat, lon], { draggable: true }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", (e) => {
      const pos = e.target.getLatLng();
      setMapCoords({ lat: pos.lat, lon: pos.lng });
      doParcelLookup(pos.lat, pos.lng);
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [mapCoords, mapReady]);

  // ── Nominatim input handler ────────────────────────────────────────────
  const handleAddressInput = (val) => {
    setAddressQuery(val);
    clearTimeout(debounceRef.current);
    // (a) Reset sempre dello stato precedente a ogni cambio testo
    resetState();
    if (val.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { street, city } = parseAddressInput(val);
        const headers = { "Accept-Language": "it" };
        const baseUrl = `${NOMINATIM_BASE}&limit=4`;
        const calls = [
          fetch(`${baseUrl}&q=${encodeURIComponent(val)}`, { headers }),
        ];
        if (city && street) {
          calls.push(
            fetch(`${baseUrl}&street=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}`, { headers })
          );
        }

        const results = await Promise.allSettled(calls);
        const seenIds = new Set();
        const merged = [];

        const addResults = (arr) => {
          if (!Array.isArray(arr)) return;
          for (const item of arr) {
            if (!item?.place_id || seenIds.has(item.place_id)) continue;
            seenIds.add(item.place_id);
            merged.push(item);
            if (merged.length >= 6) break;
          }
        };

        if (results.length > 1 && results[1].status === "fulfilled") {
          addResults(await results[1].value.clone().json());
        }
        if (results[0].status === "fulfilled") {
          addResults(await results[0].value.clone().json());
        }

        setAddressSuggestions(merged);
        // Se Nominatim non restituisce nulla (spesso rate-limited/bloccato dal browser),
        // attiviamo il fallback Google così l'utente ha comunque un modo per cercare.
        setNominatimEmpty(merged.length === 0);
      } catch (_) {
        setAddressSuggestions([]);
        setNominatimEmpty(true);
      }
    }, 400);
  };

  // ── Selezione indirizzo (da dropdown o da geocoding iniziale) ───────────
  const selectAddress = async (item) => {
    // Cattura il testo digitato PRIMA di sovrascriverlo: contiene il civico che l'utente ha scritto
    // (i suggerimenti Nominatim spesso non riportano il numero civico).
    const typedText = addressQuery;
    resetState();
    setAddressSuggestions([]);

    const a = item.address || {};
    const comune = a.city || a.town || a.village || a.municipality || "";
    if (comune) {
      setComuneTrovato(comune);
      onComuneFound?.(comune);
    }

    // Combina la via del suggerimento col civico digitato dall'utente, poi ri-geocodifica via Google
    // (ROOFTOP sul civico) invece di usare le coordinate — spesso solo a livello via — di Nominatim.
    const road = a.road || (item.display_name || "").split(",")[0];
    const city = a.town || a.city || a.village || a.municipality || comune || "";
    const typedNum = parseAddressInput(typedText).housenumber || a.house_number || "";
    const full = typedNum ? `${road} ${typedNum}, ${city}` : (item.display_name || "");
    setAddressQuery(full);
    await geocodeAndResolve(full);
  };

  const handleClear = () => {
    resetState();
    setAddressQuery("");
  };

  return (
    <div className="space-y-2 mb-4">
      <div style={{ position: "relative" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <label className="text-sm font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#1A3A6B" }}>
            Cerca il tuo immobile per indirizzo
          </label>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type="text"
            value={addressQuery}
            onChange={(e) => handleAddressInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                if (addressQuery.trim().length >= 3) {
                  setAddressSuggestions([]);
                  geocodeAndResolve(addressQuery.trim());
                }
              }
            }}
            placeholder="Es: Via Roma 15, Torino"
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "1px solid #C4BAA8",
              borderRadius: "6px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.875rem",
              background: "#fff",
              color: "#1C1A17",
              outline: "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#1A3A6B";
              e.target.style.boxShadow = "0 0 0 2px rgba(26,58,107,0.15)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#C4BAA8";
              e.target.style.boxShadow = "none";
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (addressQuery.trim().length >= 3) {
                setAddressSuggestions([]);
                geocodeAndResolve(addressQuery.trim());
              }
            }}
            style={{
              padding: "0 14px",
              background: "#1A3A6B",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            →
          </button>
        </div>

        {addressSuggestions.length > 0 && (
          <ul
            style={{
              position: "absolute",
              zIndex: 1000,
              background: "#fff",
              border: "1px solid #C4BAA8",
              borderRadius: "6px",
              width: "100%",
              maxHeight: "200px",
              overflowY: "auto",
              margin: 0,
              marginTop: "2px",
              padding: 0,
              listStyle: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            {addressSuggestions.map((s, i) => (
              <li
                key={i}
                onClick={() => selectAddress(s)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderBottom: i < addressSuggestions.length - 1 ? "1px solid #f0f0f0" : "none",
                  fontSize: "0.875em",
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: "#1C1A17",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f4efe6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
              >
                <span style={{ fontSize: "0.85em" }}>{formatSuggestionDisplay(s)}</span>
              </li>
            ))}
          </ul>
        )}

        {addressSuggestions.length === 0 && nominatimEmpty && addressQuery.trim().length >= 3 && parcelStatus === "idle" && !parcelLoading && (
          <ul
            style={{
              position: "absolute",
              zIndex: 1000,
              background: "#fff",
              border: "1px solid #C4BAA8",
              borderRadius: "6px",
              width: "100%",
              margin: 0,
              marginTop: "2px",
              padding: 0,
              listStyle: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <li
              onClick={() => { setAddressSuggestions([]); setNominatimEmpty(false); geocodeAndResolve(addressQuery.trim()); }}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                fontSize: "0.875em",
                fontFamily: "'IBM Plex Mono', monospace",
                color: "#1A3A6B",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f4efe6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cerca «{addressQuery.trim()}»</span>
            </li>
          </ul>
        )}
      </div>

      {comuneTrovato && (
        <p className="text-[10px] text-emerald-700 font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          Comune rilevato: {comuneTrovato}
        </p>
      )}

      {parcelLoading && (
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded border border-amber-200 bg-amber-50" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
          <span className="text-amber-700">Ricerca foglio e particella in corso...</span>
        </div>
      )}

      {!parcelLoading && parcelStatus === "found" && (
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded border border-emerald-300 bg-emerald-50" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-emerald-700 font-semibold">✓ Dati catastali trovati automaticamente</span>
        </div>
      )}

      {!parcelLoading && parcelStatus === "snapped" && (
        <div className="flex items-start gap-2 text-xs px-3 py-2 rounded border border-amber-300 bg-amber-50" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span className="text-amber-800">
            📍 Particella più vicina{snapDistM != null ? ` (~${snapDistM} m)` : ""} — controlla che il pin sia sull'immobile giusto. Se non è corretto, trascina il pin sull'edificio oppure inserisci manualmente Foglio e Particella.
          </span>
        </div>
      )}

      {!parcelLoading && parcelStatus === "not_found" && (
        <div className="flex items-start gap-2 text-xs px-3 py-2 rounded border border-amber-300 bg-amber-50" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span className="text-amber-800">
            Non siamo riusciti a ricavare i dati catastali da questo indirizzo. Trascina il pin sull'immobile esatto sulla mappa, oppure inserisci manualmente Comune, Foglio e Particella.
          </span>
        </div>
      )}

      {mapCoords && (
        <div style={{ marginTop: "8px" }}>
          <div
            ref={mapContainerRef}
            style={{
              width: "100%",
              height: "220px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              zIndex: 0,
            }}
          />
          <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
            📍 Trascina il pin sull'immobile esatto per ottenere i dati catastali precisi
          </p>
        </div>
      )}
    </div>
  );
}