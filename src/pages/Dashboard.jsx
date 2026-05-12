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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-3xl lg:text-4xl font-serif font-bold tracking-tight">
          Benvenuto, {firstName}
        </h1>
        <p className="text-muted-foreground mt-2">
          Panoramica della tua attività su Urbicheck
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatsCard
          icon={CreditCard}
          label="Saldo Crediti"
          value={`€${(credits?.balance || 0).toFixed(2)}`}
          color="accent"
        />
        <StatsCard
          icon={Search}
          label="Query Effettuate"
          value={credits?.total_queries || 0}
          color="blue"
        />
        <StatsCard
          icon={TrendingUp}
          label="Totale Investito"
          value={`€${(credits?.total_spent || 0).toFixed(2)}`}
          color="green"
        />
        <StatsCard
          icon={FileCheck}
          label="Report Disponibili"
          value={recentQueries.filter(q => q.status === "completed").length}
          color="primary"
        />
      </div>

      {/* Quick Actions + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h2 className="font-semibold mb-4">Azioni Rapide</h2>
          <div className="space-y-3">
            <Link to="/search">
              <Button className="w-full justify-start gap-3 h-12 bg-primary hover:bg-primary/90">
                <Search className="w-4 h-4" />
                Nuova Ricerca Catastale
              </Button>
            </Link>
            <Link to="/credits">
              <Button variant="outline" className="w-full justify-start gap-3 h-12">
                <CreditCard className="w-4 h-4" />
                Acquista Crediti
              </Button>
            </Link>
            <Link to="/history">
              <Button variant="outline" className="w-full justify-start gap-3 h-12">
                <FileCheck className="w-4 h-4" />
                Vedi Storico Completo
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Recent Queries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-card rounded-xl border border-border p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Ricerche Recenti</h2>
            <Link to="/history" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
          className="mt-6 bg-card rounded-xl border border-border p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Accesso agli Atti Richiesti</h2>
          </div>
          <div className="space-y-3">
            {attiRequests.map((atti) => {
              const st = attiStatusMap[atti.stato] || attiStatusMap.bozza;
              return (
                <div key={atti.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{atti.comune} — F.{atti.foglio} P.{atti.particella}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
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
      <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        urbicheck.it | Dati aggiornati da fonti GIS ufficiali regionali
      </div>
    </div>
  );
}