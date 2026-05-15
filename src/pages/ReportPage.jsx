import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/components/ui/use-toast";
import { generatePDF } from "@/lib/generateUrbiCheckPDF";
import FinancialDueDiligence from "@/components/report/FinancialDueDiligence";
import AttiRequestForm from "@/components/atti/AttiRequestForm";
import WfsLiguriaPanel from "@/components/report/WfsLiguriaPanel";
import ParcellaMap from "@/components/report/ParcellaMap";
import PaymentGate from "@/components/report/PaymentGate";

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

function PRGStatusBadge({ status }) {
  const cfg = {
    found:        { color: "#22c55e", bg: "#f0fdf4", label: "🟢 PRG open disponibile" },
    partial:      { color: "#f59e0b", bg: "#fffbeb", label: "🟡 Dato parziale" },
    catasto_only: { color: "#B33A2A", bg: "#fef2f2", label: "🔴 PRG non open" },
    missing:      { color: "#B33A2A", bg: "#fef2f2", label: "🔴 Comune non trovato" },
  }[status] || { color: "#6b7280", bg: "#f9fafb", label: "— Dato PRG non verificato" };
  return (
    <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [showAttiForm, setShowAttiForm] = useState(false);
  const [comunePrefill, setComunePrefill] = useState(null);
  const [financialSnapshot, setFinancialSnapshot] = useState(null);

  const { data: query, isLoading, refetch } = useQuery({
    queryKey: ["query", id],
    queryFn: async () => {
      const queries = await base44.entities.CadastralQuery.filter({ id });
      return queries[0];
    },
  });

  const handleDownloadPDF = async () => {
    // Gate PDF — solo se paid=true
    if (query?.paid !== true) {
      toast({ title: "Scheda non sbloccata", description: "Sblocca prima la scheda completa.", variant: "destructive" });
      return;
    }
    setIsDownloadingPDF(true);
    const { doc, reportNum } = await generatePDF(query, financialSnapshot);
    doc.save(`URBICHECK_${query.comune}_${reportNum}.pdf`);
    setIsDownloadingPDF(false);
    toast({ title: "PDF scaricato ✓", description: `Scheda ${reportNum} salvata.` });
  };

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

  // ── PAYMENT GATE IMPERMEABILE — nessuna eccezione, nessun bypass ──────────
  // paid=true è l'UNICO gate autoritativo. status="completed" NON è sufficiente.
  if (query.paid !== true) {
    return (
      <PaymentGate
        query={query}
        onPaid={async () => {
          await refetch();
          queryClient.invalidateQueries({ queryKey: ["userCredits"] });
          queryClient.invalidateQueries({ queryKey: ["recentQueries"] });
        }}
      />
    );
  }

  const r = query.report_data || {};
  const isAsta = query.finalita === "asta_giudiziaria";

  // Dati sismici reali da WFS (override sull'AI che può sbagliare)
  const isPiemonte = (query.regione || '').toLowerCase().includes('piemonte');
  const wfsRis = r.wfs_liguria?.risultati;
  const wfsSismica = wfsRis?.sismica;
  // Per Piemonte: vincolo sismico sempre presente (Zona 3 o 3S per legge)
  const sismicoPiemonteZona = wfsSismica
    ? (String(wfsSismica.zona) === '3S' ? 'Zona 3S' : 'Zona 3')
    : 'Zona 3';
  const sismicoPiemonteDesc = wfsSismica
    ? (String(wfsSismica.zona) === '3S' ? 'Alta sismicità — DGR n.6-887/2019' : 'Media sismicità — DGR n.6-887/2019')
    : 'Media sismicità — DGR n.6-887/2019';
  const vincoloSismicoEffettivo = isPiemonte
    ? { presente: true, zona: `${sismicoPiemonteZona} (${sismicoPiemonteDesc})`, dettagli: `${sismicoPiemonteZona} — ${sismicoPiemonteDesc}. Applicare NTC 2018.` }
    : (r.vincoli?.vincolo_sismico || { presente: false });
  const FIN_FINALITA = ["investimento", "sviluppo_immobiliare", "asta_giudiziaria"];
  const showFinancial = FIN_FINALITA.includes(query.finalita) || r.fin_data?.prezzo_acquisto;
  const finData = r.fin_data || {};
  const reportNum = `UB-${query.id?.slice(-8).toUpperCase()}`;

  const complexityColor = {
    "Basso": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Medio": "bg-amber-50 text-amber-700 border-amber-200",
    "Alto": "bg-red-50 text-red-700 border-red-200",
  };

  // Avviso multi-sezione catastale
  const sezioniDisponibili = r.catasto_data?.sezioni_disponibili || [];
  const hasMultiSezioni = sezioniDisponibili.length > 1 && !query.sezione_catastale;

  const handleSelezioneSezione = async (sezione) => {
    const sez = sezioniDisponibili.find(s => s.sezione === sezione);
    if (!sez) return;
    await base44.entities.CadastralQuery.update(id, {
      sezione_catastale: sezione,
      centroid_lat: sez.lat,
      centroid_lng: sez.lon,
      report_data: {
        ...r,
        catasto_data: { ...r.catasto_data, lat: sez.lat, lon: sez.lon, inspire_id: sez.id },
      },
    });
    await refetch();
    toast({ title: `Sezione ${sezione} selezionata ✓` });
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3 h-3" /> Torna allo storico
        </Link>

        <div className="rounded-xl p-5 mb-4" style={{ background: '#1e3a5f' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1">
                Scheda Certificata · {reportNum}
              </p>
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
                {format(new Date(query.created_date), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
              </p>
              {r.valutazione_sintetica?.livello_complessita && (
                <Badge variant="outline" className={`${complexityColor[r.valutazione_sintetica.livello_complessita] || ""} text-xs`}>
                  Complessità: {r.valutazione_sintetica.livello_complessita}
                </Badge>
              )}
              <Badge className="bg-emerald-500 text-white border-0 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Scheda certificata · N. {reportNum}
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== AVVISO MULTI-SEZIONE CATASTALE ===== */}
      {hasMultiSezioni && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-5">
          <p className="font-bold text-amber-900 mb-2">
            {r.catasto_data?.selezione_richiesta
              ? `Sezione "${r.catasto_data.sezione_sister_cercata}" non trovata nel database INSPIRE — seleziona la posizione corretta`
              : `Trovata particella in ${sezioniDisponibili.length} sezioni catastali — seleziona quella corretta`}
          </p>
          <p className="text-sm text-amber-800 mb-3">
            Abbiamo trovato la stessa particella in {sezioniDisponibili.length} posizioni geografiche diverse. Seleziona quella corretta in base al tuo indirizzo:
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {sezioniDisponibili.map(s => (
              <Button key={s.sezione || 'principale'} variant="outline"
                className="border-amber-400 text-amber-800 hover:bg-amber-100 text-left h-auto py-3 px-4 flex flex-col items-start gap-0.5"
                onClick={() => handleSelezioneSezione(s.sezione)}>
                <span className="font-bold text-sm">{s.sezione ? `Sezione INSPIRE: ${s.sezione}` : 'Sezione principale'}</span>
                <span className="text-xs font-mono">📍 {s.lat?.toFixed(5)}, {s.lon?.toFixed(5)}</span>
                {s.zona && <span className="text-xs text-amber-700 mt-0.5">{s.zona}</span>}
              </Button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Scheda pagata — nessun banner unlock */}

      <div className="space-y-6">
        {/* === SEMPRE VISIBILI === */}

        {/* Tipologia immobile / Dati Catastali */}
        {r.dati_catastali && (
          <ReportSection icon={Building2} title="Tipologia Immobile" delay={0.02}>
            <DataRow label="Categoria catastale" value={r.dati_catastali.categoria} />
            <DataRow label="Consistenza / Superficie stimata" value={r.dati_catastali.consistenza} />
            <DataRow label="Classe" value={r.dati_catastali.classe} />
            <DataRow label="Rendita Catastale" value={r.dati_catastali.rendita_catastale} />
            <DataRow label="Zona Censuaria" value={r.dati_catastali.zona_censuaria} />
            <DataRow label="Microzona" value={r.dati_catastali.microzona} />
            <DataRow label="Intestatari" value={r.dati_catastali.intestatari} />
          </ReportSection>
        )}

        {/* Zonizzazione */}
        {r.zonizzazione && (
          <ReportSection icon={MapPin} title="Zonizzazione Urbanistica" delay={0.04}>
            <div className="mb-4">
              <ZonaBadge colore={r.zonizzazione.colore} />
            </div>
            <DataRow label="Categoria generale" value={r.zonizzazione.destinazione_prevalente} />
            <DataRow label="Zona" value={r.zonizzazione.zona_codice} />
            {r.prg_lookup_status && (
              <div className="mt-2">
                <PRGStatusBadge status={r.prg_lookup_status} />
              </div>
            )}
            {r.zonizzazione.descrizione && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{r.zonizzazione.descrizione}</p>
              </div>
            )}
          </ReportSection>
        )}

        {/* Vincoli */}
        {r.vincoli && (
          <ReportSection icon={Shield} title="Vincoli Principali" delay={0.06}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <VincoloCard label="Vincolo Sismico" presente={vincoloSismicoEffettivo.presente} dettagli={vincoloSismicoEffettivo.dettagli} extra={vincoloSismicoEffettivo.zona} />
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

        {/* === SOLO SCHEDA COMPLETA === */}

        {/* Indici Edilizi */}
        {r.indici_edilizi && (
          <ReportSection icon={BarChart3} title="Indici Edilizi" delay={0.08}>
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

        {/* Fattibilità interventi */}
        {r.fattibilita_interventi?.length > 0 && (
          <ReportSection icon={CheckCircle2} title="Fattibilità Interventi" delay={0.12}>
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
          <ReportSection icon={ClipboardList} title="Pratiche Necessarie" delay={0.14}>
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
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
          <ReportSection icon={FolderOpen} title="Accesso agli Atti" delay={0.18}>
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

        {/* Analisi Finanziaria & Due Diligence */}
        {showFinancial && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1e3a5f' }}>
                <span className="text-white text-xs font-bold">€</span>
              </div>
              <h2 className="text-lg font-bold tracking-tight" style={{ color: '#1e3a5f' }}>Analisi Finanziaria & Due Diligence</h2>
            </div>
            <FinancialDueDiligence query={query} finData={finData} onSnapshotReady={setFinancialSnapshot} />
          </motion.div>
        )}

        {/* === MAPPA CATASTALE — da catasto_resolver (OnData + AdE WFS) === */}
        {(query.centroid_lat || r.catasto_data?.lat) && (
          <ReportSection icon={MapPin} title="Mappa Particella Catastale" delay={0.05}>
            <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>📍 WGS84: {(r.catasto_data?.lat || query.centroid_lat)?.toFixed(5)}, {(r.catasto_data?.lon || query.centroid_lng)?.toFixed(5)}</span>
              {r.catasto_data?.inspire_id && <span>INSPIRE ID: {r.catasto_data.inspire_id}</span>}
              {r.catasto_data?.fonte && <span className="italic">{r.catasto_data.fonte}</span>}
            </div>
            <ParcellaMap
              lat={r.catasto_data?.lat || query.centroid_lat}
              lon={r.catasto_data?.lon || query.centroid_lng}
              geojsonPolygon={query.geometry_geojson || r.catasto_data?.geojson_polygon}
              height={320}
            />
          </ReportSection>
        )}

        {/* Valutazione Sintetica */}
        {r.valutazione_sintetica && (
          <ReportSection icon={Lightbulb} title="Valutazione Sintetica" delay={0.2}>
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



      {/* === WFS ANALISI PANEL (Liguria + Piemonte) === */}
      {(['Liguria','Piemonte'].includes(query.regione) || (query.regione || '').toLowerCase().includes('piemonte') || (query.regione || '').toLowerCase().includes('liguria')) && (
        <WfsLiguriaPanel
          query={query}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["query", id] });
            refetch();
          }}
        />
      )}

      {/* Download PDF + Servizi Aggiuntivi */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="mt-8 p-6 rounded-xl border border-border bg-card">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button variant="outline" className="gap-2" onClick={handleDownloadPDF} disabled={isDownloadingPDF}>
              {isDownloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Scarica PDF completo
            </Button>
          </div>
          <h3 className="font-semibold mb-1">Servizi Aggiuntivi (opzionali)</h3>
          <p className="text-sm text-muted-foreground mb-4">Servizi extra a pagamento separato, non inclusi nella scheda base.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="gap-2" style={{ background: '#1e3a5f' }} onClick={async () => {
              let comuneRecord = null;
              if (query.comune_id) {
                const results = await base44.entities.ComuneItalia.filter({ id: query.comune_id });
                comuneRecord = results[0] || null;
              }
              setComunePrefill(comuneRecord);
              setShowAttiForm(true);
            }}>
              <FileSearch className="w-4 h-4" />
              Richiedi Accesso Atti — €4,90
            </Button>
          </div>
      </motion.div>

      {/* Form Accesso Atti */}
      {showAttiForm && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 rounded-xl border-2 border-primary bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg" style={{ color: '#1e3a5f' }}>Richiesta Accesso agli Atti</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAttiForm(false)}>✕</Button>
          </div>
          <AttiRequestForm
            prefill={{
              query_id: query.id,
              comune: comunePrefill,
              foglio: query.foglio,
              particella: query.particella,
              subalterno: query.subalterno,
            }}
            onSuccess={() => {
              setShowAttiForm(false);
              toast({ title: "Richiesta atti salvata ✓" });
            }}
            onCancel={() => setShowAttiForm(false)}
          />
        </motion.div>
      )}

      {/* Disclaimer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
        className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> Le informazioni contenute in questo report sono generate a scopo informativo e operativo.
          Si consiglia sempre di verificare i dati presso gli uffici competenti. Urbicheck non sostituisce la consulenza di un
          professionista abilitato (geometra, architetto, ingegnere). I dati urbanistici possono variare in base ad aggiornamenti
          normativi successivi alla data di generazione del report.
        </p>
      </motion.div>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        urbicheck.it | Dati aggiornati da fonti GIS ufficiali regionali
      </div>
    </div>
  );
}