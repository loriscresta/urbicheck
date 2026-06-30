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

// ── Overpass API — Railway (full categorization, regional awareness) ───────────
async function checkRailwayVicinity(lat, lon, regione = '') {
  const regioneLower = (regione || '').toLowerCase();
  const isLiguria = regioneLower.includes('liguria');

  // FIX: include disused/abandoned — ferrovia Asti-Alba turistica è taggata disused in OSM
  const q = `[out:json][timeout:15];(way["railway"~"rail|narrow_gauge|tram|light_rail|subway|preserved|monorail|disused|abandoned"](around:500,${lat},${lon}););out body tags;>;out skel qt;`;
  try {
    const res = await fetchWithTimeout('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(q)}`,
    }, 15000);
    if (!res.ok) { console.warn('Overpass railway HTTP', res.status); return null; }
    const data = await res.json();
    const elements = data.elements || [];
    const nodes = {};
    for (const el of elements) { if (el.type === 'node') nodes[el.id] = el; }
    const ways = elements.filter(e => e.type === 'way');
    if (!ways.length) return { presente: false };

    let bestAttiva = null, bestStorica = null, bestMetro = null, bestTram = null, bestDismessa = null;

    for (const way of ways) {
      const tags = way.tags || {};
      const railType = tags.railway || '';
      // Ferrovie dismesse/abbandonate — NON saltare, gestire separatamente con nota legale
      const isDismessa = ['disused', 'abandoned', 'razed'].includes(railType);
      if (railType === 'platform') continue; // Solo piattaforme, queste sì da saltare

      let minDist = Infinity;
      for (const nid of (way.nodes || [])) {
        const n = nodes[nid];
        if (!n) continue;
        const d = haversineM(lat, lon, n.lat, n.lon);
        if (d < minDist) minDist = d;
      }
      if (!isFinite(minDist)) continue;

      const distM = Math.round(minDist);
      const name = tags.name || tags['name:it'] || tags.official_name || null;
      const operator = tags.operator || tags['operator:it'] || null;
      const usage = (tags.usage || '').toLowerCase();
      const preserved = tags['railway:preserved'] === 'yes' || railType === 'preserved';

      if (railType === 'subway' || railType === 'monorail') {
        if (!bestMetro || distM < bestMetro.distanza_m)
          bestMetro = { distanza_m: distM, nome: name, operator };
      } else if (railType === 'tram' || railType === 'light_rail') {
        if (!bestTram || distM < bestTram.distanza_m)
          bestTram = { distanza_m: distM, nome: name, railType };
      } else if (isDismessa) {
        if (!bestDismessa || distM < bestDismessa.distanza_m)
          bestDismessa = { distanza_m: distM, nome: name, operator, railType, dismessa: true,
            nota_legale: 'Ferrovia dismessa/in conversione turistica — DPR 753/1980 (30m asse) può permanere. Verificare con Regione e RFI.' };
      } else if (railType === 'rail' || railType === 'narrow_gauge') {
        const isTouristicOrPreserved = usage === 'tourism' || preserved;
        if (isTouristicOrPreserved) {
          if (!bestStorica || distM < bestStorica.distanza_m)
            bestStorica = { distanza_m: distM, nome: name, operator };
        } else {
          if (!bestAttiva || distM < bestAttiva.distanza_m)
            bestAttiva = { distanza_m: distM, nome: name, usage };
        }
      }
    }

    const ferrovia_attiva = bestAttiva ? (() => {
      let dettagli = `Linea ferroviaria attiva nelle vicinanze. Possibile rumore, vibrazioni e impatto sul valore. Distanza: ${bestAttiva.distanza_m}m.`;
      if (isLiguria) dettagli += ' Nelle zone costiere liguri la linea ferroviaria principale può essere a pochi metri dalle abitazioni — verificare la distanza esatta.';
      return {
        presente: true,
        distanza_m: bestAttiva.distanza_m,
        icon: '🚆',
        label: 'Ferrovia attiva',
        impatto: 'alto',
        dettagli,
        tipo: bestAttiva.distanza_m <= 30 ? 'assoluta' : bestAttiva.distanza_m <= 150 ? 'limitata' : 'oltre_fascia',
        legge: 'DPR 753/1980',
      };
    })() : null;

    const ferrovia_storica = bestStorica ? {
      presente: true,
      distanza_m: bestStorica.distanza_m,
      nome: bestStorica.nome,
      icon: '🚂',
      label: 'Ferrovia storica/turistica',
      impatto: 'lieve',
      dettagli: 'Linea ferroviaria storica a uso turistico. Transiti molto limitati (poche corse al giorno, prevalentemente stagionali). Infrastruttura fisica presente ma rumore occasionale. Può rappresentare un elemento caratteristico e di interesse paesaggistico del territorio.',
      operatore: bestStorica.operator || null,
    } : null;

    const metro = bestMetro ? {
      presente: true,
      distanza_m: bestMetro.distanza_m,
      nome: bestMetro.nome,
      icon: '🚇',
      label: 'Metropolitana nelle vicinanze',
      impatto: 'medio',
      dettagli: `Linea metropolitana. Possibili vibrazioni, impatto variabile a seconda della profondità e della distanza. Distanza: ${bestMetro.distanza_m}m.`,
    } : null;

    const tram = bestTram ? {
      presente: true,
      distanza_m: bestTram.distanza_m,
      nome: bestTram.nome,
      icon: '🚊',
      label: bestTram.railType === 'light_rail' ? 'Ferrovia leggera' : 'Linea tranviaria',
      impatto: 'lieve_medio',
      dettagli: `Linea ${bestTram.railType === 'light_rail' ? 'ferroviaria leggera' : 'tranviaria'} nelle vicinanze. Distanza: ${bestTram.distanza_m}m.`,
    } : null;

    const ferrovia_dismessa = bestDismessa ? {
      presente: true,
      distanza_m: bestDismessa.distanza_m,
      nome: bestDismessa.nome,
      icon: '🚉',
      label: 'Ferrovia dismessa / in conversione turistica',
      impatto: 'medio',
      dettagli: `Rilevata ferrovia dismessa (${bestDismessa.nome || 'linea'}) a ${bestDismessa.distanza_m}m. Le fasce di rispetto DPR 753/1980 (30m dall'asse del binario, art.49) possono permanere anche dopo la dismissione, fino a formale decreto di soppressione. Per linee in conversione a uso turistico (L.128/2017 — ferrovie turistiche), i vincoli rimangono in vigore e il corridoio ferroviario è protetto. Verificare obbligatoriamente con Regione Piemonte e RFI.`,
      tipo: bestDismessa.distanza_m <= 30 ? 'assoluta' : bestDismessa.distanza_m <= 150 ? 'limitata_da_verificare' : 'oltre_fascia_da_verificare',
      legge: 'DPR 753/1980 + L.128/2017',
      nota_legale: bestDismessa.nota_legale,
    } : null;

    return {
      presente: !!(ferrovia_attiva || ferrovia_storica || ferrovia_dismessa || metro || tram),
      ferrovia_attiva,
      ferrovia_storica,
      ferrovia_dismessa,
      metro,
      tram,
      // backward compat
      distanza_m: ferrovia_attiva?.distanza_m ?? ferrovia_dismessa?.distanza_m ?? metro?.distanza_m ?? tram?.distanza_m ?? ferrovia_storica?.distanza_m ?? null,
      tipo: ferrovia_attiva ? ferrovia_attiva.tipo : ferrovia_dismessa ? 'dismessa_da_verificare' : 'nessuna',
    };
  } catch (e) {
    console.warn('Overpass railway error:', e.message);
    return null;
  }
}

