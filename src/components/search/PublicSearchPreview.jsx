import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Lock, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const MONO = "'IBM Plex Mono', monospace";
const P = "#1A3A6B";
const AC = "#B33A2A";

function ParcelMapPreview({ lat, lng, geomJson, comune, foglio, particella }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || (!lat && !geomJson)) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }

    const init = () => {
      const L = window.L;
      if (!L || !mapRef.current) return;
      const centerLat = lat || 45;
      const centerLng = lng || 9;
      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })
        .setView([centerLat, centerLng], 16);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(map);
      L.tileLayer.wms("https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows", {
        layers: "CP.CadastralParcel", format: "image/png", transparent: true, opacity: 0.85,
      }).addTo(map);

      if (geomJson) {
        const feature = geomJson.type === "Feature" ? geomJson : { type: "Feature", geometry: geomJson, properties: {} };
        try {
          const layer = L.geoJSON(feature, {
            style: { color: "#FF6600", weight: 2.5, fillColor: "#FF6600", fillOpacity: 0.35 },
          }).addTo(map);
          map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 19 });
        } catch (_) {}
      } else if (lat && lng) {
        L.circleMarker([lat, lng], { radius: 9, color: P, fillColor: P, fillOpacity: 0.85, weight: 2 }).addTo(map);
      }
    };

    if (window.L) { init(); return; }
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement("link"); link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = init;
    document.head.appendChild(script);

    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [lat, lng, geomJson]);

  if (!lat && !geomJson) return null;
  return (
    <div ref={mapRef} style={{ height: 260, width: "100%", borderRadius: 0, border: `1px solid #C4BAA8`, zIndex: 0 }} />
  );
}

export default function PublicSearchPreview({ previewData, formData, onLoginToUnlock }) {
  const { comune, foglio, particella, subalterno, regione, provincia,
    categoria, superficie_mq, centroid_lat, centroid_lng, geometry_geojson } = previewData;

  const handleLogin = () => {
    // Salva i dati del form in sessionStorage per recuperarli post-login
    try {
      sessionStorage.setItem("urbicheck_pending_search", JSON.stringify(formData));
    } catch (_) {}
    base44.auth.redirectToLogin("/search?restore=1");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-0">
      {/* Header anteprima */}
      <div className="px-5 py-4" style={{ background: P, borderBottom: `3px solid ${AC}` }}>
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest" style={{ fontFamily: MONO }}>
            Particella trovata
          </p>
        </div>
        <h2 className="text-white text-lg font-bold" style={{ fontFamily: MONO }}>
          {comune} — Foglio {foglio}, Particella {particella}
          {subalterno ? `, Sub. ${subalterno}` : ""}
        </h2>
        {(provincia || regione) && (
          <p className="text-white/60 text-xs mt-0.5" style={{ fontFamily: MONO }}>
            {provincia}{regione ? ` · ${regione}` : ""}
          </p>
        )}
      </div>

      {/* Dati base visibili */}
      <div className="bg-white border-x border-b" style={{ borderColor: "#C4BAA8" }}>
        <div className="grid grid-cols-2 divide-x divide-y" style={{ borderColor: "#C4BAA8" }}>
          {[
            ["Comune", comune],
            ["Foglio / Particella", `${foglio} / ${particella}`],
            ...(categoria ? [["Categoria catastale", categoria]] : []),
            ...(superficie_mq ? [["Superficie catastale", `${superficie_mq} mq`]] : []),
          ].map(([label, value]) => (
            <div key={label} className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5" style={{ fontFamily: MONO }}>{label}</p>
              <p className="text-sm font-semibold" style={{ color: P, fontFamily: MONO }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Mappa */}
        {(centroid_lat || geometry_geojson) && (
          <div className="border-t" style={{ borderColor: "#C4BAA8" }}>
            <div className="px-4 py-2 flex items-center gap-2" style={{ background: "#F4EFE6" }}>
              <MapPin className="w-3 h-3" style={{ color: P }} />
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: P, fontFamily: MONO }}>
                Mappa catastale
              </p>
            </div>
            <ParcelMapPreview
              lat={centroid_lat}
              lng={centroid_lng}
              geomJson={geometry_geojson}
              comune={comune}
              foglio={foglio}
              particella={particella}
            />
          </div>
        )}

        {/* Sezioni bloccate — overlay */}
        <div className="relative border-t" style={{ borderColor: "#C4BAA8" }}>
          {/* Contenuto sfumato */}
          <div className="px-4 py-3 select-none pointer-events-none" style={{ filter: "blur(3px)", opacity: 0.35 }}>
            {[
              ["Zona urbanistica", "B — Residenziale consolidata"],
              ["Vincolo sismico", "Zona 3 — Pericolosità bassa"],
              ["Rischio PAI", "Nessuna frana censita"],
              ["Vincolo paesaggistico", "—"],
              ["Indice di edificabilità", "1.5 m³/m²"],
              ["Valore OMI stimato", "€ 1.200–1.600/mq"],
              ["Score investimento", "7/10"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b" style={{ borderColor: "#C4BAA8" }}>
                <span className="text-xs text-muted-foreground uppercase tracking-wide" style={{ fontFamily: MONO }}>{label}</span>
                <span className="text-xs font-semibold" style={{ color: P, fontFamily: MONO }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Overlay CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8" style={{ background: "rgba(244,239,230,0.92)" }}>
            <div className="text-center max-w-sm">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: P }}>
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-base mb-1" style={{ color: P, fontFamily: MONO }}>
                Sblocca il report completo
              </h3>
              <p className="text-xs mb-1" style={{ color: "#7A7268", fontFamily: MONO }}>
                Vincoli, indici urbanistici, analisi finanziaria, scorecard — le tue prime 3 analisi sono <strong>gratuite</strong>.
              </p>
              <p className="text-xs font-bold mb-4" style={{ color: AC, fontFamily: MONO }}>
                3 report gratis · poi €2,99/report
              </p>
              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-2 font-bold text-sm py-3 px-6 cursor-pointer border-0"
                style={{ background: AC, color: "#fff", fontFamily: MONO, letterSpacing: "1px" }}
              >
                <GoogleIcon />
                Accedi con Google — è gratis
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[10px] mt-2" style={{ color: "#7A7268", fontFamily: MONO }}>
                Oppure{" "}
                <button onClick={handleLogin} className="underline cursor-pointer bg-transparent border-0 p-0 text-[10px]" style={{ color: P, fontFamily: MONO }}>
                  accedi con email
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}