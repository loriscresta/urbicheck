import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronDown, ChevronUp, Info } from "lucide-react";
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

export default function CadastralSearchForm({ onSubmit, isLoading, submitLabel = "Analizza →" }) {
  const [selectedComune, setSelectedComune] = useState(null);
  const [foglio, setFoglio] = useState("");
  const [particella, setParticella] = useState("");
  const [subalterno, setSubalterno] = useState("");
  const [sezoneCatastale, setSezoneCatastale] = useState("");
  const [indirizzoImmobile, setIndirizzoImmobile] = useState("");
  const [finalita, setFinalita] = useState("");
  const [visuraDati, setVisuraDati] = useState(null); // dati estratti dalla visura
  const [showFinancial, setShowFinancial] = useState(false);

  // Financial fields
  const [prezzoAcquisto, setPrezzoAcquisto] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [statoConservativo, setStatoConservativo] = useState("buono");
  const [destinazioneObiettivo, setDestinazioneObiettivo] = useState("");
  const [speseAccessorie, setSpeseAccessorie] = useState("10");

  const showFinancialSection = FIN_FINALITA.includes(finalita);

  const isValid = selectedComune && foglio && particella && finalita;

  const handleFinalitaChange = (value) => {
    try {
      setFinalita(value);
      // Reset financial section visibility when switching away from financial finalità
      if (!FIN_FINALITA.includes(value)) {
        setShowFinancial(false);
      }
    } catch (_e) {}
  };

  const handleVisuraData = (dati) => {
    setVisuraDati(Object.keys(dati).length ? dati : null);
    // Pre-compila i campi se trovati
    if (dati.foglio) setFoglio(dati.foglio);
    if (dati.particella) setParticella(dati.particella);
    if (dati.subalterno) setSubalterno(dati.subalterno);
    if (dati.sezione_form) setSezoneCatastale(dati.sezione_form);
    if (dati.indirizzo_catastale) setIndirizzoImmobile(dati.indirizzo_catastale);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;

    onSubmit({
      comune_id: selectedComune.id,
      comune: selectedComune.nome,
      provincia: selectedComune.provincia,
      sigla_provincia: selectedComune.sigla_provincia,
      regione: selectedComune.regione,
      piano_tipo: selectedComune.piano_tipo || "",
      foglio,
      particella,
      subalterno,
      sezione_catastale: sezoneCatastale.trim().toUpperCase() || undefined,
      indirizzo_immobile: indirizzoImmobile.trim() || undefined,
      finalita,
      // financial fields
      prezzo_acquisto: prezzoAcquisto,
      superficie,
      stato_conservativo: statoConservativo,
      destinazione_obiettivo: destinazioneObiettivo,
      spese_accessorie: speseAccessorie,
      // visura data
      ...(visuraDati ? {
        categoria_catastale: visuraDati.categoria_catastale,
        superficie_mq: visuraDati.superficie_mq,
        rendita_catastale: visuraDati.rendita_catastale,
        vani: visuraDati.vani,
        indirizzo_catastale: visuraDati.indirizzo_catastale,
        visura_uploaded: true,
        intestatari_visura: visuraDati.intestatari,
      } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Visura uploader */}
      <VisuraUploader onDataExtracted={handleVisuraData} />

      {/* Separatore */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">oppure inserisci manualmente</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Comune */}
      <ComuneAutocomplete
        selectedComune={selectedComune}
        onSelect={setSelectedComune}
        required
      />

      {/* Dati catastali */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Dati catastali</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Foglio *</Label>
            <Input value={foglio} onChange={(e) => setFoglio(e.target.value)} placeholder="es. 15" />
          </div>
          <div className="space-y-1.5">
            <Label>Particella *</Label>
            <Input value={particella} onChange={(e) => setParticella(e.target.value)} placeholder="es. 342" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label>Sezione catastale</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-relaxed">
                    <p>La sezione catastale (A, B, C…) è visibile sulla tua visura catastale o planimetria.</p>
                    <p className="mt-1">Nei comuni senza sezioni, lascia vuoto.</p>
                    <p className="mt-1">In alcune visure AdE/SISTER compare un codice di 2 lettere (es. PL, RM) che corrisponde alla sezione nel sistema digitale — inseriscilo così com'è.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              value={sezoneCatastale}
              onChange={(e) => setSezoneCatastale(e.target.value.toUpperCase())}
              placeholder="es. A, B, PL — vedi la tua visura catastale"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Subalterno</Label>
            <Input value={subalterno} onChange={(e) => setSubalterno(e.target.value)} placeholder="opz." />
          </div>
        </div>
      </div>

      {/* Indirizzo immobile */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label>Via / Indirizzo immobile</Label>
          <span className="text-xs text-muted-foreground">(opzionale)</span>
        </div>
        <Input
          value={indirizzoImmobile}
          onChange={(e) => setIndirizzoImmobile(e.target.value)}
          placeholder="es. Via della Libertà 1 — aiuta a identificare la sezione corretta"
        />
        <p className="text-xs text-muted-foreground">Se inserito, viene usato per trovare automaticamente la sezione catastale corretta.</p>
      </div>

      {/* Finalità */}
      <div className="space-y-1.5">
        <Label>Finalità dell'analisi *</Label>
        <Select value={finalita} onValueChange={handleFinalitaChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona finalità..." />
          </SelectTrigger>
          <SelectContent>
            {FINALITA.map(f => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sezione finanziaria (opzionale, mostrata per finalità rilevanti) */}
      <div key="financial-section-wrapper" style={{ display: showFinancialSection ? 'block' : 'none' }}>
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <button
            type="button"
            className="flex items-center gap-2 w-full text-left"
            onClick={() => { try { setShowFinancial(v => !v); } catch (_e) {} }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
              Dati finanziari (opzionale — per analisi investimento)
            </p>
            {showFinancial ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          <div key="financial-fields" style={{ display: showFinancial ? 'grid' : 'none' }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prezzo di acquisto (€)</Label>
              <Input key="prezzo-input" type="number" value={prezzoAcquisto} onChange={(e) => { try { setPrezzoAcquisto(e.target.value); } catch (_e) {} }} placeholder="es. 150000" />
            </div>
            <div className="space-y-1.5">
              <Label>Superficie stimata (mq)</Label>
              <Input key="superficie-input" type="number" value={superficie} onChange={(e) => { try { setSuperficie(e.target.value); } catch (_e) {} }} placeholder="es. 80" />
            </div>
            <div className="space-y-1.5">
              <Label>Stato conservativo</Label>
              <Select key="stato-select" value={statoConservativo} onValueChange={(v) => { try { setStatoConservativo(v); } catch (_e) {} }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATO_CONSERVATIVO.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Destinazione obiettivo</Label>
              <Select key="destinazione-select" value={destinazioneObiettivo} onValueChange={(v) => { try { setDestinazioneObiettivo(v); } catch (_e) {} }}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>
                  {DESTINAZIONE_OBIETTIVO.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Spese accessorie (%)</Label>
              <Input key="spese-input" type="number" value={speseAccessorie} onChange={(e) => { try { setSpeseAccessorie(e.target.value); } catch (_e) {} }} placeholder="es. 10" />
              <p className="text-xs text-muted-foreground">Notaio, agenzia, imposte — tipicamente 8–12%</p>
            </div>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!isValid || isLoading}
        className="w-full font-semibold"
        style={{ background: '#1A3A6B', borderRadius: '0', borderBottom: '3px solid #B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analisi in corso... (30–60 secondi)
          </>
        ) : submitLabel}
      </Button>

      {!isValid && (
        <p className="text-xs text-center" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
          Inserisci comune, foglio, particella e finalità per procedere
        </p>
      )}
    </form>
  );
}