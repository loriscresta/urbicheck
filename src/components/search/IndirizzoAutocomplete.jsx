import React, { useState, useRef } from "react";
import { MapPin } from "lucide-react";

export default function IndirizzoAutocomplete({ onComuneFound }) {
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [mapCoords, setMapCoords] = useState(null);
  const [comuneTrovato, setComuneTrovato] = useState("");
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
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&countrycodes=it&format=json&addressdetails=1&limit=6`,
          { headers: { "Accept-Language": "it" } }
        );
        const data = await res.json();
        setAddressSuggestions(Array.isArray(data) ? data : []);
      } catch (_) {
        setAddressSuggestions([]);
      }
    }, 400);
  };

  const handleSelectAddress = (item) => {
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
    setMapCoords({ lat: parseFloat(item.lat), lon: parseFloat(item.lon) });
  };

  const handleClear = () => {
    setAddressQuery("");
    setAddressSuggestions([]);
    setMapCoords(null);
    setComuneTrovato("");
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
                <span style={{ fontSize: "0.85em" }}>{s.display_name}</span>
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