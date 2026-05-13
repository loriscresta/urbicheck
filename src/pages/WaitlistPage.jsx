import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";

/* ── Shared brand tokens ── */
const T = {
  blue: '#1A3A6B',
  red: '#B33A2A',
  paper: '#F4EFE6',
  ink: '#1C1A17',
  grey: '#7A7268',
  border: '#C4BAA8',
  mono: "'IBM Plex Mono', monospace",
  serif: "'Libre Baskerville', serif",
};

/* ── Logo ── */
const Logo = ({ light = false }) => (
  <div className="flex items-center gap-2">
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <rect x="1" y="1" width="26" height="26" stroke={light ? T.paper : T.blue} strokeWidth="1.5" fill="none" />
      <line x1="10" y1="1" x2="10" y2="27" stroke={light ? T.paper : T.blue} strokeWidth="0.75" strokeOpacity="0.5" />
      <line x1="18" y1="1" x2="18" y2="27" stroke={light ? T.paper : T.blue} strokeWidth="0.75" strokeOpacity="0.5" />
      <line x1="1" y1="10" x2="27" y2="10" stroke={light ? T.paper : T.blue} strokeWidth="0.75" strokeOpacity="0.5" />
      <line x1="1" y1="18" x2="27" y2="18" stroke={light ? T.paper : T.blue} strokeWidth="0.75" strokeOpacity="0.5" />
      <polyline points="20,21 23,24 27,19" stroke={T.red} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
      <span style={{ color: light ? T.paper : T.blue }}>URBI</span>
      <span style={{ color: T.red }}>CHECK</span>
    </span>
  </div>
);

