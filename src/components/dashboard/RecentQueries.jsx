import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { MapPin, ChevronRight, FileText } from "lucide-react";
import { motion } from "framer-motion";

const statusMap = {
  completed: { label: "Completata", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "In corso", className: "bg-amber-50 text-amber-700 border-amber-200" },
  failed: { label: "Errore", className: "bg-red-50 text-red-700 border-red-200" },
};

export default function RecentQueries({ queries = [] }) {
  if (queries.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#C4BAA8' }} />
        <p className="text-xs uppercase tracking-[1px]" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
          Nessuna ricerca effettuata
        </p>
        <Link to="/search" className="text-xs font-semibold hover:underline mt-2 inline-block uppercase tracking-[1px]" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
          Fai la tua prima ricerca →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-0 divide-y" style={{ borderColor: '#C4BAA8' }}>
      {queries.map((query, i) => {
        const status = statusMap[query.status] || statusMap.pending;
        return (
          <motion.div
            key={query.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={query.status === "completed" ? `/report/${query.id}` : "#"}
              className="flex items-center gap-4 py-4 hover:bg-stone-50 transition-colors group"
            >
              <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ background: '#F4EFE6', border: '1px solid #C4BAA8' }}>
                <MapPin className="w-3.5 h-3.5" style={{ color: '#1A3A6B' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs truncate" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {query.comune} — F.{query.foglio} P.{query.particella}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: '#7A7268', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {query.regione} · {format(new Date(query.created_date), "d MMM yyyy, HH:mm", { locale: it })}
                </p>
              </div>
              <Badge variant="outline" className={`${status.className} text-[10px] shrink-0`}>
                {status.label}
              </Badge>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-colors" style={{ color: '#C4BAA8' }} />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}