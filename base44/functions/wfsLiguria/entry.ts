// wfsLiguria.js — URBICHECK Analisi Urbanistica Liguria
// Approccio ibrido: logica legale (vincoli ope legis) + WFS PAI + Overpass API (ferrovie/acque)

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WFS_BASE = 'https://geoservizi.regione.liguria.it/geoserver';

// ============================================================
// DATASET STATICI
// ============================================================

const COMUNI_COSTIERI = new Set([
  // Provincia di Imperia
  'ventimiglia','bordighera','vallecrosia','camporosso','sanremo','san remo',
  'taggia','riva ligure','santo stefano al mare','costarainera','cipressa',
  'san lorenzo al mare','imperia','diano marina','san bartolomeo al mare',
  'cervo','andora','laigueglia','alassio',
  // Provincia di Savona
  'albenga','borghetto santo spirito','ceriale','pietra ligure',
  'borgio verezzi','finale ligure','noli','spotorno','bergeggi',
  'savona','vado ligure','albissola marina','albisola superiore',
  'celle ligure','varazze','cogoleto',
  // Provincia di Genova
  'arenzano','genova','bogliasco','pieve ligure','sori','recco',
  'camogli','portofino','santa margherita ligure','rapallo','zoagli',
  'chiavari','lavagna','sestri levante','casarza ligure',
  // Provincia di La Spezia
  'deiva marina','framura','bonassola','levanto',
  'monterosso al mare','vernazza','riomaggiore',
  'la spezia','porto venere','lerici','ameglia',
]);

const PARCHI_RISERVE = [
  {
    nome: 'Parco Nazionale delle Cinque Terre',
    tipo: 'Parco Nazionale',
    comuni: ['monterosso al mare','vernazza','riomaggiore','levanto'],
  },
  {
    nome: 'Parco Regionale del Beigua',
    tipo: 'Parco Regionale',
    comuni: ['arenzano','cogoleto','varazze','sassello','stella','tiglieto',
             'campo ligure','masone','rossiglione'],
  },
  {
    nome: 'Parco Regionale di Portofino',
    tipo: 'Parco Regionale',
    comuni: ['camogli','portofino','santa margherita ligure','rapallo','zoagli'],
  },
  {
    nome: "Parco Regionale dell'Antola",
    tipo: 'Parco Regionale',
    comuni: ['busalla','crocefieschi','fascia','fontanigorda','gorreto',
             'isola del cantone','montebruno','propata','rondanina',
             'rovegno','torriglia','valbrevenna','vobbia'],
  },
  {
    nome: "Parco Regionale dell'Aveto",
    tipo: 'Parco Regionale',
    comuni: ['borzonasca','mezzanego','ne','rezzoaglio',"santo stefano d'aveto"],
  },
  {
    nome: 'Parco Regionale di Montemarcello-Magra-Vara',
    tipo: 'Parco Regionale',
    comuni: ['ameglia','arcola','beverino','borghetto di vara','brugnato',
             'carrodano','follo','lerici','maissana','pignone',
             'rocchetta di vara','sesta godano','sarzana','varese ligure','zignago'],
  },
  {
    nome: 'Parco Regionale del Finalese',
    tipo: 'Parco Regionale',
    comuni: ['finale ligure','calice ligure','orco feglino','rialto'],
  },
];

// Sismica per comune (DGR Liguria - OPCM 3274/2003, DGR 1362/2010)
const SISMICA_ZONA2 = new Set([
  'calice al cornoviglio','borghetto di vara','brugnato','maissana',
  'rocchetta di vara','sesta godano','varese ligure','zignago',
  'beverino','follo',"riccò del golfo",'pignone','framura',
  'bonassola','deiva marina',
]);
const SISMICA_ZONA4 = new Set([
  'cairo montenotte','millesimo','pamparato','garessio','bagnasco',
]);

