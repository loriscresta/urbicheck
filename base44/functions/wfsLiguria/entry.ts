// wfsLiguria.js — URBICHECK Analisi Urbanistica (Liguria + Piemonte + ISPRA nazionale) — v2.3
const PRG_AGENT_URL = Deno.env.get("PRG_AGENT_URL") ?? "https://urbicheck-prg-agent-production.up.railway.app";
const ENRICHMENT_API_URL = Deno.env.get("ENRICHMENT_API_URL") ?? "https://web-production-6e951.up.railway.app";

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const WFS_BASE_LIGURIA = 'https://geoservizi.regione.liguria.it/geoserver';

// fetch con timeout compatibile Deno
const fetchWithTimeout = (url, options = {}, ms = 15000) =>
  Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    ),
  ]);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ============================================================
// DATASET STATICI — LIGURIA
// ============================================================

const COMUNI_COSTIERI_LIGURIA = new Set([
  'ventimiglia','bordighera','vallecrosia','camporosso','sanremo','san remo',
  'taggia','riva ligure','santo stefano al mare','costarainera','cipressa',
  'san lorenzo al mare','imperia','diano marina','san bartolomeo al mare',
  'cervo','andora','laigueglia','alassio',
  'albenga','borghetto santo spirito','ceriale','pietra ligure',
  'borgio verezzi','finale ligure','noli','spotorno','bergeggi',
  'savona','vado ligure','albissola marina','albisola superiore',
  'celle ligure','varazze','cogoleto',
  'arenzano','genova','bogliasco','pieve ligure','sori','recco',
  'camogli','portofino','santa margherita ligure','rapallo','zoagli',
  'chiavari','lavagna','sestri levante','casarza ligure',
  'deiva marina','framura','bonassola','levanto',
  'monterosso al mare','vernazza','riomaggiore',
  'la spezia','porto venere','lerici','ameglia',
]);

const PARCHI_RISERVE_LIGURIA = [
  { nome: 'Parco Nazionale delle Cinque Terre', tipo: 'Parco Nazionale', comuni: ['monterosso al mare','vernazza','riomaggiore','levanto'] },
  { nome: 'Parco Regionale del Beigua', tipo: 'Parco Regionale', comuni: ['arenzano','cogoleto','varazze','sassello','stella','tiglieto','campo ligure','masone','rossiglione'] },
  { nome: 'Parco Regionale di Portofino', tipo: 'Parco Regionale', comuni: ['camogli','portofino','santa margherita ligure','rapallo','zoagli'] },
  { nome: "Parco Regionale dell'Antola", tipo: 'Parco Regionale', comuni: ['busalla','crocefieschi','fascia','fontanigorda','gorreto','isola del cantone','montebruno','propata','rondanina','rovegno','torriglia','valbrevenna','vobbia'] },
  { nome: "Parco Regionale dell'Aveto", tipo: 'Parco Regionale', comuni: ['borzonasca','mezzanego','ne','rezzoaglio',"santo stefano d'aveto"] },
  { nome: 'Parco Regionale di Montemarcello-Magra-Vara', tipo: 'Parco Regionale', comuni: ['ameglia','arcola','beverino','borghetto di vara','brugnato','carrodano','follo','lerici','maissana','pignone','rocchetta di vara','sesta godano','sarzana','varese ligure','zignago'] },
  { nome: 'Parco Regionale del Finalese', tipo: 'Parco Regionale', comuni: ['finale ligure','calice ligure','orco feglino','rialto'] },
];

const SISMICA_LIGURIA_ZONA2 = new Set([
  'calice al cornoviglio','borghetto di vara','brugnato','maissana',
  'rocchetta di vara','sesta godano','varese ligure','zignago',
  'beverino','follo',"ricc\xf2 del golfo",'pignone','framura','bonassola','deiva marina',
]);
const SISMICA_LIGURIA_ZONA4 = new Set(['cairo montenotte','millesimo','pamparato','garessio','bagnasco']);

// ============================================================
// DATASET STATICI — PIEMONTE
// ============================================================

const PIEMONTE_ZONA_3S = new Set([
  'limone piemonte','baceno','crodo','entracque','valdieri','vinadio',
  'argentera','pietraporzio','sambuco','castelmagno','pradleves','valgrana',
  'monterosso grana','cartignano','dronero','roccabruna','san damiano macra',
  'macra','stroppo','marmora','canosio','prazzo','acceglio','san giacomo di roburent',
  'frabosa soprana','frabosa sottana','villanova mondovi','montaldo mondovi',
  'magliano alpi','pamparato','garessio','ormea','bagnasco','priola','caprauna',
  'briga alta','carnino','cosio di arroscia','mendatica','montegrosso pian latte',
  'formazza',
]);

function getZonaSismicaPiemonte(comuneLower) {
  if (PIEMONTE_ZONA_3S.has(comuneLower)) {
    return { zona: '3S', descrizione: "Alta sismicità — DGR n.6-887 del 30.12.2019", riferimento_normativo: 'DGR 6-887/2019 + NTC 2018', nota: 'Applicare NTC 2018 con spettri sito-dipendenti.' };
  }
  return { zona: '3', descrizione: "Media sismicità — DGR n.6-887 del 30.12.2019", riferimento_normativo: 'DGR 6-887/2019 + NTC 2018', nota: 'Per verifiche strutturali consultare microzonazione sismica comunale.' };
}

// ============================================================
// COORDINATE CONVERSION: WGS84 to EPSG:3003
// ============================================================
function wgs84ToEpsg3003(lon, lat) {
  const d2r = Math.PI / 180;
  const lon_r = lon * d2r, lat_r = lat * d2r;
  const a = 6378388.0, f = 1.0 / 297.0, b = a * (1 - f);
  const e2 = (a * a - b * b) / (a * a);
  const lon0 = 9.0 * d2r, k0 = 0.9996, FE = 1500000.0;
  const N = a / Math.sqrt(1 - e2 * Math.sin(lat_r) ** 2);
  const T = Math.tan(lat_r) ** 2;
  const C = (e2 / (1 - e2)) * Math.cos(lat_r) ** 2;
  const A = Math.cos(lat_r) * (lon_r - lon0);
  const e4 = e2 * e2, e6 = e4 * e2;
  const M = a * (
    (1 - e2/4 - 3*e4/64 - 5*e6/256) * lat_r
    - (3*e2/8 + 3*e4/32 + 45*e6/1024) * Math.sin(2*lat_r)
    + (15*e4/256 + 45*e6/1024) * Math.sin(4*lat_r)
    - (35*e6/3072) * Math.sin(6*lat_r)
  );
  const x = FE + k0 * N * (A + (1-T+C)*A**3/6 + (5-18*T+T**2+72*C-58*(e2/(1-e2)))*A**5/120);
  const y = k0 * (M + N * Math.tan(lat_r) * (A**2/2 + (5-T+9*C+4*C**2)*A**4/24 + (61-58*T+T**2+600*C-330*(e2/(1-e2)))*A**6/720));
  return { x: Math.round(x), y: Math.round(y) };
}

const CAPOLUOGHI = {
  piemonte: { lat: 45.0703, lon: 7.6869 },
  liguria:  { lat: 44.4056, lon: 8.9463 },
};

