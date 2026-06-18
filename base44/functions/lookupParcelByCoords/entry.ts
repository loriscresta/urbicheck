// lookupParcelByCoords — chiama Catasto Agent /parcel?lat=&lon= per trovare foglio/particella da coordinate
// Usato dal frontend IndirizzoAutocomplete dopo geocoding Nominatim
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const AGENT_BASE = Deno.env.get('CATASTO_API_URL') || 'http://80.211.24.114:8001';

Deno.serve(async (req) => {
  try {
    let user;
    try { user = await createClientFromRequest(req).auth.me(); } catch (_e) {}
    // Permetti anche utenti non autenticati (ricerca pubblica)

    let body;
    try { body = await req.json(); } catch (_e) {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { lat, lon } = body;
    if (!lat || !lon || !isFinite(lat) || !isFinite(lon)) {
      return Response.json({ error: 'lat e lon obbligatori e numerici' }, { status: 400 });
    }

    const url = `${AGENT_BASE}/parcel?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=1`;
    console.log(`[lookupParcelByCoords] chiamata: ${url}`);

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`[lookupParcelByCoords] HTTP ${res.status}`);
      return Response.json({ found: false, error: `Servizio catastale non disponibile (${res.status})` }, { status: 502 });
    }

    const data = await res.json();
    if (!data.found || !data.parcels?.length) {
      console.log('[lookupParcelByCoords] nessuna particella trovata');
      return Response.json({ found: false });
    }

    const parcel = data.parcels[0];
    console.log(`[lookupParcelByCoords] OK: foglio=${parcel.foglio} part=${parcel.particella} comune_code=${parcel.comune_code}`);

    return Response.json({
      found: true,
      foglio: parcel.foglio || null,
      particella: parcel.particella || null,
      sezione: parcel.sezione || null,
      comune_code: parcel.comune_code || null,
      centroid_lat: parcel.centroid_lat ?? null,
      centroid_lon: parcel.centroid_lon ?? null,
    });
  } catch (error) {
    console.error('[lookupParcelByCoords] errore:', error.message);
    return Response.json({ found: false, error: error.message }, { status: 500 });
  }
});