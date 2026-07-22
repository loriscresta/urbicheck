import React, { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react";

const MONO = "'IBM Plex Mono', monospace";
const P = "#1A3A6B";
const AC = "#B33A2A";

// Prompt di feedback mostrato in fondo al report (vista pubblica e autenticata).
// Scrive nell'entità ReportFeedback (RLS create aperto → funziona anche per anonimi).
export default function ReportFeedbackPrompt({ query }) {
  const [utile, setUtile] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (utile === null || sending) return;
    setSending(true);
    try {
      await base44.entities.ReportFeedback.create({
        query_id: query?.id || "",
        utile,
        motivo: (motivo || "").trim(),
        regione: query?.regione || "",
        comune: query?.comune || "",
        contesto: "report",
      });
    } catch (e) {
      console.warn("ReportFeedback submit failed", e);
    } finally {
      setSending(false);
      setSent(true); // non bloccare mai l'utente
    }
  };

  if (sent) {
    return (
      <div className="mt-8 p-5 flex items-center gap-2" style={{ background: "#f0fdf4", border: "1px solid #86efac", fontFamily: MONO }}>
        <CheckCircle2 className="w-4 h-4" style={{ color: "#15803d" }} />
        <span className="text-sm" style={{ color: "#15803d" }}>Grazie! Il tuo feedback ci aiuta a migliorare UrbiCheck.</span>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-5" style={{ background: "#F4EFE6", border: "1px solid #C4BAA8", fontFamily: MONO }}>
      <p className="text-sm font-bold mb-3" style={{ color: P }}>Questo report ti è stato utile?</p>
      <div className="flex gap-3 mb-1">
        <button
          type="button"
          onClick={() => setUtile(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border transition-colors cursor-pointer"
          style={{ background: utile === true ? P : "#fff", color: utile === true ? "#fff" : P, borderColor: P }}
        >
          <ThumbsUp className="w-4 h-4" /> Sì
        </button>
        <button
          type="button"
          onClick={() => setUtile(false)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border transition-colors cursor-pointer"
          style={{ background: utile === false ? AC : "#fff", color: utile === false ? "#fff" : AC, borderColor: AC }}
        >
          <ThumbsDown className="w-4 h-4" /> Non del tutto
        </button>
      </div>
      {utile !== null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mt-3">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            placeholder="Cosa miglioreresti? Cosa ti aspettavi e non c'era? (opzionale)"
            className="w-full p-2 text-sm border"
            style={{ borderColor: "#C4BAA8", fontFamily: MONO }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="px-5 py-2 text-sm font-bold border-0 disabled:opacity-60 cursor-pointer"
            style={{ background: P, color: "#fff", fontFamily: MONO }}
          >
            {sending ? "Invio…" : "Invia feedback"}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
