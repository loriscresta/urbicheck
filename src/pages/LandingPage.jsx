import React from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";

const UrbiCheckLogo = ({ light = false }) => (
  <div className="flex items-center gap-2">
    {/* 3×3 grid icon with red checkmark */}
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      {/* 3×3 grid lines */}
      <rect x="1" y="1" width="26" height="26" stroke={light ? "#F4EFE6" : "#1A3A6B"} strokeWidth="1.5" fill="none" />
      <line x1="10" y1="1" x2="10" y2="27" stroke={light ? "#F4EFE6" : "#1A3A6B"} strokeWidth="0.75" strokeOpacity="0.5" />
      <line x1="18" y1="1" x2="18" y2="27" stroke={light ? "#F4EFE6" : "#1A3A6B"} strokeWidth="0.75" strokeOpacity="0.5" />
      <line x1="1" y1="10" x2="27" y2="10" stroke={light ? "#F4EFE6" : "#1A3A6B"} strokeWidth="0.75" strokeOpacity="0.5" />
      <line x1="1" y1="18" x2="27" y2="18" stroke={light ? "#F4EFE6" : "#1A3A6B"} strokeWidth="0.75" strokeOpacity="0.5" />
      {/* Red checkmark bottom-right cell */}
      <polyline points="20,21 23,24 27,19" stroke="#B33A2A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
      <span style={{ color: light ? '#F4EFE6' : '#1A3A6B' }}>URBI</span>
      <span style={{ color: '#B33A2A' }}>CHECK</span>
    </span>
  </div>
);

