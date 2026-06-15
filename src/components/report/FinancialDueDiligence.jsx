import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingUp, Home, BarChart3, AlertTriangle, CheckCircle2, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { getOMIData, getOMIDataByNome, calcolaTariffaNotteOMI, isIndirizzoRurale } from "@/lib/omiData";

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

// ── Scorecard pesata (non AI) ────────────────────────────────────────────────
function calcWeightedScore({ roiNetto, omiIsDefault, rurale, hasVerifiedVincoli, hasPartialData, vincoli, categoriaGroup, zonaUrbanistica, hasVerifiedZoning }) {
  // FINANZA (max 5): basato su ROI netto
  let finanza = 0;
  if (roiNetto != null) {
    if (roiNetto > 80) finanza = 5;
    else if (roiNetto > 40) finanza = 4;
    else if (roiNetto > 15) finanza = 3;
    else if (roiNetto > 0) finanza = 2;
    else finanza = roiNetto < -10 ? 0 : 1;
  } else {
    finanza = 2; // dati mancanti → punteggio neutro basso
  }

  // LIQUIDITÀ/MERCATO (max 2)
  let liquidita = 0;
  if (!omiIsDefault && !rurale) liquidita = 2;
  else if (omiIsDefault && !rurale) liquidita = 1;
  else liquidita = 0;

  // AFFIDABILITÀ DATI (max 2) — richiede sia vincoli verificati CHE zonizzazione ufficiale
  let affidabilita = 0;
  if (hasVerifiedVincoli && !hasPartialData && hasVerifiedZoning) affidabilita = 2;
  else if (hasVerifiedVincoli || hasPartialData) affidabilita = 1;
  else affidabilita = 0;

  // VINCOLI/RISCHI (max 1)
  let vincoliScore = 1;
  if (vincoli?.vincolo_sismico?.zona?.includes('Zona 1') ||
      vincoli?.vincolo_idraulico?.presente === true ||
      vincoli?.vincolo_paesaggistico?.presente === true) {
    vincoliScore = 0;
  }

  let total = finanza + liquidita + affidabilita + vincoliScore;

  // BONUS cambio destinazione d'uso: categoria industriale/commerciale + zona residenziale
  const isIndustriale = ['industrial', 'commercial'].includes(categoriaGroup);
  const zonaStr = (zonaUrbanistica || '').toLowerCase();
  const isZonaResidenziale = /resid|abitativ|r\d|zona\s*[abc]/i.test(zonaStr);
  const hasCambioDest = isIndustriale && isZonaResidenziale;
  if (hasCambioDest) total = Math.min(10, total + 1);

  return { total: Math.min(10, Math.max(0, total)), finanza, liquidita, affidabilita, vincoliScore, hasCambioDest };
}

function scoreLabel(score) {
  if (score >= 8) return "Eccellente";
  if (score >= 6) return "Buono";
  if (score >= 4) return "Discreto";
  if (score >= 2) return "Critico";
  return "Sconsigliato";
}

