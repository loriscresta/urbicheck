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
 *   FIX: centroid_lat/lng aggiornato SOLO se WFS dà un poligono (dato accurato)
 *        oppure se il record non ha ancora coordinate — NON sovrascrivere con OnData-only
 *
 * INPUT: { nome_comune, regione, foglio, particella, sezione?, codice_belfiore?, query_id? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { asyncBufferFromUrl, parquetReadObjects } from 'npm:hyparquet@1';
import { compressors } from 'npm:hyparquet-compressors@1';

const WFS_ADE_BASE = 'https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/ows';
const WMS_ADE_BASE = 'https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows';
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
      debugFirstRow = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, typeof v === 'bigint' ? v.toString() : v])
      );
      console.log('Parquet columns:', JSON.stringify(Object.keys(debugFirstRow)));
      console.log('Parquet first row:', JSON.stringify(debugFirstRow));
    }

    const idField = String(row.INSPIREID_LOCALID || row.id || row.ID || row['0'] || '');
    const belfCol = String(row.comune || row.belfiore || row.COMUNE || row['1'] || '');
    const foglioCol = String(row.foglio || row.FOGLIO || row['2'] || '');
    const partCol = String(row.particella || row.PARTICELLA || row['3'] || '');
    const xRaw = row.x ?? row.X ?? row['4'];
    const yRaw = row.y ?? row.Y ?? row['5'];

    const xField = typeof xRaw === 'bigint' ? Number(xRaw) : Number(xRaw);
    const yField = typeof yRaw === 'bigint' ? Number(yRaw) : Number(yRaw);

    if (!idField || !isFinite(xField) || !isFinite(yField)) continue;

    const belfMatch = belfCol.toUpperCase() === codiceBelfiore.toUpperCase() ||
      belfCol.toUpperCase().startsWith(codiceBelfiore.toUpperCase());
    if (!belfMatch) continue;

    const foglioMatch = foglioCol === foglioNorm || parseInt(foglioCol, 10) === parseInt(foglioNorm, 10);
    const partMatch = partCol === particellaStr || parseInt(partCol, 10) === particellaInt;
    if (!foglioMatch || !partMatch) continue;

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

// ── STEP 2a: WMS GetFeatureInfo — usa subdomain WMS (diverso da WFS, meno protetto da Akamai) ──
async function searchWmsFeatureInfo(lat, lon) {
  // delta ~100m — piccolo per centrare bene il pixel sul centroide
  const delta  = 0.001;
  const minLat = (lat - delta).toFixed(7);
  const maxLat = (lat + delta).toFixed(7);
  const minLon = (lon - delta).toFixed(7);
  const maxLon = (lon + delta).toFixed(7);

  // WMS 1.3.0 + EPSG:4326: BBOX = minLat,minLon,maxLat,maxLon (asse lat prima)
  // I=128, J=128 → pixel centrale = nostro centroide
  const url = `${WMS_ADE_BASE}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo` +
    `&LAYERS=CP.CadastralParcel&QUERY_LAYERS=CP.CadastralParcel` +
    `&INFO_FORMAT=application%2Fjson` +
    `&I=128&J=128&WIDTH=256&HEIGHT=256` +
    `&CRS=EPSG:4326&BBOX=${minLat},${minLon},${maxLat},${maxLon}`;

  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        'Referer': 'https://geoportale.cartografia.agenziaentrate.gov.it/',
      }
    }, 15000);

    if (!res.ok) {
      console.warn(`WMS GetFeatureInfo HTTP ${res.status}`);
      return null;
    }

    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch (_e) {
      console.warn('WMS GetFeatureInfo non-JSON response (probabilmente XML/errore)');
      return null;
    }

    const features = data.features || [];
    if (!features.length) return null;

    // Il primo feature dovrebbe essere quello centrato — prendi quello con geometria
    const feature = features.find(f => f.geometry?.coordinates) || features[0];
    if (!feature?.geometry) return null;

    console.log('WMS GetFeatureInfo OK — feature:', feature.id, feature.properties?.label);
    return {
      geojson_polygon: feature.geometry,
      inspire_id: feature.id || feature.properties?.gml_id || feature.properties?.inspireId,
    };
  } catch (e) {
    console.warn('WMS GetFeatureInfo error:', e.message);
    return null;
  }
}

