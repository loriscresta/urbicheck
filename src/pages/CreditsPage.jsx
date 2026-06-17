import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { CREDIT_PACKAGES } from "@/lib/italianData";
import CreditPackageCard from "@/components/credits/CreditPackageCard";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CreditCard, ArrowUpRight, ArrowDownRight, Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { stripeCheckout } from "@/functions/stripeCheckout";



export default function CreditsPage() {
  const { toast } = useToast();
  const [loadingPkg, setLoadingPkg] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [autoReloadAmount, setAutoReloadAmount] = useState('');
  const [autoReloading, setAutoReloading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.role === 'admin') setAdminUser(u);
    }).catch(() => {});
  }, []);

  const queryClient = useQueryClient();

  const handleAdminReload = async () => {
    if (!adminUser || adminUser.role !== 'admin') return;
    const amount = parseFloat(autoReloadAmount);
    if (!amount || amount <= 0) return;
    setAutoReloading(true);
    try {
      const list = await base44.entities.UserCredits.filter({ user_email: adminUser.email });
      const record = list[0];
      if (record) {
        await base44.entities.UserCredits.update(record.id, {
          balance: +(record.balance + amount).toFixed(2),
        });
      } else {
        await base44.entities.UserCredits.create({ user_email: adminUser.email, balance: amount, total_spent: 0, total_queries: 0 });
      }
      await base44.entities.CreditTransaction.create({
        user_email: adminUser.email,
        type: 'purchase',
        amount: amount,
        description: `Ricarica manuale admin — €${amount.toFixed(2)}`,
      });
      fetch('https://hook.eu1.make.com/ymhq6x0siot8olv8l6ya6cjllpd8sfws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: adminUser.email, amount: amount, type: 'purchase' })
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['userCredits'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setAutoReloadAmount('');
      toast({ title: `✓ Credito ricaricato di €${amount.toFixed(2)}` });
    } catch (err) {
      toast({ title: 'Errore ricarica', description: err.message, variant: 'destructive' });
    } finally {
      setAutoReloading(false);
    }
  };

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
    // Block checkout inside iframe (preview/builder)
    if (window.self !== window.top) {
      alert("Il pagamento funziona solo dall'app pubblicata. Apri l'app nel browser per acquistare.");
      return;
    }

    setLoadingPkg(pkg.id);
    try {
      const res = await stripeCheckout({
        price_id: pkg.price_id,
        success_url: `${window.location.origin}/credits?success=1`,
        cancel_url: `${window.location.origin}/credits?cancelled=1`,
      });
      if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error("URL checkout non ricevuto");
      }
    } catch (err) {
      toast({
        title: "Errore avvio pagamento",
        description: err.message || "Contatta il supporto.",
        variant: "destructive",
      });
    } finally {
      setLoadingPkg(null);
    }
  };

  // Show success/cancel toasts from redirect params
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
      toast({ title: "Pagamento completato! ✓", description: "I crediti verranno accreditati entro pochi secondi." });
      window.history.replaceState({}, '', '/credits');
    } else if (params.get('cancelled') === '1') {
      toast({ title: "Pagamento annullato", variant: "destructive" });
      window.history.replaceState({}, '', '/credits');
    }
  }, []);

  const visiblePackages = CREDIT_PACKAGES.filter(pkg => !pkg.adminOnly || adminUser?.role === 'admin');

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
          {adminUser?.role === 'admin' ? (
            <>
              <p className="text-2xl font-bold mt-1" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>Account Admin</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(244,239,230,0.7)', fontFamily: "'IBM Plex Mono', monospace" }}>accesso illimitato — nessuna deduzione crediti</p>
            </>
          ) : (
            <>
              <p className="text-4xl font-bold mt-1" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
                {creditsLoading ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : `€ ${(credits?.balance || 0).toFixed(2)}`}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(244,239,230,0.4)', fontFamily: "'IBM Plex Mono', monospace" }}>
                ≈ {Math.floor((credits?.balance || 0) / 9.90)} analisi disponibili
              </p>
            </>
          )}
        </div>
        <div className="w-14 h-14 flex items-center justify-center" style={{ background: 'rgba(179,58,42,0.15)', border: '1px solid rgba(179,58,42,0.3)' }}>
          <CreditCard className="w-7 h-7" style={{ color: '#B33A2A' }} />
        </div>
      </motion.div>

      {/* Packages */}
      <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-4" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>Pacchetti Disponibili</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {visiblePackages.map((pkg, i) => (
          <CreditPackageCard key={pkg.id} pkg={pkg} onPurchase={handlePurchase} delay={i * 0.05} loading={loadingPkg === pkg.id} />
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

      {/* Admin-only: Autoricarica credito */}
      {adminUser?.role === 'admin' && (
        <div className="mt-8 p-5 border-2 border-dashed rounded-lg" style={{ borderColor: '#B33A2A', background: '#fff8f6' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-3 flex items-center gap-1.5" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
            <Zap className="w-3.5 h-3.5" /> Autoricarica Credito — Admin
          </p>
          <div className="flex gap-1.5 mb-2">
            {[50, 100, 200].map(preset => (
              <button key={preset} onClick={() => setAutoReloadAmount(String(preset))}
                className="px-3 py-1 text-xs border rounded hover:bg-red-50"
                style={{ borderColor: '#B33A2A', color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
                €{preset}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="0"
              step="0.01"
              value={autoReloadAmount}
              onChange={e => setAutoReloadAmount(e.target.value)}
              placeholder="es. 50.00"
              className="flex-1 text-xs px-3 py-2 border border-border rounded"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            />
            <button
              onClick={handleAdminReload}
              disabled={autoReloading || !autoReloadAmount}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded disabled:opacity-50"
              style={{ background: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {autoReloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Ricarica
            </button>
          </div>
        </div>
      )}

      <div className="mt-10 pt-6 border-t text-center text-[10px] uppercase tracking-[2px]" style={{ borderColor: '#C4BAA8', color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
        urbicheck.it | Dati aggiornati da fonti GIS ufficiali regionali
      </div>
    </div>
  );
}