import React from "react";

export default function DataRow({ label, value }) {
  // Difesa contro oggetti passati per errore come valore (evita React error #31).
  if (value && typeof value === 'object' && !React.isValidElement(value)) {
    value = value.destinazione || value.messaggio || value.zona_codice || value.nome
      || value.destinazione_uso || value.descrizione || value.label || null;
  }
  const isNull = value === null || value === undefined || value === 'null' || value === '' || value === 'undefined';
  if (isNull) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline py-2.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground sm:w-48 shrink-0 mb-0.5 sm:mb-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}