// ── STEP 2b: WFS AdE con bbox precisa — JSON output + browser headers ──
async function searchWfsAde(lat, lon, codiceBelfiore, foglio, particella, sezione = '') {
  const foglioNorm = String(foglio).padStart(4, '0');
  const particellaStr = String(particella);
  const particellaInt = parseInt(particellaStr, 10);
  const delta = 0.0015; // ~150m bbox

  const minLon = (lon - delta).toFixed(7);
  const minLat = (lat - delta).toFixed(7);
  const maxLon = (lon + delta).toFixed(7);
  const maxLat = (lat + delta).toFixed(7);

  // Usa endpoint standard ows + JSON + headers browser-like per evitare blocco Akamai
  const url = `${WFS_ADE_BASE}?service=WFS&version=2.0.0&request=GetFeature` +
    `&typeNames=CP:CadastralParcel&outputFormat=application%2Fjson` +
    `&BBOX=${minLon},${minLat},${maxLon},${maxLat},EPSG:4326&COUNT=30`;

  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        'Referer': 'https://geoportale.cartografia.agenziaentrate.gov.it/',
        'Origin': 'https://geoportale.cartografia.agenziaentrate.gov.it',
      }
    }, 15000);
    if (!res.ok) {
      console.warn(`WFS AdE HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const features = data.features || [];
    if (!features.length) return null;

    // Cerca la feature per foglio+particella nel campo label o nationalCadastralReference
    let matched = null;
    for (const f of features) {
      const label = String(
        f.properties?.label || f.properties?.LABEL ||
        f.properties?.nationalCadastralReference || ''
      ).toUpperCase();
      const pMatch = label.includes(`/${particellaStr}`) ||
        label.includes(`/${particellaStr.padStart(5, '0')}`) ||
        label === particellaStr;
      const fMatch = label.includes(`${foglioNorm}/`) ||
        label.includes(`${parseInt(foglioNorm, 10)}/`);
      if (pMatch && fMatch) { matched = f; break; }
      if (!matched && pMatch) matched = f;
    }

    // Fallback: feature più vicina al centroide
    if (!matched) {
      let minDist = Infinity;
      for (const f of features) {
        const ring = f.geometry?.coordinates?.[0];
        if (!ring?.length) continue;
        const cLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
        const cLon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
        const d = Math.hypot(cLat - lat, cLon - lon);
        if (d < minDist) { minDist = d; matched = f; }
      }
    }

    if (!matched) return null;
    return {
      geojson_polygon: matched.geometry,
      inspire_id: matched.id || matched.properties?.gml_id || matched.properties?.inspireId,
    };
  } catch (e) {
    console.warn('WFS AdE error:', e.message);
    return null;
  }
}

// ── Calcola centroide come baricentro del poligono GeoJSON ──
function calculatePolygonCentroid(geojson) {
  if (!geojson || geojson.type !== 'Polygon' || !geojson.coordinates?.[0]) return null;
  const ring = geojson.coordinates[0];
  if (!ring.length) return null;
  let sumLon = 0, sumLat = 0;
  for (const [lon, lat] of ring) { sumLon += lon; sumLat += lat; }
  return { lat: sumLat / ring.length, lon: sumLon / ring.length };
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

// ── Haversine distance in meters ──────────────────────────────────────────
function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Overpass API — ferrovie entro 200m (attive + storiche/turistiche) ─────────
async function checkRailwayVicinity(lat, lon) {
  const q = `[out:json][timeout:12];(way["railway"~"rail|narrow_gauge|tram|monorail|light_rail|subway|preserved"](around:200,${lat},${lon}););out body tags;>;out skel qt;`;
  try {
    const res = await fetchWithTimeout('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(q)}`,
    }, 12000);
    if (!res.ok) { console.warn('Overpass HTTP', res.status); return null; }
    const data = await res.json();
    const elements = data.elements || [];
    const nodes = {};
    for (const el of elements) { if (el.type === 'node') nodes[el.id] = el; }
    const ways = elements.filter(e => e.type === 'way');
    if (!ways.length) return { presente: false, ferrovia_attiva: null, ferrovia_storica: null };

    // Per ogni way: calcola distanza minima e categorizza
    let minDistAttiva = Infinity, minDistStorica = Infinity;
    let wayAttivaInfo = null, wayStoricaInfo = null;

    for (const way of ways) {
      const tags = way.tags || {};
      const usage = (tags.usage || '').toLowerCase();
      const preserved = tags['railway:preserved'] === 'yes' || tags.railway === 'preserved';
      const isTouristicOrPreserved = usage === 'tourism' || preserved;
      const isActive = !isTouristicOrPreserved && ['main', 'branch', 'regional', 'local', ''].includes(usage);

      let minDist = Infinity;
      for (const nid of (way.nodes || [])) {
        const n = nodes[nid];
        if (!n) continue;
        const d = haversineM(lat, lon, n.lat, n.lon);
        if (d < minDist) minDist = d;
      }
      if (!isFinite(minDist)) continue;

      const name = tags.name || tags['name:it'] || tags.official_name || null;

      if (isTouristicOrPreserved && minDist < minDistStorica) {
        minDistStorica = minDist;
        wayStoricaInfo = { distanza_m: Math.round(minDist), nome: name, usage, preserved };
      } else if (isActive && minDist < minDistAttiva) {
        minDistAttiva = minDist;
        wayAttivaInfo = { distanza_m: Math.round(minDist), usage };
      }
    }

    const ferrovia_attiva = wayAttivaInfo ? {
      presente: true,
      distanza_m: wayAttivaInfo.distanza_m,
      icon: '🚆',
      label: 'Ferrovia attiva nelle vicinanze',
      impatto: 'alto',
      dettagli: `Distanza: ${wayAttivaInfo.distanza_m}m. Rumore, vibrazioni, valore immobiliare potenzialmente ridotto.`,
      tipo: wayAttivaInfo.distanza_m <= 30 ? 'assoluta' : wayAttivaInfo.distanza_m <= 150 ? 'limitata' : 'oltre_fascia',
      legge: 'DPR 753/1980',
    } : null;

    const ferrovia_storica = wayStoricaInfo ? {
      presente: true,
      distanza_m: wayStoricaInfo.distanza_m,
      nome: wayStoricaInfo.nome,
      icon: '🚂',
      label: 'Ferrovia storica/turistica nelle vicinanze',
      impatto: 'lieve',
      dettagli: `Linea ferroviaria storica con servizio turistico — transiti limitati (pochi al giorno). Elemento caratteristico del territorio, può essere percepita come valore aggiunto dal punto di vista paesaggistico e turistico.`,
    } : null;

    return {
      presente: !!(ferrovia_attiva || ferrovia_storica),
      ferrovia_attiva,
      ferrovia_storica,
      // backward compat fields
      distanza_m: ferrovia_attiva?.distanza_m ?? ferrovia_storica?.distanza_m ?? null,
      tipo: ferrovia_attiva ? (ferrovia_attiva.tipo) : 'storica',
    };
  } catch (e) {
    console.warn('Overpass railway error:', e.message);
    return null;
  }
}

