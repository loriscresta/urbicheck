/**
 * fetchParcelGeometry — recupera la geometria GeoJSON di una particella catastale
 * dal WFS dell'Agenzia delle Entrate e la salva su CadastralQuery.
 *
 * INPUT: { queryId, foglio, particella, sezione, comune, centroid_lat, centroid_lng }
 * OUTPUT: { success: true, geometry } | { success: false }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WFS_ADE_BASE = 'https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php';

function extractPolygon(xml) {
  const m = xml.match(/<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/);
  if (!m) return null;
  const nums = m[1].trim().split(/\s+/).map(Number).filter(n => isFinite(n));
  if (nums.length < 6) return null;
  const coordinates = [];
  for (let i = 0; i + 1 < nums.length; i += 2) coordinates.push([nums[i + 1], nums[i]]);
  if (coordinates.length < 3) return null;
  const first = coordinates[0], last = coordinates[coordinates.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) coordinates.push([...first]);
  return { type: 'Polygon', coordinates: [coordinates] };
}

// ── FIX 1: Calcola baricentro del poligono (media aritmetica di tutti i vertici) ──
function calcPolygonCentroid(polygon) {
  const ring = polygon?.coordinates?.[0];
  if (!ring || ring.length < 3) return null;
  let sumLon = 0, sumLat = 0;
  for (const [lo, la] of ring) { sumLon += lo; sumLat += la; }
  return { lat: sumLat / ring.length, lon: sumLon / ring.length };
}

async function searchWfs(lat, lon, delta = 0.002) {
  const bbox = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;
  const url = `${WFS_ADE_BASE}?language=ita&SERVICE=WFS&VERSION=2.0.0&TYPENAMES=CP:CadastralParcel&SRSNAME=urn:ogc:def:crs:EPSG::6706&BBOX=${bbox}&REQUEST=GetFeature&COUNT=10`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/xml, text/xml', 'User-Agent': 'URBICHECK/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const xml = await res.text();
    // Prendi primo poligono valido
    const polygon = extractPolygon(xml);
    if (polygon) return polygon;
  } catch (e) {
    console.warn('WFS fetch error:', e.message);
  }
  return null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let user;
  try { user = await base44.auth.me(); } catch (_e) {}
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch (_e) {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { queryId, centroid_lat, centroid_lng } = body;

  if (!centroid_lat || !centroid_lng) {
    return Response.json({ success: false, error: 'centroid_lat e centroid_lng obbligatori' }, { status: 400 });
  }

  // Verifica accesso alla query
  if (queryId) {
    try {
      const results = await base44.entities.CadastralQuery.filter({ id: queryId });
      const qr = results[0];
      if (qr && qr.created_by !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Se già ha geometry, restituisci subito (con centroid se già aggiornato)
      if (qr?.geometry_geojson) {
        return Response.json({ success: true, geometry: qr.geometry_geojson, cached: true });
      }
    } catch (_e) {}
  }

  // Tenta WFS con delta progressivo
  let geometry = await searchWfs(centroid_lat, centroid_lng, 0.001);
  if (!geometry) geometry = await searchWfs(centroid_lat, centroid_lng, 0.003);

  if (!geometry) {
    return Response.json({ success: false, reason: 'WFS AdE non ha restituito geometria per questa area' });
  }

  // ── FIX 1: Calcola baricentro dal poligono WFS AdE ──
  const centroid = calcPolygonCentroid(geometry);

  // Salva sulla query: geometry_geojson + centroid_lat/lng aggiornati al baricentro WFS AdE
  if (queryId) {
    try {
      await base44.asServiceRole.entities.CadastralQuery.update(queryId, {
        geometry_geojson: geometry,
        ...(centroid ? {
          centroid_lat: centroid.lat,
          centroid_lng: centroid.lon,
        } : {}),
      });
    } catch (e) {
      console.warn('Save geometry error:', e.message);
    }
  }

  return Response.json({ success: true, geometry, centroid });
});
