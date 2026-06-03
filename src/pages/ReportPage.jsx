import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import PaymentGate from "@/components/report/PaymentGate";
import ReportPageContent from "@/components/report/ReportPageContent";

export default function ReportPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [comuneRecord, setComuneRecord] = useState(null);

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