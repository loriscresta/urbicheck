import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { CheckCircle2, MapPin, AlertTriangle, Waves, Activity, FileText, TrendingUp, ClipboardList, Search, X } from "lucide-react";

const P  = "#1A3A6B";   // primario blu istituzionale
const AC = "#B33A2A";   // accento rosso timbro
const BG = "#F4EFE6";   // sfondo carta
const TX = "#1C1A17";   // testo inchiostro
const GR = "#7A7268";   // grigio secondario
const BD = "#C4BAA8";   // bordo
const W  = "#FFFFFF";
const MONO  = "'IBM Plex Mono', 'Courier New', monospace";
const SERIF = "'Libre Baskerville', Georgia, serif";

const LogoIcon = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" fill={P} />
    <line x1="13" y1="2" x2="13" y2="32" stroke="white" strokeWidth="0.8" strokeOpacity="0.15" />
    <line x1="27" y1="2" x2="27" y2="32" stroke="white" strokeWidth="0.8" strokeOpacity="0.15" />
    <line x1="2"  y1="13" x2="38" y2="13" stroke="white" strokeWidth="0.8" strokeOpacity="0.15" />
    <line x1="2"  y1="24" x2="38" y2="24" stroke="white" strokeWidth="0.8" strokeOpacity="0.15" />
    <polyline points="11,19 17,26 29,12" stroke={AC} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <rect x="0" y="36" width="40" height="4" fill={AC} />
  </svg>
);

const Logo = ({ dark = false }) => (
  <div className="flex items-center gap-2.5">
    <LogoIcon size={32} />
    <div style={{ fontFamily: MONO }}>
      <div className="flex items-baseline leading-none">
        <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "3px", color: dark ? P : W }}>URBI</span>
        <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "3px", color: AC }}>CHECK</span>
      </div>
      <div style={{ fontSize: "0.52rem", letterSpacing: "3px", textTransform: "uppercase", marginTop: 2, color: dark ? GR : "rgba(244,239,230,0.5)" }}>
        ANALISI URBANISTICA AUTOMATIZZATA
      </div>
    </div>
  </div>
);

const features = [
  { icon: MapPin,        label: "Zona urbanistica",              desc: "Destinazione d'uso, PRG/PUC, indici edilizi e edificabilità dal GeoServer regionale." },
  { icon: AlertTriangle, label: "Vincoli art.142 D.Lgs 42/2004", desc: "Laghi, fiumi, coste, boschi, parchi — fascia di tutela e riferimento normativo per ogni vincolo." },
  { icon: Waves,         label: "Rischio idrogeologico (PAI)",   desc: "Frane e alluvioni dal Piano di Bacino ufficiale. ARPA Piemonte WFS + M450 Liguria." },
  { icon: Activity,      label: "Classificazione sismica",       desc: "Zona sismica ufficiale DGR regionale (Piemonte DGR 6-887/2019, Liguria OPCM 3274/2003)." },
  { icon: TrendingUp,    label: "Valutazione finanziaria OMI",   desc: "Stima valore di mercato, scenari flip/affitto, ROI atteso su dati OMI Agenzia delle Entrate." },
  { icon: ClipboardList, label: "Pratiche e iter burocratico",   desc: "Interventi fattibili, pratiche necessarie (CILA, SCIA, PdC), enti competenti e tempistiche." },
];

const steps = [
  { n: "01", title: "Inserisci i dati catastali",        desc: "Comune, foglio, particella e finalità dell'analisi (acquisto, asta, investimento, ristrutturazione)." },
  { n: "02", title: "UrbiCheck analizza in tempo reale", desc: "Interroga WFS regionali, ARPA, Overpass, catasto — gli stessi dati che usa un tecnico professionista." },
  { n: "03", title: "Ricevi il report completo",         desc: "Scheda strutturata con vincoli, rischi, valutazione finanziaria in meno di 60 secondi." },
];

const betaFeatures = [
  "Zona urbanistica", "Vincoli art.142 D.Lgs 42/2004", "Rischio PAI", "Sismica", "Valutazione finanziaria OMI", "Pratiche e iter burocratico", 'Richiedi "Accesso agli Atti"', "Analisi completa"
];

