import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import CadastralSearchForm from "@/components/search/CadastralSearchForm.jsx";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Shield, Info, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function SearchPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (formData) => {
    setIsLoading(true);

    // Fase 1 — anteprima gratuita: genera report e salva come "pending" (nessun addebito)
    const reportData = await generateReport(formData);

    // Separa i dati finanziari (non catastali) dal payload principale
    const { prezzo_acquisto, superficie, stato_conservativo, destinazione_obiettivo, spese_accessorie, ...cadastralData } = formData;
    const fin_data = { prezzo_acquisto, superficie, stato_conservativo, destinazione_obiettivo, spese_accessorie };

    const query = await base44.entities.CadastralQuery.create({
      ...cadastralData,
      status: "pending",
      report_data: { ...reportData, fin_data },
      cost: 9.90,
    });

    setIsLoading(false);
    navigate(`/report/${query.id}`);
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-1" style={{ color: '#1A3A6B', fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' }}>
          Analisi Urbanistica
        </h1>
        <p className="mb-8 text-xs tracking-[1px] uppercase" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
          Ottieni un'<span className="font-semibold text-foreground">anteprima gratuita</span> immediata. Sblocca la scheda completa per <span className="font-semibold text-foreground">€9,90</span>.
        </p>
      </motion.div>

      <div className="bg-white p-6 lg:p-8" style={{ border: '1px solid #C4BAA8' }}>
        <ErrorBoundary>
          <CadastralSearchForm
            onSubmit={handleSearch}
            isLoading={isLoading}
            disabled={false}
            submitLabel="Ottieni anteprima gratuita →"
          />
        </ErrorBoundary>
      </div>

      {/* Come funziona */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8"
      >
        <h2 className="text-[10px] font-semibold uppercase tracking-[2px] mb-4" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>Come funziona</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { n: "1", icon: Search, title: "Inserisci i dati catastali", desc: "Regione, comune, foglio e particella. Bastano 30 secondi." },
            { n: "2", icon: Shield, title: "Anteprima gratuita istantanea", desc: "Ricevi subito zonizzazione, tipologia e presenza vincoli — gratis." },
            { n: "3", icon: Info, title: "Sblocca la scheda completa", desc: "€9,90 per tutti gli indici edilizi, fattibilità interventi e dettaglio vincoli." },
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

      {/* Footer */}
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
- distanza_confini: "Verificare su NTA/PRG Comunale"
- distanza_fabbricati: "Verificare su NTA/PRG Comunale"
- distanza_strada: "Verificare su NTA/PRG Comunale"
- zona_censuaria: "Verificare su visura catastale ufficiale"
- microzona: "Verificare su visura catastale ufficiale"
- zona_codice: usa un valore generico come "Zona residenziale" o "Zona agricola" — NON inventare codici alfanumerici specifici

Per la categoria catastale puoi indicare la tipologia generale (es. "Abitazione civile", "Terreno agricolo", "Immobile commerciale") basandoti sul contesto, ma NON specificare sottocategorie (A/2, C/6, ecc.) a meno che non siano verificabili.

Per la colore zonizzazione (verde/giallo/rosso) puoi fare una stima orientativa basata sulla destinazione d'uso prevalente.
Per la descrizione zonizzazione puoi descrivere il contesto urbanistico generale del comune.
Per i vincoli (sismico, idraulico, paesaggistico) puoi indicare presenza/assenza SOLO se hai informazioni certe per quella regione/comune. In caso di dubbio imposta presente: false.
Per fattibilità_interventi genera dati realistici basati sulla tipologia dell'immobile.
Per pratiche_necessarie e accesso_atti genera dati realistici basati sulla normativa italiana vigente.
${formData.finalita === "asta_giudiziaria" ? "IMPORTANTE: per asta giudiziaria aggiungi dettagli specifici sul CDU, conformità urbanistica e guida accesso atti." : ""}

REGOLA LINGUISTICA — ITALIANO TECNICO URBANISTICO:
Usa ESCLUSIVAMENTE terminologia tecnica italiana. NON tradurre dall'inglese.
- "Distanza dai confini" (NON "setback")
- "Indice di Fabbricabilità (IF)" in mc/mq
- "Rapporto di Copertura (RC)" in %
- "Altezza Massima (H max)" in metri
- "Destinazione d'uso" (NON "land use")
- "Permesso di costruire" (NON "building permit")`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        zonizzazione: {
          type: "object",
          properties: {
            colore: { type: "string", description: "verde, giallo, o rosso - indica fattibilità generale" },
            zona_codice: { type: "string", description: "es. B1, C2, A, D1..." },
            descrizione: { type: "string", description: "descrizione estesa della zona urbanistica" },
            destinazione_prevalente: { type: "string" }
          }
        },
        indici_edilizi: {
          type: "object",
          properties: {
            if_mc_mq: { type: "string" },
            rc_percentuale: { type: "string" },
            h_max: { type: "string" },
            distanza_confini: { type: "string" },
            distanza_fabbricati: { type: "string" },
            distanza_strada: { type: "string" }
          }
        },
        fattibilita_interventi: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tipo_intervento: { type: "string" },
              fattibilita: { type: "string", description: "fattibile, con_autorizzazione, non_fattibile" },
              note: { type: "string" }
            }
          }
        },
        dati_catastali: {
          type: "object",
          properties: {
            categoria: { type: "string" },
            classe: { type: "string" },
            consistenza: { type: "string" },
            rendita_catastale: { type: "string" },
            zona_censuaria: { type: "string" },
            microzona: { type: "string" },
            intestatari: { type: "string" }
          }
        },
        quadro_urbanistico: {
          type: "object",
          properties: {
            strumento_vigente: { type: "string" },
            zona_urbanistica: { type: "string" },
            destinazione_uso: { type: "string" },
            indice_edificabilita: { type: "string" },
            altezza_massima: { type: "string" },
            distanze_minime: { type: "string" },
            note_urbanistiche: { type: "string" }
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
          items: {
            type: "object",
            properties: {
              tipo_intervento: { type: "string" },
              pratica_richiesta: { type: "string" },
              ente_competente: { type: "string" },
              tempistica_stimata: { type: "string" },
              costi_stimati: { type: "string" },
              note: { type: "string" }
            }
          }
        },
        accesso_atti: {
          type: "object",
          properties: {
            ufficio_catasto: { type: "string" },
            ufficio_urbanistica: { type: "string" },
            ufficio_edilizia: { type: "string" },
            documenti_ottenibili: { type: "array", items: { type: "string" } },
            modalita_accesso: { type: "string" }
          }
        },
        valutazione_sintetica: {
          type: "object",
          properties: {
            livello_complessita: { type: "string", description: "Basso, Medio, Alto" },
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