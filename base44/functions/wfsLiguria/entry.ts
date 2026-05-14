import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WFS_BASE = 'https://srvcarto.regione.liguria.it/geoserver/wfs';

// Fetch WFS GetCapabilities and parse layer names from XML
async function getAvailableLayers() {
  const url = `${WFS_BASE}?SERVICE=WFS&VERSION=1.1.0&REQUEST=GetCapabilities`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) return [];
  const xml = await resp.text();
  // Extract all FeatureType/Name values
  const names = [];
  const regex = /<(?:FeatureType)>[\s\S]*?<Name>([\s\S]*?)<\/Name>/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    names.push(m[1].trim());
  }
  return names;
}

// Query a single WFS layer with BBOX filter around point
async function queryLayer(layerName, lat, lon) {
  const delta = 0.001;
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta},EPSG:4326`;
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '1.1.0',
    REQUEST: 'GetFeature',
    TYPENAMES: layerName,
    BBOX: bbox,
    OUTPUTFORMAT: 'application/json',
    MAXFEATURES: '5',
  });
  const url = `${WFS_BASE}?${params.toString()}`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)' },
    signal: AbortSignal.timeout(12000),
  });
  if (!resp.ok) return null;
  const text = await resp.text();
  if (!text || text.includes('ExceptionReport') || text.trim().startsWith('<')) return null;
  const data = JSON.parse(text);
  if (!data.features || data.features.length === 0) return null;
  return data;
}

// Try a list of candidate layers in order, return first with results
async function tryLayers(candidates, lat, lon) {
  for (const name of candidates) {
    const result = await queryLayer(name, lat, lon);
    if (result) return { layer: name, data: result };
  }
  return null;
}

// Extract clean properties from GeoJSON feature
function extractProps(geojsonData) {
  if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) return null;
  const props = geojsonData.features[0].properties || {};
  // Remove null/empty values
  const clean = {};
  for (const [k, v] of Object.entries(props)) {
    if (v !== null && v !== undefined && v !== '' && v !== 'null') {
      clean[k] = v;
    }
  }
  return clean;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query_id } = await req.json();
    if (!query_id) return Response.json({ error: 'query_id required' }, { status: 400 });

    // Load the CadastralQuery
    const queries = await base44.entities.CadastralQuery.filter({ id: query_id });
    const query = queries[0];
    if (!query) return Response.json({ error: 'Query not found' }, { status: 404 });

    // Ownership check: only the creator or an admin can run this analysis
    if (query.created_by !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: non sei il proprietario di questa query' }, { status: 403 });
    }

    if (query.regione !== 'Liguria') {
      return Response.json({ error: 'Questo servizio è disponibile solo per la Liguria' }, { status: 400 });
    }

    // Mark as processing
    await base44.entities.CadastralQuery.update(query_id, { status: 'processing' });

    // ── STEP 1: Geocoding with Nominatim ──
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.comune + ' Liguria Italy')}&format=json&limit=1&addressdetails=1`;
    const geocodeResp = await fetch(geocodeUrl, {
      headers: { 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)' },
    });
    const geocodeData = await geocodeResp.json();

    if (!geocodeData || geocodeData.length === 0) {
      await base44.entities.CadastralQuery.update(query_id, {
        status: 'failed',
        note: 'Geocoding fallito: comune non trovato su Nominatim.',
      });
      return Response.json({ error: 'Geocoding failed' }, { status: 422 });
    }

    const lat = parseFloat(geocodeData[0].lat);
    const lon = parseFloat(geocodeData[0].lon);

    // Save centroid
    await base44.entities.CadastralQuery.update(query_id, {
      centroid_lat: lat,
      centroid_lng: lon,
    });

    // ── STEP 2: GetCapabilities ──
    let availableLayers = [];
    try {
      availableLayers = await getAvailableLayers();
    } catch (_e) {
      // continue without capabilities — use fallback lists
    }

    // ── STEP 3: Query WFS layers ──

    // Zona urbanistica candidates
    const zonaUrbanisticaCandidates = availableLayers.filter(l =>
      /zona|urbanist|ucp|piani|piano/i.test(l)
    ).slice(0, 6);
    const zonaUrbanisticaFallback = [
      'Regione:UCP_ZONE_URBANISTICHE',
      'Regione:PIANI_URBANISTICI',
      'Regione:limiti_comunali',
      'Regione:UCP_PIANI_URBANISTICI_COMUNALI',
    ];
    const zonaLayers = [...new Set([...zonaUrbanisticaCandidates, ...zonaUrbanisticaFallback])];

    // Vincoli paesaggistici candidates
    const vincoliCandidates = availableLayers.filter(l =>
      /vinco|paesag|beni/i.test(l)
    ).slice(0, 4);
    const vincoliCandidateFallback = [
      'Regione:VIN_BENI_PAESAGGISTICI',
      'Regione:VINCOLI_PAESAGGISTICI',
    ];
    const vincoliLayers = [...new Set([...vincoliCandidates, ...vincoliCandidateFallback])];

    // PAI idrogeologico candidates
    const paiCandidates = availableLayers.filter(l =>
      /pai|idrau|idro|pericolos|bacin/i.test(l)
    ).slice(0, 4);
    const paiFallback = [
      'Regione:PAI_BACINI_IDROGRAFICI',
      'Regione:PAI_PERICOLOSITA_IDRAULICA',
    ];
    const paiLayers = [...new Set([...paiCandidates, ...paiFallback])];

    // Zonazione sismica candidates
    const sismCandidates = availableLayers.filter(l =>
      /sismic|seismic|classif/i.test(l)
    ).slice(0, 4);
    const sismFallback = [
      'Regione:ZONAZIONE_SISMICA',
      'Regione:CLASSIFICAZIONE_SISMICA',
    ];
    const sismLayers = [...new Set([...sismCandidates, ...sismFallback])];

    // Run queries in parallel
    const [zonaResult, vincoliResult, paiResult, sismResult] = await Promise.allSettled([
      tryLayers(zonaLayers, lat, lon),
      tryLayers(vincoliLayers, lat, lon),
      tryLayers(paiLayers, lat, lon),
      tryLayers(sismLayers, lat, lon),
    ]);

    const zona = zonaResult.status === 'fulfilled' ? zonaResult.value : null;
    const vincoli = vincoliResult.status === 'fulfilled' ? vincoliResult.value : null;
    const pai = paiResult.status === 'fulfilled' ? paiResult.value : null;
    const sism = sismResult.status === 'fulfilled' ? sismResult.value : null;

    const anyFound = zona || vincoli || pai || sism;

    // ── STEP 4: Build report_data ──
    const report_data_wfs = {
      comune: query.comune,
      regione: 'Liguria',
      provincia: query.provincia || '',
      centroide: { lat, lon },
      fonte_dati: 'Regione Liguria WFS - srvcarto.regione.liguria.it',
      data_elaborazione: new Date().toISOString(),
      layer_disponibili_totali: availableLayers.length,
      analisi_urbanistica: {
        zona_urbanistica: zona
          ? { layer_utilizzato: zona.layer, dati: extractProps(zona.data) }
          : { layer_utilizzato: zonaLayers[0], dati: 'non_disponibile' },
        vincoli_paesaggistici: vincoli
          ? { layer_utilizzato: vincoli.layer, dati: extractProps(vincoli.data) }
          : { layer_utilizzato: vincoliLayers[0], dati: 'nessun_vincolo_rilevato' },
        rischio_idrogeologico: pai
          ? { layer_utilizzato: pai.layer, dati: extractProps(pai.data) }
          : { layer_utilizzato: paiLayers[0], dati: 'non_disponibile' },
        zonazione_sismica: sism
          ? { layer_utilizzato: sism.layer, dati: extractProps(sism.data) }
          : { layer_utilizzato: sismLayers[0], dati: 'non_disponibile' },
      },
      note: 'Analisi basata su dati WFS pubblici Regione Liguria. Per informazioni dettagliate consultare l\'UTC del comune.',
    };

    // ── STEP 5: Update CadastralQuery ──
    const existingReportData = query.report_data || {};
    await base44.entities.CadastralQuery.update(query_id, {
      status: anyFound ? 'completed' : 'failed',
      report_data: { ...existingReportData, wfs_liguria: report_data_wfs },
      fonte_dati_catastali: 'catastomappe',
      note: anyFound
        ? `WFS Liguria completato il ${new Date().toLocaleDateString('it-IT')}. Layer trovati: ${[zona, vincoli, pai, sism].filter(Boolean).length}/4.`
        : 'WFS Liguria: nessun layer ha restituito dati per questa posizione.',
    });

    return Response.json({
      success: true,
      anyFound,
      centroide: { lat, lon },
      layersFound: {
        zona_urbanistica: !!zona,
        vincoli_paesaggistici: !!vincoli,
        rischio_idrogeologico: !!pai,
        zonazione_sismica: !!sism,
      },
      report: report_data_wfs,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});