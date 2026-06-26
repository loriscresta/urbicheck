import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronDown, ChevronUp, Info, Plus, X, Building2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { calculatePlanimetriaArea } from "@/functions/calculatePlanimetriaArea";
import ComuneAutocomplete from "@/components/search/ComuneAutocomplete";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import VisuraUploader from "@/components/search/VisuraUploader";
import IndirizzoAutocomplete from "@/components/search/IndirizzoAutocomplete";

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
  { min: 1,  max: 1,  pricePerUnit: 9.90,  discount: 0    },
  { min: 2,  max: 4,  pricePerUnit: 8.50,  discount: 0.14 },
  { min: 5,  max: 9,  pricePerUnit: 7.90,  discount: 0.20 },
  { min: 10, max: 19, pricePerUnit: 6.90,  discount: 0.30 },
  { min: 20, max: Infinity, pricePerUnit: 5.90, discount: 0.40 },
];

const BULK_TIERS_BETA = [
  { min: 1,  max: 1,  pricePerUnit: 2.99,  discount: 0    },
  { min: 2,  max: 4,  pricePerUnit: 2.59,  discount: 0.13 },
  { min: 5,  max: 9,  pricePerUnit: 2.39,  discount: 0.20 },
  { min: 10, max: 19, pricePerUnit: 1.99,  discount: 0.33 },
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

export default function CadastralSearchForm({ onSubmit, isLoading, submitLabel = "Analizza →", userBalance = null, initialBatchData = null, prefillData = null, initialAddress = null }) {
  const [selectedComune, setSelectedComune] = useState(null);
  const [parcels, setParcels] = useState([newParcel()]);
  const [snapInfo, setSnapInfo] = useState(null); // { snapped: bool, snap_dist_m: number }
  const [finalita, setFinalita] = useState("");
  const [showFinancial, setShowFinancial] = useState(false);
  const [visuraDati, setVisuraDati] = useState(null);
  const [planimetriaFile, setPlanimetriaFile] = useState(null);
  const [planimetriaFormato, setPlanimetriaFormato] = useState(null);
  const [planimetriaSuperficie, setPlanimetriaSuperficie] = useState(null); // number | 'failed' | null
  const [planimetriaCalcoloLoading, setPlanimetriaCalcoloLoading] = useState(false);
  const [superficieMq, setSuperficieMq] = useState("");
  const [totalAcquisitionPrice, setTotalAcquisitionPrice] = useState("");
  const [prezzoBaseAsta, setPrezzoBaseAsta] = useState("");
  const [batchPertinenze, setBatchPertinenze] = useState(null); // null=unasked, true=yes, false=no
  const [accordionOpen, setAccordionOpen] = useState(false);

  // Financial fields
  const [prezzoAcquisto, setPrezzoAcquisto] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [statoConservativo, setStatoConservativo] = useState("buono");
  const [destinazioneObiettivo, setDestinazioneObiettivo] = useState("");
  const [speseAccessorie, setSpeseAccessorie] = useState("10");

  // ── Restore batch state after credit purchase ─────────────────────────────
  useEffect(() => {
    if (!initialBatchData) return;
    const d = initialBatchData;

    // Reconstruct comune
    if (d.comune_id) {
      setSelectedComune({
        id: d.comune_id,
        nome: d.comune || '',
        provincia: d.provincia || '',
        regione: d.regione || '',
        sigla_provincia: d.sigla_provincia || '',
        piano_tipo: d.piano_tipo || '',
      });
    }

    // Reconstruct parcels from units
    if (d.units?.length) {
      const parcelMap = new Map();
      for (const u of d.units) {
        const key = `${u.foglio || ''}|${u.particella || ''}`;
        if (!parcelMap.has(key)) {
          parcelMap.set(key, {
            id: nextId(),
            foglio: u.foglio || '',
            particella: u.particella || '',
            sezione: u.sezione_catastale || '',
            indirizzo: u.indirizzo_immobile || '',
            subs: [],
          });
        }
        parcelMap.get(key).subs.push({ id: nextId(), value: u.subalterno || '' });
      }
      const reconstructed = [...parcelMap.values()].map(p => ({
        ...p,
        subs: p.subs.length ? p.subs : [{ id: nextId(), value: '' }],
      }));
      if (reconstructed.length) setParcels(reconstructed);
    }

    if (d.finalita) setFinalita(d.finalita);
    if (d.prezzo_acquisto) setPrezzoAcquisto(d.prezzo_acquisto);
    if (d.superficie) setSuperficie(d.superficie);
    if (d.stato_conservativo) setStatoConservativo(d.stato_conservativo);
    if (d.destinazione_obiettivo) setDestinazioneObiettivo(d.destinazione_obiettivo);
    if (d.spese_accessorie) setSpeseAccessorie(d.spese_accessorie);
    if (d._batchPertinenze !== undefined) setBatchPertinenze(d._batchPertinenze);
    if (d.total_acquisition_price) setTotalAcquisitionPrice(String(d.total_acquisition_price));
    if (d.superficie_manuale) setSuperficieMq(String(d.superficie_manuale));
  }, [initialBatchData]);

  // ── Pre-fill from example button ──────────────────────────────────────────
  useEffect(() => {
    if (!prefillData) return;
    if (prefillData.comune) {
      base44.entities.ComuneItalia.filter({ nome: prefillData.comune }, "-created_date", 1).then(results => {
        if (results[0]) setSelectedComune(results[0]);
      }).catch(() => {});
    }
    if (prefillData.foglio) {
      setParcels([{ ...newParcel(prefillData.foglio, prefillData.particella || ""), sezione: prefillData.sezione || "" }]);
    }
    if (prefillData.finalita) setFinalita(prefillData.finalita);
    setTimeout(() => {
      const el = document.querySelector('[data-search-form]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }, [prefillData]);

  const showFinancialSection = FIN_FINALITA.includes(finalita);
  const isInvestimento = finalita === "investimento";
  const finDataRequired = isInvestimento;
  const finDataFilled = !finDataRequired || (prezzoAcquisto && superficie);

  const totalUnits = parcels.reduce((sum, p) => sum + p.subs.length, 0);
  const effectiveUnits = batchPertinenze === true ? 1 : totalUnits;
  const pricing = getBulkPricing(effectiveUnits, BETA_MODE);
  const isBatch = totalUnits > 1;
  const hasSufficientBalance = userBalance === null || userBalance >= pricing.totalPrice;

  const isValid = selectedComune && parcels.every(p => p.foglio && p.particella) && finalita && finDataFilled && totalUnits <= MAX_UNITS && (!isBatch || batchPertinenze !== null);

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

  // ── Planimetria calculation — auto-detect scale, no format selection needed ──
  const handlePlanimetriaCalcolo = async (file) => {
    if (!file) return;
    setPlanimetriaSuperficie(null);
    setPlanimetriaCalcoloLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // query_id=null: calcola senza salvare su DB (verrà salvato al submit)
      const res = await calculatePlanimetriaArea({ file_url, query_id: null });
      const mq = res?.data?.area_mq;  // FIX: era superficie_mq, ora area_mq
      if (mq && mq > 5 && mq < 5000) {
        setPlanimetriaSuperficie(mq);
        setSuperficieMq(String(mq));
      } else {
        setPlanimetriaSuperficie('failed');
      }
    } catch {
      setPlanimetriaSuperficie('failed');
    } finally {
      setPlanimetriaCalcoloLoading(false);
    }
  };

  // ── Visura pre-fill ─────────────────────────────────────────────────────────
  const handleVisuraData = async (dati) => {
    if (!dati || !Object.keys(dati).length) { setVisuraDati(null); setPrezzoBaseAsta(""); return; }
    // Pre-fill prezzo base asta
    if (dati.prezzo_base_asta) setPrezzoBaseAsta(String(dati.prezzo_base_asta));
    // Auto-select comune by name
    if (dati.comune) {
      try {
        const results = await base44.entities.ComuneItalia.filter({ nome: dati.comune }, "-created_date", 1);
        if (results[0]) setSelectedComune(results[0]);
      } catch {}
    }
    setVisuraDati(dati);
    if (dati._allSubalterns && dati._allSubalterns.length > 1) {
      setParcels([{
        ...newParcel(dati.foglio || "", dati.particella || ""),
        sezione: dati.sezione_form || "",
        indirizzo: dati.indirizzo_catastale || "",
        subs: dati._allSubalterns.map(s => ({ id: nextId(), value: s.subalterno || "" })),
      }]);
    } else if (dati.foglio || dati.particella) {
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
        codice_comune_catasto: visuraDati.codice_comune_catasto,
        visura_uploaded: true,
        intestatari_visura: visuraDati.intestatari,
      } : {}),
    };

    const extraData = {
      planimetriaFile: planimetriaFile || undefined,
      superficie_manuale: superficieMq ? parseFloat(superficieMq) : undefined,
    };

    if (!isBatch) {
      const p = parcels[0];
      onSubmit({
        ...sharedData, ...extraData,
        foglio: p.foglio,
        particella: p.particella,
        subalterno: p.subs[0].value,
        sezione_catastale: p.sezione?.trim().toUpperCase() || undefined,
        indirizzo_immobile: p.indirizzo?.trim() || undefined,
        _snap_info: snapInfo || undefined,
      });
    } else {
      // Batch mode — enrich units with per-sub visura data when available
      const allSubsFromVisura = visuraDati?._allSubalterns || [];
      const units = [];
      for (const p of parcels) {
        for (const s of p.subs) {
          const subVis = allSubsFromVisura.find(a => String(a.subalterno) === String(s.value)) || {};
          units.push({
            foglio: p.foglio,
            particella: p.particella,
            subalterno: s.value,
            sezione_catastale: p.sezione?.trim().toUpperCase() || undefined,
            indirizzo_immobile: p.indirizzo?.trim() || undefined,
            ...(subVis.superficie_mq ? { superficie_mq: subVis.superficie_mq } : {}),
            ...(subVis.vani ? { vani: subVis.vani } : {}),
            ...(subVis.rendita_catastale ? { rendita_catastale: subVis.rendita_catastale } : {}),
            ...(subVis.categoria ? { categoria_catastale: subVis.categoria } : {}),
            ...(subVis.is_pertinenza ? { is_pertinenza: true } : {}),
          });
        }
      }
      onSubmit({
        ...sharedData, ...extraData,
        _batch: true,
        units,
        bulkPricing: pricing,
        total_acquisition_price: parseFloat(totalAcquisitionPrice) || undefined,
        _hasPertinenze: visuraDati?._hasPertinenze || false,
        _batchPertinenze: batchPertinenze === true,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-search-form>
      {/* Cerca per indirizzo */}
      <IndirizzoAutocomplete
        initialAddress={initialAddress}
        onComuneFound={(comuneName) => {
          base44.entities.ComuneItalia.filter({ nome: comuneName }, "-created_date", 1).then(results => {
            if (results[0]) setSelectedComune(results[0]);
          }).catch(() => {});
        }}
        onParcelFound={({ foglio, particella, sezione, snapped, snap_dist_m }) => {
          setSnapInfo(snapped ? { snapped: true, snap_dist_m: snap_dist_m ?? null } : null);
          setParcels(ps => {
            if (!ps.length) return [{ ...newParcel(foglio, particella), sezione: sezione || "" }];
            return ps.map((p, i) => i === 0 ? { ...p, foglio, particella, sezione: sezione || p.sezione } : p);
          });
        }}
        onResetParcel={() => {
          setParcels(ps => ps.map((p, i) => i === 0 ? { ...p, foglio: "", particella: "", sezione: "" } : p));
        }}
        onResetComune={() => setSelectedComune(null)}
      />

      {/* Comune */}
      <ComuneAutocomplete selectedComune={selectedComune} onSelect={setSelectedComune} required />

      {/* Essential cadastral fields */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dati catastali *</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Foglio *</Label>
            <Input value={parcels[0].foglio} onChange={e => updateParcel(parcels[0].id, 'foglio', e.target.value)} placeholder="es. 15" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Particella *</Label>
            <Input value={parcels[0].particella} onChange={e => updateParcel(parcels[0].id, 'particella', e.target.value)} placeholder="es. 342" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Label className="text-xs">Sezione</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">La sezione catastale (A, B, C…) è visibile sulla tua visura. Lascia vuoto se non presente.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input value={parcels[0].sezione} onChange={e => updateParcel(parcels[0].id, 'sezione', e.target.value.toUpperCase())} placeholder="es. A, PL" />
          </div>
        </div>
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

      {/* ── Riquadro dati obbligatori per finalità che lo richiedono ── */}
      {finDataRequired && (
        <div className="rounded-lg border-2 border-primary p-4 space-y-4" style={{ background: 'rgba(26,58,107,0.04)' }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Dati necessari per il calcolo del rendimento *
            </p>
            <p className="text-[11px]" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
              Per la finalità <strong>{FINALITA.find(f => f.value === finalita)?.label}</strong> servono questi due dati per calcolare rendimento e ROI.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold" style={{ color: '#1A3A6B' }}>
                Prezzo di acquisto (€) <span style={{ color: '#B33A2A' }}>*</span>
              </Label>
              <Input
                type="number"
                value={prezzoAcquisto}
                onChange={e => setPrezzoAcquisto(e.target.value)}
                placeholder="es. 150000"
                className={prezzoAcquisto ? '' : 'border-primary/50 ring-1 ring-primary/20'}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold" style={{ color: '#1A3A6B' }}>
                Superficie (mq) <span style={{ color: '#B33A2A' }}>*</span>
              </Label>
              <Input
                type="number"
                value={superficie}
                onChange={e => setSuperficie(e.target.value)}
                placeholder="es. 80"
                className={superficie ? '' : 'border-primary/50 ring-1 ring-primary/20'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Accordion toggle */}
      <button
        type="button"
        onClick={() => setAccordionOpen(!accordionOpen)}
        className="flex items-center gap-2 w-full py-2.5 px-4 border border-dashed border-border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          Dati opzionali {accordionOpen ? '▲' : '▼'}
        </span>
        <span className="text-[10px] text-muted-foreground/70 hidden sm:inline" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          Indirizzo, subalterni, planimetria, dati finanziari…
        </span>
      </button>

      {accordionOpen && (
        <>
          {/* Visura uploader */}
          <VisuraUploader onDataExtracted={handleVisuraData} />
          {prezzoBaseAsta && (
            <div className="flex items-center gap-2 px-4 py-2.5 border border-emerald-300 bg-emerald-50 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <span className="text-emerald-700 font-semibold uppercase tracking-wide">💰 Prezzo base d'asta:</span>
              <span className="font-bold text-emerald-900">€ {parseFloat(prezzoBaseAsta).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">dettagli immobile</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Parcel details — foglio/particella/sezione already visible above for first parcel */}
          {parcels.map((parcel, pi) => {
            const isFirst = pi === 0;
            return (
              <div key={parcel.id} className="border border-border rounded-lg p-4 space-y-3" style={{ background: '#fafaf8' }}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    Immobile {pi + 1} {isFirst ? '— dettagli' : ''}
                  </p>
                  {parcels.length > 1 && (
                    <button type="button" onClick={() => removeParcel(parcel.id)}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {!isFirst && (
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
                            <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">La sezione catastale (A, B, C…) è visibile sulla tua visura. Lascia vuoto se non presente.</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input value={parcel.sezione} onChange={e => updateParcel(parcel.id, 'sezione', e.target.value.toUpperCase())} placeholder="es. A, PL" />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Via / Indirizzo <span className="text-muted-foreground">(opzionale)</span></Label>
                  <Input value={parcel.indirizzo} onChange={e => updateParcel(parcel.id, 'indirizzo', e.target.value)} placeholder="es. Via della Libertà 1" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Subalterni</Label>
                  {parcel.subs.map((sub, si) => (
                    <div key={sub.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-8 shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Sub.</span>
                      <Input value={sub.value} onChange={e => updateSub(parcel.id, sub.id, e.target.value)} placeholder={`es. ${si + 1}`} className="flex-1 h-8 text-sm" />
                      <button type="button" onClick={() => removeSub(parcel.id, sub.id)} disabled={parcel.subs.length === 1}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {totalUnits < MAX_UNITS && (
                    <button type="button" onClick={() => addSub(parcel.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
                      <Plus className="w-3.5 h-3.5" /> + Aggiungi subalterno
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {totalUnits < MAX_UNITS ? (
            <button type="button" onClick={addParcel}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 border rounded transition-colors hover:bg-stone-50"
              style={{ borderColor: '#C4BAA8', color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              <Plus className="w-3.5 h-3.5" /> + Aggiungi immobile (foglio/particella diversi)
            </button>
          ) : (
            <p className="text-xs text-amber-700 flex items-center gap-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <AlertTriangle className="w-3.5 h-3.5" /> Limite massimo di {MAX_UNITS} unità per batch raggiunto
            </p>
          )}

          {/* Planimetria catastale upload */}
          <div className="border-2 border-dashed border-border rounded-lg p-4 space-y-2">
            <Label className="flex items-center gap-2 cursor-pointer">
              📐 Allega planimetria catastale <span className="text-muted-foreground text-xs">(opzionale)</span>
            </Label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => {
                const f = e.target.files?.[0] || null;
                setPlanimetriaFile(f);
                setPlanimetriaFormato(null);
                setPlanimetriaSuperficie(null);
                if (f) handlePlanimetriaCalcolo(f);
              }}
              className="block text-xs text-muted-foreground w-full cursor-pointer file:mr-3 file:py-1 file:px-3 file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground file:cursor-pointer hover:file:opacity-90"
            />
            <p className="text-[10px] text-muted-foreground">Hai la planimetria? Allegala per calcoli più precisi — PDF, JPG o PNG · Max 10MB</p>
            <p className="text-[10px] text-muted-foreground italic">Documento riservato — accessibile solo al proprietario o a professionisti abilitati con autorizzazione scritta</p>

            {planimetriaCalcoloLoading && (
              <div className="mt-2 flex items-center gap-2 text-xs text-primary" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Calcolo superficie in corso…
              </div>
            )}

            {planimetriaSuperficie && planimetriaSuperficie !== 'failed' && (
              <div className="mt-2 p-3 rounded border border-emerald-300 bg-emerald-50 space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-xs font-bold text-emerald-800" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    Superficie calcolata: {planimetriaSuperficie} m² (da planimetria AdE)
                  </p>
                </div>
                <p className="text-[10px] text-emerald-700 italic pl-6" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Calcolato automaticamente dalla planimetria catastale — precisione ±10%
                </p>
              </div>
            )}

            {planimetriaSuperficie === 'failed' && (
              <div className="mt-2 p-3 rounded border border-amber-300 bg-amber-50 space-y-2">
                <p className="text-xs font-semibold text-amber-800" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  ⚠️ Calcolo automatico non riuscito — inserisci manualmente la superficie:
                </p>
                <Input type="number" value={superficieMq} onChange={e => setSuperficieMq(e.target.value)} placeholder="es. 85 mq" className="h-8 text-sm" />
              </div>
            )}

            <div className="mt-2 p-3 rounded bg-blue-50 border border-blue-200 text-[10px] text-blue-800 space-y-2">
              <p className="font-semibold">ℹ️ Visura catastale vs Planimetria catastale</p>
              <div>
                <p className="font-semibold text-emerald-700">📜 Visura catastale — PUBBLICA</p>
                <p>Chiunque può richiederla <strong>gratuitamente</strong> sul portale dell'Agenzia delle Entrate per qualsiasi immobile. <a href="https://servizionline.agenziaentrate.gov.it/" target="_blank" rel="noopener noreferrer" className="underline">Portale AdE →</a></p>
              </div>
              <div>
                <p className="font-semibold text-amber-700">🔒 Planimetria catastale — RISERVATA</p>
                <p>Accessibile solo al <strong>proprietario</strong> (portale AdE con SPID) o a un <strong>professionista abilitato</strong> con SISTER e autorizzazione scritta del proprietario.</p>
              </div>
              <p className="italic">Se disponi già della planimetria, allegala per migliorare la precisione dell'analisi.</p>
            </div>
          </div>

          {/* Superficie manuale */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label>Superficie nota (mq)</Label>
              <span className="text-xs text-muted-foreground">(opzionale — migliora l'analisi finanziaria)</span>
            </div>
            <Input type="number" value={superficieMq} onChange={e => setSuperficieMq(e.target.value)} placeholder="es. 85 mq" />
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
        </>
      )}

      {/* Pricing summary + prezzo acquisizione — only for batch */}
      {isBatch && (
        <div className={`rounded-lg border-2 p-4 ${hasSufficientBalance ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
          <div className="flex items-start gap-3">
            <Building2 className={`w-5 h-5 shrink-0 mt-0.5 ${hasSufficientBalance ? 'text-emerald-700' : 'text-amber-700'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold" style={{ color: hasSufficientBalance ? '#065f46' : '#92400e', fontFamily: "'IBM Plex Mono', monospace" }}>
                  Analisi batch — {totalUnits} unità{batchPertinenze === true ? ' (1 report — pertinenze)' : ''}
                </p>
                {pricing.discount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#1A3A6B', color: '#fff', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {discountLabel(effectiveUnits)}
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
                {batchPertinenze === true && totalUnits > 1 && (
                  <div className="flex justify-between text-emerald-700 italic">
                    <span>Risparmio pertinenze:</span>
                    <span>€{(getBulkPricing(totalUnits, BETA_MODE).totalPrice - pricing.totalPrice).toFixed(2)} (1 solo report)</span>
                  </div>
                )}
                {pricing.savings > 0 && batchPertinenze !== true && (
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
                      {hasSufficientBalance ? ' ✓ Crediti sufficienti' : ` ⚠ Mancano €${(pricing.totalPrice - userBalance).toFixed(2)} — clicca per ricaricare`}
                    </span>
                  </div>
                )}
              </div>

              {/* Prezzo totale acquisizione — per analisi finanziaria */}
              <div className={`mt-3 pt-3 border-t ${hasSufficientBalance ? 'border-emerald-300' : 'border-amber-300'}`}>
                <label className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${hasSufficientBalance ? 'text-emerald-800' : 'text-amber-800'}`}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Prezzo totale acquisizione (€) <span className="opacity-60 normal-case">— per analisi finanziaria</span>
                </label>
                <input
                  type="number"
                  value={totalAcquisitionPrice}
                  onChange={e => setTotalAcquisitionPrice(e.target.value)}
                  placeholder="es. 360000"
                  className={`w-full text-xs px-2 py-1.5 rounded border ${hasSufficientBalance ? 'border-emerald-300 bg-white' : 'border-amber-300 bg-white'}`}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                />
                <p className={`text-[9px] mt-1 ${hasSufficientBalance ? 'text-emerald-700' : 'text-amber-700'}`}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Prezzo totale dell'intero edificio — verrà ripartito proporzionalmente per superficie tra le unità.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pertinenze question — batch only */}
      {isBatch && (
        <div className="rounded-lg border-2 border-primary bg-blue-50/30 p-4 space-y-3">
          <p className="text-sm font-bold" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
            Alcune di queste unità sono pertinenze (garage, cantina, posto auto, ecc.) di un'unità principale inclusa in questa analisi?
          </p>
          <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Se sì, l'analisi costa solo 1 report (l'unità principale) anziché {totalUnits}.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBatchPertinenze(true)}
              className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wide rounded border-2 transition-all ${
                batchPertinenze === true
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-border bg-white text-muted-foreground hover:border-emerald-300'
              }`}
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {batchPertinenze === true && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
              Sì — 1 solo report
            </button>
            <button
              type="button"
              onClick={() => setBatchPertinenze(false)}
              className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wide rounded border-2 transition-all ${
                batchPertinenze === false
                  ? 'border-primary bg-blue-100 text-primary'
                  : 'border-border bg-white text-muted-foreground hover:border-primary/50'
              }`}
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {batchPertinenze === false && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
              No — {totalUnits} report
            </button>
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={!isValid || isLoading}
        className="w-full font-semibold"
        style={{ background: '#1A3A6B', borderRadius: '0', borderBottom: '3px solid #B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}
        size="lg"
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Analisi in corso... (30–60s per unità)</>
        ) : isBatch ? (hasSufficientBalance
          ? `Conferma e Analizza ${batchPertinenze === true ? '1 report' : `${totalUnits} unità`} →`
          : `Ricarica crediti per analizzare ${batchPertinenze === true ? '1 report' : `${totalUnits} unità`} →`)
        : submitLabel}
      </Button>

      {!isValid && (
        <div className="text-center">
          {finDataRequired && !(prezzoAcquisto && superficie) ? (
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-amber-300 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs font-semibold text-amber-800" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                Inserisci{!prezzoAcquisto && !superficie ? ' prezzo di acquisto e superficie' : !prezzoAcquisto ? ' il prezzo di acquisto' : ' la superficie'} per procedere
              </p>
            </div>
          ) : (
            <p className="text-xs" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
              {isBatch && batchPertinenze === null
                ? 'Rispondi alla domanda sulle pertinenze per procedere'
                : parcels.some(p => !p.foglio || !p.particella)
                ? "Inserisci foglio e particella per ogni immobile"
                : "Inserisci comune, dati catastali e finalità per procedere"}
            </p>
          )}
        </div>
      )}
    </form>
  );
}