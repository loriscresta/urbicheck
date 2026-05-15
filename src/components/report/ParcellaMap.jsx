/**
 * ParcellaMap — mappa Leaflet per particella catastale
 * Mostra poligono GeoJSON (se disponibile) o tenta WFS AdE, poi fallback marker puntuale
 */
import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ExternalLink } from "lucide-react";

const ADE_GEOPORTALE_URL = "https://www.agenziaentrate.gov.it/portale/web/guest/schede/fabbricatiterreni/consultazione-cartografia-catastale/servizio-consultazione-cartografia";

async function fetchParcellaWFS(lat, lon) {
  try {
    const delta = 0.001;
    const url = `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=CP:CadastralParcel&CRS=EPSG:4326&BBOX=${lat-delta},${lon-delta},${lat+delta},${lon+delta}&outputFormat=application/json`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.features?.length > 0) {
      return data.features[0].geometry;
    }
  } catch (_e) { /* WFS non disponibile */ }
  return null;
}

export default function ParcellaMap({ lat, lon, geojsonPolygon, queryId, foglio, particella, height = 280 }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [resolvedPolygon, setResolvedPolygon] = useState(geojsonPolygon || null);
  const [wfsAttempted, setWfsAttempted] = useState(false);

  // Tenta WFS AdE se nessun poligono disponibile
  useEffect(() => {
    if (resolvedPolygon || wfsAttempted || !lat || !lon) return;
    setWfsAttempted(true);
    fetchParcellaWFS(lat, lon).then(async (geom) => {
      if (geom) {
        setResolvedPolygon(geom);
        // Salva nel db se abbiamo un queryId
        if (queryId) {
          try {
            const list = await base44.entities.CadastralQuery.filter({ id: queryId });
            const q = list[0];
            if (q && !q.geometry_geojson) {
              await base44.entities.CadastralQuery.update(queryId, { geometry_geojson: geom });
            }
          } catch (_e) { /* non bloccante */ }
        }
      }
    });
  }, [lat, lon]);

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

      // Supporta sia GeoJSON Polygon che Feature (wrapper)
      const geomToCheck = resolvedPolygon?.type === 'Feature'
        ? resolvedPolygon.geometry
        : resolvedPolygon;

      if (geomToCheck && (geomToCheck.type === 'Polygon' || geomToCheck.type === 'MultiPolygon')) {
        // Disegna poligono con stile ufficiale AdE
        const layer = L.geoJSON(geomToCheck, {
          style: {
            color: '#C0392B',
            weight: 2,
            fillColor: '#F5A623',
            fillOpacity: 0.3,
          },
        }).addTo(map);

        // Aggiunge anche il marker centroide
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:10px;height:10px;background:#C0392B;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        L.marker([lat, lon], { icon })
          .addTo(map)
          .bindPopup(`📍 Centroide — AdE WFS`);

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
  }, [lat, lon, resolvedPolygon]);

  if (!lat || !lon) return null;

  const geomToDisplay = resolvedPolygon?.type === 'Feature' ? resolvedPolygon.geometry : resolvedPolygon;
  const hasPolygon = geomToDisplay?.type === 'Polygon' || geomToDisplay?.type === 'MultiPolygon';

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
          ? '🟧 Poligono particella — AdE WFS CC-BY 4.0'
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