/* ── Label ── */
const SectionLabel = ({ children, color = T.grey }) => (
  <p style={{ fontFamily: T.mono, color, fontSize: '0.65rem', letterSpacing: '4px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1.25rem' }}>
    {children}
  </p>
);

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [ruolo, setRuolo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Inserisci la tua email.'); return; }
    setLoading(true);
    setError('');
    await base44.entities.WaitlistSubscriber.create({ email, ruolo: ruolo || 'altro' });
    setSubmitted(true);
    setLoading(false);
  };

  const scrollToForm = () => {
    document.getElementById('waitlist-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ background: T.paper, fontFamily: T.mono }}>

      {/* ── NAVBAR ── */}
      <nav style={{ background: T.blue, borderBottom: `2px solid ${T.red}`, position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo light />
          <div className="hidden md:flex items-center gap-8">
            {['Come funziona', 'Prezzi'].map((l) => (
              <a key={l} href="#" style={{ color: T.paper, fontFamily: T.mono, fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.85 }}
                className="hover:opacity-100 transition-opacity">{l}</a>
            ))}
          </div>
          <button onClick={scrollToForm} style={{ background: T.red, fontFamily: T.mono, fontSize: '0.65rem', letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase', color: '#fff', border: 'none', padding: '0 1.25rem', height: '2.25rem', cursor: 'pointer' }}>
            Lista d'attesa
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: T.blue, padding: '5rem 1.5rem 6rem' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <SectionLabel color={T.red}>APERTURA LISTA D'ATTESA — LANCIO GIUGNO 2026</SectionLabel>
            <h1 style={{ color: T.paper, fontFamily: T.mono, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '2rem' }}>
              Prima di comprare,<br />sappi esattamente<br />cosa puoi farci.
            </h1>
            <p style={{ color: T.border, fontFamily: T.serif, fontSize: '1.05rem', lineHeight: 1.75, maxWidth: '680px', marginBottom: '2.5rem' }}>
              Inserisci foglio e particella — in 3 minuti sai se puoi costruire, ristrutturare, ampliare o se ci sono vincoli che bloccano tutto. Dati ufficiali dalle banche dati regionali, analizzati da AI. €9,90 per query — quello che prima costava €800 e due settimane per uno solo. Con urbicheck ne analizzi 90 per lo stesso budget.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <button onClick={scrollToForm} style={{ background: T.red, fontFamily: T.mono, fontSize: '0.75rem', letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase', color: '#fff', border: 'none', padding: '0 2rem', height: '3rem', cursor: 'pointer', borderBottom: '3px solid rgba(0,0,0,0.25)' }}>
                Entra in lista d'attesa ↓
              </button>
              <a href="#come-funziona" style={{ color: T.border, fontFamily: T.mono, fontSize: '0.75rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', paddingTop: '0.75rem' }}>
                Vedi come funziona ↓
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SEZIONE 2: DEMO SCHEDA ── */}
      <section style={{ background: T.paper, borderTop: `1px solid ${T.border}`, padding: '5rem 1.5rem' }}>
        <div className="max-w-4xl mx-auto">
          <SectionLabel>SCHEDA URBANISTICA</SectionLabel>

          {/* Card demo */}
          <div style={{ background: '#fff', border: `1px solid ${T.border}`, marginBottom: '3rem' }}>
            {/* Card header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: T.mono, fontSize: '0.7rem', fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '1px' }}>Scheda Urbanistica</span>
              <span style={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.grey }}>UC-2026-00841</span>
            </div>

            {/* Rows */}
            {[
              ['Comune', 'Bergeggi (SV)'],
              ['Particella', 'Foglio 7 — Part. 199'],
              ['Zona PRG', 'T — Turistica'],
              ['Superficie', '2.340 m²'],
              ['Edificabilità', 'Ammessa con SCIA'],
              ['Zona Sismica', 'Classe 3 — bassa'],
              ['Rischio Idraulico', 'Nessuno'],
              ['Vincoli', 'D.Lgs 42/04 Verificato'],
            ].map(([label, value], i) => (
              <div key={i} style={{ display: 'flex', padding: '0.75rem 1.5rem', borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? '#fff' : T.paper }}>
                <span style={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.grey, textTransform: 'uppercase', letterSpacing: '1px', width: '200px', flexShrink: 0 }}>{label}</span>
                <span style={{ fontFamily: T.mono, fontSize: '0.75rem', color: T.ink, fontWeight: 600 }}>{value}</span>
              </div>
            ))}

            {/* Highlight row */}
            <div style={{ display: 'flex', padding: '0.9rem 1.5rem', background: T.blue, borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontFamily: T.mono, fontSize: '0.65rem', color: 'rgba(244,239,230,0.6)', textTransform: 'uppercase', letterSpacing: '1px', width: '200px', flexShrink: 0 }}>Raccomandazione AI</span>
              <span style={{ fontFamily: T.mono, fontSize: '0.75rem', color: T.paper, fontWeight: 700 }}>✓ Operazione fattibile</span>
            </div>

            {/* Card footer */}
            <div style={{ padding: '0.85rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${T.border}` }}>
              <span style={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.grey }}>⏱ Elaborato in 2m 47s</span>
              <span style={{ fontFamily: T.mono, fontSize: '1rem', fontWeight: 700, color: T.red }}>€9,90</span>
            </div>
          </div>

          <p style={{ fontFamily: T.serif, fontSize: '0.8rem', color: T.grey, fontStyle: 'italic', marginBottom: '3rem' }}>
            ↑ output reale — dati WFS Regione Liguria
          </p>

          {/* 4 stat boxes */}
          <div className="grid grid-cols-2 lg:grid-cols-4" style={{ border: `1px solid ${T.border}` }}>
            {[
              { num: '90', label: 'immobili', desc: 'Con €800 ne analizzi 1. Con urbicheck 90.' },
              { num: '3', label: 'min', desc: 'Invece di 1–2 settimane per risposta' },
              { num: '7+', label: 'layer GIS', desc: 'Analizzati per query' },
              { num: '€9,90', label: '', desc: 'Per scheda completa, h24, nessun abbonamento' },
            ].map((s, i) => (
              <div key={i} className="p-6 text-center" style={{ borderRight: i < 3 ? `1px solid ${T.border}` : 'none', background: '#fff' }}>
                <div style={{ fontFamily: T.mono, fontWeight: 700, color: T.red, fontSize: '2rem', lineHeight: 1 }}>{s.num}</div>
                {s.label && <div style={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.grey, textTransform: 'uppercase', letterSpacing: '2px', marginTop: '0.25rem' }}>{s.label}</div>}
                <p style={{ fontFamily: T.serif, fontSize: '0.75rem', color: T.grey, marginTop: '0.5rem', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEZIONE 3: IL PROBLEMA ── */}
      <section style={{ background: T.ink, borderTop: `2px solid ${T.red}`, padding: '5rem 1.5rem' }}>
        <div className="max-w-4xl mx-auto">
          <SectionLabel color={T.red}>IL PROBLEMA</SectionLabel>
          <h2 style={{ color: T.paper, fontFamily: T.mono, fontWeight: 700, fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: '3rem', lineHeight: 1.3 }}>
            Stai per fare un'offerta. Ma sai davvero cosa ci puoi fare con quell'immobile?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0" style={{ border: `1px solid ${T.grey}` }}>
            {/* Senza */}
            <div style={{ padding: '2rem', borderRight: `1px solid ${T.grey}` }}>
              <p style={{ fontFamily: T.mono, fontSize: '0.65rem', fontWeight: 700, color: T.grey, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '1.5rem' }}>Senza urbicheck</p>
              {[
                'Compri senza sapere se puoi costruire, ampliare o ristrutturare',
                'Scopri i vincoli solo dopo il rogito — quando è troppo tardi',
                'Aspetti settimane una risposta dal Comune o da un tecnico',
                'Perdi opportunità all\'asta perché non hai tempo di verificare prima',
                'Paghi €800–2.000 per una perizia che ti serve solo come check preliminare',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 mb-3">
                  <span style={{ color: T.red, fontFamily: T.mono, fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>✗</span>
                  <p style={{ color: T.border, fontFamily: T.serif, fontSize: '0.85rem', lineHeight: 1.6 }}>{item}</p>
                </div>
              ))}
            </div>

            {/* Con */}
            <div style={{ padding: '2rem', background: T.paper }}>
              <p style={{ fontFamily: T.mono, fontSize: '0.65rem', fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '1.5rem' }}>Con urbicheck</p>
              {[
                'In 3 minuti sai zona urbanistica, edificabilità e vincoli reali',
                'Decidi se procedere o passare oltre — prima di spendere un euro',
                'Disponibile h24 — anche la domenica prima di un\'asta del lunedì',
                'PDF scaricabile da condividere con il tuo consulente o la banca',
                '€9,90 per scheda — con €800 ne analizzi 1, con urbicheck ne analizzi 90',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 mb-3">
                  <span style={{ color: T.blue, fontFamily: T.mono, fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>✓</span>
                  <p style={{ color: T.ink, fontFamily: T.serif, fontSize: '0.85rem', lineHeight: 1.6 }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SEZIONE 4: COME FUNZIONA ── */}
      <section id="come-funziona" style={{ background: T.paper, borderTop: `1px solid ${T.border}`, padding: '5rem 1.5rem' }}>
        <div className="max-w-4xl mx-auto">
          <SectionLabel>COME FUNZIONA</SectionLabel>
          <h2 style={{ color: T.ink, fontFamily: T.serif, fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: '3rem', lineHeight: 1.4 }}>
            5 passi automatizzati, dati reali, output operativo
          </h2>

          <div className="space-y-0" style={{ border: `1px solid ${T.border}` }}>
            {[
              { n: '01', title: 'Inserisci i dati catastali', desc: 'Regione, comune, foglio, particella e finalità dell\'analisi (acquisto, ristrutturazione, asta, investimento).' },
              { n: '02', title: 'Query WFS in tempo reale', desc: 'Interrogazione automatica dei GeoServer regionali ufficiali: catasto, PRG/PUC, sismica, idraulica, vincoli paesaggistici.' },
              { n: '03', title: 'Analisi AI contestuale', desc: 'I dati GIS vengono elaborati da Claude AI che genera una scheda operativa adattata alla finalità dichiarata.' },
              { n: '04', title: 'Scheda strutturata', desc: 'Output standardizzato: zona urbanistica, edificabilità, vincoli, raccomandazione operativa, accesso agli atti pre-compilato.' },
              { n: '05', title: 'PDF timbrato scaricabile', desc: 'Report con numero scheda univoco e riferimenti alle fonti ufficiali — utilizzabile come documento di pre-due diligence.' },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-6 p-6" style={{ background: i % 2 === 0 ? '#fff' : T.paper, borderBottom: i < 4 ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ fontFamily: T.mono, fontWeight: 700, color: T.red, fontSize: '1.75rem', lineHeight: 1, flexShrink: 0, minWidth: '2.5rem' }}>{step.n}</span>
                <div>
                  <p style={{ fontFamily: T.mono, fontWeight: 700, color: T.blue, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>{step.title}</p>
                  <p style={{ fontFamily: T.serif, color: T.grey, fontSize: '0.875rem', lineHeight: 1.65 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEZIONE 5: PRICING ── */}
      <section style={{ background: T.blue, borderTop: `2px solid ${T.red}`, padding: '5rem 1.5rem' }}>
        <div className="max-w-4xl mx-auto">
          <SectionLabel color={T.red}>PRICING</SectionLabel>
          <h2 style={{ color: T.paper, fontFamily: T.mono, fontWeight: 700, fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: '3rem', lineHeight: 1.3 }}>
            Pay-per-query. Nessun abbonamento obbligatorio.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0" style={{ border: `1px solid ${T.grey}` }}>
            {[
              { name: 'Query base', price: '€9,90', desc: 'Scheda urbanistica completa con dati GIS reali, analisi AI, raccomandazione operativa.', highlight: false },
              { name: 'Accesso agli atti', price: '+€4,90', desc: 'Genera richiesta art. 22 L.241/90 pre-compilata con PEC dell\'UTC del comune.', highlight: false },
              { name: 'Report PDF timbrato', price: '+€2,90', desc: 'Versione scaricabile con numero scheda univoco e riferimenti alle fonti ufficiali.', highlight: false },
              { name: 'Piano Pro', price: '€49/mese', desc: '10 query/mese + PDF illimitati + export Excel. Per agenti, investitori e developer con volumi elevati.', highlight: true },
            ].map((p, i) => (
              <div key={i} className="p-6" style={{
                borderRight: i < 3 ? `1px solid ${T.grey}` : 'none',
                background: p.highlight ? 'rgba(244,239,230,0.06)' : 'rgba(255,255,255,0.03)',
                position: 'relative',
              }}>
                {p.highlight && (
                  <div style={{ position: 'absolute', top: '-1px', left: 0, right: 0, height: '3px', background: T.red }} />
                )}
                <p style={{ fontFamily: T.mono, fontSize: '0.6rem', fontWeight: 700, color: T.border, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.75rem' }}>{p.name}</p>
                <p style={{ fontFamily: T.mono, fontWeight: 700, color: T.paper, fontSize: '1.6rem', marginBottom: '0.75rem', lineHeight: 1 }}>{p.price}</p>
                <p style={{ fontFamily: T.serif, color: T.border, fontSize: '0.8rem', lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEZIONE 6: COPERTURA ── */}
      <section style={{ background: T.paper, borderTop: `1px solid ${T.border}`, padding: '5rem 1.5rem' }}>
        <div className="max-w-4xl mx-auto">
          <SectionLabel>COPERTURA</SectionLabel>
          <h2 style={{ color: T.ink, fontFamily: T.serif, fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: '3rem', lineHeight: 1.4 }}>
            Live su Liguria e Piemonte. In espansione su tutta Italia.
          </h2>

          <div className="flex flex-wrap gap-3 mb-6">
            {[
              { name: 'Liguria', status: 'live' },
              { name: 'Piemonte', status: 'live' },
              { name: 'Lombardia', status: 'Q3 2026' },
              { name: 'Veneto', status: 'Q3 2026' },
              { name: 'Emilia', status: 'Q3 2026' },
              { name: 'Toscana', status: 'Q4 2026' },
              { name: '+14 reg.', status: '2027' },
            ].map((r, i) => (
              <div key={i} style={{
                border: `1px solid ${r.status === 'live' ? T.blue : T.border}`,
                background: r.status === 'live' ? T.blue : '#fff',
                padding: '0.4rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: r.status === 'live' ? '#4ade80' : T.border, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontFamily: T.mono, fontSize: '0.7rem', fontWeight: 700, color: r.status === 'live' ? T.paper : T.grey }}>{r.name}</span>
                <span style={{ fontFamily: T.mono, fontSize: '0.6rem', color: r.status === 'live' ? 'rgba(244,239,230,0.6)' : T.border }}>— {r.status}</span>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.grey, letterSpacing: '1px' }}>
            ● Live — dati WFS reali &nbsp;|&nbsp; ○ In sviluppo &nbsp;|&nbsp; · Roadmap — fallback AI attivo
          </p>
        </div>
      </section>

      {/* ── SEZIONE 7: PER CHI ── */}
      <section style={{ background: T.ink, borderTop: `2px solid ${T.red}`, padding: '5rem 1.5rem' }}>
        <div className="max-w-4xl mx-auto">
          <SectionLabel color={T.red}>PER CHI</SectionLabel>
          <h2 style={{ color: T.paper, fontFamily: T.mono, fontWeight: 700, fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: '3rem', lineHeight: 1.3 }}>
            Per chiunque voglia sapere cosa può fare con un immobile — prima di comprarlo
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ border: `1px solid ${T.grey}` }}>
            {[
              { emoji: '🏠', label: 'Acquirenti privati', desc: 'Compri casa o terreno? Verifica prima cosa ci puoi fare. Zero sorprese dopo il rogito.' },
              { emoji: '🔨', label: 'Aste Giudiziarie', desc: "L'asta è lunedì. Hai il weekend per decidere. In 3 minuti sai se vale la pena offrire." },
              { emoji: '🏢', label: 'Agenti Immobiliari', desc: 'Porta al cliente una scheda completa lo stesso giorno. Chiudi la trattativa prima della concorrenza.' },
              { emoji: '📈', label: 'Investitori', desc: 'Con €800 analizzavi 1 immobile. Con urbicheck ne analizzi 90 per lo stesso budget. Scala la due diligence.' },
              { emoji: '🏗️', label: 'Developer / Costruttori', desc: 'Pre-screening su terreni da sviluppare. Scarta i no subito, approfondisci i sì.' },
              { emoji: '⚖️', label: 'Avvocati / Notai', desc: 'Verifica urbanistica ante rogito in autonomia. Accesso agli atti pre-compilato in un click.' },
            ].map((item, i) => (
              <div key={i} className="p-6" style={{
                borderRight: (i % 3 !== 2) ? `1px solid ${T.grey}` : 'none',
                borderBottom: i < 3 ? `1px solid ${T.grey}` : 'none',
                background: T.ink,
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{item.emoji}</div>
                <p style={{ fontFamily: T.mono, fontWeight: 700, fontSize: '0.7rem', color: T.paper, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>{item.label}</p>
                <p style={{ fontFamily: T.serif, color: T.grey, fontSize: '0.8rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEZIONE 8: FORM ── */}
      <section id="waitlist-form" style={{ background: T.paper, borderTop: `1px solid ${T.border}`, padding: '5rem 1.5rem' }}>
        <div className="max-w-xl mx-auto">
          <SectionLabel>LISTA D'ATTESA — LANCIO GIUGNO 2026</SectionLabel>
          <h2 style={{ color: T.ink, fontFamily: T.serif, fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', marginBottom: '0.75rem', lineHeight: 1.35 }}>
            Entra in lista. Accesso anticipato gratuito.
          </h2>
          <p style={{ fontFamily: T.serif, color: T.grey, fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '2.5rem' }}>
            I primi 100 iscritti ricevono 2 query gratuite al lancio e accesso beta prima dell'apertura pubblica.
          </p>

          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              style={{ border: `2px solid ${T.blue}`, background: '#fff', padding: '2rem' }}>
              <p style={{ fontFamily: T.mono, fontWeight: 700, color: T.blue, fontSize: '0.85rem', letterSpacing: '1px', marginBottom: '0.75rem' }}>✓ ISCRIZIONE CONFERMATA</p>
              <p style={{ fontFamily: T.serif, color: T.grey, fontSize: '0.9rem', lineHeight: 1.65 }}>
                Riceverai un'email di conferma. Ti contatteremo prima del lancio con le istruzioni per l'accesso anticipato.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <p style={{ fontFamily: T.mono, fontSize: '0.7rem', color: T.red, marginBottom: '1rem' }}>{error}</p>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="email"
                  placeholder="la tua email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '3rem',
                    padding: '0 1rem',
                    border: `1px solid ${T.border}`,
                    fontFamily: T.mono,
                    fontSize: '0.85rem',
                    color: T.ink,
                    background: '#fff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <select
                  value={ruolo}
                  onChange={e => setRuolo(e.target.value)}
                  style={{
                    width: '100%',
                    height: '3rem',
                    padding: '0 1rem',
                    border: `1px solid ${T.border}`,
                    fontFamily: T.mono,
                    fontSize: '0.8rem',
                    color: ruolo ? T.ink : T.grey,
                    background: '#fff',
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    appearance: 'none',
                  }}
                >
                  <option value="" disabled>Ruolo — seleziona</option>
                  <option value="acquirente_privato">Acquirente privato</option>
                  <option value="aste_giudiziarie">Aste giudiziarie</option>
                  <option value="agente_immobiliare">Agente immobiliare</option>
                  <option value="investitore">Investitore</option>
                  <option value="developer_costruttore">Developer / Costruttore</option>
                  <option value="avvocato_notaio">Avvocato / Notaio</option>
                  <option value="altro">Altro</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '3rem',
                  background: loading ? T.grey : T.red,
                  color: '#fff',
                  fontFamily: T.mono,
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  borderBottom: loading ? 'none' : '3px solid rgba(0,0,0,0.25)',
                  transition: 'opacity 0.2s',
                }}
              >
                {loading ? 'Invio...' : 'Iscriviti →'}
              </button>
            </form>
          )}

          {/* Benefit bullets */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${T.border}` }}>
            {['2 query gratuite al lancio', 'Accesso beta prima del pubblico', 'Sconto 20% Piano Pro per 6 mesi'].map((b, i) => (
              <p key={i} style={{ fontFamily: T.mono, fontSize: '0.7rem', color: T.grey, marginBottom: '0.4rem' }}>• {b}</p>
            ))}
            <p style={{ fontFamily: T.serif, fontSize: '0.75rem', color: T.border, marginTop: '1rem', fontStyle: 'italic' }}>
              Nessuno spam. Disdici in qualsiasi momento. I tuoi dati non vengono ceduti a terzi.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: T.ink, borderTop: `1px solid #333` }}>
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <Logo light />
            <p style={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.grey, marginTop: '0.75rem' }}>
              Fenice Management — P.IVA IT02655840060 — Carentino (AL)
            </p>
          </div>
          <div className="flex items-center gap-6">
            {['Privacy Policy', 'Termini di servizio'].map(l => (
              <a key={l} href="#" style={{ fontFamily: T.mono, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '2px', color: T.grey }}
                className="hover:opacity-70 transition-opacity">{l}</a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #222' }}>
          <div className="max-w-6xl mx-auto px-6 py-4">
            <p style={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.grey }}>
              © 2026 URBICHECK — Fenice Management di Dell'Aria Claudia Giuseppina. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}