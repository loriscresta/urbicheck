import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, Shield, Waves, Activity, BarChart3, ClipboardList,
  CheckCircle2, ArrowRight, Zap, Clock, Globe, FileText, X
} from "lucide-react";

// ── Logo ──
const Logo = ({ light = false }) => (
  <div className="flex items-center gap-2">
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <rect x="1" y="1" width="26" height="26" stroke={light ? "#fff" : "#0f172a"} strokeWidth="1.5" fill="none" />
      <line x1="10" y1="1" x2="10" y2="27" stroke={light ? "#fff" : "#0f172a"} strokeWidth="0.75" strokeOpacity="0.4" />
      <line x1="18" y1="1" x2="18" y2="27" stroke={light ? "#fff" : "#0f172a"} strokeWidth="0.75" strokeOpacity="0.4" />
      <line x1="1" y1="10" x2="27" y2="10" stroke={light ? "#fff" : "#0f172a"} strokeWidth="0.75" strokeOpacity="0.4" />
      <line x1="1" y1="18" x2="27" y2="18" stroke={light ? "#fff" : "#0f172a"} strokeWidth="0.75" strokeOpacity="0.4" />
      <polyline points="20,21 23,24 27,19" stroke="#10b981" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.06em' }}>
      <span style={{ color: light ? '#fff' : '#0f172a' }}>URBI</span>
      <span style={{ color: '#10b981' }}>CHECK</span>
    </span>
  </div>
);

// ── Demo Modal ──
function DemoModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#0f172a', border: '1px solid #1e293b' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '0.8rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '2px' }}>
              Esempio di Report
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>
              Comune di Alessandria · Foglio 42 · Part. 301
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {[
            { icon: '🗺️', label: 'Zona Urbanistica', value: 'B2 — Residenziale di completamento', ok: true },
            { icon: '⚠️', label: 'Vincolo Paesaggistico', value: 'Nessun vincolo art.142 rilevato', ok: true },
            { icon: '🌊', label: 'PAI Frane ARPA Piemonte', value: 'Nessuna frana censita nel perimetro', ok: true },
            { icon: '🔴', label: 'Classificazione Sismica', value: 'Zona 3 — Media sismicità (DGR 6-887/2019)', ok: null },
            { icon: '💶', label: 'Valore OMI stimato', value: '€ 1.250 – 1.600 / mq', ok: true },
            { icon: '📋', label: 'Intervento possibile', value: 'Ristrutturazione + sopraelevazione con SCIA', ok: true },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <div className="flex items-center gap-3">
                <span className="text-base">{row.icon}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#94a3b8' }}>{row.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#e2e8f0', textAlign: 'right', maxWidth: 220 }}>{row.value}</span>
                {row.ok === true && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                {row.ok === null && <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              </div>
            </div>
          ))}
          <div className="mt-4 rounded-lg px-4 py-3 flex items-center gap-3"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#10b981' }}>
              Report completo elaborato in 48 secondi · PDF disponibile al download
            </p>
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={() => { onClose(); base44.auth.redirectToLogin("/dashboard"); }}
            className="w-full h-11 rounded-lg font-bold text-sm tracking-wide transition-opacity hover:opacity-90"
            style={{ background: '#10b981', color: '#fff', fontFamily: "'IBM Plex Mono', monospace" }}>
            Inizia con il tuo immobile →
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Feature Card ──
function FeatureCard({ icon: Icon, title, desc, color }) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: '#1e293b', border: '1px solid #334155' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: `${color}20` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '0.78rem', color: '#f1f5f9' }}>{title}</p>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#64748b', lineHeight: 1.7 }}>{desc}</p>
    </div>
  );
}

