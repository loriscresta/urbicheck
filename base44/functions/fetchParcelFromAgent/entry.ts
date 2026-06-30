/**
 * fetchParcelFromAgent — chiama il microservizio catastale interno HTTP (server-side,
 * evita mixed-content dal browser) per ottenere geometria e centroide della particella.
 *
 * Endpoint primario:  GET /parcel/lookup?comune={comune}&foglio={foglio}&particella={particella}
 * Fallback:           GET /parcel?lat={lat}&lon={lon}&limit=1  (usa lat/lon del comune da ComuneItalia)
 *
 * Salva su CadastralQuery:
 *   - geometry_geojson  = parcels[0].geometry  (Polygon GeoJSON)
 *   - centroid_lat/lng  = parcels[0].centroid_lat / centroid_lon
 *   - codice_comune_catasto = parcels[0].comune_code
 *   - fonte_dati_catastali  = "catasto_agent"
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const AGENT_BASE = Deno.env.get('CATASTO_API_URL') || 'http://80.211.24.114:8001';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let user;
  try { user = await base44.auth.me(); } catch (_e) {}
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch (_e) {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { query_id, comune, foglio, particella } = body;

  if (!query_id || !comune || !foglio || !particella) {
    return Response.json({ error: 'query_id, comune, foglio, particella sono obbligatori' }, { status: 400 });
  }

  // Verifica ownership
  let queryRecord = null;
  try {
    const results = await base44.entities.CadastralQuery.filter({ id: query_id });
    queryRecord = results[0] || null;
  } catch (e) {
    console.error('CadastralQuery fetch error:', e.message);
    return Response.json({ error: 'Query non trovata' }, { status: 404 });
  }
  if (!queryRecord) return Response.json({ error: 'Query non trovata' }, { status: 404 });
  if (queryRecord.created_by_id !== user.id && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Se ha già la geometria, non fare nulla
  if (queryRecord.geometry_geojson) {
    console.log(`[fetchParcelFromAgent] query ${query_id} ha già geometry_geojson — skip`);
    return Response.json({ success: true, skipped: true, source: 'already_present' });
  }

  // ── STEP 1: lookup per nome comune + foglio + particella ──
  const lookupUrl = `${AGENT_BASE}/parcel/lookup?comune=${encodeURIComponent(comune)}&foglio=${encodeURIComponent(foglio)}&particella=${encodeURIComponent(particella)}`;
  console.log(`[fetchParcelFromAgent] lookup: ${lookupUrl}`);

  let parcel = null;
  try {
    const res = await fetch(lookupUrl, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      if (data.found && data.parcels?.length > 0) {
        parcel = data.parcels[0];
        console.log(`[fetchParcelFromAgent] lookup OK: comune_code=${parcel.comune_code}`);
      } else {
        console.log(`[fetchParcelFromAgent] lookup: found=false`);
      }
    } else {
      console.warn(`[fetchParcelFromAgent] lookup HTTP ${res.status}`);
    }
  } catch (e) {
    console.warn(`[fetchParcelFromAgent] lookup error: ${e.message}`);
  }

  // ── STEP 2 (fallback): /parcel?lat=&lon= usando coord del ComuneItalia ──
  if (!parcel) {
    let comuneLat = null, comuneLon = null;
    try {
      const comuneResults = await base44.asServiceRole.entities.ComuneItalia.filter({ nome: comune });
      const comuneRecord = comuneResults[0];
      if (comuneRecord?.lat && comuneRecord?.lon) {
        comuneLat = comuneRecord.lat;
        comuneLon = comuneRecord.lon;
      }
    } catch (e) {
      console.warn('[fetchParcelFromAgent] ComuneItalia lookup error:', e.message);
    }

    if (comuneLat && comuneLon) {
      const fallbackUrl = `${AGENT_BASE}/parcel?lat=${comuneLat}&lon=${comuneLon}&limit=1`;
      console.log(`[fetchParcelFromAgent] fallback: ${fallbackUrl}`);
      try {
        const res = await fetch(fallbackUrl, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
          const data = await res.json();
          if (data.found && data.parcels?.length > 0) {
            parcel = data.parcels[0];
            console.log(`[fetchParcelFromAgent] fallback OK`);
          } else {
            console.log(`[fetchParcelFromAgent] fallback: found=false`);
          }
        } else {
          console.warn(`[fetchParcelFromAgent] fallback HTTP ${res.status}`);
        }
      } catch (e) {
        console.warn(`[fetchParcelFromAgent] fallback error: ${e.message}`);
      }
    } else {
      console.warn('[fetchParcelFromAgent] ComuneItalia lat/lon non disponibili — fallback saltato');
    }
  }

  if (!parcel || !parcel.geometry) {
    console.log(`[fetchParcelFromAgent] nessuna geometria trovata per ${comune} F.${foglio} P.${particella}`);
    return Response.json({ success: false, reason: 'Geometria non trovata dal microservizio catastale' });
  }

  // ── Salva su CadastralQuery ──
  const updateData = {
    geometry_geojson: parcel.geometry,
    fonte_dati_catastali: 'catasto_agent',
  };
  if (parcel.centroid_lat != null) updateData.centroid_lat = parcel.centroid_lat;
  if (parcel.centroid_lon != null) updateData.centroid_lng = parcel.centroid_lon;
  if (parcel.comune_code) updateData.codice_comune_catasto = parcel.comune_code;

  try {
    await base44.asServiceRole.entities.CadastralQuery.update(query_id, updateData);
    console.log(`[fetchParcelFromAgent] salvato: comune_code=${parcel.comune_code} centroid=${parcel.centroid_lat},${parcel.centroid_lon}`);
  } catch (e) {
    console.error('[fetchParcelFromAgent] update error:', e.message);
    return Response.json({ error: 'Errore salvataggio geometria: ' + e.message }, { status: 500 });
  }

  return Response.json({
    success: true,
    source: 'catasto_agent',
    comune_code: parcel.comune_code,
    centroid_lat: parcel.centroid_lat,
    centroid_lon: parcel.centroid_lon,
    has_geometry: true,
  });
});