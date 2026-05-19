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

  const polyGeom = resolvedPolygon?.type === 'Feature' ? resolvedPolygon.geometry : resolvedPolygon;
  const hasPolygon = polyGeom?.type === 'Polygon' || polyGeom?.type === 'MultiPolygon';
  // Usa sempre lat/lon passati (baricentro dal DB/entity) come centro della mappa;
  // il fitBounds del poligono sovrascriverà il centro se il poligono è disponibile
  const displayLat = lat;
  const displayLon = lon;
  const fonteLabel = hasPolygon ? 'WFS AdE — Agenzia delle Entrate' : 'OnData CC BY 4.0';

  // Sync prop → state when geojsonPolygon arrives after initial render
  useEffect(() => {
    if (geojsonPolygon && !resolvedPolygon) {
      setResolvedPolygon(geojsonPolygon);
    }
  }, [geojsonPolygon]);

  // FIX REGRESSION 1 — tenta fetch WFS backend SOLO se geometry_geojson è assente nell'entity
  // Se geojsonPolygon è passato come prop (da entity.geometry_geojson), NON fare nessuna chiamata esterna
  useEffect(() => {
    if (geojsonPolygon || resolvedPolygon || wfsAttempted || !lat || !lon || !queryId) return;
    setWfsAttempted(true);
    fetchParcelGeometry({ queryId, centroid_lat: lat, centroid_lng: lon })
      .then((res) => {
        const geom = res?.data?.geometry;
        if (geom) setResolvedPolygon(geom);
      })
      .catch(() => { /* non bloccante */ });
  }, [lat, lon, geojsonPolygon]);

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

      // Inizializza con zoom 18 su centroid; fitBounds lo sovrascriverà se c'è il poligono
      const map = L.map(mapRef.current, {
        center: [displayLat, displayLon],
        zoom: 18,
        zoomControl: true,
        scrollWheelZoom: false,
      });
      leafletMapRef.current = map;

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
      toggleWms(); // run once at init zoom

      const geomToCheck = resolvedPolygon?.type === 'Feature' ? resolvedPolygon.geometry : resolvedPolygon;

      if (geomToCheck && (geomToCheck.type === 'Polygon' || geomToCheck.type === 'MultiPolygon')) {
        // Poligono disponibile: disegna fill blu + border, poi fitBounds
        const layer = L.geoJSON(geomToCheck, {
          style: { color: '#1A3A6B', weight: 2.5, opacity: 1, fillColor: '#1A3A6B', fillOpacity: 0.30 },
        }).addTo(map);

        // Marker sul centroid passato (lat/lon dal DB)
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:10px;height:10px;background:#B33A2A;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
          iconSize: [10, 10], iconAnchor: [5, 5],
        });
        L.marker([displayLat, displayLon], { icon }).addTo(map).bindPopup(`📍 Foglio ${foglio}, N. ${particella}`);

        // FitBounds sul poligono — zoom automatico alla particella
        try {
          map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 20 });
        } catch (_e) {
          map.setView([displayLat, displayLon], 18);
        }
      } else {
        // Solo marker puntuale — zoom 18 fisso
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;background:#1A3A6B;border:3px solid #B33A2A;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
          iconSize: [16, 16], iconAnchor: [8, 8],
        });
        L.marker([displayLat, displayLon], { icon })
          .addTo(map)
          .bindPopup(`📍 Lat: ${displayLat.toFixed(5)}, Lon: ${displayLon.toFixed(5)}`);

        // Cerchio approssimato 20m
        const popupText = foglio && particella
          ? `Particella ${particella} — Foglio ${foglio}`
          : `📍 Posizione approssimata`;
        L.circle([displayLat, displayLon], {
          radius: 20,
          color: '#e74c3c',
          fillColor: '#e74c3c',
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map).bindPopup(popupText);

        map.setView([displayLat, displayLon], 18);
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
      <div style={{
        padding: '5px 10px',
        borderTop: '1px solid #C4BAA8',
        background: '#F4EFE6',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.58rem',
        color: '#7A7268',
      }}>
        📍 Posizione approssimata della particella. Layer catastale © Agenzia delle Entrate
      </div>
    </div>
  );
}