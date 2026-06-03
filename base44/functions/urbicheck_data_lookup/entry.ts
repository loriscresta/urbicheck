import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── SIT Regionali ──────────────────────────────────────────────────────────
const SIT_REGIONALI = {
  piemonte:       { wfs: "https://www.geoportale.piemonte.it/geoserver/wfs",                        layer: "PRGC:PRGC_VIGENTE",           tipo: "PRG",  licenza: "CC BY 4.0", copertura: "alta" },
  lombardia:      { wfs: "https://www.geoportale.regione.lombardia.it/geoserver/wfs",                layer: "rt_pgt_pgt.pgt_l_limite",     tipo: "PGT",  licenza: "CC BY 4.0", copertura: "alta" },
  veneto:         { wfs: "https://idt2.regione.veneto.it/geoserver/IDT2/wfs",                        layer: "IDT2:PRG",                    tipo: "PRG",  licenza: "CC BY 4.0", copertura: "alta" },
  toscana:        { wfs: "https://www502.regione.toscana.it/geoscopio/wfs",                          layer: "urbanistica:prg_vigente",      tipo: "PRG",  licenza: "CC BY 4.0", copertura: "alta" },
  lazio:          { wfs: "https://geoportale.regione.lazio.it/geoserver/wfs",                        layer: "urbanistica:prg_vigente",      tipo: "PRG",  licenza: "CC BY 4.0", copertura: "alta" },
  emilia_romagna: { wfs: "https://servizissiir.regione.emilia-romagna.it/GeoServer/wfs",             layer: "siter:PSC",                   tipo: "PSC",  licenza: "CC BY 4.0", copertura: "alta" },
  sardegna:       { wfs: "https://www.sardegnageoportale.it/geoserver/wfs",                          layer: "srt:PUC",                     tipo: "PUC",  licenza: "CC BY 4.0", copertura: "alta" },
  liguria:        { wfs: "https://srvcarto.regione.liguria.it/geoserver/wfs",                        layer: "PIANI:puc_vigente",            tipo: "PUC",  licenza: "CC BY 4.0", copertura: "media" },
  campania:       { wfs: "https://sit.regione.campania.it/geoserver/wfs",                            layer: "sit_campania:puc_vigente",     tipo: "PUC",  licenza: "CC BY",     copertura: "media" },
  puglia:         { wfs: "https://pugliacon.regione.puglia.it/wfs",                                  layer: "pugliacon:prg_pf",             tipo: "PRG",  licenza: "CC BY",     copertura: "media" },
  calabria:       { wfs: "https://geoportale.regione.calabria.it/geoserver/wfs",                     layer: "calabria:psc_vigente",         tipo: "PSC",  licenza: "CC BY",     copertura: "media" },
  friuli_vg:      { wfs: "https://irdat.regione.fvg.it/CTRN/wfs",                                   layer: "PS.PLU",                      tipo: "PRGC", licenza: "CC BY",     copertura: "media" },
  umbria:         { wfs: "https://webgis.regione.umbria.it/geoserver/wfs",                           layer: "umbria:piani_regolatori",      tipo: "PRG",  licenza: "CC BY",     copertura: "media" },
  trentino_aa:    { wfs: "https://siat.provincia.tn.it/geoserver/wfs",                              layer: "prg_trentino",                 tipo: "PRG",  licenza: "CC BY",     copertura: "media" },
  valle_daosta:   { wfs: "https://geoportale.regione.vda.it/geoserver/wfs",                          layer: "vda:PRG_COMUNI",               tipo: "PRG",  licenza: "CC BY",     copertura: "media" },
  sicilia:        { wfs: null, layer: null, tipo: "PRG", licenza: "n.d.", copertura: "bassa" },
  abruzzo:        { wfs: null, layer: null, tipo: "PRG", licenza: "n.d.", copertura: "bassa" },
  marche:         { wfs: null, layer: null, tipo: "PRG", licenza: "n.d.", copertura: "bassa" },
  basilicata:     { wfs: null, layer: null, tipo: "PRG", licenza: "n.d.", copertura: "bassa" },
  molise:         { wfs: null, layer: null, tipo: "PRG", licenza: "n.d.", copertura: "bassa" },
};

const REGIONE_MAP = {
  "piemonte": "piemonte", "lombardia": "lombardia", "veneto": "veneto",
  "toscana": "toscana", "lazio": "lazio",
  "emilia-romagna": "emilia_romagna", "emilia romagna": "emilia_romagna", "emilia_romagna": "emilia_romagna",
  "sardegna": "sardegna", "liguria": "liguria", "campania": "campania",
  "puglia": "puglia", "calabria": "calabria",
  "friuli-venezia giulia": "friuli_vg", "friuli venezia giulia": "friuli_vg", "friuli_vg": "friuli_vg", "friuli": "friuli_vg",
  "umbria": "umbria",
  "trentino-alto adige": "trentino_aa", "trentino alto adige": "trentino_aa", "trentino_aa": "trentino_aa", "trentino": "trentino_aa",
  "valle d'aosta": "valle_daosta", "valle daosta": "valle_daosta", "valle_daosta": "valle_daosta", "vda": "valle_daosta",
  "sicilia": "sicilia", "abruzzo": "abruzzo", "marche": "marche", "basilicata": "basilicata", "molise": "molise",
};