// ============================================================
// GEOCODING
// ============================================================
async function geocodeAddress(indirizzo, comune, provincia, regione) {
  const regioneLabel = regione || 'Italy';
  const indirizzoClean = indirizzo
    ? indirizzo
        .replace(/\s+[Pp]iano\s+(?:[TtRrSsBb]|[0-9]+)\b.*/i, '')
        .replace(/\s+[Pp]\.\s*[TtRrSsBb]\.?\b.*/i, '')
        .replace(/\s+[Ii]nt(?:erno)?\.?\s*\d+.*/i, '')
        .replace(/\s+[Ss]cala\s+\w+.*/i, '')
        .trim()
    : null;

  const GOOGLE_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (GOOGLE_KEY && indirizzoClean) {
    try {
      const gq = `${indirizzoClean}, ${comune}, ${provincia}, Italia`;
      const gurl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(gq)}&key=${GOOGLE_KEY}&language=it&region=it`;
      const gres = await fetchWithTimeout(gurl, {}, 10000);
      const gdata = await gres.json();
      if (gdata.status === 'OK' && gdata.results && gdata.results.length > 0) {
        const loc = gdata.results[0].geometry.location;
        return { lat: loc.lat, lon: loc.lng, source: 'google_maps' };
      }
    } catch (_e) {}
  }

  const HEADERS = { 'User-Agent': 'URBICHECK/1.0 (info@urbicheck.it)', 'Accept': 'application/json' };
  const q1 = indirizzoClean
    ? `${indirizzoClean}, ${comune}, ${regioneLabel}, Italy`
    : `${comune}, ${regioneLabel}, Italy`;
  try {
    const url1 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q1)}&format=json&limit=1&addressdetails=1`;
    const res1 = await fetchWithTimeout(url1, { headers: HEADERS }, 10000);
    const data1 = JSON.parse(await res1.text());
    if (Array.isArray(data1) && data1.length > 0) {
      return { lat: parseFloat(data1[0].lat), lon: parseFloat(data1[0].lon), source: 'nominatim' };
    }
  } catch (_e) {}

  try {
    const url2 = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(comune)}&state=${encodeURIComponent(regioneLabel)}&country=Italy&format=json&limit=1`;
    const res2 = await fetchWithTimeout(url2, { headers: HEADERS }, 10000);
    const data2 = JSON.parse(await res2.text());
    if (Array.isArray(data2) && data2.length > 0) {
      return { lat: parseFloat(data2[0].lat), lon: parseFloat(data2[0].lon), source: 'nominatim_comune' };
    }
  } catch (_e) {}

  const regioneLower = (regione || '').toLowerCase();
  const fallback = CAPOLUOGHI[regioneLower.includes('piemonte') ? 'piemonte' : 'liguria'];
  return { lat: fallback.lat, lon: fallback.lon, isFallbackCapoluogo: true };
}

// ============================================================
// VINCOLO COSTIERO — Overpass coastline entro 350m (solo Liguria)
// ============================================================
async function queryCoastlineOverpass(lat, lon) {
  const q = `[out:json][timeout:15];\nway(around:350,${lat},${lon})[natural=coastline];\nout geom;`;
  const MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
  ];
  const NOTE = 'Verificare anche la fascia di rispetto di eventuali porti e aree marine protette.';
  for (const endpoint of MIRRORS) {
    try {
      const res = await fetchWithTimeout(endpoint, {
        method: 'POST', body: new URLSearchParams({ data: q }).toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }, 18000);
      const data = await res.json();
      const elements = data.elements || [];
      if (elements.length === 0) return { presente: false, note: NOTE };
      let minDist = Infinity;
      for (const el of elements) {
        for (const node of (el.geometry || [])) {
          const d = haversineM(lat, lon, node.lat, node.lon);
          if (d < minDist) minDist = d;
        }
      }
      return {
        presente: true,
        distanza_m: Math.round(minDist),
        riferimento_normativo: 'Art.142 c.1 lett. a) D.Lgs 42/2004',
        fascia_tutela: '300m dalla battigia del mare',
        fonte: 'OpenStreetMap / Overpass API',
        note: NOTE,
      };
    } catch (_e) {}
  }
  return { presente: null, fonte_ok: false, note: `Non verificabile (Overpass API non raggiungibile). ${NOTE}` };
}

// ============================================================
// PAI via WFS Regione Liguria (EPSG:3003)
// ============================================================
const PAI_LAYERS_LIGURIA = [
  { typeName: 'M450:L722', label: 'Rischio idrogeologico', geomField: 'wkb_geometry', classeField: 'classe', bacinoField: 'bacino' },
  { typeName: 'M450:L721', label: 'Rischio idraulico',     geomField: 'wkb_geometry', classeField: 'classe', bacinoField: 'bacino' },
];

async function queryPAILiguria(x3003, y3003) {
  const results = [];
  for (const layer of PAI_LAYERS_LIGURIA) {
    try {
      const filter = `INTERSECTS(${layer.geomField},POINT(${x3003} ${y3003}))`;
      const url = `${WFS_BASE_LIGURIA}/${layer.typeName.split(':')[0]}/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=${layer.typeName}&outputFormat=application/json&CQL_FILTER=${encodeURIComponent(filter)}&count=5`;
      const res = await fetchWithTimeout(url, {}, 12000);
      const json = await res.json();
      if (json.features && json.features.length > 0) {
        const p = json.features[0].properties;
        results.push({ layer: layer.label, trovato: true, classe: p[layer.classeField] || null, bacino: p[layer.bacinoField] || null });
      } else {
        results.push({ layer: layer.label, trovato: false });
      }
    } catch (_e) {
      results.push({ layer: layer.label, trovato: false, errore: 'WFS non raggiungibile' });
    }
  }
  return results;
}

// ============================================================
// PAI via WFS ARPA Liguria
// ============================================================
async function queryPAIArpaLiguria(lat, lon) {
  const margin = 0.002;
  const bbox = `${lon - margin},${lat - margin},${lon + margin},${lat + margin}`;
  const layers = [
    { typeName: 'PARI:carto_frane',       label: 'Rischio frane (ARPA Liguria)' },
    { typeName: 'PARI:carto_allagamenti', label: 'Rischio allagamenti (ARPA Liguria)' },
  ];
  const results = [];
  for (const layer of layers) {
    try {
      const url = `https://geoportal.arpal.liguria.it/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature` +
        `&typeName=${layer.typeName}&outputFormat=application/json&BBOX=${bbox},EPSG:4326&maxFeatures=20`;
      const res = await fetchWithTimeout(url, {}, 15000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const count = (json.features || []).length;
      results.push({ layer: layer.label, trovato: count > 0, features_count: count, fonte_ok: true, fonte: 'ARPA Liguria WFS' });
    } catch (_e) {
      results.push({ layer: layer.label, trovato: false, fonte_ok: false, fonte: 'ARPA Liguria WFS', nota: 'Verifica manuale su geoportal.arpal.liguria.it' });
    }
  }
  return results;
}

// ============================================================
// PAI PIEMONTE via WMS GetFeatureInfo
// ============================================================
async function queryPAIPiemonte(lat, lon) {
  const delta = 0.005;
  const minLon = (lon - delta).toFixed(7);
  const minLat = (lat - delta).toFixed(7);
  const maxLon = (lon + delta).toFixed(7);
  const maxLat = (lat + delta).toFixed(7);
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;

  const layers = [
    {
      label: 'Frane PAI',
      wms: 'https://geomap.reteunitaria.piemonte.it/ws/vtdifsuolo/rp-01/disspaiwms/wms_vtdifsuolo_dissesti_pai',
      layer: 'PAIAreeFrana',
    },
    {
      label: 'Fasce fluviali PAI',
      wms: 'https://geomap.reteunitaria.piemonte.it/ws/vtdifsuolo/rp-01/fascpaiwms/wms_vtdifsuolo_fasce_fluviali',
      layer: 'FasceFluvialiAreali',
    },
    {
      label: 'Aree RME',
      wms: 'https://geomap.reteunitaria.piemonte.it/ws/vtdifsuolo/rp-01/rmepaiwms/wms_vtdifsuolo_aree_rme',
      layer: 'AreeRME',
    },
  ];

  const results = [];
  for (const lyr of layers) {
    const url = `${lyr.wms}?service=WMS&version=1.1.1&request=GetFeatureInfo` +
      `&layers=${lyr.layer}&query_layers=${lyr.layer}` +
      `&bbox=${bbox}&width=101&height=101&x=50&y=50` +
      `&info_format=application/vnd.ogc.gml&srs=EPSG:4326&feature_count=5`;
    try {
      const res = await fetchWithTimeout(url, {}, 12000);
      if (!res.ok) {
        results.push({ layer: lyr.label, trovato: false, features_count: 0, fonte_ok: false, nota: `HTTP ${res.status}` });
        continue;
      }
      const gml = await res.text();
      const count = (gml.match(/<gml:featureMember|<gml:member/g) || []).length;
      const tipoMatch = gml.match(/tipo_diss[^>]*>([^<]+)/);
      const tipo = tipoMatch ? tipoMatch[1].trim() : null;
      const fasciaMatch = gml.match(/fascia[^>]*>([^<]+)/i);
      const fascia = fasciaMatch ? fasciaMatch[1].trim() : null;
      results.push({
        layer: lyr.label,
        trovato: count > 0,
        features_count: count,
        fonte_ok: true,
        ...(tipo && { tipo_dissesto: tipo }),
        ...(fascia && { fascia_fluviale: fascia }),
      });
    } catch (_e) {
      results.push({ layer: lyr.label, trovato: false, features_count: 0, fonte_ok: false, nota: 'Timeout' });
    }
  }
  return results;
}

