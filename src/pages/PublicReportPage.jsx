import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getPublicReport } from "@/functions/getPublicReport";
import { Loader2, Lock, AlertTriangle } from "lucide-react";
import ReportPageContent from "@/components/report/ReportPageContent";

export default function PublicReportPage() {
  const { reportId } = useParams();
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const [query, setQuery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!reportId || !token) {
      setError("Link non valido — token mancante.");
      setLoading(false);
      return;
    }

    getPublicReport({ query_id: reportId, token })
      .then((res) => {
        const data = res?.data;
        if (data?.error) {
          setError(
            data.error === 'Link scaduto'
              ? "Il link di accesso è scaduto. Richiedi un nuovo link al mittente."
              : data.error === 'Token non valido'
              ? "Token non valido — controlla di aver copiato il link correttamente."
              : data.error
          );
          return;
        }
        if (!data?.query) {
          setError("Report non trovato.");
          return;
        }
        setQuery(data.query);
      })
      .catch(() => setError("Errore nel caricamento del report."))
      .finally(() => setLoading(false));
  }, [reportId, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-8 max-w-md">
          <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-amber-900 mb-2">Accesso non consentito</h2>
          <p className="text-sm text-amber-800 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-2 text-sm font-semibold text-white"
            style={{ background: '#1A3A6B' }}
          >
            Vai a UrbiCheck →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-3 flex items-center gap-2 bg-white">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Accesso tramite link privato — UrbiCheck</span>
      </div>
      <ReportPageContent query={query} isPublicView={true} />
    </div>
  );
}