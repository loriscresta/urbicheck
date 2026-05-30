import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const BETA_REGIONS = ["Piemonte", "Liguria", "Lombardia"];

const ALL_REGIONS = [
  "Piemonte", "Liguria", "Lombardia",
  "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna",
  "Friuli Venezia Giulia", "Lazio", "Marche", "Molise", "Puglia",
  "Sardegna", "Sicilia", "Toscana", "Trentino-Alto Adige",
  "Umbria", "Valle d'Aosta", "Veneto"
];

const MONO = "'IBM Plex Mono', monospace";
const P = "#1A3A6B";
const AC = "#B33A2A";

export default function RegionOnboarding({ onComplete }) {
  const [show, setShow] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    base44.auth.me().then(user => {
      if (!user) return;
      setUserEmail(user.email || "");
      // Show onboarding if region not yet set on user profile
      if (!user.regione) {
        setShow(true);
      }
    }).catch(() => {});
  }, []);

  if (!show) return null;

  const isBeta = BETA_REGIONS.includes(selectedRegion);

  const handleSubmit = async () => {
    if (!selectedRegion) return;
    setLoading(true);
    try {
      if (isBeta) {
        // Save region to user profile
        await base44.auth.updateMe({ regione: selectedRegion });
        // Ensure UserCredits record exists
        const creditsList = await base44.entities.UserCredits.filter({ user_email: userEmail });
        if (creditsList.length === 0) {
          await base44.entities.UserCredits.create({
            user_email: userEmail,
            balance: 0,
            total_spent: 0,
            total_queries: 0,
            free_reports_used: 0,
            beta_paid_reports_used: 0,
          });
        }
        setShow(false);
        onComplete?.();
      } else {
        // Non-beta region: add to waitlist
        await base44.entities.WaitlistSubscriber.create({
          email: userEmail,
          regione_interesse: selectedRegion,
        });
        await base44.auth.updateMe({ regione: selectedRegion });
        setWaitlistDone(true);
      }
    } catch (e) {
      console.error("Region onboarding error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,37,68,0.85)" }}>
      <div className="max-w-md w-full bg-white p-8" style={{ border: `2px solid ${P}` }}>
        {waitlistDone ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: "#16a34a" }} />
            <h2 className="text-lg font-bold" style={{ color: P, fontFamily: MONO }}>
              Sei in lista d'attesa per {selectedRegion}!
            </h2>
            <p className="text-sm" style={{ color: "#7A7268", fontFamily: MONO }}>
              Ti contatteremo appena la beta arriva nella tua regione. Il tuo interesse ci aiuta a decidere quale regione sviluppare prima.
            </p>
            <button
              onClick={() => { setShow(false); onComplete?.(); }}
              className="w-full py-3 text-xs font-bold uppercase tracking-[2px] text-white"
              style={{ background: P, fontFamily: MONO }}
            >
              Continua →
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-[10px] uppercase tracking-[3px] mb-1" style={{ color: AC, fontFamily: MONO }}>Benvenuto in UrbiCheck</p>
              <h2 className="text-xl font-bold" style={{ color: P, fontFamily: MONO }}>
                Seleziona la tua regione
              </h2>
              <p className="text-xs mt-1" style={{ color: "#7A7268", fontFamily: MONO }}>
                Per personalizzare la tua esperienza
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: P, fontFamily: MONO }}>
                La tua regione *
              </label>
              <select
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value)}
                className="w-full border px-3 py-2 text-sm"
                style={{ borderColor: "#C4BAA8", fontFamily: MONO, background: "#FAFAF8" }}
              >
                <option value="">Seleziona regione...</option>
                {ALL_REGIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {selectedRegion && (
              <div className={`p-3 flex items-start gap-2 text-xs ${isBeta ? 'bg-emerald-50 border border-emerald-300' : 'bg-amber-50 border border-amber-300'}`}>
                {isBeta
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                <span style={{ fontFamily: MONO, color: isBeta ? "#15803d" : "#92400e" }}>
                  {isBeta
                    ? "✓ La beta è disponibile nella tua regione! Le prime 3 analisi sono gratuite."
                    : `La beta non è ancora disponibile in ${selectedRegion}. Completando la registrazione ti aggiungiamo alla lista d'attesa — ti avvisiamo quando arriviamo da te. Il tuo interesse ci aiuta a decidere quale regione sviluppare prima.`}
                </span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!selectedRegion || loading}
              className="w-full py-3 text-xs font-bold uppercase tracking-[2px] text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: AC, fontFamily: MONO, borderBottom: `3px solid ${P}` }}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {!selectedRegion ? 'Seleziona una regione' : isBeta ? 'Inizia gratis →' : 'Iscriviti alla lista d\'attesa →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}