// ── Overpass API — Waterways entro 300m (rischio idrico, consapevolezza regionale) ──
async function checkWaterwayVicinity(lat, lon, regione = '') {
  const regioneLower = (regione || '').toLowerCase();
  const isLiguria = regioneLower.includes('liguria');
  const isLombardia = regioneLower.includes('lombard');

  const q = `[out:json][timeout:15];(way["waterway"~"river|stream|canal|drain|ditch"](around:400,${lat},${lon});way["natural"="water"](around:400,${lat},${lon}););out body tags;>;out skel qt;`;
  try {
    const res = await fetchWithTimeout('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(q)}`,
    }, 15000);
    if (!res.ok) { console.warn('Overpass waterway HTTP', res.status); return null; }
    const data = await res.json();
    const elements = data.elements || [];
    const nodes = {};
    for (const el of elements) { if (el.type === 'node') nodes[el.id] = el; }
    const ways = elements.filter(e => e.type === 'way');
    if (!ways.length) return { presente: false, elementi: [] };

    const FOOTER = 'Per la valutazione definitiva del rischio idrogeologico consultare la Carta ISPRA e il PAI regionale.';
    const results = [];

    for (const way of ways) {
      const tags = way.tags || {};
      const waterwayType = tags.waterway || '';
      const naturalType = tags.natural || '';
      const name = tags.name || tags['name:it'] || null;

      let minDist = Infinity;
      for (const nid of (way.nodes || [])) {
        const n = nodes[nid];
        if (!n) continue;
        const d = haversineM(lat, lon, n.lat, n.lon);
        if (d < minDist) minDist = d;
      }
      if (!isFinite(minDist) || minDist > 400) continue;
      const distM = Math.round(minDist);

      if (waterwayType === 'river') {
        results.push({
          tipo: 'fiume', nome: name, distanza_m: distM,
          icon: '🌊', label: 'Fiume nelle vicinanze', impatto: 'alto',
          dettagli: `Corso d'acqua principale (fiume) entro ${distM}m. ${FOOTER}`,
        });
      } else if (waterwayType === 'stream') {
        if (isLiguria) {
          // ALL streams in Liguria = high risk (many ligure torrenti not tagged intermittent)
          results.push({
            tipo: 'torrente_ligure', nome: name, distanza_m: distM,
            icon: '⚠️', label: 'TORRENTE LIGURE — RISCHIO ALLUVIONALE ELEVATO', impatto: 'alto',
            dettagli: 'I torrenti liguri sono spesso in secca in estate ma soggetti a piene improvvise e violente. Verificare la Carta del Rischio Idrogeologico ISPRA e il Piano di Assetto Idrogeologico (PAI) della Regione Liguria prima dell\'acquisto.',
            link_pai: 'https://www.regione.liguria.it/homepage/territorio/difesa-del-suolo.html',
            footer: FOOTER,
          });
        } else {
          results.push({
            tipo: 'corso_acqua_minore', nome: name, distanza_m: distM,
            icon: '🏞️', label: 'Corso d\'acqua minore', impatto: 'medio',
            dettagli: `Torrente/corso d'acqua minore entro ${distM}m. ${FOOTER}`,
          });
        }
      } else if (waterwayType === 'canal') {
        const isNavigli = isLombardia;
        results.push({
          tipo: 'canale', nome: name, distanza_m: distM,
          icon: '🚢', label: 'Canale artificiale', impatto: isNavigli ? 'medio' : 'basso_medio',
          dettagli: isNavigli
            ? `Area Navigli — canale artificiale storico. Rischio esondazione verificare con ARPA Lombardia. ${FOOTER}`
            : `Canale artificiale entro ${distM}m. ${FOOTER}`,
        });
      } else if (waterwayType === 'drain' || waterwayType === 'ditch') {
        results.push({
          tipo: 'scolo', nome: name, distanza_m: distM,
          icon: 'ℹ️', label: 'Scolo/roggia presente', impatto: 'basso',
          dettagli: `Canale di drenaggio/roggia entro ${distM}m. Presenza informativa, non costituisce rischio idrogeologico primario. ${FOOTER}`,
        });
      } else if (naturalType === 'water') {
        results.push({
          tipo: 'specchio_acqua', nome: name, distanza_m: distM,
          icon: '🏔️', label: "Specchio d'acqua nelle vicinanze", impatto: 'basso',
          dettagli: `Lago/specchio d'acqua entro ${distM}m. Presenza informativa. ${FOOTER}`,
        });
      }
    }

    // Deduplicate by tipo, keep closest
    const seen = new Set();
    const elementi = results
      .sort((a, b) => a.distanza_m - b.distanza_m)
      .filter(r => { if (seen.has(r.tipo)) return false; seen.add(r.tipo); return true; });

    return {
      presente: elementi.length > 0,
      elementi,
      footer: FOOTER,
    };
  } catch (e) {
    console.warn('Overpass waterway error:', e.message);
    return null;
  }
}

