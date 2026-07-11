import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight, MapPin, FileText, Zap, CreditCard, X } from "lucide-react";

const STEPS = [
  {
    id: 1,
    title: "Benvenuto in UrbiCheck 👋",
    subtitle: "I vincoli e l'urbanistica di ogni immobile, in 60 secondi.",
    content: (
      <div className="space-y-3 mt-4">
        {[
          { icon: MapPin, text: "Inserisci comune, foglio e particella catastale" },
          { icon: Zap, text: "UrbiCheck interroga i WFS regionali ufficiali in tempo reale" },
          { icon: FileText, text: "Ricevi report completo: vincoli, zona urbanistica, rischi, valutazione finanziaria" },
        ].map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-start gap-3 p-3" style={{ background: '#F4EFE6', border: '1px solid #C4BAA8' }}>
            <div className="w-7 h-7 flex items-center justify-center shrink-0" style={{ background: '#1A3A6B' }}>
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-xs leading-relaxed pt-0.5" style={{ color: '#1C1A17', fontFamily: "'IBM Plex Mono', monospace" }}>
              {text}
            </p>
          </div>
        ))}
        <p className="text-xs italic pt-1" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
          Copertura attuale: Piemonte e Liguria · Altre regioni in arrivo Q3 2026
        </p>
      </div>
    ),
  },
  {
    id: 2,
    title: "Come funziona",
    subtitle: "3 input, 60 secondi, report completo.",
    content: (
      <div className="mt-4 space-y-0" style={{ border: '1px solid #C4BAA8' }}>
        {[
          { n: "01", label: "Inserisci i dati catastali", desc: "Comune · Foglio · Particella" },
          { n: "02", label: "UrbiCheck analizza", desc: "WFS regionali + AI contestuale" },
          { n: "03", label: "Ricevi il report", desc: "PDF scaricabile, vincoli, fattibilità" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-4 p-4" style={{
            borderBottom: i < 2 ? '1px solid #C4BAA8' : 'none',
            background: i % 2 === 0 ? '#fff' : '#F4EFE6',
          }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: '#B33A2A', fontSize: '1.25rem', minWidth: '2rem' }}>{s.n}</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>{s.label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>{s.desc}</p>
            </div>
            {i < 2 && <ArrowRight className="w-3 h-3 ml-auto shrink-0" style={{ color: '#C4BAA8' }} />}
            {i === 2 && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" style={{ color: '#22c55e' }} />}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 3,
    title: "Il tuo primo report",
    subtitle: "Sei pronto. Inizia l'analisi.",
    content: null, // rendered inline below
  },
];

export default function OnboardingModal({ onClose, hasCredits, balance }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(28,26,23,0.7)', backdropFilter: 'blur(4px)' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md bg-white"
          style={{ border: '2px solid #1A3A6B' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ background: '#1A3A6B', borderBottom: '2px solid #B33A2A' }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[3px]" style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
                Step {step + 1} di {STEPS.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {STEPS.map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full" style={{ background: i === step ? '#B33A2A' : 'rgba(255,255,255,0.25)' }} />
              ))}
              <button onClick={onClose} className="ml-3 opacity-50 hover:opacity-100 transition-opacity" style={{ color: '#F4EFE6' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            <h2 className="text-lg font-bold mb-1" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              {current.title}
            </h2>
            <p className="text-xs" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
              {current.subtitle}
            </p>
            {current.content}

            {/* Step 3 — CTA finale */}
            {step === 2 && (
              <div className="mt-5 space-y-3">
                {/* Saldo */}
                <div className="flex items-center justify-between p-3" style={{ background: '#F4EFE6', border: '1px solid #C4BAA8' }}>
                  <span className="text-xs uppercase tracking-wide" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>Saldo crediti</span>
                  <span className="text-sm font-bold" style={{ color: hasCredits ? '#1A3A6B' : '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
                    €{(balance || 0).toFixed(2)}
                  </span>
                </div>

                {hasCredits ? (
                  <Link to="/search" onClick={onClose}>
                    <button className="w-full h-11 text-xs font-bold uppercase tracking-widest text-white"
                      style={{ background: '#1A3A6B', borderBottom: '3px solid #B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
                      Crea il tuo primo report — €9,90 →
                    </button>
                  </Link>
                ) : (
                  <>
                    <Link to="/credits" onClick={onClose}>
                      <button className="w-full h-11 text-xs font-bold uppercase tracking-widest text-white"
                        style={{ background: '#B33A2A', borderBottom: '3px solid rgba(0,0,0,0.2)', fontFamily: "'IBM Plex Mono', monospace" }}>
                        <CreditCard className="w-3.5 h-3.5 inline mr-2" />
                        Ricarica crediti prima →
                      </button>
                    </Link>
                    <Link to="/search" onClick={onClose}>
                      <button className="w-full h-9 text-xs uppercase tracking-widest"
                        style={{ border: '1px solid #1A3A6B', color: '#1A3A6B', background: 'transparent', fontFamily: "'IBM Plex Mono', monospace" }}>
                        Esplora il form prima
                      </button>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div className="px-6 pb-5 flex items-center justify-between">
            <button
              onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
              className="text-xs uppercase tracking-widest opacity-50 hover:opacity-80 transition-opacity"
              style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {step === 0 ? 'Salta' : '← Indietro'}
            </button>
            {step < STEPS.length - 1 && (
              <button
                onClick={() => setStep(s => s + 1)}
                className="h-9 px-5 text-xs font-bold uppercase tracking-widest text-white"
                style={{ background: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Avanti →
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}