function ScoreCircle({ score }) {
  const color = score >= 8 ? "text-emerald-600" : score >= 6 ? "text-amber-600" : score >= 4 ? "text-orange-500" : "text-red-600";
  const ring  = score >= 8 ? "border-emerald-400" : score >= 6 ? "border-amber-400" : score >= 4 ? "border-orange-400" : "border-red-400";
  const label = scoreLabel(score);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-24 h-24 rounded-full border-4 ${ring} flex items-center justify-center`}>
        <span className={`text-4xl font-black ${color}`}>{score}</span>
      </div>
      <p className={`text-sm font-bold ${color}`}>{score}/10 — {label}</p>
    </div>
  );
}

function AffidabilitaBadge({ level }) {
  const cfg = {
    alta:  { cls: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: "✓", label: "Affidabilità analisi: Alta" },
    media: { cls: "bg-amber-100 text-amber-800 border-amber-300", icon: "~", label: "Affidabilità analisi: Media" },
    bassa: { cls: "bg-red-100 text-red-800 border-red-300", icon: "⚠", label: "Affidabilità analisi: Bassa" },
  }[level] || { cls: "bg-gray-100 text-gray-700 border-gray-300", icon: "?", label: "Affidabilità: n/d" };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-semibold ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function FinancialDueDiligence({ query, finData, onSnapshotReady }) {
  // MUST be declared before any useState that references them (avoid TDZ)
  const r  = query.report_data || {};
  const fd = finData || {};

  const [scoreData, setScoreData] = useState(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const [mqOverride, setMqOverride] = useState(null);
  const [inputMq, setInputMq] = useState('');

  // ── Superficie: visura > planimetria > input utente > fallback null ────────
  const mqRaw = query.superficie_mq || r.planimetria_data?.superficie_mq || parseFloat(fd.superficie) || null;
  const mq    = (mqRaw ? parseFloat(mqRaw) : null) || mqOverride;

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
  const indirizzo = query.indirizzo_immobile || query.indirizzo_catastale || null;
  const rurale = isIndirizzoRurale(indirizzo);
  const sigla_prov = query.sigla_provincia || query.provincia || null;
  const omi = codiceBelfiore
    ? getOMIData(codiceBelfiore, query.categoria_catastale, isZonaCentrale, rurale)
    : getOMIDataByNome(query.comune, isZonaCentrale, sigla_prov, indirizzo);
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
  // valoreFlip = valore stimato di rivendita post-ristrutturazione (scenario massimo OMI)
  const valoreFlip        = valorePostRistrMax || 0;
  // MARGINE LORDO = valore vendita − investimento totale (mai può superare il valore stesso)
  const margineLordo      = (totMid != null && valoreFlip > 0) ? valoreFlip - totMid : null;
  const tassePlusvalenza  = (margineLordo != null && margineLordo > 0) ? margineLordo * 0.26 : 0;
  const margineNetto      = margineLordo != null ? margineLordo - tassePlusvalenza : null;
  const creditoImposta    = ristrMid ? ristrMid * 0.50 : null; // Bonus Ristrutturazione 50%
  // ROI = (margine lordo / investimento totale) × 100 — base corretta
  const roiFlip           = (totMid != null && totMid > 0 && margineLordo != null) ? (margineLordo / totMid) * 100 : null;
  // Break-even = prezzo minimo di vendita/mq per rientrare dall'investimento totale
  const breakEvenMq       = (totMid != null && totMid > 0 && mq > 0) ? totMid / mq : null;

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
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {omi.zona_omi_codice || 'B1'} — {omi.fascia_omi}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {omi.tipologia || 'Abitazioni civili'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {omi.semestre_label || omi.semestre_riferimento || '2° sem. 2025'}
            </Badge>
            {omi.is_default ? (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                ⚠ Media provinciale (comune non nel DB OMI)
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
          <div className="mt-2 flex flex-wrap gap-3">
            <a href={omi.fonte_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline">
              <ExternalLink className="w-3 h-3" /> Banca Dati OMI — Agenzia delle Entrate
            </a>
            <a href="https://www1.agenziaentrate.gov.it/servizi/Consultazione/ricerca.htm" target="_blank" rel="noopener noreferrer"
              className="text-xs text-emerald-700 flex items-center gap-1 hover:underline font-semibold">
              <ExternalLink className="w-3 h-3" /> Verifica su AdE →
            </a>
          </div>
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

      {/* BLOCCO 5 — Scorecard pesata */}
      {(() => {
        const isPiemonte = (query.regione || '').toLowerCase().includes('piemonte');
        const isLiguria  = (query.regione || '').toLowerCase().includes('liguria');
        const isLombardia = (query.regione || '').toLowerCase().includes('lombardia');
        const wfsRis = r.wfs_liguria?.risultati;
        const hasVerifiedVincoli = !!(wfsRis) || isPiemonte || isLiguria || isLombardia;
        const hasPartialData = omi.is_default;
        const hasVerifiedZoning = !!(r.prg_lookup_status === 'found' && r.zonizzazione?.zona_codice);
        // ROI netto: usa flipping se disponibile, altrimeti rendimento netto affitto
        const roiNetto = roiFlip != null ? roiFlip
          : rendimentoNetto != null ? rendimentoNetto
          : null;
        const categoriaRaw = query.categoria_catastale || r.dati_catastali?.categoria || '';
        const categoriaGroup = /^D\//i.test(categoriaRaw) ? 'industrial'
          : /^C\//i.test(categoriaRaw) ? 'commercial' : 'other';
        const zonaUrbanistica = r.zonizzazione?.destinazione_prevalente || wfsRis?.zona_urbanistica?.destinazione_uso || '';
        const { total: wscore, finanza: wFin, liquidita: wLiq, affidabilita: wAff, vincoliScore: wVin, hasCambioDest }
          = calcWeightedScore({ roiNetto, omiIsDefault: omi.is_default, rurale, hasVerifiedVincoli, hasPartialData, vincoli: r.vincoli, categoriaGroup, zonaUrbanistica, hasVerifiedZoning });

        const affidabilitaLevel = wAff === 2 && !omi.is_default ? 'alta' : wAff === 1 || omi.is_default ? 'media' : 'bassa';

        // Punti di forza / rischi da scoreData AI (se presente) filtrati, più cambio destinazione d'uso
        const forza = [
          ...(scoreData?.punti_forza || []).filter(p => !(prezzoAcquisto === 0 && /prezzo|acquisto|€0|0€/i.test(p))).slice(0, 3),
          ...(hasCambioDest ? [`Possibile cambio di destinazione d'uso (${categoriaRaw} → residenziale) — potenziale rivalutazione. Da verificare con NTA/CDU del Comune.`] : []),
        ];
        const rischi = (scoreData?.rischi || [])
          .filter(risk => !hasCambioDest || !/incoerenza|disallineamento|incompatib/i.test(risk))
          .slice(0, 3);

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30 flex-wrap">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-sm">Scorecard Investimento</h4>
              <div className="ml-auto">
                <AffidabilitaBadge level={affidabilitaLevel} />
              </div>
            </div>
            <div className="p-5 flex flex-col md:flex-row gap-6 items-start">
              <div className="shrink-0 flex flex-col items-center gap-3">
                <ScoreCircle score={wscore} />
                {/* Dettaglio pesi */}
                <div className="text-[10px] text-muted-foreground space-y-0.5 text-center" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  <p>Finanza: {wFin}/5 · Mercato: {wLiq}/2</p>
                  <p>Dati: {wAff}/2 · Vincoli: {wVin}/1</p>
                  {hasCambioDest && <p className="text-emerald-600 font-semibold">+1 cambio dest. uso</p>}
                </div>
              </div>
              <div className="flex-1 grid md:grid-cols-2 gap-4">
                {forza.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Punti di forza
                    </p>
                    <ul className="space-y-1">
                      {forza.map((p, i) => (
                        <li key={i} className="text-sm text-muted-foreground">• {p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {rischi.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Rischi da considerare
                    </p>
                    <ul className="space-y-1">
                      {rischi.map((r2, i) => (
                        <li key={i} className="text-sm text-muted-foreground">• {r2}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {loadingScore && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground col-span-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Analisi qualitativa in caricamento…
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 pb-4">
              <p className="text-[10px] text-muted-foreground italic">
                Punteggio pesato: Finanza (max 5) + Mercato/liquidità (max 2) + Affidabilità dati (max 2) + Vincoli (max 1).
                Valori OMI da Banca Dati AdE (open data CC BY).{" "}
                <a href="https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/omi/banche-dati/quotazioni-immobiliari"
                  target="_blank" rel="noopener noreferrer" className="underline">agenziaentrate.gov.it/omi</a>.
              </p>
            </div>
          </motion.div>
        );
      })()}
    </div>
  );
}