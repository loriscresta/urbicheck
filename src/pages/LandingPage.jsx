import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, MapPin, AlertTriangle, Waves, Activity, FileText, TrendingUp, ClipboardList } from "lucide-react";

const N = "#0f172a";       // navy
const G = "#10b981";       // verde
const GA = "#059669";      // verde scuro
const W = "#ffffff";
const SL = "#94a3b8";      // slate light
const SD = "#1e293b";      // slate dark
const MONO = "'IBM Plex Mono', monospace";
const SERIF = "'Libre Baskerville', serif";

const Logo = ({ light = true }) => (
  <div className="flex items-center gap-2">
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <rect x="1" y="1" width="26" height="26" stroke={light ? W : N} strokeWidth="1.5" fill="none"/>
      <line x1="10" y1="1" x2="10" y2="27" stroke={light ? W : N} strokeWidth="0.75" strokeOpacity="0.4"/>
      <line x1="18" y1="1" x2="18" y2="27" stroke={light ? W : N} strokeWidth="0.75" strokeOpacity="0.4"/>
      <line x1="1" y1="10" x2="27" y2="10" stroke={light ? W : N} strokeWidth="0.75" strokeOpacity="0.4"/>
      <line x1="1" y1="18" x2="27" y2="18" stroke={light ? W : N} strokeWidth="0.75" strokeOpacity="0.4"/>
      <polyline points="20,21 23,24 27,19" stroke={G} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: "1.05rem", letterSpacing: "0.04em" }}>
      <span style={{ color: light ? W : N }}>URBI</span>
      <span style={{ color: G }}>CHECK</span>
    </span>
  </div>
);

const features = [
  { icon: MapPin,        label: "Zona urbanistica",         desc: "Destinazione d'uso, PRG/PUC, indici edilizi e edificabilità dal GeoServer regionale." },
  { icon: AlertTriangle, label: "Vincoli art.142 D.Lgs 42/2004", desc: "Laghi, fiumi, coste, boschi, parchi — fascia di tutela e riferimento normativo per ogni vincolo." },
  { icon: Waves,         label: "Rischio idrogeologico (PAI)", desc: "Frane e alluvioni dal Piano di Bacino ufficiale. ARPA Piemonte WFS + M450 Liguria." },
  { icon: Activity,      label: "Classificazione sismica",   desc: "Zona sismica ufficiale DGR regionale (Piemonte DGR 6-887/2019, Liguria OPCM 3274/2003)." },
  { icon: TrendingUp,    label: "Valutazione finanziaria OMI", desc: "Stima valore di mercato, scenari flip/affitto, ROI atteso su dati OMI Agenzia delle Entrate." },
  { icon: ClipboardList, label: "Pratiche e iter burocratico", desc: "Interventi fattibili, pratiche necessarie (CILA, SCIA, PdC), enti competenti e tempistiche." },
];

const steps = [
  { n: "01", title: "Inserisci i dati catastali", desc: "Comune, foglio, particella e finalità dell'analisi (acquisto, asta, investimento, ristrutturazione)." },
  { n: "02", title: "UrbiCheck analizza in tempo reale", desc: "Interroga WFS regionali, ARPA, Overpass, catasto — gli stessi dati che usa un tecnico professionista." },
  { n: "03", title: "Ricevi il report completo + PDF", desc: "Scheda strutturata con vincoli, rischi, valutazione finanziaria e PDF scaricabile in meno di 60 secondi." },
];

const packages = [
  { name: "Starter", price: "€9,90", credits: "9,90 crediti", desc: "1 report completo", highlight: false, features: ["Zona urbanistica", "Vincoli art.142", "Rischio PAI", "Sismica", "PDF scaricabile"] },
  { name: "Pro",     price: "€24,90", credits: "27,40 crediti", desc: "3 report + 10% bonus", highlight: true, badge: "Più popolare", features: ["Tutto Starter ×3", "+10% crediti bonus", "Valutazione finanziaria", "Accesso agli atti", "Priority support"] },
  { name: "Business", price: "€59,90", credits: "71,90 crediti", desc: "8 report + 20% bonus", highlight: false, features: ["Tutto Pro ×8", "+20% crediti bonus", "Export Excel", "API access (presto)", "Volume scontato"] },
];

