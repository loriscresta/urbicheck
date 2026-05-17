import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { sendUrbiCheckEmail } from "@/functions/sendUrbiCheckEmail";
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

  const welcomeEmailSentRef = useRef(false);

  // Invia email di benvenuto al primo accesso (nessuna query mai creata)
  useEffect(() => {
    if (welcomeEmailSentRef.current) return;
    if (!user || recentQueries === undefined) return;
    const isFirstAccess = recentQueries.length === 0;
    const key = `welcome_email_sent_${user.email}`;
    if (isFirstAccess && !localStorage.getItem(key)) {
      welcomeEmailSentRef.current = true;
      localStorage.setItem(key, '1');
      sendUrbiCheckEmail({ type: 'welcome', user_name: user.full_name, user_email: user.email }).catch(() => {});
    }
  }, [user, recentQueries]);

  const firstName = user?.full_name?.split(" ")[0] || "Utente";

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight" style={{ color: '#1A3A6B', fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' }}>
          Benvenuto, {firstName}
        </h1>
        <p className="mt-2 text-xs tracking-[1px] uppercase" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
          Panoramica della tua attività su UrbiCheck
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatsCard icon={CreditCard} label="SALDO CREDITI" value={`€${(credits?.balance || 0).toFixed(2)}`} highlight />
        <StatsCard icon={Search} label="ANALISI EFFETTUATE" value={credits?.total_queries || 0} />
        <StatsCard icon={TrendingUp} label="CREDITI UTILIZZATI" value={`€${(credits?.total_spent || 0).toFixed(2)}`} />
        <StatsCard icon={FileCheck} label="REPORT DISPONIBILI" value={recentQueries.filter(q => q.status === "completed").length} />
      </div>

      {/* Quick Actions + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6"
          style={{ border: '1px solid #C4BAA8' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-4" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>Azioni Rapide</p>
          <div className="space-y-3">
            <Link to="/search">
              <button
                className="w-full flex items-center gap-3 h-11 px-4 text-xs font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
                style={{ background: '#1A3A6B', borderBottom: '3px solid #B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}
              >
                <Search className="w-4 h-4 shrink-0" />
                Nuova Ricerca
              </button>
            </Link>
            <Link to="/credits">
              <button
                className="w-full flex items-center gap-3 h-11 px-4 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-stone-50"
                style={{ border: '1.5px solid #1A3A6B', color: '#1A3A6B', background: 'transparent', fontFamily: "'IBM Plex Mono', monospace" }}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                Acquista Crediti
              </button>
            </Link>
            <Link to="/history">
              <button
                className="w-full flex items-center gap-3 h-11 px-4 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-stone-50"
                style={{ border: '1.5px solid #1A3A6B', color: '#1A3A6B', background: 'transparent', fontFamily: "'IBM Plex Mono', monospace" }}
              >
                <FileCheck className="w-4 h-4 shrink-0" />
                Storico Completo
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Recent Queries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white p-6"
          style={{ border: '1px solid #C4BAA8' }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>Ricerche Recenti</p>
            <Link to="/history" className="text-xs font-medium hover:underline" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
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
          className="mt-6 bg-white p-6"
          style={{ border: '1px solid #C4BAA8' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <FolderOpen className="w-4 h-4" style={{ color: '#B33A2A' }} />
            <p className="text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>Accesso agli Atti Richiesti</p>
          </div>
          <div className="space-y-2">
            {attiRequests.map((atti) => {
              const st = attiStatusMap[atti.stato] || attiStatusMap.bozza;
              return (
                <div key={atti.id} className="flex items-center gap-4 p-3" style={{ background: '#F4EFE6', border: '1px solid #C4BAA8' }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>{atti.comune} — F.{atti.foglio} P.{atti.particella}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
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
      <div className="mt-10 pt-6 border-t text-center text-[10px] uppercase tracking-[2px]" style={{ borderColor: '#C4BAA8', color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
        urbicheck.it | Dati aggiornati da fonti GIS ufficiali regionali
      </div>
    </div>
  );
}