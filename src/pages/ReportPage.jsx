import React from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, MapPin, FileText, Shield, AlertTriangle,
  ClipboardList, FolderOpen, Lightbulb, ArrowLeft, Download, Loader2,
  BarChart3, CheckCircle2, XCircle, AlertCircle, Gavel, FileSearch
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import ReportSection from "@/components/report/ReportSection";
import VincoloCard from "@/components/report/VincoloCard";
import DataRow from "@/components/report/DataRow";
import { motion } from "framer-motion";

const FINALITA_LABELS = {
  acquisto_privato: "Acquisto privato",
  investimento: "Investimento",
  sviluppo_immobiliare: "Sviluppo immobiliare",
  asta_giudiziaria: "Asta giudiziaria",
  due_diligence: "Due diligence",
  valutazione_professionale: "Valutazione professionale",
};

function ZonaBadge({ colore }) {
  const config = {
    verde: { bg: "bg-emerald-100 border-emerald-300 text-emerald-800", label: "Zona Verde — Alta fattibilità" },
    giallo: { bg: "bg-amber-100 border-amber-300 text-amber-800", label: "Zona Gialla — Fattibilità condizionata" },
    rosso: { bg: "bg-red-100 border-red-300 text-red-800", label: "Zona Rossa — Criticità significative" },
  };
  const c = config[colore?.toLowerCase()] || config.giallo;
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold text-sm ${c.bg}`}>
      <span className={`w-3 h-3 rounded-full ${colore === 'verde' ? 'bg-emerald-500' : colore === 'rosso' ? 'bg-red-500' : 'bg-amber-500'}`} />
      {c.label}
    </span>
  );
}

function FattibilitaBadge({ value }) {
  if (value === "fattibile") return (
    <span className="flex items-center gap-1 text-emerald-700 text-xs font-semibold">
      <CheckCircle2 className="w-4 h-4" /> Fattibile
    </span>
  );
  if (value === "non_fattibile") return (
    <span className="flex items-center gap-1 text-red-600 text-xs font-semibold">
      <XCircle className="w-4 h-4" /> Non fattibile
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-amber-700 text-xs font-semibold">
      <AlertCircle className="w-4 h-4" /> Con autorizzazione
    </span>
  );
}

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!query) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">Report non trovato</p>
        <Link to="/history" className="text-primary text-sm hover:underline mt-2 inline-block">Torna allo storico</Link>
      </div>
    );
  }

  const r = query.report_data || {};
  const isAsta = query.finalita === "asta_giudiziaria";

  const complexityColor = {
    "Basso": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Medio": "bg-amber-50 text-amber-700 border-amber-200",
    "Alto": "bg-red-50 text-red-700 border-red-200",
  };

  // Generate unique report number
  const reportNum = `UB-${query.id?.slice(-8).toUpperCase()}`;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3 h-3" /> Torna allo storico
        </Link>

        {/* Title bar */}
        <div className="rounded-xl p-5 mb-4" style={{ background: '#1e3a5f' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Scheda Urbicheck · {reportNum}</p>
              <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
                {query.comune} ({query.regione})
              </h1>
              <p className="text-white/70 text-sm mt-1">
                Foglio {query.foglio} · Particella {query.particella}
                {query.subalterno ? ` · Sub. ${query.subalterno}` : ""}
                {query.provincia ? ` · ${query.provincia}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-start lg:items-end gap-2">
              {query.finalita && (
                <Badge className="bg-white/10 text-white border-white/20 text-xs">
                  {FINALITA_LABELS[query.finalita] || query.finalita}
                </Badge>
              )}
              <p className="text-white/50 text-xs">
                Generata il {format(new Date(query.created_date), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
              </p>
              {r.valutazione_sintetica?.livello_complessita && (
                <Badge variant="outline" className={`${complexityColor[r.valutazione_sintetica.livello_complessita] || ""} text-xs`}>
                  Complessità: {r.valutazione_sintetica.livello_complessita}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="space-y-6">
        {/* Zonizzazione */}
        {r.zonizzazione && (
          <ReportSection icon={MapPin} title="Zonizzazione Urbanistica" delay={0.02}>
            <div className="mb-4">
              <ZonaBadge colore={r.zonizzazione.colore} />
            </div>
            <DataRow label="Zona" value={r.zonizzazione.zona_codice} />
            <DataRow label="Destinazione prevalente" value={r.zonizzazione.destinazione_prevalente} />
            {r.zonizzazione.descrizione && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{r.zonizzazione.descrizione}</p>
              </div>
            )}
          </ReportSection>
        )}

        {/* Indici Edilizi */}
        {r.indici_edilizi && (
          <ReportSection icon={BarChart3} title="Indici Edilizi" delay={0.05}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Indice di Fabbricabilità (IF)", value: r.indici_edilizi.if_mc_mq },
                { label: "Rapporto di Copertura (RC)", value: r.indici_edilizi.rc_percentuale },
                { label: "Altezza Massima (H max)", value: r.indici_edilizi.h_max },
                { label: "Distanza dai confini", value: r.indici_edilizi.distanza_confini },
                { label: "Distanza tra fabbricati", value: r.indici_edilizi.distanza_fabbricati },
                { label: "Distanza dalla strada", value: r.indici_edilizi.distanza_strada },
              ].filter(d => d.value).map(d => (
                <div key={d.label} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{d.label}</p>
                  <p className="font-semibold text-sm">{d.value}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {/* Dati Catastali */}
        {r.dati_catastali && (
          <ReportSection icon={Building2} title="Dati Catastali" delay={0.07}>
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
          <ReportSection icon={FileText} title="Quadro Urbanistico (PRG/PUC)" delay={0.1}>
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
              <VincoloCard label="Vincolo Sismico" presente={r.vincoli.vincolo_sismico?.presente} dettagli={r.vincoli.vincolo_sismico?.dettagli} extra={r.vincoli.vincolo_sismico?.zona} />
              <VincoloCard label="Vincolo Idraulico" presente={r.vincoli.vincolo_idraulico?.presente} dettagli={r.vincoli.vincolo_idraulico?.dettagli} extra={r.vincoli.vincolo_idraulico?.classe_rischio} />
              <VincoloCard label="Vincolo Paesaggistico" presente={r.vincoli.vincolo_paesaggistico?.presente} dettagli={r.vincoli.vincolo_paesaggistico?.dettagli} extra={r.vincoli.vincolo_paesaggistico?.tipo} />
              <VincoloCard label="Vincolo Archeologico" presente={r.vincoli.vincolo_archeologico?.presente} dettagli={r.vincoli.vincolo_archeologico?.dettagli} />
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

        {/* Fattibilità interventi */}
        {r.fattibilita_interventi?.length > 0 && (
          <ReportSection icon={CheckCircle2} title="Fattibilità Interventi" delay={0.18}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Tipo intervento</th>
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Fattibilità</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {r.fattibilita_interventi.map((fi, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-4 font-medium">{fi.tipo_intervento}</td>
                      <td className="py-3 pr-4"><FattibilitaBadge value={fi.fattibilita} /></td>
                      <td className="py-3 text-muted-foreground text-xs">{fi.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                    <div><span className="text-muted-foreground">Ente: </span><span className="font-medium">{p.ente_competente}</span></div>
                    <div><span className="text-muted-foreground">Tempi: </span><span className="font-medium">{p.tempistica_stimata}</span></div>
                    <div><span className="text-muted-foreground">Costi: </span><span className="font-medium">{p.costi_stimati}</span></div>
                  </div>
                  {p.note && <p className="text-xs text-muted-foreground mt-2">{p.note}</p>}
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {/* Sezione speciale Asta Giudiziaria */}
        {isAsta && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="rounded-xl border-2 border-amber-300 bg-amber-50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Gavel className="w-5 h-5 text-amber-700" />
              <h3 className="font-bold text-amber-800">Sezione Asta Giudiziaria</h3>
            </div>
            <p className="text-sm text-amber-800 mb-4">
              Per gli immobili all'asta è essenziale verificare la conformità urbanistico-catastale prima dell'offerta.
            </p>
            {r.accesso_atti && (
              <div className="space-y-2 text-sm text-amber-900">
                <p><strong>CDU (Certificato di Destinazione Urbanistica):</strong> da richiedere presso {r.accesso_atti.ufficio_urbanistica || "l'ufficio tecnico comunale"}</p>
                <p><strong>Documenti consigliati:</strong> {r.accesso_atti.documenti_ottenibili?.join(", ") || "visura catastale, planimetria, CDU, licenza edilizia originaria"}</p>
                <p className="text-xs mt-3 text-amber-700">Guida accesso atti: presenta richiesta ex art. 22 L.241/90 all'UTC almeno 30 giorni prima dell'asta.</p>
              </div>
            )}
          </motion.div>
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

      {/* CTA: PDF + Accesso Atti */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="mt-8 flex flex-col sm:flex-row gap-4 p-6 rounded-xl border border-border bg-card">
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Documenti & Servizi Aggiuntivi</h3>
          <p className="text-sm text-muted-foreground">Scarica il report in PDF o richiedi assistenza per l'accesso agli atti urbanistici.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Button variant="outline" className="gap-2" onClick={() => alert("Funzione PDF — €2,90 (prossimamente)")}>
            <Download className="w-4 h-4" />
            Scarica PDF — €2,90
          </Button>
          <Button className="gap-2" style={{ background: '#1e3a5f' }} onClick={() => alert("Richiesta Accesso Atti — €4,90 (prossimamente)")}>
            <FileSearch className="w-4 h-4" />
            Richiedi Accesso Atti — €4,90
          </Button>
        </div>
      </motion.div>

      {/* Disclaimer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> Le informazioni contenute in questo report sono generate a scopo informativo e operativo.
          Si consiglia sempre di verificare i dati presso gli uffici competenti. Urbicheck non sostituisce la consulenza di un
          professionista abilitato (geometra, architetto, ingegnere). I dati urbanistici possono variare in base ad aggiornamenti
          normativi successivi alla data di generazione del report.
        </p>
      </motion.div>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-muted-foreground">
        urbicheck.it | Dati aggiornati da fonti GIS ufficiali regionali
      </div>
    </div>
  );
}