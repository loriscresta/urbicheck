import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WFS_BASE = 'https://geoservizi.regione.liguria.it/geoserver';

// Verified layer config from Regione Liguria GeoServer (geoservizi.regione.liguria.it)
// All datasets use native CRS EPSG:3003 (Gauss-Boaga Monte Mario Zone 1)
const VINCOLI_LAYERS = [
  { typeName: 'M2100:L7083', label: 'Territori costieri', geomField: 'GEOMETRY' },
  { typeName: 'M2100:L7086', label: 'Foreste e boschi', geomField: 'GEOMETRY' },
  { typeName: 'M2100:L7084', label: 'Zone montane', geomField: 'GEOMETRY' },
  { typeName: 'M2100:L7085', label: 'Parchi e riserve naturali', geomField: 'GEOMETRY' },
  { typeName: 'M2100:L7246', label: "Corsi d'acqua", geomField: 'GEOMETRY' },
  { typeName: 'M2100:L7706', label: 'Laghi', geomField: 'GEOMETRY' },
  { typeName: 'M2100:L7245', label: 'Territori contermini ai laghi', geomField: 'GEOMETRY' },
  { typeName: 'M2100:L7712', label: 'Zone di interesse archeologico', geomField: 'GEOMETRY' },
  { typeName: 'M2100:L7707', label: 'Zone gravate da usi civici', geomField: 'GEOMETRY' },
];

const PAI_LAYERS = [
  { typeName: 'M450:L722', label: 'Rischio idrogeologico', geomField: 'wkb_geometry', classeField: 'classe', bacinoField: 'bacino', descrField: 'descr_t_risc_gen' },
  { typeName: 'M450:L721', label: 'Rischio idraulico', geomField: 'wkb_geometry', classeField: 'classe', bacinoField: 'bacino', descrField: 'descr_t_risc_gen' },
];

// Seismic zone classification (DGR Liguria) - Zone 2=medium, 3=low, 4=very low
const SISMICA_ZONE = {
  'Ameglia': 3, 'Arcola': 3, 'Bolano': 3, 'Borghetto di Vara': 3, 'Brugnato': 3,
  'Calice al Cornoviglio': 3, 'Carro': 3, 'Carrodano': 3, 'Castelnuovo Magra': 3,
  'Chiavari': 3, 'Follo': 3, 'La Spezia': 3, 'Lerici': 3, 'Levanto': 3,
  'Luni': 3, 'Maissana': 3, 'Monterosso al Mare': 3, 'Pignone': 3,
  'Portovenere': 3, 'Ricco del Golfo di Spezia': 3, 'Riomaggiore': 3,
  'Rocchetta di Vara': 3, 'Santo Stefano di Magra': 3, 'Sarzana': 3,
  'Sesta Godano': 3, 'Varese Ligure': 3, 'Vernazza': 3, 'Vezzano Ligure': 3, 'Zignago': 3,
  'Genova': 4, 'Rapallo': 4, 'Santa Margherita Ligure': 4, 'Camogli': 4,
  'Recco': 4, 'Sestri Levante': 4, 'Bogliasco': 4, 'Arenzano': 4,
  'Cogoleto': 4, 'Varazze': 4, 'Savona': 4,
};

// Convert WGS84 (lat/lon) to EPSG:3003 (Gauss-Boaga Monte Mario Zone 1)
function wgs84ToEpsg3003(lon, lat) {
  const deg2rad = Math.PI / 180;
  const a = 6378388.0;
  const f = 1.0 / 297.0;
  const e2 = 2 * f - f * f;
  const e4 = e2 * e2;
  const e6 = e4 * e2;
  const lon0 = 9.0 * deg2rad;
  const k0 = 0.9996;
  const FE = 1500000.0;

  const phi = lat * deg2rad;
  const lambda = lon * deg2rad;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const T = tanPhi * tanPhi;
  const C = (e2 / (1 - e2)) * cosPhi * cosPhi;
  const A = cosPhi * (lambda - lon0);

  const M = a * (
    (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * phi -
    (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * phi) +
    (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * phi) -
    (35 * e6 / 3072) * Math.sin(6 * phi)
  );

  const x = k0 * N * (A + (1 - T + C) * Math.pow(A, 3) / 6 + (5 - 18 * T + T * T) * Math.pow(A, 5) / 120) + FE;
  const y = k0 * (M + N * tanPhi * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24 + (61 - 58 * T + T * T) * Math.pow(A, 6) / 720));
  return { x: Math.round(x), y: Math.round(y) };
}