// ============================================================
// COORDINATE CONVERSION: WGS84 → EPSG:3003 (Gauss-Boaga Ovest)
// ============================================================
function wgs84ToEpsg3003(lon, lat) {
  const d2r = Math.PI / 180;
  const lon_r = lon * d2r;
  const lat_r = lat * d2r;
  const a = 6378388.0; // Hayford 1924
  const f = 1.0 / 297.0;
  const b = a * (1 - f);
  const e2 = (a * a - b * b) / (a * a);
  const lon0 = 9.0 * d2r;
  const k0 = 0.9996;
  const FE = 1500000.0;
  const N = a / Math.sqrt(1 - e2 * Math.sin(lat_r) ** 2);
  const T = Math.tan(lat_r) ** 2;
  const C = (e2 / (1 - e2)) * Math.cos(lat_r) ** 2;
  const A = Math.cos(lat_r) * (lon_r - lon0);
  const e4 = e2 * e2; const e6 = e4 * e2;
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
async function geocodeAddress(indirizzo, comune, provincia) {
  const q = indirizzo
    ? `${indirizzo}, ${comune}, ${provincia}, Liguria, Italy`
    : `${comune}, ${provincia}, Liguria, Italy`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'URBICHECK/1.0 (info@urbicheck.it)' } });
  const data = await res.json();
  if (!data.length) throw new Error(`Indirizzo non trovato: ${q}`);
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

// ============================================================
// PAI via WFS Regione Liguria
// ============================================================
const PAI_LAYERS = [
  { typeName: 'M450:L722', label: 'Rischio idrogeologico', geomField: 'wkb_geometry', classeField: 'classe', bacinoField: 'bacino' },
  { typeName: 'M450:L721', label: 'Rischio idraulico',     geomField: 'wkb_geometry', classeField: 'classe', bacinoField: 'bacino' },
];

