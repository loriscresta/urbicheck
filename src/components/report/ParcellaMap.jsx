import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const WFS_URL = "https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/ows";

function loadLeaflet(cb) {
  if (window.L) { cb(); return; }
  if (!document.querySelector('link[href*="leaflet"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  const script = document.createElement("script");
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.onload = cb;
  document.head.appendChild(script);
}

export default function ParcellaMap({ record, query, item }) {
  const entity     = record || query || item || {};
  const foglio     = String(entity.foglio     || "");
  const particella = String(entity.particella || "");
  const geomJson   = entity.geometry_geojson  || null;

  // ── Centroide: da poligono DB oppure da centroid_lat/lng DB — MAI geocoding ──
  let initLat = null;
  let initLon = null;

  if (geomJson?.geometry?.coordinates?.[0]?.length > 0) {
    const ring = geomJson.geometry.coordinates[0];
    initLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    initLon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  } else if (entity.centroid_lat && entity.centroid_lng) {
    initLat = parseFloat(entity.centroid_lat);
    initLon = parseFloat(entity.centroid_lng);
  }

  const hasPosition = !!(initLat && initLon && !isNaN(initLat) && !isNaN(initLon));
  const hasPolygon  = !!(geomJson?.geometry?.coordinates);

  const mapDivRef     = useRef(null);
  const leafletMapRef = useRef(null);
  const [polygonLoaded, setPolygonLoaded] = useState(false);
  const [wfsStatus,     setWfsStatus]     = useState("");

  const addPolygonToMap = useCallback((feature) => {
    const L   = window.L;
    const map = leafletMapRef.current;
    if (!L || !map) return;
    try {
      const layer = L.geoJSON(feature, {
        style: { color: "#c0392b", weight: 3, fillColor: "#e74c3c", fillOpacity: 0.35 },
      }).addTo(map);
      map.fitBounds(layer.getBounds(), { maxZoom: 18, padding: [40, 40] });
      setPolygonLoaded(true);
    } catch (err) {
      console.error("addPolygonToMap error", err);
    }
  }, []);

  // ── WFS self-healing: browser chiama AdE (diretto + proxy), salva poligono in DB ──
  useEffect(() => {
    if (!hasPosition || hasPolygon || !entity.id) return;
    let cancelled = false;

    // Cerca la feature più pertinente nell'array GeoJSON
    const matchFeature = (features) => {
      let matched = null;
      for (const f of features) {
        const label = String(
          f.properties?.label || f.properties?.nationalCadastralReference || ""
        ).toUpperCase();
        const pMatch = label.includes(`/${particella}`) ||
          label.includes(`/${particella.padStart(5, "0")}`) ||
          label === particella;
        const fMatch = label.includes(`${foglio}/`) ||
          label.includes(`${foglio.padStart(4, "0")}/`);
        if (pMatch && fMatch) { matched = f; break; }
        if (!matched && pMatch) matched = f;
      }
      // Fallback: feature più vicina al centroide
      if (!matched) {
        let minDist = Infinity;
        for (const f of features) {
          const ring = f.geometry?.coordinates?.[0];
          if (!ring?.length) continue;
          const cLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
          const cLon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
          const d = Math.hypot(cLat - initLat, cLon - initLon);
          if (d < minDist) { minDist = d; matched = f; }
        }
      }
      return matched;
    };

    const fetchWfs = async () => {
      setWfsStatus("🔍 Recupero geometria catastale...");

      const delta  = 0.0015;
      const minLon = (initLon - delta).toFixed(7);
      const minLat = (initLat - delta).toFixed(7);
      const maxLon = (initLon + delta).toFixed(7);
      const maxLat = (initLat + delta).toFixed(7);
      const wfsUrl = `${WFS_URL}?service=WFS&version=2.0.0&request=GetFeature` +
        `&typeNames=CP:CadastralParcel&outputFormat=application%2Fjson` +
        `&BBOX=${minLon},${minLat},${maxLon},${maxLat},EPSG:4326`;

      let data = null;

      // Tentativo 1: chiamata diretta (bloccata da CORS, ma proviamo)
      try {
        const res = await fetch(wfsUrl, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) { data = await res.json(); }
      } catch (_e) { /* CORS normale — si va al proxy */ }

      if (cancelled) return;

      // Tentativo 2: via corsproxy.io — aggira CORS, usa server del proxy
      if (!data) {
        setWfsStatus("🔄 Provo via proxy WFS...");
        try {
          const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(wfsUrl)}`;
          const proxyRes = await fetch(proxyUrl, {
            signal: AbortSignal.timeout(20000),
          });
          if (proxyRes.ok) {
            const text = await proxyRes.text();
            if (text.trim().startsWith("{")) {
              data = JSON.parse(text);
            }
          }
        } catch (_e) { /* proxy non raggiungibile */ }
      }

      if (cancelled) return;

      if (!data) {
        setWfsStatus("🗺️ Confini catastali visibili nel layer WMS — zoom per vedere la particella");
        return;
      }

      const features = data.features || [];
      if (!features.length) {
        setWfsStatus("⚠️ Nessuna particella nel BBOX");
        return;
      }

      const matched = matchFeature(features);
      if (!matched) {
        setWfsStatus("⚠️ Feature non identificata nel BBOX");
        return;
      }

      // Controlla se il match è stato esatto o nearest
      const matchLabel = String(
        matched.properties?.label || matched.properties?.nationalCadastralReference || ""
      ).toUpperCase();
      const isExact = matchLabel.includes(`${foglio.padStart(4,"0")}/`) &&
        (matchLabel.includes(`/${particella}`) || matchLabel.includes(`/${particella.padStart(5,"0")}`));
      setWfsStatus(isExact
        ? "✅ Particella catastale trovata (AdE INSPIRE WFS)"
        : "📐 Geometria approssimata (nearest centroid)");

      addPolygonToMap(matched);
      // Salva in DB → cache permanente per i prossimi carichi
      try {
        await base44.entities.CadastralQuery.update(entity.id, {
          geometry_geojson: matched,
        });
      } catch (e) {
        console.warn("DB save geometry_geojson:", e);
      }
    };

    fetchWfs();
    return () => { cancelled = true; };
  }, [hasPosition, hasPolygon, entity.id, initLat, initLon, foglio, particella, addPolygonToMap]);

  // ── Inizializzazione Leaflet ──────────────────────────────────────────────
  useEffect(() => {
    if (!hasPosition || !mapDivRef.current) return;
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const initMap = () => {
      const L = window.L;
      if (!L) return;
      const map = L.map(mapDivRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([initLat, initLon], 18);
      leafletMapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 20,
      }).addTo(map);

      L.tileLayer.wms(
        "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows",
        {
          layers: "CP.CadastralParcel",
          format: "image/png",
          transparent: true,
          opacity: 0.85,
          attribution: "© Agenzia delle Entrate",
        }
      ).addTo(map);

      if (hasPolygon) {
        const layer = L.geoJSON(geomJson, {
          style: { color: "#c0392b", weight: 3, fillColor: "#e74c3c", fillOpacity: 0.35 },
        }).addTo(map);
        map.fitBounds(layer.getBounds(), { maxZoom: 18, padding: [40, 40] });
        setPolygonLoaded(true);
      } else {
        // Cerchio grande semitrasparente per indicare l'area approssimativa della particella
        L.circle([initLat, initLon], {
          radius: 25,             // ~25 metri, tipica particella urbana
          color: "#c0392b",
          fillColor: "#e74c3c",
          fillOpacity: 0.20,
          weight: 2,
          dashArray: "6 4",
        }).addTo(map);
        // Punto centrale preciso
        L.circleMarker([initLat, initLon], {
          radius: 7,
          color: "#c0392b",
          fillColor: "#e74c3c",
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(map);
      }
    };

    loadLeaflet(initMap);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [initLat, initLon, hasPolygon]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!hasPosition) {
    return (
      <div className="p-4 space-y-2">
        <p className="text-sm text-gray-500">
          📍 Posizione non disponibile — Foglio {foglio}, Particella {particella}
        </p>
        <a
          href="https://geoportale.cartografia.agenziaentrate.gov.it/age-inspire/srv/ita/catalog.search"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 text-sm hover:underline"
        >
          🔗 Cerca su Geoportale AdE →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">
        📍 WGS84: {initLat?.toFixed(5)}, {initLon?.toFixed(5)}{" "}
        <span className="italic text-xs text-gray-400">
          {hasPolygon ? "— poligono da DB" : "— centroide da DB"}
        </span>
      </p>

      {wfsStatus && (
        <p className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
          {wfsStatus}
        </p>
      )}

      <div
        ref={mapDivRef}
        style={{
          height: "420px",
          width: "100%",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          zIndex: 0,
        }}
      />

      <div className="text-xs text-gray-400">
        {polygonLoaded
          ? "📐 Poligono catastale AdE INSPIRE WFS | "
          : `Foglio ${foglio}, Part. ${particella} | `}
        © Leaflet | © OpenStreetMap | © Agenzia delle Entrate
      </div>

      <a
        href="https://geoportale.cartografia.agenziaentrate.gov.it/age-inspire/srv/ita/catalog.search"
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 text-sm hover:underline block"
      >
        🔗 Vedi su Geoportale AdE → (Foglio {foglio}, Part. {particella})
      </a>
    </div>
  );
}