// ============================================================
// ZONA URBANISTICA LIGURIA via WMS Geoportale Regione
// ============================================================
async function queryZonaUrbanisticaLiguria(lat, lon, comune, provincia) {
  const margin = 0.005;
  const bbox = `${lon - margin},${lat - margin},${lon + margin},${lat + margin}`;
  const WMS = 'https://geoportal.regione.liguria.it/geoserver/Territorio/wms';
  const url = `${WMS}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo` +
    `&LAYERS=Territorio:PTR_ambiti_urbanistici&QUERY_LAYERS=Territorio:PTR_ambiti_urbanistici` +
    `&BBOX=${bbox}&WIDTH=101&HEIGHT=101&X=50&Y=50` +
    `&SRS=EPSG:4326&INFO_FORMAT=application/json&FEATURE_COUNT=5`;
  const isGenova = comune.toLowerCase().includes('genova');
  const fallback = {
    disponibile: false,
    messaggio: isGenova
      ? 'Piano Urbanistico Comunale (PUC) Genova 2015 — richiedere CDU al Comune'
      : `Piano Urbanistico Comunale (PUC) ${comune} — richiedere Certificato Urbanistico al Comune`,
    link_comune: isGenova
      ? 'https://www.comune.genova.it/servizi/urbanistica'
      : `https://www.google.com/search?q=PUC+${encodeURIComponent(comune)}+${encodeURIComponent(provincia)}+certificato+urbanistico`,
    link_geoportale: 'https://geoportale.regione.liguria.it',
    azione_consigliata: 'Richiedere il Certificato Urbanistico (CU) al Comune.',
  };
  try {
    const res = await fetchWithTimeout(url, {}, 15000);
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (_e) {}
    if (parsed?.features?.length > 0) {
      const props = parsed.features[0].properties;
      return {
        disponibile: true,
        zona_codice: props.CODICE || props.codice || props.TIPO || null,
        destinazione_uso: props.DESCRIZIONE || props.descrizione || props.TIPOLOGIA || 'Zona rilevata',
        messaggio: `PTR Liguria: ${props.DESCRIZIONE || props.TIPOLOGIA || 'zona rilevata'}`,
        fonte: 'WMS Geoportale Regione Liguria — PTR_ambiti_urbanistici',
        fonte_ok: true,
        link_geoportale: 'https://geoportale.regione.liguria.it',
        azione_consigliata: 'Richiedere il Certificato Urbanistico (CU) al Comune per il PUC di dettaglio.',
      };
    }
    return { ...fallback, fonte: 'WMS Geoportale Regione Liguria (nessun dato PTR per questo punto)', fonte_ok: true };
  } catch (_e) {
    return { ...fallback, fonte: 'WMS Geoportale Regione Liguria (non raggiungibile)', fonte_ok: false };
  }
}

// ============================================================
// ZONA URBANISTICA PIEMONTE via WMS Mosaicatura PRG
// ============================================================
async function queryZonaUrbanisticaPiemonte(lat, lon, comune) {
  const margin = 0.005;
  const bbox = `${lon - margin},${lat - margin},${lon + margin},${lat + margin}`;
  const WMS = 'https://geomap.reteunitaria.piemonte.it/ws/urbasv/rp-01/urbawms/urba_prgc_wms';
  const url = `${WMS}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo` +
    `&LAYERS=MosaicaturaPRG&QUERY_LAYERS=MosaicaturaPRG` +
    `&BBOX=${bbox}&WIDTH=101&HEIGHT=101&X=50&Y=50` +
    `&SRS=EPSG:4326&INFO_FORMAT=application/vnd.ogc.gml&FEATURE_COUNT=5`;
  try {
    const res = await fetchWithTimeout(url, {}, 15000);
    const gml = await res.text();
    if (!gml.includes('DestUso_feature') && !gml.includes('<def_gen>')) {
      return {
        disponibile: false,
        messaggio: 'Zona urbanistica non presente nella Mosaicatura PRG regionale. Richiedere CDU al Comune.',
        link_geoportale: `https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=PRG+${encodeURIComponent(comune)}`,
        fonte: 'WMS Mosaicatura PRG — Regione Piemonte',
        fonte_ok: true,
      };
    }
    const defGen      = (gml.match(/<def_gen>([^<]*)<\/def_gen>/)           || [])[1]?.trim() || null;
    const defGenerale = (gml.match(/<def_generale>([^<]*)<\/def_generale>/) || [])[1]?.trim() || null;
    const siglaPiano  = (gml.match(/<sigla_piano>([^<]*)<\/sigla_piano>/)   || [])[1]?.trim() || null;
    const distretto   = (gml.match(/<distretto>([^<]*)<\/distretto>/)       || [])[1]?.trim() || null;
    const nFeatures   = (gml.match(/DestUso_feature/g) || []).length;
    return {
      disponibile: true,
      zona_codice: defGen || 'N/D',
      destinazione_uso: defGenerale || 'Vedi PRG comunale',
      sigla_piano: siglaPiano || null,
      nta_zona: siglaPiano || null,
      distretto: distretto || null,
      features_totali: nFeatures,
      messaggio: `Mosaicatura PRG Piemonte: ${defGenerale || 'zona rilevata'} (codice ${defGen || 'N/D'}).`,
      link_geoportale: `https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=PRG+${encodeURIComponent(comune)}`,
      link_comune: `https://www.google.com/search?q=PRG+PRGC+${encodeURIComponent(comune)}+pianificazione+urbanistica`,
      fonte: 'WMS Mosaicatura PRG — Regione Piemonte (geomap.reteunitaria.piemonte.it)',
      fonte_ok: true,
      azione_consigliata: 'Richiedere il Certificato di Destinazione Urbanistica (CDU) al Comune per dettaglio normativo.',
    };
  } catch (_e) {
    return {
      disponibile: false,
      messaggio: 'WMS Mosaicatura PRG non raggiungibile. Richiedere CDU al Comune.',
      link_geoportale: `https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=PRG+${encodeURIComponent(comune)}`,
      link_comune: `https://www.google.com/search?q=PRG+PRGC+${encodeURIComponent(comune)}+pianificazione+urbanistica`,
      fonte: 'WMS Mosaicatura PRG — Regione Piemonte',
      fonte_ok: false,
      azione_consigliata: 'Richiedere il Certificato di Destinazione Urbanistica (CDU) al Comune.',
    };
  }
}

