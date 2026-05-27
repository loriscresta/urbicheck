import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Upload, Loader2, ArrowRight, ArrowLeft, Building2, AlertCircle, CheckCircle2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

const MICROSERVICE = "https://web-production-6e951.up.railway.app";
const REGIONI = ["Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto"];
const EMPTY = { tribunale:"", rge:"", indirizzo:"", comune:"", provincia:"", regione:"", foglio:"", particella:"", subalterni:"", prezzo_base_asta:"", superficie_totale:"", categoria:"" };
const mono = { fontFamily:"'IBM Plex Mono', monospace" };

function StepBar({ step }) {
  const labels = ["Carica PDF", "Revisione dati", "Conferma"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <React.Fragment key={n}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: done ? '#16a34a' : active ? '#1A3A6B' : '#C4BAA8', color: '#fff', ...mono }}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : n}
              </div>
              <span className="text-[10px] uppercase tracking-widest hidden sm:block"
                style={{ color: active ? '#1A3A6B' : done ? '#16a34a' : '#7A7268', ...mono }}>
                {label}
              </span>
            </div>
            {i < 2 && <div className="flex-1 h-px mx-3" style={{ background: step > n ? '#16a34a' : '#C4BAA8' }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: '#7A7268', ...mono }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inp = "w-full text-xs px-3 py-2.5 border border-border bg-white focus:outline-none focus:border-primary";

export default function PeriziaPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [ocrWarn, setOcrWarn] = useState(false);
  const [netError, setNetError] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const { data: credits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.UserCredits.filter({ user_email: user.email });
      return list[0] || { balance: 0 };
    },
  });

  const subList = form.subalterni ? form.subalterni.split(/[,;\n]/).map(s => s.trim()).filter(Boolean) : [];
  const unitCount = Math.max(subList.length, 1);
  const costPerUnit = unitCount === 1 ? 9.90 : 2.99;
  const totalCost = +(unitCount * costPerUnit).toFixed(2);
  const hasEnough = (credits?.balance || 0) >= totalCost;

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setNetError(false);
    setOcrWarn(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await Promise.race([
        fetch(`${MICROSERVICE}/parse-perizia`, { method: "POST", body: fd }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 25000)),
      ]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.requires_ocr) {
        setOcrWarn(true);
        setForm(EMPTY);
      } else {
        setForm({
          tribunale: data.tribunale || "",
          rge: data.rge || "",
          indirizzo: data.indirizzo || "",
          comune: data.comune || "",
          provincia: (data.provincia || "").toUpperCase().slice(0, 2),
          regione: "",
          foglio: data.foglio || "",
          particella: data.particella || "",
          subalterni: Array.isArray(data.subalterni) ? data.subalterni.join(", ") : (data.subalterni || ""),
          prezzo_base_asta: data.prezzo_base_asta != null ? String(data.prezzo_base_asta) : "",
          superficie_totale: data.superficie_totale != null ? String(data.superficie_totale) : "",
          categoria: data.categoria || "",
        });
      }
      setStep(2);
    } catch {
      setNetError(true);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!hasEnough) return;
    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      const units = subList.length > 0 ? subList : [""];

      const batch = await base44.entities.BatchQuery.create({
        comune: form.comune,
        regione: form.regione || undefined,
        provincia: form.provincia || undefined,
        label: `Perizia ${form.tribunale || form.comune} — F.${form.foglio} P.${form.particella}`,
        total_units: units.length,
        completed_units: 0,
        failed_units: 0,
        status: "processing",
        finalita: "asta_giudiziaria",
        total_acquisition_price: parseFloat(form.prezzo_base_asta) || undefined,
        query_ids: [],
      });

      const queryIds = [];
      for (const sub of units) {
        const q = await base44.entities.CadastralQuery.create({
          comune: form.comune,
          regione: form.regione || undefined,
          provincia: form.provincia || undefined,
          foglio: form.foglio,
          particella: form.particella,
          subalterno: sub || undefined,
          indirizzo_immobile: form.indirizzo || undefined,
          superficie_mq: parseFloat(form.superficie_totale) || undefined,
          categoria_catastale: form.categoria || undefined,
          finalita: "asta_giudiziaria",
          status: "pending",
          batch_id: batch.id,
          note: [
            form.tribunale && `Tribunale: ${form.tribunale}`,
            form.rge && `R.G.E.: ${form.rge}`,
            form.prezzo_base_asta && `Prezzo base asta: €${form.prezzo_base_asta}`,
          ].filter(Boolean).join(" | "),
          cost: costPerUnit,
        });
        queryIds.push(q.id);
      }

      await base44.entities.BatchQuery.update(batch.id, {
        query_ids: queryIds,
        completed_units: queryIds.length,
        status: "completed",
      });

      if (credits?.id) {
        await base44.entities.UserCredits.update(credits.id, {
          balance: +(credits.balance - totalCost).toFixed(2),
          total_spent: +((credits.total_spent || 0) + totalCost).toFixed(2),
          total_queries: (credits.total_queries || 0) + queryIds.length,
        });
        await base44.entities.CreditTransaction.create({
          user_email: user.email,
          type: "query_charge",
          amount: -totalCost,
          description: `Analisi perizia — ${form.comune} F.${form.foglio} P.${form.particella} (${queryIds.length} ud)`,
        });
      }

      navigate(`/batch/${batch.id}`);
    } catch (err) {
      console.error("Perizia submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <FileText className="w-6 h-6" style={{ color: '#1A3A6B' }} />
          <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: '#1A3A6B', fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' }}>
            Analisi da Perizia
          </h1>
        </div>
        <p className="mb-8 text-xs" style={{ color: '#7A7268', ...mono }}>
          Carica la perizia PDF del Tribunale. Estraiamo i dati catastali in automatico.
        </p>
        <StepBar step={step} />
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {netError && (
              <div className="flex items-center gap-2 p-3 mb-4 border border-red-200 bg-red-50 text-xs text-red-700" style={mono}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                Servizio non raggiungibile — riprova tra qualche istante.
              </div>
            )}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="cursor-pointer flex flex-col items-center justify-center gap-5 p-14 border-2 border-dashed transition-all"
              style={{ borderColor: dragOver ? '#1A3A6B' : '#C4BAA8', background: dragOver ? '#eef2f8' : '#fff' }}
            >
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
              {uploading ? (
                <>
                  <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#1A3A6B' }} />
                  <p className="text-sm font-semibold" style={{ color: '#1A3A6B', ...mono }}>Estrazione in corso...</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12" style={{ color: '#C4BAA8' }} />
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: '#1A3A6B', ...mono }}>Trascina qui il PDF della perizia</p>
                    <p className="text-xs mt-1" style={{ color: '#7A7268', ...mono }}>oppure clicca per selezionare</p>
                  </div>
                  <Button style={{ background: '#1A3A6B' }}>
                    <Upload className="w-4 h-4 mr-2" /> Analizza PDF
                  </Button>
                </>
              )}
            </div>
            <p className="text-center mt-4">
              <button onClick={() => setStep(2)} className="text-xs underline" style={{ color: '#7A7268', ...mono }}>
                Compila manualmente →
              </button>
            </p>
          </motion.div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <p className="text-xs" style={{ color: '#7A7268', ...mono }}>Controlla i dati estratti e correggi se necessario.</p>

            {ocrWarn && (
              <div className="flex items-start gap-2 p-3 border border-amber-300 bg-amber-50 text-xs text-amber-800" style={mono}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ⚠️ PDF scansionato — compila i campi manualmente.
              </div>
            )}

            <div className="bg-white border border-border p-5 space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: '#B33A2A', ...mono }}>Dati Procedura</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tribunale">
                  <input className={inp} style={mono} value={form.tribunale} onChange={e => set("tribunale", e.target.value)} placeholder="es. Tribunale di Genova" />
                </Field>
                <Field label="N. R.G.E.">
                  <input className={inp} style={mono} value={form.rge} onChange={e => set("rge", e.target.value)} placeholder="es. 123/2024" />
                </Field>
              </div>
              <Field label="Prezzo base asta (€)">
                <input className={`${inp} font-bold`} style={{ ...mono, borderColor: '#16a34a', color: '#16a34a' }}
                  type="number" value={form.prezzo_base_asta} onChange={e => set("prezzo_base_asta", e.target.value)} placeholder="es. 85000" />
              </Field>
            </div>

            <div className="bg-white border border-border p-5 space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: '#B33A2A', ...mono }}>Dati Catastali</p>
              <Field label="Indirizzo">
                <input className={inp} style={mono} value={form.indirizzo} onChange={e => set("indirizzo", e.target.value)} placeholder="es. Via Roma 10" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Comune" required>
                    <input className={inp} style={mono} value={form.comune} onChange={e => set("comune", e.target.value)} placeholder="es. Genova" />
                  </Field>
                </div>
                <Field label="Provincia" required>
                  <input className={inp} style={mono} value={form.provincia} maxLength={2}
                    onChange={e => set("provincia", e.target.value.toUpperCase())} placeholder="es. GE" />
                </Field>
              </div>
              <Field label="Regione">
                <select className={inp} style={mono} value={form.regione} onChange={e => set("regione", e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {REGIONI.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Foglio">
                  <input className={inp} style={mono} value={form.foglio} onChange={e => set("foglio", e.target.value)} placeholder="es. 12" />
                </Field>
                <Field label="Particella">
                  <input className={inp} style={mono} value={form.particella} onChange={e => set("particella", e.target.value)} placeholder="es. 345" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Categoria catastale">
                    <input className={inp} style={mono} value={form.categoria} onChange={e => set("categoria", e.target.value)} placeholder="es. A/2" />
                  </Field>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Subalterni (virgola-separati)">
                  <input className={inp} style={mono} value={form.subalterni} onChange={e => set("subalterni", e.target.value)} placeholder="es. 1, 2, 3" />
                </Field>
                <Field label="Superficie totale (mq)">
                  <input className={inp} style={mono} type="number" value={form.superficie_totale} onChange={e => set("superficie_totale", e.target.value)} placeholder="es. 120" />
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button onClick={() => { setStep(1); setOcrWarn(false); setNetError(false); }}
                className="flex items-center gap-1.5 text-xs" style={{ color: '#7A7268', ...mono }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Carica altro PDF
              </button>
              <Button onClick={() => setStep(3)} disabled={!form.comune || !form.provincia} style={{ background: '#1A3A6B' }}>
                Continua <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <p className="text-xs" style={{ color: '#7A7268', ...mono }}>Tutto ok? Avvia l'analisi.</p>

            {/* Riepilogo */}
            <div className="bg-white border border-border p-5 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-3" style={{ color: '#B33A2A', ...mono }}>Riepilogo</p>
              {[
                ["Proprietà", [form.indirizzo, form.comune && `${form.comune}${form.provincia ? ` (${form.provincia})` : ''}`].filter(Boolean).join(", ") || "—"],
                ["Tribunale / RGE", [form.tribunale, form.rge].filter(Boolean).join(" — ") || "—"],
                ["Dati catastali", `F.${form.foglio || "—"} P.${form.particella || "—"}`],
                ["Subalterni", subList.length > 0 ? subList.join(", ") : "Unità singola"],
                ["Prezzo base asta", form.prezzo_base_asta ? `€ ${parseFloat(form.prezzo_base_asta).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0" style={mono}>{label}</span>
                  <span className="text-xs text-right font-semibold" style={{ color: '#1A3A6B', ...mono }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Crediti */}
            <div className="bg-white border-2 p-5 space-y-3" style={{ borderColor: hasEnough ? '#1A3A6B' : '#ef4444' }}>
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4" style={{ color: '#1A3A6B' }} />
                <p className="text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: '#1A3A6B', ...mono }}>Crediti</p>
              </div>
              {[
                ["Unità da analizzare", `${unitCount}`],
                ["Costo per unità", `€${costPerUnit.toFixed(2)}${unitCount > 1 ? " (batch)" : ""}`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-xs" style={mono}>
                  <span className="text-muted-foreground">{l}</span>
                  <span className="font-bold" style={{ color: '#1A3A6B' }}>{v}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2" style={mono}>
                <span style={{ color: '#1A3A6B' }}>Crediti necessari</span>
                <span style={{ color: '#B33A2A' }}>€{totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs" style={mono}>
                <span className="text-muted-foreground">Saldo attuale</span>
                <span className={`font-bold ${hasEnough ? 'text-emerald-600' : 'text-red-600'}`}>
                  €{(credits?.balance || 0).toFixed(2)}
                </span>
              </div>
              {!hasEnough && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 text-xs text-red-700" style={mono}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Crediti insufficienti —{" "}
                  <Link to="/credits" className="underline font-semibold">ricarica per continuare</Link>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-xs" style={{ color: '#7A7268', ...mono }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Modifica
              </button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !hasEnough}
                className="gap-2 px-6 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                🚀 Avvia Analisi
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}