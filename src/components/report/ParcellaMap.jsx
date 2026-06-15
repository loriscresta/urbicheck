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
  const rawGeom    = entity.geometry_geojson  || null;

  // Normalizza geometry_geojson in un GeoJSON Feature (L.geoJSON accetta sia Feature che Geometry)
  // Il DB può contenere sia {"type":"Polygon","coordinates":[...]} (Geometry)
  // sia {"type":"Feature","geometry":{...}} (Feature)
  const geomJson = rawGeom
    ? (rawGeom.type === "Feature" ? rawGeom : { type: "Feature", geometry: rawGeom, properties: {} })
    : null;

  // ── State e refs ──────────────────────────────────────────────────────────
  const mapDivRef       = useRef(null);
  const leafletMapRef   = useRef(null);
  const geojsonLayerRef = useRef(null);
  const [polygonLoaded, setPolygonLoaded] = useState(false);
  const [wfsStatus,     setWfsStatus]     = useState("");

  const PARCEL_STYLE = { color: "#FF6600", weight: 2.5, fillColor: "#FF6600", fillOpacity: 0.35 };

  // ── Validazione poligono: calcola distanza Haversine baricentro → riferimento ──
  function polygonCentroidDistance(polygonGeom, refLat, refLng) {
    if (!polygonGeom?.coordinates?.[0]?.length || !refLat || !refLng) return null;
    const ring = polygonGeom.coordinates[0];
    const cLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    const cLon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    const R = 6371000;
    const dLat = (cLat - refLat) * Math.PI / 180;
    const dLon = (cLon - refLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(refLat * Math.PI / 180) * Math.cos(cLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── Logica pin: SOLO geocoded_lat/lng || centroid_lat/lng ──
  const mapLat = entity.geocoded_lat != null ? parseFloat(entity.geocoded_lat) : (entity.centroid_lat ? parseFloat(entity.centroid_lat) : null);
  const mapLng = entity.geocoded_lng != null ? parseFloat(entity.geocoded_lng) : (entity.centroid_lng ? parseFloat(entity.centroid_lng) : null);
  const referenceLat = mapLat;
  const referenceLng = mapLng;

  const hasPosition = !!(referenceLat && referenceLng && !isNaN(referenceLat) && !isNaN(referenceLng));

  // Validazione poligono: baricentro del poligono deve essere entro 300m dal riferimento
  const validGeometry = (() => {
    if (!geomJson?.geometry?.coordinates) return null;
    if (!hasPosition) return geomJson; // no ref = assume valid
    const dist = polygonCentroidDistance(geomJson.geometry, referenceLat, referenceLng);
    if (dist !== null && dist > 300) return null; // scarta — poligono troppo lontano dal riferimento
    return geomJson;
  })();
  const hasPolygon  = !!validGeometry;

  const addPolygonToMap = useCallback((feature) => {
    const L   = window.L;
    const map = leafletMapRef.current;
    if (!L || !map || !feature) return;
    try {
      // Rimuovi layer precedente se presente
      if (geojsonLayerRef.current) {
        map.removeLayer(geojsonLayerRef.current);
        geojsonLayerRef.current = null;
      }
      const layer = L.geoJSON(feature, { style: PARCEL_STYLE }).addTo(map);
      geojsonLayerRef.current = layer;
      map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 19 });
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
      // Fallback: feature più vicina al punto di riferimento
      if (!matched) {
        let minDist = Infinity;
        for (const f of features) {
          const ring = f.geometry?.coordinates?.[0];
          if (!ring?.length) continue;
          const cLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
          const cLon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
          const d = Math.hypot(cLat - referenceLat, cLon - referenceLng);
          if (d < minDist) { minDist = d; matched = f; }
        }
      }
      return matched;
    };

    const fetchWfs = async () => {
      setWfsStatus("🔍 Recupero geometria catastale...");

      // Cascading BBOX: centrato sull'indirizzo reale, cresce finché non trova foglio+particella ESATTI
      const deltas = [0.002, 0.01, 0.03, 0.06];
      let data = null;
      let exactMatchFound = false;

      const isExactLabel = (feature) => {
        const lbl = String(
          feature?.properties?.label ||
          feature?.properties?.nationalCadastralReference || ""
        ).toUpperCase();
        const { foglio: foglioNum } = parseFoglio(foglio);
        const pMatch = lbl.includes(`/${particella}`) ||
          lbl.includes(`/${particella.padStart(5, "0")}`);
        const fMatch = lbl.includes(`${foglioNum}/`) ||
          lbl.includes(`${foglioNum.padStart(4, "0")}/`);
        return pMatch && fMatch;
      };

      for (const delta of deltas) {
        if (exactMatchFound) break;
        const minLon = (referenceLng - delta).toFixed(7);
        const minLat = (referenceLat - delta).toFixed(7);
        const maxLon = (referenceLng + delta).toFixed(7);
        const maxLat = (referenceLat + delta).toFixed(7);
        const wfsUrl = `${WFS_URL}?service=WFS&version=2.0.0&request=GetFeature` +
          `&typeNames=CP:CadastralParcel&outputFormat=application%2Fjson` +
          `&BBOX=${minLon},${minLat},${maxLon},${maxLat},EPSG:4326`;

        if (cancelled) return;
        setWfsStatus(delta > 0.005
          ? `🔄 Allargo la ricerca (±${(delta * 111).toFixed(0)} km)…`
          : "🔍 Recupero geometria catastale...");

        // Tentativo diretto
        let fetched = null;
        try {
          const res = await fetch(wfsUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
          if (res.ok) { const d = await res.json(); if (d?.features?.length) fetched = d; }
        } catch (_e) {}

        if (cancelled) return;

        // Via proxy se diretto non ha dato risultati
        if (!fetched?.features?.length) {
          try {
            const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(wfsUrl)}`;
            const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
            if (proxyRes.ok) {
              const text = await proxyRes.text();
              if (text.trim().startsWith("{")) {
                const d = JSON.parse(text);
                if (d?.features?.length) fetched = d;
              }
            }
          } catch (_e) {}
        }

        if (fetched?.features?.length) {
          // Controlla se c'è un match esatto foglio+particella
          const hasExact = fetched.features.some(isExactLabel);
          if (hasExact) {
            data = fetched;
            exactMatchFound = true;
          } else {
            // Nessun match esatto: salva come fallback e continua ad allargare
            data = fetched;
            // continua il loop con delta più grande
          }
        }
      }

      if (cancelled) return;

      if (!data) {
        setWfsStatus("🗺️ Confini catastali visibili nel layer WMS — zoom per vedere la particella");
        return;
      }

      const features = data.features || [];
      if (!features.length) {
        setWfsStatus("🗺️ Confini catastali visibili nel layer WMS — zoom per vedere la particella");
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

      // Validazione distanza dal riferimento prima di salvare
      const ringCheck = matched?.geometry?.coordinates?.[0];
      let savePolygon = true;
      if (ringCheck?.length > 2 && referenceLat && referenceLng) {
        const dist = polygonCentroidDistance(matched.geometry, referenceLat, referenceLng);
        if (dist !== null && dist > 300) {
          console.warn(`[ParcellaMap] Poligono scartato — baricentro a ${dist.toFixed(0)}m dal riferimento`);
          savePolygon = false;
          setWfsStatus("⚠️ Poligono catastale non disponibile — troppo distante dal riferimento");
        }
      }

      if (savePolygon) {
        addPolygonToMap(matched);
        // Salva solo geometry_geojson — NON sovrascrivere centroid_lat/lng (l'autorità è l'indirizzo)
        try {
          await base44.entities.CadastralQuery.update(entity.id, { geometry_geojson: matched });
        } catch (e) {
          console.warn("DB save geometry_geojson:", e);
        }
      } else {
        // Non salvare il poligono sbagliato — mostra solo marker
        addPolygonToMap(null);
      }
    };

    fetchWfs();
    return () => { cancelled = true; };
  }, [hasPosition, hasPolygon, entity.id, referenceLat, referenceLng, foglio, particella, addPolygonToMap]);

  // ── Inizializzazione Leaflet ──────────────────────────────────────────────
  useEffect(() => {
    if (!hasPosition || !mapDivRef.current) return;
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const initMap = () => {
      const L = window.L;
      if (!L || !mapDivRef.current) return;
      // Remove any stale Leaflet instance on the DOM node (prevents "already initialized" error)
      if (mapDivRef.current._leaflet_id != null) {
        delete mapDivRef.current._leaflet_id;
      }
      const map = L.map(mapDivRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([referenceLat, referenceLng], 15);
      leafletMapRef.current = map;

      const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 20,
      });
      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "© Esri, Maxar, Earthstar Geographics",
          maxZoom: 20,
        }
      );
      osmLayer.addTo(map);
      L.control.layers({ "Mappa": osmLayer, "Satellite": satelliteLayer }, {}, { position: 'topright' }).addTo(map);

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

      // ═══ PIN PRINCIPALE: sempre sull'indirizzo reale ═══
      const addrLabel = entity.indirizzo_immobile || entity.indirizzo_catastale || entity.comune || '';
      const pinPopup = entity.indirizzo_immobile
        ? `<strong>📍 ${entity.indirizzo_immobile}</strong><br/>Foglio ${foglio}, Particella ${particella}${entity.subalterno ? `, Sub. ${entity.subalterno}` : ''}<br/><small style="color:#666">Posizione geocodificata da indirizzo</small>`
        : `<strong>📍 ${addrLabel}</strong><br/>Foglio ${foglio}, Particella ${particella}${entity.subalterno ? `, Sub. ${entity.subalterno}` : ''}`;
      L.circleMarker([referenceLat, referenceLng], {
        radius: 8,
        color: '#1A3A6B',
        fillColor: '#2563eb',
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map).bindPopup(pinPopup).openPopup();

      if (validGeometry) {
        // Poligono ufficiale: arancione pieno 35% — fitBounds sul poligono reale
        const layer = L.geoJSON(validGeometry, { style: PARCEL_STYLE }).addTo(map);
        geojsonLayerRef.current = layer;
        layer.bindPopup(
          `<strong>📐 Mappale catastale</strong><br/>Foglio ${foglio}, Particella ${particella}${entity.subalterno ? `, Sub. ${entity.subalterno}` : ''}<br/><small style="color:#666">Confine catastale ufficiale</small>`
        );
        map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 19 });
        setPolygonLoaded(true);
      } else {
        // Poligono scartato o assente: cerchio tratteggiato intorno al pin
        L.circle([referenceLat, referenceLng], {
          radius: 25,
          color: "#c0392b",
          fillColor: "#e74c3c",
          fillOpacity: 0.15,
          weight: 2,
          dashArray: "6 4",
        }).addTo(map);
        if (geomJson?.geometry?.coordinates) {
          // C'è un poligono ma è stato scartato — nota esplicativa
          L.circleMarker([referenceLat, referenceLng], {
            radius: 9,
            color: "#c0392b",
            fillColor: "#e74c3c",
            fillOpacity: 0.85,
            weight: 2.5,
          }).addTo(map).bindPopup(
            `<strong>⚠️ Poligono catastale non disponibile</strong><br/>Il poligono WFS è troppo distante dall'indirizzo<br/><small style="color:#666">Foglio ${foglio}, Particella ${particella}${entity.subalterno ? `, Sub. ${entity.subalterno}` : ''}</small>`
          );
        }
      }
    };

    loadLeaflet(initMap);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [referenceLat, referenceLng, hasPolygon]);



  // ── Aggiorna layer GeoJSON quando geometry_geojson cambia (validato) ──
  useEffect(() => {
    const L = window.L;
    const map = leafletMapRef.current;
    if (!L || !map) return;
    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }
    if (!validGeometry) return; // poligono scartato — nessun layer
    try {
      const layer = L.geoJSON(validGeometry, { style: PARCEL_STYLE }).addTo(map);
      geojsonLayerRef.current = layer;
      map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 19 });
      setPolygonLoaded(true);
    } catch (err) {
      console.error("geomJson update layer error", err);
    }
  }, [validGeometry]);

  // Il geocoding Nominatim dell'indirizzo è disabilitato — le coordinate provengono solo da geocoded_lat/lng (se già salvate) o centroid_lat/lng

  // ── Render ────────────────────────────────────────────────────────────────

  if (!hasPosition) {
    return (
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
        <p>📍 Coordinate non disponibili per Foglio {foglio}, Particella {particella} a {entity.comune || '—'}. Verificare la particella su Geoportale AdE.</p>
        <a
          href="https://geoportale.cartografia.agenziaentrate.gov.it/age-inspire/srv/ita/catalog.search"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline block"
        >
          🔗 Cerca particella su Geoportale AdE →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">
        {hasPolygon
          ? <>📐 Confine catastale ufficiale della particella (fonte: catasto)</>
          : <>📍 Posizione da centroide catastale — i confini ufficiali sono visibili nel layer WMS dell'Agenzia delle Entrate zoomando sulla mappa.</>
        }
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