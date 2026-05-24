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
    const reportData = await generateReport(formData);
    const { prezzo_acquisto, superficie, stato_conservativo, destinazione_obiettivo, spese_accessorie,
      categoria_catastale, superficie_mq, rendita_catastale, vani, indirizzo_catastale,
      visura_uploaded, intestatari_visura, ...cadastralData } = formData;
    const fin_data = { prezzo_acquisto, superficie, stato_conservativo, destinazione_obiettivo, spese_accessorie };

    const query = await base44.entities.CadastralQuery.create({
      ...cadastralData,
      status: "pending",
      report_data: { ...reportData, fin_data },
      cost: 9.90,
      ...(visura_uploaded ? { categoria_catastale, superficie_mq, rendita_catastale, vani, indirizzo_catastale, visura_uploaded: true } : {}),
    });

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
      label: `${sharedCadastral.comune} — ${units.length} unità`,
      query_ids: [],
    });

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
        const reportData = await generateReport({ ...sharedCadastral, ...unit });

        const query = await base44.entities.CadastralQuery.create({
          ...sharedCadastral, ...unit,
          status: "pending",
          report_data: { ...reportData, fin_data },
          cost: pricePerUnit,
          batch_id: batchRecord.id,
          ...visuraExtra,
        });

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

    await base44.entities.BatchQuery.update(batchRecord.id, {
      query_ids: queryIds,
      completed_units: completedCount,
      failed_units: failedCount,
      status: failedCount === units.length ? 'failed' : failedCount > 0 ? 'partial' : 'completed',
    });

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

async function generateReport(formData) {
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

  return result;
}