import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { parseVisuraCatastale } from "@/functions/parseVisuraCatastale";
import { Loader2, FileUp, CheckCircle2, X, AlertCircle } from "lucide-react";

export default function VisuraUploader({ onDataExtracted }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setError("Formato non supportato. Carica un PDF o un'immagine (JPG, PNG).");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setExtracted(null);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Parse visura
      const res = await parseVisuraCatastale({ file_url });
      const dati = res?.data?.dati || res?.dati || {};

      setExtracted(dati);
      onDataExtracted(dati);
    } catch (err) {
      setError("Errore durante l'analisi: " + (err.message || "riprova"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleReset = () => {
    setExtracted(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onDataExtracted({});
  };

  return (
    <div className="mb-6">
      {!extracted ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-5 text-center transition-colors cursor-pointer ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isAnalyzing && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          {isAnalyzing ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm font-medium text-primary">Analisi visura in corso…</p>
              <p className="text-xs text-muted-foreground">Estrazione dati catastali automatica</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <FileUp className="w-6 h-6 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">
                📄 Carica Visura Catastale — compila automaticamente i dati
              </p>
              <p className="text-xs text-muted-foreground">
                PDF o immagine · trascina o clicca per selezionare
              </p>
            </div>
          )}
        </div>
      ) : (
        <ExtractedBanner dati={extracted} onReset={handleReset} />
      )}

      {error && (
        <div className="mt-2 flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function ExtractedBanner({ dati, onReset }) {
  const parts = [];
  if (dati.indirizzo_catastale) parts.push(dati.indirizzo_catastale);
  if (dati.categoria_catastale) parts.push(`Cat. ${dati.categoria_catastale}`);
  if (dati.rendita_catastale) parts.push(`Rendita €${dati.rendita_catastale.toLocaleString("it-IT")}`);
  if (dati.superficie_mq) parts.push(`${dati.superficie_mq} mq`);

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-emerald-300 bg-emerald-50">
      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-emerald-800">
          ✅ Visura analizzata — dati pre-compilati
        </p>
        {parts.length > 0 && (
          <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
            {parts.join(" · ")}
          </p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-emerald-700 font-mono">
          {dati.foglio && <span>Foglio: <strong>{dati.foglio}</strong></span>}
          {dati.particella && <span>Particella: <strong>{dati.particella}</strong></span>}
          {dati.subalterno && <span>Sub: <strong>{dati.subalterno}</strong></span>}
          {dati.sezione_form && <span>Sez. INSPIRE: <strong>{dati.sezione_form}</strong></span>}
        </div>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="text-emerald-600 hover:text-emerald-800 shrink-0"
        title="Rimuovi visura caricata"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}