// ── Google Maps Geocoding API ────────────────────────────────────────────────
async function geocodeAddress(indirizzo, comune, provincia) {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) {
    console.warn('[catasto_resolver] GOOGLE_MAPS_API_KEY not set');
    return null;
  }
  const q = indirizzo
    ? `${indirizzo}, ${comune}, Italy`
    : `${comune}, ${provincia || ''}, Italy`;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${apiKey}`;
    const res = await fetchWithTimeout(url, {}, 8000);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.[0]) return null;
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng, tipo: indirizzo ? 'indirizzo' : 'comune' };
  } catch (e) {
    console.warn('[catasto_resolver] Google Maps error:', e.message);
    return null;
  }
}

// ── MAIN ──
Deno.serve(async (req) => {
  console.log('CATASTO_REDEPLOY_MARKER_v3', new Date().toISOString());
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
      if (queryRecord && queryRecord.created_by_id !== user.id && user.role !== 'admin') {
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
    // Fix B — OnData non trovato: prova WFS diretto se abbiamo coordinate valide in DB
    // Le coordinate vengono dall'enrichment API (Google Maps) salvate da SearchPage
    // WFS AdE con quelle coordinate → restituisce il poligono esatto della particella
    const dbLat = queryRecord?.centroid_lat ? parseFloat(String(queryRecord.centroid_lat)) : null;
    const dbLon = queryRecord?.centroid_lng ? parseFloat(String(queryRecord.centroid_lng)) : null;
    if (query_id && queryRecord && dbLat && dbLon && !isNaN(dbLat) && !isNaN(dbLon)) {
      console.log(`OnData non trovato — provo WFS diretto con coord DB: ${dbLat},${dbLon}`);
      // Prova WMS GetFeatureInfo + WFS con cascade di BBOX crescenti
      for (const delta of [0.002, 0.008, 0.02]) {
        const wfsAttempt = await searchWfsAde(dbLat, dbLon, codiceBelfiore, foglio, particella, '');
        if (wfsAttempt?.geojson_polygon) {
          const centroid = calculatePolygonCentroid(wfsAttempt.geojson_polygon);
          const polyLat = centroid?.lat ?? dbLat;
          const polyLon = centroid?.lon ?? dbLon;
          const polyDist = haversineM(polyLat, polyLon, dbLat, dbLon);
          if (polyDist > 500) {
            console.log(`[catasto_resolver] WFS diretto scartato — baricentro a ${polyDist.toFixed(0)}m dal centroide`);
            // Salva solo coordinate senza poligono
            try {
              await base44.entities.CadastralQuery.update(query_id, {
                centroid_lat: polyLat,
                centroid_lng: polyLon,
                codice_comune_catasto: codiceBelfiore,
                fonte_dati_catastali: 'wfs_direct_validated',
              });
            } catch (_e) {}
            return Response.json({ success: true, lat: polyLat, lon: polyLon,
              fonte: 'wfs_direct', wfs_polygon: false, polygon_rejected: true });
          }
          const finalLat2 = polyLat;
          const finalLon2 = polyLon;
          console.log(`WFS diretto OK: centroide=${finalLat2},${finalLon2}`);
          try {
            await base44.entities.CadastralQuery.update(query_id, {
              centroid_lat: finalLat2,
              centroid_lng: finalLon2,
              geometry_geojson: wfsAttempt.geojson_polygon,
              codice_comune_catasto: codiceBelfiore,
              fonte_dati_catastali: 'wfs_direct',
            });
          } catch (_e) {}
          return Response.json({ success: true, lat: finalLat2, lon: finalLon2,
            fonte: 'wfs_direct', wfs_polygon: true, catasto_data: { lat: finalLat2, lon: finalLon2,
            geojson_polygon: wfsAttempt.geojson_polygon, fonte: 'wfs_direct', calcolato_il: new Date().toISOString() }
          });
        }
        if (delta < 0.02) await new Promise(r => setTimeout(r, 200));
      }
      console.log('WFS diretto fallito — uso coordinate DB come centroide');
    }
    // Nominatim fallback SOLO se non abbiamo coordinate valide in DB
    if (query_id && queryRecord && !queryRecord.centroid_lat && !queryRecord.centroid_lng) {
      const indirizzoQ = queryRecord.indirizzo_immobile || queryRecord.indirizzo_catastale || null;
      const siglaProv = queryRecord.sigla_provincia || null;
      const provinciaQ = siglaProv || queryRecord.provincia || null;
      const geoResult = await geocodeAddress(indirizzoQ, nome_comune || queryRecord.comune, provinciaQ);
      if (geoResult) {
        try {
          await base44.entities.CadastralQuery.update(query_id, {
            centroid_lat: geoResult.lat,
            centroid_lng: geoResult.lng,
          });
          console.log(`Google Maps fallback saved: lat=${geoResult.lat} lng=${geoResult.lng} tipo=${geoResult.tipo}`);
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
      await base44.entities.CadastralQuery.update(query_id, {
        centroid_lat: finalLat,
        centroid_lng: finalLon,
        geometry_geojson: wfsResult?.geojson_polygon || undefined,
        codice_comune_catasto: codiceBelfiore,
        fonte_dati_catastali: 'catastomappe',
        ...(regioneName && !queryRecord.regione ? { regione: regioneName } : {}),
        report_data: { ...(queryRecord.report_data || {}), catasto_data },
      });
    } catch (saveErr) {
      console.error('CadastralQuery update error:', saveErr.message);
    }

    // ── Google Maps geocoding dell'indirizzo reale — SEMPRE ──
    // geocoded_lat/lng = posizione reale dell'indirizzo (autorità primaria per la mappa)
    // centroid_lat/lng = centroide catastale da OnData/WFS (fallback)
    const indirizzoGeocode = queryRecord.indirizzo_immobile || queryRecord.indirizzo_catastale || null;
    const siglaProv = queryRecord.sigla_provincia || null;
    const provinciaGeo = siglaProv || queryRecord.provincia || null;
    if (indirizzoGeocode && queryRecord.comune) {
      try {
        const geoResult = await geocodeAddress(indirizzoGeocode, queryRecord.comune, provinciaGeo);
        if (geoResult) {
          await base44.entities.CadastralQuery.update(query_id, {
            geocoded_lat: geoResult.lat,
            geocoded_lng: geoResult.lng,
          });
          console.log(`[catasto_resolver] Google Maps geocoded: lat=${geoResult.lat} lng=${geoResult.lng} tipo=${geoResult.tipo}`);
        } else {
          console.log('[catasto_resolver] Google Maps geocoding failed — indirizzo non trovato');
        }
      } catch (geoErr) {
        console.warn('[catasto_resolver] Google Maps geocoding error:', geoErr.message);
      }
    }
  }

  // ── STEP 3b: Microservizio catastale interno — geometria mappale (HTTP, server-side) ──
  // Viene chiamato DOPO il salvataggio OnData/WFS per arricchire con il poligono del microservizio
  // se il WFS AdE non ha restituito geometria.
  if (query_id && queryRecord && !wfsResult?.geojson_polygon) {
    try {
      const agentBase = 'http://80.211.24.114:8001';
      const lookupUrl = `${agentBase}/parcel/lookup?comune=${encodeURIComponent(nome_comune || queryRecord.comune)}&foglio=${encodeURIComponent(foglio)}&particella=${encodeURIComponent(particella)}`;
      console.log(`[catasto_resolver] catasto_agent lookup: ${lookupUrl}`);
      const agentRes = await fetchWithTimeout(lookupUrl, {}, 10000);
      if (agentRes.ok) {
        const agentData = await agentRes.json();
        if (agentData.found && agentData.parcels?.length > 0) {
          const p = agentData.parcels[0];
          if (p.geometry) {
            const agentUpdate = {
              geometry_geojson: p.geometry,
              fonte_dati_catastali: 'catasto_agent',
            };
            if (p.centroid_lat != null) { agentUpdate.centroid_lat = p.centroid_lat; finalLat = p.centroid_lat; }
            if (p.centroid_lon != null) { agentUpdate.centroid_lng = p.centroid_lon; finalLon = p.centroid_lon; }
            if (p.comune_code) agentUpdate.codice_comune_catasto = p.comune_code;
            await base44.entities.CadastralQuery.update(query_id, agentUpdate);
            console.log(`[catasto_resolver] catasto_agent OK: comune_code=${p.comune_code}`);
            // Validazione distanza poligono agente
            const agentRing = p.geometry?.coordinates?.[0];
            let agentPolyOk = false;
            if (agentRing?.length > 2 && finalLat && finalLon) {
              const aLat = agentRing.reduce((s, c) => s + c[1], 0) / agentRing.length;
              const aLon = agentRing.reduce((s, c) => s + c[0], 0) / agentRing.length;
              const aDist = haversineM(aLat, aLon, finalLat, finalLon);
              if (aDist <= 500) agentPolyOk = true;
              else console.log(`[catasto_resolver] catasto_agent polygon rejected — ${aDist.toFixed(0)}m from centroid`);
            } else {
              agentPolyOk = true; // no reference to validate
            }
            if (agentPolyOk) {
              catasto_data.geojson_polygon = p.geometry;
            }
          }
        } else {
          console.log(`[catasto_resolver] catasto_agent: found=false`);
        }
      } else {
        console.warn(`[catasto_resolver] catasto_agent HTTP ${agentRes.status}`);
      }
    } catch (agentErr) {
      console.warn(`[catasto_resolver] catasto_agent error: ${agentErr.message}`);
    }

    // ── Retry geometria dopo 2s se ancora null ────────────────────────────────
    if (!wfsResult?.geojson_polygon) {
      await new Promise(r => setTimeout(r, 2000));
      console.log('[catasto_resolver] Retry geometria dopo 2s...');
      const retryWms = await searchWmsFeatureInfo(lat, lon);
      if (retryWms?.geojson_polygon) {
        wfsResult = retryWms;
        catasto_data.geojson_polygon = retryWms.geojson_polygon;
        await base44.entities.CadastralQuery.update(query_id, {
          geometry_geojson: retryWms.geojson_polygon,
          fonte_dati_catastali: 'catastomappe_retry',
        });
        console.log('[catasto_resolver] Retry WMS OK');
      } else {
        const retryWfs = await searchWfsAde(lat, lon, codiceBelfiore, foglio, particella, rigaScelta.sezione);
        if (retryWfs?.geojson_polygon) {
          wfsResult = retryWfs;
          catasto_data.geojson_polygon = retryWfs.geojson_polygon;
          await base44.entities.CadastralQuery.update(query_id, {
            geometry_geojson: retryWfs.geojson_polygon,
            fonte_dati_catastali: 'catastomappe_retry',
          });
          console.log('[catasto_resolver] Retry WFS OK');
        } else {
          // Secondo tentativo fallito — salva come completed con geometry_geojson null
          console.log('[catasto_resolver] Geometria non disponibile dopo retry');
          await base44.entities.CadastralQuery.update(query_id, {
            geometry_geojson: null,
            status: 'completed',
          });
        }
      }
    }
  }

  // Fix D — Overpass: verifica vincolo ferroviario e idrico (parallel)
  let vincoloFerroviaRelevato = null;
  let vincoloIdricoRilevato = null;
  try {
    [vincoloFerroviaRelevato, vincoloIdricoRilevato] = await Promise.all([
      checkRailwayVicinity(finalLat, finalLon, regioneName),
      checkWaterwayVicinity(finalLat, finalLon, regioneName),
    ]);
    console.log(`Railway: presente=${vincoloFerroviaRelevato?.presente} dist=${vincoloFerroviaRelevato?.distanza_m}m`);
    console.log(`Waterway: presente=${vincoloIdricoRilevato?.presente} elementi=${vincoloIdricoRilevato?.elementi?.length || 0}`);
    if (query_id && queryRecord) {
      await base44.entities.CadastralQuery.update(query_id, {
        report_data: {
          ...(queryRecord.report_data || {}),
          catasto_data,
          vincolo_ferroviario: vincoloFerroviaRelevato,
          vincolo_idrico: vincoloIdricoRilevato,
        },
      });
    }
  } catch (e) {
    console.warn('Overpass checks failed:', e.message);
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
    vincolo_idrico: vincoloIdricoRilevato,
  });
});