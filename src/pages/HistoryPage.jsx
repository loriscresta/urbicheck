import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Search, ChevronRight, FileText, Loader2, FileSearch } from "lucide-react";
import { motion } from "framer-motion";
import AttiRequestList from "@/components/atti/AttiRequestList";

const statusMap = {
  completed: { label: "Completata", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "In corso", className: "bg-amber-50 text-amber-700 border-amber-200" },
  failed: { label: "Errore", className: "bg-red-50 text-red-700 border-red-200" },
};

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("queries");

  const { data: queries = [], isLoading } = useQuery({
    queryKey: ["allQueries"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.CadastralQuery.filter({ created_by: user.email }, "-created_date", 100);
    },
  });

  const { data: batches = [] } = useQuery({
    queryKey: ["allBatches"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.BatchQuery.filter({ created_by: user.email }, "-created_date", 50);
    },
  });

  // Group: standalone queries (no batch_id) + batch summaries
  const standaloneQueries = queries.filter(q => !q.batch_id);
  const batchQueriesMap = queries.reduce((acc, q) => {
    if (q.batch_id) { if (!acc[q.batch_id]) acc[q.batch_id] = []; acc[q.batch_id].push(q); }
    return acc;
  }, {});

  const filteredStandalone = standaloneQueries.filter(q =>
    !searchTerm ||
    q.comune?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.regione?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.foglio?.includes(searchTerm) ||
    q.particella?.includes(searchTerm)
  );

  const filteredBatches = batches.filter(b =>
    !searchTerm ||
    b.comune?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.regione?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCount = standaloneQueries.length + batches.length;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#1A3A6B', fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' }}>Le mie analisi</h1>
        <p className="mb-6 text-xs tracking-[1px] uppercase" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
          {totalCount} {totalCount === 1 ? "analisi effettuata" : "analisi effettuate"}
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: '#C4BAA8' }}>
        <button
          className="px-4 py-2 text-xs font-semibold uppercase tracking-[2px] border-b-2 transition-colors"
          style={{
            borderColor: activeTab === "queries" ? '#B33A2A' : 'transparent',
            color: activeTab === "queries" ? '#1A3A6B' : '#7A7268',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
          onClick={() => setActiveTab("queries")}
        >
          <FileText className="w-4 h-4 inline mr-1.5 mb-0.5" />
          Query urbanistiche
        </button>
        <button
          className="px-4 py-2 text-xs font-semibold uppercase tracking-[2px] border-b-2 transition-colors"
          style={{
            borderColor: activeTab === "atti" ? '#B33A2A' : 'transparent',
            color: activeTab === "atti" ? '#1A3A6B' : '#7A7268',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
          onClick={() => setActiveTab("atti")}
        >
          <FileSearch className="w-4 h-4 inline mr-1.5 mb-0.5" />
          Richieste atti
        </button>
      </div>

      {activeTab === "queries" && (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per comune, regione, foglio o particella..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredStandalone.length === 0 && filteredBatches.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Nessun risultato trovato" : "Nessuna ricerca effettuata"}
              </p>
              {!searchTerm && (
                <Link to="/search" className="text-primary text-sm font-medium hover:underline mt-2 inline-block">
                  Fai la tua prima ricerca →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Batch entries */}
              {filteredBatches.map((batch, i) => {
                const bqs = batchQueriesMap[batch.id] || [];
                const paidCount = bqs.filter(q => q.paid).length;
                const totalPaid = bqs.reduce((s, q) => s + (q.paid ? (q.cost || 0) : 0), 0);
                const pricePerUnit = bqs.length > 0 && bqs[0].cost ? bqs[0].cost : null;
                const basePrice = 2.99;
                const hasDiscount = pricePerUnit && pricePerUnit < basePrice;
                const discountPct = hasDiscount ? Math.round((1 - pricePerUnit / basePrice) * 100) : 0;
                return (
                  <motion.div key={batch.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <Link
                      to={`/batch/${batch.id}`}
                      className="flex items-center gap-4 p-5 bg-white hover:bg-stone-50 transition-colors group"
                      style={{ border: '1px solid #C4BAA8' }}
                    >
                      <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ background: '#1A3A6B', border: '1px solid #1A3A6B' }}>
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
                          Palazzina — {batch.comune} · {batch.total_units} unità
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
                          {batch.regione}{batch.provincia ? ` (${batch.provincia})` : ''} · {format(new Date(batch.created_date), "d MMM yyyy, HH:mm", { locale: it })}
                        </p>
                        {hasDiscount && (
                          <p className="text-xs mt-0.5 font-semibold" style={{ color: '#059669', fontFamily: "'IBM Plex Mono', monospace" }}>
                            Sconto {discountPct}% applicato · Totale €{totalPaid.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>{paidCount}/{batch.total_units} sbloccate</span>
                        <Badge variant="outline" className={`text-[11px] ${batch.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {batch.status === 'completed' ? 'Completato' : batch.status === 'partial' ? 'Parziale' : 'In corso'}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}

              {/* Standalone queries */}
              {filteredStandalone.length > 0 && (
                <div className="bg-white overflow-hidden" style={{ border: '1px solid #C4BAA8' }}>
                  {filteredStandalone.map((query, i) => {
                    const status = statusMap[query.status] || statusMap.pending;
                    return (
                      <motion.div key={query.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                        <Link
                          to={`/report/${query.id}`}
                          className="flex items-center gap-4 p-5 hover:bg-stone-50 transition-colors group"
                          style={{ borderBottom: '1px solid #C4BAA8' }}
                        >
                          <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ background: '#F4EFE6', border: '1px solid #C4BAA8' }}>
                            <MapPin className="w-4 h-4" style={{ color: '#1A3A6B' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-sm" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
                              {query.comune} — Foglio {query.foglio}, Part. {query.particella}
                              {query.subalterno ? `, Sub. ${query.subalterno}` : ""}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
                              {query.regione}{query.provincia ? ` (${query.provincia})` : ""} · {format(new Date(query.created_date), "d MMM yyyy, HH:mm", { locale: it })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-semibold" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>€{(query.cost || 9.90).toFixed(2)}</span>
                            <Badge variant="outline" className={`${status.className} text-[11px]`}>{status.label}</Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === "atti" && <AttiRequestList />}

      <div className="mt-10 pt-6 border-t text-center text-[10px] uppercase tracking-[2px]" style={{ borderColor: '#C4BAA8', color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
        urbicheck.it | Dati aggiornati da fonti GIS ufficiali regionali
      </div>
    </div>
  );
}