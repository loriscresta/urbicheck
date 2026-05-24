import React from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";

export default function VincoloCard({ label, presente, dettagli, extra, unverified }) {
  // FIX 1 — When data is unverified (no WFS source), always show ⚠️ yellow — never ✅ green
  if (unverified && !presente) {
    return (
      <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/30">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="font-medium text-sm">{label}</span>
        </div>
        <p className="text-sm text-amber-700">⚠ Non verificato — richiedere CDU al Comune</p>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${presente ? "border-amber-200 bg-amber-50/50" : "border-emerald-200 bg-emerald-50/50"}`}>
      <div className="flex items-center gap-2 mb-2">
        {presente ? (
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        ) : (
          <CheckCircle className="w-4 h-4 text-emerald-600" />
        )}
        <span className="font-medium text-sm">{label}</span>
      </div>
      {extra && <p className="text-xs font-medium text-muted-foreground mb-1">{extra}</p>}
      <p className="text-sm text-muted-foreground">{dettagli || (presente ? "Vincolo presente" : "Nessun vincolo rilevato")}</p>
    </div>
  );
}