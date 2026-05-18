// wfsLiguria.js — URBICHECK Analisi Urbanistica (Liguria + Piemonte)
// Approccio ibrido: logica legale (vincoli ope legis) + WFS PAI + Overpass API (ferrovie/acque)

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WFS_BASE_LIGURIA = 'https://geoservizi.regione.liguria.it/geoserver';
const WFS_BASE_PIEMONTE = 'https://webgis.arpa.piemonte.it/geoserver';

// ── fetch con timeout compatibile Deno ──
const fetchWithTimeout = (url, options = {}, ms = 15000) =>
  Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    ),
  ]);

// ── sleep helper ──
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
  'beverino','follo',"riccò del golfo",'pignone','framura','bonassola','deiva marina',
]);
const SISMICA_LIGURIA_ZONA4 = new Set(['cairo montenotte','millesimo','pamparato','garessio','bagnasco']);

// ============================================================
// DATASET STATICI — PIEMONTE
// ============================================================

// Zona 3S = alta sismicità in Piemonte (DGR n.6-887 del 30.12.2019)
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
    return { zona: '3S', descrizione: 'Alta sismicita\' — DGR n.6-887 del 30.12.2019', riferimento_normativo: 'DGR 6-887/2019 + NTC 2018', nota: 'Applicare NTC 2018 con spettri sito-dipendenti.' };
  }
  return { zona: '3', descrizione: 'Media sismicita\' — DGR n.6-887 del 30.12.2019', riferimento_normativo: 'DGR 6-887/2019 + NTC 2018', nota: 'Per verifiche strutturali consultare microzonazione sismica comunale.' };
}

// ============================================================
// COORDINATE CONVERSION: WGS84 → EPSG:3003
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

