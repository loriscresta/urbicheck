/**
 * ParcellaMap — mappa Leaflet per particella catastale
 * Coordinate da query.centroid_lat / query.centroid_lng con fallback chain.
 */
import React, { useEffect, useRef, useState } from "react";

const ADE_GEOPORTALE_URL = "https://www.agenziaentrate.gov.it/portale/web/guest/schede/fabbricatiterreni/consultazione-cartografia-catastale/servizio-consultazione-cartografia";

async function loadWFSParcel(map, L, centroLat, centroLon) {
  try {
    const delta = 0.0018;
    const url = `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=CP:CadastralParcel&BBOX=${centroLon - delta},${centroLat - delta},${centroLon + delta},${centroLat + delta},EPSG:4326&SRSNAME=EPSG:4326&outputFormat=application/json&COUNT=30`;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.features || data.features.length === 0) return false;

    let closestFeature = null, minDist = Infinity;
    data.features.forEach(f => {
      if (f.geometry) {
        const coords = f.geometry.type === 'Polygon'
          ? f.geometry.coordinates[0]
          : (f.geometry.coordinates[0] || [])[0] || [];
        if (coords.length > 0) {
          const avgLon = coords.reduce((s, c) => s + c[0], 0) / coords.length;
          const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
          const d = Math.pow(avgLon - centroLon, 2) + Math.pow(avgLat - centroLat, 2);
          if (d < minDist) { minDist = d; closestFeature = f; }
        }
      }
    });

    L.geoJSON({ type: 'FeatureCollection', features: data.features }, {
      style: { color: '#94a3b8', weight: 1, fillColor: '#cbd5e1', fillOpacity: 0.15 },
    }).addTo(map);

    if (closestFeature) {
      const hl = L.geoJSON(closestFeature, {
        style: { color: '#c0392b', weight: 3, fillColor: '#e74c3c', fillOpacity: 0.4 },
      }).addTo(map);
      try { map.fitBounds(hl.getBounds(), { maxZoom: 18, padding: [40, 40] }); } catch (_e) {}
    }
    return true;
  } catch (_e) { return false; }
}

export default function ParcellaMap({ lat: latProp, lon: lonProp, query, foglio, particella, height = 420 }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const wfsCalledRef = useRef(false);
  const [wfsOk, setWfsOk] = useState(null);

  // Fallback chain per le coordinate
  const lat = latProp || query?.centroid_lat || query?.wfs_liguria?.lat || query?.report_data?.lat || null;
  const lon = lonProp || query?.centroid_lng || query?.wfs_liguria?.lon || query?.report_data?.lon || null;
  const validCoords = lat && lon && !isNaN(Number(lat)) && !isNaN(Number(lon)) && !(Number(lat) === 0 && Number(lon) === 0);

  useEffect(() => {
    if (!validCoords || !mapRef.current) return;
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
        center: [lat, lon],
        zoom: 17,
        zoomControl: true,
        scrollWheelZoom: false,
      });
      leafletMapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 21,
      }).addTo(map);

      L.tileLayer.wms('https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows', {
        layers: 'CP.CadastralParcel',
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        opacity: 0.7,
        attribution: '© Agenzia delle Entrate',
        maxZoom: 21,
      }).addTo(map);

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;background:#e74c3c;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.45);"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      });
      L.marker([lat, lon], { icon })
        .addTo(map)
        .bindPopup(`📍 Foglio ${foglio}, Particella ${particella}<br/>${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`);

      if (!wfsCalledRef.current) {
        wfsCalledRef.current = true;
        loadWFSParcel(map, L, lat, lon)
          .then(ok => setWfsOk(ok))
          .catch(() => setWfsOk(false));
      }
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [lat, lon]);

  if (!validCoords) {
    return (
      <div style={{ border: '1px solid #C4BAA8', background: '#F4EFE6', padding: '1rem 1.25rem' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#7A7268' }}>
          📍 Posizione non disponibile
          {foglio && particella ? ` — Foglio ${foglio}, Particella ${particella}` : ''}
        </p>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #C4BAA8', overflow: 'hidden' }}>
      <div style={{
        padding: '4px 10px',
        background: '#F4EFE6',
        borderBottom: '1px solid #C4BAA8',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.58rem',
        color: '#7A7268',
      }}>
        📍 WGS84: {Number(lat).toFixed(5)}, {Number(lon).toFixed(5)} &nbsp;|&nbsp; OnData CC BY 4.0
      </div>

      <div ref={mapRef} style={{ height, width: '100%' }} />

      <div style={{
        padding: '5px 10px',
        borderTop: '1px solid #C4BAA8',
        background: '#F4EFE6',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.56rem',
        color: '#7A7268',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <span>
          Foglio {foglio}, Part. {particella}
          {wfsOk === true && ' | ✓ Poligono WFS AdE'}
          {' | © Leaflet | © OpenStreetMap | © Agenzia delle Entrate'}
        </span>
        <a href={ADE_GEOPORTALE_URL} target="_blank" rel="noopener noreferrer"
          style={{ color: '#1A3A6B', whiteSpace: 'nowrap' }}>
          🔗 Vedi su Geoportale AdE → (Foglio {foglio}, Part. {particella})
        </a>
      </div>
    </div>
  );
}