// ── Helpers ────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, opts = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url, opts = {}, maxRetries = 3) {
  const delays = [2000, 4000, 8000];
  let lastErr;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fetchWithTimeout(url, opts, 8000);
    } catch (err) {
      lastErr = err;
      if (i < maxRetries) await new Promise(r => setTimeout(r, delays[i] || 8000));
    }
  }
  throw lastErr;
}

// ── Livello 1: RNDT ────────────────────────────────────────────────────────

async function searchRNDT(nomeComune) {
  try {
    const q = encodeURIComponent(`${nomeComune} PRG`);
    const url = `https://geodati.gov.it/RNDT/rest/find/document?searchText=${q}&max=10&f=pjson`;
    const res = await fetchWithTimeout(url, {}, 8000);
    if (!res.ok) return { status: "error", livello: 1 };
    const data = await res.json();
    const items = data?.records || data?.results || [];
    if (items.length > 0) {
      const first = items[0];
      return {
        status: "found",
        livello: 1,
        fonte: "RNDT — geodati.gov.it",
        titolo: first.title || first.name || nomeComune,
        metadataUrl: first.url || first.identifier || null,
        nota: `${items.length} record trovati nel catalogo nazionale RNDT`,
      };
    }
    return { status: "not_found", livello: 1 };
  } catch {
    return { status: "error", livello: 1 };
  }
}

// ── Livello 2: SIT Regionale WFS ───────────────────────────────────────────

async function searchSITRegionale(nomeComune, regioneKey) {
  const sit = SIT_REGIONALI[regioneKey];
  if (!sit || !sit.wfs) return { status: "no_wfs", livello: 2, ...sit };

  // Costruisci filtro OGC PropertyIsLike (prova vari field name comuni)
  const fields = ["COMUNE", "DEN_COM", "NOME_COM", "DENOMINAZIONE", "NOME"];
  const likeFilters = fields.map(f =>
    `<PropertyIsLike wildCard="*" singleChar="?" escapeChar="\\"><PropertyName>${f}</PropertyName><Literal>${nomeComune.toUpperCase()}*</Literal></PropertyIsLike>`
  ).join("");
  const filter = `<Filter><Or>${likeFilters}</Or></Filter>`;

  const params = new URLSearchParams({
    SERVICE: "WFS",
    VERSION: "2.0.0",
    REQUEST: "GetFeature",
    TYPENAMES: sit.layer,
    outputFormat: "application/json",
    count: "5",
    CQL_FILTER: `strToUpperCase(COMUNE) LIKE '${nomeComune.toUpperCase()}%' OR strToUpperCase(DEN_COM) LIKE '${nomeComune.toUpperCase()}%' OR strToUpperCase(NOME_COM) LIKE '${nomeComune.toUpperCase()}%'`,
  });

  let url = `${sit.wfs}?${params.toString()}`;

  try {
    const res = await fetchWithTimeout(url, {}, 8000);
    if (!res.ok) {
      // Fallback: prova con FILTER XML
      const params2 = new URLSearchParams({
        SERVICE: "WFS", VERSION: "1.1.0", REQUEST: "GetFeature",
        TYPENAMES: sit.layer, maxFeatures: "5",
      });
      const url2 = `${sit.wfs}?${params2.toString()}&FILTER=${encodeURIComponent(filter)}`;
      const res2 = await fetchWithTimeout(url2, {}, 8000);
      if (!res2.ok) return { status: "wfs_error", livello: 2, layer: sit.layer, wfs: sit.wfs, tipo: sit.tipo, licenza: sit.licenza, copertura: sit.copertura };
      const text2 = await res2.text();
      const count = countWfsFeatures(text2);
      return buildSITResult(count, sit, regioneKey, nomeComune);
    }

    const contentType = res.headers.get("content-type") || "";
    let count = 0;
    if (contentType.includes("json")) {
      const data = await res.json();
      count = data?.totalFeatures ?? data?.numberReturned ?? data?.features?.length ?? 0;
    } else {
      const text = await res.text();
      count = countWfsFeatures(text);
    }
    return buildSITResult(count, sit, regioneKey, nomeComune);
  } catch {
    return { status: "timeout", livello: 2, layer: sit.layer, wfs: sit.wfs, tipo: sit.tipo, licenza: sit.licenza, copertura: sit.copertura };
  }
}

