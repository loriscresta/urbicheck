import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { CREDIT_PACKAGES } from "@/lib/italianData";
import CreditPackageCard from "@/components/credits/CreditPackageCard";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function CreditsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.UserCredits.filter({ user_email: user.email });
      return list[0] || null;
    },
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.CreditTransaction.filter({ user_email: user.email }, "-created_date", 20);
    },
  });

  const handlePurchase = async (pkg) => {
    const user = await base44.auth.me();

    if (credits) {
      await base44.entities.UserCredits.update(credits.id, {
        balance: (credits.balance || 0) + pkg.price,
      });
    } else {
      await base44.entities.UserCredits.create({
        user_email: user.email,
        balance: pkg.price,
        total_spent: 0,
        total_queries: 0,
      });
    }

    await base44.entities.CreditTransaction.create({
      user_email: user.email,
      type: "purchase",
      amount: pkg.price,
      description: `Acquisto ${pkg.name}`,
    });

    queryClient.invalidateQueries({ queryKey: ["userCredits"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });

    toast({
      title: "Crediti aggiunti!",
      description: `€${pkg.price.toFixed(2)} aggiunti al tuo saldo.`,
    });
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#1e3a5f' }}>Ricarica Crediti</h1>
        <p className="text-muted-foreground mb-2">
          Ogni analisi catastale costa €9,90. Acquista pacchetti per risparmiare.
        </p>
      </motion.div>

      {/* Balance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary text-primary-foreground rounded-xl p-6 mb-8 flex items-center justify-between"
      >
        <div>
          <p className="text-sm opacity-80">Saldo attuale</p>
          <p className="text-4xl font-bold mt-1">
            {creditsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : `€${(credits?.balance || 0).toFixed(2)}`}
          </p>
          <p className="text-sm opacity-60 mt-1">
            ≈ {Math.floor((credits?.balance || 0) / 9.90)} query disponibili
          </p>
        </div>
        <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center">
          <CreditCard className="w-7 h-7" />
        </div>
      </motion.div>

      {/* Packages */}
      <h2 className="font-semibold text-lg mb-4">Pacchetti Disponibili</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {CREDIT_PACKAGES.map((pkg, i) => (
          <CreditPackageCard key={pkg.id} pkg={pkg} onPurchase={handlePurchase} delay={i * 0.05} />
        ))}
      </div>

      {/* Transaction History */}
      <h2 className="font-semibold text-lg mb-4">Ultime Transazioni</h2>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {txLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nessuna transazione
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                tx.type === "purchase" ? "bg-emerald-50" : "bg-red-50"
              }`}>
                {tx.type === "purchase" ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tx.description}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(tx.created_date), "d MMM yyyy, HH:mm", { locale: it })}
                </p>
              </div>
              <span className={`text-sm font-semibold ${tx.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {tx.amount > 0 ? "+" : ""}€{Math.abs(tx.amount).toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        urbicheck.it | Dati aggiornati da fonti GIS ufficiali regionali
      </div>
    </div>
  );
}