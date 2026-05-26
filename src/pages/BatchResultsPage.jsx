import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowLeft, Building2, ExternalLink, Loader2, Download, AlertCircle, ChevronRight, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { getOMIDataByNome } from "@/lib/omiData";

const RISTR_MID = { ottimo: 65, buono: 275, da_ristrutturare: 650, fatiscente: 1150 };

const statusMap = {
  completed: { label: "Completata", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending:   { label: "In corso",   className: "bg-amber-50  text-amber-700  border-amber-200"  },
  failed:    { label: "Errore",     className: "bg-red-50    text-red-700    border-red-200"    },
};

function fmtEur(n) {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function exportCSV(queries, batch) {
  const header = ["Sub.", "Categoria", "Piano", "Superficie mq", "Vani", "Rendita €", "Prezzo allocato €", "Zona", "Stato"];
  const rows = queries.map(q => [
    q.subalterno || "—",
    q.categoria_catastale || q.report_data?.dati_catastali?.categoria || "—",
    q.report_data?.dati_catastali?.piano || "—",
    q.superficie_mq ?? "—",
    q.vani ?? "—",
    q.rendita_catastale?.toFixed(2) ?? "—",
    q.report_data?.prezzo_acquisto_unita?.toFixed(2) ?? "—",
    q.report_data?.zonizzazione?.zona_codice || "—",
    q.status || "pending",
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `palazzina-${batch?.comune || "export"}-${batch?.id?.slice(0, 8) || ""}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function VincoliSummary({ query }) {
  const vincoli = query?.report_data?.vincoli;
  if (!vincoli) return null;
  const checks = [
    { key: "vincolo_sismico", label: "Sismico", zona: vincoli.vincolo_sismico?.zona },
    { key: "vincolo_idraulico", label: "Idraulico", zona: vincoli.vincolo_idraulico?.classe_rischio },
    { key: "vincolo_paesaggistico", label: "Paesaggistico", zona: vincoli.vincolo_paesaggistico?.tipo },
    { key: "vincolo_archeologico", label: "Archeologico", zona: null },
  ];
  return (
    <div className="bg-white border border-border rounded-lg p-4 mb-5">
      <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-3" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
        Vincoli urbanistici — validi per tutta la particella
      </p>
      <div className="flex flex-wrap gap-2">
        {checks.map(({ key, label, zona }) => {
          const v = vincoli[key];
          if (!v) return null;
          return (
            <span key={key} className={`text-[11px] px-3 py-1 rounded-full border flex items-center gap-1.5 ${v.presente ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {v.presente ? '⚠' : '✓'} {label}{zona ? ` — ${zona}` : ''}
            </span>
          );
        })}
        {vincoli.altri_vincoli?.map((v, i) => v.presente && (
          <span key={i} className="text-[11px] px-3 py-1 rounded-full border bg-amber-50 text-amber-800 border-amber-300"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            ⚠ {v.nome}
          </span>
        ))}
      </div>
    </div>
  );
}

function SintesiPalazzina({ batch, queries, onSaveTotalPrice }) {
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const totalPrice = batch.total_acquisition_price;
  const totSup = batch.total_superficie_mq || queries.reduce((s, q) => s + (q.superficie_mq || 0), 0);
  const prezzoMq = totalPrice && totSup ? totalPrice / totSup : null;

  // Renovation estimate (mid scenario) per query
  const totRistr = queries.reduce((s, q) => {
    const stato = q.report_data?.fin_data?.stato_conservativo || "buono";
    const cost = RISTR_MID[stato] || RISTR_MID.buono;
    return s + ((q.superficie_mq || 0) * cost);
  }, 0);

  // OMI post-ristr value (use comune of batch, one call)
  const omi = getOMIDataByNome(batch.comune, false);
  const totValorePostRistr = totSup ? omi.omi_post_ristr_max * totSup : null;
  const investimentoTotale = (totalPrice || 0) + totRistr + ((totalPrice || 0) * 0.10);
  const margineLordo = totValorePostRistr ? totValorePostRistr - investimentoTotale : null;
  const roi = investimentoTotale > 0 && margineLordo != null ? (margineLordo / investimentoTotale) * 100 : null;

  if (!totalPrice) {
    return (
      <div className="bg-white border-2 border-dashed border-primary/30 rounded-lg p-5 mb-5">
        <div className="flex items-start gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>Sintesi Operazione Palazzina</p>
            <p className="text-xs text-muted-foreground mt-0.5">Inserisci il prezzo di acquisizione per visualizzare l'analisi aggregata.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={editPrice}
            onChange={e => setEditPrice(e.target.value)}
            placeholder="es. 360000"
            className="flex-1 text-xs px-3 py-2 border border-border rounded"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          />
          <Button size="sm" disabled={!editPrice || saving} onClick={async () => {
            setSaving(true);
            await onSaveTotalPrice(parseFloat(editPrice));
            setSaving(false);
          }} style={{ background: '#1A3A6B' }}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salva'}
          </Button>
        </div>
      </div>
    );
  }

  const items = [
    { label: "Prezzo totale acquisizione", value: fmtEur(totalPrice), bold: true },
    { label: "Superficie totale", value: totSup ? `${totSup.toLocaleString('it-IT')} mq` : "—" },
    { label: "Prezzo medio per mq", value: prezzoMq ? fmtEur(prezzoMq) + "/mq" : "—" },
    { label: "Stima ristrutturazione (scenario medio)", value: fmtEur(totRistr) },
    { label: "Spese accessorie (10%)", value: fmtEur(totalPrice * 0.10) },
    { label: "Investimento totale complessivo", value: fmtEur(investimentoTotale), bold: true },
    { label: "Valore post-ristr stimato (OMI max)", value: totValorePostRistr ? fmtEur(totValorePostRistr) : "—" },
    { label: "Margine lordo totale", value: margineLordo != null ? fmtEur(margineLordo) : "—", colored: true, val: margineLordo },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-border rounded-lg overflow-hidden mb-5">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border" style={{ background: '#1e3a5f' }}>
        <TrendingUp className="w-4 h-4 text-white" />
        <h3 className="font-semibold text-sm text-white">Sintesi Operazione Palazzina</h3>
        {roi != null && (
          <span className={`ml-auto text-sm font-bold px-3 py-1 rounded ${roi >= 5 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            ROI {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map(({ label, value, bold, colored, val }) => (
          <div key={label} className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-sm ${bold ? 'font-bold' : 'font-semibold'} ${colored ? (val >= 0 ? 'text-emerald-700' : 'text-red-600') : ''}`}
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {value}
            </p>
          </div>
        ))}
      </div>
      <div className="px-5 pb-3 text-[10px] text-muted-foreground italic" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        Valori OMI: {omi.fascia_omi} — {omi.semestre_riferimento}. Analisi indicativa. Verificare con professionista abilitato.
      </div>
    </motion.div>
  );
}

