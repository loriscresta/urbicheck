import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { parseVisuraCatastale } from "@/functions/parseVisuraCatastale";
import { Loader2, FileUp, CheckCircle2, X, AlertCircle, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VisuraUploader({ onDataExtracted }) {
  const [multiSubData, setMultiSubData] = useState(null); // { subs, foglio, particella, ...dati }
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [pertinenzaSelections, setPertinenzaSelections] = useState(null); // { [idx]: 'si'|'no'|'unknown' }
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
    setMultiSubData(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Parallel: parse main data + extract ALL subalterns
      const [res, multiRes] = await Promise.all([
        parseVisuraCatastale({ file_url }),
        base44.integrations.Core.InvokeLLM({
          prompt: `Sei un esperto di visure catastali italiane. Analizza questo documento ed estrai TUTTI i subalterni presenti (potrebbero essere da 1 a 20+).\n\nSe il documento è una "visura sintetica per soggetto" con più unità, estrai TUTTI i subalterni dalla tabella immobili.\n\nPer ogni subalterno estrai: numero subalterno, categoria catastale (es. A/2, C/6), piano (es. "piano 1", "piano terra"), superficie in mq (numero), numero vani (numero), rendita catastale in euro (numero).\n\nSe non trovi un valore lascia null.`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              subalterns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    subalterno: { type: "string" },
                    categoria: { type: "string" },
                    piano: { type: "string" },
                    superficie_mq: { type: "number" },
                    vani: { type: "number" },
                    rendita_catastale: { type: "number" }
                  }
                }
              }
            }
          }
        })
      ]);

      const dati = res?.data?.dati || res?.dati || {};
      const allSubs = Array.isArray(multiRes?.subalterns) ? multiRes.subalterns : [];

      // Rileva visura sintetica per soggetto
      const isSintetica = dati.tipo_visura === 'sintetica_per_soggetto';
      const numUnita = dati.num_unita_totali || allSubs.length;

      if (isSintetica && allSubs.length > 1) {
        setMultiSubData({ subs: allSubs, ...dati, _isSintetica: true });
      } else if (allSubs.length > 1) {
        // Multi-sub standard
        setMultiSubData({ subs: allSubs, ...dati });
      } else if (dati.foglio && dati.particella && dati.comune) {
        // Singola unità trovata
        setExtracted(dati);
        onDataExtracted(dati);
      } else if (allSubs.length === 1) {
        // Un solo subalterno trovato da AI — unisci con dati principali
        const merged = { ...dati, subalterno: dati.subalterno || allSubs[0]?.subalterno };
        setExtracted(merged);
        onDataExtracted(merged);
      } else {
        // Nessun dato estrattibile
        setError("Formato visura non riconosciuto — inserisci i dati manualmente.");
      }
    } catch (err) {
      console.warn("Visura parsing failed:", err?.message || err);
      setError("Non sono riuscito a leggere la visura — inserisci i dati manualmente qui sotto.");
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

  // Sync pertinenza selections when multiSubData changes
  React.useEffect(() => {
    if (!multiSubData?.subs) { setPertinenzaSelections(null); return; }
    const subs = multiSubData.subs;
    const hasResidential = subs.some(s => /^A\//i.test(s.categoria || ''));
    const hasAccessory = subs.some(s => /^(C\/2|C\/6|C\/7)/i.test(s.categoria || ''));
    if (hasResidential && hasAccessory) {
      setPertinenzaSelections(
        subs.reduce((acc, s, i) => {
          if (/^(C\/2|C\/6|C\/7)/i.test(s.categoria || '')) acc[i] = 'unknown';
          else acc[i] = 'no';
          return acc;
        }, {})
      );
    } else {
      setPertinenzaSelections(null);
    }
  }, [multiSubData]);

  const handleReset = () => {
    setExtracted(null);
    setError(null);
    setMultiSubData(null);
    setPertinenzaSelections(null);
    if (inputRef.current) inputRef.current.value = "";
    onDataExtracted({});
  };

  const handleAnalizzaTutti = () => {
    const dati = { ...multiSubData, _allSubalterns: multiSubData.subs };
    setExtracted(dati);
    setMultiSubData(null);
    onDataExtracted(dati);
  };

  const handleAnalizzaSolo = () => {
    const { subs, ...dati } = multiSubData;
    setExtracted(dati);
    setMultiSubData(null);
    onDataExtracted(dati);
  };

  // Multi-subalterno confirm UI
  if (multiSubData) {
    const subs = multiSubData.subs;
    const isSintetica = multiSubData._isSintetica === true;
    const hasResidential = subs.some(s => /^A\//i.test(s.categoria || ''));
    const hasAccessory = subs.some(s => /^(C\/2|C\/6|C\/7)/i.test(s.categoria || ''));
    const hasMixedAC = hasResidential && hasAccessory;

    const handlePertinenzaChoice = (idx, choice) => {
      setPertinenzaSelections(prev => ({ ...prev, [idx]: choice }));
    };

    const allPertinenzeResolved = !hasMixedAC || (pertinenzaSelections && Object.values(pertinenzaSelections).every(v => v !== 'unknown'));
    const hasPertinenzeYes = hasMixedAC && pertinenzaSelections && Object.values(pertinenzaSelections).some(v => v === 'si');

    const handleAnalizzaTuttiWithPertinenze = () => {
      const taggedSubs = subs.map((s, i) => ({
        ...s,
        is_pertinenza: pertinenzaSelections[i] === 'si',
      }));
      const dati = { ...multiSubData, _allSubalterns: taggedSubs, _hasPertinenze: hasPertinenzeYes };
      setExtracted(dati);
      setMultiSubData(null);
      onDataExtracted(dati);
    };

    if (hasMixedAC && !allPertinenzeResolved) {
      // Mostra UI pertinenze: per ogni C/x, chiedi all'utente
      return (
        <div className="mb-6 border-2 border-amber-400 rounded-lg p-4 bg-amber-50" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <div className="flex items-start gap-3 mb-4">
            <Building2 className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm" style={{ color: '#92400e' }}>
                {isSintetica ? `Visura sintetica — ${subs.length} unità immobiliari rilevate` : `Trovati ${subs.length} subalterni — alcuni potrebbero essere pertinenze`}
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                F.{multiSubData.foglio} P.{multiSubData.particella} — {multiSubData.comune || '—'}
                {isSintetica
                  ? ' · Visura sintetica per soggetto: elenca tutte le unità intestate.'
                  : ' · Le categorie C/2 (cantina), C/6 (box/garage), C/7 (tettoia) sono spesso pertinenze di un\'abitazione. Una pertinenza non consuma crediti aggiuntivi.'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs border-collapse bg-white rounded">
              <thead>
                <tr className="bg-amber-100">
                  {['Sub.', 'Categoria', 'Superficie', 'Vani', 'Rendita', 'È pertinenza?'].map(h => (
                    <th key={h} className="border border-amber-200 px-2 py-1.5 text-left font-semibold text-[10px] uppercase tracking-wide text-amber-900">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map((s, i) => {
                  const isC = /^(C\/2|C\/6|C\/7)/i.test(s.categoria || '');
                  const isA = /^A\//i.test(s.categoria || '');
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}>
                      <td className="border border-amber-200 px-2 py-1.5 font-bold">{s.subalterno || '—'}</td>
                      <td className="border border-amber-200 px-2 py-1.5">
                        <span className={isA ? 'text-emerald-700 font-semibold' : isC ? 'text-amber-700' : ''}>
                          {s.categoria || '—'}
                        </span>
                      </td>
                      <td className="border border-amber-200 px-2 py-1.5">{s.superficie_mq ? `${s.superficie_mq} mq` : '—'}</td>
                      <td className="border border-amber-200 px-2 py-1.5">{s.vani ?? '—'}</td>
                      <td className="border border-amber-200 px-2 py-1.5">{s.rendita_catastale ? `€${s.rendita_catastale.toLocaleString('it-IT')}` : '—'}</td>
                      <td className="border border-amber-200 px-2 py-1.5">
                        {isC ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handlePertinenzaChoice(i, 'si')}
                              className={`px-2 py-0.5 text-[10px] rounded border font-semibold transition-colors ${
                                pertinenzaSelections[i] === 'si'
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-100'
                              }`}
                            >
                              Sì, è pertinenza
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePertinenzaChoice(i, 'no')}
                              className={`px-2 py-0.5 text-[10px] rounded border font-semibold transition-colors ${
                                pertinenzaSelections[i] === 'no'
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white text-primary border-border hover:bg-blue-50'
                              }`}
                            >
                              No, unità separata
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-700">Unità principale</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              onClick={handleAnalizzaTuttiWithPertinenze}
              className="flex-1 gap-2"
              style={{ background: hasPertinenzeYes ? '#d97706' : '#1A3A6B' }}
            >
              <Users className="w-4 h-4" />
              {hasPertinenzeYes
                ? `Analizza — ${subs.length - (pertinenzaSelections ? Object.values(pertinenzaSelections).filter(v => v === 'si').length : 0)} unità (+ pertinenze)`
                : `Analizza tutti ${subs.length} subalterni`}
            </Button>
            <Button type="button" variant="outline" onClick={handleAnalizzaSolo} className="flex-1">
              Solo 1 subalterno
            </Button>
          </div>
        </div>
      );
    }

    // All subs are residential (A/x) or pertinenze resolved — standard multi-sub UI
    return (
      <div className="mb-6 border-2 border-primary rounded-lg p-4 bg-blue-50" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        <div className="flex items-start gap-3 mb-4">
          <Building2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm" style={{ color: '#1A3A6B' }}>
              {isSintetica ? `Visura sintetica — ${subs.length} unità immobiliari` : `Trovati ${subs.length} subalterni nella visura`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              F.{multiSubData.foglio} P.{multiSubData.particella} — {multiSubData.comune || '—'}
              {isSintetica ? ' · Visura sintetica per soggetto: tutte le unità intestate' : ''}
              {hasMixedAC && hasPertinenzeYes && pertinenzaSelections ? ` — ${Object.values(pertinenzaSelections).filter(v => v === 'si').length} pertinenze rilevate` : ''}
              — Come vuoi procedere?
            </p>
          </div>
        </div>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-white">
                {['Sub.', 'Categoria', 'Piano', 'Superficie', 'Vani', 'Rendita', 'Tipo'].map(h => (
                  <th key={h} className="border border-border px-2 py-1.5 text-left font-semibold text-[10px] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.map((s, i) => {
                const isPertinenza = s.is_pertinenza === true;
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/50'}>
                    <td className="border border-border px-2 py-1 font-bold">{s.subalterno || '—'}</td>
                    <td className="border border-border px-2 py-1">{s.categoria || '—'}</td>
                    <td className="border border-border px-2 py-1">{s.piano || '—'}</td>
                    <td className="border border-border px-2 py-1">{s.superficie_mq ? `${s.superficie_mq} mq` : '—'}</td>
                    <td className="border border-border px-2 py-1">{s.vani ?? '—'}</td>
                    <td className="border border-border px-2 py-1">{s.rendita_catastale ? `€${s.rendita_catastale.toLocaleString('it-IT')}` : '—'}</td>
                    <td className="border border-border px-2 py-1">
                      {isPertinenza
                        ? <span className="text-[10px] text-amber-700 font-semibold">Pertinenza</span>
                        : <span className="text-[10px] text-emerald-700">Unità</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="button" onClick={hasMixedAC ? handleAnalizzaTuttiWithPertinenze : handleAnalizzaTutti} className="flex-1 gap-2" style={{ background: '#1A3A6B' }}>
            <Users className="w-4 h-4" />
            Analizza tutti {subs.length} subalterni <span className="opacity-70 text-xs">(consigliato)</span>
          </Button>
          <Button type="button" variant="outline" onClick={handleAnalizzaSolo} className="flex-1">
            Solo 1 subalterno
          </Button>
        </div>
      </div>
    );
  }

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
        <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
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