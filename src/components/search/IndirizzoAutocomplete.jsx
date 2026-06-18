import React, { useState, useRef } from "react";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { lookupParcelByCoords } from "@/functions/lookupParcelByCoords";

// ── Helpers ────────────────────────────────────────────────────────────

/** Parsa input per estrarre numero civico, via e città */
function parseAddressInput(val) {
  const trimmed = val.trim();
  // Cerca un numero isolato (civico)
  const numMatch = trimmed.match(/\b(\d+[a-zA-Z]?)\b/);
  if (!numMatch) return { street: trimmed, city: "", housenumber: "" };

  const numIdx = numMatch.index;
  const housenumber = numMatch[1];
  const beforeNum = trimmed.slice(0, numIdx).trim();
  const afterNum = trimmed.slice(numIdx + housenumber.length).trim().replace(/^[,\s]+/, "");

  // Se c'è testo prima del numero → via + civico; dopo → città
  // Se non c'è testo prima (es. "44 Carentino") → solo civico + città
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

export default function IndirizzoAutocomplete({ onComuneFound, onParcelFound }) {
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [mapCoords, setMapCoords] = useState(null);
  const [comuneTrovato, setComuneTrovato] = useState("");
  const [parcelLoading, setParcelLoading] = useState(false);
  const [parcelFound, setParcelFound] = useState(false);
  const debounceRef = useRef(null);

  const handleAddressInput = (val) => {
    setAddressQuery(val);
    clearTimeout(debounceRef.current);
    if (val.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { street, city } = parseAddressInput(val);
        const headers = { "Accept-Language": "it" };
        const baseUrl = "https://nominatim.openstreetmap.org/search?countrycodes=it&format=json&addressdetails=1&limit=4";
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

        // Structured results first (call B), then free-form (call A)
        const addResults = (arr) => {
          if (!Array.isArray(arr)) return;
          for (const item of arr) {
            if (!item?.place_id || seenIds.has(item.place_id)) continue;
            seenIds.add(item.place_id);
            merged.push(item);
            if (merged.length >= 6) break;
          }
        };

        // Push structured first (index 1 if exists), then free-form (index 0)
        if (results.length > 1 && results[1].status === "fulfilled") {
          addResults(await results[1].value.clone().json());
        }
        if (results[0].status === "fulfilled") {
          addResults(await results[0].value.clone().json());
        }

        setAddressSuggestions(merged);
      } catch (_) {
        setAddressSuggestions([]);
      }
    }, 400);
  };

  const handleSelectAddress = async (item) => {
    setAddressQuery(item.display_name);
    setAddressSuggestions([]);

    const comune =
      item.address?.city ||
      item.address?.town ||
      item.address?.village ||
      item.address?.municipality ||
      "";

    if (comune) {
      setComuneTrovato(comune);
      onComuneFound?.(comune);
    }

    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setMapCoords({ lat, lon });

    // Lookup catastale via Catasto Agent
    setParcelLoading(true);
    setParcelFound(false);
    try {
      const res = await lookupParcelByCoords({ lat, lon });
      const data = res?.data || res;
      if (data?.found && data?.foglio && data?.particella) {
        setParcelFound(true);
        onParcelFound?.({
          foglio: String(data.foglio),
          particella: String(data.particella),
          sezione: data.sezione || null,
        });
      }
    } catch (_) {
      // Silenzioso — l'utente compila a mano
    } finally {
      setParcelLoading(false);
    }
  };

  const handleClear = () => {
    setAddressQuery("");
    setAddressSuggestions([]);
    setMapCoords(null);
    setComuneTrovato("");
    setParcelFound(false);
  };

  const bbox =
    mapCoords
      ? `${mapCoords.lon - 0.003},${mapCoords.lat - 0.003},${mapCoords.lon + 0.003},${mapCoords.lat + 0.003}`
      : "";

  return (
    <div className="space-y-2 mb-4">
      <div style={{ position: "relative" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <label className="text-xs font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Cerca per indirizzo <span style={{ color: "#888", fontSize: "0.85em" }}>(opzionale)</span>
          </label>
        </div>

        <input
          type="text"
          value={addressQuery}
          onChange={(e) => handleAddressInput(e.target.value)}
          placeholder="Es: Via Roma 15, Torino"
          style={{
            width: "100%",
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
                onClick={() => handleSelectAddress(s)}
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

      {parcelFound && (
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded border border-emerald-300 bg-emerald-50" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-emerald-700 font-semibold">✓ Dati catastali trovati automaticamente</span>
        </div>
      )}

      {mapCoords && (
        <iframe
          title="Mappa dell'indirizzo"
          width="100%"
          height="200"
          style={{
            borderRadius: "8px",
            border: "none",
            marginTop: "8px",
            display: "block",
          }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lon}`}
          allowFullScreen
          loading="lazy"
        />
      )}
    </div>
  );
}