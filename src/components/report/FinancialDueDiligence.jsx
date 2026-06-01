import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingUp, Home, BarChart3, AlertTriangle, CheckCircle2, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { getOMIData, getOMIDataByNome, calcolaTariffaNotteOMI } from "@/lib/omiData";

// ── Costi ristrutturazione 2025 ─────────────────────────────────────────────
const RISTR_COSTS = {
  ottimo:           { min: 0,   mid: 65,   max: 150  },
  buono:            { min: 200, mid: 275,  max: 350  },
  da_ristrutturare: { min: 500, mid: 650,  max: 800  },
  fatiscente:       { min: 900, mid: 1150, max: 1400 },
};

function fmtEur(n) {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: true }).format(n);
}

function roiToScore(roi) {
  if (roi > 25) return 10; if (roi > 15) return 8; if (roi > 5) return 6;
  if (roi > 0) return 4; return 2;
}

function ScoreCircle({ score }) {
  const color = score >= 7 ? "text-emerald-600" : score >= 5 ? "text-amber-500" : "text-red-500";
  const ring  = score >= 7 ? "border-emerald-400" : score >= 5 ? "border-amber-400" : "border-red-400";
  const label = score >= 9 ? "Eccellente" : score >= 7 ? "Molto interessante" : score >= 5 ? "Interessante" : score >= 3 ? "Marginale" : "Non conveniente";
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
  const [scoreData, setScoreData] = useState(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const [mqOverride, setMqOverride] = useState(() => fd.superficie ? parseFloat(fd.superficie) : null);
  const [inputMq, setInputMq] = useState('');

  const r   = query.report_data || {};
  const fd  = finData || {};

  // ── Superficie: usa sempre il valore reale, mai fallback numerico ──────────
  const mqRaw = query.superficie_mq || null;
  const mq    = mqOverride || (mqRaw ? parseFloat(mqRaw) : null);

  // Use per-unit allocated price (batch) if available, else fin_data price
  const prezzoAcquisto     = parseFloat(r.prezzo_acquisto_unita) || parseFloat(fd.prezzo_acquisto) || 0;
  const isAllocatedPrice   = !!(r.prezzo_acquisto_unita && query.batch_id);
  const spesePerc          = parseFloat(fd.spese_accessorie) || 10;
  const statoKey           = (fd.stato_conservativo || "buono").replace(/\s.*/, "").toLowerCase();
  const costs              = RISTR_COSTS[statoKey] || RISTR_COSTS.buono;

  const isFlipping     = fd.destinazione_obiettivo === "flipping";
  const isAffittoLungo = fd.destinazione_obiettivo === "affitto_lungo";
  const isAffittoBreve = fd.destinazione_obiettivo === "affitto_breve";

  // ── Dati OMI reali (statici, nessuna chiamata AI) ─────────────────────────
  // Pulizia codice Belfiore: rimuovi underscore e spazi (es "A182_" → "A182")
  const codiceBelfioreRaw = query.codice_comune_catasto || null;
  const codiceBelfiore = codiceBelfioreRaw ? codiceBelfioreRaw.replace(/[_\s]/g, '').toUpperCase() : null;
  const isZonaCentrale  = false; // default: fascia B/C periferica
  // FIX 7 — Fallback to name-based lookup when no codice belfiore in entity
  const omi = codiceBelfiore
    ? getOMIData(codiceBelfiore, query.categoria_catastale, isZonaCentrale)
    : getOMIDataByNome(query.comune, isZonaCentrale);
  console.log('OMI lookup:', query.comune, '| belfiore:', codiceBelfiore, '| is_default:', omi.is_default);

  // ── Calcoli investimento (solo se superficie disponibile) ─────────────────
  const spese     = mq ? prezzoAcquisto * (spesePerc / 100) : null;
  const ristrMin  = mq ? costs.min * mq : null;
  const ristrMid  = mq ? costs.mid * mq : null;
  const ristrMax  = mq ? costs.max * mq : null;
  const totMin    = mq && prezzoAcquisto > 0 ? prezzoAcquisto + ristrMin + spese : null;
  const totMid    = mq && prezzoAcquisto > 0 ? prezzoAcquisto + ristrMid + spese : null;
  const totMax    = mq && prezzoAcquisto > 0 ? prezzoAcquisto + ristrMax + spese : null;

  const valoreMercatoMin    = mq ? omi.omi_min_mq * mq : null;
  const valoreMercatoMax    = mq ? omi.omi_max_mq * mq : null;
  const valorePostRistrMin  = mq ? omi.omi_post_ristr_min * mq : null;
  const valorePostRistrMax  = mq ? omi.omi_post_ristr_max * mq : null;

  // Proxy prezzo se non inserito
  const prezzoEffettivo   = prezzoAcquisto > 0
    ? prezzoAcquisto
    : (mq ? omi.omi_medio_mq * mq : 0);
  const usandoProxyPrezzo = prezzoAcquisto === 0 && prezzoEffettivo > 0;

  // Flipping
  const valoreFlip        = valorePostRistrMax || 0;
  const margineLordo      = totMid ? valoreFlip - totMid : null;
  const tassePlusvalenza  = margineLordo > 0 ? margineLordo * 0.26 : 0;
  const margineNetto      = margineLordo != null ? margineLordo - tassePlusvalenza : null;
  const creditoImposta    = ristrMid ? ristrMid * 0.50 : null; // Bonus Ristrutturazione 50%
  const roiFlip           = totMid > 0 && margineLordo != null ? (margineLordo / totMid) * 100 : null;
  const breakEvenMq       = totMid > 0 && mq > 0 ? totMid / mq : null;

  // Affitto lungo
  const canoneAnnuo       = mq
    ? ((omi.canone_locazione_min + omi.canone_locazione_max) / 2) * mq * 12
    : null;
  const canoneMin         = mq ? omi.canone_locazione_min * mq : null;
  const canoneMax         = mq ? omi.canone_locazione_max * mq : null;
  const rendimentoLordo   = canoneAnnuo && prezzoEffettivo > 0
    ? (canoneAnnuo / prezzoEffettivo) * 100
    : null;
  const rendimentoNetto   = rendimentoLordo ? rendimentoLordo * 0.79 : null;
  const payback           = canoneAnnuo && rendimentoNetto
    ? prezzoEffettivo / (canoneAnnuo * 0.79)
    : null;

  // Affitto breve (formula OMI-based, non AI)
  const tariffaNotte      = mq
    ? calcolaTariffaNotteOMI(omi.canone_locazione_min, omi.canone_locazione_max, mq, omi.is_costiero)
    : null;
  const nottiAnno         = 219; // 60% occupancy
  const revenueBreveMin   = tariffaNotte ? tariffaNotte.notte_min * nottiAnno : null;
  const revenueBreveMax   = tariffaNotte ? tariffaNotte.notte_max * nottiAnno : null;
  const revenueBreve      = revenueBreveMin && revenueBreveMax ? (revenueBreveMin + revenueBreveMax) / 2 : null;
  const revenueNettaBreve = revenueBreve ? revenueBreve * 0.72 : null;
  const rendimentoBreve   = revenueBreve && totMid > 0 ? (revenueBreve / totMid) * 100 : null;

  // ── Scorecard AI (rimane AI, solo per valutazione qualitativa) ─────────────
  useEffect(() => {
    const savedScore = r.fin_data?.score_snapshot;
    if (savedScore) { setScoreData(savedScore); return; }

    setLoadingScore(true);
    const zona        = r.zonizzazione?.destinazione_prevalente || "residenziale";
    const isPiemonte  = (query.regione || '').toLowerCase().includes('piemonte');
    const sismicaInfo = isPiemonte
      ? "Zona sismica 3 (DGR 6-887/2019)"
      : `vincolo_sismico=${r.vincoli?.vincolo_sismico?.presente}`;

    base44.integrations.Core.InvokeLLM({
      prompt: `Sei un analista di investimenti immobiliari italiani. Valuta questo investimento su scala 1-10:
- Comune: ${query.comune}, ${query.regione}
- Zona urbanistica: ${zona}
- Finalità: ${query.finalita}
- Prezzo acquisto: €${prezzoAcquisto}
- Superficie: ${mq || "non specificata"} mq
- Stato: ${fd.stato_conservativo || "buono"}
- Destinazione obiettivo: ${fd.destinazione_obiettivo || "non specificato"}
- Vincoli: ${sismicaInfo}, idraulico=${r.vincoli?.vincolo_idraulico?.presente}, paesaggistico=${r.vincoli?.vincolo_paesaggistico?.presente}
${isPiemonte ? "NOTA: Vincolo sismico Zona 3 sempre presente per legge (DGR 6-887/2019)." : ""}
Fornisci punteggio e analisi sintetica.`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          punti_forza: { type: "array", items: { type: "string" } },
          rischi: { type: "array", items: { type: "string" } },
        }
      }
    }).then(async (score) => {
      setScoreData(score);
      setLoadingScore(false);
      if (onSnapshotReady) onSnapshotReady({ omi, score });
      // Salva snapshot
      try {
        const currentData = await base44.entities.CadastralQuery.filter({ id: query.id });
        const current = currentData[0];
        if (current) {
          const updatedFinData = { ...(current.report_data?.fin_data || {}), score_snapshot: score };
          await base44.entities.CadastralQuery.update(query.id, {
            report_data: { ...current.report_data, fin_data: updatedFinData }
          });
        }
      } catch (_e) { /* non bloccante */ }
    }).catch(() => setLoadingScore(false));
  }, []);

  // Notifica snapshot immediatamente con dati OMI statici
  useEffect(() => {
    if (onSnapshotReady && !r.fin_data?.score_snapshot) {
      onSnapshotReady({ omi, score: null });
    }
  }, []);

  // ── Blocco "superficie mancante" con input inline ────────────────────────
  if (!mq) {
    return (
      <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-amber-900 mb-1">Superficie mancante — inseriscila per calcolare</p>
            <p className="text-sm text-amber-800 mb-4">
              Per visualizzare l'analisi finanziaria è necessario conoscere la superficie dell'immobile.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="number"
                value={inputMq}
                onChange={e => setInputMq(e.target.value)}
                placeholder="es. 85"
                className="h-9 w-28 text-sm bg-white"
                min="1" max="9999"
                onKeyDown={e => { if (e.key === 'Enter' && parseFloat(inputMq) > 0) setMqOverride(parseFloat(inputMq)); }}
              />
              <span className="text-sm text-amber-800">m²</span>
              <Button
                size="sm"
                className="bg-amber-700 hover:bg-amber-800 text-white"
                onClick={async () => {
                  const v = parseFloat(inputMq);
                  if (v > 0) {
                    setMqOverride(v);
                    try {
                      const records = await base44.entities.CadastralQuery.filter({ id: query.id });
                      const current = records[0];
                      if (current) {
                        await base44.entities.CadastralQuery.update(query.id, {
                          report_data: {
                            ...current.report_data,
                            fin_data: { ...(current.report_data?.fin_data || {}), superficie: String(v) },
                          },
                        });
                      }
                    } catch (_e) { /* non bloccante */ }
                  }
                }}
                disabled={!inputMq || parseFloat(inputMq) <= 0}
              >
                Calcola →
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avviso proxy prezzo */}
      {isAllocatedPrice && (
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
        <span>ℹ️</span>
        <span>
          Prezzo allocato per questa unità: <strong>{fmtEur(prezzoAcquisto)}</strong> — ripartizione proporzionale del prezzo totale per superficie ({mq} mq).
        </span>
      </div>
    )}
    {usandoProxyPrezzo && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>Prezzo d'acquisto non inserito — rendimento calcolato su valore OMI stimato ({fmtEur(prezzoEffettivo)}). Inserisci il prezzo richiesto per un'analisi reale.</span>
        </div>
      )}

      {/* BLOCCO 1 — OMI ufficiali */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Valori OMI — Osservatorio Mercato Immobiliare AdE</h4>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">{omi.fascia_omi}</Badge>
            <Badge variant="outline" className="text-xs">{omi.semestre_riferimento}</Badge>
            {omi.is_default ? (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                ⚠ Comune non nel DB OMI — medie provinciali
              </Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                ✓ Dati OMI ufficiali AdE
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Valore mercato attuale /mq", value: `${fmtEur(omi.omi_min_mq)} – ${fmtEur(omi.omi_max_mq)}` },
              { label: `Valore stimato OGGI (${mq} mq)`, value: `${fmtEur(valoreMercatoMin)} – ${fmtEur(valoreMercatoMax)}` },
              { label: "Post-ristrutturazione /mq", value: `${fmtEur(omi.omi_post_ristr_min)} – ${fmtEur(omi.omi_post_ristr_max)}` },
              { label: `Valore POST-RISTR (${mq} mq)`, value: `${fmtEur(valorePostRistrMin)} – ${fmtEur(valorePostRistrMax)}` },
            ].map(d => (
              <div key={d.label} className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">{d.label}</p>
                <p className="font-semibold text-sm">{d.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground italic">
            <Info className="w-3 h-3 inline mr-1" />
            {omi.note_mercato}
          </p>
          <a href={omi.fonte_url} target="_blank" rel="noopener noreferrer"
            className="mt-1 text-xs text-primary flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> Banca Dati OMI — Agenzia delle Entrate
          </a>
        </div>
      </motion.div>

      {/* BLOCCO 2 — Costi ristrutturazione */}
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
                ["Superficie", `${mq} mq`, `${mq} mq`, `${mq} mq`],
                ["Costo ristr. (€/mq)", `€${costs.min}`, `€${costs.mid}`, `€${costs.max}`],
                ["Totale ristrutturazione", fmtEur(ristrMin), fmtEur(ristrMid), fmtEur(ristrMax)],
                prezzoAcquisto > 0 ? [`Prezzo acquisto`, fmtEur(prezzoAcquisto), fmtEur(prezzoAcquisto), fmtEur(prezzoAcquisto)] : null,
                prezzoAcquisto > 0 ? [`Spese accessorie (${spesePerc}%)`, fmtEur(spese), fmtEur(spese), fmtEur(spese)] : null,
              ].filter(Boolean).map(([label, ...vals], i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-muted-foreground">{label}</td>
                  {vals.map((v, j) => <td key={j} className="py-2 pr-4 text-right">{v}</td>)}
                </tr>
              ))}
              {prezzoAcquisto > 0 && (
                <tr className="bg-primary/5 font-bold">
                  <td className="py-3 pr-4">INVESTIMENTO TOTALE</td>
                  <td className="py-3 pr-4 text-right text-emerald-700">{fmtEur(totMin)}</td>
                  <td className="py-3 pr-4 text-right text-amber-700">{fmtEur(totMid)}</td>
                  <td className="py-3 text-right text-red-700">{fmtEur(totMax)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* BLOCCO 3 — Flipping */}
      {isFlipping && prezzoAcquisto > 0 && totMid && (
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
                <span className={`font-bold ${roiFlip >= 15 ? "text-emerald-700" : roiFlip >= 5 ? "text-amber-700" : "text-red-700"}`}>{roiFlip?.toFixed(1)}%</span>
              </div>
              <div className="bg-white/50 rounded-lg px-4 py-2">
                <span className="text-muted-foreground">Tassa plusvalenza (26%): </span>
                <span className="font-bold">{fmtEur(tassePlusvalenza)}</span>
              </div>
              {creditoImposta && (
                <div className="bg-white/50 rounded-lg px-4 py-2">
                  <span className="text-muted-foreground">Credito d'imposta (Bonus Ristr. 50%): </span>
                  <span className="font-bold text-emerald-700">{fmtEur(creditoImposta)}</span>
                </div>
              )}
              <div className="bg-white/50 rounded-lg px-4 py-2">
                <span className="text-muted-foreground">MARGINE NETTO: </span>
                <span className={`font-bold ${margineNetto >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmtEur(margineNetto)}</span>
              </div>
            </div>
            {breakEvenMq && (
              <p className="text-xs text-muted-foreground mt-3">
                Break-even: devi vendere almeno a <strong>{fmtEur(breakEvenMq)}/mq</strong> per andare in pareggio.
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* BLOCCO 4 — Affitto lungo */}
      {isAffittoLungo && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Redditività Locatizia — Affitto Lungo Termine</h4>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Canone mensile stimato (OMI)", value: `${fmtEur(canoneMin)} – ${fmtEur(canoneMax)}` },
                { label: "Canone annuo", value: fmtEur(canoneAnnuo) },
                rendimentoLordo ? { label: "Rendimento lordo", value: `${rendimentoLordo.toFixed(2)}%` } : null,
                rendimentoNetto ? { label: "Rendimento netto (ced. sec. 21%)", value: `${rendimentoNetto.toFixed(2)}%` } : null,
                payback ? { label: "Pay-back period", value: `${payback.toFixed(1)} anni` } : null,
              ].filter(Boolean).map(d => (
                <div key={d.label} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{d.label}</p>
                  <p className="font-semibold text-sm">{d.value}</p>
                </div>
              ))}
            </div>
            {rendimentoLordo && (
              <p className="text-xs text-muted-foreground mt-3 italic">
                Media nazionale affitti residenziali: 4–5% lordo.{" "}
                {rendimentoLordo >= 5 ? "✓ Rendimento in linea o superiore alla media." : "⚠ Rendimento sotto la media nazionale."}
              </p>
            )}
            {!prezzoAcquisto && (
              <p className="text-xs text-amber-700 mt-2">⚠ Rendimento calcolato su valore OMI stimato — inserisci il prezzo d'acquisto per un dato preciso.</p>
            )}
          </div>
        </motion.div>
      )}

      {/* BLOCCO 4b — Affitto breve */}
      {isAffittoBreve && tariffaNotte && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Redditività Locatizia — Affitto Breve (B&B/Airbnb)</h4>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: `Tariffa/notte stimata${omi.is_costiero ? " (+50% stagionalità)" : ""}`, value: `${fmtEur(tariffaNotte.notte_min)} – ${fmtEur(tariffaNotte.notte_max)}` },
                { label: "Notti/anno (60% occ.)", value: `${nottiAnno} notti` },
                { label: "Revenue annua lorda (media)", value: fmtEur(revenueBreve) },
                { label: "Revenue netta (–28%)", value: fmtEur(revenueNettaBreve) },
              ].map(d => (
                <div key={d.label} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{d.label}</p>
                  <p className="font-semibold text-sm">{d.value}</p>
                </div>
              ))}
            </div>
            {rendimentoBreve && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
                <strong>Nota:</strong> Rendimento lordo stimato: {rendimentoBreve.toFixed(1)}%. Dedurre gestione, pulizie e platform fee (~25–30%). Verificare normativa locale sugli affitti brevi (L. 191/2023).
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2 italic">
              Tariffa calcolata su valori OMI reali (canone locazione × premium breve termine{omi.is_costiero ? " × 1.5 stagionalità costiera" : ""}).
            </p>
          </div>
        </motion.div>
      )}

      {/* BLOCCO 5 — Scorecard AI */}
      {loadingScore && (
        <div className="flex items-center justify-center py-8 gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Calcolo scorecard investimento…</span>
        </div>
      )}
      {scoreData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Scorecard Investimento</h4>
          </div>
          <div className="p-5 flex flex-col md:flex-row gap-6 items-start">
            <div className="shrink-0 flex justify-center md:block">
              <ScoreCircle score={roiFlip != null ? roiToScore(roiFlip) : Math.round(scoreData.score)} />
            </div>
            <div className="flex-1 grid md:grid-cols-2 gap-4">
              {scoreData.punti_forza?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Punti di forza
                  </p>
                  <ul className="space-y-1">
                    {scoreData.punti_forza
                      .filter(p => !(prezzoAcquisto === 0 && /prezzo|acquisto|€0|0€/i.test(p)))
                      .slice(0, 3).map((p, i) => (
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
                    {scoreData.rischi.slice(0, 2).map((r2, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {r2}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="px-5 pb-4">
            <p className="text-[10px] text-muted-foreground italic">
              Valori di mercato da Banca Dati OMI — Agenzia delle Entrate (dati ufficiali, open data CC BY).
              Per valutazioni ufficiali consultare{" "}
              <a href="https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/omi/banche-dati/quotazioni-immobiliari"
                target="_blank" rel="noopener noreferrer" className="underline">agenziaentrate.gov.it/omi</a>.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}