const futurePlans = [
  { name: "Starter", price: "€9,90", desc: "1 report completo" },
  { name: "Pro", price: "€24,90", desc: "3 report + 10% bonus" },
  { name: "Business", price: "€59,90", desc: "8 report + 20% bonus" },
];

const stats = [
  { value: "✓",       label: "Dati catastali ufficiali" },
  { value: "3",       label: "Regioni coperte" },
  { value: "Art.142", label: "Vincoli inclusi" },
  { value: "< 60s",   label: "Tempo di risposta" },
];

// ── Hero Search Form (semplificato, mobile-first) ──────────────────────
function HeroSearchForm({ onStart }) {
  const [comune, setComune] = useState("");
  const [foglio, setFoglio] = useState("");
  const [particella, setParticella] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Priorità assoluta: indirizzo presente → naviga sempre a /search?address=
    // (mai fallback onStart/popup, così Invio porta sempre alla ricerca)
    if (indirizzo.trim()) {
      navigate(`/search?address=${encodeURIComponent(indirizzo.trim())}`);
      return;
    }
    const q = new URLSearchParams();
    if (comune.trim()) q.set("comune", comune.trim());
    if (foglio.trim()) q.set("foglio", foglio.trim());
    if (particella.trim()) q.set("particella", particella.trim());
    if (q.toString()) {
      navigate(`/search?${q.toString()}`);
    } else {
      onStart();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mt-4" style={{ fontFamily: MONO }}>
      <div className="flex items-center gap-2 mb-2">
        <div style={{ flex: 1, height: 1, background: "rgba(244,239,230,0.12)" }} />
        <span style={{ color: "rgba(244,239,230,0.4)", fontSize: "0.58rem", letterSpacing: "2px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          oppure cerca subito
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(244,239,230,0.12)" }} />
      </div>

      {/* Indirizzo (prioritario) */}
      <input
        type="text"
        value={indirizzo}
        onChange={e => setIndirizzo(e.target.value)}
        placeholder="Es: Via Roma 12, Milano"
        style={{
          width: "100%", padding: "0.7rem 0.9rem", fontSize: "0.78rem",
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(244,239,230,0.2)",
          color: W, fontFamily: MONO, borderRadius: 0, outline: "none",
        }}
        className="focus:border-white/40 placeholder:text-white/25"
      />
      <div className="flex items-center gap-1 my-2">
        <div style={{ flex: 1, height: 1, background: "rgba(244,239,230,0.08)" }} />
        <span style={{ color: "rgba(244,239,230,0.3)", fontSize: "0.52rem" }}>oppure per dati catastali</span>
        <div style={{ flex: 1, height: 1, background: "rgba(244,239,230,0.08)" }} />
      </div>
      <div className="flex gap-2">
        <input type="text" value={comune} onChange={e => setComune(e.target.value)}
          placeholder="Comune" style={{
            flex: "2 1 0", padding: "0.7rem 0.7rem", fontSize: "0.72rem",
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(244,239,230,0.2)",
            color: W, fontFamily: MONO, borderRadius: 0, outline: "none",
          }} className="focus:border-white/40 placeholder:text-white/25" />
        <input type="text" value={foglio} onChange={e => setFoglio(e.target.value)}
          placeholder="Foglio" style={{
            flex: "1 1 0", padding: "0.7rem 0.5rem", fontSize: "0.72rem",
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(244,239,230,0.2)",
            color: W, fontFamily: MONO, borderRadius: 0, outline: "none",
          }} className="focus:border-white/40 placeholder:text-white/25" />
        <input type="text" value={particella} onChange={e => setParticella(e.target.value)}
          placeholder="Particella" style={{
            flex: "1 1 0", padding: "0.7rem 0.5rem", fontSize: "0.72rem",
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(244,239,230,0.2)",
            color: W, fontFamily: MONO, borderRadius: 0, outline: "none",
          }} className="focus:border-white/40 placeholder:text-white/25" />
      </div>
      <button type="submit"
        style={{
          width: "100%", marginTop: "0.5rem", background: "rgba(255,255,255,0.1)",
          color: "rgba(244,239,230,0.8)", border: "1px solid rgba(244,239,230,0.2)",
          fontFamily: MONO, fontWeight: 600, fontSize: "0.72rem", letterSpacing: "1px",
          padding: "0.55rem", cursor: "pointer", borderRadius: 0,
        }} className="hover:bg-white/15 transition-colors">
        Cerca →
      </button>
    </form>
  );
}

// ── Animated counter component ─────────────────────────────────────────
function AnimatedCounter({ target, label }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1400;
    const increment = Math.max(1, Math.floor(target / 40));
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, duration / (target / increment));
    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <div ref={ref} className="text-center">
      <div style={{ fontFamily: MONO, fontWeight: 700, color: AC, fontSize: "1.8rem", lineHeight: 1 }}>
        {count.toLocaleString("it-IT")}
      </div>
      <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: GR, textTransform: "uppercase", letterSpacing: "2px", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [exitEmail, setExitEmail] = useState("");
  const [exitDone, setExitDone] = useState(false);
  const exitTimerRef = useRef(null);
  const hasFiredExitRef = useRef(false);
  const navigate = useNavigate();
  const handleLogin = () => base44.auth.redirectToLogin("/dashboard");
  const handleStartSearch = () => navigate("/search");

  // Exit intent popup — 30s inactivity trigger
  useEffect(() => {
    if (hasFiredExitRef.current) return;
    const resetTimer = () => {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => {
        if (!hasFiredExitRef.current) {
          hasFiredExitRef.current = true;
          setShowExitPopup(true);
        }
      }, 30000);
    };
    resetTimer();
    const events = ["mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach(e => window.addEventListener(e, resetTimer));
    return () => {
      clearTimeout(exitTimerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, []);

  const handleExitSubscribe = async (e) => {
    e.preventDefault();
    if (!exitEmail || exitDone) return;
    setExitDone(true);
    try {
      await base44.entities.WaitlistSubscriber.create({ email: exitEmail });
    } catch (_) {}
    setShowExitPopup(false);
  };

  return (
    <div style={{ background: BG, fontFamily: MONO, minHeight: "100vh" }}>

      {/* ── NAVBAR ── */}
      <nav style={{ background: P, borderBottom: `3px solid ${AC}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8">
            {["#come-funziona:Come funziona", "#feature:Report", "#prezzi:Prezzi"].map(s => {
              const [href, label] = s.split(":");
              return <a key={href} href={href} style={{ color: "rgba(244,239,230,0.65)", fontSize: "0.65rem", letterSpacing: "2px", textTransform: "uppercase" }} className="hover:text-white transition-colors">{label}</a>;
            })}
            <Link to="/waitlist" style={{ color: "rgba(244,239,230,0.65)", fontSize: "0.65rem", letterSpacing: "2px", textTransform: "uppercase" }} className="hover:text-white transition-colors">Beta</Link>
          </div>
          <button onClick={handleLogin} style={{ background: AC, color: W, fontFamily: MONO, fontWeight: 700, fontSize: "0.65rem", letterSpacing: "2px", textTransform: "uppercase", border: "none", padding: "0 1.25rem", height: "2.25rem", cursor: "pointer" }}>
            Accedi →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: P, padding: "2.5rem 1.5rem 3rem", borderBottom: `4px solid ${AC}` }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="inline-flex flex-col gap-1 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5" style={{ border: `1px solid ${AC}50`, background: `${AC}18` }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: AC, display: "inline-block" }} />
                <span style={{ color: "rgba(244,239,230,0.9)", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>BETA — Piemonte, Liguria e Lombardia disponibili</span>
              </div>
              <a href="/waitlist" style={{ color: AC, fontSize: "0.6rem", fontWeight: 600, letterSpacing: "1px", textDecoration: "none", paddingLeft: "1rem" }} className="hover:underline">
                Iscriviti alla waiting list per altre regioni →
              </a>
            </div>

            <h1 style={{ color: W, fontFamily: MONO, fontWeight: 700, fontSize: "clamp(2rem, 5.5vw, 3.75rem)", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>
              La due diligence<br />
              immobiliare<br />
              <span style={{ color: AC }}>in 60 secondi.</span>
            </h1>

            <p style={{ color: "rgba(244,239,230,0.75)", fontFamily: SERIF, fontSize: "1.05rem", lineHeight: 1.75, maxWidth: 600, marginBottom: "2.5rem" }}>
              Inserisci foglio e particella — ottieni vincoli urbanistici, sismici, idrogeologici, paesaggistici e valutazione finanziaria istantanea. Senza aspettare il tecnico.
            </p>

            <div className="flex flex-col gap-3 items-start max-w-md">
              <button onClick={handleStartSearch}
                style={{ background: AC, color: W, fontFamily: MONO, fontWeight: 700, fontSize: "1rem", letterSpacing: "1px", textTransform: "uppercase", border: "none", padding: "0.9rem 2.5rem", cursor: "pointer", boxShadow: `0 4px 24px ${AC}60`, width: "100%", textAlign: "center", borderRadius: "0" }}>
                Analizza subito — €9,90
              </button>
              <p style={{ color: "rgba(244,239,230,0.55)", fontSize: "0.68rem", fontFamily: MONO, textAlign: "center", width: "100%" }}>
                Nessun abbonamento · Risultato in 3 minuti
              </p>
            </div>

            {/* Search form semplificato in hero */}
            <HeroSearchForm onStart={handleStartSearch} />

            <button onClick={() => setShowDemoModal(true)}
              style={{ background: "transparent", color: "rgba(244,239,230,0.7)", fontFamily: MONO, fontSize: "0.72rem", letterSpacing: "1px", border: `1px solid rgba(244,239,230,0.25)`, padding: "0.6rem 1.25rem", cursor: "pointer", marginTop: "0.75rem" }}
              className="hover:border-white/50 transition-colors">
              Vedi un esempio di report ↗
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── SOCIAL PROOF SECTION ── */}
      <section style={{ background: W, padding: "2.5rem 1.5rem", borderBottom: `1px solid ${BD}` }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Anonymized report mock */}
            <div style={{ background: BG, border: `1px solid ${BD}`, padding: "1.5rem" }}>
              <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: `2px solid ${P}` }}>
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: "0.8rem", color: P, letterSpacing: "2px" }}>URBI</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: "0.8rem", color: AC, letterSpacing: "2px" }}>CHECK</span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: "0.5rem", color: GR, letterSpacing: "1px", textTransform: "uppercase", marginLeft: "auto" }}>
                  #UB-2026-0A3F
                </span>
              </div>
              <div className="space-y-2">
                {[["Comune", "Torino (TO)"], ["Foglio / Map.", "15 / 342"], ["Zona", "B — Residenziale consolidata"], ["Sismica", "Zona 3 — Media sismicità"], ["PAI", "✅ Nessuna frana censita"]].map(([l, v], i) => (
                  <div key={i} className="flex justify-between text-xs" style={{ borderBottom: i < 4 ? `1px dotted ${BD}` : "none", paddingBottom: "0.35rem" }}>
                    <span style={{ fontFamily: MONO, color: GR, fontSize: "0.58rem" }}>{l}</span>
                    <span style={{ fontFamily: MONO, color: TX, fontWeight: 600, fontSize: "0.62rem" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2" style={{ background: `${P}08`, border: `1px solid ${P}20` }}>
                <p style={{ fontFamily: MONO, fontWeight: 700, color: P, fontSize: "0.62rem", textAlign: "center" }}>
                  ✓ Operazione fattibile — Score 7/10
                </p>
              </div>
            </div>

            {/* Testimonial + counter */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i} style={{ color: AC, fontSize: "0.9rem" }}>★</span>
                ))}
              </div>
              <p style={{ fontFamily: SERIF, fontSize: "1rem", color: TX, lineHeight: 1.6, fontStyle: "italic" }}>
                "Non avevo idea che la particella fosse in zona sismica 2 e con un vincolo paesaggistico. UrbiCheck mi ha salvato da un acquisto sbagliato."
              </p>
              <p style={{ fontFamily: MONO, fontSize: "0.6rem", color: GR, letterSpacing: "1px", marginTop: "0.75rem" }}>
                — Marco R., acquirente privato, Milano
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section style={{ background: TX, borderBottom: `1px solid #2d2b28` }}>
        <div className="max-w-4xl mx-auto px-5">
          <div className="grid grid-cols-2 md:grid-cols-4">
            <div className="py-5 px-4" style={{ borderRight: `1px solid #2d2b28` }}>
              <AnimatedCounter target={247} label="immobili analizzati" />
            </div>
            {stats.filter((_, i) => i > 0).map((s, i) => (
              <div key={i} className="py-5 px-4 text-center" style={{ borderRight: i < 2 ? `1px solid #2d2b28` : "none" }}>
                <div style={{ fontFamily: MONO, fontWeight: 700, color: AC, fontSize: "1.35rem", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: GR, textTransform: "uppercase", letterSpacing: "2px", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COME FUNZIONA ── */}
      <section id="come-funziona" style={{ background: BG, padding: "5rem 1.5rem", borderBottom: `1px solid ${BD}` }}>
        <div className="max-w-4xl mx-auto">
          <p style={{ color: AC, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "1rem" }}>Come funziona</p>
          <h2 style={{ color: P, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", marginBottom: "3rem", lineHeight: 1.25 }}>
            3 passi. Dati ufficiali. Output immediato.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0" style={{ border: `1px solid ${BD}` }}>
            {steps.map((s, i) => (
              <div key={i} className="p-7 bg-white" style={{ borderRight: i < 2 ? `1px solid ${BD}` : "none" }}>
                <div style={{ fontFamily: MONO, fontWeight: 700, color: AC, fontSize: "2rem", lineHeight: 1, marginBottom: "1rem" }}>{s.n}</div>
                <p style={{ fontFamily: MONO, fontWeight: 700, color: P, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.6rem" }}>{s.title}</p>
                <p style={{ fontFamily: SERIF, color: GR, fontSize: "0.85rem", lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COSA INCLUDE IL REPORT ── */}
      <section id="feature" style={{ background: W, padding: "5rem 1.5rem", borderBottom: `1px solid ${BD}` }}>
        <div className="max-w-4xl mx-auto">
          <p style={{ color: AC, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "1rem" }}>Il report include</p>
          <h2 style={{ color: P, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", marginBottom: "3rem", lineHeight: 1.25 }}>
            Tutto ciò che serve per decidere in autonomia.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: BD }}>
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="p-6 bg-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div style={{ width: 34, height: 34, background: `${P}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon style={{ width: 16, height: 16, color: P }} />
                    </div>
                    <p style={{ fontFamily: MONO, fontWeight: 700, color: P, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>{f.label}</p>
                  </div>
                  <p style={{ fontFamily: SERIF, color: GR, fontSize: "0.82rem", lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BETA SECTION ── */}
      <section style={{ background: W, padding: "4rem 1.5rem", borderBottom: `1px solid ${BD}` }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5" style={{ background: `${AC}15`, border: `1px solid ${AC}40` }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: AC, display: "inline-block" }} />
                <span style={{ color: AC, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Fase Beta Attiva</span>
              </div>
              <h2 style={{ color: P, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", lineHeight: 1.2, marginBottom: "0.75rem" }}>
                Effettua le tue prime 3 analisi gratis
              </h2>
              <p style={{ color: GR, fontFamily: SERIF, fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Fase beta attiva su Piemonte, Liguria e Lombardia
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  "Prime 3 analisi completamente gratuite",
                  "Tutte le funzionalità incluse: vincoli, PAI, sismica, valutazione finanziaria",
                  "Prezzi speciali beta: €2,99/report dopo le prime 3 (vs €9,90 al lancio)",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span style={{ color: AC, fontWeight: 700, marginTop: 2 }}>✓</span>
                    <span style={{ fontFamily: MONO, fontSize: "0.8rem", color: TX }}>{item}</span>
                  </li>
                ))}
              </ul>
              <button onClick={handleStartSearch}
                style={{ background: AC, color: W, fontFamily: MONO, fontWeight: 700, fontSize: "0.78rem", letterSpacing: "1.5px", textTransform: "uppercase", border: "none", padding: "0 2rem", height: "3rem", cursor: "pointer" }}>
                Cerca senza registrarti →
              </button>
            </div>
            <div style={{ border: `1px solid ${BD}`, background: BG, padding: "1.75rem" }}>
              <div className="flex items-center gap-2 mb-3 pb-3" style={{ borderBottom: `1px solid ${BD}` }}>
                <span style={{ fontSize: "1.1rem" }}>📍</span>
                <p style={{ fontFamily: MONO, fontWeight: 700, fontSize: "0.72rem", color: P }}>Copertura geografica beta</p>
              </div>
              <p style={{ fontFamily: SERIF, fontSize: "0.85rem", color: TX, lineHeight: 1.7 }}>
                La fase beta copre <strong>Piemonte, Liguria e Lombardia</strong>. Sei di un'altra regione?
              </p>
              <p style={{ fontFamily: SERIF, fontSize: "0.82rem", color: GR, lineHeight: 1.65, marginTop: "0.5rem" }}>
                Iscriviti alla lista d'attesa — partiamo dalla regione con più richieste.
              </p>
              <a href="/waitlist"
                style={{ display: "inline-block", marginTop: "1rem", background: "transparent", color: P, fontFamily: MONO, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "1px", textTransform: "uppercase", border: `1px solid ${P}`, padding: "0.6rem 1.25rem", textDecoration: "none", cursor: "pointer" }}>
                Lista d'attesa →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="prezzi" style={{ background: BG, padding: "5rem 1.5rem", borderBottom: `1px solid ${BD}` }}>
        <div className="max-w-4xl mx-auto">
          <p style={{ color: AC, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "1rem" }}>Prezzi</p>
          <h2 style={{ color: P, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", marginBottom: "3rem", lineHeight: 1.25 }}>
            Pay-per-report. Nessun abbonamento.
          </h2>

          {/* ── BETA CARD (central) ── */}
          <div className="max-w-lg mx-auto mb-10">
            <div className="relative p-8 bg-white flex flex-col" style={{ border: `2px solid ${AC}`, boxShadow: `0 0 32px ${AC}25` }}>
              <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: AC, color: W, fontFamily: MONO, fontWeight: 700, fontSize: "0.58rem", letterSpacing: "2px", textTransform: "uppercase", padding: "4px 16px", whiteSpace: "nowrap" }}>
                BETA ATTIVA
              </div>
              <p style={{ fontFamily: MONO, fontWeight: 700, color: GR, fontSize: "0.62rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.75rem", textAlign: "center" }}>Prezzo speciale beta</p>
              <div className="text-center mb-1">
                <span style={{ fontFamily: MONO, fontWeight: 700, color: AC, fontSize: "3.5rem", lineHeight: 1 }}>€0</span>
              </div>
              <p style={{ fontFamily: SERIF, color: GR, fontSize: "0.82rem", textAlign: "center", marginBottom: "0.25rem" }}>per le prime 3 analisi</p>
              <p style={{ fontFamily: MONO, color: P, fontSize: "0.78rem", textAlign: "center", fontWeight: 700, marginBottom: "1.75rem" }}>poi €2,99/report</p>
              <ul className="space-y-2 mb-6">
                {betaFeatures.map((f, j) => (
                  <li key={j} className="flex items-center gap-2">
                    <CheckCircle2 style={{ width: 13, height: 13, color: AC, flexShrink: 0 }} />
                    <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: TX }}>{f}</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: GR, textAlign: "center", marginBottom: "1.25rem" }}>Valido 30 giorni dal lancio · Solo Piemonte, Liguria, Lombardia</p>
              <button onClick={handleStartSearch} style={{
                background: AC, color: W, border: "none",
                fontFamily: MONO, fontWeight: 700, fontSize: "0.78rem", letterSpacing: "1.5px", textTransform: "uppercase",
                padding: "0.85rem", cursor: "pointer", width: "100%",
              }}>
                Cerca la tua particella — gratis →
              </button>
            </div>
          </div>

          {/* ── FUTURE PLANS (greyed out) ── */}
          <div>
            <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: GR, letterSpacing: "2px", textTransform: "uppercase", textAlign: "center", marginBottom: "1.25rem", opacity: 0.7 }}>Prezzi al lancio ufficiale</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 opacity-50 relative">
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <span style={{ background: P, color: W, fontFamily: MONO, fontWeight: 700, fontSize: "0.65rem", letterSpacing: "2px", textTransform: "uppercase", padding: "6px 18px", border: `2px solid ${AC}` }}>Coming soon</span>
              </div>
              {futurePlans.map((p, i) => (
                <div key={i} className="p-5 bg-white" style={{ border: `1px solid ${BD}` }}>
                  <p style={{ fontFamily: MONO, fontWeight: 700, color: GR, fontSize: "0.62rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.5rem" }}>{p.name}</p>
                  <p style={{ fontFamily: MONO, fontWeight: 700, color: P, fontSize: "1.8rem", lineHeight: 1, marginBottom: "0.25rem" }}>{p.price}</p>
                  <p style={{ fontFamily: SERIF, color: GR, fontSize: "0.75rem" }}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINALE ── */}
      <section style={{ background: P, padding: "5rem 1.5rem", borderTop: `4px solid ${AC}` }}>
        <div className="max-w-2xl mx-auto text-center">
          <p style={{ color: AC, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "1.25rem" }}>Sei tra i primi</p>
          <h2 style={{ color: W, fontFamily: MONO, fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", lineHeight: 1.2, marginBottom: "1.25rem" }}>
            Entra nella beta.<br />Prime 3 analisi gratis.
          </h2>
          <p style={{ color: "rgba(244,239,230,0.7)", fontFamily: SERIF, fontSize: "1rem", lineHeight: 1.7, marginBottom: "1rem" }}>
            UrbiCheck è in accesso anticipato. Piemonte, Liguria e Lombardia disponibili da subito. Nuove regioni in arrivo.
          </p>
          <p style={{ color: AC, fontFamily: MONO, fontSize: "0.68rem", letterSpacing: "1px", marginBottom: "2rem" }}>
            3 gratis → €2,99/report → fino a 6 report totali in beta · Prezzo speciale beta · Valido 30 giorni dal lancio
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={handleStartSearch}
              style={{ background: AC, color: W, fontFamily: MONO, fontWeight: 700, fontSize: "0.8rem", letterSpacing: "1.5px", textTransform: "uppercase", border: "none", padding: "0 2rem", height: "3.25rem", cursor: "pointer" }}>
              Cerca senza registrarti →
            </button>
            <Link to="/waitlist"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "rgba(244,239,230,0.7)", fontFamily: MONO, fontSize: "0.78rem", letterSpacing: "1px", border: `1px solid rgba(244,239,230,0.25)`, padding: "0 1.5rem", height: "3.25rem", textDecoration: "none" }}
              className="hover:border-white/50 transition-colors">
              Lista d'attesa beta →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: TX, borderTop: `1px solid #2d2b28` }}>
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <Logo />
            <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: GR, marginTop: "0.75rem" }}>Fenice Management — P.IVA IT02655840060</p>
            <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: GR, marginTop: "0.25rem" }}>loris.cresta@gmail.com</p>
          </div>
          <div className="flex flex-wrap gap-6">
            {["Privacy Policy", "Termini di Servizio"].map(l => (
              <a key={l} href="#" style={{ fontFamily: MONO, fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "2px", color: GR }} className="hover:text-white transition-colors">{l}</a>
            ))}
            <Link to="/waitlist" style={{ fontFamily: MONO, fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "2px", color: AC }} className="hover:opacity-80 transition-opacity">Lista d'attesa Beta →</Link>
          </div>
        </div>
        <div style={{ borderTop: `1px solid #2d2b28` }}>
          <div className="max-w-6xl mx-auto px-5 py-4">
            <p style={{ fontFamily: MONO, fontSize: "0.56rem", color: GR }}>
              UrbiCheck © 2026 — Beta · Analisi orientativa, non sostituisce consulenza professionale. Dati da fonti WFS ufficiali regionali.
            </p>
          </div>
        </div>
      </footer>

      {/* ── EXIT INTENT POPUP ── */}
      {showExitPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(28,26,23,0.85)" }} onClick={() => setShowExitPopup(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="max-w-sm w-full p-6 bg-white relative" style={{ border: `2px solid ${P}` }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowExitPopup(false)}
              style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: GR, fontSize: "1.1rem" }}
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: AC, display: "inline-block" }} />
              <span style={{ fontFamily: MONO, fontWeight: 700, color: AC, fontSize: "0.58rem", letterSpacing: "2px", textTransform: "uppercase" }}>
                Accesso Beta
              </span>
            </div>
            <h3 style={{ fontFamily: MONO, fontWeight: 700, color: P, fontSize: "1.1rem", lineHeight: 1.25, marginBottom: "0.5rem" }}>
              3 analisi gratuite<br />per i primi 50 utenti
            </h3>
            <p style={{ fontFamily: SERIF, color: GR, fontSize: "0.85rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              Iscriviti ora e ricevi 3 analisi catastali complete con vincoli, sismica, PAI e valutazione finanziaria — tutto gratis.
            </p>
            <form onSubmit={handleExitSubscribe}>
              <input
                type="email" value={exitEmail} onChange={e => setExitEmail(e.target.value)} required
                placeholder="la tua email"
                style={{ width: "100%", padding: "0.75rem 0.9rem", fontSize: "0.78rem", background: W, border: `1px solid ${BD}`, color: TX, fontFamily: MONO, borderRadius: 0, outline: "none", marginBottom: "0.75rem" }}
                className="focus:border-primary"
              />
              <button type="submit" disabled={exitDone}
                style={{ width: "100%", background: AC, color: W, fontFamily: MONO, fontWeight: 700, fontSize: "0.75rem", letterSpacing: "1px", textTransform: "uppercase", border: "none", padding: "0.8rem", cursor: exitDone ? "default" : "pointer", opacity: exitDone ? 0.6 : 1, borderRadius: 0 }}>
                {exitDone ? "Iscritto ✓" : "Iscriviti ora — è gratis"}
              </button>
            </form>
            <p style={{ fontFamily: MONO, fontSize: "0.5rem", color: GR, textAlign: "center", marginTop: "0.75rem" }}>
              Nessuno spam. Solo accesso alla beta.
            </p>
          </motion.div>
        </div>
      )}

      {/* ── DEMO MODAL ── */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(28,26,23,0.85)" }} onClick={() => setShowDemoModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg w-full p-6 bg-white" style={{ border: `2px solid ${P}` }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p style={{ fontFamily: MONO, fontWeight: 700, color: P, fontSize: "0.75rem", letterSpacing: "1px" }}>ESEMPIO REPORT — UB-DEMO-2026</p>
              <button onClick={() => setShowDemoModal(false)} style={{ color: GR, background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
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
              <div key={i} className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${BD}` }}>
                <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: GR, textTransform: "uppercase", letterSpacing: "1px" }}>{l}</span>
                <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: TX, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div className="mt-4 p-3" style={{ background: `${P}10`, border: `1px solid ${P}30` }}>
              <p style={{ fontFamily: MONO, fontWeight: 700, color: P, fontSize: "0.72rem" }}>✓ Operazione fattibile — Score 7/10</p>
            </div>
            <button onClick={handleStartSearch} style={{ width: "100%", marginTop: "1rem", background: AC, color: W, fontFamily: MONO, fontWeight: 700, fontSize: "0.75rem", letterSpacing: "1.5px", textTransform: "uppercase", border: "none", padding: "0.85rem", cursor: "pointer" }}>
              Cerca la tua particella — gratis →
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}