import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/metaPixel";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const P  = "#1A3A6B";
const AC = "#B33A2A";
const BG = "#F4EFE6";
const TX = "#1C1A17";
const GR = "#7A7268";
const BD = "#C4BAA8";
const W  = "#FFFFFF";
const MONO  = "'IBM Plex Mono', 'Courier New', monospace";
const SERIF = "'Libre Baskerville', Georgia, serif";

const LogoIcon = ({ size = 32 }) => (
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

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <LogoIcon />
    <div style={{ fontFamily: MONO }}>
      <div className="flex items-baseline leading-none">
        <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "3px", color: W }}>URBI</span>
        <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "3px", color: AC }}>CHECK</span>
      </div>
      <div style={{ fontSize: "0.5rem", letterSpacing: "3px", textTransform: "uppercase", marginTop: 2, color: "rgba(244,239,230,0.45)" }}>
        ANALISI URBANISTICA AUTOMATIZZATA
      </div>
    </div>
  </div>
);

const RUOLO_LABELS = {
  acquirente_privato: "Acquirente privato",
  aste_giudiziarie: "Aste giudiziarie",
  agente_immobiliare: "Agente immobiliare",
  investitore: "Investitore",
  developer_costruttore: "Developer / Costruttore",
  avvocato_notaio: "Avvocato / Notaio",
  altro: "Altro",
};

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [ruolo, setRuolo] = useState("");
  const [regioneInteresse, setRegioneInteresse] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError("Inserisci la tua email."); return; }
    setLoading(true);
    setError("");
    const existing = await base44.entities.WaitlistSubscriber.filter({ email });
    if (existing && existing.length > 0) {
      setDuplicate(true);
      setSubmitted(true);
      setLoading(false);
      return;
    }
    await base44.entities.WaitlistSubscriber.create({
      email,
      ruolo: ruolo || "altro",
      regione_interesse: regioneInteresse || undefined,
    });
    trackEvent("Lead", { customData: { content_name: "waitlist" }, email });
    setSubmitted(true);
    setLoading(false);
  };

  const inputStyle = {
    width: "100%",
    height: "3rem",
    padding: "0 1rem",
    border: `1px solid ${BD}`,
    fontFamily: MONO,
    fontSize: "0.85rem",
    color: TX,
    background: W,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ background: BG, fontFamily: MONO, minHeight: "100vh" }}>

      {/* NAVBAR */}
      <nav style={{ background: P, borderBottom: `3px solid ${AC}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" style={{ textDecoration: "none" }}><Logo /></Link>
          <Link to="/" style={{ color: "rgba(244,239,230,0.65)", fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "2px", textTransform: "uppercase", textDecoration: "none" }} className="hover:text-white transition-colors">
            ← Torna alla home
          </Link>
        </div>
      </nav>

      {/* MAIN */}
      <section style={{ padding: "5rem 1.5rem 6rem" }}>
        <div className="max-w-xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>

            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5" style={{ border: `1px solid ${AC}50`, background: `${AC}12` }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: AC, display: "inline-block" }} />
              <span style={{ color: AC, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Beta aperta — Piemonte e Liguria</span>
            </div>

            <h1 style={{ color: P, fontFamily: MONO, fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
              Entra in lista d'attesa<br />
              <span style={{ color: AC }}>UrbiCheck Beta</span>
            </h1>

            <p style={{ color: GR, fontFamily: SERIF, fontSize: "1rem", lineHeight: 1.75, marginBottom: "2.5rem" }}>
              Stiamo espandendo la copertura a nuove regioni. Lascia la tua email e ti avvisiamo appena la tua zona è disponibile.
            </p>

            <div className="flex flex-col gap-2 mb-8">
              {["2 query gratuite al lancio per i primi 100 iscritti", "Accesso beta prima dell'apertura pubblica", "Sconto 20% Piano Pro per i primi 6 mesi"].map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 style={{ width: 14, height: 14, color: AC, flexShrink: 0 }} />
                  <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: TX }}>{b}</span>
                </div>
              ))}
            </div>

            <div style={{ border: `1px solid ${BD}`, background: W, padding: "2rem" }}>
              {submitted ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                  {duplicate ? (
                    <>
                      <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✌️</div>
                      <p style={{ fontFamily: MONO, fontWeight: 700, color: P, fontSize: "0.9rem", marginBottom: "0.75rem" }}>Sei già in lista, grazie!</p>
                      <p style={{ fontFamily: SERIF, color: GR, fontSize: "0.88rem", lineHeight: 1.65 }}>
                        Il tuo indirizzo <strong style={{ color: TX }}>{email}</strong> è già registrato.
                      </p>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 style={{ width: 48, height: 48, color: AC, margin: "0 auto 1rem" }} />
                      <p style={{ fontFamily: MONO, fontWeight: 700, color: P, fontSize: "0.9rem", marginBottom: "0.75rem" }}>Perfetto! Sei in lista.</p>
                      <p style={{ fontFamily: SERIF, color: GR, fontSize: "0.88rem", lineHeight: 1.65 }}>
                        Ti avvisiamo appena sei operativo nella tua zona.
                      </p>
                    </>
                  )}
                  <Link to="/" style={{ display: "inline-block", marginTop: "1.5rem", color: AC, fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "1px", textDecoration: "none" }}>← Torna alla home</Link>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label style={{ display: "block", fontFamily: MONO, fontSize: "0.58rem", color: GR, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.4rem" }}>Email *</label>
                    <input type="email" placeholder="la tua email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: MONO, fontSize: "0.58rem", color: GR, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.4rem" }}>Che ruolo hai?</label>
                    <select value={ruolo} onChange={e => setRuolo(e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer", color: ruolo ? TX : GR }}>
                      <option value="" disabled>Seleziona il tuo ruolo</option>
                      {Object.entries(RUOLO_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: MONO, fontSize: "0.58rem", color: GR, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.4rem" }}>
                      Regione di interesse <span style={{ color: BD }}>(opzionale)</span>
                    </label>
                    <input type="text" placeholder="es. Toscana, Lombardia..." value={regioneInteresse} onChange={e => setRegioneInteresse(e.target.value)} style={inputStyle} />
                  </div>
                  {error && <p style={{ fontFamily: MONO, fontSize: "0.7rem", color: AC }}>{error}</p>}
                  <button type="submit" disabled={loading} style={{
                    width: "100%", height: "3rem",
                    background: loading ? BD : AC,
                    color: W,
                    fontFamily: MONO, fontWeight: 700, fontSize: "0.78rem", letterSpacing: "2px", textTransform: "uppercase",
                    border: "none", cursor: loading ? "not-allowed" : "pointer",
                  }}>
                    {loading ? "Invio..." : "Iscriviti alla beta →"}
                  </button>
                  <p style={{ fontFamily: SERIF, fontSize: "0.72rem", color: GR, textAlign: "center", lineHeight: 1.6 }}>
                    Nessuno spam. Disdici in qualsiasi momento.
                  </p>
                </form>
              )}
            </div>

          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: TX, borderTop: `1px solid #2d2b28` }}>
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: GR }}>UrbiCheck © 2026 — Beta</p>
          <div className="flex gap-6">
            <a href="#" style={{ fontFamily: MONO, fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "2px", color: GR }}>Privacy Policy</a>
            <a href="#" style={{ fontFamily: MONO, fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "2px", color: GR }}>Terms</a>
            <a href="mailto:loris.cresta@gmail.com" style={{ fontFamily: MONO, fontSize: "0.58rem", color: AC }}>loris.cresta@gmail.com</a>
          </div>
        </div>
      </footer>

    </div>
  );
}