const stats = [
  { value: "10+",    label: "Report elaborati" },
  { value: "2",      label: "Regioni coperte" },
  { value: "Art.142",label: "Vincoli inclusi" },
  { value: "< 60s",  label: "Tempo di risposta" },
];

export default function LandingPage() {
  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleLogin = () => base44.auth.redirectToLogin("/dashboard");

  return (
    <div style={{ background: N, fontFamily: MONO, minHeight: "100vh" }}>

      {/* ── NAVBAR ── */}
      <nav style={{ background: N, borderBottom: `1px solid ${SD}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8">
            <a href="#come-funziona" style={{ color: SL, fontSize: "0.7rem", letterSpacing: "2px", textTransform: "uppercase" }} className="hover:text-white transition-colors">Come funziona</a>
            <a href="#feature" style={{ color: SL, fontSize: "0.7rem", letterSpacing: "2px", textTransform: "uppercase" }} className="hover:text-white transition-colors">Report</a>
            <a href="#prezzi" style={{ color: SL, fontSize: "0.7rem", letterSpacing: "2px", textTransform: "uppercase" }} className="hover:text-white transition-colors">Prezzi</a>
            <Link to="/waitlist" style={{ color: SL, fontSize: "0.7rem", letterSpacing: "2px", textTransform: "uppercase" }} className="hover:text-white transition-colors">Beta</Link>
          </div>
          <button onClick={handleLogin} style={{ background: G, color: N, fontFamily: MONO, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "2px", textTransform: "uppercase", border: "none", padding: "0 1.25rem", height: "2.25rem", cursor: "pointer" }}>
            Accedi →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: `linear-gradient(135deg, ${N} 0%, #0d2137 100%)`, padding: "5rem 1.5rem 6rem", borderBottom: `1px solid ${SD}` }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>

            {/* Badge beta */}
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5" style={{ border: `1px solid ${G}40`, borderRadius: 4, background: `${G}15` }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: G, display: "inline-block", boxShadow: `0 0 8px ${G}` }} />
              <span style={{ color: G, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Beta · Piemonte e Liguria disponibili</span>
            </div>

            <h1 style={{ color: W, fontFamily: MONO, fontWeight: 700, fontSize: "clamp(2rem, 5.5vw, 3.75rem)", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>
              La due diligence<br />
              immobiliare<br />
              <span style={{ color: G }}>in 60 secondi.</span>
            </h1>

            <p style={{ color: SL, fontFamily: SERIF, fontSize: "1.05rem", lineHeight: 1.75, maxWidth: 600, marginBottom: "2.5rem" }}>
              Inserisci foglio e particella — ottieni vincoli urbanistici, sismici, idrogeologici, paesaggistici e valutazione finanziaria istantanea. Senza aspettare il tecnico.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <button onClick={handleLogin}
                style={{ background: G, color: N, fontFamily: MONO, fontWeight: 700, fontSize: "0.8rem", letterSpacing: "1.5px", textTransform: "uppercase", border: "none", padding: "0 2rem", height: "3.25rem", cursor: "pointer", boxShadow: `0 4px 20px ${G}40` }}>
                Inizia ora — €9,90 a report →
              </button>
              <button onClick={() => setShowDemoModal(true)}
                style={{ background: "transparent", color: SL, fontFamily: MONO, fontSize: "0.78rem", letterSpacing: "1px", border: `1px solid ${SD}`, padding: "0 1.5rem", height: "3.25rem", cursor: "pointer" }}
                className="hover:border-slate-500 transition-colors">
                Vedi un esempio di report ↗
              </button>
            </div>

          </motion.div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section style={{ background: SD, borderBottom: `1px solid #2d3748` }}>
        <div className="max-w-4xl mx-auto px-5">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {stats.map((s, i) => (
              <div key={i} className="py-5 px-4 text-center" style={{ borderRight: i < 3 ? `1px solid #2d3748` : "none" }}>
                <div style={{ fontFamily: MONO, fontWeight: 700, color: G, fontSize: "1.35rem", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: MONO, fontSize: "0.6rem", color: SL, textTransform: "uppercase", letterSpacing: "2px", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COME FUNZIONA ── */}
      <section id="come-funziona" style={{ background: N, padding: "5rem 1.5rem", borderBottom: `1px solid ${SD}` }}>
        <div className="max-w-4xl mx-auto">
          <p style={{ color: G, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "1rem" }}>Come funziona</p>
          <h2 style={{ color: W, fontFamily: MONO, fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", marginBottom: "3rem", lineHeight: 1.2 }}>
            3 passi. Dati ufficiali. Output immediato.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0" style={{ border: `1px solid ${SD}` }}>
            {steps.map((s, i) => (
              <div key={i} className="p-7" style={{ borderRight: i < 2 ? `1px solid ${SD}` : "none", borderBottom: 0 }}>
                <div style={{ fontFamily: MONO, fontWeight: 700, color: G, fontSize: "2rem", lineHeight: 1, marginBottom: "1rem" }}>{s.n}</div>
                <p style={{ fontFamily: MONO, fontWeight: 700, color: W, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.6rem" }}>{s.title}</p>
                <p style={{ fontFamily: SERIF, color: SL, fontSize: "0.85rem", lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COSA INCLUDE IL REPORT ── */}
      <section id="feature" style={{ background: SD, padding: "5rem 1.5rem", borderBottom: `1px solid #2d3748` }}>
        <div className="max-w-4xl mx-auto">
          <p style={{ color: G, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "1rem" }}>Il report include</p>
          <h2 style={{ color: W, fontFamily: MONO, fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", marginBottom: "3rem", lineHeight: 1.2 }}>
            Tutto ciò che serve per decidere in autonomia.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: "#2d3748" }}>
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="p-6" style={{ background: SD }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div style={{ width: 34, height: 34, background: `${G}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon style={{ width: 16, height: 16, color: G }} />
                    </div>
                    <p style={{ fontFamily: MONO, fontWeight: 700, color: W, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>{f.label}</p>
                  </div>
                  <p style={{ fontFamily: SERIF, color: SL, fontSize: "0.82rem", lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="prezzi" style={{ background: N, padding: "5rem 1.5rem", borderBottom: `1px solid ${SD}` }}>
        <div className="max-w-4xl mx-auto">
          <p style={{ color: G, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "1rem" }}>Prezzi</p>
          <h2 style={{ color: W, fontFamily: MONO, fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", marginBottom: "3rem", lineHeight: 1.2 }}>
            Pay-per-report. Nessun abbonamento.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map((p, i) => (
              <div key={i} className="relative p-6 flex flex-col" style={{
                border: p.highlight ? `2px solid ${G}` : `1px solid ${SD}`,
                background: p.highlight ? `${G}10` : SD,
                boxShadow: p.highlight ? `0 0 30px ${G}25` : "none",
              }}>
                {p.badge && (
                  <div style={{ position: "absolute", top: -1, right: 16, background: G, color: N, fontFamily: MONO, fontWeight: 700, fontSize: "0.6rem", letterSpacing: "1px", textTransform: "uppercase", padding: "3px 10px" }}>
                    {p.badge}
                  </div>
                )}
                <p style={{ fontFamily: MONO, fontWeight: 700, color: SL, fontSize: "0.65rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.75rem" }}>{p.name}</p>
                <p style={{ fontFamily: MONO, fontWeight: 700, color: p.highlight ? G : W, fontSize: "2.2rem", lineHeight: 1, marginBottom: "0.25rem" }}>{p.price}</p>
                <p style={{ fontFamily: SERIF, color: SL, fontSize: "0.78rem", marginBottom: "1.5rem" }}>{p.desc} — {p.credits}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <CheckCircle2 style={{ width: 13, height: 13, color: G, flexShrink: 0 }} />
                      <span style={{ fontFamily: MONO, fontSize: "0.7rem", color: SL }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={handleLogin} style={{
                  background: p.highlight ? G : "transparent",
                  color: p.highlight ? N : G,
                  border: `1px solid ${G}`,
                  fontFamily: MONO, fontWeight: 700, fontSize: "0.72rem", letterSpacing: "1.5px", textTransform: "uppercase",
                  padding: "0.75rem", cursor: "pointer", width: "100%",
                }}>
                  {p.highlight ? "Inizia ora →" : "Scegli →"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINALE ── */}
      <section style={{ background: `linear-gradient(135deg, #0d2137 0%, ${N} 100%)`, padding: "5rem 1.5rem", borderTop: `1px solid ${SD}` }}>
        <div className="max-w-2xl mx-auto text-center">
          <p style={{ color: G, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "1.25rem" }}>Sei tra i primi</p>
          <h2 style={{ color: W, fontFamily: MONO, fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", lineHeight: 1.2, marginBottom: "1.25rem" }}>
            Entra nella beta.<br />2 query gratuite per i primi 100.
          </h2>
          <p style={{ color: SL, fontFamily: SERIF, fontSize: "1rem", lineHeight: 1.7, marginBottom: "2.5rem" }}>
            UrbiCheck è in accesso anticipato. Piemonte e Liguria disponibili da subito. Nuove regioni in arrivo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={handleLogin}
              style={{ background: G, color: N, fontFamily: MONO, fontWeight: 700, fontSize: "0.8rem", letterSpacing: "1.5px", textTransform: "uppercase", border: "none", padding: "0 2rem", height: "3.25rem", cursor: "pointer", boxShadow: `0 4px 20px ${G}40` }}>
              Inizia ora — €9,90 →
            </button>
            <Link to="/waitlist"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: SL, fontFamily: MONO, fontSize: "0.78rem", letterSpacing: "1px", border: `1px solid ${SD}`, padding: "0 1.5rem", height: "3.25rem", textDecoration: "none" }}
              className="hover:border-slate-500 transition-colors">
              Lista d'attesa beta →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#080f1a", borderTop: `1px solid ${SD}` }}>
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <Logo />
            <p style={{ fontFamily: MONO, fontSize: "0.6rem", color: "#475569", marginTop: "0.75rem" }}>
              Fenice Management — P.IVA IT02655840060
            </p>
            <p style={{ fontFamily: MONO, fontSize: "0.6rem", color: "#475569", marginTop: "0.25rem" }}>
              loris.cresta@gmail.com
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            {["Privacy Policy", "Termini di Servizio"].map(l => (
              <a key={l} href="#" style={{ fontFamily: MONO, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "2px", color: "#475569" }} className="hover:text-slate-300 transition-colors">{l}</a>
            ))}
            <Link to="/waitlist" style={{ fontFamily: MONO, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "2px", color: G }} className="hover:opacity-80 transition-opacity">Lista d'attesa Beta →</Link>
          </div>
        </div>
        <div style={{ borderTop: `1px solid #0f172a` }}>
          <div className="max-w-6xl mx-auto px-5 py-4">
            <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: "#475569" }}>
              UrbiCheck © 2026 — Beta · Analisi orientativa, non sostituisce consulenza professionale. Dati da fonti WFS ufficiali regionali.
            </p>
          </div>
        </div>
      </footer>

      {/* ── DEMO MODAL ── */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={() => setShowDemoModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg w-full p-6" style={{ background: SD, border: `1px solid ${G}40` }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p style={{ fontFamily: MONO, fontWeight: 700, color: W, fontSize: "0.8rem", letterSpacing: "1px" }}>ESEMPIO REPORT — UB-DEMO-2026</p>
              <button onClick={() => setShowDemoModal(false)} style={{ color: SL, background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
            </div>
            {[
              ["Comune", "Alessandria (AL)"],
              ["Foglio / Particella", "15 / 234"],
              ["Categoria catastale", "A/2 — Abitazione civile"],
              ["Zona urbanistica", "B — Residenziale consolidata"],
              ["Edificabilità", "Ammessa con SCIA"],
              ["Vincolo Sismico", "Zona 3 — Media sismicità"],
              ["PAI Frane", "✅ Nessuna frana censita ARPA Piemonte"],
              ["Vincolo Lacustre", "✅ Nessun lago entro 300m"],
              ["Valore OMI stimato", "€ 1.200–1.600/mq"],
            ].map(([l, v], i) => (
              <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid #2d3748` }}>
                <span style={{ fontFamily: MONO, fontSize: "0.65rem", color: SL, textTransform: "uppercase", letterSpacing: "1px" }}>{l}</span>
                <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: W, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div className="mt-4 p-3" style={{ background: `${G}15`, border: `1px solid ${G}40` }}>
              <p style={{ fontFamily: MONO, fontWeight: 700, color: G, fontSize: "0.72rem" }}>✓ Operazione fattibile — Score 7/10</p>
            </div>
            <button onClick={handleLogin} style={{ width: "100%", marginTop: "1rem", background: G, color: N, fontFamily: MONO, fontWeight: 700, fontSize: "0.75rem", letterSpacing: "1.5px", textTransform: "uppercase", border: "none", padding: "0.85rem", cursor: "pointer" }}>
              Ottieni il tuo report — €9,90 →
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}