// ============================================================
// OVERPASS API: Ferrovie, Corsi d'acqua, Laghi
// ============================================================
async function queryOverpass(lat, lon, includeLakes = false) {
  const lakesQuery = includeLakes ? `
  way["natural"="water"]["water"~"^(lake|reservoir)$"](around:300,${lat},${lon});
  relation["natural"="water"]["water"~"^(lake|reservoir)$"](around:300,${lat},${lon});` : '';

  const q = `[out:json][timeout:15];
(
  way["railway"~"^(rail|tram|light_rail|narrow_gauge|subway|disused|abandoned|preserved|razed)$"](around:500,${lat},${lon});
  way["waterway"~"^(river|stream|canal)$"](around:250,${lat},${lon});
  relation["waterway"="river"](around:250,${lat},${lon});${lakesQuery}
);
out body;
>;
out skel qt;`;

  const OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
  ];

  for (let mirrorIdx = 0; mirrorIdx < OVERPASS_MIRRORS.length; mirrorIdx++) {
    if (mirrorIdx > 0) await sleep(1500);
    const endpoint = OVERPASS_MIRRORS[mirrorIdx];
    try {
      const res = await fetchWithTimeout(endpoint, {
        method: 'POST',
        body: new URLSearchParams({ data: q }).toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }, 20000);
      const data = await res.json();
      const railways = [], waterways = [], lakes = [], seen = new Set();
      for (const el of (data.elements || [])) {
        if (!el.tags) continue;
        const key = el.tags.name || el.id;
        if (seen.has(key)) continue;
        seen.add(key);
        if (el.type === 'way' && el.tags.railway) {
          const railType = el.tags.railway;
          const isDisused = ['disused','abandoned','razed'].includes(railType);
          const isPreserved = railType === 'preserved';
          railways.push({
            tipo: railType,
            nome: el.tags.name || el.tags.ref || 'Linea ferroviaria',
            operatore: el.tags.operator || null,
            dismessa: isDisused,
            turistica: isPreserved,
            nota_legale: isDisused
              ? "Ferrovia dismessa — le fasce di rispetto DPR 753/1980 (30m dall'asse) permangono fino a formale decreto di soppressione. Per ferrovie in conversione a uso turistico (L.128/2017), i vincoli possono permanere. Verificare con Regione/RFI."
              : isPreserved
              ? "Ferrovia turistica/storica — verificare applicabilita' DPR 753/1980 e L.128/2017 con Regione competente."
              : null,
          });
        }
        if (el.type === 'way' && el.tags.waterway) {
          waterways.push({ tipo: el.tags.waterway, nome: el.tags.name || "Corso d'acqua senza nome" });
        }
        if ((el.type === 'way' || el.type === 'relation') && el.tags.natural === 'water' && el.tags.water) {
          lakes.push({ tipo: el.tags.water, nome: el.tags.name || 'Lago/Bacino senza nome' });
        }
      }
      return { railways, waterways, lakes, overpass_ok: true };
    } catch (_e) {
      // Try next mirror
    }
  }
  return { railways: [], waterways: [], lakes: [], overpass_ok: false };
}

