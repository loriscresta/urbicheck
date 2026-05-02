import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, CreditCard, FileCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentQueries from "@/components/dashboard/RecentQueries";
import { motion } from "framer-motion";

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
    </div>
  );
}