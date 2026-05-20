import React, { useEffect, useRef, useState } from "react";

export default function ParcellaMap({ query, foglio, particella, height = 420 }) {
  const mapDivRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [wfsOk, setWfsOk] = useState(false);
  const [polygonSource, setPolygonSource] = useState(null);

  const lat = parseFloat(query?.centroid_lat);
  const lon = parseFloat(query?.centroid_lng);
  const validCoords = !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0;

  // Init mappa
  useEffect(() => {
    if (!validCoords || !mapDivRef.current || leafletMapRef.current) return;

    const init = () => {
      const L = window.L;
      if (!mapDivRef.current || leafletMapRef.current) return;

      const map = L.map(mapDivRef.current, {
        center: [lat, lon],
        zoom: 17,
        zoomControl: true,
        scrollWheelZoom: false,
      });
      leafletMapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 21,
      }).addTo(map);

      L.tileLayer.wms("https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows", {
        layers: "CP.CadastralParcel",
        format: "image/png",
        transparent: true,
        version: "1.3.0",
        opacity: 0.7,
        attribution: "© Agenzia delle Entrate",
        maxZoom: 21,
      }).addTo(map);

      // Disegna geometry_geojson se disponibile
      const geom = query?.geometry_geojson;
      if (geom && geom.geometry && geom.geometry.coordinates) {
        const layer = L.geoJSON(geom, {
          style: { color: '#c0392b', weight: 3, fillColor: '#e74c3c', fillOpacity: 0.35, dashArray: null },
        }).addTo(map);
        try { map.fitBounds(layer.getBounds(), { maxZoom: 18, padding: [40, 40] }); } catch (_e) {}
        setPolygonSource('osm');
      }

      L.circleMarker([lat, lon], {
        radius: 8,
        color: "#c0392b",
        fillColor: "#e74c3c",
        fillOpacity: 0.8,
        weight: 2,
      })
        .addTo(map)
        .bindPopup(`📍 Foglio ${foglio || "—"}, Particella ${particella || "—"}`);

      setMapReady(true);
    };

    if (window.L) {
      init();
    } else {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = init;
      document.head.appendChild(script);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [lat, lon]);

  // WFS BBOX — carica poligoni dopo che la mappa è pronta
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current || !lat || !lon) return;
    const map = leafletMapRef.current;
    const L = window.L;

    (async () => {
      try {
        const d = 0.0018;
        const url = `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=CP:CadastralParcel&BBOX=${lon - d},${lat - d},${lon + d},${lat + d},EPSG:4326&SRSNAME=EPSG:4326&outputFormat=application/json&COUNT=30`;
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.features?.length) return;

        let best = null, minD = Infinity;
        data.features.forEach(f => {
          const coords = f.geometry?.type === "Polygon"
            ? f.geometry.coordinates[0]
            : f.geometry?.coordinates?.[0]?.[0];
          if (!coords?.length) return;
          const avgLon = coords.reduce((s, c) => s + c[0], 0) / coords.length;
          const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
          const dd = (avgLon - lon) ** 2 + (avgLat - lat) ** 2;
          if (dd < minD) { minD = dd; best = f; }
        });

        L.geoJSON({ type: "FeatureCollection", features: data.features }, {
          style: { color: "#94a3b8", weight: 1, fillColor: "#e2e8f0", fillOpacity: 0.2 },
        }).addTo(map);

        if (best) {
          const hl = L.geoJSON(best, {
            style: { color: "#c0392b", weight: 3, fillColor: "#e74c3c", fillOpacity: 0.45 },
          }).addTo(map);
          try { map.fitBounds(hl.getBounds(), { maxZoom: 18, padding: [40, 40] }); } catch (_e) {}
          setWfsOk(true);
        }
      } catch (_e) { /* fallback silenzioso */ }
    })();
  }, [mapReady, lat, lon]);

  if (!validCoords) {
    return (
      <div style={{ border: "1px solid #C4BAA8", background: "#F4EFE6", padding: "1rem 1.25rem" }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: "#7A7268" }}>
          📍 Posizione non disponibile — Foglio {foglio || "—"}, Particella {particella || "—"}
        </p>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #C4BAA8", overflow: "hidden" }}>
      <div style={{
        padding: "4px 10px",
        background: "#F4EFE6",
        borderBottom: "1px solid #C4BAA8",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "0.58rem",
        color: "#7A7268",
      }}>
        📍 WGS84: {lat.toFixed(6)}, {lon.toFixed(6)} &nbsp;|&nbsp; OnData CC BY 4.0
      </div>
      <div ref={mapDivRef} style={{ height, width: "100%" }} />
      <div style={{
        padding: "5px 10px",
        borderTop: "1px solid #C4BAA8",
        background: "#F4EFE6",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "0.56rem",
        color: "#7A7268",
      }}>
        {polygonSource === 'osm'
          ? `📐 Footprint edificio (OSM) — perimetro catastale esatto su WFS AdE | Foglio ${foglio}, Part. ${particella}`
          : wfsOk
          ? `✓ Poligono AdE — Foglio ${foglio}, Part. ${particella}`
          : `Foglio ${foglio}, Part. ${particella} | © Leaflet | © OpenStreetMap | © Agenzia delle Entrate`
        }
      </div>
    </div>
  );
}