async function queryPAI(x3003, y3003) {
  const results = [];
  for (const layer of PAI_LAYERS) {
    try {
      const filter = `INTERSECTS(${layer.geomField},POINT(${x3003} ${y3003}))`;
      const url = `${WFS_BASE}/${layer.typeName.split(':')[0]}/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=${layer.typeName}&outputFormat=application/json&CQL_FILTER=${encodeURIComponent(filter)}&count=5`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
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
// OVERPASS API: Ferrovie e Corsi d'acqua
// ============================================================
async function queryOverpass(lat, lon) {
  const q = `[out:json][timeout:12];
(
  way["railway"~"^(rail|tram|light_rail|narrow_gauge|subway)$"](around:250,${lat},${lon});
  way["waterway"~"^(river|stream|canal)$"](around:250,${lat},${lon});
  relation["waterway"="river"](around:250,${lat},${lon});
);
out body;
>;
out skel qt;`;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: q,
      headers: { 'Content-Type': 'text/plain' },
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    const railways = [];
    const waterways = [];
    const seen = new Set();
    for (const el of (data.elements || [])) {
      if (el.type !== 'way' || !el.tags) continue;
      const key = el.tags.name || el.id;
      if (seen.has(key)) continue;
      seen.add(key);
      if (el.tags.railway) {
        railways.push({ tipo: el.tags.railway, nome: el.tags.name || el.tags.ref || 'Linea ferroviaria', operatore: el.tags.operator || null });
      }
      if (el.tags.waterway) {
        waterways.push({ tipo: el.tags.waterway, nome: el.tags.name || "Corso d'acqua senza nome" });
      }
    }
    return { railways, waterways, overpass_ok: true };
  } catch (_e) {
    return { railways: [], waterways: [], overpass_ok: false };
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Support both direct call (comune/provincia/indirizzo) and query_id-based call
    let comune, provincia, indirizzo, query_id;
    if (body.query_id) {
      query_id = body.query_id;
      const queries = await base44.entities.CadastralQuery.filter({ id: query_id });
      const q = queries[0];
      if (!q) return Response.json({ error: 'Query not found' }, { status: 404 });
      if (q.created_by !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (q.regione !== 'Liguria') {
        return Response.json({ error: 'Questo servizio è disponibile solo per la Liguria' }, { status: 400 });
      }
      comune = q.comune;
      provincia = q.provincia || q.sigla_provincia || '';
      indirizzo = null;
      await base44.entities.CadastralQuery.update(query_id, { status: 'processing' });
    } else {
      comune = body.comune;
      provincia = body.provincia;
      indirizzo = body.indirizzo;
    }

    if (!comune || !provincia) {
      return Response.json({ error: 'comune e provincia sono obbligatori' }, { status: 400 });
    }

    const comuneLower = comune.toLowerCase().trim();

    // 1. Geocoding
    const coords = await geocodeAddress(indirizzo, comune, provincia);
    const { lat, lon } = coords;
    const { x: x3003, y: y3003 } = wgs84ToEpsg3003(lon, lat);

    // 2. Vincoli paesaggistici ope legis (art.142 D.Lgs 42/2004)
    const vincoli_paesaggistici = [];

    if (COMUNI_COSTIERI.has(comuneLower)) {
      vincoli_paesaggistici.push({
        tipo: 'Territori costieri',
        livello: 'APPLICABILE',
        riferimento_normativo: 'Art.142 c.1 lett. a) D.Lgs 42/2004',
        fascia_tutela: '300m dalla battigia del mare',
        fonte: 'Analisi logica — comune costiero',
        descrizione: 'Il comune è classificato costiero. La legge impone il vincolo paesaggistico nella fascia di 300m dalla battigia. La distanza esatta del lotto dal mare deve essere verificata da un tecnico con rilievo o CTR.',
        link: 'https://liguriavincoli.it',
      });
    }

    for (const parco of PARCHI_RISERVE) {
      if (parco.comuni.includes(comuneLower)) {
        vincoli_paesaggistici.push({
          tipo: 'Parchi e riserve naturali',
          livello: 'APPLICABILE',
          riferimento_normativo: 'Art.142 c.1 lett. f) D.Lgs 42/2004',
          nome_area_protetta: parco.nome,
          tipo_area: parco.tipo,
          fonte: `Analisi logica — comune nel perimetro di ${parco.nome}`,
          descrizione: `Il comune ricade nel perimetro del ${parco.nome}. Il vincolo paesaggistico si applica all'intera area del parco. Verificare se il lotto specifico è interno o esterno al perimetro ufficiale.`,
          link: 'https://geoportale.regione.liguria.it',
        });
        break;
      }
    }

    // 3. PAI (WFS Regione Liguria) + Overpass — run in parallel
    const [pai, overpassResult] = await Promise.all([
      queryPAI(x3003, y3003),
      queryOverpass(lat, lon),
    ]);

    const { railways, waterways, overpass_ok } = overpassResult;

    const ferrovie = railways.length > 0
      ? railways.map(r => ({
          trovato: true,
          nome: r.nome,
          tipo_infrastruttura: r.tipo,
          operatore: r.operatore,
          livello: 'VERIFICA_NECESSARIA',
          riferimento_normativo: 'DPR 11 luglio 1980 n.753',
          fascia_rispetto: "30m dall'asse del binario (art.49)",
          fonte: 'OpenStreetMap / Overpass API',
          descrizione: `Rilevata ferrovia (${r.nome}) entro 250m. Il DPR 753/1980 vieta nuove costruzioni entro 30m dall'asse del binario e impone limitazioni fino a distanze maggiori per alcune tipologie. La distanza esatta richiede verifica tecnica con RFI o Comune.`,
        }))
      : [{ trovato: false, nota: 'Nessuna ferrovia rilevata entro 250m dal punto analizzato.' }];

    const corsi_acqua_vincolo = waterways.length > 0
      ? waterways.map(w => ({
          trovato: true,
          nome: w.nome,
          tipo: w.tipo,
          livello: w.tipo === 'river' ? 'POSSIBILE_VINCOLO_ALTO' : 'POSSIBILE_VINCOLO_DA_VERIFICARE',
          riferimento_normativo: 'Art.142 c.1 lett. c) D.Lgs 42/2004',
          fascia_tutela: '150m dal ciglio di sponda',
          fonte: 'OpenStreetMap / Overpass API',
          descrizione: w.tipo === 'river'
            ? `Rilevato fiume (${w.nome}) entro 250m. Se iscritto negli elenchi delle acque pubbliche (R.D. 1775/1933), si applica il vincolo paesaggistico di 150m dal ciglio di sponda. Alta probabilità di vincolo. Verificare con Catasto delle Acque Regione Liguria.`
            : `Rilevato corso d'acqua (${w.nome}) entro 250m. Se iscritto negli elenchi delle acque pubbliche, si applica il vincolo di 150m. Verificare con Catasto delle Acque.`,
        }))
      : [{ trovato: false, nota: "Nessun corso d'acqua rilevato entro 250m dal punto analizzato." }];

    // 4. Sismica
    let zona_sismica, descrizione_sismica;
    if (SISMICA_ZONA2.has(comuneLower)) {
      zona_sismica = 2; descrizione_sismica = 'Alta sismicità — applicazione integrale NTC 2018';
    } else if (SISMICA_ZONA4.has(comuneLower)) {
      zona_sismica = 4; descrizione_sismica = 'Bassa sismicità';
    } else {
      zona_sismica = 3; descrizione_sismica = 'Media sismicità — NTC 2018';
    }

    // 5. Zona urbanistica
    const zona_urbanistica = {
      disponibile: false,
      messaggio: 'La zonizzazione urbanistica non è disponibile tramite WFS regionale. Ogni Comune gestisce il proprio PRG/PUC.',
      link_geoportale: `https://geoportale.regione.liguria.it/geonetwork/srv/ita/catalog.search#/search?any=${encodeURIComponent(comune)}`,
      link_comune: `https://www.google.com/search?q=PRG+PUC+${encodeURIComponent(comune)}+${encodeURIComponent(provincia)}+pianificazione+urbanistica`,
      azione_consigliata: 'Richiedere il Certificato Urbanistico (CU) o la visura urbanistica presso lo Sportello Unico del Comune.',
    };

    const risultati = {
      vincoli_paesaggistici_ope_legis: {
        metodologia: 'Analisi logica basata su classificazione del comune — i vincoli ope legis scattano automaticamente per legge. Non richiede WFS (dataset regionale incompleto).',
        vincoli: vincoli_paesaggistici.length > 0 ? vincoli_paesaggistici : [{ livello: 'NESSUN_VINCOLO_RILEVATO', nota: 'Nessun vincolo paesaggistico ope legis rilevato per questo comune.' }],
        nota_foreste_boschi: 'Il vincolo boschivo (art.142 lett.g) richiede verifica puntuale con il tecnico: si applica a tutte le aree boscate indipendentemente dal comune.',
        link_verifica_ufficiale: 'https://liguriavincoli.it',
      },
      vincolo_corsi_acqua: {
        metodologia: 'Rilevamento tramite OpenStreetMap (Overpass API). Verifica necessaria con Catasto Acque Pubbliche.',
        dati: corsi_acqua_vincolo,
        fonte_ok: overpass_ok,
      },
      vincolo_ferroviario: {
        metodologia: 'Rilevamento tramite OpenStreetMap (Overpass API). Per distanza esatta contattare RFI o Comune.',
        dati: ferrovie,
        fonte_ok: overpass_ok,
      },
      pai_rischio_idrogeologico: {
        metodologia: 'WFS ufficiale Regione Liguria — Piano di Bacino Stralcio (M450).',
        dati: pai,
        link_pai: 'https://pai.ambienteinliguria.it',
      },
      sismica: {
        zona: zona_sismica,
        descrizione: descrizione_sismica,
        riferimento_normativo: 'OPCM 3274/2003 — DGR Liguria 1362/2010',
        nota: 'Per verifiche strutturali applicare NTC 2018 con spettri sito-dipendenti.',
      },
      zona_urbanistica,
    };

    const report = {
      successo: true,
      input: { comune, provincia, indirizzo: indirizzo || null },
      coordinate: { lat, lon, x_gauss_boaga: x3003, y_gauss_boaga: y3003 },
      risultati,
      disclaimer: 'Analisi di prima istanza a scopo orientativo. Non sostituisce la Due Diligence urbanistica completa né i certificati ufficiali. Per certezze legali è necessario un tecnico abilitato e il Certificato Urbanistico comunale.',
      link_utili: {
        geoportale_liguria: 'https://geoportale.regione.liguria.it',
        liguriavincoli: 'https://liguriavincoli.it',
        pai: 'https://pai.ambienteinliguria.it',
        catasto_acque: 'https://geoportale.regione.liguria.it/geonetwork/srv/ita/catalog.search#/search?any=acque+pubbliche',
        rfi_infrastrutture: 'https://www.rfi.it/it/stazioni-e-territorio/territorio-e-ambiente/fasce-di-rispetto.html',
      },
      data_elaborazione: new Date().toISOString(),
    };

    // If called with query_id, persist results
    if (query_id) {
      const queries = await base44.entities.CadastralQuery.filter({ id: query_id });
      const q = queries[0];
      const existingReportData = q?.report_data || {};
      await base44.entities.CadastralQuery.update(query_id, {
        status: 'completed',
        centroid_lat: lat,
        centroid_lng: lon,
        report_data: { ...existingReportData, wfs_liguria: report },
        note: `WFS Liguria completato il ${new Date().toLocaleDateString('it-IT')}. Vincoli: ${vincoli_paesaggistici.length}, PAI trovati: ${pai.filter(p => p.trovato).length}.`,
      });
    }

    return Response.json({ success: true, report });

  } catch (err) {
    return Response.json({ successo: false, errore: err.message }, { status: 500 });
  }
});