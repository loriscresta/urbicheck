/**
 * ParcellaMap — mappa Leaflet per particella catastale
 * Tenta WFS AdE BBOX browser-side; fallback WMS tiles + marker puntuale.
 */
import React, { useEffect, useRef, useState } from "react";

const ADE_GEOPORTALE_URL = "https://www.agenziaentrate.gov.it/portale/web/guest/schede/fabbricatiterreni/consultazione-cartografia-catastale/servizio-consultazione-cartografia";

async function loadWFSParcelBBOX(map, L, centroLat, centroLon) {
  try {
    const delta = 0.0018;
    const minLon = (centroLon - delta).toFixed(7);
    const maxLon = (centroLon + delta).toFixed(7);
    const minLat = (centroLat - delta).toFixed(7);
    const maxLat = (centroLat + delta).toFixed(7);

    const url = `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=CP:CadastralParcel&BBOX=${minLon},${minLat},${maxLon},${maxLat},EPSG:4326&SRSNAME=EPSG:4326&outputFormat=application/json&COUNT=30`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return false;
    const data = await res.json();
    if (!data.features || data.features.length === 0) return false;

    // Trova la feature più vicina al centroide
    let closestFeature = null;
    let minDist = Infinity;
    data.features.forEach(f => {
      if (f.geometry) {
        const coords = f.geometry.type === 'Polygon'
          ? f.geometry.coordinates[0]
          : f.geometry.coordinates[0][0];
        if (coords && coords.length > 0) {
          const avgLon = coords.reduce((s, c) => s + c[0], 0) / coords.length;
          const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
          const dist = Math.pow(avgLon - centroLon, 2) + Math.pow(avgLat - centroLat, 2);
          if (dist < minDist) { minDist = dist; closestFeature = f; }
        }
      }
    });

    // Disegna tutte le particelle in grigio chiaro
    L.geoJSON({ type: 'FeatureCollection', features: data.features }, {
      style: { color: '#94a3b8', weight: 1, fillColor: '#cbd5e1', fillOpacity: 0.15 },
    }).addTo(map);

    // Evidenzia la particella più vicina
    if (closestFeature) {
      const highlight = L.geoJSON(closestFeature, {
        style: { color: '#c0392b', weight: 3, fillColor: '#e74c3c', fillOpacity: 0.4 },
      }).addTo(map);
      try { map.fitBounds(highlight.getBounds(), { maxZoom: 18, padding: [40, 40] }); } catch (_e) {}
      return true;
    }
  } catch (_e) {}
  return false;
}

export default function ParcellaMap({ lat, lon, geojsonPolygon, foglio, particella, height = 280 }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const wfsCalledRef = useRef(false);
  const [wfsStatus, setWfsStatus] = useState(null); // null | 'success' | 'fallback'

  const polyGeom = geojsonPolygon?.type === 'Feature' ? geojsonPolygon?.geometry : geojsonPolygon;
  const hasDbPolygon = polyGeom?.type === 'Polygon' || polyGeom?.type === 'MultiPolygon';

  useEffect(() => {
    if (!lat || !lon || !mapRef.current) return;
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
        zoom: 18,
        zoomControl: true,
        scrollWheelZoom: false,
      });
      leafletMapRef.current = map;

      // OSM base
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

      // Marker centroide (sempre)
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:12px;height:12px;background:#1A3A6B;border:2px solid #B33A2A;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [12, 12], iconAnchor: [6, 6],
      });
      L.marker([lat, lon], { icon })
        .addTo(map)
        .bindPopup(`📍 Foglio ${foglio}, Particella ${particella}`);

      // Poligono dal DB se presente
      if (hasDbPolygon) {
        const layer = L.geoJSON(polyGeom, {
          style: { color: '#1A3A6B', weight: 2.5, fillColor: '#1A3A6B', fillOpacity: 0.30 },
        }).addTo(map);
        try { map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 20 }); } catch (_e) {}
        setWfsStatus('success');
        return;
      }

      // Tenta WFS BBOX
      if (!wfsCalledRef.current) {
        wfsCalledRef.current = true;
        loadWFSParcelBBOX(map, L, lat, lon)
          .then(ok => setWfsStatus(ok ? 'success' : 'fallback'))
          .catch(() => setWfsStatus('fallback'));
      }
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [lat, lon]);

  if (!lat || !lon) return (
    <div style={{ border: '1px solid #C4BAA8', background: '#F4EFE6', padding: '1rem 1.25rem' }}>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#7A7268' }}>
        📍 Posizione non disponibile{foglio && particella ? ` — Foglio ${foglio}, Particella ${particella}` : ''}
      </p>
    </div>
  );

  return (
    <div style={{ border: '1px solid #C4BAA8', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ height, width: '100%' }} />
      <div style={{
        padding: '5px 10px',
        borderTop: '1px solid #C4BAA8',
        background: '#F4EFE6',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.58rem',
        color: '#7A7268',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}>
        {wfsStatus === 'success'
          ? `✓ Poligono catastale AdE — Foglio ${foglio}, Part. ${particella}`
          : wfsStatus === 'fallback'
            ? <>
                <span>Foglio {foglio}, Part. {particella} — Poligono non disponibile</span>
                <a href={ADE_GEOPORTALE_URL} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#1A3A6B' }}>
                  → Geoportale AdE
                </a>
              </>
            : `Foglio ${foglio}, Part. ${particella} — caricamento poligono…`
        }
      </div>
    </div>
  );
}