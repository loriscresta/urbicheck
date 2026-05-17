import React from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardEmptyState() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center py-14 px-6"
      style={{ border: '1px solid #C4BAA8', background: '#fff' }}>
      {/* Icon grid */}
      <div className="grid grid-cols-3 gap-1 mb-5">
        {[MapPin, Search, FileText, Search, MapPin, FileText, FileText, Search, MapPin].map((Icon, i) => (
          <div key={i} className="w-9 h-9 flex items-center justify-center" style={{ background: i === 4 ? '#1A3A6B' : '#F4EFE6', border: '1px solid #C4BAA8' }}>
            <Icon className="w-4 h-4" style={{ color: i === 4 ? '#fff' : '#C4BAA8' }} />
          </div>
        ))}
      </div>
      <h3 className="font-bold text-base mb-2" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
        Analizza il tuo primo immobile
      </h3>
      <p className="text-xs max-w-sm mb-6 leading-relaxed" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
        Inserisci comune, foglio e particella — ottieni vincoli urbanistici, sismici, idrogeologici e valutazione finanziaria in 60 secondi.
      </p>
      <Link to="/search">
        <button className="h-10 px-6 text-xs font-bold uppercase tracking-widest text-white"
          style={{ background: '#1A3A6B', borderBottom: '3px solid #B33A2A', fontFamily: "'IBM Plex Mono', monospace" }}>
          <Search className="w-3.5 h-3.5 inline mr-2" />
          Nuova ricerca →
        </button>
      </Link>
    </motion.div>
  );
}