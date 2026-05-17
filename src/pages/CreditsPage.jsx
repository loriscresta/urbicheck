import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sendUrbiCheckEmail } from "@/functions/sendUrbiCheckEmail";
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
    try {
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

      try {
        await base44.entities.CreditTransaction.create({
          user_email: user.email,
          type: "purchase",
          amount: pkg.price,
          description: `Acquisto ${pkg.name}`,
        });
      } catch (_txErr) {
        // Transaction log may fail due to permissions — credits still updated
      }

      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });

      const newBalance = (credits?.balance || 0) + pkg.price;
      sendUrbiCheckEmail({
        type: 'credits_purchased',
        amount: pkg.price,
        new_balance: newBalance,
        user_name: user.full_name,
        user_email: user.email,
      }).catch(() => {});

      toast({
        title: "Crediti aggiunti!",
        description: `€${pkg.price.toFixed(2)} aggiunti al tuo saldo.`,
      });
    } catch (err) {
      toast({
        title: "Errore acquisto",
        description: err.message || "Contatta il supporto.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#1A3A6B', fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' }}>Ricarica Crediti</h1>
        <p className="mb-2 text-xs tracking-[1px] uppercase" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
          Ogni analisi catastale costa €9,90. Acquista pacchetti per risparmiare.
        </p>
      </motion.div>

      {/* Balance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 mb-8 flex items-center justify-between"
        style={{ background: '#1A3A6B', borderBottom: '3px solid #B33A2A' }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-[2px] mb-1" style={{ color: 'rgba(244,239,230,0.45)', fontFamily: "'IBM Plex Mono', monospace" }}>SALDO ATTUALE</p>
          <p className="text-4xl font-bold mt-1" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
            {creditsLoading ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : `€ ${(credits?.balance || 0).toFixed(2)}`}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(244,239,230,0.4)', fontFamily: "'IBM Plex Mono', monospace" }}>
            ≈ {Math.floor((credits?.balance || 0) / 9.90)} analisi disponibili
          </p>
        </div>
        <div className="w-14 h-14 flex items-center justify-center" style={{ background: 'rgba(179,58,42,0.15)', border: '1px solid rgba(179,58,42,0.3)' }}>
          <CreditCard className="w-7 h-7" style={{ color: '#B33A2A' }} />
        </div>
      </motion.div>

      {/* Packages */}
      <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-4" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>Pacchetti Disponibili</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {CREDIT_PACKAGES.map((pkg, i) => (
          <CreditPackageCard key={pkg.id} pkg={pkg} onPurchase={handlePurchase} delay={i * 0.05} />
        ))}
      </div>

      {/* Transaction History */}
      <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-4 mt-10" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>Ultime Transazioni</p>
      <div className="bg-white overflow-hidden" style={{ border: '1px solid #C4BAA8' }}>
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
                <p className="text-xs font-semibold truncate" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>{tx.description}</p>
                <p className="text-xs mt-0.5" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {format(new Date(tx.created_date), "d MMM yyyy, HH:mm", { locale: it })}
                </p>
              </div>
              <span className="text-sm font-bold" style={{ color: tx.amount > 0 ? '#1A3A6B' : '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
                {tx.amount > 0 ? "+" : ""}€{Math.abs(tx.amount).toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="mt-10 pt-6 border-t text-center text-[10px] uppercase tracking-[2px]" style={{ borderColor: '#C4BAA8', color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
        urbicheck.it | Dati aggiornati da fonti GIS ufficiali regionali
      </div>
    </div>
  );
}