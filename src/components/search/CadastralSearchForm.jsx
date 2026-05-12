import React, { useState } from "react";
import { REGIONI, PROVINCE_BY_REGIONE } from "@/lib/italianData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Search, MapPin, Loader2, TrendingUp, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const FINALITA_FINANZIARIE = ["investimento", "sviluppo_immobiliare", "asta_giudiziaria"];

const STATO_CONSERVATIVO = [
  { value: "ottimo", label: "Ottimo (abitabile subito)" },
  { value: "buono", label: "Buono (piccoli interventi)" },
  { value: "da_ristrutturare", label: "Da ristrutturare (intervento completo)" },
  { value: "fatiscente", label: "Fatiscente (ristrutturazione pesante/strutturale)" },
];

const DESTINAZIONE_OBIETTIVO = [
  { value: "flipping", label: "Vendita dopo ristrutturazione (flipping)" },
  { value: "affitto_lungo", label: "Affitto lungo termine" },
  { value: "affitto_breve", label: "Affitto breve (B&B/Airbnb)" },
  { value: "uso_proprio", label: "Uso proprio" },
];

const FINALITA = [
  { value: "acquisto_privato", label: "Acquisto privato" },
  { value: "investimento", label: "Investimento" },
  { value: "sviluppo_immobiliare", label: "Sviluppo immobiliare" },
  { value: "asta_giudiziaria", label: "Asta giudiziaria" },
  { value: "due_diligence", label: "Due diligence" },
  { value: "valutazione_professionale", label: "Valutazione professionale" },
];

export default function CadastralSearchForm({ onSubmit, isLoading, disabled, submitLabel }) {
  const [formData, setFormData] = useState({
    regione: "",
    provincia: "",
    comune: "",
    foglio: "",
    particella: "",
    subalterno: "",
    finalita: "",
    prezzo_acquisto: "",
    superficie: "",
    stato_conservativo: "",
    destinazione_obiettivo: "",
    spese_accessorie: "10",
  });

  const showFinancialFields = FINALITA_FINANZIARIE.includes(formData.finalita);

  const provinces = formData.regione ? (PROVINCE_BY_REGIONE[formData.regione] || []) : [];

  const handleChange = (field, value) => {
    const updates = { [field]: value };
    if (field === "regione") {
      updates.provincia = "";
      updates.comune = "";
    }
    if (field === "provincia") {
      updates.comune = "";
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isValid = formData.regione && formData.comune && formData.foglio && formData.particella && formData.finalita;

  const gisRegioni = ["Liguria", "Piemonte", "Lombardia", "Veneto", "Emilia-Romagna", "Toscana"];
  const isGisRegione = gisRegioni.includes(formData.regione);
  const isGisImplementing = ["Lombardia", "Veneto", "Emilia-Romagna", "Toscana"].includes(formData.regione);

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Location */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Localizzazione</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Regione *</Label>
            <Select value={formData.regione} onValueChange={(v) => handleChange("regione", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona regione" />
              </SelectTrigger>
              <SelectContent>
                {REGIONI.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Provincia</Label>
            <Select
              value={formData.provincia}
              onValueChange={(v) => handleChange("provincia", v)}
              disabled={!formData.regione}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona provincia" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Comune *</Label>
            <Input
              placeholder="es. Roma, Milano..."
              value={formData.comune}
              onChange={(e) => handleChange("comune", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Cadastral Data */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Dati Catastali</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Foglio *</Label>
            <Input
              placeholder="es. 123"
              value={formData.foglio}
              onChange={(e) => handleChange("foglio", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Particella *</Label>
            <Input
              placeholder="es. 456"
              value={formData.particella}
              onChange={(e) => handleChange("particella", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Subalterno <span className="text-muted-foreground">(opzionale)</span></Label>
            <Input
              placeholder="es. 1"
              value={formData.subalterno}
              onChange={(e) => handleChange("subalterno", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Finalità */}
      <div className="space-y-2">
        <Label>Finalità *</Label>
        <Select value={formData.finalita} onValueChange={(v) => handleChange("finalita", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona la finalità dell'analisi" />
          </SelectTrigger>
          <SelectContent>
            {FINALITA.map(f => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Campi finanziaria */}
      {showFinancialFields && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-amber-700" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-amber-800">Analisi Finanziaria (opzionale)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prezzo acquisto / base d'asta (€)</Label>
              <Input
                type="number"
                placeholder="es. 150000"
                value={formData.prezzo_acquisto}
                onChange={(e) => handleChange("prezzo_acquisto", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Superficie lorda (mq)</Label>
              <Input
                type="number"
                placeholder="es. 80"
                value={formData.superficie}
                onChange={(e) => handleChange("superficie", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Stato conservativo attuale</Label>
              <Select value={formData.stato_conservativo} onValueChange={(v) => handleChange("stato_conservativo", v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona stato" /></SelectTrigger>
                <SelectContent>
                  {STATO_CONSERVATIVO.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destinazione d'uso obiettivo</Label>
              <Select value={formData.destinazione_obiettivo} onValueChange={(v) => handleChange("destinazione_obiettivo", v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona obiettivo" /></SelectTrigger>
                <SelectContent>
                  {DESTINAZIONE_OBIETTIVO.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Piano spese accessorie (%)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent><p className="max-w-xs">Notaio, agenzia, imposte, spese varie — tipicamente 8–12% del prezzo</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                type="number"
                placeholder="10"
                value={formData.spese_accessorie}
                onChange={(e) => handleChange("spese_accessorie", e.target.value)}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* GIS badge / disclaimer */}
      {formData.regione && (
        <div className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
          isGisRegione ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"
        }`}>
          {isGisRegione ? (
            <>
              <span className="text-emerald-600 font-semibold shrink-0">✓ Dati GIS Ufficiali</span>
              {isGisImplementing && <span className="text-emerald-700 text-xs">(in implementazione)</span>}
            </>
          ) : (
            <>
              <span className="text-amber-700 font-semibold shrink-0">⚠ Analisi AI</span>
              <span className="text-amber-700 text-xs">Stima basata su AI — verifica raccomandata presso UTC</span>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">
          Costo: <span className="font-semibold text-foreground">€9,90</span> per query
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={!isValid || isLoading || disabled}
          className="gap-2 px-8 font-bold"
          style={{ background: '#1e3a5f' }}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {submitLabel || "Analizza — €9,90"}
        </Button>
      </div>
    </motion.form>
  );
}