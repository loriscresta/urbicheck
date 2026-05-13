import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, isPast } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { FileSearch, Loader2, AlertTriangle, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const STATO_CONFIG = {
  bozza: { label: "Bozza", className: "bg-slate-100 text-slate-600 border-slate-200" },
  pronta: { label: "Pronta", className: "bg-blue-50 text-blue-700 border-blue-200" },
  inviata: { label: "Inviata", className: "bg-amber-50 text-amber-700 border-amber-200" },
  ricevuta: { label: "Ricevuta", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  completata: { label: "Completata", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  annullata: { label: "Annullata", className: "bg-red-50 text-red-600 border-red-200" },
};

function ScadenzaBadge({ data_scadenza }) {
  if (!data_scadenza) return null;
  const scadenza = new Date(data_scadenza);
  const oggi = new Date();
  const giorniRimasti = differenceInDays(scadenza, oggi);
  const scaduta = isPast(scadenza);

  if (scaduta) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
        <AlertTriangle className="w-3 h-3" />
        Scaduta {format(scadenza, "d MMM", { locale: it })}
      </span>
    );
  }
  if (giorniRimasti <= 5) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
        <Clock className="w-3 h-3" />
        Scade in {giorniRimasti}gg
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">
      Scade {format(scadenza, "d MMM yyyy", { locale: it })}
    </span>
  );
}

export default function AttiRequestList() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["attiRequests"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.AttiRequest.filter({ user_email: user.email }, "-created_date", 50);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <FileSearch className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Nessuna richiesta atti effettuata</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {requests.map((req, i) => {
        const stato = STATO_CONFIG[req.stato] || STATO_CONFIG.bozza;
        return (
          <motion.div
            key={req.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-start gap-4 p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
              <FileSearch className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">
                  {req.documento_tipo} — {req.comune}
                </p>
                <Badge variant="outline" className={`${stato.className} text-[11px]`}>
                  {stato.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 inline" />
                Fg. {req.foglio} · Part. {req.particella}
                {req.subalterno ? ` · Sub. ${req.subalterno}` : ""}
                {req.provincia ? ` · ${req.provincia}` : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Creata {format(new Date(req.created_date), "d MMM yyyy", { locale: it })}
                {req.data_invio && ` · Inviata ${format(new Date(req.data_invio), "d MMM yyyy", { locale: it })}`}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5">
              <ScadenzaBadge data_scadenza={req.data_scadenza} />
              {req.numero_protocollo && (
                <span className="text-xs text-muted-foreground">Prot. {req.numero_protocollo}</span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}