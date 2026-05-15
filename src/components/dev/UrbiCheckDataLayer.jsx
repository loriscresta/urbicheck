import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight, ExternalLink, Database } from "lucide-react";
import { urbicheck_data_lookup } from "@/functions/urbicheck_data_lookup";

// ── Costanti ──────────────────────────────────────────────────────────────

const REGIONI_ORDINATE = [
  { key: "valle_daosta",   label: "Valle d'Aosta" },
  { key: "piemonte",       label: "Piemonte" },
  { key: "lombardia",      label: "Lombardia" },
  { key: "trentino_aa",    label: "Trentino-Alto Adige" },
  { key: "veneto",         label: "Veneto" },
  { key: "friuli_vg",      label: "Friuli-Venezia Giulia" },
  { key: "liguria",        label: "Liguria" },
  { key: "emilia_romagna", label: "Emilia-Romagna" },
  { key: "toscana",        label: "Toscana" },
  { key: "umbria",         label: "Umbria" },
  { key: "marche",         label: "Marche" },
  { key: "lazio",          label: "Lazio" },
  { key: "abruzzo",        label: "Abruzzo" },
  { key: "molise",         label: "Molise" },
  { key: "campania",       label: "Campania" },
  { key: "puglia",         label: "Puglia" },
  { key: "basilicata",     label: "Basilicata" },
  { key: "calabria",       label: "Calabria" },
  { key: "sicilia",        label: "Sicilia" },
  { key: "sardegna",       label: "Sardegna" },
];

const SIT_DISPLAY = {
  piemonte:       { label: "Piemonte",           wfs: "https://www.geoportale.piemonte.it/geoserver/wfs",                   layer: "PRGC:PRGC_VIGENTE",          tipo: "PRG",  licenza: "CC BY 4.0", copertura: "alta" },
  lombardia:      { label: "Lombardia",           wfs: "https://www.geoportale.regione.lombardia.it/geoserver/wfs",          layer: "rt_pgt_pgt.pgt_l_limite",    tipo: "PGT",  licenza: "CC BY 4.0", copertura: "alta" },
  veneto:         { label: "Veneto",              wfs: "https://idt2.regione.veneto.it/geoserver/IDT2/wfs",                  layer: "IDT2:PRG",                   tipo: "PRG",  licenza: "CC BY 4.0", copertura: "alta" },
  toscana:        { label: "Toscana",             wfs: "https://www502.regione.toscana.it/geoscopio/wfs",                    layer: "urbanistica:prg_vigente",     tipo: "PRG",  licenza: "CC BY 4.0", copertura: "alta" },
  lazio:          { label: "Lazio",               wfs: "https://geoportale.regione.lazio.it/geoserver/wfs",                  layer: "urbanistica:prg_vigente",     tipo: "PRG",  licenza: "CC BY 4.0", copertura: "alta" },
  emilia_romagna: { label: "Emilia-Romagna",      wfs: "https://servizissiir.regione.emilia-romagna.it/GeoServer/wfs",       layer: "siter:PSC",                  tipo: "PSC",  licenza: "CC BY 4.0", copertura: "alta" },
  sardegna:       { label: "Sardegna",            wfs: "https://www.sardegnageoportale.it/geoserver/wfs",                    layer: "srt:PUC",                    tipo: "PUC",  licenza: "CC BY 4.0", copertura: "alta" },
  liguria:        { label: "Liguria",             wfs: "https://srvcarto.regione.liguria.it/geoserver/wfs",                  layer: "PIANI:puc_vigente",           tipo: "PUC",  licenza: "CC BY 4.0", copertura: "media" },
  campania:       { label: "Campania",            wfs: "https://sit.regione.campania.it/geoserver/wfs",                      layer: "sit_campania:puc_vigente",    tipo: "PUC",  licenza: "CC BY",     copertura: "media" },
  puglia:         { label: "Puglia",              wfs: "https://pugliacon.regione.puglia.it/wfs",                            layer: "pugliacon:prg_pf",            tipo: "PRG",  licenza: "CC BY",     copertura: "media" },
  calabria:       { label: "Calabria",            wfs: "https://geoportale.regione.calabria.it/geoserver/wfs",               layer: "calabria:psc_vigente",        tipo: "PSC",  licenza: "CC BY",     copertura: "media" },
  friuli_vg:      { label: "Friuli-Venezia Giulia", wfs: "https://irdat.regione.fvg.it/CTRN/wfs",                           layer: "PS.PLU",                     tipo: "PRGC", licenza: "CC BY",     copertura: "media" },
  umbria:         { label: "Umbria",              wfs: "https://webgis.regione.umbria.it/geoserver/wfs",                     layer: "umbria:piani_regolatori",     tipo: "PRG",  licenza: "CC BY",     copertura: "media" },
  trentino_aa:    { label: "Trentino-Alto Adige", wfs: "https://siat.provincia.tn.it/geoserver/wfs",                        layer: "prg_trentino",                tipo: "PRG",  licenza: "CC BY",     copertura: "media" },
  valle_daosta:   { label: "Valle d'Aosta",       wfs: "https://geoportale.regione.vda.it/geoserver/wfs",                   layer: "vda:PRG_COMUNI",              tipo: "PRG",  licenza: "CC BY",     copertura: "media" },
  sicilia:        { label: "Sicilia",             wfs: null, layer: null, tipo: "PRG", licenza: "n.d.", copertura: "bassa" },
  abruzzo:        { label: "Abruzzo",             wfs: null, layer: null, tipo: "PRG", licenza: "n.d.", copertura: "bassa" },
  marche:         { label: "Marche",              wfs: null, layer: null, tipo: "PRG", licenza: "n.d.", copertura: "bassa" },
  basilicata:     { label: "Basilicata",          wfs: null, layer: null, tipo: "PRG", licenza: "n.d.", copertura: "bassa" },
  molise:         { label: "Molise",              wfs: null, layer: null, tipo: "PRG", licenza: "n.d.", copertura: "bassa" },
};

