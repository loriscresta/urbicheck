import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";

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
  const [form, setForm] = useState({ email: "", ruolo: "", regione_interesse: "" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "duplicate" | "error"

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Check for duplicate
      const existing = await base44.entities.WaitlistSubscriber.filter({ email: form.email });
      if (existing.length > 0) {
        setStatus("duplicate");
        setLoading(false);
        return;
      }
      const payload = { email: form.email };
      if (form.ruolo) payload.ruolo = form.ruolo;
      if (form.regione_interesse.trim()) payload.regione_interesse = form.regione_interesse.trim();
      await base44.entities.WaitlistSubscriber.create(payload);
      setStatus("success");
    } catch (_e) {
      setStatus("error");
    }
    setLoading(false);
  };

  const mono = "'IBM Plex Mono', monospace";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0f172a", fontFamily: mono }}>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }} className="px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <rect x="1" y="1" width="26" height="26" stroke="#f1f5f9" strokeWidth="1.5" fill="none" />
            <line x1="10" y1="1" x2="10" y2="27" stroke="#f1f5f9" strokeWidth="0.75" strokeOpacity="0.3" />
            <line x1="18" y1="1" x2="18" y2="27" stroke="#f1f5f9" strokeWidth="0.75" strokeOpacity="0.3" />
            <line x1="1" y1="10" x2="27" y2="10" stroke="#f1f5f9" strokeWidth="0.75" strokeOpacity="0.3" />
            <line x1="1" y1="18" x2="27" y2="18" stroke="#f1f5f9" strokeWidth="0.75" strokeOpacity="0.3" />
            <polyline points="20,21 23,24 27,19" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "0.05em" }}>
            <span style={{ color: "#f1f5f9" }}>URBI</span>
            <span style={{ color: "#10b981" }}>CHECK</span>
          </span>
        </Link>
        <Link to="/" className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
          style={{ color: "rgba(241,245,249,0.5)" }}>
          <ArrowLeft className="w-3 h-3" /> Torna alla home
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">

          {status === "success" ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(16,185,129,0.15)", border: "2px solid #10b981" }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: "#10b981" }} />
              </div>
              <h1 className="text-2xl font-bold mb-3" style={{ color: "#f1f5f9" }}>Perfetto!</h1>
              <p className="leading-relaxed mb-8" style={{ color: "rgba(241,245,249,0.6)", fontSize: "0.95rem", fontFamily: "'Libre Baskerville', serif" }}>
                Ti avvisiamo appena sei operativo nella tua zona.
              </p>
              <Link to="/"
                className="inline-block text-xs font-bold uppercase tracking-widest px-6 py-3 hover:opacity-90 transition-opacity"
                style={{ background: "#10b981", color: "#0f172a" }}>
                ← Torna alla home
              </Link>
            </div>
          ) : status === "duplicate" ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(16,185,129,0.1)", border: "2px solid rgba(16,185,129,0.4)" }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: "#10b981" }} />
              </div>
              <h1 className="text-xl font-bold mb-3" style={{ color: "#f1f5f9" }}>Sei già in lista, grazie!</h1>
              <p style={{ color: "rgba(241,245,249,0.5)", fontSize: "0.85rem" }}>
                Ti contatteremo non appena la tua zona sarà disponibile.
              </p>
              <Link to="/" className="inline-block mt-6 text-xs hover:underline" style={{ color: "rgba(241,245,249,0.4)" }}>
                ← Torna alla home
              </Link>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>
                  Beta · Piemonte e Liguria disponibili
                </div>
                <h1 className="font-bold leading-tight mb-4"
                  style={{ color: "#f1f5f9", fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}>
                  Entra in lista d'attesa
                </h1>
                <p style={{ color: "rgba(241,245,249,0.55)", fontSize: "0.9rem", fontFamily: "'Libre Baskerville', serif", lineHeight: 1.7 }}>
                  Stiamo espandendo la copertura a nuove regioni. Lascia la tua email e ti avvisiamo appena la tua zona è disponibile.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: "rgba(241,245,249,0.5)" }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="la-tua@email.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full h-11 px-4 text-sm outline-none transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#f1f5f9",
                      fontFamily: mono,
                    }}
                    onFocus={e => e.target.style.borderColor = "#10b981"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                  />
                </div>

                {/* Ruolo */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: "rgba(241,245,249,0.5)" }}>
                    Che ruolo hai?
                  </label>
                  <select
                    value={form.ruolo}
                    onChange={e => setForm(f => ({ ...f, ruolo: e.target.value }))}
                    className="w-full h-11 px-4 text-sm outline-none transition-colors appearance-none"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: form.ruolo ? "#f1f5f9" : "rgba(241,245,249,0.35)",
                      fontFamily: mono,
                    }}
                    onFocus={e => e.target.style.borderColor = "#10b981"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                  >
                    <option value="" style={{ background: "#1e293b" }}>Seleziona (opzionale)</option>
                    {Object.entries(RUOLO_LABELS).map(([val, label]) => (
                      <option key={val} value={val} style={{ background: "#1e293b", color: "#f1f5f9" }}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Regione */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: "rgba(241,245,249,0.5)" }}>
                    Regione di interesse <span style={{ color: "rgba(241,245,249,0.3)", fontWeight: 400 }}>(opzionale)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Es. Lombardia, Toscana, Veneto…"
                    value={form.regione_interesse}
                    onChange={e => setForm(f => ({ ...f, regione_interesse: e.target.value }))}
                    className="w-full h-11 px-4 text-sm outline-none transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#f1f5f9",
                      fontFamily: mono,
                    }}
                    onFocus={e => e.target.style.borderColor = "#10b981"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                  />
                </div>

                {/* Error */}
                {status === "error" && (
                  <p className="text-xs" style={{ color: "#f87171" }}>
                    Qualcosa è andato storto. Riprova tra qualche secondo.
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 font-bold text-sm uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "#10b981", color: "#0f172a", marginTop: "0.5rem" }}
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Iscrizione…</> : "Iscriviti alla beta →"}
                </button>
              </form>

              <p className="mt-6 text-[11px] text-center" style={{ color: "rgba(241,245,249,0.25)" }}>
                Nessuno spam. Solo un'email quando la tua regione è pronta.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-5 text-center text-[10px]" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(241,245,249,0.25)" }}>
        UrbiCheck © 2026 — Beta &nbsp;·&nbsp; <a href="mailto:loris.cresta@gmail.com" className="hover:opacity-70 transition-opacity">loris.cresta@gmail.com</a>
      </div>
    </div>
  );
}