// ── Nominatim geocoding (fallback quando OnData non trova la particella) ────
async function geocodeAddress(indirizzo, comune, provincia) {
  const q = indirizzo
    ? `${indirizzo}, ${comune}, ${provincia || ''}, Italy`
    : `${comune}, ${provincia || ''}, Italy`;
  try {
    const res = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=it`,
      { headers: { 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)' } },
      8000
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), tipo: indirizzo ? 'indirizzo' : 'comune' };
  } catch (e) {
    console.warn('Nominatim error:', e.message);
    return null;
  }
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

  // ── Codice Belfiore + Regione da ComuneItalia ──
  let codiceBelfiore = belfioreDiretto || queryRecord?.codice_comune_catasto;
  let regione_da_db = '';
  if ((!codiceBelfiore || !regione) && nome_comune) {
    try {
      const results = await base44.entities.ComuneItalia.filter({ nome: nome_comune });
      for (const r of (results || [])) {
        if (!codiceBelfiore) {
          const code = r.codice_belfiore || r.codice_catastale || r.belfiore;
          if (code) codiceBelfiore = String(code).trim().toUpperCase();
        }
        if (!regione_da_db) regione_da_db = String(r.regione || r.region || r.nome_regione || '').trim();
        if (codiceBelfiore && regione_da_db) break;
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
  const regioneName = regione || queryRecord?.regione || regione_da_db || '';
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
    // Fix B — Nominatim fallback: salva centroid anche se OnData non trova la particella
    if (query_id && queryRecord) {
      // Nominatim fallback: salva centroid anche se OnData non trova la particella
      const indirizzoQ = queryRecord.indirizzo_catastale || queryRecord.indirizzo_immobile || null;
      const provinciaQ = queryRecord.provincia || null;
      const geoResult = await geocodeAddress(indirizzoQ, nome_comune || queryRecord.comune, provinciaQ);
      if (geoResult) {
        try {
          await base44.entities.CadastralQuery.update(query_id, {
            centroid_lat: geoResult.lat,
            centroid_lng: geoResult.lon,
          });
          console.log(`Nominatim fallback saved: lat=${geoResult.lat} lon=${geoResult.lon} tipo=${geoResult.tipo}`);
        } catch (_e) {}
      }
    }
    return Response.json({
      error: 'Particella non trovata nel dataset OnData',
      codice_belfiore: codiceBelfiore,
      file_regionale: regioneFile,
      debug_first_row: debugInfo,
      hint: `Verifica: ${codiceBelfiore} foglio ${String(foglio).padStart(4,'0')} part. ${particella}`
    }, { status: 404 });
  }

  // ── Scegli sezione ──
  let rigaScelta = null;
  let sezioneSisterNonTrovata = false;

  if (sezione) {
    const sezUpper = sezione.toUpperCase().trim();
    if (sezUpper.length === 1) {
      const filtered = sezioniTrovate.filter(r => r.sezione.toUpperCase() === sezUpper);
      rigaScelta = filtered[0] || sezioniTrovate[0];
    } else {
      const filtered = sezioniTrovate.filter(r => r.sezione.toUpperCase() === sezUpper);
      if (filtered.length) {
        rigaScelta = filtered[0];
      } else {
        sezioneSisterNonTrovata = true;
      }
    }
  }

  if (!rigaScelta) rigaScelta = sezioniTrovate[0];

  // Geocoding solo per scegliere fra sezioni multiple — NON modifica le coordinate finali
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

  // Se sezione SISTER non trovata e più opzioni: salva tutto e segnala all'utente
  if (sezioneSisterNonTrovata && sezioniTrovate.length > 0) {
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

  // ── STEP 2: Geometria — prova WMS GetFeatureInfo (subdomain WMS), poi WFS ──
  console.log('STEP 2: tentativo WMS GetFeatureInfo...');
  let wfsResult = await searchWmsFeatureInfo(lat, lon);
  if (wfsResult?.geojson_polygon) {
    console.log('WMS GetFeatureInfo: poligono ottenuto!');
  } else {
    console.log('WMS GetFeatureInfo: nessun poligono, provo WFS...');
    wfsResult = await searchWfsAde(lat, lon, codiceBelfiore, foglio, particella, rigaScelta.sezione);
  }

  // ── Centroide finale ──
  // Preferenza: baricentro poligono WFS (più accurato) > coordinate OnData (fallback)
  let finalLat = lat, finalLon = lon;
  let centroideFonte = 'ondata_only';
  if (wfsResult?.geojson_polygon) {
    const centroid = calculatePolygonCentroid(wfsResult.geojson_polygon);
    if (centroid) {
      finalLat = centroid.lat;
      finalLon = centroid.lon;
      centroideFonte = 'ade_wfs_baricentro';
    }
  }

  const catasto_data = {
    lat: finalLat,
    lon: finalLon,
    lat_ondata: lat,
    lon_ondata: lon,
    geojson_polygon: wfsResult?.geojson_polygon || null,
    inspire_id: wfsResult?.inspire_id || rigaScelta.id,
    sezioni_disponibili: sezioniTrovate.map(r => ({ sezione: r.sezione, id: r.id, lat: r.lat, lon: r.lon })),
    fonte: centroideFonte,
    calcolato_il: new Date().toISOString(),
  };

  // ── STEP 3: Salva ──
  if (queryRecord) {
    try {
      // Aggiorna centroid_lat/lng SE:
      //   1. il dato viene dal poligono WFS (baricentro accurato) — sovrascrive sempre
      //   2. il record non ha ancora coordinate impostate
      // NON sovrascrivere coordinate esistenti con dati OnData-only (meno precisi)
      const centroideGiaPresente = !!(queryRecord.centroid_lat && queryRecord.centroid_lng);
      const haCentroideWfs = centroideFonte === 'ade_wfs_baricentro';

      await base44.entities.CadastralQuery.update(query_id, {
        ...(haCentroideWfs || !centroideGiaPresente ? {
          centroid_lat: finalLat,
          centroid_lng: finalLon,
        } : {}),
        geometry_geojson: wfsResult?.geojson_polygon || undefined,
        codice_comune_catasto: codiceBelfiore,
        fonte_dati_catastali: 'catastomappe',
        // scrivi regione su DB se mancante (es. flusso visura) — serve a wfsLiguria
        ...(regioneName && !queryRecord.regione ? { regione: regioneName } : {}),
        report_data: { ...(queryRecord.report_data || {}), catasto_data },
      });
    } catch (saveErr) {
      console.error('CadastralQuery update error:', saveErr.message);
    }
  }

  // Fix D — Overpass: verifica vincolo ferroviario
  let vincoloFerroviaRelevato = null;
  try {
    vincoloFerroviaRelevato = await checkRailwayVicinity(finalLat, finalLon);
    if (vincoloFerroviaRelevato) {
      console.log(`Railway check: presente=${vincoloFerroviaRelevato.presente} dist=${vincoloFerroviaRelevato.distanza_m}m tipo=${vincoloFerroviaRelevato.tipo}`);
      if (query_id && queryRecord) {
        await base44.entities.CadastralQuery.update(query_id, {
          report_data: {
            ...(queryRecord.report_data || {}),
            catasto_data,
            vincolo_ferroviario: vincoloFerroviaRelevato,
          },
        });
      }
    }
  } catch (e) {
    console.warn('Railway check failed:', e.message);
  }

  return Response.json({
    success: true,
    lat: finalLat,
    lon: finalLon,
    fonte: centroideFonte,
    inspire_id: wfsResult?.inspire_id || rigaScelta.id,
    sezioni: sezioniTrovate.length,
    wfs_polygon: !!wfsResult?.geojson_polygon,
    catasto_data,
    vincolo_ferroviario: vincoloFerroviaRelevato,
  });
});