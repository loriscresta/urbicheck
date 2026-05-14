import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2, MapPin, FileText, Shield, AlertTriangle,
  ClipboardList, FolderOpen, Lightbulb, ArrowLeft, Download, Loader2,
  BarChart3, CheckCircle2, XCircle, AlertCircle, Gavel, FileSearch,
  Lock, Unlock
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

// Locked blurred section overlay
function LockedSection({ children, label }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      <div className="pointer-events-none select-none" style={{ filter: "blur(5px)", opacity: 0.5 }}>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
        <Lock className="w-7 h-7 text-primary mb-2" />
        <p className="text-sm font-semibold text-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [showAttiForm, setShowAttiForm] = useState(false);
  const [comunePrefill, setComunePrefill] = useState(null);

  const { data: query, isLoading, refetch } = useQuery({
    queryKey: ["query", id],
    queryFn: async () => {
      const queries = await base44.entities.CadastralQuery.filter({ id });
      return queries[0];
    },
  });

  const { data: credits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.UserCredits.filter({ user_email: user.email });
      return list[0] || { balance: 0 };
    },
  });

  const handleUnlock = async () => {
    if (!credits || credits.balance < 9.90) {
      toast({
        title: "Crediti insufficienti",
        description: `Saldo: €${(credits?.balance || 0).toFixed(2)}. Servono €9,90.`,
        variant: "destructive",
      });
      navigate("/credits");
      return;
    }

    setIsUnlocking(true);
    const user = await base44.auth.me();

    // Deduct credits
    await base44.entities.UserCredits.update(credits.id, {
      balance: credits.balance - 9.90,
      total_spent: (credits.total_spent || 0) + 9.90,
      total_queries: (credits.total_queries || 0) + 1,
    });

    // Mark query as completed
    await base44.entities.CadastralQuery.update(id, { status: "completed" });

    // Log transaction (may fail due to permissions — non-blocking)
    try {
      await base44.entities.CreditTransaction.create({
        user_email: user.email,
        type: "query_charge",
        amount: -9.90,
        description: `Scheda completa: ${query.comune} — F.${query.foglio} P.${query.particella}`,
        query_id: id,
      });
    } catch (_txErr) { /* ignore */ }

    queryClient.invalidateQueries({ queryKey: ["userCredits"] });
    queryClient.invalidateQueries({ queryKey: ["recentQueries"] });
    await refetch();
    setIsUnlocking(false);

    toast({ title: "Scheda sbloccata ✓", description: "Accesso completo attivato." });
  };

  const handleDownloadPDF = async () => {
    if (!credits || credits.balance < 2.90) {
      toast({
        title: "Crediti insufficienti",
        description: `Saldo: €${(credits?.balance || 0).toFixed(2)}. Servono €2,90 per il PDF.`,
        variant: "destructive",
      });
      navigate("/credits");
      return;
    }

    setIsDownloadingPDF(true);
    const user = await base44.auth.me();

    const { doc, reportNum } = await generatePDF(query);

    // Charge €2,90
    await base44.entities.UserCredits.update(credits.id, {
      balance: credits.balance - 2.90,
      total_spent: (credits.total_spent || 0) + 2.90,
    });
    try {
      await base44.entities.CreditTransaction.create({
        user_email: user.email,
        type: "query_charge",
        amount: -2.90,
        description: `Download PDF scheda ${reportNum}`,
        query_id: id,
      });
    } catch (_txErr) { /* ignore */ }

    queryClient.invalidateQueries({ queryKey: ["userCredits"] });
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

  const r = query.report_data || {};
  const isUnlocked = query.status === "completed";
  const isAsta = query.finalita === "asta_giudiziaria";
  const FIN_FINALITA = ["investimento", "sviluppo_immobiliare", "asta_giudiziaria"];
  const showFinancial = isUnlocked && (FIN_FINALITA.includes(query.finalita) || r.fin_data?.prezzo_acquisto);
  const finData = r.fin_data || {};
  const reportNum = `UB-${query.id?.slice(-8).toUpperCase()}`;

  const complexityColor = {
    "Basso": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Medio": "bg-amber-50 text-amber-700 border-amber-200",
    "Alto": "bg-red-50 text-red-700 border-red-200",
  };

  // Summarize which constraints exist (for preview)
  const hasAnyConstraint = r.vincoli && (
    r.vincoli.vincolo_sismico?.presente ||
    r.vincoli.vincolo_idraulico?.presente ||
    r.vincoli.vincolo_paesaggistico?.presente ||
    r.vincoli.vincolo_archeologico?.presente ||
    r.vincoli.altri_vincoli?.some(v => v.presente)
  );

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
                {isUnlocked ? `Scheda Certificata · ${reportNum}` : "Anteprima Gratuita"}
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
              {isUnlocked && r.valutazione_sintetica?.livello_complessita && (
                <Badge variant="outline" className={`${complexityColor[r.valutazione_sintetica.livello_complessita] || ""} text-xs`}>
                  Complessità: {r.valutazione_sintetica.livello_complessita}
                </Badge>
              )}
              {isUnlocked && (
                <Badge className="bg-emerald-500 text-white border-0 text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Scheda certificata · N. {reportNum}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== UNLOCK BANNER (preview mode) ===== */}
      {!isUnlocked && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border-2 border-emerald-400 bg-emerald-50 p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-emerald-900 text-base mb-1">
                Questa è un'anteprima gratuita — Sblocca la scheda completa per €9,90
              </p>
              <ul className="text-sm text-emerald-800 space-y-1 mt-2">
                <li>✓ Indici edilizi completi (IF, RC, altezza max)</li>
                <li>✓ Dettaglio tutti i vincoli attivi</li>
                <li>✓ Tabella fattibilità per tipo di intervento</li>
                <li>✓ Pratiche necessarie (SCIA, Permesso di costruire…)</li>
                {isAsta && <li>✓ Sezione speciale asta giudiziaria</li>}
                <li>✓ Numero scheda unico certificato</li>
              </ul>
            </div>
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shrink-0"
              onClick={handleUnlock}
              disabled={isUnlocking}
            >
              {isUnlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
              Sblocca scheda completa →
            </Button>
          </div>
        </motion.div>
      )}

      <div className="space-y-6">
        {/* === SEMPRE VISIBILI === */}

        {/* Tipologia immobile / Dati Catastali */}
        {r.dati_catastali && (
          <ReportSection icon={Building2} title="Tipologia Immobile" delay={0.02}>
            <DataRow label="Categoria catastale" value={r.dati_catastali.categoria} />
            <DataRow label="Consistenza / Superficie stimata" value={r.dati_catastali.consistenza} />
            <DataRow label="Classe" value={r.dati_catastali.classe} />
            {isUnlocked && (
              <>
                <DataRow label="Rendita Catastale" value={r.dati_catastali.rendita_catastale} />
                <DataRow label="Zona Censuaria" value={r.dati_catastali.zona_censuaria} />
                <DataRow label="Microzona" value={r.dati_catastali.microzona} />
                <DataRow label="Intestatari" value={r.dati_catastali.intestatari} />
              </>
            )}
          </ReportSection>
        )}

        {/* Zonizzazione — colore + categoria sempre visibili, indici bloccati */}
        {r.zonizzazione && (
          <ReportSection icon={MapPin} title="Zonizzazione Urbanistica" delay={0.04}>
            <div className="mb-4">
              <ZonaBadge colore={r.zonizzazione.colore} />
            </div>
            <DataRow label="Categoria generale" value={r.zonizzazione.destinazione_prevalente} />
            {isUnlocked ? (
              <>
                <DataRow label="Zona" value={r.zonizzazione.zona_codice} />
                {r.zonizzazione.descrizione && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{r.zonizzazione.descrizione}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground mt-2 italic">Codice zona e descrizione completa disponibili nella scheda completa</p>
            )}
          </ReportSection>
        )}

        {/* Vincoli — solo sì/no in preview */}
        {r.vincoli && (
          <ReportSection icon={Shield} title="Vincoli Principali" delay={0.06}>
            {isUnlocked ? (
              <>
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
              </>
            ) : (
              <div className="space-y-2">
                {[
                  { label: "Vincolo Sismico", presente: r.vincoli.vincolo_sismico?.presente },
                  { label: "Vincolo Idraulico", presente: r.vincoli.vincolo_idraulico?.presente },
                  { label: "Vincolo Paesaggistico", presente: r.vincoli.vincolo_paesaggistico?.presente },
                  { label: "Vincolo Archeologico", presente: r.vincoli.vincolo_archeologico?.presente },
                ].map((v) => (
                  <div key={v.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <span className="text-sm font-medium">{v.label}</span>
                    {v.presente ? (
                      <span className="text-xs font-semibold text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Presente</span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Assente</span>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground italic mt-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Dettagli e altri vincoli disponibili nella scheda completa
                </p>
              </div>
            )}
          </ReportSection>
        )}

        {/* === SOLO SCHEDA COMPLETA === */}

        {/* Indici Edilizi */}
        {r.indici_edilizi && (
          isUnlocked ? (
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
          ) : (
            <LockedSection label="Indici edilizi completi (IF, RC, H max…)">
              <div className="p-6 bg-card border border-border rounded-xl">
                <p className="font-semibold mb-3">Indici Edilizi</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {["IF mc/mq", "RC %", "H max", "Dist. confini", "Dist. fabbricati", "Dist. strada"].map(l => (
                    <div key={l} className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">{l}</p>
                      <p className="font-semibold text-sm">— —</p>
                    </div>
                  ))}
                </div>
              </div>
            </LockedSection>
          )
        )}

        {/* Quadro Urbanistico */}
        {r.quadro_urbanistico && isUnlocked && (
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
          isUnlocked ? (
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
          ) : (
            <LockedSection label="Tabella fattibilità per tipo di intervento">
              <div className="p-6 bg-card border border-border rounded-xl">
                <p className="font-semibold mb-3">Fattibilità Interventi</p>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border"><th className="text-left py-2 pr-4 text-muted-foreground font-medium">Tipo intervento</th><th className="text-left py-2 text-muted-foreground font-medium">Fattibilità</th></tr></thead>
                  <tbody>
                    {["Ristrutturazione", "Sopraelevazione", "Cambio d'uso", "Nuova costruzione"].map(t => (
                      <tr key={t} className="border-b border-border/50"><td className="py-2 pr-4">{t}</td><td className="py-2 text-muted-foreground">—</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </LockedSection>
          )
        )}

        {/* Pratiche Necessarie */}
        {r.pratiche_necessarie?.length > 0 && isUnlocked && (
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
        {isAsta && isUnlocked && (
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
        {isAsta && !isUnlocked && (
          <LockedSection label="Sezione speciale asta giudiziaria (CDU, conformità, accesso atti)">
            <div className="p-6 rounded-xl border-2 border-amber-300 bg-amber-50">
              <p className="font-bold text-amber-800">Sezione Asta Giudiziaria</p>
              <p className="text-sm text-amber-700 mt-2">CDU, conformità urbanistica, guida accesso atti…</p>
            </div>
          </LockedSection>
        )}

        {/* Accesso agli Atti */}
        {r.accesso_atti && isUnlocked && (
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
            <FinancialDueDiligence query={query} finData={finData} />
          </motion.div>
        )}

        {/* === MAPPA CATASTALE — visibile SOLO se geometry_geojson è popolato (API Catastomappe) === */}
        {/* Non renderizzare nulla se il campo è null/vuoto — nessun placeholder, nessun box blu */}
        {query.geometry_geojson &&
          Object.keys(query.geometry_geojson).length > 0 &&
          query.geometry_geojson.type &&
          null /* componente MappaParticella da aggiungere quando Catastomappe sarà integrata */
        }

        {/* Valutazione Sintetica */}
        {r.valutazione_sintetica && isUnlocked && (
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

      {/* CTA bottom banner */}
      {!isUnlocked && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="mt-8 rounded-xl border-2 border-emerald-400 bg-emerald-50 p-5 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1">
            <p className="font-bold text-emerald-900 text-base">Sblocca la scheda completa per €9,90</p>
            <p className="text-sm text-emerald-700 mt-1">Addebito immediato dal tuo saldo crediti (€{(credits?.balance || 0).toFixed(2)} disponibili)</p>
          </div>
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shrink-0"
            onClick={handleUnlock}
            disabled={isUnlocking}
          >
            {isUnlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
            Sblocca scheda completa →
          </Button>
        </motion.div>
      )}

      {/* === WFS LIGURIA PANEL === */}
      {query.regione === 'Liguria' && (
        <WfsLiguriaPanel
          query={query}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["query", id] });
            refetch();
          }}
        />
      )}

      {/* Servizi aggiuntivi (solo dopo sblocco) */}
      {isUnlocked && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="mt-8 p-6 rounded-xl border border-border bg-card">
          <h3 className="font-semibold mb-1">Servizi Aggiuntivi (opzionali)</h3>
          <p className="text-sm text-muted-foreground mb-4">Servizi extra a pagamento separato, non inclusi nella scheda.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="gap-2" onClick={handleDownloadPDF} disabled={isDownloadingPDF}>
              {isDownloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Scarica PDF — €2,90
            </Button>
            <Button className="gap-2" style={{ background: '#1e3a5f' }} onClick={async () => {
              // Se il comune_id è disponibile, carica il record ComuneItalia per il prefill
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
          <p className="text-xs text-muted-foreground mt-3">Il PDF è sempre a pagamento separato (€2,90) anche dopo aver sbloccato la scheda completa.</p>
        </motion.div>
      )}

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