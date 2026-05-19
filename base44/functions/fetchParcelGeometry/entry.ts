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

// Ricerca WFS AdE per INSPIRE ID esatto (più precisa, evita wrong parcel)
async function searchWfsByInspireId(inspireId) {
  const url = `${WFS_ADE_BASE}?language=ita&SERVICE=WFS&VERSION=2.0.0&TYPENAMES=CP:CadastralParcel&SRSNAME=urn:ogc:def:crs:EPSG::6706&REQUEST=GetFeature&FEATUREID=${encodeURIComponent(inspireId)}&COUNT=1`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/xml, text/xml', 'User-Agent': 'URBICHECK/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const xml = await res.text();
    return extractPolygon(xml);
  } catch (e) {
    console.warn('WFS by INSPIRE ID error:', e.message);
    return null;
  }
}

async function searchWfsByBbox(lat, lon, delta, codiceBelfiore, foglio, particella) {
  const bbox = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;
  const url = `${WFS_ADE_BASE}?language=ita&SERVICE=WFS&VERSION=2.0.0&TYPENAMES=CP:CadastralParcel&SRSNAME=urn:ogc:def:crs:EPSG::6706&BBOX=${bbox}&REQUEST=GetFeature&COUNT=20`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/xml, text/xml', 'User-Agent': 'URBICHECK/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const xml = await res.text();

    // Se abbiamo codice comune + foglio + particella, filtra la particella corretta
    if (codiceBelfiore && foglio && particella) {
      const foglioNorm = String(foglio).padStart(4, '0');
      const particellaStr = String(particella);
      const particellaInt = parseInt(particellaStr, 10);
      const featurePattern = /<CP:CadastralParcel[^>]*gml:id="([^"]*)"[^>]*>([\s\S]*?)<\/CP:CadastralParcel>/g;
      let match;
      while ((match = featurePattern.exec(xml)) !== null) {
        const gmlId = match[1];
        const content = match[2];
        const parts = gmlId.split('.');
        const lastPart = parts[parts.length - 1];
        const keyPart = parts[parts.length - 2] || '';
        if (lastPart !== particellaStr && parseInt(lastPart, 10) !== particellaInt) continue;
        if (!keyPart.toUpperCase().startsWith(codiceBelfiore.toUpperCase())) continue;
        if (!keyPart.includes(foglioNorm) && !keyPart.includes(String(parseInt(foglioNorm, 10)))) continue;
        const polygon = extractPolygon(content);
        if (polygon) return polygon;
      }
      return null; // Non trovata la particella esatta — non restituire un poligono sbagliato
    }

    // Senza identificatori: prendi primo (solo se già abbiamo geometry vuole solo aggiornare)
    return extractPolygon(xml);
  } catch (e) {
    console.warn('WFS bbox error:', e.message);
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

  // Leggi la query per ottenere codice_comune_catasto + inspire_id
  let qr = null;
  if (queryId) {
    try {
      const results = await base44.entities.CadastralQuery.filter({ id: queryId });
      qr = results[0] || null;
      if (qr && qr.created_by !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Se già ha geometry, restituisci subito
      if (qr?.geometry_geojson) {
        return Response.json({ success: true, geometry: qr.geometry_geojson, cached: true });
      }
    } catch (_e) {}
  }

  // FIX 1 — Se codice_comune_catasto è null, non fare proximity search (restituisce parcel sbagliata)
  // Salta il fetch e segnala che il catasto_resolver deve girare prima
  if (!qr?.codice_comune_catasto) {
    console.warn(`fetchParcelGeometry: codice_comune_catasto null per query ${queryId} — skip WFS AdE (evita parcel sbagliata)`);
    return Response.json({ success: false, reason: 'codice_comune_catasto non disponibile — attendere catasto_resolver' });
  }

  const codiceBelfiore = qr.codice_comune_catasto;
  const foglio = qr.foglio;
  const particella = qr.particella;
  // Prova prima per INSPIRE ID esatto (da report_data.catasto_data)
  const inspireId = qr.report_data?.catasto_data?.inspire_id;

  let geometry = null;

  if (inspireId) {
    geometry = await searchWfsByInspireId(inspireId);
    if (geometry) console.log(`WFS AdE: trovato per INSPIRE ID ${inspireId}`);
  }

  // Fallback: bbox con filtro particella esatta
  if (!geometry) {
    geometry = await searchWfsByBbox(centroid_lat, centroid_lng, 0.001, codiceBelfiore, foglio, particella);
  }
  if (!geometry) {
    geometry = await searchWfsByBbox(centroid_lat, centroid_lng, 0.003, codiceBelfiore, foglio, particella);
  }

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