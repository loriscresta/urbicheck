import React, { useState } from "react";
import { submitWaitlist } from "@/functions/submitWaitlist";

const MONO = "'IBM Plex Mono', monospace";

// Cattura email inline quando l'immobile è fuori dalle regioni beta (Pie/Lig/Lom).
// Trasforma il vicolo cieco "fuori area" in un lead (WaitlistSubscriber).
export default function GeoWaitlistCapture({ regione }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || sending) return;
    setSending(true);
    try {
      await submitWaitlist({ email, ruolo: "altro", regione_interesse: regione || "" });
      try { window.fbq?.("track", "Lead", { content_name: "waitlist_geo" }); } catch (_) {}
    } catch (_) {
      // non bloccare l'utente
    }
    setSending(false);
    setDone(true);
  };

  if (done) {
    return (
      <p className="text-xs font-semibold mt-1" style={{ color: "#92400e", fontFamily: MONO }}>
        ✓ Fatto! Ti avvisiamo appena UrbiCheck copre la tua zona.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 mt-1">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="La tua email"
        className="flex-1 px-3 py-2 text-xs"
        style={{ border: "1px solid #f59e0b", fontFamily: MONO, background: "#fff" }}
      />
      <button
        type="submit"
        disabled={sending}
        className="px-4 py-2 text-xs font-bold disabled:opacity-60 cursor-pointer"
        style={{ background: "#92400e", color: "#fff", border: "none", fontFamily: MONO }}
      >
        {sending ? "Invio…" : "Avvisami quando copri la mia zona →"}
      </button>
    </form>
  );
}
