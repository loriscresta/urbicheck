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
        <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Nessuna ricerca effettuata</p>
        <Link to="/search" className="text-sm text-primary font-medium hover:underline mt-1 inline-block">
          Fai la tua prima ricerca →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
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
              className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(200,160,110,0.12)' }}>
                <MapPin className="w-4 h-4" style={{ color: '#C8A06E' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {query.comune} — Foglio {query.foglio}, Part. {query.particella}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {query.regione} · {format(new Date(query.created_date), "d MMM yyyy, HH:mm", { locale: it })}
                </p>
              </div>
              <Badge variant="outline" className={`${status.className} text-[11px] shrink-0`}>
                {status.label}
              </Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}