import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── createAnonymousReport ─────────────────────────────────────────────────────
// Genera UN report completo per un utente ANONIMO (senza registrazione), come i
// primi 3 report gratuiti, limitato per IP (FreeUsageIP). NON tocca il flusso a
// pagamento (chargeReport resta invariato). Riusa l'infra del public token:
// ritorna /report/public/:id?token= visibile senza login.
// Regola prodotto: 3 report gratis per IP, poi si invita a registrarsi/pagare.

const APP_URL = Deno.env.get('APP_URL') || 'https://urbicheck.it';
const ENRICHMENT_API_URL = 'https://web-production-6e951.up.railway.app';
const FREE_REPORTS_IP = 3;

function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown';
}

// Enrichment dal microservizio Railway (stessa logica di callUrbiCheckEnrichment lato client)
async function callUrbiCheckEnrichment(formData, lat = null, lon = null) {
  try {
    const res = await Promise.race([
      fetch(`${ENRICHMENT_API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comune: formData.comune,
          provincia: formData.provincia || null,
          regione: formData.regione || null,
          indirizzo: formData.indirizzo_immobile || null,
          lat: lat || null,
          lon: lon || null,
        }),
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
    ]);
    if (!res.ok) return null;
    return await res.json();
  } catch (_e) {
    return null;
  }
}

// Merge vincoli enrichment nel report (stessa logica di mergeEnrichment lato client)
function mergeEnrichment(reportData, enrichment) {
  if (!enrichment) return reportData;
  const vincoli = { ...(reportData.vincoli || {}) };

  if (enrichment.vincolo_sismico) {
    vincoli.vincolo_sismico = {
      presente: true,
      zona: String(enrichment.vincolo_sismico.zona || ''),
      dettagli: enrichment.vincolo_sismico.descrizione || '',
      fonte: enrichment.vincolo_sismico.fonte || 'Microservizio UrbiCheck',
    };
  }
  if (enrichment.vincolo_ferroviario) {
    vincoli.vincolo_ferroviario = {
      presente: enrichment.vincolo_ferroviario.presente || false,
      distanza_m: enrichment.vincolo_ferroviario.distanza_m || null,
      ferrovia: enrichment.vincolo_ferroviario.ferrovia || null,
      tipo: enrichment.vincolo_ferroviario.tipo || 'assente',
      legge: enrichment.vincolo_ferroviario.legge || 'DPR 753/1980',
      dettagli: enrichment.vincolo_ferroviario.tipo === 'assoluta'
        ? `Fascia assoluta 30m — edificazione vietata (DPR 753/1980 art. 49). Distanza: ${enrichment.vincolo_ferroviario.distanza_m}m`
        : enrichment.vincolo_ferroviario.tipo === 'limitata'
        ? `Fascia limitata 150m — interventi soggetti ad autorizzazione RFI. Distanza: ${enrichment.vincolo_ferroviario.distanza_m}m`
        : `Nessuna ferrovia entro 200m`,
    };
  }
  if (enrichment.vincolo_pai) {
    vincoli.vincolo_pai = {
      link_verifica: enrichment.vincolo_pai.link_verifica || null,
      nota: enrichment.vincolo_pai.nota || null,
    };
  }
  if (enrichment.overpass_infra) {
    vincoli.overpass_infra = enrichment.overpass_infra;
  }
  return { ...reportData, vincoli, _enrichment_source: 'urbicheck_microservice' };
}

// Generazione report via InvokeLLM (stesso prompt/schema di generateReport lato client)
async function generateReport(base44, formData, enrichment = null) {
  const finalitaMap = {
    acquisto_privato: 'acquisto per uso privato/abitativo',
    investimento: 'investimento immobiliare',
    sviluppo_immobiliare: 'sviluppo e trasformazione immobiliare',
    asta_giudiziaria: 'acquisto da asta giudiziaria (massima attenzione a CDU e conformità)',
    due_diligence: 'due diligence professionale',
    valutazione_professionale: 'valutazione professionale/perizia',
  };
  const finalitaDesc = finalitaMap[formData.finalita] || formData.finalita || finalitaMap.acquisto_privato;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Sei un esperto urbanista e tecnico catastale italiano. Genera un report urbanistico-catastale per il seguente immobile.

Regione: ${formData.regione}
Provincia: ${formData.provincia || 'N/D'}
Comune: ${formData.comune}
Foglio: ${formData.foglio}
Particella: ${formData.particella}
Subalterno: ${formData.subalterno || 'N/D'}
Finalità analisi: ${finalitaDesc}

REGOLA ASSOLUTA — NESSUN DATO INVENTATO:
NON inventare mai dati catastali specifici come: nomi di intestatari, rendita catastale esatta, numero di vani, codici zona specifici (es. B1, C2), valori precisi di IF/RC/H max, classe catastale numerica.
Questi dati esistono solo nelle banche dati ufficiali (Catasto AdE, PRG comunale) e NON possono essere generati dall'AI.

Per i seguenti campi usa SEMPRE queste stringhe standard se non hai dati reali verificati:
- intestatari: "Richiedi visura ufficiale AdE"
- rendita_catastale: "Disponibile su visura ufficiale AdE"
- if_mc_mq: "Stima orientativa — verificare su NTA/PRG Comunale"
- rc_percentuale: "Stima orientativa — verificare su NTA/PRG Comunale"
- h_max: "Stima orientativa — verificare su NTA/PRG Comunale"
- zona_codice: usa un valore generico come "Zona residenziale" o "Zona agricola"

Per la categoria catastale puoi indicare la tipologia generale basandoti sul contesto.
Per la colore zonizzazione (verde/giallo/rosso) puoi fare una stima orientativa.
Per i vincoli puoi indicare presenza/assenza SOLO se hai informazioni certe per quella regione/comune.
${formData.finalita === 'asta_giudiziaria' ? 'IMPORTANTE: per asta giudiziaria aggiungi dettagli specifici sul CDU e conformità urbanistica.' : ''}

REGOLA LINGUISTICA: Usa ESCLUSIVAMENTE terminologia tecnica italiana.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: 'object',
      properties: {
        zonizzazione: {
          type: 'object',
          properties: {
            colore: { type: 'string' }, zona_codice: { type: 'string' },
            descrizione: { type: 'string' }, destinazione_prevalente: { type: 'string' },
          },
        },
        indici_edilizi: {
          type: 'object',
          properties: {
            if_mc_mq: { type: 'string' }, rc_percentuale: { type: 'string' },
            h_max: { type: 'string' }, distanza_confini: { type: 'string' },
            distanza_fabbricati: { type: 'string' }, distanza_strada: { type: 'string' },
          },
        },
        fattibilita_interventi: {
          type: 'array',
          items: { type: 'object', properties: { tipo_intervento: { type: 'string' }, fattibilita: { type: 'string' }, note: { type: 'string' } } },
        },
        dati_catastali: {
          type: 'object',
          properties: {
            categoria: { type: 'string' }, classe: { type: 'string' },
            consistenza: { type: 'string' }, rendita_catastale: { type: 'string' },
            zona_censuaria: { type: 'string' }, microzona: { type: 'string' }, intestatari: { type: 'string' },
          },
        },
        quadro_urbanistico: {
          type: 'object',
          properties: {
            strumento_vigente: { type: 'string' }, zona_urbanistica: { type: 'string' },
            destinazione_uso: { type: 'string' }, indice_edificabilita: { type: 'string' },
            altezza_massima: { type: 'string' }, distanze_minime: { type: 'string' }, note_urbanistiche: { type: 'string' },
          },
        },
        vincoli: {
          type: 'object',
          properties: {
            vincolo_sismico: { type: 'object', properties: { presente: { type: 'boolean' }, zona: { type: 'string' }, dettagli: { type: 'string' } } },
            vincolo_idraulico: { type: 'object', properties: { presente: { type: 'boolean' }, classe_rischio: { type: 'string' }, dettagli: { type: 'string' } } },
            vincolo_paesaggistico: { type: 'object', properties: { presente: { type: 'boolean' }, tipo: { type: 'string' }, dettagli: { type: 'string' } } },
            vincolo_archeologico: { type: 'object', properties: { presente: { type: 'boolean' }, dettagli: { type: 'string' } } },
            altri_vincoli: { type: 'array', items: { type: 'object', properties: { nome: { type: 'string' }, presente: { type: 'boolean' }, dettagli: { type: 'string' } } } },
          },
        },
        pratiche_necessarie: {
          type: 'array',
          items: { type: 'object', properties: { tipo_intervento: { type: 'string' }, pratica_richiesta: { type: 'string' }, ente_competente: { type: 'string' }, tempistica_stimata: { type: 'string' }, costi_stimati: { type: 'string' }, note: { type: 'string' } } },
        },
        accesso_atti: {
          type: 'object',
          properties: {
            ufficio_catasto: { type: 'string' }, ufficio_urbanistica: { type: 'string' }, ufficio_edilizia: { type: 'string' },
            documenti_ottenibili: { type: 'array', items: { type: 'string' } }, modalita_accesso: { type: 'string' },
          },
        },
        valutazione_sintetica: {
          type: 'object',
          properties: {
            livello_complessita: { type: 'string' },
            criticita_principali: { type: 'array', items: { type: 'string' } },
            opportunita: { type: 'array', items: { type: 'string' } },
            raccomandazioni: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  });

  return mergeEnrichment(result, enrichment);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const formData = body?.formData || body || {};

    // Validazione minima
    if (!formData.comune || !formData.foglio || !formData.particella) {
      return Response.json({ ok: false, error: 'comune, foglio e particella sono obbligatori' }, { status: 400 });
    }

    // ── Limite anti-abuso per IP (riusa FreeUsageIP, come chargeReport) ──────
    const clientIp = getClientIp(req);
    let ipRecord = null;
    let ipFreeUsed = 0;
    if (clientIp && clientIp !== 'unknown') {
      const ipList = await base44.asServiceRole.entities.FreeUsageIP.filter({ ip_address: clientIp });
      ipRecord = ipList[0] || null;
      ipFreeUsed = ipRecord?.free_count || 0;
    }
    if (clientIp !== 'unknown' && ipFreeUsed >= FREE_REPORTS_IP) {
      return Response.json({
        ok: false,
        limit_reached: true,
        message: 'Hai già usato le 3 analisi gratuite. Registrati o attiva un report per continuare.',
      }, { status: 200 });
    }

    // ── Coordinate opzionali dalla ricerca per indirizzo ────────────────────
    const lat = Number(formData.prefill_lat ?? formData.centroid_lat);
    const lon = Number(formData.prefill_lon ?? formData.centroid_lng);
    const hasCoord = isFinite(lat) && isFinite(lon) && lat > 35 && lat < 48 && lon > 6 && lon < 19;

    // ── Genera il report (enrichment + InvokeLLM) ───────────────────────────
    const enrichment = await callUrbiCheckEnrichment(formData, hasCoord ? lat : null, hasCoord ? lon : null);
    const reportData = await generateReport(base44, formData, enrichment);

    // ── Crea la CadastralQuery (service role, già "pagata" a costo 0) ────────
    const query = await base44.asServiceRole.entities.CadastralQuery.create({
      comune: formData.comune,
      provincia: formData.provincia || null,
      regione: formData.regione || null,
      foglio: formData.foglio,
      particella: formData.particella,
      subalterno: formData.subalterno || null,
      sezione_catastale: formData.sezione_catastale || null,
      indirizzo_immobile: formData.indirizzo_immobile || null,
      finalita: formData.finalita || 'acquisto_privato',
      status: 'completed',
      paid: true,
      cost: 0,
      report_data: { ...reportData, fin_data: {} },
      ...(hasCoord ? { centroid_lat: lat, centroid_lng: lon } : {}),
    });

    // ── Public token + URL (72h), riusa l'infra esistente ───────────────────
    const token = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const reportUrl = `${APP_URL}/report/public/${query.id}?token=${token}`;
    await base44.asServiceRole.entities.CadastralQuery.update(query.id, {
      public_token: token,
      token_expires_at: expiresAt,
      report_url: reportUrl,
    });

    // ── Incrementa il contatore free per IP ─────────────────────────────────
    if (clientIp && clientIp !== 'unknown') {
      if (ipRecord) {
        await base44.asServiceRole.entities.FreeUsageIP.update(ipRecord.id, {
          free_count: ipFreeUsed + 1,
          last_used: new Date().toISOString(),
        });
      } else {
        await base44.asServiceRole.entities.FreeUsageIP.create({
          ip_address: clientIp,
          free_count: 1,
          last_used: new Date().toISOString(),
        });
      }
    }

    return Response.json({
      ok: true,
      query_id: query.id,
      report_url: reportUrl,
      public_token: token,
      free_reports_used_ip: ipFreeUsed + 1,
      free_reports_total: FREE_REPORTS_IP,
    });
  } catch (error) {
    console.error('createAnonymousReport error:', error);
    return Response.json({ ok: false, error: error?.message || 'errore interno' }, { status: 500 });
  }
});