export default function BatchResultsPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: batch, isLoading: batchLoading } = useQuery({
    queryKey: ["batch", id],
    queryFn: () => base44.entities.BatchQuery.filter({ id }).then(r => r[0]),
  });

  const { data: queries = [], isLoading: queriesLoading } = useQuery({
    queryKey: ["batchQueries", id],
    queryFn: () => base44.entities.CadastralQuery.filter({ batch_id: id }, "created_date", 50),
    enabled: !!id,
  });

  const handleSaveTotalPrice = async (price) => {
    await base44.entities.BatchQuery.update(id, { total_acquisition_price: price });
    queryClient.invalidateQueries({ queryKey: ["batch", id] });
  };

  if (batchLoading || queriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">Batch non trovato</p>
        <Link to="/history" className="text-primary text-sm hover:underline mt-2 inline-block">Torna allo storico</Link>
      </div>
    );
  }

  const totSuperficie = queries.reduce((s, q) => s + (q.superficie_mq || 0), 0);
  const totRendita    = queries.reduce((s, q) => s + (q.rendita_catastale || 0), 0);
  const totVani       = queries.reduce((s, q) => s + (q.vani || 0), 0);
  const paidCount     = queries.filter(q => q.paid).length;

  const queryWithVincoli = queries.find(q => q.report_data?.vincoli);
  const foglio     = queries[0]?.foglio;
  const particella = queries[0]?.particella;
  const samePart   = queries.length > 0 && queries.every(q => q.foglio === foglio && q.particella === particella);

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3 h-3" /> Torna allo storico
        </Link>

        {/* Header */}
        <div className="rounded-xl p-5 mb-5" style={{ background: '#1e3a5f' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                <Building2 className="w-3 h-3" />
                {samePart ? 'Analisi Palazzina' : 'Analisi Portfolio'}
              </p>
              <h1 className="text-xl lg:text-2xl font-bold text-white" style={{ fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' }}>
                {batch.label || batch.comune}
              </h1>
              {samePart && foglio && (
                <p className="text-white/70 text-sm mt-1 font-mono">Foglio {foglio} — Particella {particella}</p>
              )}
              <p className="text-white/50 text-xs mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {batch.total_units} {batch.total_units === 1 ? 'unità' : 'subalterni'} · {format(new Date(batch.created_date), "d MMMM yyyy", { locale: it })}
              </p>
            </div>
            <Badge className={`text-[11px] border-0 self-start lg:self-center ${batch.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'} text-white`}>
              {batch.status === 'completed' ? '✓ Completato' : batch.status === 'partial' ? '⚠ Parziale' : '⏳ In corso'}
            </Badge>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Subalterni", value: batch.total_units },
            { label: "Superficie tot.", value: totSuperficie ? `${totSuperficie.toLocaleString('it-IT')} mq` : "—" },
            { label: "Rendita totale", value: totRendita ? `€ ${totRendita.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—" },
            { label: "Vani totali", value: totVani || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-border rounded-lg p-4 text-center">
              <p className="text-lg font-bold" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>{value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-5 no-print flex-wrap">
          <Button variant="outline" className="gap-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50" onClick={() => exportCSV(queries, batch)}>
            <Download className="w-4 h-4" /> Esporta CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Download className="w-4 h-4" /> Stampa / PDF
          </Button>
        </div>

        {/* Sintesi Palazzina */}
        {samePart && (
          <SintesiPalazzina batch={batch} queries={queries} onSaveTotalPrice={handleSaveTotalPrice} />
        )}

        {/* Vincoli condivisi */}
        {queryWithVincoli && <VincoliSummary query={queryWithVincoli} />}

        {/* Tabella */}
        <div className="bg-white border border-border rounded-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <thead>
                <tr className="border-b border-border" style={{ background: '#F4EFE6' }}>
                  {["Sub.", "Categoria", "Piano", "Superficie", "Vani", "Rendita", "Prezzo allocato", "Zona", "Stato", ""].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queries.map((q, i) => {
                  const cat = q.categoria_catastale || q.report_data?.dati_catastali?.categoria || "—";
                  const piano = q.report_data?.dati_catastali?.piano || "—";
                  const zona = q.report_data?.zonizzazione?.zona_codice || "—";
                  const prezzoUnita = q.report_data?.prezzo_acquisto_unita;
                  const status = statusMap[q.status] || statusMap.pending;
                  const isOpen = expandedRow === q.id;
                  return (
                    <React.Fragment key={q.id}>
                      <tr
                        className={`border-b border-border cursor-pointer transition-colors ${isOpen ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white hover:bg-stone-50' : 'bg-stone-50/50 hover:bg-stone-100'}`}
                        onClick={() => setExpandedRow(isOpen ? null : q.id)}
                      >
                        <td className="px-3 py-2.5 font-bold" style={{ color: '#1A3A6B' }}>{q.subalterno || "—"}</td>
                        <td className="px-3 py-2.5">{cat}</td>
                        <td className="px-3 py-2.5">{piano}</td>
                        <td className="px-3 py-2.5">{q.superficie_mq ? `${q.superficie_mq} mq` : "—"}</td>
                        <td className="px-3 py-2.5">{q.vani ?? "—"}</td>
                        <td className="px-3 py-2.5">{q.rendita_catastale ? `€ ${q.rendita_catastale.toLocaleString('it-IT')}` : "—"}</td>
                        <td className="px-3 py-2.5">{prezzoUnita ? fmtEur(prezzoUnita) : "—"}</td>
                        <td className="px-3 py-2.5 max-w-[100px] truncate">{zona}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className={`text-[10px] ${status.className}`}>{status.label}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-blue-50 border-b border-border">
                          <td colSpan={10} className="px-4 py-3">
                            <div className="flex flex-wrap gap-4 text-xs">
                              {q.report_data?.zonizzazione?.descrizione && (
                                <div>
                                  <p className="text-muted-foreground text-[10px] uppercase mb-0.5">Destinazione</p>
                                  <p>{q.report_data.zonizzazione.descrizione}</p>
                                </div>
                              )}
                              {prezzoUnita && (
                                <div>
                                  <p className="text-muted-foreground text-[10px] uppercase mb-0.5">Prezzo allocato</p>
                                  <p className="font-semibold">{fmtEur(prezzoUnita)}</p>
                                </div>
                              )}
                              <div className="flex items-center gap-2 ml-auto">
                                <Link to={`/report/${q.id}`}>
                                  <Button size="sm" variant="outline" className="gap-1 text-xs h-7">
                                    <ExternalLink className="w-3 h-3" />
                                    {(q.paid || batch?.status !== 'pending') ? 'Apri report' : 'Anteprima / Sblocca'}
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {/* Totals row */}
                {queries.length > 1 && (
                  <tr style={{ background: '#1A3A6B' }}>
                    <td className="px-3 py-2.5 font-bold text-white text-[10px] uppercase tracking-wide" colSpan={3}>TOTALI</td>
                    <td className="px-3 py-2.5 font-bold text-white">{totSuperficie ? `${totSuperficie.toLocaleString('it-IT')} mq` : "—"}</td>
                    <td className="px-3 py-2.5 font-bold text-white">{totVani || "—"}</td>
                    <td className="px-3 py-2.5 font-bold text-white">{totRendita ? `€ ${totRendita.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : "—"}</td>
                    <td className="px-3 py-2.5 font-bold text-white">{batch.total_acquisition_price ? fmtEur(batch.total_acquisition_price) : "—"}</td>
                    <td colSpan={3} className="px-3 py-2.5 text-white/60 text-[10px]">{paidCount}/{batch.total_units} sbloccate</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="p-4 rounded-lg border-2 border-amber-300 bg-amber-50 flex items-start gap-3 no-print">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-900 leading-relaxed">
          <strong>⚠️ Questo report ha valore esclusivamente informativo</strong> e non costituisce parere professionale.
          Verificare i dati presso gli uffici tecnici comunali. —{" "}
          <Link to="/termini" className="underline hover:text-amber-700">Termini e Condizioni</Link>
        </p>
      </motion.div>
    </div>
  );
}