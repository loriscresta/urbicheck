// lookupParcelByCoords — trova foglio/particella da coordinate.
// PRIMARIO: server catastale (endpoint da env CATASTO_API_URL) — 20M+ particelle (Piemonte, Liguria, Lombardia).
// FALLBACK graceful: se il server è irraggiungibile o risponde con errore, restituisce found:false
//   senza interrompere il flusso (l'app resta funzionante).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const AGENT_BASE = 'https://catasto.urbicheck.it';
const WFS_ADE_BASE = 'https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php';

// ── Fallback WFS Agenzia Entrate (INSPIRE): il catasto-agent usa il Catasto Terreni,
//    vuoto sul costruito urbano; il WFS AdE contiene anche le particelle urbane. ──
function extractRing(content) {
  const m = content.match(/<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/);
  if (!m) return null;
  const nums = m[1].trim().split(/\s+/).map(Number).filter(n => isFinite(n));
  if (nums.length < 6) return null;
  const ring = [];
  for (let i = 0; i + 1 < nums.length; i += 2) ring.push([nums[i + 1], nums[i]]); // SRS 6706: posList = lat lon -> [lon,lat]
  return ring.length >= 3 ? ring : null;
}
function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function ringCentroid(ring) {
  let sx = 0, sy = 0;
  for (const [lo, la] of ring) { sx += lo; sy += la; }
  return { lon: sx / ring.length, lat: sy / ring.length };
}
function parseGmlId(gmlId) {
  const parts = gmlId.split('.');
  const particella = parts[parts.length - 1];
  const key = parts[parts.length - 2] || '';
  const belfiore = key.slice(0, 4).toUpperCase();
  const mf = key.match(/_(\d{4})/);
  const foglio = mf ? parseInt(mf[1], 10) : null;
  return { belfiore, foglio, particella };
}
async function wfsAdeLookup(lat, lon) {
  const featRe = /<CP:CadastralParcel[^>]*gml:id="([^"]+)"[^>]*>([\s\S]*?)<\/CP:CadastralParcel>/g;
  let best = null, bestDist = Infinity;
  // BBOX progressivo + retry: il WFS AdE è a volte intermittente e il geocode può cadere sulla strada.
  for (const d of [0.0008, 0.0018, 0.004]) {
    const bbox = `${lat - d},${lon - d},${lat + d},${lon + d}`;
    const url = `${WFS_ADE_BASE}?language=ita&SERVICE=WFS&VERSION=2.0.0&TYPENAMES=CP:CadastralParcel&SRSNAME=urn:ogc:def:crs:EPSG::6706&BBOX=${bbox}&REQUEST=GetFeature&COUNT=100`;
    let xml = null;
    for (let attempt = 0; attempt < 2 && !xml; attempt++) {
      try {
        const res = await fetch(url, { headers: { 'Accept': 'application/xml, text/xml', 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)' }, signal: AbortSignal.timeout(12000) });
        if (res.ok) xml = await res.text();
      } catch (_e) { /* retry sul WFS intermittente */ }
    }
    if (!xml) continue;
    featRe.lastIndex = 0;
    let m;
    while ((m = featRe.exec(xml)) !== null) {
      const ring = extractRing(m[2]);
      if (!ring) continue;
      const info = parseGmlId(m[1]);
      if (info.foglio == null) continue;
      // Scarta particelle non numeriche (STRADA/ACQUA): sono sedime stradale/acque, non mappali edificabili.
      // Senza questo, un punto geocodificato sulla via verrebbe agganciato alla particella-strada.
      if (!/^\d+$/.test(String(info.particella || ''))) continue;
      if (pointInRing(lon, lat, ring)) {
        return { ...info, ring, centroid: ringCentroid(ring), snapped: false, dist_m: 0 };
      }
      const c = ringCentroid(ring);
      const dist = Math.sqrt((c.lat - lat) ** 2 + (c.lon - lon) ** 2) * 111000;
      if (dist < bestDist) { bestDist = dist; best = { ...info, ring, centroid: c, snapped: true, dist_m: Math.round(dist) }; }
    }
    if (best && best.dist_m <= 45) break; // candidato vicino trovato: non serve allargare oltre
  }
  return (best && best.dist_m <= 45) ? best : null;
}

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

    let arubaResult = null;
    try {
      const res = await fetch(primaryUrl, { headers: { 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)', 'Accept': 'application/json', 'X-Api-Key': Deno.env.get('CATASTO_API_KEY') }, signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.parcels?.length) {
          const p = data.parcels[0];
          const isSnapped = data.snapped === true || p.snapped === true;
          const snapDistM = isSnapped ? Math.round(p.dist_m ?? 0) : null;
          console.log(`[lookupParcelByCoords] OK (Aruba): foglio=${p.foglio} part=${p.particella} snapped=${isSnapped} dist_m=${snapDistM}`);
          arubaResult = {
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
          };
          // Match ESATTO (punto dentro la particella) → usa subito.
          if (!isSnapped) return Response.json(arubaResult);
          // Agganciata per prossimità (rischio particella sbagliata, es. area a parcheggio):
          // prima provo il WFS AdE, che sul costruito urbano puo contenere ESATTAMENTE il punto.
          console.log('[lookupParcelByCoords] Aruba snapped — provo WFS AdE per match esatto');
        }
        // found=false → vuoto Catasto Terreni (tipico del costruito urbano): prosegui verso il WFS AdE
        console.log('[lookupParcelByCoords] catasto-agent: nessuna particella (Terreni) — provo WFS AdE');
      }
      console.warn(`[lookupParcelByCoords] Aruba HTTP ${res.status} — provo WFS AdE`);
    } catch (primaryErr) {
      console.warn(`[lookupParcelByCoords] catasto-agent non disponibile (${primaryErr.message}) — provo WFS AdE`);
    }

    // ── FALLBACK / MATCH ESATTO: WFS catastale Agenzia Entrate (INSPIRE) — copre il costruito urbano ──
    const w = await wfsAdeLookup(Number(lat), Number(lon));
    const wfsResponse = w ? {
      found: true,
      foglio: w.foglio,
      particella: String(w.particella),
      sezione: null,
      comune_code: w.belfiore,
      centroid_lat: w.centroid.lat,
      centroid_lon: w.centroid.lon,
      geometry_geojson: { type: 'Polygon', coordinates: [w.ring] },
      fonte: 'wfs_ade_inspire',
      snapped: w.snapped,
      snap_dist_m: w.snapped ? w.dist_m : null,
    } : null;

    // Preferenza: match ESATTO del WFS (punto DENTRO la particella) rispetto a una particella
    // agganciata per prossimita dall'Aruba (che sul Catasto Terreni puo puntare a parcheggi/aree limitrofe).
    if (wfsResponse && !w.snapped) {
      console.log(`[lookupParcelByCoords] WFS AdE match ESATTO: foglio=${w.foglio} part=${w.particella} (preferito allo snap Aruba)`);
      return Response.json(wfsResponse);
    }
    // Nessun match esatto WFS: usa il risultato Aruba (anche se agganciato) se presente.
    if (arubaResult) {
      console.log('[lookupParcelByCoords] nessun match esatto WFS — uso risultato Aruba (snapped)');
      return Response.json(arubaResult);
    }
    // Solo WFS (eventualmente agganciato) disponibile.
    if (wfsResponse) {
      console.log(`[lookupParcelByCoords] OK (WFS AdE${w.snapped ? ', snapped' : ''}): foglio=${w.foglio} part=${w.particella}`);
      return Response.json(wfsResponse);
    }

    return Response.json({ found: false });
  } catch (error) {
    console.error('[lookupParcelByCoords] errore:', error.message);
    return Response.json({ found: false, error: error.message }, { status: 500 });
  }
});