async function queryWfsLayer(workspace, typeName, geomField, x, y) {
  const url = `${WFS_BASE}/${workspace}/wfs`;
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName,
    outputFormat: 'application/json',
    count: '5',
    CQL_FILTER: `INTERSECTS(${geomField},POINT(${x} ${y}))`,
  });
  const resp = await fetch(`${url}?${params.toString()}`, {
    headers: { 'User-Agent': 'URBICHECK/1.0 (info@urbicheck.it)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const text = await resp.text();
  if (!text || text.includes('ExceptionReport')) throw new Error('WFS exception');
  return JSON.parse(text);
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

    // Ownership check
    if (query.created_by !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: non sei il proprietario di questa query' }, { status: 403 });
    }

    if (query.regione !== 'Liguria') {
      return Response.json({ error: 'Questo servizio è disponibile solo per la Liguria' }, { status: 400 });
    }

    // Mark as processing
    await base44.entities.CadastralQuery.update(query_id, { status: 'processing' });

    // 1. Geocoding with Nominatim
    let lat, lon;
    if (query.centroid_lat && query.centroid_lng) {
      lat = query.centroid_lat;
      lon = query.centroid_lng;
    } else {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.comune + ' ' + (query.provincia || '') + ' Liguria Italy')}&format=json&limit=1`;
      const geocodeResp = await fetch(geocodeUrl, {
        headers: { 'User-Agent': 'URBICHECK/1.0 (info@urbicheck.it)' },
        signal: AbortSignal.timeout(5000),
      });
      const geocodeData = await geocodeResp.json();
      if (!geocodeData || geocodeData.length === 0) {
        await base44.entities.CadastralQuery.update(query_id, { status: 'failed', note: 'Geocoding fallito.' });
        return Response.json({ error: 'Geocoding failed' }, { status: 422 });
      }
      lat = parseFloat(geocodeData[0].lat);
      lon = parseFloat(geocodeData[0].lon);
      await base44.entities.CadastralQuery.update(query_id, { centroid_lat: lat, centroid_lng: lon });
    }

    // 2. Coordinate conversion WGS84 → EPSG:3003
    const { x, y } = wgs84ToEpsg3003(lon, lat);

    // 3. Query vincoli paesaggistici (PPR art.142) - dataset M2100
    const vincoli = [];
    for (const layer of VINCOLI_LAYERS) {
      try {
        const workspace = layer.typeName.split(':')[0];
        const data = await queryWfsLayer(workspace, layer.typeName, layer.geomField, x, y);
        if ((data.numberMatched > 0) || (data.features && data.features.length > 0)) {
          const features = data.features || [];
          vincoli.push({
            tipo: layer.label,
            presente: true,
            dettaglio: features[0]?.properties?.DESCR || layer.label,
            norma: features[0]?.properties?.NORMA || '',
          });
        }
      } catch (_e) {
        // Layer non disponibile - continua
      }
    }

    // 4. Query PAI rischio idrogeologico/idraulico - dataset M450
    const rischioItems = [];
    for (const layer of PAI_LAYERS) {
      try {
        const workspace = layer.typeName.split(':')[0];
        const data = await queryWfsLayer(workspace, layer.typeName, layer.geomField, x, y);
        if ((data.numberMatched > 0) || (data.features && data.features.length > 0)) {
          const features = data.features || [];
          rischioItems.push({
            tipo: layer.label,
            presente: true,
            classe: features[0]?.properties?.[layer.classeField] || '?',
            bacino: features[0]?.properties?.[layer.bacinoField] || '',
            descrizione: features[0]?.properties?.[layer.descrField] || '',
          });
        }
      } catch (_e) {
        // Continua
      }
    }

    // 5. Sismica lookup
    const zonaKey = Object.keys(SISMICA_ZONE).find(k => k.toLowerCase() === query.comune.toLowerCase());
    const zonaSismica = zonaKey ? SISMICA_ZONE[zonaKey] : 3;
    const sismica = {
      zona: zonaSismica,
      descrizione: zonaSismica === 2 ? 'Zona 2 - Sismicità media' :
                   zonaSismica === 3 ? 'Zona 3 - Sismicità bassa' :
                   'Zona 4 - Sismicità molto bassa',
      fonte: 'DGR Liguria - OPCM 3274/2003',
    };

    // 6. Build result
    const hasCritical = vincoli.length > 0 || rischioItems.length > 0;

    const report_data_wfs = {
      status: hasCritical ? 'warning' : 'ok',
      comune: query.comune,
      provincia: query.provincia || '',
      centroide: { lat, lon },
      coordinate_3003: { x, y },
      analisi: {
        vincoli_paesaggistici: {
          titolo: 'Vincoli Paesaggistici (OPE LEGIS - PPR art.142)',
          fonte: 'Geoportale Regione Liguria - dataset M2100',
          url_viewer: 'https://srvcarto.regione.liguria.it/geoapps/viewer/pages/apps/vincoli/',
          url_download: 'https://srvcarto.regione.liguria.it/geoservices/apps/viewer/pages/apps/download/index.html?id=2100',
          risultati: vincoli,
          nota: vincoli.length === 0 ? 'Nessun vincolo OPE LEGIS rilevato nel layer regionale. Verificare sempre sul viewer ufficiale.' : null,
        },
        rischio_idrogeologico: {
          titolo: 'PAI - Rischio Idraulico e Idrogeologico',
          fonte: 'Piano di Bacino Regionale Liguria - dataset M450',
          url_viewer: 'https://srvcarto.regione.liguria.it/geoservices/apps/viewer/pages/apps/geoportale/',
          risultati: rischioItems,
          nota: rischioItems.length === 0 ? 'Area non inclusa nelle zone a rischio censite nel PAI regionale.' : null,
        },
        sismica: {
          titolo: 'Classificazione Sismica',
          fonte: 'DGR Liguria - Classificazione sismica dei comuni',
          url_riferimento: 'https://www.regione.liguria.it/homepage-protezione-civile/come-fare-per/classificazione-sismica-regionale.html',
          ...sismica,
        },
        zona_urbanistica: {
          titolo: 'Zona Urbanistica (PUC/PRG)',
          nota: 'I dati di zonizzazione urbanistica non sono disponibili tramite WFS regionale aggregato. Ogni comune gestisce il proprio piano.',
          url_geoportale: 'https://srvcarto.regione.liguria.it/geoservices/apps/viewer/pages/apps/geoportale/',
          url_catalogo: 'https://geoportal.regione.liguria.it/catalogo/mappe.html',
        },
      },
      data_elaborazione: new Date().toISOString(),
    };

    // 7. Update CadastralQuery
    const existingReportData = query.report_data || {};
    await base44.entities.CadastralQuery.update(query_id, {
      status: 'completed',
      report_data: { ...existingReportData, wfs_liguria: report_data_wfs },
      note: `WFS Liguria (geoservizi.regione.liguria.it) completato il ${new Date().toLocaleDateString('it-IT')}. Vincoli: ${vincoli.length}, PAI: ${rischioItems.length}, Sismica zona ${zonaSismica}.`,
    });

    return Response.json({ success: true, report: report_data_wfs });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});