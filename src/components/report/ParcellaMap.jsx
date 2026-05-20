/**
 * ParcellaMap — mappa Leaflet per particella catastale
 * Mostra poligono GeoJSON (se disponibile dal DB) oppure tenta WFS AdE browser-side,
 * poi fallback marker puntuale + WMS tiles AdE.
 */
import React, { useEffect, useRef, useState } from "react";

const ADE_GEOPORTALE_URL = "https://www.agenziaentrate.gov.it/portale/web/guest/schede/fabbricatiterreni/consultazione-cartografia-catastale/servizio-consultazione-cartografia";

// ── WFS AdE browser-side (3 tentativi: label spazio, label punto, bbox) ──────
async function loadWFSParcel(map, L, foglio, particella, centroLat, centroLon) {
  const baseUrl = 'https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/ows';

  // Filtri 1 e 2: label con spazio e con punto
  const labelFilters = [
    `label='${foglio} ${particella}'`,
    `label='${foglio}.${particella}'`,
  ];

  for (const filter of labelFilters) {
    try {
      const url = `${baseUrl}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=CP:CadastralParcel&CQL_FILTER=${encodeURIComponent(filter)}&SRSNAME=EPSG:4326&outputFormat=application/json&COUNT=5`;
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const layer = L.geoJSON(data, {
          style: { color: '#c0392b', weight: 2.5, fillColor: '#e74c3c', fillOpacity: 0.35 },
        }).addTo(map);
        try { map.fitBounds(layer.getBounds(), { maxZoom: 18, padding: [30, 30] }); } catch (_e) {}
        return true;
      }
    } catch (_e) { continue; }
  }

  // Filtro 3: bbox geografica stretta
  try {
    const bbox = `${centroLon - 0.001},${centroLat - 0.001},${centroLon + 0.001},${centroLat + 0.001}`;
    const url = `${baseUrl}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=CP:CadastralParcel&BBOX=${bbox},EPSG:4326&SRSNAME=EPSG:4326&outputFormat=application/json&COUNT=20`;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        L.geoJSON(data, {
          style: { color: '#c0392b', weight: 2, fillColor: '#e74c3c', fillOpacity: 0.25 },
        }).addTo(map);
        return true;
      }
    }
  } catch (_e) {}

  return false;
}

