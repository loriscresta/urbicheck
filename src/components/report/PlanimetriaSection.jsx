import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { calculatePlanimetriaArea } from "@/functions/calculatePlanimetriaArea";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, AlertTriangle, FileText, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Sorgenti della superficie (in ordine di priorità/affidabilità):
 *  1. Planimetria AI — letta dal documento caricato (stimata)
 *  2. Catasto/visura — campo superficie_mq dall'entità
 *  3. Stima da vani — vani × 17 mq (solo se niente altro)
 *  4. Manuale — inserita dall'utente
 */

const CONFIDENCE_LABEL = {
  alta: { text: "confidenza alta", color: "text-emerald-700" },
  media: { text: "confidenza media", color: "text-amber-700" },
  bassa: { text: "confidenza bassa — verifica", color: "text-red-600" },
};

export default function PlanimetriaSection({ query, onUpdated }) {
  const superficieCatasto = query.superficie_mq ? parseFloat(query.superficie_mq) : null;
  const isCategA = /^A\//.test(query.categoria_catastale || '');
  const stimaVani = isCategA && query.vani && parseFloat(query.vani) > 0
    ? Math.round(parseFloat(query.vani) * 17)
    : null;

  const planimetriaData = query.report_data?.planimetria_data;
  const superficiePlanimetrica = query.report_data?.superficie_planimetrica_mq || planimetriaData?.superficie_mq;

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [manualMq, setManualMq] = useState('');
  const [showManual, setShowManual] = useState(false);
  const queryClient = useQueryClient();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Accetta solo file PDF");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await calculatePlanimetriaArea({
        file_url,
        query_id: query.id,
        superficie_catasto: superficieCatasto,
      });

      const resData = result?.data;

      if (!resData?.area_mq) {
        // AI non è riuscita — mostra fallback manuale pre-compilato con catasto
        setError(null);
        setShowManual(true);
        setManualMq(superficieCatasto ? String(Math.round(superficieCatasto)) : '');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["query", query.id] });
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(null);
      setShowManual(true);
      setManualMq(superficieCatasto ? String(Math.round(superficieCatasto)) : '');
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSaveManual = async () => {
    const mq = parseFloat(manualMq);
    if (!mq || mq < 1) return;
    try {
      const current = query;
      await base44.entities.CadastralQuery.update(query.id, {
        report_data: {
          ...current.report_data,
          superficie_planimetrica_mq: mq,
          planimetria_data: {
            ...(current.report_data?.planimetria_data || {}),
            source: 'manuale',
            superficie_mq: mq,
            method: 'inserimento_manuale',
            confidence: 'manuale',
          },
        },
        superficie_mq: mq,
      });
      setShowManual(false);
      queryClient.invalidateQueries({ queryKey: ["query", query.id] });
      if (onUpdated) onUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  // Determina fonte attiva per la trasparenza
  const fonte = superficiePlanimetrica
    ? planimetriaData?.method === 'inserimento_manuale' ? 'Manuale' : 'Planimetria (AI)'
    : superficieCatasto ? 'Catasto' : stimaVani ? 'Stima da vani' : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden no-print"
    >
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
        <FileText className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm">Planimetria Catastale</h4>
        {fonte && (
          <span className="ml-auto text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 bg-muted/50">
            Fonte: {fonte}
          </span>
        )}
      </div>

      <div className="p-5">
        {/* Righe superficie */}
        <div className="space-y-2 mb-4">
          {/* 1. Catasto — sempre mostrato se disponibile */}
          {superficieCatasto && (
            <div className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
              <span className="text-xs text-muted-foreground">Da visura/catasto</span>
              <span className="text-sm font-semibold">
                {superficieCatasto.toLocaleString('it-IT', { minimumFractionDigits: 0 })} m²
              </span>
            </div>
          )}

          {/* 2. Planimetria AI — mostrata se calcolata */}
          {superficiePlanimetrica && (
            <div className="flex items-center justify-between p-2 rounded bg-emerald-50 border border-emerald-200">
              <div>
                <span className="text-xs text-emerald-700 font-medium">
                  {planimetriaData?.method === 'inserimento_manuale' ? 'Inserita manualmente' : 'Da planimetria (stima AI)'}
                </span>
                {planimetriaData?.scala && (
                  <span className="text-[10px] text-emerald-600 ml-2">scala {planimetriaData.scala}</span>
                )}
                {planimetriaData?.confidence && planimetriaData.method !== 'inserimento_manuale' && (
                  <span className={`text-[10px] ml-2 ${CONFIDENCE_LABEL[planimetriaData.confidence]?.color || ''}`}>
                    {CONFIDENCE_LABEL[planimetriaData.confidence]?.text}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-emerald-800">
                {Number(superficiePlanimetrica).toLocaleString('it-IT', { minimumFractionDigits: 0 })} m²
                {planimetriaData?.method !== 'inserimento_manuale' && (
                  <span className="text-[10px] font-normal text-emerald-600 ml-1">(indicativa)</span>
                )}
              </span>
            </div>
          )}

          {/* 3. Stima da vani — solo se niente altro */}
          {stimaVani && !superficieCatasto && !superficiePlanimetrica && (
            <div className="flex items-center justify-between p-2 rounded bg-amber-50 border border-amber-200">
              <span className="text-xs text-amber-700">Stima da {query.vani} vani catastali</span>
              <span className="text-sm font-semibold text-amber-800">
                {stimaVani} m² <span className="font-normal text-xs">(indicativa)</span>
              </span>
            </div>
          )}

          {/* 4. Nessun dato */}
          {!superficieCatasto && !superficiePlanimetrica && !stimaVani && (
            <div className="flex items-center gap-2 p-2 rounded bg-red-50 border border-red-200">
              <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
              <p className="text-xs text-red-700">Superficie non disponibile — carica la planimetria o inserisci manualmente</p>
            </div>
          )}
        </div>

        {/* Inserimento manuale (fallback) */}
        {showManual && (
          <div className="mb-4 p-3 rounded-lg border border-amber-300 bg-amber-50">
            <div className="flex items-start gap-2 mb-3">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Non sono riuscito a stimare la superficie dalla planimetria.
                {superficieCatasto
                  ? ` Ho pre-compilato con la superficie catastale (${Math.round(superficieCatasto)} m²) — puoi confermarla o correggerla.`
                  : " Inserisci la superficie manualmente."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="9999"
                value={manualMq}
                onChange={e => setManualMq(e.target.value)}
                placeholder="es. 85"
                className="border border-input rounded px-3 py-1.5 text-sm w-28 bg-white"
              />
              <span className="text-xs text-muted-foreground">m²</span>
              <Button size="sm" onClick={handleSaveManual} disabled={!manualMq || parseFloat(manualMq) < 1}>
                Salva
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground underline ml-1"
                onClick={() => setShowManual(false)}
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Errore generico (non per fallback manuale) */}
        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-300 bg-red-50 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}

        {/* Upload */}
        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-2 pointer-events-none"
              disabled={uploading}
            >
              <span>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analisi in corso…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {superficiePlanimetrica ? "Aggiorna planimetria PDF" : "Carica planimetria PDF (AdE)"}
                  </>
                )}
              </span>
            </Button>
          </label>
          {!showManual && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline"
              onClick={() => {
                setShowManual(true);
                setManualMq(superficieCatasto ? String(Math.round(superficieCatasto)) : '');
              }}
            >
              Inserisci manualmente
            </button>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
          L'AI legge la scala dalla planimetria e stima la superficie — il valore è indicativo.
          La fonte più affidabile rimane la superficie da visura catastale ufficiale.
        </p>
      </div>
    </motion.div>
  );
}