import React, { useEffect, useRef } from "react";

export default function ParcellaMap({ query, foglio, particella, height = 420 }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);

  const lat = query?.centroid_lat || null;
  const lon = query?.centroid_lng || null;
  const validCoords = lat && lon && Number(lat) !== 0 && Number(lon) !== 0;

  useEffect(() => {
    if (!validCoords || !mapRef.current || leafletMapRef.current) return;

    const init = () => {
      const L = window.L;
      if (!mapRef.current || leafletMapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [Number(lat), Number(lon)],
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

      L.circleMarker([Number(lat), Number(lon)], {
        radius: 8,
        color: "#c0392b",
        fillColor: "#e74c3c",
        fillOpacity: 0.8,
        weight: 2,
      })
        .addTo(map)
        .bindPopup(`📍 Foglio ${foglio || "—"}, Particella ${particella || "—"}`);
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
        📍 WGS84: {Number(lat).toFixed(6)}, {Number(lon).toFixed(6)} &nbsp;|&nbsp; OnData CC BY 4.0
      </div>
      <div ref={mapRef} style={{ height, width: "100%" }} />
      <div style={{
        padding: "5px 10px",
        borderTop: "1px solid #C4BAA8",
        background: "#F4EFE6",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "0.56rem",
        color: "#7A7268",
      }}>
        Foglio {foglio}, Part. {particella} | © Leaflet | © OpenStreetMap | © Agenzia delle Entrate
      </div>
    </div>
  );
}