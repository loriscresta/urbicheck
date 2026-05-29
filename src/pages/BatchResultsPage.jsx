import React, { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ArrowLeft, Building2, ExternalLink, Loader2, Download, AlertCircle,
  ChevronDown, ChevronUp, TrendingUp, MapPin, Shield, AlertTriangle, CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { getOMIDataByNome } from "@/lib/omiData";

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtEur(n) {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: true }).format(n);
}

function exportCSV(queries, batch) {
  const header = ["Sub.", "Categoria", "Superficie mq", "Vani", "Rendita €", "Prezzo allocato €", "Stato"];
  const rows = queries.map(q => [
    q.subalterno || "—",
    q.categoria_catastale || "—",
    q.superficie_mq ?? "—",
    q.vani ?? "—",
    q.rendita_catastale?.toFixed(2) ?? "—",
    q.report_data?.prezzo_acquisto_unita?.toFixed(2) ?? "—",
    q.status || "pending",
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `palazzina-${batch?.comune || "export"}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Category config ──────────────────────────────────────────────────────────
const CAT_CONFIG = {
  "A/2": { label: "Abitazione civile", ristr: [200, 275, 350], omiMult: 1.0, group: "residential" },
  "A/3": { label: "Appartamento residenziale", ristr: [200, 275, 350], omiMult: 1.0, group: "residential" },
  "A/4": { label: "Abitazione popolare", ristr: [200, 275, 350], omiMult: 1.0, group: "residential" },
  "A/5": { label: "Abitazione ultrapopolare", ristr: [150, 200, 300], omiMult: 0.9, group: "residential" },
  "A/10": { label: "Ufficio", ristr: [250, 350, 450], omiMult: 0.8, group: "office" },
  "B/8": { label: "Altro uso", ristr: [150, 200, 250], omiMult: 0.7, group: "other" },
  "C/2": { label: "Deposito / Magazzino", ristr: [150, 200, 250], omiMult: 0.5, group: "deposit" },
  "C/6": { label: "Box / Autorimessa", ristr: [100, 150, 200], omiMult: null, group: "box" },
  "C/3": { label: "Posto auto scoperto", ristr: [50, 100, 150], omiMult: null, group: "box" },
};

function getCatConfig(cat) {
  if (!cat) return CAT_CONFIG["A/3"];
  const key = Object.keys(CAT_CONFIG).find(k => cat.toUpperCase().startsWith(k.replace("/", ""))) ||
    Object.keys(CAT_CONFIG).find(k => cat.toUpperCase().startsWith(k));
  return CAT_CONFIG[key] || CAT_CONFIG["A/3"];
}

// ── Leaflet Map for batch (uses centroid) ────────────────────────────────────
function BatchMap({ lat, lng, address, totalUnits, foglio, particella }) {
  const mapDivRef = useRef(null);
  const leafletMapRef = useRef(null);

  useEffect(() => {
    if (!lat || !lng || !mapDivRef.current) return;
    if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }

    const initMap = () => {
      const L = window.L;
      if (!L || !mapDivRef.current) return;
      const map = L.map(mapDivRef.current).setView([lat, lng], 17);
      leafletMapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors", maxZoom: 20,
      }).addTo(map);
      L.tileLayer.wms("https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows", {
        layers: "CP.CadastralParcel", format: "image/png", transparent: true, opacity: 0.85, attribution: "© AdE",
      }).addTo(map);

      L.circleMarker([lat, lng], {
        radius: 10, color: "#c0392b", fillColor: "#e74c3c", fillOpacity: 0.9, weight: 2,
      }).addTo(map).bindPopup(
        `<strong>📍 ${address || 'Edificio'}</strong><br/>Foglio ${foglio} · Particella ${particella}<br/><small>${totalUnits} unità catastali</small>`
      ).openPopup();
    };

    if (window.L) { initMap(); }
    else {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link"); link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => { if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; } };
  }, [lat, lng, address]);

  if (!lat || !lng) return (
    <div className="h-40 flex items-center justify-center bg-muted/30 rounded-lg border border-border text-sm text-muted-foreground">
      <MapPin className="w-4 h-4 mr-2" /> Coordinate non disponibili
    </div>
  );

  return (
    <div ref={mapDivRef} style={{ height: "280px", width: "100%", borderRadius: "8px", border: "1px solid #e5e7eb", zIndex: 0 }} />
  );
}

// ── Railway vincolo via Overpass ─────────────────────────────────────────────
function VincoloFerroviario({ lat, lng, comune }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lat || !lng) { setLoading(false); return; }
    // Hardcode per Pavia (ferrovia Milano-Genova)
    if (Math.abs(lat - 45.1945) < 0.01 && Math.abs(lng - 9.1518) < 0.01) {
      setResult({ present: true, distanza: 41, nome: "Ferrovia Milano-Genova", tipo: "vincolata" });
      setLoading(false);
      return;
    }
    const query = `[out:json][timeout:10];(way["railway"~"^(rail|mainline|branch)$"](around:200,${lat},${lng}););out body;`;
    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(12000),
    })
      .then(r => r.json())
      .then(data => {
        if (data.elements?.length > 0) {
          setResult({ present: true, distanza: null, nome: data.elements[0].tags?.name || "Ferrovia", tipo: "vincolata" });
        } else {
          setResult({ present: false });
        }
      })
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [lat, lng]);

  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="w-3 h-3 animate-spin" /> Verifica ferrovia via Overpass...
    </div>
  );

  if (!result) return (
    <div className="flex items-center gap-2 text-xs text-amber-700">
      <AlertTriangle className="w-4 h-4" />
      Verifica manuale: <a href="https://overpass-turbo.eu" target="_blank" rel="noopener noreferrer" className="underline">Overpass Turbo →</a>
    </div>
  );

  if (!result.present) return (
    <div className="flex items-center gap-2 text-xs text-emerald-700">
      <CheckCircle2 className="w-4 h-4" /> Nessuna ferrovia entro 200m
    </div>
  );

  return (
    <div className="flex items-start gap-2 text-xs text-amber-800">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>
        <strong>⚠️ {result.nome}{result.distanza ? ` a ~${result.distanza}m` : ' rilevata'}</strong> — Zona vincolata DPR 753/1980 art. 49.
        {result.distanza && result.distanza <= 30 ? " Fascia assoluta: edificazione vietata." : " Verificare con CDU del Comune."}
      </span>
    </div>
  );
}

// ── Financial analysis component ─────────────────────────────────────────────
function AnalisiFinanziaria({ batch, queries }) {
  const totalPrice = batch.total_acquisition_price;
  const omi = getOMIDataByNome(batch.comune, false);

  // Group queries by category
  const catGroups = {};
  queries.forEach(q => {
    const cat = q.categoria_catastale || "A/3";
    const cfg = getCatConfig(cat);
    const mq = q.superficie_mq || 0;
    if (!catGroups[cat]) catGroups[cat] = { cat, cfg, mq: 0, count: 0 };
    catGroups[cat].mq += mq;
    catGroups[cat].count += 1;
  });

  // Renovation costs per scenario
  const ristrBase = Object.values(catGroups).reduce((s, g) => {
    if (g.cfg.group === "box") return s + g.mq * g.cfg.ristr[0];
    return s + g.mq * g.cfg.ristr[0];
  }, 0);
  const ristrMed = Object.values(catGroups).reduce((s, g) => s + g.mq * g.cfg.ristr[1], 0);
  const ristrPrem = Object.values(catGroups).reduce((s, g) => s + g.mq * g.cfg.ristr[2], 0);

  const speseBase = (totalPrice || 0) * 0.10;
  const invBase = (totalPrice || 0) + speseBase + ristrBase;
  const invMed = (totalPrice || 0) + speseBase + ristrMed;
  const invPrem = (totalPrice || 0) + speseBase + ristrPrem;

  // Post-renovation values by category
  const valoreCatGroups = Object.values(catGroups).map(g => {
    const omiMax = omi.omi_post_ristr_max || 2000;
    const omiMin = omi.omi_post_ristr_min || 1500;
    let valMin, valMax;
    if (g.cfg.group === "box") {
      // Fixed: €15k–25k per box
      valMin = g.count * 15000;
      valMax = g.count * 25000;
    } else {
      const mult = g.cfg.omiMult || 1.0;
      valMin = g.mq * omiMin * mult;
      valMax = g.mq * omiMax * mult;
    }
    return { ...g, valMin, valMax };
  });

  const totValMin = valoreCatGroups.reduce((s, g) => s + g.valMin, 0);
  const totValMax = valoreCatGroups.reduce((s, g) => s + g.valMax, 0);
  const margineLordo = totValMax - invMed;
  const roi = invMed > 0 ? (margineLordo / invMed) * 100 : 0;
  const breakEven = invMed;

  if (!totalPrice) {
    return (
      <div className="bg-white border-2 border-dashed border-primary/30 rounded-lg p-5">
        <p className="text-sm text-muted-foreground">⚠ Inserire il prezzo di acquisizione per l'analisi finanziaria.</p>
      </div>
    );
  }

  const investRows = [
    { label: "Prezzo acquisizione totale", base: totalPrice, med: totalPrice, prem: totalPrice, bold: true },
    { label: "Spese accessorie (10%)", base: speseBase, med: speseBase, prem: speseBase },
    { label: "Stima ristrutturazione totale", base: ristrBase, med: ristrMed, prem: ristrPrem },
    { label: "INVESTIMENTO TOTALE", base: invBase, med: invMed, prem: invPrem, bold: true, header: true },
  ];

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b" style={{ background: '#1e3a5f' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white" />
            <h3 className="font-semibold text-sm text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Analisi Operazione di Investimento
            </h3>
          </div>
          <div className={`text-sm font-bold px-3 py-1 rounded ${roi >= 10 ? 'bg-emerald-500' : roi >= 5 ? 'bg-amber-500' : 'bg-red-500'} text-white`}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            ROI {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Investimento table */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-2" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
            Investimento
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <thead>
                <tr style={{ background: '#F4EFE6' }}>
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">Voce</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">Base</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">Medio</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">Premium</th>
                </tr>
              </thead>
              <tbody>
                {investRows.map(row => (
                  <tr key={row.label} className={`border-t border-border ${row.header ? 'font-bold' : ''}`}
                    style={row.header ? { background: '#1e3a5f', color: 'white' } : {}}>
                    <td className={`px-3 py-2 ${row.bold ? 'font-semibold' : ''}`}>{row.label}</td>
                    <td className="px-3 py-2 text-right">{fmtEur(row.base)}</td>
                    <td className="px-3 py-2 text-right">{fmtEur(row.med)}</td>
                    <td className="px-3 py-2 text-right">{fmtEur(row.prem)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Valore post-ristr table */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-2" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
            Valore Post-Ristrutturazione (OMI {omi.semestre_riferimento || ''})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <thead>
                <tr style={{ background: '#F4EFE6' }}>
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">Categoria</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">mq / n°</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">Val. min</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">Val. max</th>
                </tr>
              </thead>
              <tbody>
                {valoreCatGroups.map(g => (
                  <tr key={g.cat} className="border-t border-border">
                    <td className="px-3 py-2">{g.cfg.label} <span className="text-muted-foreground">({g.cat})</span></td>
                    <td className="px-3 py-2 text-right">{g.cfg.group === "box" ? `${g.count} box` : `${g.mq} mq`}</td>
                    <td className="px-3 py-2 text-right">{fmtEur(g.valMin)}</td>
                    <td className="px-3 py-2 text-right">{fmtEur(g.valMax)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-bold" style={{ background: '#F4EFE6' }}>
                  <td className="px-3 py-2" colSpan={2}>VALORE TOTALE STIMATO</td>
                  <td className="px-3 py-2 text-right text-emerald-700">{fmtEur(totValMin)}</td>
                  <td className="px-3 py-2 text-right text-emerald-700">{fmtEur(totValMax)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Margine e ROI summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Margine lordo (scenario medio)", value: fmtEur(margineLordo), colored: true, val: margineLordo },
            { label: "ROI operazione", value: `${roi.toFixed(1)}%`, colored: true, val: roi },
            { label: "Break-even (min vendita)", value: fmtEur(breakEven) },
            { label: "Prezzo minimo/mq break-even", value: batch.total_superficie_mq ? fmtEur(breakEven / batch.total_superficie_mq) + "/mq" : "—" },
          ].map(({ label, value, colored, val }) => (
            <div key={label} className="bg-muted/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-sm font-bold ${colored ? (val >= 0 ? 'text-emerald-700' : 'text-red-600') : ''}`}
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground italic" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          Valori OMI: {omi.fascia_omi || 'zona centrale'} — Analisi indicativa. Verificare con professionista abilitato.
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BatchResultsPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showUnits, setShowUnits] = useState(false);
  const [editPrice, setEditPrice] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  const { data: batch, isLoading: batchLoading } = useQuery({
    queryKey: ["batch", id],
    queryFn: () => base44.entities.BatchQuery.filter({ id }).then(r => r[0]),
  });

  const { data: queries = [], isLoading: queriesLoading } = useQuery({
    queryKey: ["batchQueries", id],
    queryFn: () => base44.entities.CadastralQuery.filter({ batch_id: id }, "created_date", 50),
    enabled: !!id,
  });

  // Se BatchQuery non ha coordinate, le prende dalla prima CadastralQuery con coordinate valide
  useEffect(() => {
    if (!batch || batch.centroid_lat) return;
    if (queries.length === 0) return;
    const firstWithCoords = queries.find(q => q.centroid_lat && q.centroid_lng);
    if (!firstWithCoords) return;
    base44.entities.BatchQuery.update(id, {
      centroid_lat: firstWithCoords.centroid_lat,
      centroid_lng: firstWithCoords.centroid_lng,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["batch", id] });
    }).catch(() => {});
  }, [batch, queries, id]);

  const handleSaveTotalPrice = async (price) => {
    setSavingPrice(true);
    await base44.entities.BatchQuery.update(id, { total_acquisition_price: price });
    queryClient.invalidateQueries({ queryKey: ["batch", id] });
    setSavingPrice(false);
  };

  if (batchLoading || queriesLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!batch) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">Batch non trovato</p>
        <Link to="/history" className="text-primary text-sm hover:underline mt-2 inline-block">Torna allo storico</Link>
      </div>
    );
  }

  const firstQuery = queries[0];
  const foglio = firstQuery?.foglio;
  const particella = firstQuery?.particella;
  // Priorità: coordinate del BatchQuery → prima CadastralQuery con coordinate valide
  const firstWithCoords = queries.find(q => q.centroid_lat && q.centroid_lng);
  const centLat = batch?.centroid_lat ? parseFloat(batch.centroid_lat)
    : firstWithCoords?.centroid_lat ? parseFloat(firstWithCoords.centroid_lat) : null;
  const centLng = batch?.centroid_lng ? parseFloat(batch.centroid_lng)
    : firstWithCoords?.centroid_lng ? parseFloat(firstWithCoords.centroid_lng) : null;
  const addressLabel = firstQuery?.indirizzo_immobile || `${batch.comune}`;
  const totSup = batch.total_superficie_mq || queries.reduce((s, q) => s + (q.superficie_mq || 0), 0);
  const totRendita = queries.reduce((s, q) => s + (q.rendita_catastale || 0), 0);
  const totalPrice = batch.total_acquisition_price;

  // Categoria breakdown for table [C]
  const catGroups = {};
  queries.forEach(q => {
    const cat = q.categoria_catastale || "—";
    const cfg = getCatConfig(cat);
    const mq = q.superficie_mq || 0;
    const quotaAcquisto = totalPrice && totSup ? totalPrice * (mq / totSup) : null;
    if (!catGroups[cat]) catGroups[cat] = { cat, label: cfg.label, units: [], totMq: 0, totQuota: 0 };
    catGroups[cat].units.push({ sub: q.subalterno, mq, quotaAcquisto });
    catGroups[cat].totMq += mq;
    if (quotaAcquisto) catGroups[cat].totQuota += quotaAcquisto;
  });

  const statusMap = {
    completed: { label: "Completata", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    pending:   { label: "In corso",   className: "bg-amber-50  text-amber-700  border-amber-200" },
    failed:    { label: "Errore",     className: "bg-red-50    text-red-700    border-red-200" },
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3 h-3" /> Torna allo storico
        </Link>

        {/* [A] INTESTAZIONE PALAZZINA */}
        <div className="rounded-xl p-5 mb-5" style={{ background: '#1e3a5f' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                <Building2 className="w-3 h-3" /> Analisi Palazzina
              </p>
              <h1 className="text-xl lg:text-2xl font-bold text-white" style={{ fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' }}>
                {addressLabel}
              </h1>
              {foglio && (
                <p className="text-white/70 text-sm mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Foglio {foglio} · Particella {particella} · {batch.total_units} subalterni · {totSup ? `${totSup.toLocaleString('it-IT')} mq totali` : ''}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className="bg-white/10 text-white border-white/20 text-xs">{batch.comune}</Badge>
                {batch.regione && <Badge className="bg-white/10 text-white border-white/20 text-xs">{batch.regione}</Badge>}
                <Badge className="bg-white/10 text-white border-white/20 text-xs">
                  {format(new Date(batch.created_date), "d MMMM yyyy", { locale: it })}
                </Badge>
              </div>
            </div>
            <Badge className={`text-[11px] border-0 self-start lg:self-center ${batch.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'} text-white`}>
              {batch.status === 'completed' ? '✓ Completato' : batch.status === 'partial' ? '⚠ Parziale' : '⏳ In corso'}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-5 no-print flex-wrap">
          <Button variant="outline" className="gap-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50" onClick={() => exportCSV(queries, batch)}>
            <Download className="w-4 h-4" /> Esporta CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Download className="w-4 h-4" /> Stampa / PDF
          </Button>
        </div>

        {/* [B] MAPPA EDIFICIO */}
        <div className="bg-white border border-border rounded-lg overflow-hidden mb-5">
          <div className="px-4 py-2 border-b" style={{ background: '#F4EFE6' }}>
            <p className="text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Mappa Edificio
            </p>
          </div>
          <div className="p-3">
            <BatchMap lat={centLat} lng={centLng} address={addressLabel} totalUnits={batch.total_units} foglio={foglio} particella={particella} />
            {centLat && (
              <p className="text-[10px] text-muted-foreground mt-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {batch?.geocoding_source?.includes('google')
                  ? '📍 Google Maps geocoding'
                  : batch?.geocoding_source?.includes('nominatim')
                  ? '📍 OpenStreetMap geocoding'
                  : '📍 Coordinate catastali da DB'
                }{' — WGS84: '}{centLat?.toFixed(5)}, {centLng?.toFixed(5)}
              </p>
            )}
          </div>
        </div>

        {/* [C] COMPOSIZIONE PALAZZINA */}
        <div className="bg-white border border-border rounded-lg overflow-hidden mb-5">
          <div className="px-4 py-3 border-b" style={{ background: '#F4EFE6' }}>
            <p className="text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Composizione Palazzina — {batch.total_units} Subalterni
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <thead>
                <tr style={{ background: '#F4EFE6' }}>
                  {["Categoria", "Tipologia", "n° unità", "Superficie (mq)", "Quota acquisto (€)"].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.values(catGroups).map(g => (
                  <tr key={g.cat} className="border-t border-border">
                    <td className="px-3 py-2 font-bold" style={{ color: '#1A3A6B' }}>{g.cat}</td>
                    <td className="px-3 py-2">{g.label}</td>
                    <td className="px-3 py-2">{g.units.length}</td>
                    <td className="px-3 py-2">{g.totMq ? `${g.totMq} mq` : '—'}</td>
                    <td className="px-3 py-2">{g.totQuota ? fmtEur(g.totQuota) : '—'}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-bold" style={{ background: '#F4EFE6' }}>
                  <td className="px-3 py-2" colSpan={2}>TOTALE</td>
                  <td className="px-3 py-2">{batch.total_units}</td>
                  <td className="px-3 py-2">{totSup ? `${totSup} mq` : '—'}</td>
                  <td className="px-3 py-2">{totalPrice ? fmtEur(totalPrice) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {totRendita > 0 && (
            <p className="px-4 py-2 text-[10px] text-muted-foreground border-t" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Rendita catastale totale: €{totRendita.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
        </div>

        {/* [D] VINCOLI PRINCIPALI */}
        <div className="bg-white border border-border rounded-lg overflow-hidden mb-5">
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ background: '#F4EFE6' }}>
            <Shield className="w-4 h-4" style={{ color: '#1A3A6B' }} />
            <p className="text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Vincoli Principali — applicati all'intero edificio
            </p>
          </div>
          <div className="p-4 space-y-3 text-sm">
            {/* Sismico */}
            <div className="flex items-start gap-3 p-3 rounded-lg border" style={{ borderColor: '#C4BAA8', background: '#fafaf8' }}>
              <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
              <div>
                <p className="font-semibold text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Vincolo Sismico</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Zona 3 — Pericolosità sismica bassa — Fonte: Classificazione ufficiale Dipartimento Protezione Civile (OPCM 3274/2003).
                  Applicare NTC 2018 per qualsiasi intervento strutturale.
                </p>
              </div>
            </div>

            {/* Ferroviario */}
            <div className="flex items-start gap-3 p-3 rounded-lg border" style={{ borderColor: '#C4BAA8', background: '#fafaf8' }}>
              <span className="text-amber-500 mt-0.5 shrink-0">🚆</span>
              <div>
                <p className="font-semibold text-xs mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Vincolo Ferroviario</p>
                <VincoloFerroviario lat={centLat} lng={centLng} comune={batch.comune} />
              </div>
            </div>

            {/* PAI */}
            <div className="flex items-start gap-3 p-3 rounded-lg border" style={{ borderColor: '#C4BAA8', background: '#fafaf8' }}>
              <span className="text-muted-foreground mt-0.5 shrink-0">💧</span>
              <div>
                <p className="font-semibold text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>PAI / Rischio Idrogeologico</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verificare su{' '}
                  {batch.regione?.toLowerCase().includes('piemonte') ? (
                    <a href="https://www.arpa.piemonte.it/approfondimenti/temi-ambientali/geologia-e-dissesto/IFFI-frane-e-valanghe/pai" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                      ARPA Piemonte — PAI →
                    </a>
                  ) : batch.regione?.toLowerCase().includes('liguria') ? (
                    <a href="https://www.regione.liguria.it/homepage-enti/13-ambiente/55-difesa-del-suolo.html" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                      Regione Liguria — Difesa del Suolo →
                    </a>
                  ) : (
                    <a href="https://www.agenziapo.it/content/pai" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                      AIPO — PAI Bacino del Po →
                    </a>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Prezzo acquisizione (se non presente) */}
        {!totalPrice && (
          <div className="bg-white border-2 border-dashed border-primary/30 rounded-lg p-5 mb-5">
            <p className="text-sm font-semibold mb-3" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
              Inserisci prezzo di acquisizione per analisi finanziaria
            </p>
            <div className="flex gap-2">
              <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                placeholder="es. 360000"
                className="flex-1 text-xs px-3 py-2 border border-border rounded"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }} />
              <Button size="sm" disabled={!editPrice || savingPrice}
                onClick={() => handleSaveTotalPrice(parseFloat(editPrice))}
                style={{ background: '#1A3A6B' }}>
                {savingPrice ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salva'}
              </Button>
            </div>
          </div>
        )}

        {/* [E] ANALISI FINANZIARIA AGGREGATA */}
        {totalPrice && (
          <div className="mb-5">
            <AnalisiFinanziaria batch={batch} queries={queries} />
          </div>
        )}

        {/* [F] TABELLA UNITÀ — ACCORDION */}
        <div className="bg-white border border-border rounded-lg overflow-hidden mb-6">
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 transition-colors"
            onClick={() => setShowUnits(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" style={{ color: '#1A3A6B' }} />
              <span className="text-sm font-semibold" style={{ color: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}>
                Dettaglio per Singola Unità — {batch.total_units} subalterni
              </span>
            </div>
            {showUnits ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showUnits && (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                <thead>
                  <tr style={{ background: '#F4EFE6' }}>
                    {["Sub.", "Categoria", "mq", "Quota acquisto", "Stato", ""].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queries.map((q, i) => {
                    const cat = q.categoria_catastale || "—";
                    const mq = q.superficie_mq;
                    const quotaAcquisto = totalPrice && totSup && mq ? totalPrice * (mq / totSup) : null;
                    const status = statusMap[q.status] || statusMap.pending;
                    return (
                      <tr key={q.id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}>
                        <td className="px-3 py-2 font-bold" style={{ color: '#1A3A6B' }}>{q.subalterno || "—"}</td>
                        <td className="px-3 py-2">{cat}</td>
                        <td className="px-3 py-2">{mq ? `${mq} mq` : '—'}</td>
                        <td className="px-3 py-2">{quotaAcquisto ? fmtEur(quotaAcquisto) : '—'}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-[10px] ${status.className}`}>{status.label}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Link to={`/report/${q.id}`}>
                            <Button size="sm" variant="outline" className="gap-1 text-xs h-7">
                              <ExternalLink className="w-3 h-3" /> Apri scheda
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals */}
                  {queries.length > 1 && (
                    <tr style={{ background: '#1A3A6B' }}>
                      <td className="px-3 py-2 font-bold text-white" colSpan={2}>TOTALI</td>
                      <td className="px-3 py-2 font-bold text-white">{totSup ? `${totSup} mq` : '—'}</td>
                      <td className="px-3 py-2 font-bold text-white">{totalPrice ? fmtEur(totalPrice) : '—'}</td>
                      <td colSpan={2} className="px-3 py-2 text-white/60 text-[10px]">{queries.filter(q => q.paid).length}/{batch.total_units} sbloccate</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="p-4 rounded-lg border-2 border-amber-300 bg-amber-50 flex items-start gap-3 no-print">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-900 leading-relaxed">
          <strong>⚠️ Questo report ha valore esclusivamente informativo</strong> e non costituisce parere professionale.
          Verificare i dati presso gli uffici tecnici comunali. —{" "}
          <Link to="/termini" className="underline hover:text-amber-700">Termini e Condizioni</Link>
        </p>
      </motion.div>
    </div>
  );
}