/**
 * Proxy server-side per immagini di mappe statiche.
 * Risolve il problema CORS: il browser non può fetchiare providers di static map,
 * ma questo backend Deno sì. Restituisce l'immagine come base64 data URL.
 *
 * Richiede la variabile d'ambiente GEOAPIFY_API_KEY (free tier: 3000 req/day).
 * Registrati su https://www.geoapify.com/ per ottenere una chiave gratuita.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Tile coordinate helpers per fallback OSM singolo tile
function lon2tile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}
function lat2tile(lat, zoom) {
  return Math.floor(
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)
  );
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── AUTH: richiede utente autenticato ──────────────────────────────────
    let user;
    try { user = await base44.auth.me(); } catch (_e) {}
    if (!user) return Response.json({ error: 'Unauthorized — autenticazione richiesta' }, { status: 401 });

    const body = await req.json();
    const { lat, lng, polygon_coords, zoom: zoomOverride } = body;

    if (!lat || !lng) {
      return Response.json({ error: 'lat/lng required' }, { status: 400 });
    }

    let cLat = parseFloat(lat);
    let cLng = parseFloat(lng);
    let zoom = zoomOverride || 17;
    const polygonCoords = polygon_coords || null;

    // Calcola centro e zoom ottimale dal bounding box del poligono
    if (polygonCoords && polygonCoords.length > 2) {
      const lats = polygonCoords.map(c => c[1]);
      const lngs = polygonCoords.map(c => c[0]);
      cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      const span = Math.max(
        Math.max(...lats) - Math.min(...lats),
        Math.max(...lngs) - Math.min(...lngs)
      );
      if (span > 0.01) zoom = 14;
      else if (span > 0.003) zoom = 16;
      else if (span > 0.001) zoom = 17;
      else zoom = 18;
    }

    const GEOAPIFY_KEY = Deno.env.get('GEOAPIFY_API_KEY') || '';
    const MAPBOX_TOKEN = Deno.env.get('MAPBOX_TOKEN') || '';

    let mapUrl = '';

    // ── Strategia 1: Geoapify (consigliata, supporta GeoJSON overlay) ───────
    if (GEOAPIFY_KEY) {
      if (polygonCoords && polygonCoords.length > 2) {
        const geojsonPolygon = JSON.stringify({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [polygonCoords] },
          properties: { stroke: "#ff7a00", "stroke-width": 3, fill: "#ff7a00", "fill-opacity": 0.35 }
        });
        mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=800&height=420&center=lonlat:${cLng},${cLat}&zoom=${zoom}&geometry=geojson:${encodeURIComponent(geojsonPolygon)}&apiKey=${GEOAPIFY_KEY}`;
      } else {
        mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=800&height=420&center=lonlat:${cLng},${cLat}&zoom=${zoom}&marker=lonlat:${cLng},${cLat};color:%23ff7a00;size:medium&apiKey=${GEOAPIFY_KEY}`;
      }
    }
    // ── Strategia 2: Mapbox (se configurato) ────────────────────────────────
    else if (MAPBOX_TOKEN) {
      const overlayPath = polygonCoords && polygonCoords.length > 2
        ? `path-3+ff7a00-0.4(${encodeURIComponent(polygonCoords.map(c => `${c[0]},${c[1]}`).join(';'))})/`
        : `pin-s+ff7a00(${cLng},${cLat})/`;
      mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${overlayPath}${cLng},${cLat},${zoom}/800x420?access_token=${MAPBOX_TOKEN}`;
    }
    // ── Strategia 3: singolo tile OSM (no poligono, solo punto) ─────────────
    else {
      const tx = lon2tile(cLng, zoom);
      const ty = lat2tile(cLat, zoom);
      mapUrl = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
    }

    if (!mapUrl) {
      return Response.json({ error: 'No map provider configured. Set GEOAPIFY_API_KEY.' }, { status: 503 });
    }

    // ── Scarica l'immagine server-side ────────────────────────────────────
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    let imgRes;
    try {
      imgRes = await fetch(mapUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'UrbiCheck/1.0 (urbicheck.it)' },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!imgRes.ok) {
      console.error('[fetchMapImage] provider error:', imgRes.status, mapUrl);
      return Response.json({ error: `Map service returned ${imgRes.status}`, url: mapUrl }, { status: 502 });
    }

    const contentType = imgRes.headers.get('content-type') || 'image/png';
    const arrayBuffer = await imgRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Converti in base64 data URL
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const dataUrl = `data:${contentType};base64,${base64}`;

    return Response.json({ data_url: dataUrl, map_url: mapUrl });

  } catch (error) {
    console.error('[fetchMapImage] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});