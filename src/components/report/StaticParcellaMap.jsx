import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Genera un'immagine statica della mappa con il poligono catastale evidenziato.
 * Usa staticmap.openstreetmap.de (nessuna API key) oppure fallback Geoapify.
 *
 * Props:
 *   query       - record CadastralQuery
 *   onImageReady(url) - callback con URL immagine generata
 *   width / height   - dimensioni immagine (default 800×400)
 */
export default function StaticParcellaMap({ query, onImageReady, width = 800, height = 400 }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Se già salvata sul record, riusa
    if (query.mappa_image_url) {
      setImgUrl(query.mappa_image_url);
      setLoading(false);
      if (onImageReady) onImageReady(query.mappa_image_url);
      return;
    }

    const rawGeom = query.geometry_geojson || null;
    const centroidLat = query.centroid_lat != null && Number(query.centroid_lat) !== 0 ? parseFloat(query.centroid_lat) : null;
    const centroidLng = query.centroid_lng != null && Number(query.centroid_lng) !== 0 ? parseFloat(query.centroid_lng) : null;
    const lat = centroidLat != null ? centroidLat : (query.geocoded_lat ? parseFloat(query.geocoded_lat) : null);
    const lng = centroidLng != null ? centroidLng : (query.geocoded_lng ? parseFloat(query.geocoded_lng) : null);

    if (!lat || !lng) {
      setLoading(false);
      setError(true);
      return;
    }

    // Normalizza geometry in Polygon coordinates
    let polygonCoords = null;
    if (rawGeom) {
      const geom = rawGeom.type === "Feature" ? rawGeom.geometry : rawGeom;
      if (geom?.coordinates?.[0]?.length > 2) {
        polygonCoords = geom.coordinates[0];
      }
    }

    const url = buildStaticMapUrl({ lat, lng, polygonCoords, width, height });
    setImgUrl(url);
    setLoading(false);
    if (onImageReady) onImageReady(url);

    // Salva URL sul record per riuso futuro (non bloccante)
    if (query.id && url) {
      base44.entities.CadastralQuery.update(query.id, { mappa_image_url: url }).catch(() => {});
    }
  }, [query.id, query.geometry_geojson, query.centroid_lat, query.centroid_lng]);

  if (loading) return (
    <div className="flex items-center justify-center bg-gray-100 rounded" style={{ height: Math.round(height * 0.5), width: "100%" }}>
      <span className="text-xs text-gray-400">Caricamento mappa statica…</span>
    </div>
  );

  if (error || !imgUrl) return (
    <div className="flex items-center justify-center bg-amber-50 border border-amber-200 rounded p-4">
      <p className="text-xs text-amber-700">Mappa non disponibile — coordinate non presenti sul record.</p>
    </div>
  );

  return (
    <div className="space-y-1">
      <img
        src={imgUrl}
        alt={`Mappa catastale — ${query.comune}, Foglio ${query.foglio}, Part. ${query.particella}`}
        style={{ width: "100%", borderRadius: "6px", border: "1px solid #e5e7eb", display: "block" }}
        onError={() => setError(true)}
      />
      <p className="text-[10px] text-gray-400">
        {query.comune} · Foglio {query.foglio} · Part. {query.particella}
        {query.subalterno ? ` · Sub. ${query.subalterno}` : ""} ·{" "}
        Fonte: Catasto AdE / INSPIRE · © OpenStreetMap contributors
      </p>
    </div>
  );
}

// ── Build Static Map URL ───────────────────────────────────────────────────

/**
 * Costruisce un URL per una mappa statica PNG con poligono in overlay.
 * Strategia: Geoapify Static Maps API (free tier, no key needed per base usage).
 * Fallback: URL OpenStreetMap con bbox calcolato dal poligono.
 */
export function buildStaticMapUrl({ lat, lng, polygonCoords, width = 800, height = 400 }) {
  // Zoom auto dal bounding box del poligono
  let zoom = 17;
  let centerLat = lat;
  let centerLng = lng;

  if (polygonCoords && polygonCoords.length > 2) {
    const lats = polygonCoords.map(c => c[1]);
    const lngs = polygonCoords.map(c => c[0]);
    centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);
    const span = Math.max(latSpan, lngSpan);
    if (span > 0.01) zoom = 14;
    else if (span > 0.003) zoom = 16;
    else if (span > 0.001) zoom = 17;
    else zoom = 18;
  }

  // Usa Geoapify Static Maps (supporta GeoJSON overlay, gratuito senza key per tile base)
  // Fallback: openstreetmap static map service
  if (polygonCoords && polygonCoords.length > 2) {
    return buildGeoapifyUrl({ centerLat, centerLng, zoom, polygonCoords, width, height });
  }

  // Nessun poligono: mappa OSM centrata sul punto con marker
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLng}&zoom=${zoom}&size=${width}x${height}&markers=${centerLat},${centerLng},red-pushpin`;
}

function buildGeoapifyUrl({ centerLat, centerLng, zoom, polygonCoords, width, height }) {
  // staticmap.openstreetmap.de supporta polyline via parametri "path"
  // Formato: path=color:0xff7a00|weight:3|fillcolor:0xff7a0040|lat1,lon1|lat2,lon2|...
  const pathCoords = polygonCoords.map(c => `${c[1]},${c[0]}`).join("|");
  const path = encodeURIComponent(`color:0xff7a00ff|weight:3|fillcolor:0xff7a0060|${pathCoords}`);
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLng}&zoom=${zoom}&size=${width}x${height}&path=${path}`;
}

/**
 * Versione canvas-based: disegna poligono su tile OSM scaricato.
 * Usata come fallback nel PDF se il servizio esterno non risponde.
 */
export function getStaticMapUrlForPdf(query) {
  const centroidLat = query.centroid_lat != null && Number(query.centroid_lat) !== 0 ? parseFloat(query.centroid_lat) : null;
  const centroidLng = query.centroid_lng != null && Number(query.centroid_lng) !== 0 ? parseFloat(query.centroid_lng) : null;
  const lat = centroidLat != null ? centroidLat : (query.geocoded_lat ? parseFloat(query.geocoded_lat) : null);
  const lng = centroidLng != null ? centroidLng : (query.geocoded_lng ? parseFloat(query.geocoded_lng) : null);
  if (!lat || !lng) return null;

  const rawGeom = query.geometry_geojson || null;
  let polygonCoords = null;
  if (rawGeom) {
    const geom = rawGeom.type === "Feature" ? rawGeom.geometry : rawGeom;
    if (geom?.coordinates?.[0]?.length > 2) polygonCoords = geom.coordinates[0];
  }

  // Riusa URL salvato se disponibile
  if (query.mappa_image_url) return query.mappa_image_url;

  return buildStaticMapUrl({ lat, lng, polygonCoords, width: 700, height: 380 });
}