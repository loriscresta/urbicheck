import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, Download, MapPin, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { runParcelCoverageScan } from "@/functions/runParcelCoverageScan";

const mono = "'IBM Plex Mono', monospace";
const T = { blue: '#1A3A6B', red: '#B33A2A', paper: '#F4EFE6', border: '#C4BAA8', grey: '#7A7268' };

export default function ParcelCoveragePanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [regioneFilter, setRegioneFilter] = useState("");
  const [scanForRegione, setScanForRegione] = useState("");
  const [progress, setProgress] = useState({ processati: 0, coperti: 0, buchi: 0, geocode_falliti: 0, rimanenti: null, batches: 0 });
  const [log, setLog] = useState([]);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["parcelCoverage"],
    queryFn: () => base44.entities.ParcelCoverageTest.list("-tested_at", 5000),
  });

  const buchi = results.filter(r => r.esito === "buco" || r.esito === "geocode_fallito");
  const filtered = regioneFilter
    ? buchi.filter(r => (r.regione || "").toLowerCase() === regioneFilter.toLowerCase())
    : buchi;

  const handleScan = async () => {
    setScanning(true);
    setProgress({ processati: 0, coperti: 0, buchi: 0, geocode_falliti: 0, rimanenti: null, batches: 0 });
    setLog([]);
    let safety = 0;
    let acc = { processati: 0, coperti: 0, buchi: 0, geocode_falliti: 0, batches: 0 };
    try {
      while (safety < 200) {
        safety++;
        const res = await runParcelCoverageScan({ regione: scanForRegione || undefined, limit: 40, forza: false });
        const data = res?.data || res;
        acc = {
          processati: acc.processati + (data.processati || 0),
          coperti: acc.coperti + (data.coperti || 0),
          buchi: acc.buchi + (data.buchi || 0),
          geocode_falliti: acc.geocode_falliti + (data.geocode_falliti || 0),
          batches: acc.batches + 1,
        };
        setProgress({ ...acc, rimanenti: data.rimanenti_da_testare });
        setLog(l => [`${new Date().toLocaleTimeString('it-IT')} — batch ${acc.batches}: +${data.processati} (coperti ${data.coperti}, buchi ${data.buchi}, geo-fail ${data.geocode_falliti}), rimanenti ${data.rimanenti_da_testare}`, ...l].slice(0, 30));
        if ((data.rimanenti_da_testare ?? 0) <= 0) break;
        if ((data.processati || 0) === 0) break;
      }
      toast({ title: "Scansione completata", description: `${acc.processati} comuni processati, ${acc.buchi} buchi` });
    } catch (e) {
      toast({ title: "Errore scansione", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
      qc.invalidateQueries({ queryKey: ["parcelCoverage"] });
    }
  };

  const exportCSV = () => {
    const headers = ["comune", "provincia", "regione", "codice_istat", "esito", "hits", "comune_code", "test_lat", "test_lon", "tested_at"];
    const rows = filtered.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `urbicheck_buchi_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totCoperti = results.filter(r => r.esito === "coperto").length;

  return (
    <div className="space-y-5">
      <div className="bg-white p-5" style={{ border: `1px solid ${T.border}` }}>
        <p className="text-[10px] font-bold uppercase tracking-[3px] mb-1" style={{ color: T.red, fontFamily: mono }}>Copertura catastale</p>
        <p className="text-xs mb-4" style={{ color: T.grey, fontFamily: mono }}>
          Scansiona i comuni per scoprire dove il lookup catastale NON restituisce particelle. Elabora a batch da 40 finché completata.
        </p>

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-[9px] uppercase tracking-[2px] mb-1" style={{ color: T.grey, fontFamily: mono }}>Regione da scansionare</label>
            <select value={scanForRegione} onChange={e => setScanForRegione(e.target.value)}
              className="h-8 px-2 text-xs border outline-none bg-white" style={{ border: `1px solid ${T.border}`, fontFamily: mono }}>
              <option value="">Tutte (beta)</option>
              <option value="Piemonte">Piemonte</option>
              <option value="Liguria">Liguria</option>
              <option value="Lombardia">Lombardia</option>
            </select>
          </div>
          <button onClick={handleScan} disabled={scanning}
            className="flex items-center gap-2 h-8 px-4 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
            style={{ background: T.blue, fontFamily: mono }}>
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {scanning ? "Scansione..." : "Avvia scansione copertura"}
          </button>
          <button onClick={exportCSV} disabled={filtered.length === 0}
            className="flex items-center gap-2 h-8 px-4 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
            style={{ border: `1px solid ${T.blue}`, color: T.blue, fontFamily: mono }}>
            <Download className="w-3.5 h-3.5" /> Esporta buchi CSV ({filtered.length})
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <Kpi label="Test totali" value={results.length} color={T.blue} />
          <Kpi label="Coperti" value={totCoperti} color="#059669" />
          <Kpi label="Buchi" value={results.filter(r => r.esito === "buco").length} color={T.red} />
          <Kpi label="Geo-falliti" value={results.filter(r => r.esito === "geocode_fallito").length} color="#d97706" />
          <Kpi label="Rimanenti" value={progress.rimanenti ?? "—"} color={T.grey} />
        </div>

        {scanning && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: T.grey, fontFamily: mono }}>
              <span>Batch {progress.batches} · {progress.processati} comuni processati</span>
              <span>{progress.coperti} coperti · {progress.buchi} buchi</span>
            </div>
            <div className="w-full h-2" style={{ background: T.paper }}>
              <div className="h-2 transition-all" style={{ width: `${progress.rimanenti != null ? Math.max(2, Math.min(100, 100 - (progress.rimanenti / Math.max(1, progress.processati + progress.rimanenti)) * 100)) : 5}%`, background: T.blue }} />
            </div>
          </div>
        )}

        {log.length > 0 && (
          <div className="max-h-32 overflow-y-auto p-2 space-y-1" style={{ background: T.paper, border: `1px solid ${T.border}` }}>
            {log.map((l, i) => <p key={i} className="text-[10px]" style={{ color: T.grey, fontFamily: mono }}>{l}</p>)}
          </div>
        )}
      </div>

      {/* Filtri + tabella buchi */}
      <div className="bg-white" style={{ border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 p-3" style={{ borderBottom: `1px solid ${T.border}` }}>
          <AlertTriangle className="w-3.5 h-3.5" style={{ color: T.red }} />
          <p className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: T.grey, fontFamily: mono }}>
            Comuni con esito "buco" ({filtered.length})
          </p>
          <select value={regioneFilter} onChange={e => setRegioneFilter(e.target.value)}
            className="ml-auto h-7 px-2 text-[10px] border outline-none bg-white" style={{ border: `1px solid ${T.border}`, fontFamily: mono }}>
            <option value="">Tutte le regioni</option>
            <option value="Piemonte">Piemonte</option>
            <option value="Liguria">Liguria</option>
            <option value="Lombardia">Lombardia</option>
          </select>
        </div>
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: T.blue }} /></div> : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-xs" style={{ fontFamily: mono }}>
              <thead className="sticky top-0">
                <tr style={{ background: T.paper, borderBottom: `1px solid ${T.border}` }}>
                  {["Comune", "Prov.", "Regione", "Esito", "Hits", "Comune code", "Test"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] uppercase tracking-[1px] font-bold whitespace-nowrap" style={{ color: T.grey }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b hover:bg-stone-50" style={{ borderColor: T.border }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: T.blue }}>{r.comune}</td>
                    <td className="px-3 py-2" style={{ color: T.grey }}>{r.sigla_provincia || r.provincia || "—"}</td>
                    <td className="px-3 py-2" style={{ color: T.grey }}>{r.regione || "—"}</td>
                    <td className="px-3 py-2">
                      {r.esito === "buco" ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: T.red }}><XCircle className="w-3 h-3" /> buco</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "#d97706" }}><AlertTriangle className="w-3 h-3" /> geo-fail</span>
                      )}
                    </td>
                    <td className="px-3 py-2" style={{ color: T.grey }}>{r.hits ?? 0}/5</td>
                    <td className="px-3 py-2" style={{ color: T.grey }}>{r.comune_code || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-[10px]" style={{ color: T.grey }}>
                      {r.tested_at ? new Date(r.tested_at).toLocaleDateString('it-IT') : "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-xs" style={{ color: T.grey }}>Nessun buco rilevato per questo filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, color }) {
  return (
    <div className="p-3" style={{ background: T.paper, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] uppercase tracking-[1px] mb-1" style={{ color: T.grey, fontFamily: mono }}>{label}</p>
      <p className="text-lg font-bold" style={{ color, fontFamily: mono }}>{value}</p>
    </div>
  );
}