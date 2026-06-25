// lookupParcelByCoords — trova foglio/particella da coordinate.
// PRIMARIO: server catastale Aruba (http://80.211.24.114:8001/parcel) — 20M+ particelle (Piemonte, Liguria, Lombardia).
// FALLBACK graceful: se il server è irraggiungibile o risponde con errore, restituisce found:false
//   senza interrompere il flusso (l'app resta funzionante).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const AGENT_BASE = Deno.env.get('CATASTO_API_URL') || 'http://80.211.24.114:8001';

Deno.serve(async (req) => {
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
      const res = await fetch(primaryUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.parcels?.length) {
          const p = data.parcels[0];
          console.log(`[lookupParcelByCoords] OK (Aruba): foglio=${p.foglio} part=${p.particella} comune_code=${p.comune_code}`);
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
          });
        }
        // found=false → nessuna particella in questa posizione nella nostra DB
        console.log('[lookupParcelByCoords] Aruba: nessuna particella trovata (not in coverage)');
        return Response.json({ found: false });
      }
      console.warn(`[lookupParcelByCoords] Aruba HTTP ${res.status} — fallback Catastomappe`);
    } catch (primaryErr) {
      console.warn(`[lookupParcelByCoords] Aruba irraggiungibile (${primaryErr.message}) — fallback Catastomappe`);
    }

    // ── FALLBACK graceful ──────────────────────────────────────────────────
    // Il server Aruba ha risposto con HTTP error — nessuna altra fonte disponibile.
    // Restituiamo found:false per non interrompere il flusso dell'app.
    return Response.json({ found: false });

  } catch (error) {
    console.error('[lookupParcelByCoords] errore:', error.message);
    return Response.json({ found: false, error: error.message }, { status: 500 });
  }
});