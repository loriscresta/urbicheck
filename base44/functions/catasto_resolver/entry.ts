/**
 * catasto_resolver.js — URBICHECK
 *
 * STEP 1: Query parquet OnData via HTTP range requests (asyncBufferFromUrl)
 *   evita di caricare tutto il file (21-100MB) in memoria.
 *   Filtra per codice Belfiore + foglio + particella.
 *   Colonne posizionali: 0=id, 1=belfiore, 2=foglio(4dig), 3=particella, 4=x(microlon), 5=y(microlat)
 *
 * STEP 2: WFS AdE con bbox ±0.0002 intorno alle coordinate OnData
 *
 * STEP 3: Salva su CadastralQuery
 *
 * INPUT: { nome_comune, regione, foglio, particella, sezione?, codice_belfiore?, query_id? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { asyncBufferFromUrl, parquetReadObjects } from 'npm:hyparquet@1';
import { compressors } from 'npm:hyparquet-compressors@1';

const WFS_ADE_BASE = 'https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php';
const ONDATA_BASE = 'https://raw.githubusercontent.com/ondata/dati_catastali/main/S_0000_ITALIA/anagrafica';

// Mappa regione → file parquet OnData
const REGIONE_FILE = {
  'Piemonte': '01_Piemonte.parquet',
  'Valle d\'Aosta': '02_ValledAosta.parquet',
  "Valle D'Aosta": '02_ValledAosta.parquet',
  'Lombardia': '03_Lombardia.parquet',
  'Veneto': '05_Veneto.parquet',
  'Friuli-Venezia Giulia': '06_Friuli-VeneziaGiulia.parquet',
  'Friuli Venezia Giulia': '06_Friuli-VeneziaGiulia.parquet',
  'Liguria': '07_Liguria.parquet',
  'Emilia-Romagna': '08_Emilia-Romagna.parquet',
  'Emilia Romagna': '08_Emilia-Romagna.parquet',
  'Toscana': '09_Toscana.parquet',
  'Umbria': '10_Umbria.parquet',
  'Marche': '11_Marche.parquet',
  'Lazio': '12_Lazio.parquet',
  'Abruzzo': '13_Abruzzo.parquet',
  'Molise': '14_Molise.parquet',
  'Campania': '15_Campania.parquet',
  'Puglia': '16_Puglia.parquet',
  'Basilicata': '17_Basilicata.parquet',
  'Calabria': '18_Calabria.parquet',
  'Sicilia': '19_Sicilia.parquet',
  'Sardegna': '20_Sardegna.parquet',
};

const fetchWithTimeout = (url, opts = {}, ms = 20000) =>
  Promise.race([
    fetch(url, opts),
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms)),
  ]);

// ── STEP 1: Query OnData parquet via range requests ──
async function queryOnDataParquet(regioneFile, codiceBelfiore, foglio, particella) {
  const foglioNorm = String(foglio).padStart(4, '0');
  const particellaStr = String(particella);
  const particellaInt = parseInt(particellaStr, 10);
  const url = `${ONDATA_BASE}/${regioneFile}`;

  const file = await asyncBufferFromUrl({
    url,
    requestInit: { headers: { 'User-Agent': 'URBICHECK/1.0' } }
  });
  // Leggi solo le 6 colonne necessarie per ridurre memoria e fetch size
  const rows = await parquetReadObjects({
    file,
    compressors,
    columns: ['INSPIREID_LOCALID', 'comune', 'foglio', 'particella', 'x', 'y'],
    rowFilter: (row) => {
      const belf = String(row.comune || '').toUpperCase();
      return belf === codiceBelfiore || belf.startsWith(codiceBelfiore);
    },
  });

  const risultati = [];
  let debugFirstRow = null;

  for (const row of rows) {
    if (!debugFirstRow) {
      // Log first row safe (BigInt → string)
      debugFirstRow = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, typeof v === 'bigint' ? v.toString() : v])
      );
      console.log('Parquet columns:', JSON.stringify(Object.keys(debugFirstRow)));
      console.log('Parquet first row:', JSON.stringify(debugFirstRow));
    }

    // Struttura colonne posizionali: 0=id, 1=belfiore, 2=foglio(4dig), 3=particella, 4=x, 5=y
    // Colonne reali: INSPIREID_LOCALID, comune, foglio, particella, x, y
    const idField = String(row.INSPIREID_LOCALID || row.id || row.ID || row['0'] || '');
    const belfCol = String(row.comune || row.belfiore || row.COMUNE || row['1'] || '');
    const foglioCol = String(row.foglio || row.FOGLIO || row['2'] || '');
    const partCol = String(row.particella || row.PARTICELLA || row['3'] || '');
    const xRaw = row.x ?? row.X ?? row['4'];
    const yRaw = row.y ?? row.Y ?? row['5'];

    const xField = typeof xRaw === 'bigint' ? Number(xRaw) : Number(xRaw);
    const yField = typeof yRaw === 'bigint' ? Number(yRaw) : Number(yRaw);

    if (!idField || !isFinite(xField) || !isFinite(yField)) continue;

    // Filtra per belfiore (colonna "comune" contiene il codice Belfiore)
    const belfMatch = belfCol.toUpperCase() === codiceBelfiore.toUpperCase() ||
      belfCol.toUpperCase().startsWith(codiceBelfiore.toUpperCase());
    if (!belfMatch) continue;

    // Match foglio e particella
    const foglioMatch = foglioCol === foglioNorm || parseInt(foglioCol, 10) === parseInt(foglioNorm, 10);
    const partMatch = partCol === particellaStr || parseInt(partCol, 10) === particellaInt;
    if (!foglioMatch || !partMatch) continue;

    // Estrai sezione dall'id (INSPIREID_LOCALID): es "IT.AGE.PLA.G605B000800.507"
    // La sezione è il char subito dopo il belfiore nell'ultimo segmento dopo PLA.
    let sezione = '';
    const plaIdx = idField.toUpperCase().indexOf('.' + codiceBelfiore.toUpperCase());
    if (plaIdx !== -1) {
      const afterBelfiore = idField.slice(plaIdx + 1 + codiceBelfiore.length);
      if (afterBelfiore.length > 0 && isNaN(afterBelfiore[0])) sezione = afterBelfiore[0].toUpperCase();
    }

    risultati.push({ id: idField, sezione, lat: yField / 1_000_000, lon: xField / 1_000_000 });
  }

  return { risultati, debugFirstRow };
}

// ── STEP 2: WFS AdE con bbox precisa ──
async function searchWfsAde(lat, lon, codiceBelfiore, foglio, particella, sezione = '') {
  const foglioNorm = String(foglio).padStart(4, '0');
  const particellaStr = String(particella);
  const particellaInt = parseInt(particellaStr, 10);
  const delta = 0.0002;

  const bbox = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;
  const url = `${WFS_ADE_BASE}?language=ita&SERVICE=WFS&VERSION=2.0.0&TYPENAMES=CP:CadastralParcel&SRSNAME=urn:ogc:def:crs:EPSG::6706&BBOX=${bbox}&REQUEST=GetFeature&COUNT=20`;

  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'Accept': 'application/xml, text/xml', 'User-Agent': 'URBICHECK/1.0' }
    }, 15000);
    if (!res.ok) return null;
    const xml = await res.text();

    const featurePattern = /<CP:CadastralParcel[^>]*gml:id="([^"]*)"[^>]*>([\s\S]*?)<\/CP:CadastralParcel>/g;
    let match;
    let bestMatch = null;

    while ((match = featurePattern.exec(xml)) !== null) {
      const gmlId = match[1];
      const featureContent = match[2];

      const parts = gmlId.split('.');
      const lastPart = parts[parts.length - 1];
      const keyPart = parts[parts.length - 2] || '';

      const particMatch = lastPart === particellaStr || parseInt(lastPart, 10) === particellaInt;
      if (!particMatch) continue;
      if (!keyPart.toUpperCase().startsWith(codiceBelfiore.toUpperCase())) continue;

      const polygon = extractPolygon(featureContent);
      if (!polygon) continue;

      const hasFoglio = keyPart.includes(foglioNorm) || keyPart.includes(String(parseInt(foglioNorm, 10)));
      const hasSezione = !sezione || keyPart.toUpperCase().includes(sezione.toUpperCase());

      if (hasFoglio && hasSezione) { bestMatch = { geojson_polygon: polygon, inspire_id: gmlId }; break; }
      else if (!bestMatch && hasFoglio) { bestMatch = { geojson_polygon: polygon, inspire_id: gmlId }; }
    }

    return bestMatch;
  } catch (e) {
    console.warn('WFS AdE error:', e.message);
    return null;
  }
}

function extractPolygon(featureContent) {
  const m = featureContent.match(/<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/);
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

// ── MAIN ──
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let user;
  try { user = await base44.auth.me(); } catch (_e) {}
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch (_e) {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { nome_comune, regione, foglio, particella, sezione, codice_belfiore: belfioreDiretto, query_id, indirizzo_immobile } = body;

  if (!foglio || !particella) {
    return Response.json({ error: 'foglio e particella sono obbligatori' }, { status: 400 });
  }

  // Carica query record
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

  // ── Codice Belfiore ──
  let codiceBelfiore = belfioreDiretto || queryRecord?.codice_comune_catasto;
  if (!codiceBelfiore && nome_comune) {
    try {
      const results = await base44.entities.ComuneItalia.filter({ nome: nome_comune });
      for (const r of (results || [])) {
        const code = r.codice_belfiore || r.codice_catastale || r.belfiore;
        if (code) { codiceBelfiore = String(code).trim().toUpperCase(); break; }
      }
    } catch (_e) {}
  }
  if (!codiceBelfiore) {
    return Response.json({
      error: 'Codice Belfiore non trovato. Passa codice_belfiore nel payload (es. "G605").',
      hint: 'Trovalo su comuni-italiani.it'
    }, { status: 400 });
  }
  codiceBelfiore = String(codiceBelfiore).trim().toUpperCase();

  // ── File regionale ──
  const regioneName = regione || queryRecord?.regione || '';
  const regioneFile = REGIONE_FILE[regioneName] ||
    Object.entries(REGIONE_FILE).find(([k]) => k.toLowerCase().includes(regioneName.toLowerCase()))?.[1];

  if (!regioneFile) {
    return Response.json({
      error: `Regione "${regioneName}" non mappata. Passa regione nel payload.`,
      regioni_disponibili: Object.keys(REGIONE_FILE)
    }, { status: 400 });
  }

  // ── STEP 1: OnData parquet ──
  let sezioniTrovate = [], debugInfo = null;
  try {
    const result = await queryOnDataParquet(regioneFile, codiceBelfiore, foglio, particella);
    sezioniTrovate = result.risultati;
    debugInfo = result.debugFirstRow;
  } catch (e) {
    console.error('OnData error:', e.message);
    return Response.json({ error: 'Errore parquet OnData: ' + e.message, file: regioneFile }, { status: 500 });
  }

  if (!sezioniTrovate.length) {
    return Response.json({
      error: 'Particella non trovata nel dataset OnData',
      codice_belfiore: codiceBelfiore,
      file_regionale: regioneFile,
      debug_first_row: debugInfo,
      hint: `Verifica: ${codiceBelfiore} foglio ${String(foglio).padStart(4,'0')} part. ${particella}`
    }, { status: 404 });
  }

  // ── Scegli sezione ──
  // sezione può essere INSPIRE (1 char: A, B, C) o codice SISTER/AdE (2+ chars: PL, RM, NA)
  let rigaScelta = null;
  let sezioneSisterNonTrovata = false;

  if (sezione) {
    const sezUpper = sezione.toUpperCase().trim();
    if (sezUpper.length === 1) {
      // Sezione INSPIRE diretta — cerca match esatto
      const filtered = sezioniTrovate.filter(r => r.sezione.toUpperCase() === sezUpper);
      rigaScelta = filtered[0] || sezioniTrovate[0];
    } else {
      // Codice SISTER/AdE (2+ chars) — non esiste nel parquet INSPIRE, restituiamo tutte le opzioni
      const filtered = sezioniTrovate.filter(r => r.sezione.toUpperCase() === sezUpper);
      if (filtered.length) {
        rigaScelta = filtered[0];
      } else {
        // Non trovata esatta: segnala e restituisce tutte le opzioni per la scelta utente
        sezioneSisterNonTrovata = true;
      }
    }
  }

  // Se non c'è sezione o se la sezione era a 1 char senza match, usa prima riga
  if (!rigaScelta) rigaScelta = sezioniTrovate[0];

  // Se abbiamo più sezioni e un indirizzo, tentiamo geocoding per trovare quella più vicina
  if (sezioniTrovate.length > 1 && indirizzo_immobile && !sezioneSisterNonTrovata) {
    try {
      const geocodeQuery = encodeURIComponent(`${indirizzo_immobile}, ${nome_comune || queryRecord?.comune || ''}, Italy`);
      const geocodeRes = await fetchWithTimeout(`https://nominatim.openstreetmap.org/search?q=${geocodeQuery}&format=json&limit=1`, {
        headers: { 'User-Agent': 'URBICHECK/1.0' }
      }, 8000);
      if (geocodeRes.ok) {
        const geocodeData = await geocodeRes.json();
        if (geocodeData[0]) {
          const gLat = parseFloat(geocodeData[0].lat);
          const gLon = parseFloat(geocodeData[0].lon);
          // Trova la sezione più vicina all'indirizzo geocodificato
          let minDist = Infinity;
          for (const r of sezioniTrovate) {
            const d = Math.sqrt(Math.pow(r.lat - gLat, 2) + Math.pow(r.lon - gLon, 2));
            if (d < minDist) { minDist = d; rigaScelta = r; }
          }
          console.log(`Geocoding address match: sezione=${rigaScelta.sezione} dist=${minDist}`);
        }
      }
    } catch (geoErr) {
      console.warn('Geocoding fallito:', geoErr.message);
    }
  }

  // Se sezione SISTER non trovata e più opzioni disponibili: salva tutto e segnala all'utente
  if (sezioneSisterNonTrovata && sezioniTrovate.length > 0) {
    // Arricchisci le opzioni con reverse geocoding (best-effort)
    const opzioniArricchite = await Promise.all(sezioniTrovate.map(async (r) => {
      let zona = null;
      try {
        const revRes = await fetchWithTimeout(
          `https://nominatim.openstreetmap.org/reverse?lat=${r.lat}&lon=${r.lon}&format=json`,
          { headers: { 'User-Agent': 'URBICHECK/1.0' } }, 5000
        );
        if (revRes.ok) {
          const revData = await revRes.json();
          zona = revData.display_name?.split(',').slice(0, 2).join(',').trim() || null;
        }
      } catch (_e) {}
      return { ...r, zona };
    }));

    const catastoDataMulti = {
      sezioni_disponibili: opzioniArricchite,
      sezione_sister_cercata: sezione,
      selezione_richiesta: true,
      fonte: 'ondata_only',
      calcolato_il: new Date().toISOString(),
    };

    if (queryRecord) {
      try {
        await base44.entities.CadastralQuery.update(query_id, {
          report_data: { ...(queryRecord.report_data || {}), catasto_data: catastoDataMulti },
        });
      } catch (_e) {}
    }

    return Response.json({
      success: false,
      sezione_sister_non_trovata: true,
      sezione_cercata: sezione,
      opzioni: opzioniArricchite,
      messaggio: `Sezione "${sezione}" non trovata nel database INSPIRE. Trovate ${opzioniArricchite.length} posizioni per questa particella — l'utente deve selezionare quella corretta.`,
    });
  }

  const { lat, lon } = rigaScelta;
  console.log(`OnData OK: ${rigaScelta.id} lat=${lat} lon=${lon} sezione=${rigaScelta.sezione} (${sezioniTrovate.length} sezioni)`);

  // ── STEP 2: WFS AdE ──
  const wfsResult = await searchWfsAde(lat, lon, codiceBelfiore, foglio, particella, rigaScelta.sezione);

  const catasto_data = {
    lat,
    lon,
    geojson_polygon: wfsResult?.geojson_polygon || null,
    inspire_id: wfsResult?.inspire_id || rigaScelta.id,
    sezioni_disponibili: sezioniTrovate.map(r => ({ sezione: r.sezione, id: r.id, lat: r.lat, lon: r.lon })),
    fonte: wfsResult ? 'ondata+ade_wfs' : 'ondata_only',
    calcolato_il: new Date().toISOString(),
  };

  // ── STEP 3: Salva ──
  if (queryRecord) {
    try {
      await base44.entities.CadastralQuery.update(query_id, {
        centroid_lat: lat,
        centroid_lng: lon,
        geometry_geojson: wfsResult?.geojson_polygon || undefined,
        codice_comune_catasto: codiceBelfiore,
        fonte_dati_catastali: 'catastomappe',
        report_data: { ...(queryRecord.report_data || {}), catasto_data },
      });
    } catch (saveErr) {
      console.warn('Save error:', saveErr.message);
    }
  }

  return Response.json({ success: true, codice_belfiore: codiceBelfiore, file_regionale: regioneFile, catasto_data });
});