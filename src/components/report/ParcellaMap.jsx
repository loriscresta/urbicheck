import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { geocodeAddress } from "@/functions/geocodeAddress";

const WFS_URL = "https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/ows";

// BUG 1 — Handle alphanumeric foglio (sezioni catastali): "B/5", "B5", "A/3", "C12"
function parseFoglio(rawFoglio) {
  const match = String(rawFoglio || '').trim().match(/^([A-Za-z])[\s\/]?(\d+)$/);
  if (match) return { sezione: match[1].toUpperCase(), foglio: match[2] };
  return { sezione: null, foglio: String(rawFoglio || '').trim() };
}

function loadLeaflet(cb) {
  if (window.L) { cb(); return; }
  if (!document.querySelector('link[href*="leaflet"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  const script = document.createElement("script");
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.onload = cb;
  document.head.appendChild(script);
}

export default function ParcellaMap({ record, query, item }) {
  const entity     = record || query || item || {};
  const foglio     = String(entity.foglio     || "");
  const particella = String(entity.particella || "");
  const rawGeom    = entity.geometry_geojson  || null;

  // Normalizza geometry_geojson in un GeoJSON Feature (L.geoJSON accetta sia Feature che Geometry)
  // Il DB può contenere sia {"type":"Polygon","coordinates":[...]} (Geometry)
  // sia {"type":"Feature","geometry":{...}} (Feature)
  const geomJson = rawGeom
    ? (rawGeom.type === "Feature" ? rawGeom : { type: "Feature", geometry: rawGeom, properties: {} })
    : null;

  // ── State e refs ──────────────────────────────────────────────────────────
  const mapDivRef       = useRef(null);
  const leafletMapRef   = useRef(null);
  const munMapDivRef    = useRef(null);
  const geojsonLayerRef = useRef(null);
  const [polygonLoaded, setPolygonLoaded] = useState(false);
  const [wfsStatus,     setWfsStatus]     = useState("");
  const [geocodedMunPos, setGeocodedMunPos] = useState(null);
  // Coordinate geocodificate dall'indirizzo reale — fonte primaria per la posizione del pin
  const [addressCoords, setAddressCoords] = useState(null);

  const PARCEL_STYLE = { color: "#FF6600", weight: 2.5, fillColor: "#FF6600", fillOpacity: 0.35 };

  // ── Validazione poligono: calcola distanza Haversine baricentro → riferimento ──
  function polygonCentroidDistance(polygonGeom, refLat, refLng) {
    if (!polygonGeom?.coordinates?.[0]?.length || !refLat || !refLng) return null;
    const ring = polygonGeom.coordinates[0];
    const cLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    const cLon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    const R = 6371000;
    const dLat = (cLat - refLat) * Math.PI / 180;
    const dLon = (cLon - refLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(refLat * Math.PI / 180) * Math.cos(cLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── Gerarchia coordinate: geocoded_lat/lng > centroid_lat/lng DB > baricentro poligono ──
  // geocoded_lat/lng = geocodifica Nominatim dell'indirizzo — è l'autorità primaria.
  let referenceLat = null;
  let referenceLng = null;

  // 1) PRIMA SCELTA: geocoded_lat/lng (salvato dal backend via Nominatim)
  if (entity.geocoded_lat != null && entity.geocoded_lng != null) {
    referenceLat = parseFloat(entity.geocoded_lat);
    referenceLng = parseFloat(entity.geocoded_lng);
  }
  // 2) Fallback: coordinate geocodificate dall'indirizzo in tempo reale (arrivano async)
  else if (addressCoords?.lat && addressCoords?.lng) {
    referenceLat = addressCoords.lat;
    referenceLng = addressCoords.lng;
  }
  // 3) Fallback: centroid_lat/lng salvato sul record
  else if (entity.centroid_lat && entity.centroid_lng) {
    referenceLat = parseFloat(entity.centroid_lat);
    referenceLng = parseFloat(entity.centroid_lng);
  }
  // 4) Ultima risorsa: baricentro del poligono (solo se non abbiamo nient'altro)
  else if (geomJson?.geometry?.coordinates?.[0]?.length > 0) {
    const ring = geomJson.geometry.coordinates[0];
    referenceLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    referenceLng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  }

  const hasPosition = !!(referenceLat && referenceLng && !isNaN(referenceLat) && !isNaN(referenceLng));

  // Validazione poligono: baricentro del poligono deve essere entro 500m dall'indirizzo reale
  const validGeometry = (() => {
    if (!geomJson?.geometry?.coordinates) return null;
    if (!hasPosition) return geomJson; // no ref = assume valid
    const dist = polygonCentroidDistance(geomJson.geometry, referenceLat, referenceLng);
    if (dist !== null && dist > 500) return null; // scarta — poligono troppo lontano dall'indirizzo
    return geomJson;
  })();
  const hasPolygon  = !!validGeometry;

  const addPolygonToMap = useCallback((feature) => {
    const L   = window.L;
    const map = leafletMapRef.current;
    if (!L || !map || !feature) return;
    try {
      // Rimuovi layer precedente se presente
      if (geojsonLayerRef.current) {
        map.removeLayer(geojsonLayerRef.current);
        geojsonLayerRef.current = null;
      }
      const layer = L.geoJSON(feature, { style: PARCEL_STYLE }).addTo(map);
      geojsonLayerRef.current = layer;
      map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 19 });
      setPolygonLoaded(true);
    } catch (err) {
      console.error("addPolygonToMap error", err);
    }
  }, []);

  // ── WFS self-healing: browser chiama AdE (diretto + proxy), salva poligono in DB ──
  useEffect(() => {
    if (!hasPosition || hasPolygon || !entity.id) return;
    let cancelled = false;
    const { foglio: foglioNum } = parseFoglio(foglio);

    // Cerca la feature più pertinente nell'array GeoJSON
    const matchFeature = (features) => {
      let matched = null;
      for (const f of features) {
        const label = String(
          f.properties?.label || f.properties?.nationalCadastralReference || ""
        ).toUpperCase();
        const pMatch = label.includes(`/${particella}`) ||
          label.includes(`/${particella.padStart(5, "0")}`) ||
          label === particella;
        const fMatch = label.includes(`${foglioNum}/`) ||
          label.includes(`${foglioNum.padStart(4, "0")}/`);
        if (pMatch && fMatch) { matched = f; break; }
        if (!matched && pMatch) matched = f;
      }
      // Fallback: feature più vicina al punto di riferimento
      if (!matched) {
        let minDist = Infinity;
        for (const f of features) {
          const ring = f.geometry?.coordinates?.[0];
          if (!ring?.length) continue;
          const cLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
          const cLon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
          const d = Math.hypot(cLat - referenceLat, cLon - referenceLng);
          if (d < minDist) { minDist = d; matched = f; }
        }
      }
      return matched;
    };

    const fetchWfs = async () => {
      setWfsStatus("🔍 Recupero geometria catastale...");

      // Cascading BBOX: centrato sull'indirizzo reale, cresce finché non trova foglio+particella ESATTI
      const deltas = [0.002, 0.01, 0.03, 0.06];
      let data = null;
      let exactMatchFound = false;

      const isExactLabel = (feature) => {
        const lbl = String(
          feature?.properties?.label ||
          feature?.properties?.nationalCadastralReference || ""
        ).toUpperCase();
        const { foglio: foglioNum } = parseFoglio(foglio);
        const pMatch = lbl.includes(`/${particella}`) ||
          lbl.includes(`/${particella.padStart(5, "0")}`);
        const fMatch = lbl.includes(`${foglioNum}/`) ||
          lbl.includes(`${foglioNum.padStart(4, "0")}/`);
        return pMatch && fMatch;
      };

      for (const delta of deltas) {
        if (exactMatchFound) break;
        const minLon = (referenceLng - delta).toFixed(7);
        const minLat = (referenceLat - delta).toFixed(7);
        const maxLon = (referenceLng + delta).toFixed(7);
        const maxLat = (referenceLat + delta).toFixed(7);
        const wfsUrl = `${WFS_URL}?service=WFS&version=2.0.0&request=GetFeature` +
          `&typeNames=CP:CadastralParcel&outputFormat=application%2Fjson` +
          `&BBOX=${minLon},${minLat},${maxLon},${maxLat},EPSG:4326`;

        if (cancelled) return;
        setWfsStatus(delta > 0.005
          ? `🔄 Allargo la ricerca (±${(delta * 111).toFixed(0)} km)…`
          : "🔍 Recupero geometria catastale...");

        // Tentativo diretto
        let fetched = null;
        try {
          const res = await fetch(wfsUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
          if (res.ok) { const d = await res.json(); if (d?.features?.length) fetched = d; }
        } catch (_e) {}

        if (cancelled) return;

        // Via proxy se diretto non ha dato risultati
        if (!fetched?.features?.length) {
          try {
            const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(wfsUrl)}`;
            const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
            if (proxyRes.ok) {
              const text = await proxyRes.text();
              if (text.trim().startsWith("{")) {
                const d = JSON.parse(text);
                if (d?.features?.length) fetched = d;
              }
            }
          } catch (_e) {}
        }

        if (fetched?.features?.length) {
          // Controlla se c'è un match esatto foglio+particella
          const hasExact = fetched.features.some(isExactLabel);
          if (hasExact) {
            data = fetched;
            exactMatchFound = true;
          } else {
            // Nessun match esatto: salva come fallback e continua ad allargare
            data = fetched;
            // continua il loop con delta più grande
          }
        }
      }

      if (cancelled) return;

      if (!data) {
        setWfsStatus("🗺️ Confini catastali visibili nel layer WMS — zoom per vedere la particella");
        return;
      }

      const features = data.features || [];
      if (!features.length) {
        setWfsStatus("🗺️ Confini catastali visibili nel layer WMS — zoom per vedere la particella");
        return;
      }

      const matched = matchFeature(features);
      if (!matched) {
        setWfsStatus("⚠️ Feature non identificata nel BBOX");
        return;
      }

      // Controlla se il match è stato esatto o nearest
      const matchLabel = String(
        matched.properties?.label || matched.properties?.nationalCadastralReference || ""
      ).toUpperCase();
      const isExact = matchLabel.includes(`${foglio.padStart(4,"0")}/`) &&
        (matchLabel.includes(`/${particella}`) || matchLabel.includes(`/${particella.padStart(5,"0")}`));
      setWfsStatus(isExact
        ? "✅ Particella catastale trovata (AdE INSPIRE WFS)"
        : "📐 Geometria approssimata (nearest centroid)");

      // Validazione distanza dall'indirizzo reale prima di salvare
      const ringCheck = matched?.geometry?.coordinates?.[0];
      let savePolygon = true;
      if (ringCheck?.length > 2 && referenceLat && referenceLng) {
        const dist = polygonCentroidDistance(matched.geometry, referenceLat, referenceLng);
        if (dist !== null && dist > 500) {
          console.warn(`[ParcellaMap] Poligono scartato — baricentro a ${dist.toFixed(0)}m dall'indirizzo`);
          savePolygon = false;
          setWfsStatus("⚠️ Poligono catastale non disponibile — posizione approssimativa da indirizzo");
        }
      }

      if (savePolygon) {
        addPolygonToMap(matched);
        // Salva solo geometry_geojson — NON sovrascrivere centroid_lat/lng (l'autorità è l'indirizzo)
        try {
          await base44.entities.CadastralQuery.update(entity.id, { geometry_geojson: matched });
        } catch (e) {
          console.warn("DB save geometry_geojson:", e);
        }
      } else {
        // Non salvare il poligono sbagliato — mostra solo marker
        addPolygonToMap(null);
      }
    };

    fetchWfs();
    return () => { cancelled = true; };
  }, [hasPosition, hasPolygon, entity.id, referenceLat, referenceLng, foglio, particella, addPolygonToMap]);

  // ── Inizializzazione Leaflet ──────────────────────────────────────────────
  useEffect(() => {
    if (!hasPosition || !mapDivRef.current) return;
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const initMap = () => {
      const L = window.L;
      if (!L || !mapDivRef.current) return;
      // Remove any stale Leaflet instance on the DOM node (prevents "already initialized" error)
      if (mapDivRef.current._leaflet_id != null) {
        delete mapDivRef.current._leaflet_id;
      }
      const map = L.map(mapDivRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([referenceLat, referenceLng], 15);
      leafletMapRef.current = map;

      const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 20,
      });
      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "© Esri, Maxar, Earthstar Geographics",
          maxZoom: 20,
        }
      );
      osmLayer.addTo(map);
      L.control.layers({ "Mappa": osmLayer, "Satellite": satelliteLayer }, {}, { position: 'topright' }).addTo(map);

      L.tileLayer.wms(
        "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows",
        {
          layers: "CP.CadastralParcel",
          format: "image/png",
          transparent: true,
          opacity: 0.85,
          attribution: "© Agenzia delle Entrate",
        }
      ).addTo(map);

      // ═══ PIN PRINCIPALE: sempre sull'indirizzo reale ═══
      const addrLabel = entity.indirizzo_immobile || entity.indirizzo_catastale || entity.comune || '';
      const pinPopup = entity.indirizzo_immobile
        ? `<strong>📍 ${entity.indirizzo_immobile}</strong><br/>Foglio ${foglio}, Particella ${particella}${entity.subalterno ? `, Sub. ${entity.subalterno}` : ''}<br/><small style="color:#666">Posizione geocodificata da indirizzo</small>`
        : `<strong>📍 ${addrLabel}</strong><br/>Foglio ${foglio}, Particella ${particella}${entity.subalterno ? `, Sub. ${entity.subalterno}` : ''}`;
      L.circleMarker([referenceLat, referenceLng], {
        radius: 8,
        color: '#1A3A6B',
        fillColor: '#2563eb',
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map).bindPopup(pinPopup).openPopup();

      if (validGeometry) {
        // Poligono ufficiale: arancione pieno 35% — fitBounds sul poligono reale
        const layer = L.geoJSON(validGeometry, { style: PARCEL_STYLE }).addTo(map);
        geojsonLayerRef.current = layer;
        layer.bindPopup(
          `<strong>📐 Mappale catastale</strong><br/>Foglio ${foglio}, Particella ${particella}${entity.subalterno ? `, Sub. ${entity.subalterno}` : ''}<br/><small style="color:#666">Confine catastale ufficiale</small>`
        );
        map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 19 });
        setPolygonLoaded(true);
      } else {
        // Poligono scartato o assente: cerchio tratteggiato intorno al pin
        L.circle([referenceLat, referenceLng], {
          radius: 25,
          color: "#c0392b",
          fillColor: "#e74c3c",
          fillOpacity: 0.15,
          weight: 2,
          dashArray: "6 4",
        }).addTo(map);
        if (geomJson?.geometry?.coordinates) {
          // C'è un poligono ma è stato scartato — nota esplicativa
          L.circleMarker([referenceLat, referenceLng], {
            radius: 9,
            color: "#c0392b",
            fillColor: "#e74c3c",
            fillOpacity: 0.85,
            weight: 2.5,
          }).addTo(map).bindPopup(
            `<strong>⚠️ Poligono catastale non disponibile</strong><br/>Il poligono WFS è troppo distante dall'indirizzo<br/><small style="color:#666">Foglio ${foglio}, Particella ${particella}${entity.subalterno ? `, Sub. ${entity.subalterno}` : ''}</small>`
          );
        }
      }
    };

    loadLeaflet(initMap);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [referenceLat, referenceLng, hasPolygon]);



  // ── Aggiorna layer GeoJSON quando geometry_geojson cambia (validato) ──
  useEffect(() => {
    const L = window.L;
    const map = leafletMapRef.current;
    if (!L || !map) return;
    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }
    if (!validGeometry) return; // poligono scartato — nessun layer
    try {
      const layer = L.geoJSON(validGeometry, { style: PARCEL_STYLE }).addTo(map);
      geojsonLayerRef.current = layer;
      map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 19 });
      setPolygonLoaded(true);
    } catch (err) {
      console.error("geomJson update layer error", err);
    }
  }, [validGeometry]);

  // ── Geocoding indirizzo immobile — fonte primaria per la posizione del pin ──
  useEffect(() => {
    const indirizzo = entity.indirizzo_immobile || entity.indirizzo_catastale;
    if (!indirizzo) return;
    let cancelled = false;
    geocodeAddress({
      indirizzo: indirizzo,
      comune: entity.comune || '',
      provincia: entity.provincia || entity.sigla_provincia || '',
    }).then(res => {
      if (cancelled) return;
      const d = res?.data;
      if (!d?.lat || !d?.lng || isNaN(d.lat) || isNaN(d.lng)) return;
      const isComuneFallback = d.location_type === 'COMUNE_CENTROID' || d.location_type === 'COMUNE_FALLBACK';
      const inItaly = d.lat > 35 && d.lat < 48 && d.lng > 6 && d.lng < 19;
      if (inItaly && !isComuneFallback) {
        setAddressCoords({ lat: d.lat, lng: d.lng, formatted: d.formatted_address, source: d.source || 'geocode' });
        console.log('[ParcellaMap] geocodifica indirizzo OK:', d.lat, d.lng, d.location_type);
      } else {
        console.log('[ParcellaMap] geocoding scartato (fallback comunale):', d.location_type);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [entity.indirizzo_immobile, entity.indirizzo_catastale, entity.comune]);

  // ── Re-lancia WFS dalle coordinate geocodificate ──
  // Quando il geocoding trova l'indirizzo, ri-cerca la particella da quelle coordinate
  useEffect(() => {
    if (!addressCoords || hasPolygon || !entity.id || !foglio || !particella) return;
    let cancelled = false;
    const { foglio: foglioNum } = parseFoglio(foglio);

    const retryWfsFromAddress = async () => {
      setWfsStatus("🔍 Cerco geometria dall'indirizzo geocodificato…");
      const deltas = [0.003, 0.01, 0.04];
      for (const delta of deltas) {
        if (cancelled) return;
        const minLon = (addressCoords.lng - delta).toFixed(7);
        const minLat = (addressCoords.lat - delta).toFixed(7);
        const maxLon = (addressCoords.lng + delta).toFixed(7);
        const maxLat = (addressCoords.lat + delta).toFixed(7);
        const wfsUrl = `${WFS_URL}?service=WFS&version=2.0.0&request=GetFeature` +
          `&typeNames=CP:CadastralParcel&outputFormat=application%2Fjson` +
          `&BBOX=${minLon},${minLat},${maxLon},${maxLat},EPSG:4326`;
        let fetched = null;
        try {
          const res = await fetch(wfsUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
          if (res.ok) { const d = await res.json(); if (d?.features?.length) fetched = d; }
        } catch (_e) {}
        if (!fetched?.features?.length) {
          try {
            const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(wfsUrl)}`;
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
            if (res.ok) { const t = await res.text(); if (t.trim().startsWith("{")) { const d = JSON.parse(t); if (d?.features?.length) fetched = d; } }
          } catch (_e) {}
        }
        if (fetched?.features?.length && !cancelled) {
          const exact = fetched.features.find(f => {
            const lbl = String(f.properties?.label || f.properties?.nationalCadastralReference || "").toUpperCase();
            return (lbl.includes(`/${particella}`) || lbl.includes(`/${particella.padStart(5,"0")}`)) &&
                   (lbl.includes(`${foglioNum}/`) || lbl.includes(`${foglioNum.padStart(4,"0")}/`));
          });
          if (exact) {
            const exRing = exact?.geometry?.coordinates?.[0];
            let saveExact = true;
            if (exRing?.length > 2 && addressCoords) {
              const dist = polygonCentroidDistance(exact.geometry, addressCoords.lat, addressCoords.lng);
              if (dist !== null && dist > 500) {
                console.warn(`[ParcellaMap] address WFS polygon rejected — ${dist.toFixed(0)}m from address`);
                saveExact = false;
                setWfsStatus("⚠️ Poligono catastale non disponibile — troppo distante dall'indirizzo");
              }
            }
            if (saveExact) {
              addPolygonToMap(exact);
              try {
                await base44.entities.CadastralQuery.update(entity.id, { geometry_geojson: exact });
              } catch (e) { console.warn("DB update from address WFS:", e); }
              setWfsStatus("✅ Particella trovata via indirizzo geocodificato");
            }
            return;
          }
        }
      }
      if (!cancelled) setWfsStatus("🗺️ Confini catastali visibili nel layer WMS — zoom per vedere la particella");
    };
    retryWfsFromAddress();
    return () => { cancelled = true; };
  }, [addressCoords, hasPolygon, entity.id, foglio, particella, addPolygonToMap]);

  // ── Rimuovo effetto pan mappa: la mappa si ricentra automaticamente quando referenceLat/Lng cambia ──

  // Geocode address (preferred) or municipality when no cadastral position available
  useEffect(() => {
    if (hasPosition || !entity.comune) return;
    // Prefer address geocoding over municipality centroid
    const addressQuery = entity.indirizzo_immobile
      ? `${entity.indirizzo_immobile}, ${entity.comune}, Italia`
      : entity.provincia
      ? `${entity.comune}, ${entity.provincia}, Italia`
      : `${entity.comune}, Italia`;
    const isAddressQuery = !!entity.indirizzo_immobile;
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery)}&format=json&limit=1&countrycodes=it`)
      .then(r => r.json())
      .then(data => {
        if (data[0]) setGeocodedMunPos({
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          isAddress: isAddressQuery,
        });
      })
      .catch(() => {});
  }, [hasPosition, entity.comune, entity.provincia, entity.indirizzo_immobile]);

  // Init fallback map (address or municipality)
  useEffect(() => {
    if (!geocodedMunPos || !munMapDivRef.current) return;
    let munMap = null;
    const initMunMap = () => {
      const L = window.L;
      if (!L || !munMapDivRef.current) return;
      const zoom = geocodedMunPos.isAddress ? 16 : 14;
      munMap = L.map(munMapDivRef.current).setView([geocodedMunPos.lat, geocodedMunPos.lon], zoom);
      const osmFallback = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20, attribution: '© OpenStreetMap' });
      const satFallback = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20, attribution: '© Esri' });
      osmFallback.addTo(munMap);
      L.control.layers({ "Mappa": osmFallback, "Satellite": satFallback }, {}, { position: 'topright' }).addTo(munMap);
      L.tileLayer.wms('https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows', {
        layers: 'CP.CadastralParcel', format: 'image/png', transparent: true, opacity: 0.85, attribution: '© AdE',
      }).addTo(munMap);
      const parsed = parseFoglio(foglio);
      const popupLabel = geocodedMunPos.isAddress
        ? `<b>📍 ${entity.indirizzo_immobile}</b><br/>Foglio ${parsed.sezione ? parsed.sezione + '/' + parsed.foglio : foglio}, Particella ${particella}<br/><small style="color:#666">Posizione indirizzo geocodificato</small>`
        : `<b>📍 Comune di ${entity.comune}</b><br/>Foglio ${parsed.sezione ? parsed.sezione + '/' + parsed.foglio : foglio}, Particella ${particella}<br/><small>Posizione approssimata al centro comune</small>`;
      L.marker([geocodedMunPos.lat, geocodedMunPos.lon])
        .addTo(munMap)
        .bindPopup(popupLabel)
        .openPopup();
    };
    loadLeaflet(initMunMap);
    return () => { if (munMap) { munMap.remove(); munMap = null; } };
  }, [geocodedMunPos]);

  // ── Render ────────────────────────────────────────────────────────────────
  const parsed = parseFoglio(foglio);
  const foglioDisplay = parsed.sezione ? `${parsed.sezione}/${parsed.foglio}` : foglio;

  if (!hasPosition) {
    const parsed = parseFoglio(foglio);
    return (
      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          {entity.indirizzo_immobile
            ? <>📍 Posizione indirizzo geocodificato — particella catastale non georeferenziata. <strong>{entity.indirizzo_immobile}</strong> (Foglio {parsed.foglio}, Part. {particella}). Verificare su Geoportale AdE.</>
            : <>📍 Posizione approssimata al Comune di <strong>{entity.comune || foglio}</strong> — sezione catastale {parsed.sezione || 'principale'}, foglio {parsed.foglio}, particella {particella}. Verificare la particella esatta su Geoportale AdE.</>
          }
        </div>
        {!geocodedMunPos && (
          <p className="text-sm text-gray-400 py-2">🔍 Ricerca posizione comune in corso…</p>
        )}
        {geocodedMunPos && (
          <div
            ref={munMapDivRef}
            style={{ height: '320px', width: '100%', borderRadius: '8px', border: '1px solid #e5e7eb', zIndex: 0 }}
          />
        )}
        <a
          href="https://geoportale.cartografia.agenziaentrate.gov.it/age-inspire/srv/ita/catalog.search"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 text-sm hover:underline block"
        >
          🔗 Cerca particella su Geoportale AdE →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">
        {hasPolygon
          ? <>📐 Confine catastale ufficiale della particella (fonte: catasto)</>
          : <>📍 Posizione approssimativa da geocodifica indirizzo — i confini catastali ufficiali sono visibili nel layer WMS dell'Agenzia delle Entrate zoomando sulla mappa.</>
        }
      </p>

      {wfsStatus && (
        <p className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
          {wfsStatus}
        </p>
      )}

      <div
        ref={mapDivRef}
        style={{
          height: "420px",
          width: "100%",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          zIndex: 0,
        }}
      />

      <div className="text-xs text-gray-400">
        {polygonLoaded
          ? "📐 Poligono catastale AdE INSPIRE WFS | "
          : `Foglio ${foglio}, Part. ${particella} | `}
        © Leaflet | © OpenStreetMap | © Agenzia delle Entrate
      </div>

      <a
        href="https://geoportale.cartografia.agenziaentrate.gov.it/age-inspire/srv/ita/catalog.search"
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 text-sm hover:underline block"
      >
        🔗 Vedi su Geoportale AdE → (Foglio {foglio}, Part. {particella})
      </a>
    </div>
  );
}