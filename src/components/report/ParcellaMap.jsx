import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const WFS_URL = "https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/ows";

// BUG 1 — Handle alphanumeric foglio (sezioni catastali): "B/5", "B5", "A/3", "C12"
function parseFoglio(rawFoglio) {
  const match = String(rawFoglio || '').trim().match(/^([A-Za-z])[\s\/]?(\d+)$/);
  if (match) return { sezione: match[1].toUpperCase(), foglio: match[2] };
  return { sezione: null, foglio: String(rawFoglio || '').trim() };
}

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
  const munMapDivRef  = useRef(null);
  const [polygonLoaded, setPolygonLoaded] = useState(false);
  const [wfsStatus,     setWfsStatus]     = useState("");
  const [geocodedMunPos, setGeocodedMunPos] = useState(null);

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
    const { foglio: foglioNum } = parseFoglio(foglio);

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
        const fMatch = label.includes(`${foglioNum}/`) ||
          label.includes(`${foglioNum.padStart(4, "0")}/`);
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

  // FIX 2 — Hardcoded coords for major Italian municipalities to avoid geocoding errors
  const MUNICIPALITY_COORDS = {
    'Pavia': { lat: 45.1847, lon: 9.1582 },
    'Milano': { lat: 45.4642, lon: 9.1900 },
    'Torino': { lat: 45.0703, lon: 7.6869 },
    'Genova': { lat: 44.4056, lon: 8.9463 },
    'Alessandria': { lat: 44.9124, lon: 8.6151 },
    'Novara': { lat: 45.4469, lon: 8.6219 },
    'Bergamo': { lat: 45.6983, lon: 9.6773 },
    'Brescia': { lat: 45.5416, lon: 10.2118 },
    'Como': { lat: 45.8080, lon: 9.0852 },
    'Cremona': { lat: 45.1333, lon: 10.0333 },
    'Lecco': { lat: 45.8564, lon: 9.3925 },
    'Lodi': { lat: 45.3150, lon: 9.5033 },
    'Mantova': { lat: 45.1564, lon: 10.7914 },
    'Monza': { lat: 45.5845, lon: 9.2744 },
    'Sondrio': { lat: 46.1697, lon: 9.8706 },
    'Varese': { lat: 45.8206, lon: 8.8257 },
    'Asti': { lat: 44.9003, lon: 8.2064 },
    'Cuneo': { lat: 44.3905, lon: 7.5464 },
    'Biella': { lat: 45.5658, lon: 8.0533 },
    'Verbania': { lat: 45.9236, lon: 8.5506 },
    'Vercelli': { lat: 45.3239, lon: 8.4233 },
    'Roma': { lat: 41.9028, lon: 12.4964 },
    'Napoli': { lat: 40.8518, lon: 14.2681 },
    'Firenze': { lat: 43.7696, lon: 11.2558 },
    'Bologna': { lat: 44.4949, lon: 11.3426 },
    'Venezia': { lat: 45.4408, lon: 12.3155 },
    'La Spezia': { lat: 44.1024, lon: 9.8240 },
    'Savona': { lat: 44.3069, lon: 8.4820 },
    'Imperia': { lat: 43.8870, lon: 8.0268 },
    'Sanremo': { lat: 43.8155, lon: 7.7762 },
  };

  // FIX 8 — Geocode municipality when no cadastral position available
  useEffect(() => {
    if (hasPosition || !entity.comune) return;
    // Use hardcoded coords first to avoid geocoding errors (e.g. Pavia → Casteggio)
    const knownCoords = MUNICIPALITY_COORDS[entity.comune];
    if (knownCoords) {
      setGeocodedMunPos(knownCoords);
      return;
    }
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(entity.comune + ', Italy')}&format=json&limit=1`)
      .then(r => r.json())
      .then(data => {
        if (data[0]) setGeocodedMunPos({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
      })
      .catch(() => {});
  }, [hasPosition, entity.comune]);

  // FIX 8 — Init municipality fallback map
  useEffect(() => {
    if (!geocodedMunPos || !munMapDivRef.current) return;
    let munMap = null;
    const initMunMap = () => {
      const L = window.L;
      if (!L || !munMapDivRef.current) return;
      munMap = L.map(munMapDivRef.current).setView([geocodedMunPos.lat, geocodedMunPos.lon], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20, attribution: '© OpenStreetMap' }).addTo(munMap);
      L.tileLayer.wms('https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows', {
        layers: 'CP.CadastralParcel', format: 'image/png', transparent: true, opacity: 0.85, attribution: '© AdE',
      }).addTo(munMap);
      const parsed = parseFoglio(foglio);
      L.marker([geocodedMunPos.lat, geocodedMunPos.lon])
        .addTo(munMap)
        .bindPopup(`<b>📍 Comune di ${entity.comune}</b><br/>Foglio ${parsed.sezione ? parsed.sezione + '/' + parsed.foglio : foglio}, Particella ${particella}<br/><small>Posizione approssimata al centro comune</small>`)
        .openPopup();
    };
    loadLeaflet(initMunMap);
    return () => { if (munMap) { munMap.remove(); munMap = null; } };
  }, [geocodedMunPos]);

  // ── Render ────────────────────────────────────────────────────────────────
  const parsed = parseFoglio(foglio);
  const foglioDisplay = parsed.sezione ? `${parsed.sezione}/${parsed.foglio}` : foglio;

  if (!hasPosition) {
    const parsed = parseFoglio(foglio);
    return (
      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          📍 Posizione approssimata al Comune di <strong>{entity.comune || foglio}</strong> — sezione catastale {parsed.sezione || 'principale'}, foglio {parsed.foglio}, particella {particella}. Verificare la particella esatta su Geoportale AdE.
        </div>
        {!geocodedMunPos && (
          <p className="text-sm text-gray-400 py-2">🔍 Ricerca posizione comune in corso…</p>
        )}
        {geocodedMunPos && (
          <div
            ref={munMapDivRef}
            style={{ height: '320px', width: '100%', borderRadius: '8px', border: '1px solid #e5e7eb', zIndex: 0 }}
          />
        )}
        <a
          href="https://geoportale.cartografia.agenziaentrate.gov.it/age-inspire/srv/ita/catalog.search"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 text-sm hover:underline block"
        >
          🔗 Cerca particella su Geoportale AdE →
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