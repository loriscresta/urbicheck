import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import PaymentGate from "@/components/report/PaymentGate";
import ReportPageContent from "@/components/report/ReportPageContent";
import { useToast } from "@/components/ui/use-toast";

export default function ReportPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [comuneRecord, setComuneRecord] = useState(null);
  const { toast } = useToast();

  // Show credit tier toast after successful charge (carried via sessionStorage)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('urbicheck_last_charge');
      if (!raw) return;
      sessionStorage.removeItem('urbicheck_last_charge');
      const cr = JSON.parse(raw);

      let title = '', desc = '';
      if (cr?.tier === 'free') {
        const used = cr.free_reports_used || 1;
        const total = cr.free_reports_total || 3;
        const remaining = total - used;
        title = '🎁 Report gratuito utilizzato';
        desc = `Report gratuito #${used}/${total} — ne hai ancora ${remaining} gratuiti`;
      } else if (cr?.tier === 'launch_paid') {
        const used = cr.launch_reports_used || 1;
        const total = cr.launch_reports_total || 3;
        title = '🚀 Report beta €2,99';
        desc = `€2,99 scalati dal tuo credito (report lancio #${used}/${total})`;
      } else if (cr?.tier === 'standard') {
        title = '💳 Report €9,90';
        desc = '€9,90 scalati dal tuo credito';
      }

      if (title) {
        toast({ title, description: desc });
      }
    } catch (_e) {}
  }, []);

  const { data: query, isLoading, refetch } = useQuery({
    queryKey: ["query", id],
    queryFn: async () => {
      const queries = await base44.entities.CadastralQuery.filter({ id });
      const q = queries[0];
      if (q?.comune_id) {
        base44.entities.ComuneItalia.filter({ id: q.comune_id })
          .then(res => { if (res[0]) setComuneRecord(res[0]); })
          .catch(() => {});
      }
      return q;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!query) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">Report non trovato</p>
        <Link to="/history" className="text-primary text-sm hover:underline mt-2 inline-block">Torna allo storico</Link>
      </div>
    );
  }

  if (query.paid !== true) {
    return (
      <PaymentGate
        query={query}
        onPaid={async () => {
          await refetch();
          queryClient.invalidateQueries({ queryKey: ["userCredits"] });
          queryClient.invalidateQueries({ queryKey: ["recentQueries"] });
        }}
      />
    );
  }

  return <ReportPageContent query={query} refetch={refetch} />;
}