export default function ParcellaMap({ lat, lon, geojsonPolygon, foglio, particella, height = 280 }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const wfsCalledRef = useRef(false);

  // wfsStatus: null = non ancora tentato, 'success' = poligono WFS caricato, 'fallback' = solo WMS tiles
  const [wfsStatus, setWfsStatus] = useState(null);

  // Se abbiamo già il poligono dal DB, non tentare il WFS
  const polyGeom = geojsonPolygon?.type === 'Feature' ? geojsonPolygon?.geometry : geojsonPolygon;
  const hasDbPolygon = polyGeom?.type === 'Polygon' || polyGeom?.type === 'MultiPolygon';

  const displayLat = lat;
  const displayLon = lon;

  useEffect(() => {
    if (!displayLat || !displayLon || !mapRef.current) return;
    if (leafletMapRef.current) return;

    const loadLeaflet = () => new Promise((resolve) => {
      if (window.L) { resolve(); return; }
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = resolve;
      document.head.appendChild(script);
    });

    loadLeaflet().then(() => {
      const L = window.L;
      if (!mapRef.current || leafletMapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [displayLat, displayLon],
        zoom: 18,
        zoomControl: true,
        scrollWheelZoom: false,
      });
      leafletMapRef.current = map;

      // OSM base layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 21,
      }).addTo(map);

      // WMS catastale AdE — visibile solo a zoom >= 16
      const wmsLayer = L.tileLayer.wms('https://wms.cartografia.agenziaentrate.gov.it/inspire/wms', {
        layers: 'CP.CadastralParcel',
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        opacity: 0.6,
        attribution: '© Agenzia delle Entrate',
        maxZoom: 21,
      });
      const toggleWms = () => {
        if (map.getZoom() >= 16) {
          if (!map.hasLayer(wmsLayer)) wmsLayer.addTo(map);
        } else {
          if (map.hasLayer(wmsLayer)) map.removeLayer(wmsLayer);
        }
      };
      map.on('zoomend', toggleWms);
      toggleWms();

      // ── Disegna poligono DB se disponibile ──────────────────────────────
      if (hasDbPolygon) {
        const layer = L.geoJSON(polyGeom, {
          style: { color: '#1A3A6B', weight: 2.5, opacity: 1, fillColor: '#1A3A6B', fillOpacity: 0.30 },
        }).addTo(map);
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:10px;height:10px;background:#B33A2A;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
          iconSize: [10, 10], iconAnchor: [5, 5],
        });
        L.marker([displayLat, displayLon], { icon }).addTo(map).bindPopup(`📍 Foglio ${foglio}, N. ${particella}`);
        try { map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 20 }); } catch (_e) {}
        setWfsStatus('success');
        return;
      }

      // ── Marker puntuale (sempre presente come fallback) ──────────────────
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:#1A3A6B;border:3px solid #B33A2A;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8],
      });
      L.marker([displayLat, displayLon], { icon })
        .addTo(map)
        .bindPopup(`📍 Lat: ${displayLat.toFixed(5)}, Lon: ${displayLon.toFixed(5)}`);
      L.circle([displayLat, displayLon], {
        radius: 20, color: '#e74c3c', fillColor: '#e74c3c', fillOpacity: 0.15, weight: 2,
      }).addTo(map).bindPopup(foglio && particella ? `Particella ${particella} — Foglio ${foglio}` : '📍 Posizione approssimata');
      map.setView([displayLat, displayLon], 18);

      // ── Tenta WFS AdE browser-side (solo se non già tentato) ─────────────
      if (!wfsCalledRef.current && foglio && particella) {
        wfsCalledRef.current = true;
        loadWFSParcel(map, L, foglio, particella, displayLat, displayLon)
          .then((ok) => setWfsStatus(ok ? 'success' : 'fallback'))
          .catch(() => setWfsStatus('fallback'));
      } else {
        setWfsStatus('fallback');
      }
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [displayLat, displayLon]);

  if (!displayLat || !displayLon) return (
    <div style={{ border: '1px solid #C4BAA8', background: '#F4EFE6', padding: '1rem 1.25rem' }}>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#7A7268' }}>
        📍 Posizione non disponibile per questa analisi
        {foglio && particella ? ` — Foglio ${foglio}, Particella ${particella}` : ''}
      </p>
    </div>
  );

  // ── Label overlay (bottom-left sulla mappa) ───────────────────────────────
  const overlayText = (hasDbPolygon || wfsStatus === 'success')
    ? `✅ Foglio ${foglio}, N. ${particella} — WFS AdE — Agenzia delle Entrate — Baricentro: ${displayLat?.toFixed(5)}, ${displayLon?.toFixed(5)}`
    : null;

  return (
    <div style={{ position: 'relative', border: '1px solid #C4BAA8', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ height, width: '100%' }} />

      {/* Label overlay in-map */}
      {overlayText && (
        <div style={{
          position: 'absolute', bottom: 8, left: 8, zIndex: 1000,
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid #C4BAA8',
          padding: '3px 8px',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.55rem',
          color: '#7A7268',
          maxWidth: '90%',
        }}>
          {overlayText}
        </div>
      )}

      {/* Footer bar */}
      <div style={{
        padding: '5px 10px',
        borderTop: '1px solid #C4BAA8',
        background: '#F4EFE6',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.58rem',
        color: '#7A7268',
      }}>
        {wfsStatus === 'fallback'
          ? '📍 Poligono catastale: usa il layer WMS AdE per visualizzarlo'
          : '📍 Posizione approssimata della particella. Layer catastale © Agenzia delle Entrate'
        }
      </div>
    </div>
  );
}