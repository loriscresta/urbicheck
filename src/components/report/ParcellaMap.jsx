/**
 * ParcellaMap — mappa Leaflet per particella catastale
 * Mostra poligono GeoJSON (se disponibile) o marker puntuale
 */
import React, { useEffect, useRef } from "react";

export default function ParcellaMap({ lat, lon, geojsonPolygon, height = 280 }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);

  useEffect(() => {
    if (!lat || !lon || !mapRef.current) return;
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
        center: [lat, lon],
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

      if (geojsonPolygon && geojsonPolygon.type === 'Polygon') {
        // Disegna poligono
        const layer = L.geoJSON(geojsonPolygon, {
          style: {
            color: '#1A3A6B',
            weight: 2.5,
            fillColor: '#3b82f6',
            fillOpacity: 0.25,
          },
        }).addTo(map);

        try {
          map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        } catch (_e) {
          map.setView([lat, lon], 17);
        }
      } else {
        // Solo marker puntuale
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;background:#1A3A6B;border:3px solid #B33A2A;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker([lat, lon], { icon })
          .addTo(map)
          .bindPopup(`📍 Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`);
        map.setView([lat, lon], 17);
      }
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [lat, lon, geojsonPolygon]);

  if (!lat || !lon) return null;

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
      }}>
        {geojsonPolygon ? '🟦 Poligono particella — AdE WFS CC-BY 4.0' : '📍 Centroide — OnData CC BY 4.0'}
      </div>
    </div>
  );
}