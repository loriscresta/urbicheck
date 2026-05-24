import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronDown, ChevronUp, Info, Plus, X, Building2, AlertTriangle } from "lucide-react";
import ComuneAutocomplete from "@/components/search/ComuneAutocomplete";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import VisuraUploader from "@/components/search/VisuraUploader";

const FINALITA = [
  { value: "acquisto_privato", label: "Acquisto privato" },
  { value: "investimento", label: "Investimento" },
  { value: "sviluppo_immobiliare", label: "Sviluppo immobiliare" },
  { value: "asta_giudiziaria", label: "Asta giudiziaria" },
  { value: "due_diligence", label: "Due diligence" },
  { value: "valutazione_professionale", label: "Valutazione professionale" },
];

const STATO_CONSERVATIVO = [
  { value: "ottimo", label: "Ottimo" },
  { value: "buono", label: "Buono" },
  { value: "da_ristrutturare", label: "Da ristrutturare" },
  { value: "fatiscente", label: "Fatiscente" },
];

const DESTINAZIONE_OBIETTIVO = [
  { value: "flipping", label: "Flipping (acquisto + rivendita)" },
  { value: "affitto_lungo", label: "Affitto lungo termine" },
  { value: "affitto_breve", label: "Affitto breve (B&B/Airbnb)" },
  { value: "uso_proprio", label: "Uso proprio" },
];

const FIN_FINALITA = ["investimento", "sviluppo_immobiliare", "asta_giudiziaria"];
const MAX_UNITS = 20;
const BETA_MODE = true;

const FULL_PRICE_PER_UNIT = 9.90;
const BETA_PRICE_PER_UNIT = 2.99;

const BULK_TIERS_FULL = [
  { min: 1,  max: 1,  pricePerUnit: 9.90, discount: 0 },
  { min: 2,  max: 4,  pricePerUnit: 8.50, discount: 0.14 },
  { min: 5,  max: 9,  pricePerUnit: 7.90, discount: 0.20 },
  { min: 10, max: 19, pricePerUnit: 6.90, discount: 0.30 },
  { min: 20, max: Infinity, pricePerUnit: 5.90, discount: 0.40 },
];

const BULK_TIERS_BETA = [
  { min: 1,  max: 1,  pricePerUnit: 2.99, discount: 0 },
  { min: 2,  max: 4,  pricePerUnit: 2.59, discount: 0.13 },
  { min: 5,  max: 9,  pricePerUnit: 2.39, discount: 0.20 },
  { min: 10, max: 19, pricePerUnit: 1.99, discount: 0.33 },
  { min: 20, max: Infinity, pricePerUnit: 1.69, discount: 0.43 },
];

function getBulkPricing(unitCount, isBeta = true) {
  const tiers = isBeta ? BULK_TIERS_BETA : BULK_TIERS_FULL;
  const tier = tiers.find(t => unitCount >= t.min && unitCount <= t.max);
  const basePrice = isBeta ? BETA_PRICE_PER_UNIT : FULL_PRICE_PER_UNIT;
  return {
    pricePerUnit: tier.pricePerUnit,
    discount: tier.discount,
    totalPrice: +(tier.pricePerUnit * unitCount).toFixed(2),
    savings: +(basePrice * unitCount - tier.pricePerUnit * unitCount).toFixed(2),
  };
}

function discountLabel(unitCount) {
  if (unitCount >= 20) return "20+ unità: -40%";
  if (unitCount >= 10) return "10–19 unità: -30%";
  if (unitCount >= 5)  return "5–9 unità: -20%";
  if (unitCount >= 2)  return "2–4 unità: -13%";
  return "";
}

let _nextId = 1;
const nextId = () => _nextId++;

function newParcel(foglio = "", particella = "") {
  return { id: nextId(), foglio, particella, sezione: "", indirizzo: "", subs: [{ id: nextId(), value: "" }] };
}

