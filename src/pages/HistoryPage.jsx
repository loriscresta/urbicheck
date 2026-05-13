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

  const filtered = queries.filter(q =>
    !searchTerm ||
    q.comune?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.regione?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.foglio?.includes(searchTerm) ||
    q.particella?.includes(searchTerm)
  );

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#1A3A6B', fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' }}>Le mie analisi</h1>
        <p className="mb-6 text-xs tracking-[1px] uppercase" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
          {queries.length} {queries.length === 1 ? "analisi effettuata" : "analisi effettuate"}
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
          ) : filtered.length === 0 ? (
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
            <div className="bg-white overflow-hidden" style={{ border: '1px solid #C4BAA8' }}>
              {filtered.map((query, i) => {
                const status = statusMap[query.status] || statusMap.pending;
                return (
                  <motion.div
                    key={query.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                  >
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
                        <Badge variant="outline" className={`${status.className} text-[11px]`}>
                          {status.label}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
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