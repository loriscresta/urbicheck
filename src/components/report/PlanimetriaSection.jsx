import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { calculatePlanimetriaArea } from "@/functions/calculatePlanimetriaArea";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

export default function PlanimetriaSection({ query, onUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const planimetriaData = query.report_data?.planimetria_data;
  const superficiePlanimetrica = query.report_data?.superficie_planimetrica_mq || planimetriaData?.superficie_mq;

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
      // 1. Upload PDF
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // 2. Extract area server-side
      const result = await calculatePlanimetriaArea({ file_url, query_id: query.id });

      if (result?.data?.error) {
        throw new Error(result.data.error);
      }

      // Refresh report data
      queryClient.invalidateQueries({ queryKey: ["query", query.id] });
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || "Errore durante l'elaborazione del PDF");
    } finally {
      setUploading(false);
      // Reset input
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
        {/* Risultato superficie */}
        {superficiePlanimetrica ? (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-emerald-300 bg-emerald-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Superficie planimetrica:{" "}
                {Number(superficiePlanimetrica).toLocaleString("it-IT", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}{" "}
                m² (da planimetria AdE)
              </p>
              {planimetriaData?.method && (
                <p className="text-xs text-emerald-700 mt-0.5">
                  Metodo: {planimetriaData.method === "testo" ? "Estratto dal testo del documento" : "Ricavato dalla planimetria grafica"}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-700">
              Verifica manuale necessaria — superficie non ancora calcolata da planimetria
            </p>
          </div>
        )}

        {/* Error */}
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