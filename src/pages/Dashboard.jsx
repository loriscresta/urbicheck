import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, CreditCard, FileCheck, TrendingUp, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentQueries from "@/components/dashboard/RecentQueries";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const attiStatusMap = {
  bozza: { label: "Bozza", className: "bg-gray-50 text-gray-600 border-gray-200" },
  pronta: { label: "Pronta", className: "bg-blue-50 text-blue-700 border-blue-200" },
  inviata: { label: "Inviata", className: "bg-amber-50 text-amber-700 border-amber-200" },
  ricevuta: { label: "Ricevuta", className: "bg-purple-50 text-purple-700 border-purple-200" },
  completata: { label: "Completata", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: credits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const u = await base44.auth.me();
      const list = await base44.entities.UserCredits.filter({ user_email: u.email });
      return list[0] || { balance: 0, total_spent: 0, total_queries: 0 };
    },
  });

  const { data: recentQueries = [] } = useQuery({
    queryKey: ["recentQueries"],
    queryFn: async () => {
      const u = await base44.auth.me();
      return base44.entities.CadastralQuery.filter({ created_by: u.email }, "-created_date", 5);
    },
  });

  const { data: attiRequests = [] } = useQuery({
    queryKey: ["attiRequests"],
    queryFn: async () => {
      const u = await base44.auth.me();
      return base44.entities.AttiRequest.filter({ user_email: u.email }, "-created_date", 5);
    },
  });

  const firstName = user?.full_name?.split(" ")[0] || "Utente";

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight" style={{ color: '#0D1B2A', fontFamily: 'Georgia, serif' }}>
          Benvenuto, {firstName}
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#6B7A8D', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
          Panoramica della tua attività su UrbiCheck
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatsCard
          icon={CreditCard}
          label="Saldo Crediti"
          value={`€ ${(credits?.balance || 0).toFixed(2)}`}
          highlight
        />
        <StatsCard
          icon={Search}
          label="Analisi Effettuate"
          value={credits?.total_queries || 0}
        />
        <StatsCard
          icon={TrendingUp}
          label="Crediti Utilizzati"
          value={`€ ${(credits?.total_spent || 0).toFixed(2)}`}
        />
        <StatsCard
          icon={FileCheck}
          label="Report Disponibili"
          value={recentQueries.filter(q => q.status === "completed").length}
        />
      </div>

      {/* Quick Actions + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6"
          style={{ border: '1px solid #E8E4DC', boxShadow: '0 2px 12px rgba(13,27,42,0.06)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6B7A8D' }}>Azioni Rapide</p>
          <div className="space-y-3">
            <Link to="/search">
              <button
                className="w-full flex items-center gap-3 h-12 px-4 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: '#0D1B2A' }}
              >
                <Search className="w-4 h-4" />
                Nuova Ricerca Catastale
              </button>
            </Link>
            <Link to="/credits">
              <button
                className="w-full flex items-center gap-3 h-12 px-4 rounded-lg text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ border: '1.5px solid #0D1B2A', color: '#0D1B2A', background: 'transparent' }}
              >
                <CreditCard className="w-4 h-4" />
                Acquista Crediti
              </button>
            </Link>
            <Link to="/history">
              <button
                className="w-full flex items-center gap-3 h-12 px-4 rounded-lg text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ border: '1.5px solid #0D1B2A', color: '#0D1B2A', background: 'transparent' }}
              >
                <FileCheck className="w-4 h-4" />
                Vedi Storico Completo
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Recent Queries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-xl p-6"
          style={{ border: '1px solid #E8E4DC', boxShadow: '0 2px 12px rgba(13,27,42,0.06)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7A8D' }}>Ricerche Recenti</p>
            <Link to="/history" className="text-xs font-medium hover:underline" style={{ color: '#C8A06E' }}>
              Vedi tutte →
            </Link>
          </div>
          <RecentQueries queries={recentQueries} />
        </motion.div>
      </div>

      {/* Accesso agli Atti */}
      {attiRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-white rounded-xl p-6"
          style={{ border: '1px solid #E8E4DC', boxShadow: '0 2px 12px rgba(13,27,42,0.06)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full" style={{ background: 'rgba(200,160,110,0.12)' }}>
              <FolderOpen className="w-4 h-4" style={{ color: '#C8A06E' }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7A8D' }}>Accesso agli Atti Richiesti</p>
          </div>
          <div className="space-y-3">
            {attiRequests.map((atti) => {
              const st = attiStatusMap[atti.stato] || attiStatusMap.bozza;
              return (
                <div key={atti.id} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: '#F5F4F0', border: '1px solid #E8E4DC' }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#0D1B2A' }}>{atti.comune} — F.{atti.foglio} P.{atti.particella}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7A8D' }}>
                      {atti.documento_tipo} · {format(new Date(atti.created_date), "d MMM yyyy", { locale: it })}
                    </p>
                  </div>
                  <Badge variant="outline" className={`${st.className} text-[11px] shrink-0`}>{st.label}</Badge>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <div className="mt-10 pt-6 border-t text-center text-xs" style={{ borderColor: '#E8E4DC', color: '#6B7A8D' }}>
        urbicheck.it | Dati aggiornati da fonti GIS ufficiali regionali
      </div>
    </div>
  );
}