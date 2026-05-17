/**
 * ParcellaMap — mappa Leaflet per particella catastale
 * Mostra poligono GeoJSON (se disponibile) o tenta WFS AdE, poi fallback marker puntuale
 */
import React, { useEffect, useRef, useState } from "react";
import { fetchParcelGeometry } from "@/functions/fetchParcelGeometry";

const ADE_GEOPORTALE_URL = "https://www.agenziaentrate.gov.it/portale/web/guest/schede/fabbricatiterreni/consultazione-cartografia-catastale/servizio-consultazione-cartografia";

// Calcola baricentro di un poligono GeoJSON (media aritmetica vertici)
function calcCentroid(geojson) {
  const geom = geojson?.type === 'Feature' ? geojson.geometry : geojson;
  if (!geom || geom.type !== 'Polygon' || !geom.coordinates?.[0]?.length) return null;
  const ring = geom.coordinates[0];
  let sumLon = 0, sumLat = 0;
  for (const [lo, la] of ring) { sumLon += lo; sumLat += la; }
  return { lat: sumLat / ring.length, lon: sumLon / ring.length };
}

export default function ParcellaMap({ lat, lon, geojsonPolygon, queryId, foglio, particella, height = 280 }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [resolvedPolygon, setResolvedPolygon] = useState(geojsonPolygon || null);
  const [wfsAttempted, setWfsAttempted] = useState(false);

  // Se il poligono è disponibile, usa SEMPRE il baricentro calcolato al volo
  const polyGeom = resolvedPolygon?.type === 'Feature' ? resolvedPolygon.geometry : resolvedPolygon;
  const hasPolygon = polyGeom?.type === 'Polygon' || polyGeom?.type === 'MultiPolygon';
  const centroid = hasPolygon ? calcCentroid(resolvedPolygon) : null;
  const displayLat = centroid?.lat ?? lat;
  const displayLon = centroid?.lon ?? lon;
  const fonteLabel = hasPolygon ? 'WFS AdE — Agenzia delle Entrate' : 'OnData CC BY 4.0';

  // FIX C — Tenta fetch geometria lato backend (evita CORS del browser)
  useEffect(() => {
    if (resolvedPolygon || wfsAttempted || !lat || !lon) return;
    setWfsAttempted(true);
    fetchParcelGeometry({ queryId, centroid_lat: lat, centroid_lng: lon })
      .then((res) => {
        const geom = res?.data?.geometry;
        if (geom) setResolvedPolygon(geom);
      })
      .catch(() => { /* non bloccante */ });
  }, [lat, lon]);

  // Re-render map when polygon resolves after initial mount
  const prevPolygonRef = useRef(null);
  useEffect(() => {
    if (!resolvedPolygon || !leafletMapRef.current || prevPolygonRef.current === resolvedPolygon) return;
    prevPolygonRef.current = resolvedPolygon;
    const L = window.L;
    if (!L) return;
    const map = leafletMapRef.current;
    const geom = resolvedPolygon?.type === 'Feature' ? resolvedPolygon.geometry : resolvedPolygon;
    if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
      const layer = L.geoJSON(geom, {
        style: { color: '#FF6B35', weight: 2, opacity: 1, fillColor: '#FF6B35', fillOpacity: 0.25 },
      }).addTo(map);
      // Aggiorna marker al centroide calcolato dal poligono
      const c = calcCentroid(resolvedPolygon);
      if (c) {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:10px;height:10px;background:#FF6B35;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
          iconSize: [10, 10], iconAnchor: [5, 5],
        });
        L.marker([c.lat, c.lon], { icon }).addTo(map).bindPopup(`📍 Baricentro WFS AdE`);
      }
      try { map.fitBounds(layer.getBounds(), { padding: [30, 30] }); } catch (_e) {}
    }
  }, [resolvedPolygon]);

  useEffect(() => {
    if (!displayLat || !displayLon || !mapRef.current) return;
    if (leafletMapRef.current) return; // already initialized

    // Load Leaflet CSS + JS from CDN
    const loadLeaflet = () => new Promise((resolve) => {
      if (window.L) { resolve(); return; }

      // CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // JS
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
        zoom: 17,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      leafletMapRef.current = map;

      // Tile layer OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Supporta sia GeoJSON Polygon che Feature (wrapper)
      const geomToCheck = resolvedPolygon?.type === 'Feature'
        ? resolvedPolygon.geometry
        : resolvedPolygon;

      if (geomToCheck && (geomToCheck.type === 'Polygon' || geomToCheck.type === 'MultiPolygon')) {
        // Disegna poligono
        const layer = L.geoJSON(geomToCheck, {
          style: { color: '#FF6B35', weight: 2, opacity: 1, fillColor: '#FF6B35', fillOpacity: 0.25 },
        }).addTo(map);

        // Marker baricentro calcolato dal poligono
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:10px;height:10px;background:#FF6B35;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
          iconSize: [10, 10], iconAnchor: [5, 5],
        });
        L.marker([displayLat, displayLon], { icon }).addTo(map).bindPopup(`📍 Baricentro WFS AdE`);

        try {
          map.fitBounds(layer.getBounds(), { padding: [30, 30] });
        } catch (_e) {
          map.setView([lat, lon], 17);
        }
      } else {
        // Solo marker puntuale (fallback quando poligono non disponibile)
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;background:#1A3A6B;border:3px solid #B33A2A;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker([displayLat, displayLon], { icon })
          .addTo(map)
          .bindPopup(`📍 Lat: ${displayLat.toFixed(5)}, Lon: ${displayLon.toFixed(5)}`);
        map.setView([displayLat, displayLon], 17);
      }
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [displayLat, displayLon, resolvedPolygon]);

  if (!displayLat || !displayLon) return null;

  return (
    <div style={{ position: 'relative', border: '1px solid #C4BAA8', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ height, width: '100%' }} />
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
        {hasPolygon
          ? `✅ Foglio ${foglio}, N. ${particella} — ${fonteLabel} — Baricentro: ${displayLat.toFixed(5)}, ${displayLon.toFixed(5)}`
          : (
            <span className="flex items-center gap-1 flex-wrap">
              <span>📍 {foglio && particella ? `Foglio ${foglio}, Part. ${particella} — ` : ''}Poligono non disponibile</span>
              <a href={ADE_GEOPORTALE_URL} target="_blank" rel="noopener noreferrer"
                style={{ color: '#1A3A6B', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                ➜ Geoportale AdE
              </a>
            </span>
          )
        }
      </div>
    </div>
  );
}