// ============================================================
// GEOCODING
// ============================================================
async function geocodeAddress(indirizzo, comune, provincia, regione) {
  const regioneLabel = regione || 'Italy';
  // Pulisci l'indirizzo: rimuovi designatori di piano (Piano T, Piano R, Piano 1...) e interni
  // Es. "CORSO MONFERRATO n. 103 Piano T" → "CORSO MONFERRATO n. 103"
  const indirizzoClean = indirizzo
    ? indirizzo
        .replace(/\s+[Pp]iano\s+(?:[TtRrSsBb]|[0-9]+)\b.*/i, '')
        .replace(/\s+[Pp]\.\s*[TtRrSsBb]\.?\b.*/i, '')
        .replace(/\s+[Ii]nt(?:erno)?\.?\s*\d+.*/i, '')
        .replace(/\s+[Ss]cala\s+\w+.*/i, '')
        .trim()
    : null;
  const q = indirizzoClean
    ? `${indirizzoClean}, ${comune}, ${provincia}, ${regioneLabel}, Italy`
    : `${comune}, ${provincia}, ${regioneLabel}, Italy`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
  const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'URBICHECK/1.0 (info@urbicheck.it)' } }, 10000);
  const data = await res.json();
  if (!data.length) throw new Error(`Geocoding: nessun risultato per "${q}"`);
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
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
// PAI FRANE via WFS ARPA Piemonte (EPSG:4326 BBOX)
// ============================================================
async function queryPAIPiemonte(lat, lon) {
  const margin = 0.002;
  const bbox = `${lat - margin},${lon - margin},${lat + margin},${lon + margin}`;
  const layers = [
    { typeName: 'wfs_esterni:wfs_POLIGONALI', label: 'Frane poligonali' },
    { typeName: 'wfs_esterni:wfs_PIFF', label: 'Frane puntuali (PIFF)' },
  ];
  const TIMEOUTS = [5000, 10000, 15000];
  const results = [];
  for (const layer of layers) {
    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await sleep(2000);
      try {
        const url = `${WFS_BASE_PIEMONTE}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${layer.typeName}&outputFormat=application/json&BBOX=${bbox},EPSG:4326&maxFeatures=20`;
        const res = await fetchWithTimeout(url, {}, TIMEOUTS[attempt]);
        const json = await res.json();
        const count = (json.features || []).length;
        results.push({ layer: layer.label, trovato: count > 0, features_count: count, fonte_ok: true });
        success = true;
        break;
      } catch (_e) {
        // retry
      }
    }
    if (!success) {
      results.push({ layer: layer.label, trovato: false, features_count: 0, fonte_ok: false, errore: 'WFS ARPA Piemonte non raggiungibile dopo 3 tentativi — verificare PAI su webgis.arpa.piemonte.it' });
    }
  }
  return results;
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
  way["railway"~"^(rail|tram|light_rail|narrow_gauge|subway)$"](around:250,${lat},${lon});
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
        body: q,
        headers: { 'Content-Type': 'text/plain' },
      }, 20000);
      const data = await res.json();
      const railways = [], waterways = [], lakes = [], seen = new Set();
      for (const el of (data.elements || [])) {
        if (!el.tags) continue;
        const key = el.tags.name || el.id;
        if (seen.has(key)) continue;
        seen.add(key);
        if (el.type === 'way' && el.tags.railway) {
          railways.push({ tipo: el.tags.railway, nome: el.tags.name || el.tags.ref || 'Linea ferroviaria', operatore: el.tags.operator || null });
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
// ANALISI LIGURIA
// ============================================================
async function runAnalisiLiguria({ comune, provincia, indirizzo, comuneLower, prefill_lat, prefill_lon }) {
  let lat = prefill_lat || null, lon = prefill_lon || null, x3003 = null, y3003 = null, geocodingError = null;
  let pai = [{ layer: 'Rischio idrogeologico', trovato: false, errore: 'Non eseguito' }, { layer: 'Rischio idraulico', trovato: false, errore: 'Non eseguito' }];
  let overpassResult = { railways: [], waterways: [], lakes: [], overpass_ok: false };

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
      [pai, overpassResult] = await Promise.all([
        queryPAILiguria(x3003, y3003),
        queryOverpass(lat, lon, false),
      ]);
    } catch (_e) {}
  }

  const { railways, waterways, overpass_ok } = overpassResult;

  // Vincoli ope legis
  const vincoli_paesaggistici = [];
  if (COMUNI_COSTIERI_LIGURIA.has(comuneLower)) {
    vincoli_paesaggistici.push({
      tipo: 'Territori costieri',
      livello: 'APPLICABILE',
      riferimento_normativo: 'Art.142 c.1 lett. a) D.Lgs 42/2004',
      fascia_tutela: '300m dalla battigia del mare',
      fonte: 'Analisi logica — comune costiero',
      descrizione: "Il comune è classificato costiero. La legge impone il vincolo paesaggistico nella fascia di 300m dalla battigia. La distanza esatta del lotto dal mare deve essere verificata da un tecnico.",
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

  // Sismica
  let zona_sismica, descrizione_sismica, riferimento_normativo_sismica;
  if (SISMICA_LIGURIA_ZONA2.has(comuneLower)) {
    zona_sismica = 2; descrizione_sismica = "Alta sismicità — applicazione integrale NTC 2018"; riferimento_normativo_sismica = 'OPCM 3274/2003 — DGR Liguria 1362/2010';
  } else if (SISMICA_LIGURIA_ZONA4.has(comuneLower)) {
    zona_sismica = 4; descrizione_sismica = 'Bassa sismicità'; riferimento_normativo_sismica = 'OPCM 3274/2003 — DGR Liguria 1362/2010';
  } else {
    zona_sismica = 3; descrizione_sismica = 'Media sismicità — NTC 2018'; riferimento_normativo_sismica = 'OPCM 3274/2003 — DGR Liguria 1362/2010';
  }

  const ferrovie = railways.length > 0
    ? railways.map(r => ({ trovato: true, nome: r.nome, tipo_infrastruttura: r.tipo, operatore: r.operatore, livello: 'VERIFICA_NECESSARIA', riferimento_normativo: 'DPR 11 luglio 1980 n.753', fascia_rispetto: "30m dall'asse del binario (art.49)", fonte: 'OpenStreetMap / Overpass API', descrizione: `Rilevata ferrovia (${r.nome}) entro 250m. Il DPR 753/1980 vieta nuove costruzioni entro 30m dall'asse del binario.` }))
    : [{ trovato: false, nota: geocodingError ? 'Non verificabile (geocoding fallito).' : !overpass_ok ? 'Non verificabile (Overpass API non raggiungibile — verificare manualmente su openrailwaymap.org).' : 'Nessuna ferrovia rilevata entro 250m dal punto analizzato.' }];

  const corsi_acqua_vincolo = waterways.length > 0
    ? waterways.map(w => ({ trovato: true, nome: w.nome, tipo: w.tipo, livello: w.tipo === 'river' ? 'POSSIBILE_VINCOLO_ALTO' : 'POSSIBILE_VINCOLO_DA_VERIFICARE', riferimento_normativo: 'Art.142 c.1 lett. c) D.Lgs 42/2004', fascia_tutela: '150m dal ciglio di sponda', fonte: 'OpenStreetMap / Overpass API', descrizione: w.tipo === 'river' ? `Rilevato fiume (${w.nome}) entro 250m. Alta probabilità di vincolo. Verificare con Catasto delle Acque Regione Liguria.` : `Rilevato corso d'acqua (${w.nome}) entro 250m. Se iscritto nelle acque pubbliche, si applica il vincolo di 150m.` }))
    : [{ trovato: false, nota: geocodingError ? 'Non verificabile (geocoding fallito).' : !overpass_ok ? "Non verificabile (Overpass API non raggiungibile — verificare su liguriavincoli.it)." : "Nessun corso d'acqua rilevato entro 250m dal punto analizzato." }];

  const zona_urbanistica = {
    disponibile: false,
    messaggio: 'La zonizzazione urbanistica non è disponibile tramite WFS regionale. Ogni Comune gestisce il proprio PRG/PUC.',
    link_geoportale: `https://geoportale.regione.liguria.it/geonetwork/srv/ita/catalog.search#/search?any=${encodeURIComponent(comune)}`,
    link_comune: `https://www.google.com/search?q=PRG+PUC+${encodeURIComponent(comune)}+${encodeURIComponent(provincia)}+pianificazione+urbanistica`,
    azione_consigliata: 'Richiedere il Certificato Urbanistico (CU) presso lo Sportello Unico del Comune.',
  };

  return {
    coordinate: lat !== null ? { lat, lon, x_gauss_boaga: x3003, y_gauss_boaga: y3003 } : null,
    geocoding_error: geocodingError || null,
    centroid_lat: lat,
    centroid_lng: lon,
    risultati: {
      vincoli_paesaggistici_ope_legis: {
        metodologia: 'Analisi logica basata su classificazione del comune.',
        vincoli: vincoli_paesaggistici.length > 0 ? vincoli_paesaggistici : [{ livello: 'NESSUN_VINCOLO_RILEVATO', nota: 'Nessun vincolo paesaggistico ope legis rilevato per questo comune.' }],
        nota_foreste_boschi: 'Il vincolo boschivo (art.142 lett.g) richiede verifica puntuale con il tecnico.',
        link_verifica_ufficiale: 'https://liguriavincoli.it',
      },
      vincolo_corsi_acqua: { metodologia: 'Rilevamento tramite OpenStreetMap (Overpass API).', dati: corsi_acqua_vincolo, fonte_ok: overpass_ok },
      vincolo_ferroviario: { metodologia: 'Rilevamento tramite OpenStreetMap (Overpass API).', dati: ferrovie, fonte_ok: overpass_ok },
      pai_rischio_idrogeologico: { metodologia: 'WFS ufficiale Regione Liguria — Piano di Bacino Stralcio (M450).', dati: pai, link_pai: 'https://pai.ambienteinliguria.it' },
      sismica: { zona: zona_sismica, descrizione: descrizione_sismica, riferimento_normativo: riferimento_normativo_sismica, nota: 'Per verifiche strutturali applicare NTC 2018 con spettri sito-dipendenti.' },
      zona_urbanistica,
    },
    link_utili: {
      geoportale_liguria: 'https://geoportale.regione.liguria.it',
      liguriavincoli: 'https://liguriavincoli.it',
      pai: 'https://pai.ambienteinliguria.it',
    },
    note_salvataggio: `WFS Liguria completato il ${new Date().toLocaleDateString('it-IT')}. Vincoli: ${vincoli_paesaggistici.length}, PAI trovati: ${pai.filter(p => p.trovato).length}.`,
  };
}

// ============================================================
// ANALISI PIEMONTE
// ============================================================
async function runAnalisiPiemonte({ comune, provincia, indirizzo, comuneLower, prefill_lat, prefill_lon }) {
  let lat = prefill_lat || null, lon = prefill_lon || null, geocodingError = null;
  let paiResult = [];
  let overpassResult = { railways: [], waterways: [], lakes: [], overpass_ok: false };

  if (lat === null) {
    try {
      const coords = await geocodeAddress(indirizzo, comune, provincia, 'Piemonte');
      lat = coords.lat; lon = coords.lon;
    } catch (err) {
      geocodingError = err.message;
    }
  }

  if (lat !== null) {
    try {
      [paiResult, overpassResult] = await Promise.all([
        queryPAIPiemonte(lat, lon),
        queryOverpass(lat, lon, true), // includeLakes=true per Piemonte
      ]);
    } catch (_e) {}
  }

  const { railways, waterways, lakes, overpass_ok } = overpassResult;

  // ── Vincoli ope legis Piemonte ──
  const vincoli_paesaggistici = [];

  // Nessun vincolo costiero (Piemonte non ha costa)
  const vincolo_costiero = { presente: false, motivo: 'Regione non costiera — nessun vincolo ex art.142 c.1 lett. a) D.Lgs 42/2004' };

  // Vincolo lacustre (art.142 c.1 lett. b)
  let vincolo_lacustre;
  if (!overpass_ok && geocodingError) {
    vincolo_lacustre = { presente: null, fonte: 'Overpass API', distanza_max: 300, nota: 'Non verificabile (geocoding fallito).' };
  } else if (!overpass_ok) {
    vincolo_lacustre = { presente: null, fonte: 'Overpass API', distanza_max: 300, nota: 'Overpass API non disponibile — verificare manualmente.' };
  } else if (lakes.length > 0) {
    vincolo_lacustre = { presente: true, lago: lakes[0].nome, tipo: lakes[0].tipo, fonte: 'OpenStreetMap / Overpass API', distanza_max: 300, riferimento_normativo: 'Art.142 c.1 lett. b) D.Lgs 42/2004', fascia_tutela: '300m dalla sponda del lago', descrizione: `Rilevato lago/bacino (${lakes[0].nome}) entro 300m. Il D.Lgs. 42/2004 art.142 c.1 lett. b) impone il vincolo paesaggistico nella fascia di 300m dalla sponda. Verificare con la Soprintendenza competente.` };
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

  // Ferrovia
  const ferrovie = railways.length > 0
    ? railways.map(r => ({ trovato: true, nome: r.nome, tipo_infrastruttura: r.tipo, operatore: r.operatore, livello: 'VERIFICA_NECESSARIA', riferimento_normativo: 'DPR 11 luglio 1980 n.753', fascia_rispetto: "30m dall'asse del binario (art.49)", fonte: 'OpenStreetMap / Overpass API', descrizione: `Rilevata ferrovia (${r.nome}) entro 250m. Il DPR 753/1980 vieta nuove costruzioni entro 30m dall'asse del binario.` }))
    : [{ trovato: false, nota: geocodingError ? 'Non verificabile (geocoding fallito).' : !overpass_ok ? 'Non verificabile (Overpass API non raggiungibile — verificare manualmente su openrailwaymap.org).' : 'Nessuna ferrovia rilevata entro 250m dal punto analizzato.' }];

  // Corsi d'acqua
  const corsi_acqua_vincolo = waterways.length > 0
    ? waterways.map(w => ({ trovato: true, nome: w.nome, tipo: w.tipo, livello: w.tipo === 'river' ? 'POSSIBILE_VINCOLO_ALTO' : 'POSSIBILE_VINCOLO_DA_VERIFICARE', riferimento_normativo: 'Art.142 c.1 lett. c) D.Lgs 42/2004', fascia_tutela: '150m dal ciglio di sponda', fonte: 'OpenStreetMap / Overpass API', descrizione: w.tipo === 'river' ? `Rilevato fiume (${w.nome}) entro 250m. Alta probabilità di vincolo. Verificare con ARPA Piemonte.` : `Rilevato corso d'acqua (${w.nome}) entro 250m. Se iscritto nelle acque pubbliche, si applica il vincolo di 150m.` }))
    : [{ trovato: false, nota: geocodingError ? 'Non verificabile (geocoding fallito).' : !overpass_ok ? "Non verificabile (Overpass API non raggiungibile — verificare su geoportale.piemonte.it)." : "Nessun corso d'acqua rilevato entro 250m dal punto analizzato." }];

  // Sismica Piemonte
  const sismicaPiemonte = getZonaSismicaPiemonte(comuneLower);

  // PAI frane summary
  const paiFraneTotali = paiResult.reduce((acc, r) => acc + (r.features_count || 0), 0);
  const paiFraneOk = paiResult.some(r => r.fonte_ok);

  // ── WFS PRGC Geoportale Piemonte (CQL_FILTER per nome comune) ──
  let zona_urbanistica = {
    disponibile: false,
    messaggio: 'La zonizzazione urbanistica non è disponibile tramite WFS regionale. Ogni Comune gestisce il proprio PRG/PRGC.',
    link_geoportale: `https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=${encodeURIComponent(comune)}`,
    link_comune: `https://www.google.com/search?q=PRG+PRGC+${encodeURIComponent(comune)}+${encodeURIComponent(provincia)}+pianificazione+urbanistica`,
    azione_consigliata: 'Richiedere il Certificato di Destinazione Urbanistica (CDU) presso il Comune.',
  };

  if (lat !== null) {
    const comuneUpper = comune.toUpperCase();
    // Layers da provare in ordine: PRGC vigente, varianti PRG storico/alternativo
    const prgLayersToTry = [
      'PRGC:PRGC_VIGENTE',
      'PRGC:PRG_VIGENTE',
      'PRGC:STRALCIO_PRGC',
      'r_piemon:PRGC_VIGENTE',
    ];
    // Campi geometria possibili nei WFS Geoportale Piemonte
    const geomFields = ['geom', 'wkb_geometry', 'the_geom', 'SHAPE', 'geometry'];
    // Filtri per nome comune (fallback)
    const nomeFilters = [
      `NOME_COM='${comuneUpper}'`,
      `COMUNE='${comuneUpper}'`,
      `nome_com='${comuneUpper}'`,
    ];
    const wfsBase = `https://www.geoportale.piemonte.it/geoserver/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&outputFormat=application%2Fjson&COUNT=50`;

    outerPRG:
    for (const typeName of prgLayersToTry) {
      // 1. Prima prova: intersezione puntuale con le coordinate reali (più precisa)
      for (const gf of geomFields) {
        try {
          const filter = `INTERSECTS(${gf},POINT(${lon} ${lat}))`;
          const url = `${wfsBase}&TYPENAMES=${typeName}&CQL_FILTER=${encodeURIComponent(filter)}`;
          const res = await fetchWithTimeout(url, {}, 12000);
          if (!res.ok) continue;
          const j = await res.json();
          if (j.features && j.features.length > 0) {
            const feat = j.features[0].properties || {};
            const zonaCodice = feat.ZONA_URB || feat.DESTZONA || feat.zona_urb || feat.COD_ZONA || feat.CODICE || feat.CLASSE || null;
            const destinazione = feat.DESTZONA || feat.DESCR_ZONA || feat.DESCRIZIONE || feat.destinazione || feat.USO || null;
            zona_urbanistica = {
              disponibile: true,
              zona_codice: zonaCodice || 'Vedi PRG',
              destinazione_uso: destinazione || 'Verificare su PRG comunale',
              features_totali: j.features.length,
              messaggio: `Zonizzazione PRG/PRGC recuperata (layer: ${typeName}).`,
              link_geoportale: `https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=PRG+${encodeURIComponent(comune)}`,
              fonte: `WFS Geoportale Piemonte — ${typeName}`,
            };
            break outerPRG;
          }
        } catch (_e) {
          // prova campo geometria successivo
        }
      }
      // 2. Fallback: filtro per nome comune (compatibile con vecchi layer senza intersezione)
      for (const filter of nomeFilters) {
        try {
          const url = `${wfsBase}&TYPENAMES=${typeName}&CQL_FILTER=${encodeURIComponent(filter)}`;
          const res = await fetchWithTimeout(url, {}, 12000);
          if (!res.ok) continue;
          const j = await res.json();
          if (j.features && j.features.length > 0) {
            const feat = j.features[0].properties || {};
            const zonaCodice = feat.ZONA_URB || feat.DESTZONA || feat.zona_urb || feat.COD_ZONA || null;
            const destinazione = feat.DESTZONA || feat.DESCR_ZONA || feat.destinazione || feat.USO || null;
            zona_urbanistica = {
              disponibile: true,
              zona_codice: zonaCodice || 'Vedi PRG',
              destinazione_uso: destinazione || 'Verificare su PRG comunale',
              features_totali: j.features.length,
              messaggio: `Dati PRG/PRGC Piemonte recuperati (${j.features.length} zone per il comune, layer: ${typeName}).`,
              link_geoportale: `https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=PRG+${encodeURIComponent(comune)}`,
              fonte: `WFS Geoportale Piemonte — ${typeName}`,
            };
            break outerPRG;
          }
        } catch (_e) {
          // prova layer successivo
        }
      }
    }
  }

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
        nota: paiFraneTotali > 0 ? `Rilevate ${paiFraneTotali} geometrie PAI entro area di ricerca. Consultare webgis.arpa.piemonte.it per dettaglio.` : (paiFraneOk ? 'Nessuna frana censita ARPA Piemonte entro area di ricerca.' : 'Fonte WFS ARPA Piemonte non raggiungibile — verificare manualmente.'),
      },
      sismica: sismicaPiemonte,
      zona_urbanistica,
    },
    link_utili: {
      geoportale_piemonte: 'https://www.geoportale.piemonte.it',
      arpa_piemonte: 'https://webgis.arpa.piemonte.it',
    },
    note_salvataggio: `WFS Piemonte completato il ${new Date().toLocaleDateString('it-IT')}. Frane PAI: ${paiFraneTotali}, Overpass ok: ${overpass_ok}, Laghi: ${lakes.length}.`,
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
  } catch (_e) {
    // Chiamata da automazione server-side (service role) — user può essere null
  }

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
    // Allow service-role calls (automations) — skip ownership check if no user email
    if (user && user.email && q.created_by !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const regioneLower = (q.regione || '').toLowerCase();
    if (!regioneLo