import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { calculatePlanimetriaArea } from "@/functions/calculatePlanimetriaArea";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

export default function PlanimetriaSection({ query, onUpdated }) {
  // Superficie da catasto/visura
  const superficieCatasto = query.superficie_mq ? parseFloat(query.superficie_mq) : null;
  // Stima da vani (categoria A): vani × 17 m²
  const isCategA = /^A\//.test(query.categoria_catastale || '');
  const stimaVani = isCategA && query.vani && parseFloat(query.vani) > 0
    ? Math.round(parseFloat(query.vani) * 17)
    : null;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const planimetriaData = query.report_data?.planimetria_data;
  const superficiePlanimetrica = query.report_data?.superficie_planimetrica_mq || planimetriaData?.superficie_mq;

  const [noBlue, setNoBlue] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Accetta solo file PDF");
      return;
    }
    setError(null);
    setNoBlue(false);
    setUploading(true);
    try {
      // 1. Upload PDF
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // 2. Calcola area server-side
      const result = await calculatePlanimetriaArea({ file_url, query_id: query.id });

      const resData = result?.data;
      if (resData?.error) {
        if (/campitura|azzurra/i.test(resData.error)) {
          setNoBlue(true);
        } else {
          throw new Error(resData.error);
        }
        return;
      }

      // Refresh report data
      queryClient.invalidateQueries({ queryKey: ["query", query.id] });
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || "Errore durante l'elaborazione del PDF");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
        <FileText className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm">Planimetria Catastale</h4>
      </div>

      <div className="p-5">
        {/* Righe superficie */}
        <div className="space-y-2 mb-4">
          {superficieCatasto && (
            <div className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
              <span className="text-xs text-muted-foreground">Da visura/catasto</span>
              <span className="text-sm font-semibold">{superficieCatasto.toLocaleString('it-IT', { minimumFractionDigits: 0 })} m²</span>
            </div>
          )}
          {superficiePlanimetrica && (
            <div className="flex items-center justify-between p-2 rounded bg-emerald-50 border border-emerald-200">
              <span className="text-xs text-emerald-700">Da planimetria AdE</span>
              <span className="text-sm font-semibold text-emerald-800">
                {Number(superficiePlanimetrica).toLocaleString('it-IT', { minimumFractionDigits: 1 })} m²
              </span>
            </div>
          )}
          {stimaVani && !superficieCatasto && !superficiePlanimetrica && (
            <div className="flex items-center justify-between p-2 rounded bg-amber-50 border border-amber-200">
              <span className="text-xs text-amber-700">Stima da {query.vani} vani catastali</span>
              <span className="text-sm font-semibold text-amber-800">{stimaVani} m² <span className="font-normal text-xs">(indicativa)</span></span>
            </div>
          )}
          {!superficieCatasto && !superficiePlanimetrica && !stimaVani && (
            <div className="flex items-center gap-2 p-2 rounded bg-red-50 border border-red-200">
              <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
              <p className="text-xs text-red-700">Superficie non disponibile — carica la planimetria PDF</p>
            </div>
          )}
        </div>

        {/* Nessuna campitura azzurra — avviso arancione */}
        {noBlue && (
          <div className="mb-4 p-3 rounded-lg border border-orange-300 bg-orange-50 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-800 font-semibold">
              Nessuna campitura azzurra rilevata — verifica il PDF caricato.
              Assicurati che sia la planimetria catastale AdE (con campiture azzurre del subalterno).
            </p>
          </div>
        )}

        {/* Errori generici */}
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
                    Elaborazione…
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
          <p className="text-xs text-muted-foreground">Solo file .pdf</p>
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
          Carica la planimetria catastale ufficiale AdE. La superficie viene estratta automaticamente dal documento.
          Il valore viene salvato e usato nell'analisi finanziaria.
        </p>
      </div>
    </motion.div>
  );
}