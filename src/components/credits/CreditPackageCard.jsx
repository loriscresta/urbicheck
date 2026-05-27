import React from "react";
import { Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function CreditPackageCard({ pkg, onPurchase, delay = 0, loading = false }) {
  const pricePerQuery = pkg.queries > 0 ? (pkg.price / pkg.queries).toFixed(2) : pkg.price.toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white p-6 relative transition-all hover:bg-stone-50"
      style={{
        border: pkg.popular ? '2px solid #B33A2A' : '1px solid #C4BAA8',
      }}
    >
      {(pkg.popular || pkg.badge) && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[2px] text-white whitespace-nowrap"
          style={{ background: pkg.popular ? '#B33A2A' : '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {pkg.badge || 'PIÙ POPOLARE'}
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="font-bold text-xs uppercase tracking-[2px]" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>{pkg.name}</h3>
        <div className="mt-3">
          <span className="text-4xl font-bold" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>€{pkg.price.toFixed(2)}</span>
        </div>
        <p className="text-xs mt-2" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
          {pkg.queries === 1 ? `€${pricePerQuery} per analisi` : `€${pricePerQuery} per analisi`}
        </p>
        {pkg.savings && (
          <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[1px]" style={{ background: '#F4EFE6', color: '#1A3A6B', border: '1px solid #C4BAA8', fontFamily: "'IBM Plex Mono', monospace" }}>
            Risparmi {pkg.savings}
          </span>
        )}
      </div>

      <ul className="space-y-2 mb-6">
        {[
          `${pkg.queries} ${pkg.queries === 1 ? "analisi inclusa" : "analisi incluse"}`,
          pkg.description,
          "Analisi urbanistica dettagliata",
        ].map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-xs" style={{ color: '#1C1A17', fontFamily: "'IBM Plex Mono', monospace" }}>
            <Check className="w-3.5 h-3.5 shrink-0" style={{ color: '#B33A2A' }} />
            {item}
          </li>
        ))}
      </ul>

      <button
        onClick={() => !loading && onPurchase(pkg)}
        disabled={loading}
        className="w-full h-11 text-xs font-bold uppercase tracking-[2px] text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-60"
        style={{
          background: '#1A3A6B',
          borderBottom: '3px solid #B33A2A',
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reindirizzamento...</> : 'Acquista'}
      </button>
    </motion.div>
  );
}