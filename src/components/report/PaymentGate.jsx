import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Unlock, ArrowLeft, AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const PRICE = 9.90;

export default function PaymentGate({ query, onPaid }) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const { data: credits, refetch: refetchCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.UserCredits.filter({ user_email: user.email });
      return list[0] || { balance: 0 };
    },
  });

  const handlePay = async () => {
    setError("");
    setIsProcessing(true);

    try {
      const user = await base44.auth.me();

      // 1. Verifica saldo
      const creditsList = await base44.entities.UserCredits.filter({ user_email: user.email });
      const currentCredits = creditsList[0];
      if (!currentCredits || currentCredits.balance < PRICE) {
        setError(`Saldo insufficiente (€${(currentCredits?.balance || 0).toFixed(2)} disponibili). Servono €${PRICE.toFixed(2)}.`);
        setIsProcessing(false);
        return;
      }

      // 2. Crea CreditTransaction PRIMA (step 1 - atomico)
      await base44.entities.CreditTransaction.create({
        user_email: user.email,
        type: "query_charge",
        amount: -PRICE,
        description: `Scheda completa: ${query.comune} — F.${query.foglio} P.${query.particella}`,
        query_id: query.id,
      });

      // 3. Aggiorna balance (step 2)
      await base44.entities.UserCredits.update(currentCredits.id, {
        balance: currentCredits.balance - PRICE,
        total_spent: (currentCredits.total_spent || 0) + PRICE,
        total_queries: (currentCredits.total_queries || 0) + 1,
      });

      // 4. Imposta paid=true (step 3 - gate autoritativo)
      await base44.entities.CadastralQuery.update(query.id, {
        paid: true,
        status: "completed",
      });

      // Dev mode: auto-refund dopo 60s (solo admin)
      if (user.role === "admin") {
        setTimeout(async () => {
          try {
            const latestCredits = await base44.entities.UserCredits.filter({ user_email: user.email });
            const latest = latestCredits[0];
            if (latest) {
              await base44.entities.UserCredits.update(latest.id, {
                balance: latest.balance + PRICE,
              });
              await base44.entities.CreditTransaction.create({
                user_email: user.email,
                type: "refund",
                amount: +PRICE,
                description: `[DEV MODE] Auto-refund dopo 60s — ${query.comune} F.${query.foglio} P.${query.particella}`,
                query_id: query.id,
              });
            }
          } catch (_e) { /* non bloccante */ }
        }, 60000);
      }

      await refetchCredits();
      onPaid();

    } catch (err) {
      setError("Errore durante il pagamento. Riprova.");
      setIsProcessing(false);
    }
  };

  const balance = credits?.balance || 0;
  const hasFunds = balance >= PRICE;

  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto">
      <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-3 h-3" /> Torna allo storico
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header scheda */}
        <div className="rounded-xl p-5 mb-6" style={{ background: '#1e3a5f' }}>
          <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Scheda elaborata — pagamento richiesto</p>
          <h1 className="text-xl font-bold text-white">
            {query.comune} ({query.regione})
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Foglio {query.foglio} · Particella {query.particella}
            {query.subalterno ? ` · Sub. ${query.subalterno}` : ""}
          </p>
        </div>

        {/* Payment card */}
        <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Unlock className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="font-bold text-emerald-900 text-lg">Sblocca la scheda completa</p>
              <p className="text-sm text-emerald-700">Accesso immediato a tutti i dati urbanistici</p>
            </div>
            <span className="ml-auto text-2xl font-black text-emerald-800">€9,90</span>
          </div>

          <ul className="text-sm text-emerald-800 space-y-1 mb-5 pl-2">
            <li>✓ Indici edilizi completi (IF, RC, H max)</li>
            <li>✓ Vincoli attivi con dettaglio normativo</li>
            <li>✓ Fattibilità interventi</li>
            <li>✓ Pratiche necessarie (SCIA, PdC…)</li>
            <li>✓ Analisi finanziaria & OMI</li>
            <li>✓ Download PDF certificato</li>
          </ul>

          <div className="flex items-center justify-between text-sm text-emerald-700 mb-4 p-3 bg-white/60 rounded-lg">
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Saldo disponibile
            </span>
            <span className={`font-bold ${hasFunds ? "text-emerald-700" : "text-red-600"}`}>
              €{balance.toFixed(2)}
            </span>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 mb-4">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {hasFunds ? (
            <Button
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={handlePay}
              disabled={isProcessing}
            >
              {isProcessing
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Elaborazione pagamento…</>
                : <><Unlock className="w-4 h-4 mr-2" /> Sblocca scheda completa — €9,90</>
              }
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                Saldo insufficiente — ricarica per continuare
              </div>
              <Button
                size="lg"
                className="w-full"
                style={{ background: '#1e3a5f' }}
                onClick={() => navigate("/credits")}
              >
                Ricarica crediti →
              </Button>
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-4">
          Addebito immediato dal saldo crediti. Nessun abbonamento.
        </p>
      </motion.div>
    </div>
  );
}