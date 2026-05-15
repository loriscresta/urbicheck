/**
 * catasto_resolver.js — URBICHECK
 * Risolve coordinate precise di una particella catastale usando:
 * 1. Nominatim geocoding (centroide approssimato per comune)
 * 2. WFS AdE CC-BY 4.0 (poligono GML con BBOX centrato sul comune)
 *
 * Nota: il dataset OnData Parquet usa compressione ZSTD non ancora
 * supportata da hyparquet in Deno — si usa Nominatim + WFS AdE come fonte primaria.
 *
 * INPUT: { nome_comune, foglio, particella, query_id? }
 * OUTPUT: { lat, lon, geojson_polygon, inspire_id, source }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WFS_ADE_BASE = 'https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php';

const fetchWithTimeout = (url, opts = {}, ms = 15000) =>
  Promise.race([
    fetch(url, opts),
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms)),
  ]);

// ── Step 1: Geocoding comune via Nominatim ──
async function geocodeComune(nomeComune) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(nomeComune + ', Italy')}&format=json&limit=1&countrycodes=it&accept-language=it`;
  const res = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': 'URBICHECK/1.0 (info@urbicheck.it)',
      'Accept': 'application/json',
    }
  }, 10000);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (_e) {
    throw new Error(`Nominatim risposta non valida: ${text.slice(0, 80)}`);
  }
  if (!Array.isArray(data) || !data.length) throw new Error(`Geocoding: nessun risultato per "${nomeComune}"`);
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

// ── Step 2: Ricerca WFS AdE con BBOX progressivamente allargata ──
// Il WFS AdE usa EPSG:6706 (praticamente identico a WGS84 per l'Italia)
async function searchParcelInAdeBbox(lat, lon, foglio, particella, bboxDelta = 0.005) {
  const foglioNorm = String(foglio).replace(/^0+/, '') || foglio; // rimuovi leading zeros per matching
  const foglioFull = String(foglio).padStart(4, '0'); // con leading zeros

  for (const delta of [bboxDelta, bboxDelta * 2, bboxDelta * 4]) {
    try {
      const bbox = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;
      const url = `${WFS_ADE_BASE}?language=ita&SERVICE=WFS&VERSION=2.0.0&TYPENAMES=CP:CadastralParcel&SRSNAME=urn:ogc:def:crs:EPSG::6706&BBOX=${bbox}&REQUEST=GetFeature&COUNT=50`;
      const res = await fetchWithTimeout(url, {
        headers: { 'Accept': 'application/xml, text/xml', 'User-Agent': 'URBICHECK/1.0' }
      }, 15000);
      if (!res.ok) continue;
      const xml = await res.text();

      const result = parseAdeParcels(xml, foglio, foglioNorm, foglioFull, particella);
      if (result) return result;
    } catch (e) {
      console.warn(`WFS AdE BBOX delta=${delta} error:`, e.message);
    }
  }
  return null;
}

// ── Parse XML GML da WFS AdE ──
function parseAdeParcels(xml, foglio, foglioNorm, foglioFull, particella) {
  const particellaStr = String(particella).replace(/^0+/, '') || particella;
  const particellaFull = String(particella).padStart(4, '0');

  // Tenta match per gml:id che termina con ".particella" o "_particella"
  // Il formato tipico è: "IT.AGE.PLA.{comune}.{foglio}.{particella}" o simili
  const featurePattern = /<CP:CadastralParcel[^>]*gml:id="([^"]*)"[^>]*>([\s\S]*?)<\/CP:CadastralParcel>/g;
  let match;
  let bestMatch = null;

  while ((match = featurePattern.exec(xml)) !== null) {
    const gmlId = match[1];
    const featureContent = match[2];

    // Check gml:id contains our particella
    const idParts = gmlId.split(/[._-]/);
    const lastPart = idParts[idParts.length - 1];
    const secondLast = idParts[idParts.length - 2];

    const particellaMatch = lastPart === particellaStr || lastPart === particellaFull ||
      parseInt(lastPart, 10) === parseInt(particellaStr, 10);
    const foglioMatch = secondLast === foglioNorm || secondLast === foglioFull ||
      parseInt(secondLast, 10) === parseInt(foglioNorm, 10);

    if (particellaMatch) {
      const polygon = extractPolygon(featureContent);
      if (polygon) {
        bestMatch = { geojson_polygon: polygon, inspire_id: gmlId, foglio_match: foglioMatch };
        if (foglioMatch) break; // match esatto foglio+particella
      }
    }
  }

  if (bestMatch) return bestMatch;

  // Fallback: prima feature con posList valido
  const firstPosMatch = xml.match(/<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/);
  const firstIdMatch = xml.match(/gml:id="([^"]+)"/);
  if (firstPosMatch) {
    const polygon = posListToGeoJSON(firstPosMatch[1].trim());
    if (polygon) {
      return { geojson_polygon: polygon, inspire_id: firstIdMatch?.[1] || null, foglio_match: false };
    }
  }

  return null;
}

function extractPolygon(featureContent) {
  const posListMatch = featureContent.match(/<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/);
  if (!posListMatch) return null;
  return posListToGeoJSON(posListMatch[1].trim());
}

function posListToGeoJSON(posListStr) {
  const nums = posListStr.split(/\s+/).map(Number).filter(n => isFinite(n));
  if (nums.length < 6) return null;

  const coordinates = [];
  // EPSG:6706 usa lat/lon come WGS84
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const latC = nums[i];
    const lonC = nums[i + 1];
    coordinates.push([lonC, latC]); // GeoJSON: [lon, lat]
  }
  if (coordinates.length < 3) return null;

  // Chiudi il ring
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coordinates.push([...first]);
  }

  return { type: 'Polygon', coordinates: [coordinates] };
}

// ── Calcola centroide da poligono GeoJSON ──
function getCentroid(geojsonPolygon) {
  if (!geojsonPolygon?.coordinates?.[0]) return null;
  const ring = geojsonPolygon.coordinates[0];
  const n = ring.length;
  if (n === 0) return null;
  const sumLon = ring.reduce((s, c) => s + c[0], 0);
  const sumLat = ring.reduce((s, c) => s + c[1], 0);
  return { lat: sumLat / n, lon: sumLon / n };
}

// ── Main resolver ──
async function resolveParcel(nomeComune, foglio, particella) {
  // Step 1: geocoding del comune
  let comuneCoords;
  try {
    comuneCoords = await geocodeComune(nomeComune);
  } catch (e) {
    throw new Error('Geocoding fallito: ' + e.message);
  }

  // Step 2: cerca particella nel WFS AdE
  const parcelResult = await searchParcelInAdeBbox(
    comuneCoords.lat, comuneCoords.lon, foglio, particella
  );

  if (parcelResult?.geojson_polygon) {
    // Usa centroide del poligono come coordinate precise
    const centroid = getCentroid(parcelResult.geojson_polygon);
    const lat = centroid?.lat || comuneCoords.lat;
    const lon = centroid?.lon || comuneCoords.lon;
    return {
      lat,
      lon,
      geojson_polygon: parcelResult.geojson_polygon,
      inspire_id: parcelResult.inspire_id,
      source: 'AdE WFS CC-BY 4.0 (poligono preciso)',
    };
  }

  // Fallback: solo geocoding comune (posizione approssimata)
  return {
    lat: comuneCoords.lat,
    lon: comuneCoords.lon,
    geojson_polygon: null,
    inspire_id: null,
    source: 'Nominatim (centroide comune — particella non trovata su WFS AdE)',
  };
}

// ── Main Handler ──
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let user;
  try {
    user = await base44.auth.me();
  } catch (_e) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch (_e) {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { nome_comune, foglio, particella, query_id } = body;

  if (!nome_comune || !foglio || !particella) {
    return Response.json({ error: 'nome_comune, foglio e particella sono obbligatori' }, { status: 400 });
  }

  // Verifica proprietà se query_id fornito
  let queryRecord = null;
  if (query_id) {
    try {
      const results = await base44.entities.CadastralQuery.filter({ id: query_id });
      queryRecord = results[0] || null;
      if (queryRecord && queryRecord.created_by !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_e) {}
  }

  let coords;
  try {
    coords = await resolveParcel(nome_comune, foglio, particella);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }

  const catasto_data = {
    lat: coords.lat,
    lon: coords.lon,
    geojson_polygon: coords.geojson_polygon,
    inspire_id: coords.inspire_id,
    fonte: coords.source,
    calcolato_il: new Date().toISOString(),
  };

  // Salva nell'entità se query_id fornito
  if (queryRecord) {
    try {
      await base44.entities.CadastralQuery.update(query_id, {
        centroid_lat: coords.lat,
        centroid_lng: coords.lon,
        geometry_geojson: coords.geojson_polygon || undefined,
        report_data: {
          ...(queryRecord.report_data || {}),
          catasto_data,
        },
      });
    } catch (saveErr) {
      console.warn('Save error:', saveErr.message);
    }
  }

  return Response.json({ success: true, catasto_data });
});