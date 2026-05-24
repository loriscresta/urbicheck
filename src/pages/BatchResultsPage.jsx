import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowLeft, Building2, ChevronDown, ChevronUp, ExternalLink, Loader2, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const statusMap = {
  completed: { label: "Completata", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "In attesa", className: "bg-amber-50 text-amber-700 border-amber-200" },
  failed: { label: "Errore", className: "bg-red-50 text-red-700 border-red-200" },
};

function QueryCard({ query, index }) {
  const [expanded, setExpanded] = useState(false);
  const r = query.report_data || {};
  const status = statusMap[query.status] || statusMap.pending;
  const zona = r.zonizzazione?.zona_codice || r.zonizzazione?.destinazione_prevalente || "—";
  const colore = r.zonizzazione?.colore;
  const complessita = r.valutazione_sintetica?.livello_complessita;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-border rounded-lg overflow-hidden bg-white"
    >
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded text-xs font-bold shrink-0"
            style={{ background: '#F4EFE6', border: '1px solid #C4BAA8', color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
            {index + 1}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              F.{query.foglio} P.{query.particella}
              {query.subalterno ? ` — Sub. ${query.subalterno}` : ''}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
              {zona}{r.dati_catastali?.categoria ? ` · ${r.dati_catastali.categoria}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {colore && (
            <span className={`w-2.5 h-2.5 rounded-full ${colore === 'verde' ? 'bg-emerald-500' : colore === 'rosso' ? 'bg-red-500' : 'bg-amber-500'}`} />
          )}
          {complessita && <Badge variant="outline" className="text-[10px]">{complessita}</Badge>}
          <Badge variant="outline" className={`text-[10px] ${status.className}`}>{status.label}</Badge>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {r.zonizzazione?.destinazione_prevalente && (
              <div>
                <p className="text-muted-foreground uppercase tracking-wide text-[10px] mb-0.5">Destinazione</p>
                <p className="font-semibold">{r.zonizzazione.destinazione_prevalente}</p>
              </div>
            )}
            {r.dati_catastali?.categoria && (
              <div>
                <p className="text-muted-foreground uppercase tracking-wide text-[10px] mb-0.5">Categoria</p>
                <p className="font-semibold">{r.dati_catastali.categoria}</p>
              </div>
            )}
            {complessita && (
              <div>
                <p className="text-muted-foreground uppercase tracking-wide text-[10px] mb-0.5">Complessità</p>
                <p className="font-semibold">{complessita}</p>
              </div>
            )}
          </div>

          {r.vincoli && (
            <div className="flex flex-wrap gap-2">
              {r.vincoli.vincolo_sismico?.presente !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded border ${r.vincoli.vincolo_sismico.presente ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {r.vincoli.vincolo_sismico.presente ? '⚠ Sismico' : '✓ Sismico OK'}
                </span>
              )}
              {r.vincoli.vincolo_paesaggistico?.presente !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded border ${r.vincoli.vincolo_paesaggistico.presente ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {r.vincoli.vincolo_paesaggistico.presente ? '⚠ Paesaggistico' : '✓ Paesaggistico OK'}
                </span>
              )}
            </div>
          )}

          <div className="pt-1">
            <Link to={`/report/${query.id}`}>
              <Button size="sm" variant="outline" className="gap-1 text-xs h-8">
                <ExternalLink className="w-3 h-3" />
                {query.paid ? 'Apri report completo' : 'Apri anteprima / Sblocca'}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function BatchResultsPage() {
  const { id } = useParams();

  const { data: batch, isLoading: batchLoading } = useQuery({
    queryKey: ["batch", id],
    queryFn: () => base44.entities.BatchQuery.filter({ id }).then(r => r[0]),
  });

  const { data: queries = [], isLoading: queriesLoading } = useQuery({
    queryKey: ["batchQueries", id],
    queryFn: () => base44.entities.CadastralQuery.filter({ batch_id: id }, "-created_date", 50),
    enabled: !!id,
  });

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

  const paidCount = queries.filter(q => q.paid).length;
  const completedCount = queries.filter(q => q.status === 'completed' || q.paid).length;

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3 h-3" /> Torna allo storico
        </Link>

        <div className="rounded-xl p-5 mb-4" style={{ background: '#1e3a5f' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                <Building2 className="w-3 h-3" /> Analisi Portfolio
              </p>
              <h1 className="text-xl lg:text-2xl font-bold text-white">
                {batch.comune} {batch.provincia ? `(${batch.provincia})` : ''}
              </h1>
              <p className="text-white/70 text-sm mt-1">
                {batch.total_units} unità · {format(new Date(batch.created_date), "d MMMM yyyy", { locale: it })}
              </p>
            </div>
            <div className="flex flex-col items-start lg:items-end gap-2">
              <Badge className={`text-[10px] border-0 ${batch.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'} text-white`}>
                {batch.status === 'completed' ? '✓ Completato' : batch.status === 'partial' ? '⚠ Parziale' : 'In corso'}
              </Badge>
              <span className="text-white/60 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {paidCount} sbloccate · {batch.total_units - paidCount} in anteprima
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Unità totali", value: batch.total_units, color: '#1A3A6B' },
            { label: "Elaborate", value: completedCount, color: '#059669' },
            { label: "Fallite", value: batch.failed_units || 0, color: batch.failed_units > 0 ? '#dc2626' : '#9ca3af' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-border rounded-lg p-4 text-center">
              <p className="text-xl font-bold" style={{ color, fontFamily: "'IBM Plex Mono', monospace" }}>{value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 no-print">
          <Button variant="outline" className="gap-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50" onClick={() => window.print()}>
            <Download className="w-4 h-4" /> 📄 Stampa / Salva PDF portfolio
          </Button>
        </div>
      </motion.div>

      <div className="space-y-3">
        {queries.map((query, i) => (
          <QueryCard key={query.id} query={query} index={i} />
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="mt-8 p-4 rounded-lg border-2 border-amber-300 bg-amber-50 flex items-start gap-3 no-print">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-900 leading-relaxed">
          <strong>⚠️ Questo report ha valore esclusivamente informativo</strong> e non costituisce parere professionale.
          Verificare i dati presso gli uffici tecnici comunali. —{" "}
          <a href="/termini-e-condizioni" className="underline hover:text-amber-700">Termini e Condizioni</a>
        </p>
      </motion.div>
    </div>
  );
}