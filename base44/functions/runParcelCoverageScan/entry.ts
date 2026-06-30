// runParcelCoverageScan — test di copertura catastale automatico a batch.
// Per ogni comune: geocodifica il centro con Google, genera 5 punti di test
// (centro + 4 offset ~40m), chiama la STESSA logica di lookupParcelByCoords
// (fetch diretta al Catasto Agent /parcel), conta gli hit e scrive ParcelCoverageTest.
// Admin-only, ripetibile/resumibile, sequenziale (rate-limit friendly).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const AGENT_BASE = 'http://80.211.24.114:8001';
const GOOGLE_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
const BETA_REGIONI = ['Piemonte', 'Liguria', 'Lombardia'];
const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

// Stesso servizio di lookupParcelByCoords, riutilizzato direttamente (no invoke).
async function lookupParcel(lat, lon) {
  const url = `${AGENT_BASE}/parcel?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)', 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { found: false };
    const data = await res.json();
    if (!data.found || !data.parcels?.length) return { found: false };
    const p = data.parcels[0];
    return {
      found: true,
      comune_code: p.comune_code || null,
    };
  } catch (_e) {
    return { found: false };
  }
}

async function googleGeocode(query) {
  if (!GOOGLE_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:IT&region=it&key=${GOOGLE_KEY}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;
    const loc = data.results[0].geometry?.location;
    if (!loc || !isFinite(loc.lat) || !isFinite(loc.lng)) return null;
    return { lat: loc.lat, lon: loc.lng };
  } catch (_e) {
    return null;
  }
}

function testPoints(lat, lon) {
  // ~40 metri di offset
  const dLat = 40 / 111320;
  const dLon = 40 / (111320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lat, lon],
    [lat + dLat, lon],
    [lat - dLat, lon],
    [lat, lon + dLon],
    [lat, lon - dLon],
  ];
}

Deno.serve(async (req) => {
  console.log('CATASTO_REDEPLOY_MARKER_v3', new Date().toISOString());
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }
    const srv = base44.asServiceRole;

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }
    const regione = body.regione || null;
    const limit = Math.min(Math.max(parseInt(body.limit, 10) || 40, 1), 200);
    const forza = !!body.forza;

    // 1) Carica comuni (regione specifica o tutte le beta)
    const regioniDaCaricare = regione ? [regione] : BETA_REGIONI;
    const comuni = [];
    for (const r of regioniDaCaricare) {
      let batch = null;
      let skip = 0;
      do {
        const list = await srv.entities.ComuneItalia.filter({ regione: r }, undefined, 5000);
        comuni.push(...list);
        batch = list;
        skip += list.length;
      } while (batch && batch.length >= 5000 && skip < 20000);
    }

    // 2) Carica test esistenti per saltare quelli recenti
    const existing = await srv.entities.ParcelCoverageTest.list(undefined, 10000);
    const now = Date.now();
    const recentKey = new Set();
    const recordByKey = new Map();
    for (const t of existing) {
      const key = (t.codice_istat && t.codice_istat.trim()) || `${t.comune}__${t.provincia || ''}`;
      recordByKey.set(key, t);
      if (!forza && t.tested_at) {
        const ts = new Date(t.tested_at).getTime();
        if (!isNaN(ts) && now - ts < DAYS_30) recentKey.add(key);
      }
    }

    // comuni da testare (candidati totali)
    const candidates = [];
    for (const c of comuni) {
      const key = (c.codice_istat && c.codice_istat.trim()) || `${c.nome}__${c.provincia || ''}`;
      if (recentKey.has(key)) continue;
      candidates.push({ c, key });
    }
    const totalEligible = candidates.length;
    const toProcess = candidates.slice(0, limit);

    let processati = 0, coperti = 0, buchi = 0, geocodeFail = 0;

    for (const { c, key } of toProcess) {
      const query = `${c.nome}, ${c.provincia || c.sigla_provincia || ''}, Italia`;
      const geo = await googleGeocode(query);

      if (!geo) {
        await upsert(srv, recordByKey, key, {
          comune: c.nome, provincia: c.provincia || '', regione: c.regione || '',
          codice_istat: c.codice_istat || '', test_lat: null, test_lon: null,
          found: false, hits: 0, comune_code: null, esito: 'geocode_fallito',
          note: 'Google Geocoding non ha restituito coordinate', tested_at: new Date().toISOString(),
        });
        geocodeFail++; processati++; continue;
      }

      const pts = testPoints(geo.lat, geo.lon);
      let hits = 0;
      let comuneCode = null;
      for (const [lat, lon] of pts) {
        const r = await lookupParcel(lat, lon);
        if (r.found) {
          hits++;
          if (!comuneCode && r.comune_code) comuneCode = r.comune_code;
        }
      }

      const esito = hits > 0 ? 'coperto' : 'buco';
      await upsert(srv, recordByKey, key, {
        comune: c.nome, provincia: c.provincia || '', regione: c.regione || '',
        codice_istat: c.codice_istat || '', test_lat: geo.lat, test_lon: geo.lon,
        found: hits > 0, hits, comune_code: comuneCode, esito,
        note: hits > 0 ? `${hits}/5 punti trovati` : '0/5 punti — copertura assente', tested_at: new Date().toISOString(),
      });
      if (esito === 'coperto') coperti++; else buchi++;
      processati++;
      console.log(`[coverage] ${c.nome} (${c.regione}) -> ${esito} (${hits}/5)`);
    }

    const rimanenti = Math.max(0, totalEligible - processati);
    return Response.json({
      regione: regione || 'tutte (beta)',
      processati,
      coperti,
      buchi,
      geocode_falliti: geocodeFail,
      rimanenti_da_testare: rimanenti,
    });
  } catch (error) {
    console.error('[runParcelCoverageScan] errore:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Crea o aggiorna il record ParcelCoverageTest in base alla chiave.
async function upsert(srv, recordByKey, key, data) {
  const existing = recordByKey.get(key);
  if (existing) {
    await srv.entities.ParcelCoverageTest.update(existing.id, data);
  } else {
    const created = await srv.entities.ParcelCoverageTest.create(data);
    recordByKey.set(key, created);
  }
}