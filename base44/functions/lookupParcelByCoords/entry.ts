// lookupParcelByCoords — trova foglio/particella da coordinate.
// PRIMARIO: server catastale (endpoint da env CATASTO_API_URL) — 20M+ particelle (Piemonte, Liguria, Lombardia).
// FALLBACK graceful: se il server è irraggiungibile o risponde con errore, restituisce found:false
//   senza interrompere il flusso (l'app resta funzionante).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const AGENT_BASE = 'http://80.211.24.114:8001';

Deno.serve(async (req) => {
  console.log('CATASTO_REDEPLOY_MARKER_v3', new Date().toISOString());
  try {
    try { await createClientFromRequest(req).auth.me(); } catch (_e) {}
    // Permetti anche utenti non autenticati (ricerca pubblica)

    let body;
    try { body = await req.json(); } catch (_e) {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { lat, lon } = body;
    if (!lat || !lon || !isFinite(lat) || !isFinite(lon)) {
      return Response.json({ error: 'lat e lon obbligatori e numerici' }, { status: 400 });
    }

    // ── PRIMARIO: server Aruba ─────────────────────────────────────────────
    const primaryUrl = `${AGENT_BASE}/parcel?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=1`;
    console.log(`[lookupParcelByCoords] primario: ${primaryUrl}`);

    try {
      const res = await fetch(primaryUrl, { headers: { 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)', 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.parcels?.length) {
          const p = data.parcels[0];
          const isSnapped = data.snapped === true || p.snapped === true;
          const snapDistM = isSnapped ? Math.round(p.dist_m ?? 0) : null;
          console.log(`[lookupParcelByCoords] OK (Aruba): foglio=${p.foglio} part=${p.particella} snapped=${isSnapped} dist_m=${snapDistM}`);
          return Response.json({
            found: true,
            foglio: p.foglio != null ? Number(p.foglio) : null,
            particella: p.particella != null ? String(p.particella) : null,
            sezione: p.sezione || null,
            comune_code: p.comune_code || null,
            centroid_lat: p.centroid_lat ?? null,
            centroid_lon: p.centroid_lon ?? null,
            geometry_geojson: p.geometry || null,
            fonte: 'catasto_agent',
            snapped: isSnapped,
            snap_dist_m: snapDistM,
          });
        }
        // found=false → nessuna particella in questa posizione nella nostra DB
        console.log('[lookupParcelByCoords] Aruba: nessuna particella trovata (not in coverage)');
        return Response.json({ found: false, _debug: 'server_reached_no_parcel', _base: AGENT_BASE, _status: res.status });
      }
      console.warn(`[lookupParcelByCoords] Aruba HTTP ${res.status} — fallback Catastomappe`);
      return Response.json({ found: false, _debug: 'http_error', _status: res.status, _base: AGENT_BASE });
    } catch (primaryErr) {
      console.warn(`[lookupParcelByCoords] Aruba irraggiungibile (${primaryErr.message}) — fallback Catastomappe`);
      return Response.json({ found: false, _debug: 'fetch_error', _err: String(primaryErr && primaryErr.message), _base: AGENT_BASE });
    }

  } catch (error) {
    console.error('[lookupParcelByCoords] errore:', error.message);
    return Response.json({ found: false, error: error.message }, { status: 500 });
  }
});