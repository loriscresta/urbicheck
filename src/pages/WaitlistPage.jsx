import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const N = "#0f172a";
const G = "#10b981";
const SD = "#1e293b";
const SL = "#94a3b8";
const W = "#ffffff";
const MONO = "'IBM Plex Mono', monospace";
const SERIF = "'Libre Baskerville', serif";

const Logo = () => (
  <div className="flex items-center gap-2">
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <rect x="1" y="1" width="26" height="26" stroke={W} strokeWidth="1.5" fill="none"/>
      <line x1="10" y1="1" x2="10" y2="27" stroke={W} strokeWidth="0.75" strokeOpacity="0.4"/>
      <line x1="18" y1="1" x2="18" y2="27" stroke={W} strokeWidth="0.75" strokeOpacity="0.4"/>
      <line x1="1" y1="10" x2="27" y2="10" stroke={W} strokeWidth="0.75" strokeOpacity="0.4"/>
      <line x1="1" y1="18" x2="27" y2="18" stroke={W} strokeWidth="0.75" strokeOpacity="0.4"/>
      <polyline points="20,21 23,24 27,19" stroke={G} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: "1.05rem", letterSpacing: "0.04em" }}>
      <span style={{ color: W }}>URBI</span>
      <span style={{ color: G }}>CHECK</span>
    </span>
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

    // Check for duplicate
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

    setSubmitted(true);
    setLoading(false);
  };

  const inputStyle = {
    width: "100%",
    height: "3rem",
    padding: "0 1rem",
    border: `1px solid #2d3748`,
    fontFamily: MONO,
    fontSize: "0.85rem",
    color: W,
    background: SD,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ background: N, fontFamily: MONO, minHeight: "100vh" }}>

      {/* ── NAVBAR ── */}
      <nav style={{ background: N, borderBottom: `1px solid ${SD}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" style={{ textDecoration: "none" }}><Logo /></Link>
          <Link to="/" style={{ color: SL, fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "2px", textTransform: "uppercase", textDecoration: "none" }} className="hover:text-white transition-colors">
            ← Torna alla home
          </Link>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <section style={{ padding: "5rem 1.5rem 6rem" }}>
        <div className="max-w-xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5" style={{ border: `1px solid ${G}40`, background: `${G}15` }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: G, display: "inline-block", boxShadow: `0 0 8px ${G}` }} />
              <span style={{ color: G, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Beta aperta — Piemonte e Liguria</span>
            </div>

            <h1 style={{ color: W, fontFamily: MONO, fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
              Entra in lista d'attesa<br />
              <span style={{ color: G }}>UrbiCheck Beta</span>
            </h1>

            <p style={{ color: SL, fontFamily: SERIF, fontSize: "1rem", lineHeight: 1.75, marginBottom: "2.5rem" }}>
              Stiamo espandendo la copertura a nuove regioni. Lascia la tua email e ti avvisiamo appena la tua zona è disponibile.
            </p>

            {/* Benefit bullets */}
            <div className="flex flex-col gap-2 mb-8">
              {["2 query gratuite al lancio per i primi 100 iscritti", "Accesso beta prima dell'apertura pubblica", "Sconto 20% Piano Pro per i primi 6 mesi"].map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 style={{ width: 14, height: 14, color: G, flexShrink: 0 }} />
                  <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: SL }}>{b}</span>
                </div>
              ))}
            </div>

            {/* Form / Success */}
            <div style={{ border: `1px solid #2d3748`, background: SD, padding: "2rem" }}>
              {submitted ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                  {duplicate ? (
                    <>
                      <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✌️</div>
                      <p style={{ fontFamily: MONO, fontWeight: 700, color: G, fontSize: "0.9rem", marginBottom: "0.75rem" }}>Sei già in lista, grazie!</p>
                      <p style={{ fontFamily: SERIF, color: SL, fontSize: "0.88rem", lineHeight: 1.65 }}>
                        Il tuo indirizzo <strong style={{ color: W }}>{email}</strong> è già registrato. Ti contatteremo prima del lancio.
                      </p>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 style={{ width: 48, height: 48, color: G, margin: "0 auto 1rem" }} />
                      <p style={{ fontFamily: MONO, fontWeight: 700, color: G, fontSize: "0.9rem", marginBottom: "0.75rem" }}>Perfetto! Sei in lista.</p>
                      <p style={{ fontFamily: SERIF, color: SL, fontSize: "0.88rem", lineHeight: 1.65 }}>
                        Ti avvisiamo appena sei operativo nella tua zona. Controlla la tua email per la conferma.
                      </p>
                    </>
                  )}
                  <Link to="/" style={{ display: "inline-block", marginTop: "1.5rem", color: G, fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "1px", textDecoration: "none" }}>← Torna alla home</Link>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label style={{ display: "block", fontFamily: MONO, fontSize: "0.6rem", color: SL, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.4rem" }}>Email *</label>
                    <input
                      type="email"
                      placeholder="la tua email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontFamily: MONO, fontSize: "0.6rem", color: SL, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.4rem" }}>Che ruolo hai?</label>
                    <select
                      value={ruolo}
                      onChange={e => setRuolo(e.target.value)}
                      style={{ ...inputStyle, appearance: "none", cursor: "pointer", color: ruolo ? W : SL }}
                    >
                      <option value="" disabled>Seleziona il tuo ruolo</option>
                      {Object.entries(RUOLO_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontFamily: MONO, fontSize: "0.6rem", color: SL, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.4rem" }}>
                      Regione di interesse <span style={{ color: "#475569" }}>(opzionale)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="es. Toscana, Lombardia, Campania..."
                      value={regioneInteresse}
                      onChange={e => setRegioneInteresse(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  {error && <p style={{ fontFamily: MONO, fontSize: "0.7rem", color: "#f87171" }}>{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      height: "3rem",
                      background: loading ? "#2d3748" : G,
                      color: loading ? SL : N,
                      fontFamily: MONO, fontWeight: 700, fontSize: "0.78rem", letterSpacing: "2px", textTransform: "uppercase",
                      border: "none", cursor: loading ? "not-allowed" : "pointer",
                      boxShadow: loading ? "none" : `0 4px 16px ${G}40`,
                    }}
                  >
                    {loading ? "Invio..." : "Iscriviti alla beta →"}
                  </button>

                  <p style={{ fontFamily: SERIF, fontSize: "0.72rem", color: "#475569", textAlign: "center", lineHeight: 1.6 }}>
                    Nessuno spam. Disdici in qualsiasi momento. I tuoi dati non vengono ceduti a terzi.
                  </p>
                </form>
              )}
            </div>

          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#080f1a", borderTop: `1px solid ${SD}` }}>
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p style={{ fontFamily: MONO, fontSize: "0.6rem", color: "#475569" }}>
            UrbiCheck © 2026 — Beta
          </p>
          <div className="flex gap-6">
            <a href="#" style={{ fontFamily: MONO, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "2px", color: "#475569" }} className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" style={{ fontFamily: MONO, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "2px", color: "#475569" }} className="hover:text-slate-300 transition-colors">Terms</a>
            <a href="mailto:loris.cresta@gmail.com" style={{ fontFamily: MONO, fontSize: "0.6rem", color: G }} className="hover:opacity-80 transition-opacity">loris.cresta@gmail.com</a>
          </div>
        </div>
      </footer>

    </div>
  );
}