function countWfsFeatures(text) {
  const memberCount = (text.match(/<(gml:featureMember|wfs:member)/g) || []).length;
  const attrMatch = text.match(/numberOfFeatures[=:]["']?(\d+)/i);
  if (attrMatch) return parseInt(attrMatch[1], 10);
  return memberCount;
}

function buildSITResult(featureCount, sit, regioneKey, nomeComune) {
  if (featureCount > 0) {
    return {
      status: "found",
      livello: 2,
      featureCount,
      fonte: `SIT Regionale — ${regioneKey}`,
      layer: sit.layer,
      wfs: sit.wfs,
      tipo: sit.tipo,
      licenza: sit.licenza,
      copertura: sit.copertura,
    };
  }
  return {
    status: "partial",
    livello: 2,
    featureCount: 0,
    fonte: `SIT Regionale — ${regioneKey}`,
    layer: sit.layer,
    wfs: sit.wfs,
    tipo: sit.tipo,
    licenza: sit.licenza,
    copertura: sit.copertura,
    nota: "WFS raggiungibile ma nessuna feature trovata per questo comune",
  };
}

// ── Livello 3: Catasto AdE (BBOX) ─────────────────────────────────────────

async function searchCatastoAdE(bbox) {
  try {
    const [minx, miny, maxx, maxy] = bbox;
    const url = `https://wms.cartografia.agenziaentrate.gov.it/inspire/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=CP.CadastralParcel&BBOX=${minx},${miny},${maxx},${maxy}&outputFormat=application/json&count=1`;
    const res = await fetchWithRetry(url, {}, 3);
    if (!res.ok) return { status: "catasto_error", livello: 3 };
    const contentType = res.headers.get("content-type") || "";
    let count = 0;
    if (contentType.includes("json")) {
      const data = await res.json();
      count = data?.totalFeatures ?? data?.features?.length ?? 0;
    } else {
      const text = await res.text();
      count = countWfsFeatures(text);
    }
    return {
      status: count > 0 ? "catasto_only" : "missing",
      livello: 3,
      fonte: "Catasto AdE WFS",
      featureCount: count,
    };
  } catch {
    return { status: "missing", livello: 3 };
  }
}

// ── Orchestratore cascata ──────────────────────────────────────────────────

async function lookupComune(nomeComune, regione, options = {}) {
  const regioneKey = REGIONE_MAP[regione?.toLowerCase().trim()] || null;

  // Cache check
  if (options.cacheData) {
    const cacheKey = `${regione}_${nomeComune.toLowerCase()}`;
    const cached = options.cacheData[cacheKey];
    if (cached && cached.timestamp) {
      const age = Date.now() - cached.timestamp;
      const TTL_30_DAYS = 30 * 24 * 60 * 60 * 1000;
      if (age < TTL_30_DAYS) {
        return { ...cached.result, fromCache: true };
      }
    }
  }

  // Livello 1: RNDT
  const rndt = await searchRNDT(nomeComune);
  if (rndt.status === "found") {
    return { ...rndt, regioneKey };
  }

  // Livello 2: SIT Regionale
  if (regioneKey) {
    const sit = await searchSITRegionale(nomeComune, regioneKey);
    if (sit.status === "found") {
      return { ...sit, regioneKey };
    }
    if (sit.status === "partial") {
      return { ...sit, regioneKey };
    }
  }

  // Livello 3: Catasto AdE
  if (options.bbox) {
    const catasto = await searchCatastoAdE(options.bbox);
    return { ...catasto, regioneKey };
  }

  return { status: "missing", livello: null, regioneKey };
}

// ── Deno server ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    // Authorization: solo utenti autenticati con ruolo valido
    const allowedRoles = ['user', 'admin', 'pro', 'beta'];
    if (user.role && !allowedRoles.includes(user.role)) {
      return Response.json({ error: "Forbidden — ruolo non autorizzato" }, { status: 403 });
    }

    const body = await req.json();
    const { nomeComune, regione, bbox, codiceISTAT, queryId } = body;

    if (!nomeComune || !regione) {
      return Response.json({ error: "nomeComune e regione sono obbligatori" }, { status: 400 });
    }

    // Leggi cache da CadastralQuery se queryId fornito
    let cacheData = null;
    if (queryId) {
      const queries = await base44.entities.CadastralQuery.filter({ id: queryId });
      const q = queries[0];
      if (q?.report_data?.prg_lookup) cacheData = q.report_data.prg_lookup;
    }

    const result = await lookupComune(nomeComune, regione, { bbox, cacheData });

    // Salva in cache se queryId fornito e non era dalla cache
    if (queryId && !result.fromCache) {
      const cacheKey = `${regione}_${nomeComune.toLowerCase()}`;
      const queries = await base44.entities.CadastralQuery.filter({ id: queryId });
      const q = queries[0];
      if (q) {
        const newPrgLookup = { ...(q.report_data?.prg_lookup || {}), [cacheKey]: { result, timestamp: Date.now() } };
        await base44.entities.CadastralQuery.update(queryId, {
          report_data: { ...(q.report_data || {}), prg_lookup: newPrgLookup }
        });
      }
    }

    return Response.json({ result, sitRegionali: SIT_REGIONALI });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});