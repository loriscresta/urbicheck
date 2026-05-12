import React, { useState } from "react";
import { REGIONI, PROVINCE_BY_REGIONE } from "@/lib/italianData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Search, MapPin, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

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
  });

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