import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingUp, Home, BarChart3, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

// ── Costi ristrutturazione 2025 ─────────────────────────────────────────────
const RISTR_COSTS = {
  ottimo:          { min: 0,   mid: 65,  max: 150  },
  buono:           { min: 200, mid: 275, max: 350  },
  da_ristrutturare:{ min: 500, mid: 650, max: 800  },
  fatiscente:      { min: 900, mid: 1150,max: 1400 },
};

function fmtEur(n) {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function ScoreCircle({ score }) {
  const color = score >= 7 ? "text-emerald-600" : score >= 5 ? "text-amber-500" : "text-red-500";
  const ring = score >= 7 ? "border-emerald-400" : score >= 5 ? "border-amber-400" : "border-red-400";
  const label = score >= 7 ? "Interessante" : score >= 5 ? "Valutare con cura" : "Rischio elevato";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-24 h-24 rounded-full border-4 ${ring} flex items-center justify-center`}>
        <span className={`text-4xl font-black ${color}`}>{score}</span>
      </div>
      <p className={`text-sm font-bold ${color}`}>{score}/10 — {label}</p>
    </div>
  );
}

export default function FinancialDueDiligence({ query, finData, onSnapshotReady }) {
  const [omiData, setOmiData] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const r = query.report_data || {};
  const fd = finData || {};
  const mq = parseFloat(fd.superficie) || 80;
  const prezzoAcquisto = parseFloat(fd.prezzo_acquisto) || 0;
  const spesePerc = parseFloat(fd.spese_accessorie) || 10;
  const statoKey = (fd.stato_conservativo || "buono").replace(/\s.*/, "").toLowerCase();
  const costs = RISTR_COSTS[statoKey] || RISTR_COSTS.buono;

  const spese = prezzoAcquisto * (spesePerc / 100);
  const ristrMin = costs.min * mq;
  const ristrMid = costs.mid * mq;
  const ristrMax = costs.max * mq;
  const totMin = prezzoAcquisto + ristrMin + spese;
  const totMid = prezzoAcquisto + ristrMid + spese;
  const totMax = prezzoAcquisto + ristrMax + spese;

  const isFlipping = fd.destinazione_obiettivo === "flipping";
  const isAffittoLungo = fd.destinazione_obiettivo === "affitto_lungo";
  const isAffittoBreve = fd.destinazione_obiettivo === "affitto_breve";

  useEffect(() => {
    if (loaded) return;
    setLoading(true);
    const zona = r.zonizzazione?.destinazione_prevalente || r.quadro_urbanistico?.zona_urbanistica || "residenziale";

    Promise.all([
      base44.integrations.Core.InvokeLLM({
        prompt: `Sei un esperto di valutazioni immobiliari italiane con accesso ai dati OMI (Osservatorio del Mercato Immobiliare dell'Agenzia delle Entrate). Per l'immobile in ${query.comune}, ${query.regione}, categoria urbanistica: ${zona}, superficie ${mq} mq, stato conservativo: ${fd.stato_conservativo || "buono"}, fornisci stime realistiche aggiornate al 2025.`,
        response_json_schema: {
          type: "object",
          properties: {
            omi_min_mq: { type: "number" },
            omi_max_mq: { type: "number" },
            omi_medio_mq: { type: "number" },
            omi_post_ristr_min: { type: "number" },
            omi_post_ristr_max: { type: "number" },
            canone_locazione_min: { type: "number" },
            canone_locazione_max: { type: "number" },
            canone_breve_notte: { type: "number" },
            semestre_riferimento: { type: "string" },
            fascia_omi: { type: "string" },
            note_mercato: { type: "string" },
          }
        },
        add_context_from_internet: true,
      }),
      base44.integrations.Core.InvokeLLM({
        prompt: `Sei un analista di investimenti immobiliari italiani. Valuta questo investimento su scala 1-10:
- Comune: ${query.comune}, ${query.regione}
- Zona urbanistica: ${zona}
- Finalità: ${query.finalita}
- Prezzo acquisto: €${prezzoAcquisto}
- Superficie: ${mq} mq
- Stato: ${fd.stato_conservativo || "buono"}
- Destinazione obiettivo: ${fd.destinazione_obiettivo || "non specificato"}
- Vincoli presenti: sismico=${r.vincoli?.vincolo_sismico?.presente}, idraulico=${r.vincoli?.vincolo_idraulico?.presente}, paesaggistico=${r.vincoli?.vincolo_paesaggistico?.presente}
Fornisci un punteggio complessivo e analisi sintetica.`,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number", description: "Punteggio 1-10" },
            punti_forza: { type: "array", items: { type: "string" } },
            rischi: { type: "array", items: { type: "string" } },
          }
        }
      })
    ]).then(([omi, score]) => {
      setOmiData(omi);
      setScoreData(score);
      setLoaded(true);
      setLoading(false);
      if (onSnapshotReady) onSnapshotReady({ omi, score });
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Analisi finanziaria in corso (dati OMI + AI)…</span>
      </div>
    );
  }

  const valoreMercatoMin = omiData ? omiData.omi_min_mq * mq : null;
  const valoreMercatoMax = omiData ? omiData.omi_max_mq * mq : null;
  const valorePostRistrMin = omiData ? omiData.omi_post_ristr_min * mq : null;
  const valorePostRistrMax = omiData ? omiData.omi_post_ristr_max * mq : null;

  // Flipping calcs
  const valoreFlip = valorePostRistrMax || 0;
  const margineLordo = valoreFlip - totMid;
  const tassePlusvalenza = margineLordo > 0 ? margineLordo * 0.26 : 0;
  const margineNetto = margineLordo - tassePlusvalenza;
  const roiFlip = totMid > 0 ? (margineLordo / totMid) * 100 : 0;
  const breakEvenMq = totMid > 0 && mq > 0 ? totMid / mq : 0;

  // Affitto calcs
  const canoneAnnuo = omiData ? ((omiData.canone_locazione_min + omiData.canone_locazione_max) / 2) * mq : null;
  const rendimentoLordo = canoneAnnuo && totMid > 0 ? (canoneAnnuo / totMid) * 100 : null;
  const rendimentoNetto = rendimentoLordo ? rendimentoLordo * 0.79 : null;
  const payback = canoneAnnuo && rendimentoNetto ? totMid / (canoneAnnuo * 0.79) : null;

  // Affitto breve
  const nottiAnno = 219;
  const revenueBreve = omiData ? omiData.canone_breve_notte * nottiAnno : null;
  const revenueNettaBreve = revenueBreve ? revenueBreve * 0.72 : null;
  const rendimentoBreve = revenueBreve && totMid > 0 ? (revenueBreve / totMid) * 100 : null;

  return (
    <div className="space-y-6">
      {/* BLOCCO 1 — OMI */}
      {omiData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Valori OMI — Osservatorio Mercato Immobiliare</h4>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">{omiData.fascia_omi}</Badge>
              <Badge variant="outline" className="text-xs">{omiData.semestre_riferimento}</Badge>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                ⚠ Valori stimati tramite AI su base dati OMI — verifica su agenziaentrate.gov.it/omi
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Valore mercato attuale /mq", value: `${fmtEur(omiData.omi_min_mq)} – ${fmtEur(omiData.omi_max_mq)}` },
                { label: `Valore stimato OGGI (${mq}mq)`, value: `${fmtEur(valoreMercatoMin)} – ${fmtEur(valoreMercatoMax)}` },
                { label: "Post-ristrutturazione /mq", value: `${fmtEur(omiData.omi_post_ristr_min)} – ${fmtEur(omiData.omi_post_ristr_max)}` },
                { label: `Valore POST-RISTR (${mq}mq)`, value: `${fmtEur(valorePostRistrMin)} – ${fmtEur(valorePostRistrMax)}` },
              ].map(d => (
                <div key={d.label} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{d.label}</p>
                  <p className="font-semibold text-sm">{d.value}</p>
                </div>
              ))}
            </div>
            {omiData.note_mercato && (
              <p className="text-xs text-muted-foreground italic border-t border-border pt-3">
                <Info className="w-3 h-3 inline mr-1" />
                {omiData.note_mercato}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Fonte: Osservatorio Mercato Immobiliare — Agenzia delle Entrate, {omiData.semestre_riferimento}
            </p>
          </div>
        </motion.div>
      )}

      {/* BLOCCO 2 — Costi ristrutturazione */}
      {prezzoAcquisto > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
            <Home className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Stima Costi Ristrutturazione — 3 Scenari</h4>
          </div>
          <div className="p-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Voce</th>
                  <th className="text-right py-2 pr-4 text-emerald-700 font-medium">Scenario Base</th>
                  <th className="text-right py-2 pr-4 text-amber-700 font-medium">Scenario Medio</th>
                  <th className="text-right py-2 text-red-700 font-medium">Scenario Premium</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Costo ristr. (€/mq)", `${costs.min}`, `${costs.mid}`, `${costs.max}`],
                  ["Totale ristrutturazione", fmtEur(ristrMin), fmtEur(ristrMid), fmtEur(ristrMax)],
                  [`Spese accessorie (${spesePerc}%)`, fmtEur(spese), fmtEur(spese), fmtEur(spese)],
                ].map(([label, ...vals], i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-muted-foreground">{label}</td>
                    {vals.map((v, j) => <td key={j} className="py-2 pr-4 text-right">{v}</td>)}
                  </tr>
                ))}
                <tr className="bg-primary/5 font-bold">
                  <td className="py-3 pr-4">INVESTIMENTO TOTALE</td>
                  <td className="py-3 pr-4 text-right text-emerald-700">{fmtEur(totMin)}</td>
                  <td className="py-3 pr-4 text-right text-amber-700">{fmtEur(totMid)}</td>
                  <td className="py-3 text-right text-red-700">{fmtEur(totMax)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* BLOCCO 3 — Flipping */}
      {isFlipping && prezzoAcquisto > 0 && omiData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`rounded-xl border-2 overflow-hidden ${roiFlip >= 15 ? "border-emerald-400 bg-emerald-50" : roiFlip >= 5 ? "border-amber-400 bg-amber-50" : "border-red-400 bg-red-50"}`}>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-inherit">
            <TrendingUp className="w-4 h-4" />
            <h4 className="font-semibold text-sm">Analisi Flipping — Scenario Medio</h4>
            {roiFlip >= 15
              ? <Badge className="ml-auto bg-emerald-600 text-white">✓ Potenzialmente profittevole</Badge>
              : roiFlip >= 5
              ? <Badge className="ml-auto bg-amber-500 text-white">⚠ Margini contenuti</Badge>
              : <Badge className="ml-auto bg-red-600 text-white">✗ Margini insufficienti</Badge>}
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {[
                { label: "Valore acquisto", value: fmtEur(prezzoAcquisto) },
                { label: "Costo ristrutturazione", value: fmtEur(ristrMid) },
                { label: "Spese accessorie", value: fmtEur(spese) },
                { label: "INVESTIMENTO TOTALE", value: fmtEur(totMid), bold: true },
                { label: "Valore post-ristr (OMI max)", value: fmtEur(valoreFlip) },
                { label: "MARGINE LORDO", value: fmtEur(margineLordo), bold: true, colored: true },
              ].map(d => (
                <div key={d.label} className={`rounded-lg p-3 ${d.bold ? "bg-white/70" : "bg-white/40"}`}>
                  <p className="text-xs text-muted-foreground mb-1">{d.label}</p>
                  <p className={`font-semibold text-sm ${d.colored ? (margineLordo >= 0 ? "text-emerald-700" : "text-red-700") : ""}`}>{d.value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="bg-white/50 rounded-lg px-4 py-2">
                <span className="text-muted-foreground">ROI FLIP: </span>
                <span className={`font-bold ${roiFlip >= 15 ? "text-emerald-700" : roiFlip >= 5 ? "text-amber-700" : "text-red-700"}`}>{roiFlip.toFixed(1)}%</span>
              </div>
              <div className="bg-white/50 rounded-lg px-4 py-2">
                <span className="text-muted-foreground">Plusvalenza fiscale (26%): </span>
                <span className="font-bold">{fmtEur(tassePlusvalenza)}</span>
              </div>
              <div className="bg-white/50 rounded-lg px-4 py-2">
                <span className="text-muted-foreground">MARGINE NETTO: </span>
                <span className={`font-bold ${margineNetto >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmtEur(margineNetto)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Break-even: devi vendere almeno a <strong>{fmtEur(breakEvenMq)}/mq</strong> per andare in pareggio.
            </p>
          </div>
        </motion.div>
      )}

      {/* BLOCCO 4 — Affitto lungo */}
      {isAffittoLungo && prezzoAcquisto > 0 && omiData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Redditività Locatizia — Affitto Lungo Termine</h4>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Canone annuo stimato", value: fmtEur(canoneAnnuo) },
                { label: "Rendimento lordo", value: `${rendimentoLordo?.toFixed(2)}%` },
                { label: "Rendimento netto (ced. sec. 21%)", value: `${rendimentoNetto?.toFixed(2)}%` },
                { label: "Pay-back period", value: `${payback?.toFixed(1)} anni` },
              ].map(d => (
                <div key={d.label} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{d.label}</p>
                  <p className="font-semibold text-sm">{d.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Confronto: media nazionale affitti residenziali 4–5% lordo.{" "}
              {rendimentoLordo >= 5 ? "✓ Rendimento in linea o superiore alla media." : "⚠ Rendimento sotto la media nazionale."}
            </p>
          </div>
        </motion.div>
      )}

      {/* BLOCCO 4b — Affitto breve */}
      {isAffittoBreve && prezzoAcquisto > 0 && omiData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Redditività Locatizia — Affitto Breve (B&B/Airbnb)</h4>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Tariffa/notte stimata", value: fmtEur(omiData.canone_breve_notte) },
                { label: "Notti/anno (60% occ.)", value: `${nottiAnno} notti` },
                { label: "Revenue annua lorda", value: fmtEur(revenueBreve) },
                { label: "Revenue netta (–28%)", value: fmtEur(revenueNettaBreve) },
              ].map(d => (
                <div key={d.label} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{d.label}</p>
                  <p className="font-semibold text-sm">{d.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
              <strong>Nota:</strong> Rendimento lordo stimato: {rendimentoBreve?.toFixed(1)}%. Dedurre gestione, pulizie e platform fee (~25–30%). Verificare normativa locale sugli affitti brevi (L. 191/2023).
            </div>
          </div>
        </motion.div>
      )}

      {/* BLOCCO 5 — Scorecard */}
      {scoreData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Scorecard Investimento</h4>
          </div>
          <div className="p-5 flex flex-col md:flex-row gap-6 items-start">
            <div className="shrink-0 flex justify-center md:block">
              <ScoreCircle score={Math.round(scoreData.score)} />
            </div>
            <div className="flex-1 grid md:grid-cols-2 gap-4">
              {scoreData.punti_forza?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Punti di forza
                  </p>
                  <ul className="space-y-1">
                    {scoreData.punti_forza.slice(0, 3).map((p, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {scoreData.rischi?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Rischi da considerare
                  </p>
                  <ul className="space-y-1">
                    {scoreData.rischi.slice(0, 2).map((r, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="px-5 pb-4">
            <p className="text-[10px] text-muted-foreground italic">
              I valori OMI sono stime basate su dati storici dell'Osservatorio del Mercato Immobiliare. Per valutazioni ufficiali consultare agenziaentrate.gov.it/omi o richiedere perizia a tecnico abilitato.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}