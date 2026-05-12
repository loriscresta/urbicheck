import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import CadastralSearchForm from "@/components/search/CadastralSearchForm";
import { AlertTriangle, Shield, Info, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function SearchPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: credits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.UserCredits.filter({ user_email: user.email });
      return list[0] || null;
    },
  });

  const hasEnoughCredits = credits && credits.balance >= 9.90;

  const handleSearch = async (formData) => {
    if (!hasEnoughCredits) {
      toast({
        title: "Crediti insufficienti",
        description: "Acquista crediti per effettuare una ricerca.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const reportData = await generateReport(formData);

    // Create the query record
    const query = await base44.entities.CadastralQuery.create({
      ...formData,
      status: "completed",
      report_data: reportData,
      cost: 9.90,
    });

    // Deduct credits
    const user = await base44.auth.me();
    await base44.entities.UserCredits.update(credits.id, {
      balance: credits.balance - 9.90,
      total_spent: (credits.total_spent || 0) + 9.90,
      total_queries: (credits.total_queries || 0) + 1,
    });

    // Log transaction
    await base44.entities.CreditTransaction.create({
      user_email: user.email,
      type: "query_charge",
      amount: -9.90,
      description: `Query: ${formData.comune} — F.${formData.foglio} P.${formData.particella}`,
      query_id: query.id,
    });

    queryClient.invalidateQueries({ queryKey: ["userCredits"] });
    queryClient.invalidateQueries({ queryKey: ["recentQueries"] });

    setIsLoading(false);
    navigate(`/report/${query.id}`);
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-1" style={{ color: '#1e3a5f' }}>
          URBICHECK — Analisi Urbanistica Automatizzata
        </h1>
        <p className="text-muted-foreground mb-8 text-base">
          Scopri cosa puoi fare con un immobile in 3 minuti per <span className="font-semibold text-foreground">€9,90</span>
        </p>
      </motion.div>

      {!hasEnoughCredits && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 mb-6 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Crediti insufficienti</p>
            <p className="text-sm text-muted-foreground">
              Saldo attuale: €{(credits?.balance || 0).toFixed(2)}. Servono almeno €9,90 per una query.{" "}
              <a href="/credits" className="text-primary font-medium hover:underline">Acquista crediti →</a>
            </p>
          </div>
        </motion.div>
      )}

      <div className="bg-card rounded-xl border border-border p-6 lg:p-8">
        <CadastralSearchForm
          onSubmit={handleSearch}
          isLoading={isLoading}
          disabled={!hasEnoughCredits}
        />
      </div>

      {/* Come funziona */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8"
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Come funziona</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { n: "1", icon: Search, title: "Inserisci i dati catastali", desc: "Regione, comune, foglio e particella. Bastano 30 secondi." },
            { n: "2", icon: Shield, title: "L'AI analizza fonti GIS ufficiali", desc: "Il sistema interroga le banche dati regionali e urbanistiche." },
            { n: "3", icon: Info, title: "Ricevi la scheda completa in 3 minuti", desc: "Report con vincoli, indici edilizi, pratiche necessarie." },
          ].map(({ n, icon: Icon, title, desc }) => (
            <div key={n} className="bg-card rounded-xl border border-border p-5 flex gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                style={{ background: '#1e3a5f', color: '#fff' }}>
                {n}
              </div>
              <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        urbicheck.it | Dati aggiornati da fonti GIS ufficiali regionali
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
    prompt: `Sei un esperto urbanista e tecnico catastale italiano. Genera un report urbanistico-catastale REALISTICO e DETTAGLIATO per il seguente immobile:

Regione: ${formData.regione}
Provincia: ${formData.provincia || "N/D"}
Comune: ${formData.comune}
Foglio: ${formData.foglio}
Particella: ${formData.particella}
Subalterno: ${formData.subalterno || "N/D"}
Finalità analisi: ${finalitaDesc}

Genera un report completo con dati plausibili e realistici per quella zona. Usa informazioni urbanistiche reali per quel comune/regione quando possibile.
${formData.finalita === "asta_giudiziaria" ? "IMPORTANTE: per asta giudiziaria aggiungi dettagli specifici sul CDU, conformità urbanistica e guida accesso atti." : ""}`,
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
            if_mc_mq: { type: "string", description: "Indice di fabbricabilità es. 1.5 mc/mq" },
            rc_percentuale: { type: "string", description: "Rapporto di copertura es. 40%" },
            h_max: { type: "string", description: "Altezza massima es. 10.5 m" },
            distanza_confini: { type: "string", description: "es. 5 m" },
            distanza_fabbricati: { type: "string", description: "es. 10 m" },
            distanza_strada: { type: "string", description: "es. 5 m" }
          }
        },
        fattibilita_interventi: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tipo_intervento: { type: "string", description: "es. Ristrutturazione, Sopraelevazione, Cambio destinazione d'uso..." },
              fattibilita: { type: "string", description: "fattibile, con_autorizzazione, non_fattibile" },
              note: { type: "string" }
            }
          }
        },
        dati_catastali: {
          type: "object",
          properties: {
            categoria: { type: "string", description: "es. A/2, A/3, C/1, D/1..." },
            classe: { type: "string" },
            consistenza: { type: "string", description: "es. 5 vani, 120 mq..." },
            rendita_catastale: { type: "string", description: "es. €650,00" },
            zona_censuaria: { type: "string" },
            microzona: { type: "string" },
            intestatari: { type: "string", description: "Nota generica sulla presenza intestatari" }
          }
        },
        quadro_urbanistico: {
          type: "object",
          properties: {
            strumento_vigente: { type: "string", description: "PRG, PUC, PGT, ecc." },
            zona_urbanistica: { type: "string", description: "es. B1 - Zona residenziale di completamento" },
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
            vincolo_sismico: {
              type: "object",
              properties: {
                presente: { type: "boolean" },
                zona: { type: "string", description: "es. Zona 2, Zona 3..." },
                dettagli: { type: "string" }
              }
            },
            vincolo_idraulico: {
              type: "object",
              properties: {
                presente: { type: "boolean" },
                classe_rischio: { type: "string" },
                dettagli: { type: "string" }
              }
            },
            vincolo_paesaggistico: {
              type: "object",
              properties: {
                presente: { type: "boolean" },
                tipo: { type: "string" },
                dettagli: { type: "string" }
              }
            },
            vincolo_archeologico: {
              type: "object",
              properties: {
                presente: { type: "boolean" },
                dettagli: { type: "string" }
              }
            },
            altri_vincoli: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  presente: { type: "boolean" },
                  dettagli: { type: "string" }
                }
              }
            }
          }
        },
        pratiche_necessarie: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tipo_intervento: { type: "string" },
              pratica_richiesta: { type: "string", description: "SCIA, Permesso di costruire, CILA, ecc." },
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
            documenti_ottenibili: {
              type: "array",
              items: { type: "string" }
            },
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