// ── Pricing Card ──
function PricingCard({ tier, price, credits, features, popular, onCta }) {
  return (
    <div className="rounded-2xl p-6 flex flex-col gap-5 relative"
      style={{
        background: popular ? 'linear-gradient(135deg, #0f2d1f 0%, #0a1628 100%)' : '#1e293b',
        border: popular ? '2px solid #10b981' : '1px solid #334155',
      }}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
          style={{ background: '#10b981', color: '#fff', fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap' }}>
          ★ Più popolare
        </div>
      )}
      <div>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', fontWeight: 700, color: popular ? '#10b981' : '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>
          {tier}
        </p>
        <div className="flex items-end gap-2 mt-2">
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '2.2rem', color: '#f1f5f9' }}>{price}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#64748b', marginBottom: 6 }}>una tantum</span>
        </div>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#10b981', marginTop: 4 }}>{credits}</p>
      </div>
      <div className="space-y-2.5">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#94a3b8' }}>{f}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onCta}
        className="w-full h-10 rounded-lg font-bold text-xs tracking-widest uppercase transition-all hover:opacity-90"
        style={{
          background: popular ? '#10b981' : 'transparent',
          color: popular ? '#fff' : '#10b981',
          border: popular ? 'none' : '1px solid #10b981',
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
        Inizia ora →
      </button>
    </div>
  );
}

