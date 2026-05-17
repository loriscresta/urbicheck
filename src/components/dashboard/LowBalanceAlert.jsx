import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CreditCard } from "lucide-react";

export default function LowBalanceAlert({ balance }) {
  if (balance >= 9.9) return null;
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 mb-6"
      style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderLeft: '4px solid #B33A2A' }}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#B33A2A' }} />
        <p className="text-xs" style={{ color: '#1C1A17', fontFamily: "'IBM Plex Mono', monospace" }}>
          Saldo insufficiente per un nuovo report — ti servono almeno €9,90
          {balance > 0 ? ` (hai €${balance.toFixed(2)})` : ' (saldo: €0,00)'}
        </p>
      </div>
      <Link to="/credits" className="shrink-0">
        <button className="flex items-center gap-1.5 h-8 px-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap"
          style={{ background: '#B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
          <CreditCard className="w-3 h-3" />
          Ricarica
        </button>
      </Link>
    </div>
  );
}