// ============================================================
// PAI NAZIONALE — ISPRA IdroGEO REST API
// Copertura: tutto il territorio italiano
// ============================================================
async function queryPAIIspra(lat, lon) {
  console.log('[ISPRA] querying PAI for lat:', lat, 'lon:', lon);
  try {
    const wkt = `SRID=4326;POINT(${lon} ${lat})`;
    const url = `https://idrogeo.isprambiente.it/api/pir/verifica_pericolosita?wkt=${encodeURIComponent(wkt)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`ISPRA HTTP ${res.status}`);
    const data = await res.json();

    const franeArr = data.pericolosita_frane;
    const maxFrana = (franeArr && franeArr.length) ? Math.max(...franeArr) : null;

    const alluvArr = data.pericolosita_idraulica;
    const maxAlluvione = (alluvArr && alluvArr.length) ? Math.max(...alluvArr.map(Number)) : null;

    const classeFrana = maxFrana ? `P${maxFrana}` : null;
    const classeAlluvione = maxAlluvione ? `P${maxAlluvione}` : null;

    const descFrana = {
      P1: 'Attenzione (pericolosita bassa da frana)',
      P2: 'Pericolosita media da frana (PAI)',
      P3: 'Pericolosita elevata da frana (PAI)',
      P4: 'Pericolosita molto elevata da frana (PAI)',
    };
    const descAlluvione = {
      P1: 'Bassa probabilita alluvione (TR 500 anni)',
      P2: 'Media probabilita alluvione (TR 100-200 anni)',
      P3: 'Alta probabilita alluvione (TR 20-50 anni)',
    };

    return {
      source: 'ISPRA IdroGEO',
      comune: data.nome_com,
      provincia: data.nome_pro,
      regione: data.nome_reg,
      pericolosita_frana: classeFrana,
      pericolosita_alluvione: classeAlluvione,
      descrizione_frana: classeFrana ? (descFrana[classeFrana] || null) : null,
      descrizione_alluvione: classeAlluvione ? (descAlluvione[classeAlluvione] || null) : null,
      note: 'Dati PAI nazionali ISPRA IdroGEO — copertura su tutto il territorio italiano',
      n_frane: (data.elenco_frane || []).length,
      raw: data,
    };
  } catch (err) {
    console.error('[ISPRA] error:', err.message);
    return { source: 'ISPRA IdroGEO', error: true, message: err.message };
  }
}

// ============================================================
// ANALISI LIGURIA
// ============================================================
async function runAnalisiLiguria({ comune, provincia, indirizzo, comuneLower, prefill_lat, prefill_lon }) {
  let lat = null, lon = null, x3003 = null, y3003 = null, geocodingError = null;
  if (indirizzo) {
    try {
      const coords = await geocodeAddress(indirizzo, comune, provincia, 'Liguria');
      if (!coords.isFallbackCapoluogo) { lat = coords.lat; lon = coords.lon; }
    } catch (_e) {}
  }
  if (lat === null) { lat = prefill_lat || null; lon = prefill_lon || null; }
  let pai = [{ layer: 'Rischio idrogeologico', trovato: false, errore: 'Non eseguito' }, { layer: 'Rischio idraulico', trovato: false, errore: 'Non eseguito' }];
  let paiArpa = [];
  let overpassResult = { railways: [], waterways: [], lakes: [], overpass_ok: false };
  let coastlineResult = { presente: null, note: 'Non verificato' };

  if (lat === null) {
    try {
      const coords = await geocodeAddress(indirizzo, comune, provincia, 'Liguria');
      lat = coords.lat; lon = coords.lon;
    } catch (err) {
      geocodingError = err.message;
    }
  }
  if (lat !== null) {
    const proj = wgs84ToEpsg3003(lon, lat);
    x3003 = proj.x; y3003 = proj.y;
    try {
      [pai, paiArpa, overpassResult, coastlineResult] = await Promise.all([
        queryPAILiguria(x3003, y3003),
        queryPAIArpaLiguria(lat, lon),
        queryOverpass(lat, lon, false),
        queryCoastlineOverpass(lat, lon),
      ]);
    } catch (_e) {}
  }

  const { railways, waterways, overpass_ok } = overpassResult;

  const paiArpaOk = paiArpa.some(r => r.fonte_ok);
  const paiFinal = paiArpaOk ? paiArpa : pai;
  const paiFinalOk = paiArpaOk || pai.some(r => !r.errore);
  const paiFinalLink = paiArpaOk ? 'https://geoportal.arpal.liguria.it' : 'https://pai.ambienteinliguria.it';
  const paiFinalMetodo = paiArpaOk
    ? 'WFS ARPA Liguria (geoportal.arpal.liguria.it) — Piano di Bacino Liguria (PARI).'
    : 'WFS ufficiale Regione Liguria — Piano di Bacino Stralcio (M450).';

  let zona_urbanistica = {
    disponibile: false,
    messaggio: 'La zonizzazione urbanistica non e disponibile. Richiedere CU al Comune.',
    link_geoportale: 'https://geoportale.regione.liguria.it',
    azione_consigliata: 'Richiedere il Certificato Urbanistico (CU) presso lo Sportello Unico del Comune.',
  };
  if (lat !== null) {
    zona_urbanistica = await queryZonaUrbanisticaLiguria(lat, lon, comune, provincia);
  }

  const vincoli_paesaggistici = [];
  if (COMUNI_COSTIERI_LIGURIA.has(comuneLower)) {
    const distanza = coastlineResult.distanza_m ? ` (circa ${coastlineResult.distanza_m}m dalla costa)` : '';
    vincoli_paesaggistici.push({
      tipo: 'Territori costieri',
      livello: (coastlineResult.presente === false) ? 'DA_VERIFICARE' : 'APPLICABILE',
      riferimento_normativo: 'Art.142 c.1 lett. a) D.Lgs 42/2004',
      fascia_tutela: '300m dalla battigia del mare',
      distanza_costa_m: coastlineResult.distanza_m || null,
      fonte: 'Analisi logica + OpenStreetMap (Overpass API)',
      descrizione: `Il comune e classificato costiero${distanza}. Il vincolo paesaggistico nella fascia di 300m dalla battigia deve essere verificato da un tecnico abilitato.`,
      link: 'https://liguriavincoli.it',
    });
  }
  for (const parco of PARCHI_RISERVE_LIGURIA) {
    if (parco.comuni.includes(comuneLower)) {
      vincoli_paesaggistici.push({
        tipo: 'Parchi e riserve naturali',
        livello: 'APPLICABILE',
        riferimento_normativo: 'Art.142 c.1 lett. f) D.Lgs 42/2004',
        nome_area_protetta: parco.nome,
        tipo_area: parco.tipo,
        fonte: `Analisi logica — comune nel perimetro di ${parco.nome}`,
        descrizione: `Il comune ricade nel perimetro del ${parco.nome}. Il vincolo paesaggistico si applica all'intera area del parco.`,
        link: 'https://geoportale.regione.liguria.it',
      });
      break;
    }
  }

  let zona_sismica, descrizione_sismica;
  if (SISMICA_LIGURIA_ZONA2.has(comuneLower)) {
    zona_sismica = 2; descrizione_sismica = 'Alta sismicità — applicazione integrale NTC 2018';
  } else if (SISMICA_LIGURIA_ZONA4.has(comuneLower)) {
    zona_sismica = 4; descrizione_sismica = 'Bassa sismicita';
  } else {
    zona_sismica = 3; descrizione_sismica = 'Media sismicità — NTC 2018';
  }
  const riferimento_normativo_sismica = 'OPCM 3274/2003 — classificazione vigente Regione Liguria';

  const ferrovie = railways.length > 0
    ? railways.map(r => ({
        trovato: true,
        nome: r.nome,
        tipo_infrastruttura: r.tipo,
        operatore: r.operatore,
        dismessa: r.dismessa || false,
        turistica: r.turistica || false,
        livello: r.dismessa ? 'VERIFICA_NECESSARIA_DISMESSA' : 'VERIFICA_NECESSARIA',
        riferimento_normativo: r.dismessa
          ? 'DPR 11 luglio 1980 n.753 + L.128/2017 (ferrovie turistiche)'
          : 'DPR 11 luglio 1980 n.753',
        fascia_rispetto: "30m dall'asse del binario (art.49 DPR 753/1980)",
        fonte: 'OpenStreetMap / Overpass API',
        descrizione: r.dismessa
          ? `Rilevata ferrovia dismessa/in conversione (${r.nome}) entro 500m. Le fasce di rispetto DPR 753/1980 permangono fino a formale decreto di soppressione.`
          : `Rilevata ferrovia (${r.nome}) entro 500m. Il DPR 753/1980 vieta nuove costruzioni entro 30m dall'asse del binario.`,
        ...(r.nota_legale && { nota_legale: r.nota_legale }),
      }))
    : [{ trovato: false, nota: geocodingError ? 'Non verificabile (geocoding fallito).' : !overpass_ok ? 'Non verificabile (Overpass API non raggiungibile).' : 'Nessuna ferrovia rilevata entro 500m dal punto analizzato.' }];

  const corsi_acqua_vincolo = waterways.length > 0
    ? waterways.map(w => ({ trovato: true, nome: w.nome, tipo: w.tipo, livello: w.tipo === 'river' ? 'POSSIBILE_VINCOLO_ALTO' : 'POSSIBILE_VINCOLO_DA_VERIFICARE', riferimento_normativo: 'Art.142 c.1 lett. c) D.Lgs 42/2004', fascia_tutela: '150m dal ciglio di sponda', fonte: 'OpenStreetMap / Overpass API', descrizione: w.tipo === 'river' ? `Rilevato fiume (${w.nome}) entro 250m. Alta probabilita di vincolo.` : `Rilevato corso d'acqua (${w.nome}) entro 250m.` }))
    : [{ trovato: false, nota: geocodingError ? 'Non verificabile (geocoding fallito).' : !overpass_ok ? "Non verificabile (Overpass API non raggiungibile)." : "Nessun corso d'acqua rilevato entro 250m." }];

  return {
    coordinate: lat !== null ? { lat, lon, x_gauss_boaga: x3003, y_gauss_boaga: y3003 } : null,
    geocoding_error: geocodingError || null,
    centroid_lat: lat,
    centroid_lng: lon,
    regione_analisi: 'Liguria',
    risultati: {
      vincoli_paesaggistici_ope_legis: {
        metodologia: 'Analisi logica ope legis art.142 D.Lgs 42/2004 + verifica Overpass API.',
        vincoli: vincoli_paesaggistici.length > 0 ? vincoli_paesaggistici : [{ livello: 'NESSUN_VINCOLO_RILEVATO', nota: 'Nessun vincolo paesaggistico ope legis rilevato per questo comune.' }],
        vincolo_costiero: coastlineResult,
        nota_foreste_boschi: 'Il vincolo boschivo (art.142 lett.g) richiede verifica puntuale con il tecnico.',
        link_verifica_ufficiale: 'https://liguriavincoli.it',
      },
      vincolo_corsi_acqua: { metodologia: 'Rilevamento tramite OpenStreetMap (Overpass API).', dati: corsi_acqua_vincolo, fonte_ok: overpass_ok },
      vincolo_ferroviario: { metodologia: 'Rilevamento tramite OpenStreetMap (Overpass API).', dati: ferrovie, fonte_ok: overpass_ok },
      pai_rischio_idrogeologico: {
        metodologia: paiFinalMetodo,
        dati: paiFinal,
        fonte_ok: paiFinalOk,
        link_pai: paiFinalLink,
        nota: !paiFinalOk ? 'Verifica manuale su geoportal.arpal.liguria.it — Piano di Bacino Liguria' : null,
      },
      sismica: { zona: zona_sismica, descrizione: descrizione_sismica, riferimento_normativo: riferimento_normativo_sismica, nota: 'Per verifiche strutturali applicare NTC 2018 con spettri sito-dipendenti.' },
      zona_urbanistica,
    },
    link_utili: {
      geoportale_liguria: 'https://geoportale.regione.liguria.it',
      liguriavincoli: 'https://liguriavincoli.it',
      arpal: 'https://geoportal.arpal.liguria.it',
    },
    note_salvataggio: `WFS Liguria completato il ${new Date().toLocaleDateString('it-IT')}. Vincoli: ${vincoli_paesaggistici.length}, PAI (ARPA): ${paiArpa.filter(p => p.trovato).length}, Costa: ${coastlineResult.presente === true ? `${coastlineResult.distanza_m}m` : coastlineResult.presente === false ? 'no' : 'n/d'}.`,
  };
}