export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);
  const handleLogin = () => base44.auth.redirectToLogin("/dashboard");

  return (
    <div className="min-h-screen" style={{ background: '#0f172a', fontFamily: "'IBM Plex Mono', monospace" }}>

      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}

      {/* ── NAVBAR ── */}
      <nav style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo light />
          <div className="hidden md:flex items-center gap-8">
            {[['Come funziona', '#come-funziona'], ['Cosa include', '#features'], ['Prezzi', '#prezzi']].map(([label, href]) => (
              <a key={href} href={href}
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#94a3b8', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseOver={e => e.target.style.color = '#f1f5f9'}
                onMouseOut={e => e.target.style.color = '#94a3b8'}>
                {label}
              </a>
            ))}
          </div>
          <button onClick={handleLogin}
            className="text-xs font-bold uppercase tracking-widest px-5 h-9 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: '#10b981', color: '#fff', fontFamily: "'IBM Plex Mono', monospace", border: 'none' }}>
            Accedi
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="px-6 pt-24 pb-20 relative overflow-hidden">
        {/* Background grid decoration */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />

        <div className="max-w-4xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            {/* Badge beta */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#10b981', fontWeight: 700, letterSpacing: '1px' }}>
                BETA · Piemonte e Liguria disponibili
              </span>
            </div>

            <h1 className="font-bold leading-tight mb-6"
              style={{ color: '#f1f5f9', fontFamily: "'IBM Plex Mono', monospace", fontSize: 'clamp(2rem, 5vw, 3.6rem)', letterSpacing: '-0.02em' }}>
              La due diligence<br />
              immobiliare in{' '}
              <span style={{ color: '#10b981' }}>60 secondi</span>
            </h1>

            <p className="mb-10 max-w-2xl leading-relaxed"
              style={{ color: '#94a3b8', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.95rem', lineHeight: 1.8 }}>
              Inserisci foglio e particella — ottieni vincoli urbanistici, sismici, idrogeologici,
              paesaggistici e valutazione finanziaria istantanea.{' '}
              <span style={{ color: '#e2e8f0' }}>Senza aspettare il tecnico.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
              <button onClick={handleLogin}
                className="inline-flex items-center gap-2 px-8 h-12 rounded-xl font-bold text-sm tracking-wide transition-all hover:opacity-90 hover:shadow-lg"
                style={{ background: '#10b981', color: '#fff', fontFamily: "'IBM Plex Mono', monospace", boxShadow: '0 4px 24px rgba(16,185,129,0.3)' }}>
                Inizia ora — €9,90 a report
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => setShowDemo(true)}
                className="inline-flex items-center gap-2 px-6 h-12 rounded-xl text-sm transition-all hover:bg-slate-800"
                style={{ color: '#94a3b8', fontFamily: "'IBM Plex Mono', monospace", border: '1px solid #334155' }}>
                <FileText className="w-4 h-4" />
                Vedi esempio di report
              </button>
            </div>

            {/* Mini trust */}
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#475569' }}>
              ✓ Nessun abbonamento &nbsp;·&nbsp; ✓ Paghi solo i report che usi &nbsp;·&nbsp; ✓ Dati WFS ufficiali regionali
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── STRIP NUMERI ── */}
      <section style={{ borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b', background: '#0f1f2e' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { value: '10+', label: 'Report elaborati' },
              { value: '2', label: 'Regioni coperte' },
              { value: 'art.142', label: 'Vincoli inclusi' },
              { value: '< 60s', label: 'Tempo di risposta' },
            ].map((item, i) => (
              <div key={i} className="py-6 px-4 text-center flex flex-col items-center gap-1"
                style={{ borderRight: i < 3 ? '1px solid #1e293b' : 'none' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '1.4rem', color: '#10b981' }}>{item.value}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COME FUNZIONA ── */}
      <section id="come-funziona" className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: 12 }}>
              Come funziona
            </p>
            <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 'clamp(1.4rem, 3vw, 2.1rem)', color: '#f1f5f9', lineHeight: 1.3 }}>
              Tre passaggi, un report completo
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 relative">
            {[
              {
                num: '01',
                icon: MapPin,
                title: 'Inserisci i dati catastali',
                desc: 'Comune, foglio e particella del lotto che vuoi analizzare. Puoi anche caricare una visura catastale per la precompilazione automatica.',
              },
              {
                num: '02',
                icon: Zap,
                title: 'Analisi in tempo reale',
                desc: 'UrbiCheck interroga i WFS regionali (ARPA, Geoportali) e le banche dati PAI, acquisendo vincoli urbanistici, sismici e idrogeologici.',
              },
              {
                num: '03',
                icon: FileText,
                title: 'Ricevi il report completo',
                desc: 'Scheda certificata con tutti i vincoli, valutazione finanziaria OMI e pratiche necessarie. PDF scaricabile incluso.',
              },
            ].map((step, i) => (
              <div key={i} className="p-8 flex flex-col gap-4 relative"
                style={{ background: '#111827', border: '1px solid #1e293b', borderLeft: i > 0 ? 'none' : '1px solid #1e293b' }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '0.65rem', color: '#10b981', opacity: 0.6 }}>{step.num}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <step.icon className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '0.82rem', color: '#f1f5f9' }}>{step.title}</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#64748b', lineHeight: 1.8 }}>{step.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: '#10b981' }}>
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COSA INCLUDE ── */}
      <section id="features" className="px-6 py-24" style={{ background: '#080f1a' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: 12 }}>
              Cosa include il report
            </p>
            <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 'clamp(1.4rem, 3vw, 2.1rem)', color: '#f1f5f9', lineHeight: 1.3 }}>
              Tutto quello che serve per decidere
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard icon={MapPin} color="#10b981" title="Zona urbanistica e destinazione d'uso" desc="Categoria di zona, indici edilizi, altezze massime e destinazioni previste dal PRG/PRGC vigente." />
            <FeatureCard icon={Shield} color="#f59e0b" title="Vincoli paesaggistici art.142" desc="Laghi, fiumi, coste, parchi: fascia di tutela, riferimento normativo e link di verifica ufficiale." />
            <FeatureCard icon={Waves} color="#3b82f6" title="Rischio idrogeologico e frane (PAI)" desc="WFS ARPA Piemonte e Regione Liguria — frane poligonali e puntuali (PIFF), rischio idraulico." />
            <FeatureCard icon={Activity} color="#ef4444" title="Classificazione sismica ufficiale" desc="Zona sismica per DGR regionale. Piemonte: DGR 6-887/2019 con zone 3S e 3. NTC 2018." />
            <FeatureCard icon={BarChart3} color="#8b5cf6" title="Valutazione finanziaria + indici OMI" desc="Stima valore di mercato, calcolo ROI per affitto breve e lungo, costi di ristrutturazione." />
            <FeatureCard icon={ClipboardList} color="#10b981" title="Pratiche necessarie e iter burocratico" desc="CILA, SCIA, Permesso di Costruire: ente competente, tempistiche e costi stimati per ogni intervento." />
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="prezzi" className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: 12 }}>
              Prezzi
            </p>
            <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 'clamp(1.4rem, 3vw, 2.1rem)', color: '#f1f5f9', lineHeight: 1.3 }}>
              Paghi solo ciò che usi
            </h2>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#64748b', marginTop: 12 }}>
              Nessun abbonamento. Ricarichi crediti e li usi quando vuoi.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <PricingCard
              tier="Starter"
              price="€9,90"
              credits="9,90 crediti · 1 report completo"
              features={[
                'Analisi urbanistica completa',
                'Vincoli art.142 (laghi, fiumi, coste)',
                'PAI frane e rischio idrogeologico',
                'Classificazione sismica',
                'PDF scaricabile',
              ]}
              onCta={handleLogin}
            />
            <PricingCard
              tier="Pro"
              price="€24,90"
              credits="27,40 crediti · 3 report + 10% bonus"
              features={[
                'Tutto incluso in Starter',
                '10% di crediti bonus',
                'Valutazione finanziaria OMI',
                'Scenario flip e rendita affitto',
                'Priorità in coda elaborazione',
              ]}
              popular
              onCta={handleLogin}
            />
            <PricingCard
              tier="Business"
              price="€59,90"
              credits="71,90 crediti · 8 report + 20% bonus"
              features={[
                'Tutto incluso in Pro',
                '20% di crediti bonus',
                'Accesso agli atti (art. 22 L.241/90)',
                'Richiesta CDU pre-compilata',
                'Export dati strutturati JSON',
              ]}
              onCta={handleLogin}
            />
          </div>
          <p className="text-center mt-8" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#475569' }}>
            I crediti non scadono · IVA inclusa · Rimborso entro 48h se il report non viene generato
          </p>
        </div>
      </section>

      {/* ── CTA FINALE ── */}
      <section className="px-6 py-24" style={{ background: '#080f1a', borderTop: '1px solid #1e293b' }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#10b981', fontWeight: 700, letterSpacing: '1px' }}>
              BETA APERTA — accesso immediato
            </span>
          </div>
          <h2 className="font-bold mb-5 leading-tight"
            style={{ color: '#f1f5f9', fontFamily: "'IBM Plex Mono', monospace", fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
            Inizia ad analizzare<br />il tuo prossimo immobile.
          </h2>
          <p className="mb-10 leading-relaxed"
            style={{ color: '#64748b', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
            Crea un account gratuito e ricarica i crediti per ottenere il tuo primo report in 60 secondi.
          </p>
          <button onClick={handleLogin}
            className="inline-flex items-center gap-2 px-10 h-13 rounded-xl font-bold text-sm tracking-wide transition-all hover:opacity-90"
            style={{ background: '#10b981', color: '#fff', fontFamily: "'IBM Plex Mono', monospace", boxShadow: '0 4px 32px rgba(16,185,129,0.35)', height: 52 }}>
            Inizia ora — €9,90 a report
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0a0f1a', borderTop: '1px solid #1e293b' }}>
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <Logo light />
            <p className="mt-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#334155' }}>
              Fenice Management — P.IVA IT02696760101
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#475569', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px' }}
              onMouseOver={e => e.target.style.color = '#94a3b8'} onMouseOut={e => e.target.style.color = '#475569'}>
              Privacy Policy
            </a>
            <a href="#" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#475569', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px' }}
              onMouseOver={e => e.target.style.color = '#94a3b8'} onMouseOut={e => e.target.style.color = '#475569'}>
              Termini di servizio
            </a>
            <a href="mailto:loris.cresta@gmail.com" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#10b981', textDecoration: 'none' }}>
              loris.cresta@gmail.com
            </a>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #0f172a', padding: '1rem 1.5rem' }}>
          <div className="max-w-6xl mx-auto">
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1e293b' }}>
              © 2026 URBICHECK — Fenice Management di Dell'Aria Claudia Giuseppina. Tutti i diritti riservati. · Beta
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}