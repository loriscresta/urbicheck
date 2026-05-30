import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import ComuneAutocomplete from "@/components/search/ComuneAutocomplete";
import { FileSearch, Loader2, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { addDays, format } from "date-fns";

// Mappa piano_tipo → tipi documento compatibili
const DOCS_BY_PIANO = {
  PRG: ["CDU", "PRG", "NTA", "elaborati_grafici", "altro"],
  PGT: ["CDU", "PGT", "NTA", "elaborati_grafici", "altro"],
  PSC: ["CDU", "PSC", "NTA", "elaborati_grafici", "altro"],
  PUC: ["CDU", "PUC", "NTA", "elaborati_grafici", "altro"],
  PUGC: ["CDU", "NTA", "elaborati_grafici", "altro"],
  RU: ["CDU", "NTA", "elaborati_grafici", "altro"],
  altro: ["CDU", "PRG", "NTA", "elaborati_grafici", "altro"],
};
const ALL_DOCS = ["CDU", "PRG", "PGT", "PSC", "PUC", "NTA", "elaborati_grafici", "altro"];
const DOC_LABELS = {
  CDU: "CDU — Certificato di Destinazione Urbanistica",
  PRG: "PRG — Piano Regolatore Generale",
  PGT: "PGT — Piano di Governo del Territorio",
  PSC: "PSC — Piano Strutturale Comunale",
  PUC: "PUC — Piano Urbanistico Comunale",
  NTA: "NTA — Norme Tecniche di Attuazione",
  elaborati_grafici: "Elaborati grafici",
  altro: "Altro documento",
};

const CANALI = [
  { value: "pec", label: "PEC" },
  { value: "sportello_fisico", label: "Sportello fisico" },
  { value: "portale_online", label: "Portale online" },
  { value: "raccomandata", label: "Raccomandata A/R" },
];

/**
 * AttiRequestForm
 * Props:
 *   prefill: { comune_id, comune (ComuneItalia obj), foglio, particella, subalterno, query_id }
 *   onSuccess(attiRequest) — called after save
 *   onCancel()
 */
export default function AttiRequestForm({ prefill, onSuccess, onCancel }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedComune, setSelectedComune] = useState(prefill?.comune || null);

  const [form, setForm] = useState({
    documento_tipo: "",
    foglio: prefill?.foglio || "",
    particella: prefill?.particella || "",
    subalterno: prefill?.subalterno || "",
    richiedente_nome: "",
    richiedente_cf: "",
    richiedente_email: "",
    richiedente_pec: "",
    pec_utc: "",
    canale_invio: "pec",
    testo_richiesta: "",
    note: "",
  });

  // When comune changes, auto-populate PEC/email/portale fields
  useEffect(() => {
    if (selectedComune) {
      setForm(prev => ({
        ...prev,
        pec_utc: selectedComune.pec_utc || prev.pec_utc,
      }));
    }
  }, [selectedComune]);

  // Load current user data
  useEffect(() => {
    base44.auth.me().then(user => {
      if (user) {
        setForm(prev => ({
          ...prev,
          richiedente_email: user.email || "",
          richiedente_nome: user.full_name || "",
        }));
      }
    });
  }, []);

  const availableDocs = selectedComune?.piano_tipo
    ? (DOCS_BY_PIANO[selectedComune.piano_tipo] || ALL_DOCS)
    : ALL_DOCS;

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const isValid = selectedComune && form.documento_tipo && form.foglio && form.particella && form.richiedente_nome;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setIsLoading(true);

    const user = await base44.auth.me();
    const dataInvio = form.canale_invio !== "bozza" ? null : null;

    const payload = {
      query_id: prefill?.query_id || "",
      comune_id: selectedComune.id,
      user_email: user.email,
      documento_tipo: form.documento_tipo,
      comune: selectedComune.nome,
      provincia: selectedComune.provincia,
      regione: selectedComune.regione,
      sigla_provincia: selectedComune.sigla_provincia,
      piano_tipo: selectedComune.piano_tipo || "",
      foglio: form.foglio,
      particella: form.particella,
      subalterno: form.subalterno,
      pec_utc: form.pec_utc,
      email_utc: selectedComune.email_utc || "",
      portale_urbanistica: selectedComune.portale_urbanistica || "",
      richiedente_nome: form.richiedente_nome,
      richiedente_cf: form.richiedente_cf,
      richiedente_email: form.richiedente_email,
      richiedente_pec: form.richiedente_pec,
      canale_invio: form.canale_invio,
      testo_richiesta: form.testo_richiesta,
      stato: "bozza",
      costo: 4.90,
      note: form.note,
    };

    const created = await base44.entities.AttiRequest.create(payload);
    toast({ title: "Richiesta atti creata ✓", description: "Salvata come bozza." });
    setIsLoading(false);
    onSuccess(created);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Comune */}
      <div>
        <ComuneAutocomplete
          selectedComune={selectedComune}
          onSelect={setSelectedComune}
          required
        />
        {selectedComune && (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedComune.pec_utc && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">PEC UTC (modificabile)</Label>
                <Input
                  value={form.pec_utc}
                  onChange={(e) => set("pec_utc", e.target.value)}
                  placeholder="pec@comune.it"
                />
              </div>
            )}
            {selectedComune.portale_urbanistica && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Portale urbanistica</Label>
                <Input value={selectedComune.portale_urbanistica} readOnly className="bg-muted text-muted-foreground text-xs" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Documento tipo */}
      <div className="space-y-2">
        <Label>Tipo documento richiesto *</Label>
        {selectedComune?.piano_tipo && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            Piano vigente: <strong>{selectedComune.piano_tipo}</strong> — mostrati solo i tipi compatibili
          </p>
        )}
        <Select value={form.documento_tipo} onValueChange={(v) => set("documento_tipo", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona tipo documento" />
          </SelectTrigger>
          <SelectContent>
            {availableDocs.map(d => (
              <SelectItem key={d} value={d}>{DOC_LABELS[d] || d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dati catastali */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dati catastali</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Foglio *</Label>
            <Input value={form.foglio} onChange={(e) => set("foglio", e.target.value)} placeholder="es. 123" />
          </div>
          <div className="space-y-1">
            <Label>Particella *</Label>
            <Input value={form.particella} onChange={(e) => set("particella", e.target.value)} placeholder="es. 456" />
          </div>
          <div className="space-y-1">
            <Label>Subalterno</Label>
            <Input value={form.subalterno} onChange={(e) => set("subalterno", e.target.value)} placeholder="opz." />
          </div>
        </div>
      </div>

      {/* Richiedente */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dati richiedente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Nome e cognome *</Label>
            <Input value={form.richiedente_nome} onChange={(e) => set("richiedente_nome", e.target.value)} placeholder="Mario Rossi" />
          </div>
          <div className="space-y-1">
            <Label>Codice fiscale</Label>
            <Input value={form.richiedente_cf} onChange={(e) => set("richiedente_cf", e.target.value)} placeholder="RSSMRA..." />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={form.richiedente_email} onChange={(e) => set("richiedente_email", e.target.value)} type="email" />
          </div>
          <div className="space-y-1">
            <Label>PEC (per risposta formale)</Label>
            <Input value={form.richiedente_pec} onChange={(e) => set("richiedente_pec", e.target.value)} placeholder="tu@pec.it" />
          </div>
        </div>
      </div>

      {/* Canale invio */}
      <div className="space-y-2">
        <Label>Canale di invio</Label>
        <Select value={form.canale_invio} onValueChange={(v) => set("canale_invio", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CANALI.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Testo richiesta */}
      <div className="space-y-2">
        <Label>Testo della richiesta (ex art. 22 L.241/90)</Label>
        <Textarea
          value={form.testo_richiesta}
          onChange={(e) => set("testo_richiesta", e.target.value)}
          placeholder="Inserisci o personalizza il testo della richiesta..."
          rows={4}
        />
      </div>

      {/* Note */}
      <div className="space-y-2">
        <Label>Note interne</Label>
        <Input value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Appunti operativi..." />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>
        )}
        <Button type="submit" disabled={!isValid || isLoading} style={{ background: '#1e3a5f' }}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
          Richiedi &quot;Accesso agli Atti&quot;
        </Button>
      </div>
    </motion.form>
  );
}