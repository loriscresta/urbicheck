import React, { useState } from "react";
import { chargeReport } from '@/functions/chargeReport';
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Unlock, ArrowLeft, AlertTriangle, CreditCard, Lock, MapPin, Shield, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ParcellaMap from "@/components/report/ParcellaMap";

const BETA_MODE = true;
const BETA_PRICE = 2.99;
const FULL_PRICE = 9.90;

function PreviewPanel({ query }) {
  const r = query.report_data || {};
  const wfsSismica = r.wfs_liguria?.risultati?.sismica;
  const zonizzazione = r.zonizzazione;
  const vincoli = r.vincoli;
  const wfsVincoli = r.wfs_liguria?.risultati?.vincoli_paesaggistici_ope_legis?.vincoli || [];
  const vincPaesCount = wfsVincoli.filter(v => v.livello === 'APPLICABILE').length;

  // Mappa: mostra solo se ci sono coordinate
  const poly = query.geometry_geojson || r.catasto_data?.geojson_polygon;
  const hasCoords = query.centroid_lat || r.catasto_data?.lat;

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden mb-6">
      {/* Header preview */}
      <div className="px-5 py-3 border-b border-border bg-muted/30">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Anteprima gratuita</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Dati identificativi */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Comune</p>
            <p className="font-semibold">{query.comune} ({query.regione})</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Identificativo</p>
            <p className="font-mono text-xs">F.{query.foglio} P.{query.particella}{query.subalterno ? ` Sub.${query.subalterno}` : ''}</p>
          </div>
          {zonizzazione?.zona_codice && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Zona urbanistica</p>
              <p className="font-semibold text-sm">{zonizzazione.zona_codice}</p>
              {zonizzazione.destinazione_prevalente && (
                <p className="text-xs text-muted-foreground">{zonizzazione.destinazione_prevalente}</p>
              )}
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Vincolo sismico</p>
            {wfsSismica ? (
              <p className="font-semibold text-sm">Zona {wfsSismica.zona} — {wfsSismica.descrizione}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Disponibile nel report</p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Vincoli paesaggistici</p>
            {wfsVincoli.length > 0 ? (
              <p className={`font-semibold text-sm ${vincPaesCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {vincPaesCount > 0 ? `${vincPaesCount} vincolo/i rilevato/i` : 'Nessun vincolo ope legis'}
              </p>
            ) : vincoli?.vincolo_paesaggistico ? (
              <p className={`font-semibold text-sm ${vincoli.vincolo_paesaggistico.presente ? 'text-amber-700' : 'text-emerald-700'}`}>
                {vincoli.vincolo_paesaggistico.presente ? 'Presente' : 'Non rilevato'}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Verifica nel report</p>
            )}
          </div>
        </div>

        {/* Mappa — visibile gratuitamente */}
        {hasCoords && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Mappa particella
            </p>
            <ParcellaMap
              lat={query.centroid_lat || r.catasto_data?.lat}
              lon={query.centroid_lng || r.catasto_data?.lon}
              geojsonPolygon={poly}
              queryId={query.id}
              foglio={query.foglio}
              particella={query.particella}
              height={220}
            />
          </div>
        )}

        {/* Contenuto bloccato */}
        <div className="relative rounded-lg overflow-hidden">
          <div className="space-y-2 opacity-30 select-none pointer-events-none">
            {[
              'Indici edilizi (IF, RC, H max, distanze)',
              'Dettaglio vincoli PAI e paesaggistici',
              'Analisi finanziaria & OMI',
              'Fattibilità interventi e pratiche',
              'Valutazione sintetica e raccomandazioni',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted rounded text-sm">
                <div className="w-3 h-3 rounded-full bg-border" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-border shadow text-sm font-semibold text-foreground">
              <Lock className="w-4 h-4 text-muted-foreground" />
              {`Sblocca il report completo — €${FULL_PRICE.toFixed(2)}${BETA_MODE ? ' (prezzo beta)' : ''}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      const result = await chargeReport({ query_id: query.id });
      await refetchCredits();
      onPaid();
    } catch (err) {
      console.error('handlePay error:', err);
      const data = err?.response?.data;
      if (data?.error === 'insufficient_credits') {
        setError(`Saldo insufficiente (€${(data.balance || 0).toFixed(2)} disponibili). Servono €${FULL_PRICE.toFixed(2)}.`);
      } else if (data?.error === 'Already paid') {
        // Already paid — just proceed
        await refetchCredits();
        onPaid();
        return;
      } else {
        setError(data?.error ? `Errore: ${data.error}` : 'Errore durante il pagamento. Riprova.');
      }
      setIsProcessing(false);
    }
  };

  const balance = credits?.balance || 0;
  const hasFunds = balance >= FULL_PRICE;

  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto">
      <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-3 h-3" /> Torna allo storico
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header scheda */}
        <div className="rounded-xl p-5 mb-6" style={{ background: '#1e3a5f' }}>
          <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Scheda elaborata — anteprima gratuita</p>
          <h1 className="text-xl font-bold text-white">
            {query.comune} ({query.regione})
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Foglio {query.foglio} · Particella {query.particella}
            {query.subalterno ? ` · Sub. ${query.subalterno}` : ""}
          </p>
        </div>

        {/* Preview gratuita */}
        <PreviewPanel query={query} />

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
            <div className="ml-auto text-right">
              <span className="text-2xl font-black text-emerald-800">€{FULL_PRICE.toFixed(2)}</span>
              {BETA_MODE && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  Accesso completo
                </p>
              )}
            </div>
          </div>

          <ul className="text-sm text-emerald-800 space-y-1 mb-5 pl-2">
            <li>✓ Indici edilizi completi (IF, RC, H max)</li>
            <li>✓ Vincoli attivi con dettaglio normativo</li>
            <li>✓ Fattibilità interventi</li>
            <li>✓ Pratiche necessarie (SCIA, PdC…)</li>
            <li>✓ Analisi finanziaria & OMI</li>
            <li>✓ Download PDF certificato</li>
            {BETA_MODE && <li className="text-emerald-600 font-semibold">🎁 Prezzo beta: €2,99 invece di €9,90</li>}
          </ul>

          <div className="flex items-center justify-between text-sm text-emerald-700 mb-4 p-3 bg-white/60 rounded-lg">
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Saldo disponibile
            </span>
            <span className={`font-bold ${hasFunds ? "text-emerald-700" : "text-red-600"}`}>
              €{balance.toFixed(2)}{!hasFunds && BETA_MODE && ` — ricarica per sbloccare`}
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
                : <><Unlock className="w-4 h-4 mr-2" /> Sblocca scheda — €{FULL_PRICE.toFixed(2)}</>
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