export default function LandingPage() {
  const handleLogin = () => {
    base44.auth.redirectToLogin("/dashboard");
  };

  return (
    <div className="min-h-screen" style={{ background: '#F4EFE6', fontFamily: "'IBM Plex Mono', monospace" }}>

      {/* ── NAVBAR ── */}
      <nav style={{ background: '#1A3A6B', borderBottom: '2px solid #B33A2A' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <UrbiCheckLogo light />
          <div className="hidden md:flex items-center gap-8">
            <a href="#come-funziona" className="text-xs uppercase tracking-[2px] transition-opacity hover:opacity-70"
              style={{ color: '#F4EFE6', fontFamily: "'IBM Plex Mono', monospace" }}>
              Come funziona
            </a>
            <a href="#prezzi" className="text-xs uppercase tracking-[2px] transition-opacity hover:opacity-70"
              style={{ color: '#F4EFE6', fontFamily: "'IBM Plex Mono', monospace" }}>
              Prezzi
            </a>
            <Link to="/waitlist" className="text-xs uppercase tracking-[2px] transition-opacity hover:opacity-70"
              style={{ color: '#F4EFE6', fontFamily: "'IBM Plex Mono', monospace" }}>
              Lista d'attesa
            </Link>
          </div>
          <button
            onClick={handleLogin}
            className="text-xs font-bold uppercase tracking-[2px] px-5 h-9 text-white transition-opacity hover:opacity-90"
            style={{ background: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace", border: 'none' }}
          >
            Accedi
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: '#1A3A6B' }} className="px-6 pt-20 pb-24">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* Sopratitolo */}
            <p className="text-xs font-bold uppercase tracking-[4px] mb-6"
              style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
              ANALISI URBANISTICA AUTOMATIZZATA
            </p>

            {/* Titolo */}
            <h1 className="font-bold leading-tight mb-8"
              style={{ color: '#F4EFE6', fontFamily: "'IBM Plex Mono', monospace", fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.02em' }}>
              Prima di comprare,<br />
              sappi esattamente<br />
              cosa puoi farci.
            </h1>

            {/* Sottotitolo */}
            <p className="mb-10 max-w-2xl leading-relaxed"
              style={{ color: '#C4BAA8', fontFamily: "'Libre Baskerville', serif", fontSize: '1.05rem' }}>
              URBICHECK analizza destinazione urbanistica, indici edilizi e vincoli di qualsiasi immobile in 3 minuti — dati ufficiali WFS regionali.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <button
                onClick={handleLogin}
                className="text-sm font-bold uppercase tracking-[2px] px-8 h-12 text-white transition-opacity hover:opacity-90"
                style={{ background: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace", borderBottom: '3px solid rgba(0,0,0,0.3)' }}
              >
                Entra in lista d'attesa →
              </button>
              <a href="#come-funziona" className="text-sm transition-opacity hover:opacity-70"
                style={{ color: '#C4BAA8', fontFamily: "'IBM Plex Mono', monospace" }}>
                Scopri come funziona ↓
              </a>
            </div>

            {/* Nota copertura */}
            <p className="text-[11px]" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
              Copertura attuale: Liguria e Piemonte &nbsp;•&nbsp; Lombardia, Veneto, Emilia — Q3 2026
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── SEZIONE 2 — IL PROBLEMA ── */}
      <section id="come-funziona" style={{ background: '#F4EFE6', borderTop: '1px solid #C4BAA8' }} className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[4px] mb-5"
            style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
            IL PROBLEMA
          </p>
          <h2 className="mb-6 leading-tight"
            style={{ color: '#1C1A17', fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)' }}>
            800€ per sapere cosa puoi costruire su un immobile.<br />E aspettare 2 settimane.
          </h2>
          <p className="mb-10 max-w-2xl leading-relaxed"
            style={{ color: '#7A7268', fontFamily: "'Libre Baskerville', serif", fontSize: '1rem' }}>
            Oggi un'analisi urbanistica professionale affidata a un geometra o architetto costa tra €600 e €1.200 e richiede dai 5 ai 15 giorni. Prima di ogni acquisto, asta giudiziaria o trattativa, stai sostanzialmente comprando alla cieca.
          </p>

          {/* Box evidenza 3 colonne */}
          <div className="grid grid-cols-1 md:grid-cols-3"
            style={{ background: '#fff', border: '1px solid #C4BAA8' }}>
            {[
              { label: 'COSTO MEDIO ANALISI', value: '€ 800', sub: 'per singolo immobile' },
              { label: 'TEMPO DI ATTESA', value: '10 gg', sub: 'lavorativi medi' },
              { label: 'COPERTURA', value: '1', sub: 'immobile per analisi' },
            ].map((item, i) => (
              <div key={i} className="p-8 flex flex-col items-center text-center"
                style={{ borderRight: i < 2 ? '1px solid #C4BAA8' : 'none', borderBottom: '0' }}>
                <p className="text-[10px] font-bold uppercase tracking-[3px] mb-3"
                  style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {item.label}
                </p>
                <p className="font-bold leading-none mb-2"
                  style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace", fontSize: '2.8rem' }}>
                  {item.value}
                </p>
                <p className="text-xs" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {item.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEZIONE 3 — LA SOLUZIONE ── */}
      <section id="prezzi" style={{ background: '#1C1A17', borderTop: '2px solid #B33A2A' }} className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[4px] mb-5"
            style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
            LA SOLUZIONE
          </p>
          <h2 className="font-bold mb-6 leading-tight"
            style={{ color: '#F4EFE6', fontFamily: "'IBM Plex Mono', monospace", fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)' }}>
            Con €800 analizzi 90 immobili.<br />In 3 minuti ciascuno.
          </h2>
          <p className="mb-12 max-w-2xl leading-relaxed"
            style={{ color: '#C4BAA8', fontFamily: "'Libre Baskerville', serif", fontSize: '1rem' }}>
            URBICHECK interroga in tempo reale i dataset WFS delle Regioni italiane — gli stessi dati che usano geometri e architetti — e restituisce una scheda urbanistica strutturata: destinazione di zona, indici edilizi, vincoli, possibilità edificatorie.
          </p>

          {/* Tre card prezzi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mb-8" style={{ border: '1px solid #7A7268' }}>
            {[
              { tier: 'QUERY BASE', price: '€ 9,90', desc: 'Scheda urbanistica completa' },
              { tier: '+ ACCESSO AGLI ATTI', price: '+ € 4,90', desc: 'Normativa di zona allegata' },
              { tier: '+ PDF TIMBRATO', price: '+ € 2,90', desc: 'Documento esportabile con riferimenti' },
            ].map((item, i) => (
              <div key={i} className="p-7"
                style={{
                  borderRight: i < 2 ? '1px solid #7A7268' : 'none',
                  background: i === 0 ? 'rgba(179,58,42,0.08)' : 'transparent'
                }}>
                <p className="text-[10px] font-bold uppercase tracking-[2px] mb-3"
                  style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {item.tier}
                </p>
                <p className="font-bold leading-none mb-3"
                  style={{ color: i === 0 ? '#B33A2A' : '#F4EFE6', fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.8rem' }}>
                  {item.price}
                </p>
                <p className="text-xs" style={{ color: '#C4BAA8', fontFamily: "'Libre Baskerville', serif" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <a href="#" onClick={handleLogin} className="text-xs font-bold uppercase tracking-[2px] transition-opacity hover:opacity-70"
            style={{ color: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
            Vedi tutti i piani →
          </a>
        </div>
      </section>

      {/* ── SEZIONE 4 — PER CHI ── */}
      <section style={{ background: '#F4EFE6', borderTop: '1px solid #C4BAA8' }} className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[4px] mb-5"
            style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
            PER CHI È
          </p>
          <h2 className="mb-12 leading-tight"
            style={{ color: '#1C1A17', fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)' }}>
            Chiunque debba decidere prima di comprare.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0"
            style={{ border: '1px solid #C4BAA8' }}>
            {[
              { emoji: '🏠', label: 'Acquirenti privati', desc: 'Verifica prima di firmare il compromesso' },
              { emoji: '⚖️', label: 'Aste giudiziarie', desc: 'Analizza il lotto prima dell\'udienza' },
              { emoji: '🏢', label: 'Agenti immobiliari', desc: 'Scheda tecnica pronta per ogni proposta' },
              { emoji: '📈', label: 'Investitori', desc: 'Due diligence urbanistica rapida su ogni target' },
              { emoji: '🏗️', label: 'Developer', desc: 'Valutazione preliminare di fattibilità in minuti' },
              { emoji: '📋', label: 'Avvocati e notai', desc: 'Dati ufficiali per perizie e atti' },
            ].map((item, i) => (
              <div key={i} className="p-7 bg-white"
                style={{
                  borderRight: (i % 3 !== 2) ? '1px solid #C4BAA8' : 'none',
                  borderBottom: i < 3 ? '1px solid #C4BAA8' : 'none',
                }}>
                <div className="text-2xl mb-3">{item.emoji}</div>
                <p className="font-bold text-xs uppercase tracking-[2px] mb-2"
                  style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {item.label}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#7A7268', fontFamily: "'Libre Baskerville', serif" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEZIONE 5 — CTA FINALE ── */}
      <section style={{ background: '#1A3A6B', borderTop: '2px solid #B33A2A' }} className="px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-bold mb-5 leading-tight"
            style={{ color: '#F4EFE6', fontFamily: "'IBM Plex Mono', monospace", fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)' }}>
            Sei tra i primi a saperlo.<br />Entra in lista d'attesa.
          </h2>
          <p className="mb-10 leading-relaxed"
            style={{ color: '#C4BAA8', fontFamily: "'Libre Baskerville', serif", fontSize: '1rem' }}>
            URBICHECK è in fase di accesso anticipato. Iscriviti per ricevere accesso prioritario e il prezzo lancio.
          </p>
          <button
            onClick={handleLogin}
            className="text-sm font-bold uppercase tracking-[2px] px-10 h-14 text-white transition-opacity hover:opacity-90"
            style={{ background: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace", borderBottom: '3px solid rgba(0,0,0,0.3)' }}
          >
            Entra in lista d'attesa →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#1C1A17', borderTop: '1px solid #333' }}>
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <UrbiCheckLogo light />
            <p className="text-[10px] mt-3" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
              Fenice Management — P.IVA IT02696760101
            </p>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <Link to="/waitlist" className="text-[10px] uppercase tracking-[2px] transition-opacity hover:opacity-70"
              style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
              Lista d'attesa
            </Link>
            <a href="#" className="text-[10px] uppercase tracking-[2px] transition-opacity hover:opacity-70"
              style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
              Privacy Policy
            </a>
            <a href="#" className="text-[10px] uppercase tracking-[2px] transition-opacity hover:opacity-70"
              style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
              Termini di servizio
            </a>
            <a href="mailto:loris.cresta@gmail.com" className="text-[10px] flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
              <Mail className="w-3 h-3" /> loris.cresta@gmail.com
            </a>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #222' }}>
          <div className="max-w-6xl mx-auto px-6 py-4">
            <p className="text-[10px]" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
              © 2025 URBICHECK — Fenice Management di Dell'Aria Claudia Giuseppina. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}