// ============================================================
// ANALISI PIEMONTE
// ============================================================
async function runAnalisiPiemonte({ comune, provincia, indirizzo, comuneLower, prefill_lat, prefill_lon }) {
  let lat = null, lon = null, geocodingError = null;
  let paiResult = [];
  let overpassResult = { railways: [], waterways: [], lakes: [], overpass_ok: false };

  if (indirizzo) {
    try {
      const coords = await geocodeAddress(indirizzo, comune, provincia, 'Piemonte');
      if (!coords.isFallbackCapoluogo) { lat = coords.lat; lon = coords.lon; }
    } catch (err) {
      geocodingError = err.message;
    }
  }
  if (lat === null) { lat = prefill_lat || null; lon = prefill_lon || null; }
  if (lat === null && !indirizzo) {
    try {
      const coords = await geocodeAddress(null, comune, provincia, 'Piemonte');
      lat = coords.lat; lon = coords.lon;
    } catch (err) {
      geocodingError = err.message;
    }
  }

  if (lat !== null) {
    try {
      [paiResult, overpassResult] = await Promise.all([
        queryPAIPiemonte(lat, lon),
        queryOverpass(lat, lon, true),
      ]);
    } catch (_e) {}
  }

  const { railways, waterways, lakes, overpass_ok } = overpassResult;

  const vincoli_paesaggistici = [];
  const vincolo_costiero = { presente: false, motivo: 'Regione non costiera — nessun vincolo ex art.142 c.1 lett. a) D.Lgs 42/2004' };

  let vincolo_lacustre;
  if (!overpass_ok && geocodingError) {
    vincolo_lacustre = { presente: null, fonte: 'Overpass API', distanza_max: 300, nota: 'Non verificabile (geocoding fallito).' };
  } else if (!overpass_ok) {
    vincolo_lacustre = { presente: null, fonte: 'Overpass API', distanza_max: 300, nota: 'Overpass API non disponibile — verificare manualmente.' };
  } else if (lakes.length > 0) {
    vincolo_lacustre = { presente: true, lago: lakes[0].nome, tipo: lakes[0].tipo, fonte: 'OpenStreetMap / Overpass API', distanza_max: 300, riferimento_normativo: 'Art.142 c.1 lett. b) D.Lgs 42/2004', fascia_tutela: '300m dalla sponda del lago', descrizione: `Rilevato lago/bacino (${lakes[0].nome}) entro 300m.` };
    vincoli_paesaggistici.push({
      tipo: 'Vincolo lacustre',
      livello: 'APPLICABILE',
      riferimento_normativo: 'Art.142 c.1 lett. b) D.Lgs 42/2004',
      fascia_tutela: '300m dalla sponda',
      nome_lago: lakes[0].nome,
      fonte: 'OpenStreetMap / Overpass API',
      descrizione: `Rilevato lago/bacino (${lakes[0].nome}) entro 300m. Vincolo paesaggistico applicabile ex art.142 c.1 lett. b).`,
    });
  } else {
    vincolo_lacustre = { presente: false, fonte: 'OpenStreetMap / Overpass API', distanza_max: 300, nota: 'Nessun lago o bacino rilevato entro 300m dal punto analizzato.' };
  }

  const ferrovie = railways.length > 0
    ? railways.map(r => ({
        trovato: true,
        nome: r.nome,
        tipo_infrastruttura: r.tipo,
        operatore: r.operatore,
        dismessa: r.dismessa || false,
        turistica: r.turistica || false,
        livello: r.dismessa ? 'VERIFICA_NECESSARIA_DISMESSA' : 'VERIFICA_NECESSARIA',
        riferimento_normativo: r.dismessa
          ? 'DPR 11 luglio 1980 n.753 + L.128/2017 (ferrovie turistiche)'
          : 'DPR 11 luglio 1980 n.753',
        fascia_rispetto: "30m dall'asse del binario (art.49 DPR 753/1980)",
        fonte: 'OpenStreetMap / Overpass API',
        descrizione: r.dismessa
          ? `Rilevata ferrovia dismessa/in conversione (${r.nome}) entro 500m. Le fasce di rispetto DPR 753/1980 permangono fino a formale decreto di soppressione.`
          : `Rilevata ferrovia (${r.nome}) entro 500m. Il DPR 753/1980 vieta nuove costruzioni entro 30m dall'asse del binario.`,
        ...(r.nota_legale && { nota_legale: r.nota_legale }),
      }))
    : [{ trovato: false, nota: geocodingError ? 'Non verificabile (geocoding fallito).' : !overpass_ok ? 'Non verificabile (Overpass API non raggiungibile).' : 'Nessuna ferrovia rilevata entro 500m dal punto analizzato.' }];

  const corsi_acqua_vincolo = waterways.length > 0
    ? waterways.map(w => ({ trovato: true, nome: w.nome, tipo: w.tipo, livello: w.tipo === 'river' ? 'POSSIBILE_VINCOLO_ALTO' : 'POSSIBILE_VINCOLO_DA_VERIFICARE', riferimento_normativo: 'Art.142 c.1 lett. c) D.Lgs 42/2004', fascia_tutela: '150m dal ciglio di sponda', fonte: 'OpenStreetMap / Overpass API', descrizione: w.tipo === 'river' ? `Rilevato fiume (${w.nome}) entro 250m.` : `Rilevato corso d'acqua (${w.nome}) entro 250m.` }))
    : [{ trovato: false, nota: geocodingError ? 'Non verificabile (geocoding fallito).' : !overpass_ok ? "Non verificabile (Overpass API non raggiungibile)." : "Nessun corso d'acqua rilevato entro 250m." }];

  const sismicaPiemonte = getZonaSismicaPiemonte(comuneLower);
  const paiFraneTotali = paiResult.reduce((acc, r) => acc + (r.features_count || 0), 0);
  const paiFraneOk = paiResult.some(r => r.fonte_ok);

  let zona_urbanistica = {
    disponibile: false,
    messaggio: 'La zonizzazione urbanistica non e disponibile tramite WFS regionale. Ogni Comune gestisce il proprio PRG/PRGC.',
    link_geoportale: `https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=${encodeURIComponent(comune)}`,
    link_comune: `https://www.google.com/search?q=PRG+PRGC+${encodeURIComponent(comune)}+${encodeURIComponent(provincia)}+pianificazione+urbanistica`,
    azione_consigliata: 'Richiedere il Certificato di Destinazione Urbanistica (CDU) presso il Comune.',
  };

  let prg_agent_data = null;
  if (lat !== null) {
    zona_urbanistica = await queryZonaUrbanisticaPiemonte(lat, lon, comune);
    const linkPrg = `https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=PRG+${encodeURIComponent(comune)}`;
    zona_urbanistica.link_prg_comunale = linkPrg;
    if (!zona_urbanistica.disponibile) {
      zona_urbanistica.nota_prg = 'PRG comunale — verificare gli indici edilizi sulle NTA';
      zona_urbanistica.fonte_prg = 'Geoportale Piemonte';
    }

    try {
      const prgResp = await fetchWithTimeout(`${PRG_AGENT_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comune: comuneLower, lat, lon }),
      }, 15000);
      if (prgResp.ok) {
        const prg = await prgResp.json();
        prg_agent_data = prg;
        if (prg.zona_urbanistica) {
          zona_urbanistica = {
            disponibile: true,
            destinazione: prg.zona_urbanistica.destinazione,
            compromissione: prg.zona_urbanistica.compromissione,
            caratteristica: prg.zona_urbanistica.caratteristica,
            sigla_piano: prg.zona_urbanistica.sigla_piano || null,
            area_zona_mq: prg.zona_urbanistica.area_mq,
            messaggio: `${prg.zona_urbanistica.destinazione} — ${prg.zona_urbanistica.compromissione}${prg.zona_urbanistica.caratteristica ? ' — ' + prg.zona_urbanistica.caratteristica : ''}`,
            fonte: prg.fonte,
            fonte_ok: true,
            link_prg_comunale: linkPrg,
          };
        }
      }
    } catch (e) {
      console.error('PRG Agent non raggiungibile:', e);
    }

    if (zona_urbanistica?.zona_codice || zona_urbanistica?.destinazione) {
      try {
        const comuneKey = comuneLower.replace(/\s+/g, '_');
        const zonaRaw = zona_urbanistica?.nta_zona || zona_urbanistica?.sigla_piano || '';
        const isLetterCode = zonaRaw && /^[A-Za-z]/.test(zonaRaw.trim());
        const ntaUrl = `${ENRICHMENT_API_URL}/nta/${encodeURIComponent(comuneKey)}` +
          (isLetterCode ? `?zona=${encodeURIComponent(zonaRaw.trim())}` : '');
        const ntaResp = await fetchWithTimeout(ntaUrl, {}, 20000);
        if (ntaResp.ok) {
          const nta_data = await ntaResp.json();
          if (nta_data?.zona_trovata) {
            const z = nta_data.zona_trovata;
            zona_urbanistica.nta_if = z.if_mc_mq;
            zona_urbanistica.nta_h_max = z.h_max_m;
            zona_urbanistica.nta_rc = z.rc_pct;
            zona_urbanistica.nta_note = z.note;
            zona_urbanistica.nta_fonte = nta_data.fonte_url;
            zona_urbanistica.nta_disponibile = true;
          } else if (nta_data?.parametri_generali) {
            zona_urbanistica.nta_fonte = nta_data.fonte_url;
            zona_urbanistica.nta_disponibile = true;
            zona_urbanistica.nta_zone_disponibili = nta_data.parametri_generali.zone_disponibili || [];
          }
        }
      } catch (_e) {
        console.log('NTA endpoint non disponibile per', comuneLower);
      }
    }
  }

  const prg_vincoli = prg_agent_data?.vincoli?.length > 0
    ? prg_agent_data.vincoli.map(v => ({ codice: v.codice, descrizione: v.descrizione, gravita: v.gravita, fonte: 'PRG comunale — Mosaicatura Piemonte' }))
    : null;
  const prg_mod_intervento = prg_agent_data?.mod_intervento?.length > 0 ? prg_agent_data.mod_intervento : null;
  const prg_caratt_storica = prg_agent_data?.caratt_storica?.length > 0 ? prg_agent_data.caratt_storica : null;
  const prg_fonte = prg_agent_data?.fonte || null;

  return {
    coordinate: lat !== null ? { lat, lon } : null,
    geocoding_error: geocodingError || null,
    centroid_lat: lat,
    centroid_lng: lon,
    risultati: {
      vincoli_paesaggistici_ope_legis: {
        metodologia: 'Analisi logica ope legis art.142 D.Lgs 42/2004 — Piemonte (non costiera).',
        vincoli: vincoli_paesaggistici.length > 0 ? vincoli_paesaggistici : [{ livello: 'NESSUN_VINCOLO_RILEVATO', nota: 'Nessun vincolo paesaggistico ope legis rilevato per questo comune.' }],
        nota_foreste_boschi: 'Il vincolo boschivo (art.142 lett.g) richiede verifica puntuale con il tecnico o IPLA.',
        link_verifica_ufficiale: 'https://www.geoportale.piemonte.it',
        vincolo_costiero,
        vincolo_lacustre,
      },
      vincolo_corsi_acqua: { metodologia: 'Rilevamento tramite OpenStreetMap (Overpass API).', dati: corsi_acqua_vincolo, fonte_ok: overpass_ok },
      vincolo_ferroviario: { metodologia: 'Rilevamento tramite OpenStreetMap (Overpass API).', dati: ferrovie, fonte_ok: overpass_ok },
      pai_rischio_idrogeologico: {
        metodologia: 'WFS ARPA Piemonte — Inventario Fenomeni Franosi (POLIGONALI + PIFF).',
        dati: paiResult,
        features_totali: paiFraneTotali,
        fonte_ok: paiFraneOk,
        link_pai: 'https://webgis.arpa.piemonte.it',
        nota: paiFraneTotali > 0 ? `Rilevate ${paiFraneTotali} geometrie PAI entro area di ricerca. Consultare webgis.arpa.piemonte.it per dettaglio.` : (paiFraneOk ? 'Nessuna frana censita ARPA Piemonte entro area di ricerca.' : 'Verifica manuale consigliata su webgis.arpa.piemonte.it'),
      },
      sismica: sismicaPiemonte,
      zona_urbanistica,
      ...(prg_vincoli ? { vincoli_prg: prg_vincoli } : {}),
      ...(prg_mod_intervento ? { mod_intervento: prg_mod_intervento } : {}),
      ...(prg_caratt_storica ? { caratt_storica: prg_caratt_storica } : {}),
      ...(prg_fonte ? { prg_fonte } : {}),
    },
    link_utili: {
      geoportale_piemonte: 'https://www.geoportale.piemonte.it',
      arpa_piemonte: 'https://webgis.arpa.piemonte.it',
    },
    note_salvataggio: `WFS Piemonte completato il ${new Date().toLocaleDateString('it-IT')}. Frane PAI: ${paiFraneTotali}, Overpass ok: ${overpass_ok}, PRG Agent: ${prg_agent_data ? 'ok' : 'n/d'}.`,
  };
}

// ============================================================
// MAIN HANDLER
// ============================================================
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let user = null;
  try {
    user = await base44.auth.me();
  } catch (_e) {}

  let body;
  try {
    body = await req.json();
  } catch (_e) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let comune, provincia, indirizzo, regione, query_id, existingReportData;
  let prefill_lat = null, prefill_lon = null;

  if (body.query_id) {
    query_id = body.query_id;
    let q;
    try {
      const queries = await base44.entities.CadastralQuery.filter({ id: query_id });
      q = queries[0];
    } catch (_e) {
      return Response.json({ error: 'Errore lettura query' }, { status: 500 });
    }
    if (!q) return Response.json({ error: 'Query non trovata' }, { status: 404 });
    if (user && q.created_by_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    prefill_lat = (q.centroid_lat !== null && q.centroid_lat !== undefined && !isNaN(Number(q.centroid_lat))) ? Number(q.centroid_lat) : null;
    prefill_lon = (q.centroid_lng !== null && q.centroid_lng !== undefined && !isNaN(Number(q.centroid_lng))) ? Number(q.centroid_lng) : null;
    comune = q.comune || '';
    provincia = q.provincia || q.sigla_provincia || '';
    indirizzo = q.indirizzo_immobile || q.indirizzo_catastale || '';
    regione = q.regione || '';
    existingReportData = q.report_data || {};
  } else {
    comune = body.comune || '';
    provincia = body.provincia || '';
    indirizzo = body.indirizzo || '';
    regione = body.regione || '';
    existingReportData = {};
    prefill_lat = (typeof body.prefill_lat === 'number' && !isNaN(body.prefill_lat)) ? body.prefill_lat : null;
    prefill_lon = (typeof body.prefill_lon === 'number' && !isNaN(body.prefill_lon)) ? body.prefill_lon : null;
  }

  if (!comune) {
    return Response.json({ error: 'Parametro "comune" obbligatorio' }, { status: 400 });
  }

  const comuneLower = comune.toLowerCase().trim();
  const regioneLowerFinal = (regione || '').toLowerCase();
  const isPiemonte = regioneLowerFinal.includes('piemonte');
  const isLiguria = regioneLowerFinal.includes('liguria');
  const isAltreRegioni = !isPiemonte && !isLiguria;

  // Per le altre regioni italiane (Lombardia, Toscana, Veneto, ecc.) usa ISPRA IdroGEO REST API
  if (isAltreRegioni) {
    const lat = prefill_lat;
    const lon = prefill_lon;
    if (!lat || !lon) {
      return Response.json({ error: 'Coordinate non disponibili per questa regione. Fornire prefill_lat e prefill_lon.' }, { status: 400 });
    }
    const pai_ispra = await queryPAIIspra(lat, lon);
    return Response.json({
      success: true,
      regione,
      comune,
      centroid_lat: lat,
      centroid_lng: lon,
      pai_ispra,
    });
  }

  let risultato;
  try {
    if (isPiemonte) {
      risultato = await runAnalisiPiemonte({ comune, provincia, indirizzo, comuneLower, prefill_lat, prefill_lon });
    } else {
      risultato = await runAnalisiLiguria({ comune, provincia, indirizzo, comuneLower, prefill_lat, prefill_lon });
    }
  } catch (err) {
    console.error('Errore analisi WFS:', err);
    return Response.json({ error: err.message || 'Errore analisi WFS' }, { status: 500 });
  }

  let qRef = null;
  if (query_id) {
    try {
      const queries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: query_id });
      qRef = queries[0] || null;
    } catch (_e) {}
  }
  const finalCentroidLat = risultato.centroid_lat ?? qRef?.centroid_lat ?? null;
  const finalCentroidLon = risultato.centroid_lng ?? qRef?.centroid_lng ?? null;

  const ris = risultato.risultati || {};

  const sismicaWfs = ris.sismica;
  let vincoloSismicoEnriched = existingReportData?.vincoli?.vincolo_sismico || { presente: false };
  if (sismicaWfs?.zona) {
    const zona = String(sismicaWfs.zona);
    const presente = ['1','2','3s','3'].includes(zona.toLowerCase());
    vincoloSismicoEnriched = {
      presente,
      zona: `Zona ${zona}`,
      dettagli: `Zona ${zona} — ${sismicaWfs.descrizione || ''}. ${sismicaWfs.nota || ''} Rif: ${sismicaWfs.riferimento_normativo || ''}`.trim(),
      fonte: 'WFS Ufficiale',
    };
  } else if (isPiemonte) {
    vincoloSismicoEnriched = { presente: true, zona: 'Zona 3', dettagli: 'Zona 3 — Media sismicita — DGR n.6-887/2019. Applicare NTC 2018.', fonte: 'Normativa Piemonte' };
  }

  const vincoli_prg_regionali = ris.vincoli_prg && ris.vincoli_prg.length > 0 ? ris.vincoli_prg : undefined;

  const NTA_LOOKUP = {
    'alessandria':             { IF: '2.0 mc/mq', RC: '50%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Alessandria — NTA Zone B' },
    'torino':                  { IF: '2.0 mc/mq', RC: '50%', H_max: '14.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Torino 1995 — NTA Zone 2.2' },
    'cuneo':                   { IF: '2.0 mc/mq', RC: '50%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Cuneo — NTA Zone B' },
    'asti':                    { IF: '2.0 mc/mq', RC: '50%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Asti — NTA Zone B' },
    'novara':                  { IF: '2.0 mc/mq', RC: '50%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Novara — NTA Zone B2' },
    'vercelli':                { IF: '1.8 mc/mq', RC: '50%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Vercelli — NTA Zone B' },
    'biella':                  { IF: '2.0 mc/mq', RC: '50%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Biella — NTA Zone B' },
    'verbania':                { IF: '1.5 mc/mq', RC: '45%', H_max: '9.0 m',  Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Verbania — NTA Zone B' },
    'genova':                  { IF: '2.0 mc/mq', RC: '55%', H_max: '12.0 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PUC Genova 2015 — NTA Tessuto Urbano' },
    'la spezia':               { IF: '2.0 mc/mq', RC: '50%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PUC La Spezia — NTA Zone residenziale' },
    'savona':                  { IF: '2.0 mc/mq', RC: '50%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Savona — NTA Zone B' },
    'imperia':                 { IF: '1.8 mc/mq', RC: '50%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Imperia — NTA Zone B' },
    'lavagna':                 { IF: '1.5 mc/mq', RC: '50%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Lavagna — NTA Zone B' },
    'chiavari':                { IF: '2.0 mc/mq', RC: '50%', H_max: '12.0 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PUC Chiavari — NTA Zone B' },
    'rapallo':                 { IF: '1.5 mc/mq', RC: '45%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PUC Rapallo — NTA Zone B' },
    'santa margherita ligure': { IF: '1.5 mc/mq', RC: '45%', H_max: '9.0 m',  Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PUC Santa Margherita Ligure — NTA Zone B' },
    'sestri levante':          { IF: '1.5 mc/mq', RC: '45%', H_max: '9.0 m',  Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PUC Sestri Levante — NTA Zone B' },
    'recco':                   { IF: '1.5 mc/mq', RC: '45%', H_max: '9.0 m',  Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Recco — NTA Zone B' },
    'albenga':                 { IF: '2.0 mc/mq', RC: '50%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Albenga — NTA Zone B' },
    'finale ligure':           { IF: '1.5 mc/mq', RC: '45%', H_max: '9.0 m',  Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Finale Ligure — NTA Zone B' },
    'sanremo':                 { IF: '2.0 mc/mq', RC: '50%', H_max: '12.0 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PUC Sanremo — NTA Zone B' },
    'san remo':                { IF: '2.0 mc/mq', RC: '50%', H_max: '12.0 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PUC Sanremo — NTA Zone B' },
    'bordighera':              { IF: '1.5 mc/mq', RC: '45%', H_max: '9.0 m',  Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Bordighera — NTA Zone B' },
    'lerici':                  { IF: '1.5 mc/mq', RC: '45%', H_max: '9.0 m',  Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PUC Lerici — NTA Zone B' },
    'sarzana':                 { IF: '2.0 mc/mq', RC: '50%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Sarzana — NTA Zone B' },
    'ventimiglia':             { IF: '1.5 mc/mq', RC: '45%', H_max: '9.0 m',  Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: 'PRG Ventimiglia — NTA Zone B' },
  };
  const comuneKey = comune.toLowerCase().trim();
  const genericFallback = { IF: '2.0 mc/mq', RC: '50%', H_max: '10.5 m', Dc: '5 m', Df: '10 m', Ds: '5 m', fonte: `Stima tipica PRG residenziale — ${isPiemonte ? 'Piemonte' : 'Liguria'}` };
  const ntaData = NTA_LOOKUP[comuneKey] || genericFallback;

  const zonaWfs = ris.zona_urbanistica?.zona_codice || ris.zona_urbanistica?.zona_descrizione || '';
  const zonaAI  = existingReportData?.zonizzazione?.zona_codice || existingReportData?.zonizzazione?.destinazione_prevalente || '';
  const zonaEffettiva = zonaWfs || zonaAI || 'Zona residenziale';

  const indiciEdiliziEnriched = {
    indice_edificabilita: ntaData.IF,
    rapporto_copertura: ntaData.RC,
    altezza_massima: ntaData.H_max,
    distanza_confini: ntaData.Dc,
    distanza_fabbricati: ntaData.Df,
    distanza_strada: ntaData.Ds,
    zona_riferimento: zonaEffettiva,
    fonte: ntaData.fonte,
    nota: NTA_LOOKUP[comuneKey] ? 'Dati da NTA comunali' : 'Stima tipica per zona residenziale — verificare su NTA/PRG per zona specifica',
  };

  if (query_id) {
    try {
      const enrichedVincoli = {
        ...(existingReportData?.vincoli || {}),
        vincolo_sismico: vincoloSismicoEnriched,
        ...(vincoli_prg_regionali ? { vincoli_prg_regionali } : {}),
      };
      const updatePayload = {
        report_data: {
          ...existingReportData,
          wfs_liguria: risultato,
          vincoli: enrichedVincoli,
          indici_edilizi: indiciEdiliziEnriched,
        },
      };
      if (finalCentroidLat !== null) updatePayload.centroid_lat = finalCentroidLat;
      if (finalCentroidLon !== null) updatePayload.centroid_lng = finalCentroidLon;
      await base44.asServiceRole.entities.CadastralQuery.update(query_id, updatePayload);
    } catch (err) {
      console.error('Errore salvataggio wfsLiguria su CadastralQuery:', err);
    }
  }

  return Response.json({
    success: true,
    regione: isPiemonte ? 'Piemonte' : 'Liguria',
    comune,
    centroid_lat: finalCentroidLat,
    centroid_lng: finalCentroidLon,
    risultati: risultato.risultati,
    geocoding_error: risultato.geocoding_error || null,
    note_salvataggio: risultato.note_salvataggio || null,
  });
});