const STATUS_CONFIG = {
  found:        { color: "#22c55e", bg: "#f0fdf4", border: "#86efac", label: "Dato disponibile",      desc: "PRG vettoriale da WFS ufficiale" },
  partial:      { color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d", label: "Dato parziale",          desc: "Metadati presenti o WFS con copertura incompleta" },
  catasto_only: { color: "#ef4444", bg: "#fef2f2", border: "#fca5a5", label: "PRG non open",           desc: "Comune nel Catasto AdE. PRG non disponibile in formato aperto." },
  missing:      { color: "#ef4444", bg: "#fef2f2", border: "#fca5a5", label: "Comune non trovato",     desc: "Non presente in RNDT, SIT né Catasto AdE" },
  timeout:      { color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d", label: "Timeout WFS",            desc: "Il server WFS non ha risposto entro 8 secondi" },
  wfs_error:    { color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d", label: "WFS non raggiungibile",  desc: "Endpoint WFS non disponibile" },
  no_wfs:       { color: "#ef4444", bg: "#fef2f2", border: "#fca5a5", label: "Nessun WFS regionale",   desc: "Regione senza endpoint WFS aperto" },
  idle:         { color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", label: "—",                      desc: "Inserisci comune e regione per verificare" },
  loading:      { color: "#3b82f6", bg: "#eff6ff", border: "#93c5fd", label: "Verifica in corso...",   desc: "" },
};

const LOADING_STEPS = [
  "Cerco nel catalogo RNDT...",
  "Verifico SIT regionale WFS...",
  "Controllo Catasto AdE...",
];

const TIPO_COLORS = {
  PRG:  "#1A3A6B",
  PGT:  "#0e7490",
  PUC:  "#7c3aed",
  PSC:  "#b45309",
  PRGC: "#0f766e",
};

// ── Subcomponents ─────────────────────────────────────────────────────────

function StatusCard({ result }) {
  if (!result) return null;
  const cfg = STATUS_CONFIG[result.status] || STATUS_CONFIG.idle;
  const Icon = result.status === "found" ? CheckCircle2 : result.status === "partial" ? AlertTriangle : XCircle;
  return (
    <div className="rounded-lg border p-4 mt-4" style={{ background: cfg.bg, borderColor: cfg.border }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5" style={{ color: cfg.color }} />
        <span className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
        {result.livello && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: cfg.border, color: cfg.color }}>
            Livello {result.livello}
          </span>
        )}
        {result.fromCache && (
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">cache</span>
        )}
      </div>
      <p className="text-xs text-gray-600 mb-3">{cfg.desc}</p>
      {result.fonte && <p className="text-xs"><span className="font-semibold">Fonte:</span> {result.fonte}</p>}
      {result.layer && <p className="text-xs font-mono mt-1 text-gray-500">{result.layer}</p>}
      {result.licenza && <p className="text-xs mt-1"><span className="font-semibold">Licenza:</span> {result.licenza}</p>}
      {result.nota && <p className="text-xs mt-2 italic text-gray-500">{result.nota}</p>}
      {result.metadataUrl && (
        <a href={result.metadataUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs mt-3 underline" style={{ color: "#1A3A6B" }}>
          Visualizza metadati RNDT <ExternalLink className="w-3 h-3" />
        </a>
      )}
      {(result.status === "catasto_only" || result.status === "missing" || result.status === "no_wfs") && (
        <div className="mt-3 p-3 rounded border border-amber-200 bg-amber-50 text-xs text-amber-800">
          <strong>PRG non disponibile in formato open.</strong> È possibile richiedere il PRG all'ufficio tecnico comunale
          tramite accesso agli atti (art. 22 L. 241/90). Il comune è obbligato a rispondere entro 30 giorni.
        </div>
      )}
    </div>
  );
}

function SITRegioneRow({ regioneKey }) {
  const [expanded, setExpanded] = useState(false);
  const sit = SIT_DISPLAY[regioneKey];
  if (!sit) return null;
  const coperturaCfg = { alta: { color: "#22c55e", label: "Alta" }, media: { color: "#f59e0b", label: "Media" }, bassa: { color: "#ef4444", label: "Bassa" } };
  const cc = coperturaCfg[sit.copertura] || coperturaCfg.bassa;
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left"
        onClick={() => setExpanded(e => !e)}>
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cc.color }} />
        <span className="flex-1 text-sm font-medium">{sit.label}</span>
        {sit.tipo && (
          <span className="text-xs px-2 py-0.5 rounded font-bold text-white" style={{ background: TIPO_COLORS[sit.tipo] || "#6b7280" }}>
            {sit.tipo}
          </span>
        )}
        {!sit.wfs && <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">No WFS</span>}
        <span className="text-xs text-gray-400">{cc.label}</span>
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 text-xs text-gray-600 space-y-1.5 bg-gray-50">
          {sit.wfs ? (
            <>
              <p><span className="font-semibold">Endpoint WFS:</span> <code className="font-mono text-xs bg-white px-1 rounded">{sit.wfs}</code></p>
              <p><span className="font-semibold">Layer:</span> <code className="font-mono text-xs bg-white px-1 rounded">{sit.layer}</code></p>
              <p><span className="font-semibold">Licenza:</span> {sit.licenza}</p>
            </>
          ) : (
            <p className="text-red-600">Nessun endpoint WFS pubblico disponibile per questa regione.</p>
          )}
          <p><span className="font-semibold">Copertura:</span> {cc.label}</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function UrbiCheckDataLayer() {
  const [activeTab, setActiveTab] = useState("verifica");
  const [nomeComune, setNomeComune] = useState("");
  const [regione, setRegione] = useState("");
  const [loadingStep, setLoadingStep] = useState(-1);
  const [result, setResult] = useState(null);
  const [coperturFilter, setCoperturFilter] = useState(null);

  const handleVerifica = async () => {
    if (!nomeComune || !regione) return;
    setResult(null);

    // Step 1
    setLoadingStep(0);
    await new Promise(r => setTimeout(r, 600));
    // Step 2
    setLoadingStep(1);
    await new Promise(r => setTimeout(r, 400));
    // Step 3
    setLoadingStep(2);

    try {
      const res = await urbicheck_data_lookup({ nomeComune, regione });
      setResult(res.data?.result || null);
    } catch (err) {
      setResult({ status: "missing", livello: null, error: err.message });
    } finally {
      setLoadingStep(-1);
    }
  };

  const isLoading = loadingStep >= 0;

  const coperturCounts = { alta: 7, media: 8, bassa: 5 };
  const regioniOrdinateConSIT = REGIONI_ORDINATE.filter(r => SIT_DISPLAY[r.key]);
  const filteredRegioni = coperturFilter
    ? regioniOrdinateConSIT.filter(r => SIT_DISPLAY[r.key]?.copertura === coperturFilter)
    : regioniOrdinateConSIT;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100" style={{ background: "#1A3A6B" }}>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-white/80" />
          <h3 className="font-bold text-white text-sm tracking-wide">Copertura dati PRG / PUC</h3>
          <span className="text-xs text-white/50 ml-2">Data Source Layer</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: "verifica", label: "Verifica comune" },
          { id: "sit", label: "SIT regionali" },
          { id: "fonti", label: "Fonti nazionali" },
        ].map(tab => (
          <button key={tab.id}
            className={`px-4 py-2.5 text-xs font-semibold transition-colors ${activeTab === tab.id ? "border-b-2 text-[#1A3A6B]" : "text-gray-500 hover:text-gray-800"}`}
            style={activeTab === tab.id ? { borderBottomColor: "#1A3A6B" } : {}}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* ── TAB: Verifica comune ── */}
        {activeTab === "verifica" && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Input
                placeholder="es. Torino, Genova, Roma..."
                value={nomeComune}
                onChange={e => setNomeComune(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleVerifica()}
                className="flex-1"
              />
              <Select value={regione} onValueChange={setRegione}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="Seleziona regione..." />
                </SelectTrigger>
                <SelectContent>
                  {REGIONI_ORDINATE.map(r => (
                    <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleVerifica} disabled={isLoading || !nomeComune || !regione}
                className="font-semibold" style={{ background: "#1A3A6B" }}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verifica"}
              </Button>
            </div>

            {/* Loading steps */}
            {isLoading && (
              <div className="space-y-2 mb-4">
                {LOADING_STEPS.map((step, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs transition-all ${i <= loadingStep ? "opacity-100" : "opacity-30"}`}>
                    {i < loadingStep
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      : i === loadingStep
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                        : <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                    }
                    <span className={i === loadingStep ? "text-blue-600 font-medium" : "text-gray-500"}>{step}</span>
                  </div>
                ))}
              </div>
            )}

            <StatusCard result={result} />
          </div>
        )}

        {/* ── TAB: SIT regionali ── */}
        {activeTab === "sit" && (
          <div>
            {/* Filtri copertura */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { key: null,    label: `Tutte (${REGIONI_ORDINATE.length})`, color: "#6b7280" },
                { key: "alta",  label: `Alta (${coperturCounts.alta})`,      color: "#22c55e" },
                { key: "media", label: `Media (${coperturCounts.media})`,    color: "#f59e0b" },
                { key: "bassa", label: `Bassa (${coperturCounts.bassa})`,    color: "#ef4444" },
              ].map(f => (
                <button key={String(f.key)}
                  onClick={() => setCoperturFilter(f.key === coperturFilter ? null : f.key)}
                  className={`px-3 py-1 rounded text-xs font-semibold border transition-all ${coperturFilter === f.key ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
                  style={coperturFilter === f.key ? { background: f.color, borderColor: f.color } : {}}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {filteredRegioni.map(r => (
                <SITRegioneRow key={r.key} regioneKey={r.key} />
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: Fonti nazionali ── */}
        {activeTab === "fonti" && (
          <div className="space-y-5">
            {/* Diagramma cascata */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Architettura a cascata</p>
              <div className="flex flex-col gap-2">
                {[
                  { num: "1", label: "RNDT", sub: "geodati.gov.it", color: "#22c55e", note: "Catalogo nazionale metadati geografici" },
                  { num: "2", label: "SIT WFS", sub: "SIT Regionali", color: "#f59e0b", note: "Web Feature Service ufficiali regionali" },
                  { num: "3", label: "Catasto AdE", sub: "Agenzia delle Entrate WFS", color: "#ef4444", note: "Solo bbox — rileva presenza particelle" },
                  { num: "✕", label: "Non disponibile", sub: "", color: "#6b7280", note: "PRG non in formato open — accesso atti ex L.241/90" },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: step.color }}>
                        {step.num}
                      </div>
                      {i < 3 && <div className="w-px h-4 bg-gray-200 mt-1" />}
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-bold" style={{ color: step.color }}>{step.label}</p>
                      {step.sub && <p className="text-xs text-gray-500 font-mono">{step.sub}</p>}
                      <p className="text-xs text-gray-500 mt-0.5">{step.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card fonti */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: "RNDT", ente: "Presidenza del Consiglio — AgID", url: "https://geodati.gov.it/RNDT/", desc: "Catalogo nazionale dei metadati geografici. Prima fonte per la ricerca di PRG/PUC." },
                { title: "SIT Regionali WFS", ente: "Regioni italiane", url: null, desc: "15 regioni con endpoint WFS attivo. Layer specifici per tipo piano (PRG, PGT, PUC, PSC)." },
                { title: "Agenzia Entrate WFS", ente: "Agenzia delle Entrate — Catasto", url: "https://wms.cartografia.agenziaentrate.gov.it/", desc: "WFS catasto CP.CadastralParcel. Fallback livello 3 — verifica presenza via BBOX." },
                { title: "SITAP Vincoli", ente: "Ministero della Cultura (MiC)", url: "https://sitap.beniculturali.it/", desc: "Catalogo SIT per vincoli paesaggistici e beni culturali tutelati art.142 D.Lgs 42/2004." },
              ].map((card, i) => (
                <div key={i} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold" style={{ color: "#1A3A6B" }}>{card.title}</p>
                    {card.url && (
                      <a href={card.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{card.ente}</p>
                  <p className="text-xs text-gray-600">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}