import React from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, MapPin, FileText, Shield, AlertTriangle,
  ClipboardList, FolderOpen, Lightbulb, ArrowLeft, Download, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import ReportSection from "@/components/report/ReportSection";
import VincoloCard from "@/components/report/VincoloCard";
import DataRow from "@/components/report/DataRow";
import { motion } from "framer-motion";

export default function ReportPage() {
  const { id } = useParams();

  const { data: query, isLoading } = useQuery({
    queryKey: ["query", id],
    queryFn: async () => {
      const queries = await base44.entities.CadastralQuery.filter({ id });
      return queries[0];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!query) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">Report non trovato</p>
        <Link to="/" className="text-primary text-sm hover:underline mt-2 inline-block">Torna alla dashboard</Link>
      </div>
    );
  }

  const r = query.report_data || {};

  const complexityColor = {
    "Basso": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Medio": "bg-amber-50 text-amber-700 border-amber-200",
    "Alto": "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3 h-3" /> Torna allo storico
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-serif font-bold tracking-tight">
              Scheda Operativa
            </h1>
            <p className="text-muted-foreground mt-1">
              {query.comune} ({query.regione}) — Foglio {query.foglio}, Particella {query.particella}
              {query.subalterno ? `, Sub. ${query.subalterno}` : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Generata il {format(new Date(query.created_date), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
            </p>
          </div>
          {r.valutazione_sintetica?.livello_complessita && (
            <Badge variant="outline" className={`${complexityColor[r.valutazione_sintetica.livello_complessita] || ""} text-sm px-3 py-1`}>
              Complessità: {r.valutazione_sintetica.livello_complessita}
            </Badge>
          )}
        </div>
      </motion.div>

      <div className="space-y-6">
        {/* Dati Catastali */}
        {r.dati_catastali && (
          <ReportSection icon={Building2} title="Dati Catastali" delay={0.05}>
            <DataRow label="Categoria" value={r.dati_catastali.categoria} />
            <DataRow label="Classe" value={r.dati_catastali.classe} />
            <DataRow label="Consistenza" value={r.dati_catastali.consistenza} />
            <DataRow label="Rendita Catastale" value={r.dati_catastali.rendita_catastale} />
            <DataRow label="Zona Censuaria" value={r.dati_catastali.zona_censuaria} />
            <DataRow label="Microzona" value={r.dati_catastali.microzona} />
            <DataRow label="Intestatari" value={r.dati_catastali.intestatari} />
          </ReportSection>
        )}

        {/* Quadro Urbanistico */}
        {r.quadro_urbanistico && (
          <ReportSection icon={MapPin} title="Quadro Urbanistico (PRG/PUC)" delay={0.1}>
            <DataRow label="Strumento Vigente" value={r.quadro_urbanistico.strumento_vigente} />
            <DataRow label="Zona Urbanistica" value={r.quadro_urbanistico.zona_urbanistica} />
            <DataRow label="Destinazione d'Uso" value={r.quadro_urbanistico.destinazione_uso} />
            <DataRow label="Indice Edificabilità" value={r.quadro_urbanistico.indice_edificabilita} />
            <DataRow label="Altezza Massima" value={r.quadro_urbanistico.altezza_massima} />
            <DataRow label="Distanze Minime" value={r.quadro_urbanistico.distanze_minime} />
            {r.quadro_urbanistico.note_urbanistiche && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{r.quadro_urbanistico.note_urbanistiche}</p>
              </div>
            )}
          </ReportSection>
        )}

        {/* Vincoli */}
        {r.vincoli && (
          <ReportSection icon={Shield} title="Vincoli Territoriali" delay={0.15}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <VincoloCard
                label="Vincolo Sismico"
                presente={r.vincoli.vincolo_sismico?.presente}
                dettagli={r.vincoli.vincolo_sismico?.dettagli}
                extra={r.vincoli.vincolo_sismico?.zona}
              />
              <VincoloCard
                label="Vincolo Idraulico"
                presente={r.vincoli.vincolo_idraulico?.presente}
                dettagli={r.vincoli.vincolo_idraulico?.dettagli}
                extra={r.vincoli.vincolo_idraulico?.classe_rischio}
              />
              <VincoloCard
                label="Vincolo Paesaggistico"
                presente={r.vincoli.vincolo_paesaggistico?.presente}
                dettagli={r.vincoli.vincolo_paesaggistico?.dettagli}
                extra={r.vincoli.vincolo_paesaggistico?.tipo}
              />
              <VincoloCard
                label="Vincolo Archeologico"
                presente={r.vincoli.vincolo_archeologico?.presente}
                dettagli={r.vincoli.vincolo_archeologico?.dettagli}
              />
            </div>
            {r.vincoli.altri_vincoli?.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Altri Vincoli</p>
                {r.vincoli.altri_vincoli.map((v, i) => (
                  <VincoloCard key={i} label={v.nome} presente={v.presente} dettagli={v.dettagli} />
                ))}
              </div>
            )}
          </ReportSection>
        )}

        {/* Pratiche Necessarie */}
        {r.pratiche_necessarie?.length > 0 && (
          <ReportSection icon={ClipboardList} title="Pratiche Necessarie" delay={0.2}>
            <div className="space-y-4">
              {r.pratiche_necessarie.map((p, i) => (
                <div key={i} className="p-4 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{p.tipo_intervento}</p>
                      <Badge variant="outline" className="mt-1 text-xs">{p.pratica_richiesta}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Ente: </span>
                      <span className="font-medium">{p.ente_competente}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tempi: </span>
                      <span className="font-medium">{p.tempistica_stimata}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Costi: </span>
                      <span className="font-medium">{p.costi_stimati}</span>
                    </div>
                  </div>
                  {p.note && <p className="text-xs text-muted-foreground mt-2">{p.note}</p>}
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {/* Accesso agli Atti */}
        {r.accesso_atti && (
          <ReportSection icon={FolderOpen} title="Accesso agli Atti" delay={0.25}>
            <DataRow label="Ufficio Catasto" value={r.accesso_atti.ufficio_catasto} />
            <DataRow label="Ufficio Urbanistica" value={r.accesso_atti.ufficio_urbanistica} />
            <DataRow label="Ufficio Edilizia" value={r.accesso_atti.ufficio_edilizia} />
            <DataRow label="Modalità Accesso" value={r.accesso_atti.modalita_accesso} />
            {r.accesso_atti.documenti_ottenibili?.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground mb-2">Documenti Ottenibili:</p>
                <div className="flex flex-wrap gap-2">
                  {r.accesso_atti.documenti_ottenibili.map((d, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                  ))}
                </div>
              </div>
            )}
          </ReportSection>
        )}

        {/* Valutazione Sintetica */}
        {r.valutazione_sintetica && (
          <ReportSection icon={Lightbulb} title="Valutazione Sintetica" delay={0.3}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {r.valutazione_sintetica.criticita_principali?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500" /> Criticità
                  </p>
                  <ul className="space-y-1">
                    {r.valutazione_sintetica.criticita_principali.map((c, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {r.valutazione_sintetica.opportunita?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2 text-emerald-600">✦ Opportunità</p>
                  <ul className="space-y-1">
                    {r.valutazione_sintetica.opportunita.map((o, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {o}</li>
                    ))}
                  </ul>
                </div>
              )}
              {r.valutazione_sintetica.raccomandazioni?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2 text-blue-600">→ Raccomandazioni</p>
                  <ul className="space-y-1">
                    {r.valutazione_sintetica.raccomandazioni.map((ra, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {ra}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ReportSection>
        )}
      </div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 p-4 rounded-lg bg-muted/50 border border-border"
      >
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> Le informazioni contenute in questo report sono generate a scopo informativo e operativo. 
          Si consiglia sempre di verificare i dati presso gli uffici competenti. Urbicheck non sostituisce la consulenza di un 
          professionista abilitato (geometra, architetto, ingegnere). I dati urbanistici possono variare in base ad aggiornamenti 
          normativi successivi alla data di generazione del report.
        </p>
      </motion.div>
    </div>
  );
}