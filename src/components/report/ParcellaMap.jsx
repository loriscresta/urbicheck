import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { geocodeAddress } from "@/functions/geocodeAddress";

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
  // Coordinate geocodificate dall'indirizzo reale (priorità su centroid GIS)
  const [addressCoords, setAddressCoords] = useState(null);
  const addressMarkerRef = useRef(null);

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

      // Cascading BBOX: parte piccolo, cresce finché non trova foglio+particella ESATTI
      // BUG FIX: non interrompe al primo risultato generico — allarga finché trova match esatto
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
        const minLon = (initLon - delta).toFixed(7);
        const minLat = (initLat - delta).toFixed(7);
        const maxLon = (initLon + delta).toFixed(7);
        const maxLat = (initLat + delta).toFixed(7);
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

      addPolygonToMap(matched);
      // Salva in DB: poligono + centroide REALE calcolato dal poligono WFS
      // Questo corregge il centroide sbagliato da Catastomappe e fix Overpass/ferrovia
      try {
        const ring = matched?.geometry?.coordinates?.[0];
        const updateData = { geometry_geojson: matched };
        if (ring?.length > 2) {
          const cLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
          const cLon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
          updateData.centroid_lat = cLat;
          updateData.centroid_lng = cLon;
          console.log('[ParcellaMap] centroide corretto salvato in DB:', cLat, cLon);
        }
        await base44.entities.CadastralQuery.update(entity.id, updateData);
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
      if (!L || !mapDivRef.current) return;
      // Remove any stale Leaflet instance on the DOM node (prevents "already initialized" error)
      if (mapDivRef.current._leaflet_id != null) {
        delete mapDivRef.current._leaflet_id;
      }
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
        const addrLabel = entity.indirizzo_immobile || entity.comune || '';
        L.circleMarker([initLat, initLon], {
          radius: 7,
          color: "#c0392b",
          fillColor: "#e74c3c",
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(map).bindPopup(
          `<strong>📍 ${addrLabel}</strong><br/>Foglio ${foglio}, Particella ${particella}${entity.subalterno ? `, Sub. ${entity.subalterno}` : ''}`
        ).openPopup();
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



  // ── Geocoding indirizzo immobile (priorità su centroid GIS per frazioni/rurali) ──
  useEffect(() => {
    if (!entity.indirizzo_immobile) return;
    let cancelled = false;
    geocodeAddress({
      indirizzo: entity.indirizzo_immobile,
      comune: entity.comune || '',
      provincia: entity.provincia || entity.sigla_provincia || '',
    }).then(res => {
      if (cancelled) return;
      const d = res?.data;
      if (!d?.lat || !d?.lng || isNaN(d.lat) || isNaN(d.lng)) return;
      // FIX: accetta GEOMETRIC_CENTER per frazioni/rurali (Google Maps lo usa per i centroidi di frazione)
      const precise = d.location_type === 'ROOFTOP' || d.location_type === 'RANGE_INTERPOLATED' || d.location_type === 'GEOMETRIC_CENTER' || d.source === 'nominatim';
      if (precise) {
        setAddressCoords({ lat: d.lat, lng: d.lng, formatted: d.formatted_address, source: 'rooftop' });
        console.log('[ParcellaMap] geocoded ROOFTOP/RANGE_INTERPOLATED:', d.lat, d.lng);
      } else {
        console.log('[ParcellaMap] geocoding scartato (location_type=' + d.location_type + ') — uso centroide catastale');
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [entity.indirizzo_immobile, entity.comune]);

  // ── Re-lancia WFS dalle coordinate geocodificate (fix centroide DB sbagliato) ──
  // Quando il geocoding trova l'indirizzo, ri-cerca la particella da quelle coordinate
  useEffect(() => {
    if (!addressCoords || hasPolygon || !entity.id || !foglio || !particella) return;
    let cancelled = false;
    const { foglio: foglioNum } = parseFoglio(foglio);

    const retryWfsFromAddress = async () => {
      setWfsStatus("🔍 Ri-cerco geometria dall'indirizzo geocodificato…");
      const deltas = [0.003, 0.01, 0.04];
      for (const delta of deltas) {
        if (cancelled) return;
        const minLon = (addressCoords.lng - delta).toFixed(7);
        const minLat = (addressCoords.lat - delta).toFixed(7);
        const maxLon = (addressCoords.lng + delta).toFixed(7);
        const maxLat = (addressCoords.lat + delta).toFixed(7);
        const wfsUrl = `${WFS_URL}?service=WFS&version=2.0.0&request=GetFeature` +
          `&typeNames=CP:CadastralParcel&outputFormat=application%2Fjson` +
          `&BBOX=${minLon},${minLat},${maxLon},${maxLat},EPSG:4326`;
        let fetched = null;
        try {
          const res = await fetch(wfsUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
          if (res.ok) { const d = await res.json(); if (d?.features?.length) fetched = d; }
        } catch (_e) {}
        if (!fetched?.features?.length) {
          try {
            const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(wfsUrl)}`;
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
            if (res.ok) { const t = await res.text(); if (t.trim().startsWith("{")) { const d = JSON.parse(t); if (d?.features?.length) fetched = d; } }
          } catch (_e) {}
        }
        if (fetched?.features?.length && !cancelled) {
          // Cerca match esatto foglio+particella
          const exact = fetched.features.find(f => {
            const lbl = String(f.properties?.label || f.properties?.nationalCadastralReference || "").toUpperCase();
            return (lbl.includes(`/${particella}`) || lbl.includes(`/${particella.padStart(5,"0")}`)) &&
                   (lbl.includes(`${foglioNum}/`) || lbl.includes(`${foglioNum.padStart(4,"0")}/`));
          });
          if (exact) {
            addPolygonToMap(exact);
            try {
              const ring = exact?.geometry?.coordinates?.[0];
              const updateData = { geometry_geojson: exact };
              if (ring?.length > 2) {
                const cLat = ring.reduce((s,c) => s+c[1], 0) / ring.length;
                const cLon = ring.reduce((s,c) => s+c[0], 0) / ring.length;
                updateData.centroid_lat = cLat;
                updateData.centroid_lng = cLon;
              }
              await base44.entities.CadastralQuery.update(entity.id, updateData);
            } catch (e) { console.warn("DB update from address WFS:", e); }
            setWfsStatus("✅ Particella trovata via geocoding indirizzo");
            return;
          }
        }
      }
      if (!cancelled) setWfsStatus("🗺️ Confini catastali visibili nel layer WMS — zoom per vedere la particella");
    };
    retryWfsFromAddress();
    return () => { cancelled = true; };
  }, [addressCoords, hasPolygon, entity.id, foglio, particella, addPolygonToMap]);

  // ── Pan mappa all'indirizzo reale quando arriva il geocoding ──
  useEffect(() => {
    if (!addressCoords || !leafletMapRef.current) return;
    const L = window.L;
    const map = leafletMapRef.current;
    if (!L || !map) return;

    // Se non c'è già un poligono preciso, pan all'indirizzo e aggiorna marker
    if (!hasPolygon) {
      map.setView([addressCoords.lat, addressCoords.lng], 17);
      // Rimuovi eventuale marker precedente
      if (addressMarkerRef.current) {
        map.removeLayer(addressMarkerRef.current);
      }
      // Aggiungi marker all'indirizzo reale
      addressMarkerRef.current = L.circleMarker([addressCoords.lat, addressCoords.lng], {
        radius: 8, color: '#1A3A6B', fillColor: '#2563eb', fillOpacity: 0.9, weight: 2,
      }).addTo(map).bindPopup(
        `<strong>📍 ${entity.indirizzo_immobile}</strong><br/>${addressCoords.formatted || entity.comune}<br/><small style="color:#666">Posizione geocodificata da indirizzo</small>`
      ).openPopup();
    }
  }, [addressCoords, hasPolygon]);

  // Geocode municipality when no cadastral position available — use comune + provincia for accuracy
  useEffect(() => {
    if (hasPosition || !entity.comune) return;
    const q = entity.provincia
      ? `${entity.comune}, ${entity.provincia}, Italia`
      : `${entity.comune}, Italia`;
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=it`)
      .then(r => r.json())
      .then(data => {
        if (data[0]) setGeocodedMunPos({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
      })
      .catch(() => {});
  }, [hasPosition, entity.comune, entity.provincia]);

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

  // Coordinate effettive per la visualizzazione
  const displayLat = addressCoords?.lat ?? initLat;
  const displayLon = addressCoords?.lng ?? initLon;

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">
        📍 WGS84: {displayLat?.toFixed(5)}, {displayLon?.toFixed(5)}{" "}
        <span className="italic text-xs text-gray-400">
          {hasPolygon
            ? '— poligono catastale AdE'
            : addressCoords?.source === 'rooftop'
            ? '— indirizzo geocodificato (' + (addressCoords?.location_type || 'ok') + ')'
            : (initLat && initLon)
            ? '— centroide particella catastale'
            : '— posizione approssimata — verificare'}
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