export default function CadastralSearchForm({ onSubmit, isLoading, submitLabel = "Analizza →", userBalance = null }) {
  const [selectedComune, setSelectedComune] = useState(null);
  const [parcels, setParcels] = useState([newParcel()]);
  const [finalita, setFinalita] = useState("");
  const [showFinancial, setShowFinancial] = useState(false);
  const [visuraDati, setVisuraDati] = useState(null);
  const [planimetriaFile, setPlanimetriaFile] = useState(null);
  const [superficieMq, setSuperficieMq] = useState("");

  // Financial fields
  const [prezzoAcquisto, setPrezzoAcquisto] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [statoConservativo, setStatoConservativo] = useState("buono");
  const [destinazioneObiettivo, setDestinazioneObiettivo] = useState("");
  const [speseAccessorie, setSpeseAccessorie] = useState("10");

  const showFinancialSection = FIN_FINALITA.includes(finalita);
  const isInvestimento = finalita === "investimento";
  const finDataRequired = isInvestimento;
  const finDataFilled = !finDataRequired || (prezzoAcquisto && superficie);

  const totalUnits = parcels.reduce((sum, p) => sum + p.subs.length, 0);
  const pricing = getBulkPricing(totalUnits, BETA_MODE);
  const isBatch = totalUnits > 1;
  const hasSufficientBalance = userBalance === null || userBalance >= pricing.totalPrice;

  const isValid = selectedComune && parcels.every(p => p.foglio && p.particella) && finalita && finDataFilled && totalUnits <= MAX_UNITS;

  // ── Parcel helpers ──────────────────────────────────────────────────────────
  const updateParcel = (pid, field, value) =>
    setParcels(ps => ps.map(p => p.id === pid ? { ...p, [field]: value } : p));

  const addSub = (pid) => {
    setParcels(ps => ps.map(p => p.id === pid
      ? { ...p, subs: [...p.subs, { id: nextId(), value: "" }] }
      : p));
  };

  const removeSub = (pid, sid) => {
    setParcels(ps => ps.map(p => {
      if (p.id !== pid) return p;
      const newSubs = p.subs.filter(s => s.id !== sid);
      return { ...p, subs: newSubs.length ? newSubs : [{ id: nextId(), value: "" }] };
    }));
  };

  const updateSub = (pid, sid, value) => {
    setParcels(ps => ps.map(p => p.id === pid
      ? { ...p, subs: p.subs.map(s => s.id === sid ? { ...s, value } : s) }
      : p));
  };

  const addParcel = () => {
    if (totalUnits >= MAX_UNITS) return;
    setParcels(ps => [...ps, newParcel()]);
  };

  const removeParcel = (pid) => {
    setParcels(ps => ps.length > 1 ? ps.filter(p => p.id !== pid) : ps);
  };

  // ── Visura pre-fill ─────────────────────────────────────────────────────────
  const handleVisuraData = (dati) => {
    setVisuraDati(Object.keys(dati).length ? dati : null);
    if (dati.foglio || dati.particella) {
      setParcels([{
        ...newParcel(dati.foglio || "", dati.particella || ""),
        sezione: dati.sezione_form || "",
        indirizzo: dati.indirizzo_catastale || "",
        subs: [{ id: nextId(), value: dati.subalterno || "" }],
      }]);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;

    const sharedData = {
      comune_id: selectedComune.id,
      comune: selectedComune.nome,
      provincia: selectedComune.provincia,
      sigla_provincia: selectedComune.sigla_provincia,
      regione: selectedComune.regione,
      piano_tipo: selectedComune.piano_tipo || "",
      finalita,
      prezzo_acquisto: prezzoAcquisto,
      superficie,
      stato_conservativo: statoConservativo,
      destinazione_obiettivo: destinazioneObiettivo,
      spese_accessorie: speseAccessorie,
      ...(visuraDati ? {
        categoria_catastale: visuraDati.categoria_catastale,
        classe_catastale: visuraDati.classe_catastale,
        zona_censuaria: visuraDati.zona_censuaria,
        superficie_mq: visuraDati.superficie_mq,
        rendita_catastale: visuraDati.rendita_catastale,
        vani: visuraDati.vani,
        indirizzo_catastale: visuraDati.indirizzo_catastale,
        visura_uploaded: true,
        intestatari_visura: visuraDati.intestatari,
      } : {}),
    };

    const extraData = {
      planimetriaFile: planimetriaFile || undefined,
      superficie_manuale: superficieMq ? parseFloat(superficieMq) : undefined,
    };

    if (!isBatch) {
      // Single unit — backward-compatible
      const p = parcels[0];
      onSubmit({
        ...sharedData, ...extraData,
        foglio: p.foglio,
        particella: p.particella,
        subalterno: p.subs[0].value,
        sezione_catastale: p.sezione?.trim().toUpperCase() || undefined,
        indirizzo_immobile: p.indirizzo?.trim() || undefined,
      });
    } else {
      // Batch mode
      const units = [];
      for (const p of parcels) {
        for (const s of p.subs) {
          units.push({
            foglio: p.foglio,
            particella: p.particella,
            subalterno: s.value,
            sezione_catastale: p.sezione?.trim().toUpperCase() || undefined,
            indirizzo_immobile: p.indirizzo?.trim() || undefined,
          });
        }
      }
      onSubmit({ ...sharedData, ...extraData, _batch: true, units, bulkPricing: pricing });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Visura uploader */}
      <VisuraUploader onDataExtracted={handleVisuraData} />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">oppure inserisci manualmente</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Comune */}
      <ComuneAutocomplete selectedComune={selectedComune} onSelect={setSelectedComune} required />

      {/* Dati catastali — multi-parcel */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dati catastali</p>
          {isBatch && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: '#1A3A6B', color: '#fff', fontFamily: "'IBM Plex Mono', monospace" }}>
              <Building2 className="w-3 h-3 inline mr-1" />
              {totalUnits} unità
            </span>
          )}
        </div>

        <div className="space-y-4">
          {parcels.map((parcel, pi) => (
            <div key={parcel.id} className="border border-border rounded-lg p-4 space-y-3" style={{ background: '#fafaf8' }}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Immobile {pi + 1}
                </p>
                {parcels.length > 1 && (
                  <button type="button" onClick={() => removeParcel(parcel.id)}
                    className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Foglio *</Label>
                  <Input value={parcel.foglio} onChange={e => updateParcel(parcel.id, 'foglio', e.target.value)} placeholder="es. 15" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Particella *</Label>
                  <Input value={parcel.particella} onChange={e => updateParcel(parcel.id, 'particella', e.target.value)} placeholder="es. 342" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs">Sezione</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          La sezione catastale (A, B, C…) è visibile sulla tua visura. Lascia vuoto se non presente.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    value={parcel.sezione}
                    onChange={e => updateParcel(parcel.id, 'sezione', e.target.value.toUpperCase())}
                    placeholder="es. A, PL"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Via / Indirizzo <span className="text-muted-foreground">(opzionale)</span></Label>
                <Input
                  value={parcel.indirizzo}
                  onChange={e => updateParcel(parcel.id, 'indirizzo', e.target.value)}
                  placeholder="es. Via della Libertà 1"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Subalterni</Label>
                {parcel.subs.map((sub, si) => (
                  <div key={sub.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-8 shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Sub.</span>
                    <Input
                      value={sub.value}
                      onChange={e => updateSub(parcel.id, sub.id, e.target.value)}
                      placeholder={`es. ${si + 1}`}
                      className="flex-1 h-8 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeSub(parcel.id, sub.id)}
                      disabled={parcel.subs.length === 1}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {totalUnits < MAX_UNITS && (
                  <button
                    type="button"
                    onClick={() => addSub(parcel.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                    style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    <Plus className="w-3.5 h-3.5" /> + Aggiungi subalterno
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          {totalUnits < MAX_UNITS ? (
            <button
              type="button"
              onClick={addParcel}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 border rounded transition-colors hover:bg-stone-50"
              style={{ borderColor: '#C4BAA8', color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <Plus className="w-3.5 h-3.5" /> + Aggiungi immobile (foglio/particella diversi)
            </button>
          ) : (
            <p className="text-xs text-amber-700 flex items-center gap-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <AlertTriangle className="w-3.5 h-3.5" /> Limite massimo di {MAX_UNITS} unità per batch raggiunto
            </p>
          )}
        </div>
      </div>

      {/* Planimetria catastale upload */}
      <div className="border-2 border-dashed border-border rounded-lg p-4 space-y-2">
        <Label className="flex items-center gap-2 cursor-pointer">
          📐 Allega planimetria catastale <span className="text-muted-foreground text-xs">(opzionale)</span>
        </Label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={e => setPlanimetriaFile(e.target.files?.[0] || null)}
          className="block text-xs text-muted-foreground w-full cursor-pointer file:mr-3 file:py-1 file:px-3 file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground file:cursor-pointer hover:file:opacity-90"
        />
        <p className="text-[10px] text-muted-foreground">Formati: PDF, JPG, PNG — Max 10MB — L'AI estraerà superficie e vani per calcoli più precisi</p>
        {planimetriaFile && <p className="text-xs text-emerald-700 font-semibold">✓ {planimetriaFile.name} allegata</p>}
        <a href="https://sister.agenziaentrate.gov.it/CitizenArAccessWeb/" target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary hover:underline">→ Come scaricare la planimetria dall'Agenzia delle Entrate</a>
      </div>

      {/* Superficie manuale */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label>Superficie nota (mq)</Label>
          <span className="text-xs text-muted-foreground">(opzionale — migliora l'analisi finanziaria)</span>
        </div>
        <Input
          type="number"
          value={superficieMq}
          onChange={e => setSuperficieMq(e.target.value)}
          placeholder="es. 85 mq"
        />
      </div>

      {/* Finalità */}
      <div className="space-y-1.5">
        <Label>Finalità dell'analisi *</Label>
        <Select value={finalita} onValueChange={v => { setFinalita(v); if (!FIN_FINALITA.includes(v)) setShowFinancial(false); }}>
          <SelectTrigger><SelectValue placeholder="Seleziona finalità..." /></SelectTrigger>
          <SelectContent>
            {FINALITA.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Sezione finanziaria */}
      <div style={{ display: showFinancialSection ? 'block' : 'none' }}>
        <div className={`rounded-lg border p-4 space-y-4 ${finDataRequired ? 'border-primary bg-blue-50/40' : 'border-border bg-muted/30'}`}>
          {finDataRequired ? (
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1A3A6B' }}>
              Dati finanziari <span className="text-accent ml-1">* obbligatorio</span>
            </p>
          ) : (
            <button type="button" className="flex items-center gap-2 w-full text-left" onClick={() => setShowFinancial(v => !v)}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
                Dati finanziari (opzionale — per analisi investimento)
              </p>
              {showFinancial ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          )}
          <div style={{ display: (finDataRequired || showFinancial) ? 'grid' : 'none' }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prezzo di acquisto (€)</Label>
              <Input type="number" value={prezzoAcquisto} onChange={e => setPrezzoAcquisto(e.target.value)} placeholder="es. 150000" />
            </div>
            <div className="space-y-1.5">
              <Label>Superficie stimata (mq)</Label>
              <Input type="number" value={superficie} onChange={e => setSuperficie(e.target.value)} placeholder="es. 80" />
            </div>
            <div className="space-y-1.5">
              <Label>Stato conservativo</Label>
              <Select value={statoConservativo} onValueChange={setStatoConservativo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATO_CONSERVATIVO.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Destinazione obiettivo</Label>
              <Select value={destinazioneObiettivo} onValueChange={setDestinazioneObiettivo}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>
                  {DESTINAZIONE_OBIETTIVO.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Spese accessorie (%)</Label>
              <Input type="number" value={speseAccessorie} onChange={e => setSpeseAccessorie(e.target.value)} placeholder="es. 10" />
              <p className="text-xs text-muted-foreground">Notaio, agenzia, imposte — tipicamente 8–12%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing summary — only for batch */}
      {isBatch && (
        <div className={`rounded-lg border-2 p-4 ${hasSufficientBalance ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
          <div className="flex items-start gap-3">
            <Building2 className={`w-5 h-5 shrink-0 mt-0.5 ${hasSufficientBalance ? 'text-emerald-700' : 'text-amber-700'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold" style={{ color: hasSufficientBalance ? '#065f46' : '#92400e', fontFamily: "'IBM Plex Mono', monospace" }}>
                  Analisi batch — {totalUnits} unità
                </p>
                {pricing.discount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#1A3A6B', color: '#fff', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {discountLabel(totalUnits)}
                  </span>
                )}
              </div>
              <div className="space-y-1 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: hasSufficientBalance ? '#065f46' : '#92400e' }}>
                <div className="flex justify-between">
                  <span>Prezzo unitario:</span>
                  <span className="font-semibold">€{pricing.pricePerUnit.toFixed(2)}/ud{pricing.discount > 0 ? ` (sconto ${Math.round(pricing.discount * 100)}%)` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>Totale:</span>
                  <span className="font-bold text-sm">€{pricing.totalPrice.toFixed(2)}</span>
                </div>
                {pricing.savings > 0 && (
                  <div className="flex justify-between opacity-80">
                    <span>Risparmio:</span>
                    <span>€{pricing.savings.toFixed(2)} vs ricerche singole</span>
                  </div>
                )}
                {userBalance !== null && (
                  <div className={`flex justify-between pt-1 mt-1 border-t ${hasSufficientBalance ? 'border-emerald-300' : 'border-amber-300'}`}>
                    <span>Saldo disponibile:</span>
                    <span className="font-semibold">
                      €{userBalance.toFixed(2)}
                      {hasSufficientBalance ? ' ✓ Crediti sufficienti' : ' ⚠ Crediti insufficienti'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={!isValid || isLoading || (isBatch && !hasSufficientBalance)}
        className="w-full font-semibold"
        style={{ background: '#1A3A6B', borderRadius: '0', borderBottom: '3px solid #B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}
        size="lg"
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Analisi in corso... (30–60s per unità)</>
        ) : isBatch ? `Conferma e Analizza ${totalUnits} unità →` : submitLabel}
      </Button>

      {!isValid && (
        <p className="text-xs text-center" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
          {finDataRequired && !(prezzoAcquisto && superficie)
            ? '* Per finalità "Investimento" inserisci prezzo di acquisto e superficie'
            : parcels.some(p => !p.foglio || !p.particella)
            ? "Inserisci foglio e particella per ogni immobile"
            : "Inserisci comune, dati catastali e finalità per procedere"}
        </p>
      )}
    </form>
  );
}