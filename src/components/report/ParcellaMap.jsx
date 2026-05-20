import React, { useEffect, useRef } from "react";

export default function ParcellaMap({ query }) {
  const lat = parseFloat(query?.centroid_lat) || null;
  const lon = parseFloat(query?.centroid_lng) || null;
  const foglio = query?.foglio || '';
  const particella = query?.particella || '';
  const geomJson = query?.geometry_geojson || null;
  const hasCoords = lat && lon && lat > 0 && lon > 0;

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);

  useEffect(() => {
    if (!hasCoords || !mapContainerRef.current) return;
    if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }

    const initMap = () => {
      const L = window.L;
      if (!L) return;

      const map = L.map(mapContainerRef.current).setView([lat, lon], 17);
      leafletMapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      L.tileLayer.wms('https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows', {
        layers: 'CP.CadastralParcel',
        format: 'image/png',
        transparent: true,
        opacity: 0.65
      }).addTo(map);

      if (geomJson && geomJson.geometry) {
        const geomLayer = L.geoJSON(geomJson, {
          style: { color: '#c0392b', weight: 3, fillColor: '#e74c3c', fillOpacity: 0.4 }
        }).addTo(map);
        map.fitBounds(geomLayer.getBounds(), { maxZoom: 18, padding: [40, 40] });
      } else {
        L.circleMarker([lat, lon], { radius: 9, color: '#c0392b', fillColor: '#e74c3c', fillOpacity: 0.85, weight: 2 }).addTo(map);
      }
    };

    if (window.L) {
      initMap();
    } else {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => { if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; } };
  }, [lat, lon]);

  if (!hasCoords) return (
    <div className="p-4 text-gray-500">
      <p>📍 Posizione non disponibile — Foglio {foglio}, Particella {particella}</p>
      <a href="https://geoportale.cartografia.agenziaentrate.gov.it" target="_blank" className="text-blue-600 text-sm">Vedi su Geoportale AdE →</a>
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">📍 WGS84: {lat?.toFixed(5)}, {lon?.toFixed(5)} &nbsp; <span className="italic">OnData CC BY 4.0</span></p>
      <div ref={mapContainerRef} style={{ height: '420px', width: '100%', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
      <div className="text-xs text-gray-400">
        {geomJson ? `📐 Footprint edificio (OSM) — ` : ''}{`Foglio ${foglio}, Part. ${particella} | © Leaflet | © OpenStreetMap | © Agenzia delle Entrate`}
      </div>
      <a href={`https://geoportale.cartografia.agenziaentrate.gov.it/age-inspire/srv/ita/catalog.search`} target="_blank" className="text-blue-600 text-sm">
        🔗 Vedi su Geoportale AdE → (Foglio {foglio}, Part. {particella})
      </a>
    </div>
  );
}