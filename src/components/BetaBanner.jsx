import React from "react";

export default function BetaBanner() {
  return (
    <div
      className="w-full flex items-center justify-between px-4 py-2 text-xs no-print"
      style={{ background: '#0f2544', color: '#F4EFE6', fontFamily: "'IBM Plex Mono', monospace", minHeight: 36 }}
    >
      <span className="font-semibold">
        🚀 Beta attiva — Prime 3 analisi gratis · Disponibile su Piemonte, Liguria e Lombardia
      </span>
      <span className="hidden sm:block opacity-60 text-[10px] tracking-wider whitespace-nowrap ml-4">
        Valido 30 giorni dal lancio
      </span>
    </div>
  );
}