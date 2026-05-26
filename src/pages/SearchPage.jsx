import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { catasto_resolver } from "@/functions/catasto_resolver";
import CadastralSearchForm from "@/components/search/CadastralSearchForm.jsx";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Shield, Info, Search, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

export default function SearchPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const navigate = useNavigate();

  const { data: credits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.UserCredits.filter({ user_email: user.email });
      return list[0] || { balance: 0 };
    },
  });

  const handleSearch = async (formData) => {
    setIsLoading(true);
    if (formData._batch) {
      await handleBatchSearch(formData);
    } else {
      await handleSingleSearch(formData);
    }
    setIsLoading(false);
  };

  const handleSingleSearch = async (formData) => {
    // NEW FEATURE: process planimetria if uploaded
    let planimetriaData = null;
    let superficieEffettiva = formData.superficie_manuale || null;
    if (formData.planimetriaFile) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: formData.planimetriaFile });
        const extracted = await base44.integrations.Core.InvokeLLM({
          prompt: `Sei un esperto di planimetrie catastali italiane. Analizza questa planimetria e estrai: superficie totale in mq, numero di vani/stanze, presenza di balconi/terrazze con relativa superficie se indicata, scala del disegno se leggibile. Se non riesci a leggere chiaramente la planimetria, imposta tutti i valori a null.`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              superficie_mq: { type: "number" },
              vani: { type: "number" },
              balconi_mq: { type: "number" },
              scala: { type: "string" },
              leggibile: { type: "boolean" },
              note: { type: "string" },
            }
          }
        });
        if (extracted?.superficie_mq) {
          planimetriaData = { ...extracted, source: 'planimetria_upload', file_url, was_uploaded: true };
          if (!superficieEffettiva) superficieEffettiva = extracted.superficie_mq;
        } else {
          planimetriaData = { leggibile: false, file_url, source: 'planimetria_upload', was_uploaded: true };
        }
      } catch (e) {
        console.warn('Planimetria processing failed:', e);
      }
    }
    // Inject actual surface into formData for financial analysis
    const enrichedFormData = superficieEffettiva
      ? { ...formData, superficie: String(superficieEffettiva) }
      : formData;
    const { prezzo_acquisto, superficie, stato_conservativo, destinazione_obiettivo, spese_accessorie,
      categoria_catastale, superficie_mq, rendita_catastale, vani, indirizzo_catastale,
      visura_uploaded, intestatari_visura, ...cadastralData } = enrichedFormData;
    const fin_data = { prezzo_acquisto, superficie, stato_conservativo, destinazione_obiettivo, spese_accessorie };

    const enrichment = await callUrbiCheckEnrichment(enrichedFormData);
    const reportData = await generateReport(enrichedFormData, enrichment);

    // Geocoding Google sempre prioritario: sovrascrive sempre centroid_lat/lng
    const geocodingCoords = enrichment?.geocoding?.lat ? {
      centroid_lat: enrichment.geocoding.lat,
      centroid_lng: enrichment.geocoding.lon ?? enrichment.geocoding.lng ?? null,
    } : {};

    const query = await base44.entities.CadastralQuery.create({
      ...cadastralData,
      status: "pending",
      report_data: { ...reportData, fin_data, planimetria_data: planimetriaData },
      cost: 9.90,
      ...geocodingCoords,
      ...(superficieEffettiva ? { superficie_mq: superficieEffettiva } : {}),
      ...(visura_uploaded ? { categoria_catastale, superficie_mq, rendita_catastale, vani, indirizzo_catastale, visura_uploaded: true } : {}),
    });

    // Override esplicito geocoding — sovrascrive SEMPRE centroid dopo create (qualsiasi source)
    if (enrichment?.geocoding?.lat && enrichment?.geocoding?.lon) {
      base44.entities.CadastralQuery.update(query.id, {
        centroid_lat: enrichment.geocoding.lat,
        centroid_lng: enrichment.geocoding.lon,
      }).catch(() => {});
    }

    catasto_resolver({
      nome_comune: formData.comune, regione: formData.regione,
      foglio: formData.foglio, particella: formData.particella,
      sezione: formData.sezione_catastale || undefined,
      indirizzo_immobile: formData.indirizzo_immobile || undefined,
      query_id: query.id,
    }).catch(() => {});

    navigate(`/report/${query.id}`);
  };

  const handleBatchSearch = async (formData) => {
    const { units, _batch, bulkPricing, prezzo_acquisto, superficie, stato_conservativo, destinazione_obiettivo,
      spese_accessorie, categoria_catastale, superficie_mq, rendita_catastale, vani, indirizzo_catastale,
      visura_uploaded, intestatari_visura, ...sharedCadastral } = formData;

    const pricePerUnit = bulkPricing?.pricePerUnit || 2.99;
    const fin_data = { prezzo_acquisto, superficie, stato_conservativo, destinazione_obiettivo, spese_accessorie };
    const visuraExtra = visura_uploaded ? { categoria_catastale, superficie_mq, rendita_catastale, vani, indirizzo_catastale, visura_uploaded: true } : {};

    // Build label — use explicit label if provided (e.g. from multi-sub visura)
    const batchLabel = formData.label ||
      (units.every(u => u.foglio === units[0].foglio && u.particella === units[0].particella)
        ? `Palazzina ${sharedCadastral.comune} F.${units[0].foglio} P.${units[0].particella} — ${units.length} subalterni`
        : `${sharedCadastral.comune} — ${units.length} unità`);

    const batchRecord = await base44.entities.BatchQuery.create({
      comune: sharedCadastral.comune,
      comune_id: sharedCadastral.comune_id,
      regione: sharedCadastral.regione,
      provincia: sharedCadastral.provincia,
      total_units: units.length,
      completed_units: 0,
      failed_units: 0,
      status: "processing",
      finalita: sharedCadastral.finalita,
      label: batchLabel,
      query_ids: [],
    });

    // Per-unit price allocation from total acquisition price
    const totalAcquisitionPrice = parseFloat(formData.total_acquisition_price) || 0;
    const unitSurfaces = units.map(u => parseFloat(u.superficie_mq) || (parseFloat(u.vani) * 27) || 0);
    const totalSupBatch = unitSurfaces.reduce((s, v) => s + v, 0);
    const getAllocatedPrice = (i) => {
      if (!totalAcquisitionPrice) return null;
      if (totalSupBatch > 0 && unitSurfaces[i] > 0)
        return +(totalAcquisitionPrice * (unitSurfaces[i] / totalSupBatch)).toFixed(2);
      return +(totalAcquisitionPrice / units.length).toFixed(2); // equal fallback
    };

    // Chiama il microservizio una volta per il batch (livello edificio)
    const batchEnrichment = await callUrbiCheckEnrichment(sharedCadastral);

    const queryIds = [];
    const results = [];
    setBatchProgress({ current: 0, total: units.length, results: [] });

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      setBatchProgress(prev => ({
        ...prev,
        current: i + 1,
        label: `Elaborazione ${i + 1}/${units.length} — F.${unit.foglio} P.${unit.particella}${unit.subalterno ? ` Sub.${unit.subalterno}` : ''}`,
      }));

      try {
        const reportData = await generateReport({ ...sharedCadastral, ...unit }, batchEnrichment);

        // Per-unit catastral data from visura (overrides shared)
        const unitCatastral = unit.categoria_catastale || unit.superficie_mq || unit.rendita_catastale || unit.vani
          ? {
              categoria_catastale: unit.categoria_catastale,
              superficie_mq: unit.superficie_mq,
              rendita_catastale: unit.rendita_catastale,
              vani: unit.vani,
              visura_uploaded: true,
            }
          : visuraExtra;

        const prezzoUnitaAllocato = getAllocatedPrice(i);
        // Geocoding Google sempre prioritario: sovrascrive sempre centroid_lat/lng
        const batchGeoCoords = batchEnrichment?.geocoding?.lat ? {
          centroid_lat: batchEnrichment.geocoding.lat,
          centroid_lng: batchEnrichment.geocoding.lon ?? batchEnrichment.geocoding.lng ?? null,
        } : {};

        const query = await base44.entities.CadastralQuery.create({
          ...sharedCadastral, ...unit,
          status: "pending",
          report_data: {
            ...reportData, fin_data,
            ...(prezzoUnitaAllocato ? { prezzo_acquisto_unita: prezzoUnitaAllocato } : {}),
          },
          cost: pricePerUnit,
          batch_id: batchRecord.id,
          ...unitCatastral,
          ...batchGeoCoords,
        });

        // Override esplicito geocoding per unità batch — sovrascrive SEMPRE (qualsiasi source)
        if (batchGeoCoords.centroid_lat) {
          base44.entities.CadastralQuery.update(query.id, batchGeoCoords).catch(() => {});
        }

        queryIds.push(query.id);
        results.push({ queryId: query.id, unit, success: true });

        catasto_resolver({
          nome_comune: sharedCadastral.comune, regione: sharedCadastral.regione,
          foglio: unit.foglio, particella: unit.particella,
          sezione: unit.sezione_catastale || undefined,
          indirizzo_immobile: unit.indirizzo_immobile || undefined,
          query_id: query.id,
        }).catch(() => {});

      } catch (err) {
        console.error(`Batch unit ${i + 1} failed:`, err);
        results.push({ unit, success: false, error: err.message });
      }

      setBatchProgress(prev => ({ ...prev, results: [...results] }));
    }

    const completedCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    // Geocoding sempre prioritario per BatchQuery: sovrascrive sempre
    const batchUpdateGeo = batchEnrichment?.geocoding?.lat ? {
      centroid_lat: batchEnrichment.geocoding.lat,
      centroid_lng: batchEnrichment.geocoding.lon ?? batchEnrichment.geocoding.lng ?? null,
      geocoding_source: batchEnrichment.geocoding.source || null,
    } : {};

    await base44.entities.BatchQuery.update(batchRecord.id, {
      query_ids: queryIds,
      completed_units: completedCount,
      failed_units: failedCount,
      status: failedCount === units.length ? 'failed' : failedCount > 0 ? 'partial' : 'completed',
      ...(totalAcquisitionPrice > 0 ? { total_acquisition_price: totalAcquisitionPrice } : {}),
      ...(totalSupBatch > 0 ? { total_superficie_mq: totalSupBatch } : {}),
      ...batchUpdateGeo,
    });

    // ── Charge batch credits once + set paid=true on all queries ──────────
    if (queryIds.length > 0) {
      try {
        const user = await base44.auth.me();
        const creditsList = await base44.entities.UserCredits.filter({ user_email: user.email });
        const credits = creditsList[0];
        const totalCost = +(pricePerUnit * queryIds.length).toFixed(2);

        if (credits && credits.balance >= totalCost) {
          await base44.entities.UserCredits.update(credits.id, {
            balance: +(credits.balance - totalCost).toFixed(2),
            total_spent: +((credits.total_spent || 0) + totalCost).toFixed(2),
            total_queries: (credits.total_queries || 0) + queryIds.length,
          });
          await base44.entities.CreditTransaction.create({
            user_email: user.email,
            type: 'query_charge',
            amount: -totalCost,
            description: `Batch ${queryIds.length} unità — ${sharedCadastral.comune} (€${pricePerUnit.toFixed(2)}/ud)`,
          });
          // Set paid=true on all batch queries in parallel
          await Promise.all(queryIds.map(qid =>
            base44.entities.CadastralQuery.update(qid, { paid: true })
          ));
        }
      } catch (e) {
        console.error('Batch charge error:', e);
      }
    }

    navigate(`/batch/${batchRecord.id}`);
  };

  // Batch progress overlay
  if (batchProgress && isLoading) {
    return (
      <div className="p-6 lg:p-10 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-border rounded-xl p-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: '#1A3A6B' }}>
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1A3A6B', fontFamily: "'Libre Baskerville', serif" }}>
              Analisi batch in corso
            </h2>
            <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {batchProgress.label || `Elaborazione ${batchProgress.current}/${batchProgress.total}...`}
            </p>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%`, background: '#1A3A6B' }} />
          </div>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {batchProgress.current} / {batchProgress.total} unità elaborate
          </p>
          {batchProgress.results.length > 0 && (
            <div className="text-left space-y-1 max-h-40 overflow-y-auto">
              {batchProgress.results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {r.success
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  <span className={r.success ? 'text-emerald-700' : 'text-red-600'}>
                    F.{r.unit.foglio} P.{r.unit.particella}{r.unit.subalterno ? ` Sub.${r.unit.subalterno}` : ''}
                    {!r.success && ` — ${r.error}`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground italic" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Non chiudere questa finestra. L'analisi AI impiega 30–60s per unità.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-1" style={{ color: '#1A3A6B', fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' }}>
          Analisi Urbanistica
        </h1>
        <p className="mb-8 text-xs tracking-[1px] uppercase" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
          Anteprima gratuita immediata. Scheda completa <span className="font-semibold text-foreground">€9,90</span>.
          Analisi multi-unità per palazzine e portfolio.
        </p>
      </motion.div>

      <div className="bg-white p-6 lg:p-8" style={{ border: '1px solid #C4BAA8' }}>
        <ErrorBoundary>
          <CadastralSearchForm
            onSubmit={handleSearch}
            isLoading={isLoading}
            submitLabel="Ottieni anteprima gratuita →"
            userBalance={credits?.balance ?? null}
          />
        </ErrorBoundary>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
        <h2 className="text-[10px] font-semibold uppercase tracking-[2px] mb-4" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>Come funziona</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { n: "1", icon: Search, title: "Inserisci i dati catastali", desc: "Comune, foglio e particella. Aggiungi più subalterni per palazzine intere." },
            { n: "2", icon: Shield, title: "Anteprima gratuita istantanea", desc: "Ricevi subito zonizzazione, tipologia e presenza vincoli — gratis." },
            { n: "3", icon: Info, title: "Sblocca la scheda completa", desc: "€9,90 per unità singola. Sconti fino al -40% su analisi multi-unità." },
          ].map(({ n, icon: Icon, title, desc }) => (
            <div key={n} className="bg-white p-5 flex gap-4" style={{ border: '1px solid #C4BAA8' }}>
              <div className="w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ background: '#1A3A6B', color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
                {n}
              </div>
              <div>
                <p className="font-semibold text-xs uppercase tracking-[1px]" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>{title}</p>
                <p className="text-xs mt-1" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        urbicheck.it — Dati aggiornati da fonti GIS ufficiali regionali
      </div>
    </div>
  );
}

// ── Microservizio UrbiCheck enrichment ─────────────────────────────────────
async function callUrbiCheckEnrichment(formData, lat = null, lon = null) {
  try {
    const res = await Promise.race([
      fetch('https://web-production-6e951.up.railway.app/analyze', {
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
    console.warn('UrbiCheck microservice unavailable, using fallback');
    return null;
  }
}

// ── Merge enrichment vincoli into report data ────────────────────────────────
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

async function generateReport(formData, enrichment = null) {
  const finalitaMap = {
    acquisto_privato: "acquisto per uso privato/abitativo",
    investimento: "investimento immobiliare",
    sviluppo_immobiliare: "sviluppo e trasformazione immobiliare",
    asta_giudiziaria: "acquisto da asta giudiziaria (massima attenzione a CDU e conformità)",
    due_diligence: "due diligence professionale",
    valutazione_professionale: "valutazione professionale/perizia",
  };
  const finalitaDesc = finalitaMap[formData.finalita] || formData.finalita;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Sei un esperto urbanista e tecnico catastale italiano. Genera un report urbanistico-catastale per il seguente immobile.

Regione: ${formData.regione}
Provincia: ${formData.provincia || "N/D"}
Comune: ${formData.comune}
Foglio: ${formData.foglio}
Particella: ${formData.particella}
Subalterno: ${formData.subalterno || "N/D"}
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
${formData.finalita === "asta_giudiziaria" ? "IMPORTANTE: per asta giudiziaria aggiungi dettagli specifici sul CDU e conformità urbanistica." : ""}

REGOLA LINGUISTICA: Usa ESCLUSIVAMENTE terminologia tecnica italiana.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        zonizzazione: {
          type: "object",
          properties: {
            colore: { type: "string" },
            zona_codice: { type: "string" },
            descrizione: { type: "string" },
            destinazione_prevalente: { type: "string" }
          }
        },
        indici_edilizi: {
          type: "object",
          properties: {
            if_mc_mq: { type: "string" }, rc_percentuale: { type: "string" },
            h_max: { type: "string" }, distanza_confini: { type: "string" },
            distanza_fabbricati: { type: "string" }, distanza_strada: { type: "string" }
          }
        },
        fattibilita_interventi: {
          type: "array",
          items: { type: "object", properties: { tipo_intervento: { type: "string" }, fattibilita: { type: "string" }, note: { type: "string" } } }
        },
        dati_catastali: {
          type: "object",
          properties: {
            categoria: { type: "string" }, classe: { type: "string" },
            consistenza: { type: "string" }, rendita_catastale: { type: "string" },
            zona_censuaria: { type: "string" }, microzona: { type: "string" }, intestatari: { type: "string" }
          }
        },
        quadro_urbanistico: {
          type: "object",
          properties: {
            strumento_vigente: { type: "string" }, zona_urbanistica: { type: "string" },
            destinazione_uso: { type: "string" }, indice_edificabilita: { type: "string" },
            altezza_massima: { type: "string" }, distanze_minime: { type: "string" }, note_urbanistiche: { type: "string" }
          }
        },
        vincoli: {
          type: "object",
          properties: {
            vincolo_sismico: { type: "object", properties: { presente: { type: "boolean" }, zona: { type: "string" }, dettagli: { type: "string" } } },
            vincolo_idraulico: { type: "object", properties: { presente: { type: "boolean" }, classe_rischio: { type: "string" }, dettagli: { type: "string" } } },
            vincolo_paesaggistico: { type: "object", properties: { presente: { type: "boolean" }, tipo: { type: "string" }, dettagli: { type: "string" } } },
            vincolo_archeologico: { type: "object", properties: { presente: { type: "boolean" }, dettagli: { type: "string" } } },
            altri_vincoli: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, presente: { type: "boolean" }, dettagli: { type: "string" } } } }
          }
        },
        pratiche_necessarie: {
          type: "array",
          items: { type: "object", properties: { tipo_intervento: { type: "string" }, pratica_richiesta: { type: "string" }, ente_competente: { type: "string" }, tempistica_stimata: { type: "string" }, costi_stimati: { type: "string" }, note: { type: "string" } } }
        },
        accesso_atti: {
          type: "object",
          properties: {
            ufficio_catasto: { type: "string" }, ufficio_urbanistica: { type: "string" }, ufficio_edilizia: { type: "string" },
            documenti_ottenibili: { type: "array", items: { type: "string" } }, modalita_accesso: { type: "string" }
          }
        },
        valutazione_sintetica: {
          type: "object",
          properties: {
            livello_complessita: { type: "string" },
            criticita_principali: { type: "array", items: { type: "string" } },
            opportunita: { type: "array", items: { type: "string" } },
            raccomandazioni: { type: "array", items: { type: "string" } }
          }
        }
      }
    }
  });

  return mergeEnrichment(result, enrichment);
}