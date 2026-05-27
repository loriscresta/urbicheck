import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { FileText, Upload, Loader2, ArrowRight, Building2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const MICROSERVICE = "https://web-production-6e951.up.railway.app";

const EMPTY_FORM = {
  tribunale: "", rge: "", prezzo_base: "", comune: "", provincia: "", regione: "",
  indirizzo: "", foglio: "", particella: "", subalterni: "", superficie_mq: "", note: "",
};

export default function PeriziaPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleFile = async (file) => {
    if (!file || file.type !== "application/pdf") return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await Promise.race([
        fetch(`${MICROSERVICE}/parse-perizia`, { method: "POST", body: fd }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 20000)),
      ]);
      if (res.ok) {
        const data = await res.json();
        if (!data.requires_ocr && data) {
          setForm({
            tribunale: data.tribunale || "",
            rge: data.rge || "",
            prezzo_base: data.prezzo_base ? String(data.prezzo_base) : "",
            comune: data.comune || "",
            provincia: data.provincia || "",
            regione: "",
            indirizzo: data.indirizzo || "",
            foglio: data.foglio || "",
            particella: data.particella || "",
            subalterni: Array.isArray(data.subalterni) ? data.subalterni.join(", ") : (data.subalterni || ""),
            superficie_mq: data.superficie_mq ? String(data.superficie_mq) : "",
            note: data.note || "",
          });
        }
      }
    } catch (e) {
      setUploadError("Estrazione automatica non disponibile — compila manualmente i campi.");
    } finally {
      setUploading(false);
      setStep(2);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async () => {
    if (!form.comune || !form.foglio || !form.particella) return;
    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      const subList = form.subalterni
        ? form.subalterni.split(/[,;\n]/).map(s => s.trim()).filter(Boolean)
        : [""];

      const batchRecord = await base44.entities.BatchQuery.create({
        comune: form.comune,
        regione: form.regione || undefined,
        provincia: form.provincia || undefined,
        label: `Perizia ${form.tribunale || form.comune} — F.${form.foglio} P.${form.particella}`,
        total_units: subList.length,
        completed_units: 0,
        failed_units: 0,
        status: "processing",
        finalita: "asta_giudiziaria",
        total_acquisition_price: parseFloat(form.prezzo_base) || undefined,
        query_ids: [],
      });

      const queryIds = [];
      for (const sub of subList) {
        const q = await base44.entities.CadastralQuery.create({
          comune: form.comune,
          regione: form.regione || undefined,
          provincia: form.provincia || undefined,
          foglio: form.foglio,
          particella: form.particella,
          subalterno: sub || undefined,
          indirizzo_immobile: form.indirizzo || undefined,
          superficie_mq: parseFloat(form.superficie_mq) || undefined,
          finalita: "asta_giudiziaria",
          status: "pending",
          batch_id: batchRecord.id,
          note: [
            form.tribunale ? `Tribunale: ${form.tribunale}` : "",
            form.rge ? `R.G.E.: ${form.rge}` : "",
            form.note,
          ].filter(Boolean).join(" | "),
          cost: 2.99,
        });
        queryIds.push(q.id);
      }

      await base44.entities.BatchQuery.update(batchRecord.id, {
        query_ids: queryIds,
        completed_units: queryIds.length,
        status: "completed",
      });

      navigate(`/batch/${batchRecord.id}`);
    } catch (err) {
      console.error("Perizia submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const subCount = form.subalterni
    ? form.subalterni.split(/[,;\n]/).map(s => s.trim()).filter(Boolean).length
    : 1;
  const cost = subCount === 1 ? 9.90 : subCount * 2.99;

  const inputCls = "w-full text-xs px-3 py-2.5 border border-border bg-white focus:outline-none focus:border-primary";
  const style = { fontFamily: "'IBM Plex Mono', monospace" };

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <FileText className="w-6 h-6" style={{ color: '#1A3A6B' }} />
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: '#1A3A6B', fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' }}>
            Analisi da Perizia del Tribunale
          </h1>
        </div>
        <p className="mb-8 text-xs tracking-[1px] uppercase" style={{ color: '#7A7268', ...style }}>
          Carica la perizia e UrbiCheck estrae automaticamente i dati catastali
        </p>
      </motion.div>

      {/* STEP 1 — Upload */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="cursor-pointer flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed transition-colors"
            style={{ borderColor: dragOver ? '#1A3A6B' : '#C4BAA8', background: dragOver ? '#eef1f8' : '#fff' }}
          >
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
              onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
            {uploading ? (
              <>
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#1A3A6B' }} />
                <p className="text-sm font-semibold" style={{ color: '#1A3A6B', ...style }}>Estrazione dati in corso...</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10" style={{ color: '#C4BAA8' }} />
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: '#1A3A6B', ...style }}>Trascina qui il PDF della perizia</p>
                  <p className="text-xs mt-1" style={{ color: '#7A7268', ...style }}>oppure clicca per selezionare il file</p>
                </div>
                <Button style={{ background: '#1A3A6B', ...style }} className="mt-2">
                  <Upload className="w-4 h-4 mr-2" /> Carica Perizia PDF
                </Button>
              </>
            )}
          </div>
          <p className="text-center mt-4">
            <button onClick={() => setStep(2)} className="text-xs underline" style={{ color: '#7A7268', ...style }}>
              Compila manualmente senza PDF →
            </button>
          </p>
        </motion.div>
      )}

      {/* STEP 2 — Form */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {uploadError && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-xs text-amber-800" style={style}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {uploadError}
            </div>
          )}

          {/* Dati asta */}
          <div className="bg-white border border-border p-5 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-3" style={{ color: '#B33A2A', ...style }}>Dati Procedura</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: '#7A7268', ...style }}>Tribunale</label>
                <input className={inputCls} style={style} value={form.tribunale} onChange={e => set("tribunale", e.target.value)} placeholder="es. Tribunale di Genova" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: '#7A7268', ...style }}>N. R.G.E.</label>
                <input className={inputCls} style={style} value={form.rge} onChange={e => set("rge", e.target.value)} placeholder="es. 100/2020" />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: '#7A7268', ...style }}>Prezzo base d'asta (€)</label>
              <input className={`${inputCls} text-lg font-bold`} style={{ ...style, borderColor: '#16a34a', color: '#16a34a' }}
                type="number" value={form.prezzo_base} onChange={e => set("prezzo_base", e.target.value)} placeholder="es. 85000" />
            </div>
          </div>

          {/* Dati catastali */}
          <div className="bg-white border border-border p-5 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-3" style={{ color: '#B33A2A', ...style }}>Dati Catastali</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: '#7A7268', ...style }}>Comune *</label>
                <input className={inputCls} style={style} value={form.comune} onChange={e => set("comune", e.target.value)} placeholder="es. Genova" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: '#7A7268', ...style }}>Provincia</label>
                <input className={inputCls} style={style} value={form.provincia} onChange={e => set("provincia", e.target.value)} placeholder="es. GE" />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: '#7A7268', ...style }}>Regione</label>
              <input className={inputCls} style={style} value={form.regione} onChange={e => set("regione", e.target.value)} placeholder="es. Liguria" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: '#7A7268', ...style }}>Indirizzo</label>
              <input className={inputCls} style={style} value={form.indirizzo} onChange={e => set("indirizzo", e.target.value)} placeholder="es. Via Roma 10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: '#7A7268', ...style }}>Foglio *</label>
                <input className={inputCls} style={style} value={form.foglio} onChange={e => set("foglio", e.target.value)} placeholder="es. 12" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: '#7A7268', ...style }}>Particella *</label>
                <input className={inputCls} style={style} value={form.particella} onChange={e => set("particella", e.target.value)} placeholder="es. 345" />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: '#7A7268', ...style }}>Subalterni (separati da virgola)</label>
              <input className={inputCls} style={style} value={form.subalterni} onChange={e => set("subalterni", e.target.value)} placeholder="es. 1, 2, 3 — lascia vuoto se unica unità" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: '#7A7268', ...style }}>Superficie totale (mq)</label>
              <input className={inputCls} style={style} type="number" value={form.superficie_mq} onChange={e => set("superficie_mq", e.target.value)} placeholder="es. 120" />
            </div>
          </div>

          {/* Note */}
          <div className="bg-white border border-border p-5">
            <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: '#7A7268', ...style }}>Note perizia</label>
            <textarea className={`${inputCls} resize-none h-20`} style={style} value={form.note} onChange={e => set("note", e.target.value)} placeholder="Annotazioni dalla perizia (stato conservativo, vincoli rilevati, ecc.)" />
          </div>

          {/* CTA */}
          <div className="bg-white border-2 border-primary p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold" style={{ color: '#1A3A6B', ...style }}>
                {subCount} {subCount === 1 ? "unità catastale" : "unità catastali"}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: '#7A7268', ...style }}>
                Costo analisi: <strong style={{ color: '#1A3A6B' }}>€{cost.toFixed(2)}</strong>
                {subCount > 1 ? ` (€2,99/unità — tariffa batch)` : " — tariffa singola"}
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.comune || !form.foglio || !form.particella}
              className="gap-2 px-6"
              style={{ background: '#1A3A6B', ...style }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
              Avvia Analisi UrbiCheck
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>

          <button onClick={() => setStep(1)} className="text-xs underline" style={{ color: '#7A7268', ...style }}>
            ← Carica un altro PDF
          </button>
        </motion.div>
      )}
    </div>
  );
}