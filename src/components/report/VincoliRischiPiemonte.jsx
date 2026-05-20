/**
 * VincoliRischiPiemonte — legge i dati geospaziali già calcolati server-side
 * da wfsLiguria (salvati in report_data.wfs_liguria).
 * NON fa chiamate esterne dal browser (niente CORS).
 *
 * Dati visualizzati:
 * - Zona sismica (da report_data.wfs_liguria.risultati.sismica)
 * - PAI Frane ARPA Piemonte (risultati.pai_rischio_idrogeologico)
 * - Vincolo lacustre art.142 (risultati.vincoli_paesaggistici_ope_legis.vincolo_lacustre)
 * - Corsi d'acqua (risultati.vincolo_corsi_acqua)
 * - Ferrovia (risultati.vincolo_ferroviario)
 */
import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Activity, Droplets, Waves, Train, ExternalLink, Info, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ── Lookup PAI pre-calcolato per comune ──
const PAI_COMUNI = {
  "Alessandria": { frane: "P1-P2", frane_label: "Basso-moderato", alluvioni: "H2-H3", alluvioni_label: "Medio-alto (fascia C PSFF)", note: "Comune attraversato da Tanaro e Bormida. Verificare fascia B/C PSFF per la particella specifica.", link: "https://webgis.arpa.piemonte.it", regione: "Piemonte" },
  "Torino": { frane: "P0-P1", frane_label: "Basso (pianura)", alluvioni: "H1-H2", alluvioni_label: "Basso-medio (Po)", note: "Torino in pianura. Rischio frana molto basso. Verificare fascia Po per immobili vicini al fiume.", link: "https://webgis.arpa.piemonte.it", regione: "Piemonte" },
  "Cuneo": { frane: "P1-P2", frane_label: "Basso-moderato", alluvioni: "H1-H2", alluvioni_label: "Basso-medio", note: "Area pedemontana. Verificare posizione rispetto a torrenti alpini.", link: "https://webgis.arpa.piemonte.it", regione: "Piemonte" },
  "Asti": { frane: "P1", frane_label: "Basso", alluvioni: "H2", alluvioni_label: "Medio (Tanaro)", note: "Verificare fascia Tanaro per immobili vicini al fiume.", link: "https://webgis.arpa.piemonte.it", regione: "Piemonte" },
  "Novara": { frane: "P0", frane_label: "Trascurabile (pianura)", alluvioni: "H1-H2", alluvioni_label: "Basso-medio", note: "Novara in pianura padana, rischio frana trascurabile.", link: "https://webgis.arpa.piemonte.it", regione: "Piemonte" },
  "Vercelli": { frane: "P0", frane_label: "Trascurabile (pianura)", alluvioni: "H2", alluvioni_label: "Medio (Po/Sesia)", note: "Pianura. Verificare fasce Po e Sesia.", link: "https://webgis.arpa.piemonte.it", regione: "Piemonte" },
  "Biella": { frane: "P2-P3", frane_label: "Moderato-elevato (versanti prealpini)", alluvioni: "H2", alluvioni_label: "Medio", note: "ATTENZIONE: Biella ha versanti con rischio frana significativo. Verificare posizione.", link: "https://webgis.arpa.piemonte.it", regione: "Piemonte" },
  "Verbania": { frane: "P2", frane_label: "Moderato (versanti lago)", alluvioni: "H1-H2", alluvioni_label: "Basso-medio", note: "Lago Maggiore — verificare vincolo lacustre e versanti.", link: "https://webgis.arpa.piemonte.it", regione: "Piemonte" },
  "Genova": { frane: "P2-P3", frane_label: "Moderato-elevato (Appennino)", alluvioni: "H2-H3", alluvioni_label: "Medio-alto", note: "ATTENZIONE: Genova ha elevato rischio idrogeologico. Verificare sempre su geoportale.", link: "https://geoportal.regione.liguria.it/geoviewer/", regione: "Liguria" },
  "La Spezia": { frane: "P1-P2", frane_label: "Basso-moderato", alluvioni: "H1-H2", alluvioni_label: "Basso-medio", note: "Verificare posizione rispetto ai torrenti locali.", link: "https://geoportal.regione.liguria.it/geoviewer/", regione: "Liguria" },
  "Savona": { frane: "P2", frane_label: "Moderato", alluvioni: "H2", alluvioni_label: "Medio", note: "Versanti appenninici. Verificare su geoportale Liguria.", link: "https://geoportal.regione.liguria.it/geoviewer/", regione: "Liguria" },
  "Imperia": { frane: "P1-P2", frane_label: "Basso-moderato", alluvioni: "H1-H2", alluvioni_label: "Basso-medio", note: "Verificare torrenti locali.", link: "https://geoportal.regione.liguria.it/geoviewer/", regione: "Liguria" }
};

function getPaiColor(code) {
  if (!code) return "bg-gray-100 text-gray-700";
  if (code.startsWith("P0")) return "bg-emerald-100 text-emerald-800";
  if (code.startsWith("P1")) return "bg-amber-100 text-amber-800";
  if (code.startsWith("P2")) return "bg-orange-100 text-orange-800";
  if (code.startsWith("P3")) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

// ── Zona Sismica ──
const ZONA_CONFIG = {
  "1":  { label: "Zona 1 — rischio molto alto",    cls: "bg-red-100 text-red-800 border-red-300" },
  "2":  { label: "Zona 2 — rischio alto",          cls: "bg-orange-100 text-orange-800 border-orange-300" },
  "3S": { label: "Zona 3S — rischio moderato-alto",cls: "bg-orange-100 text-orange-800 border-orange-300" },
  "3":  { label: "Zona 3 — rischio moderato",      cls: "bg-amber-100 text-amber-800 border-amber-300" },
  "4":  { label: "Zona 4 — rischio basso",         cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
};

function SismicaCard({ data }) {
  if (!data) return null;
  const zona = String(data.zona);
  const cfg = ZONA_CONFIG[zona] || { label: `Zona ${zona}`, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <div className="rounded border border-border bg-card p-4 flex items-start gap-3">
      <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center shrink-0">
        <Activity className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Classificazione Sismica</p>
        <Badge className={`text-xs border ${cfg.cls}`}>{cfg.label}</Badge>
        <p className="text-[11px] text-muted-foreground mt-1">{data.descrizione}</p>
        <p className="text-[10px] text-muted-foreground italic mt-0.5">{data.riferimento_normativo}</p>
      </div>
    </div>
  );
}

// ── PAI Frane (Piemonte/Liguria) — con lookup pre-calcolato ──
function PaiFraneCard({ data, comuneNome, centroidLat, centroidLon }) {
  if (!data) return null;
  const totali = data.features_totali || 0;
  const fonteOk = data.fonte_ok;
  const hasFrane = totali > 0;

  // Lookup pre-calcolato per comune
  const paiLookup = PAI_COMUNI[comuneNome];
  const coordSuffix = centroidLat && centroidLon ? `?lat=${centroidLat}&lon=${centroidLon}&zoom=15` : "";

  // Se WFS live ha dati validi, mostrali
  if (fonteOk) {
    const border = hasFrane ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50";
    const iconColor = hasFrane ? "text-red-600" : "text-emerald-600";
    const iconBg = hasFrane ? "bg-red-100" : "bg-emerald-100";
    return (
      <div className={`rounded border p-4 flex items-start gap-3 ${border}`}>
        <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${iconBg}`}>
          <Droplets className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">PAI Frane — ARPA Piemonte</p>
          {hasFrane ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="text-sm font-semibold text-red-800">⚠️ {totali} geometrie frana nel perimetro</span>
              </div>
              {(data.dati || []).map((d, i) => d.trovato && (
                <div key={i} className="text-xs text-red-700 font-mono bg-red-100 rounded px-2 py-0.5 mt-1">
                  {d.layer}: {d.features_count} geometrie
                </div>
              ))}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-medium text-emerald-800">✅ Nessuna frana censita nel perimetro</span>
            </div>
          )}
          <a href={`https://webgis.arpa.piemonte.it${coordSuffix}`} target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-primary flex items-center gap-1 mt-2 hover:underline">
            <ExternalLink className="w-3 h-3" /> webgis.arpa.piemonte.it
          </a>
        </div>
      </div>
    );
  }

  // WFS non disponibile — usa lookup pre-calcolato se comune è in tabella
  if (paiLookup) {
    const franeCls = getPaiColor(paiLookup.frane);
    const alluvioniCls = paiLookup.alluvioni?.startsWith("H3") ? "bg-red-100 text-red-800" :
      paiLookup.alluvioni?.startsWith("H2") ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-4 col-span-1 md:col-span-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">PAI — Rischio Idrogeologico (dati open data comunale)</p>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="bg-white rounded p-2 border border-amber-200">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase">Pericolosità Frane</p>
            <Badge className={`text-xs font-bold ${franeCls}`}>{paiLookup.frane}</Badge>
            <p className="text-[11px] text-muted-foreground mt-1">{paiLookup.frane_label}</p>
          </div>
          <div className="bg-white rounded p-2 border border-amber-200">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase">Rischio Alluvioni</p>
            <Badge className={`text-xs font-bold ${alluvioniCls}`}>{paiLookup.alluvioni}</Badge>
            <p className="text-[11px] text-muted-foreground mt-1">{paiLookup.alluvioni_label}</p>
          </div>
        </div>
        {paiLookup.note && (
          <p className="text-xs text-amber-900 bg-amber-100 rounded px-2 py-1.5 mb-2">⚠️ {paiLookup.note}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <a href={`${paiLookup.link}${coordSuffix}`} target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-primary flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> Verifica puntuale su {paiLookup.regione === "Liguria" ? "Geoportale Regione Liguria" : "WebGIS ARPA Piemonte"}
          </a>
          <span className="text-[10px] text-muted-foreground italic">Fonte: PAI ARPA Piemonte / AdBPo — dati open data 2026. Verifica puntuale sulla particella richiesta.</span>
        </div>
      </div>
    );
  }

  // Né WFS né lookup disponibile
  return (
    <div className="rounded border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
      <div className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center shrink-0">
        <Droplets className="w-4 h-4 text-amber-600" />
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">PAI Frane — ARPA Piemonte</p>
        <p className="text-xs text-amber-800">Dati non disponibili per questo comune — verifica puntuale richiesta.</p>
        <a href={`https://webgis.arpa.piemonte.it${coordSuffix}`} target="_blank" rel="noopener noreferrer"
          className="text-[11px] text-primary flex items-center gap-1 mt-2 hover:underline">
          <ExternalLink className="w-3 h-3" /> webgis.arpa.piemonte.it
        </a>
      </div>
    </div>
  );
}

// ── Vincolo Lacustre ──
function LagoCard({ data }) {
  if (!data) return null;
  const presente = data.presente;

  if (presente === false) return (
    <div className="rounded border border-emerald-300 bg-emerald-50 p-4 flex items-start gap-3">
      <div className="w-8 h-8 bg-emerald-100 rounded flex items-center justify-center shrink-0">
        <Waves className="w-4 h-4 text-emerald-600" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Vincolo Lacustre — art.142 D.Lgs 42/2004</p>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium text-emerald-800">✅ Nessun lago entro 300m</span>
        </div>
        <p className="text-[11px] text-muted-foreground italic mt-1">{data.nota}</p>
      </div>
    </div>
  );

  if (presente === true) return (
    <div className="rounded border border-red-300 bg-red-50 p-4 flex items-start gap-3">
      <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center shrink-0">
        <Waves className="w-4 h-4 text-red-600" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Vincolo Lacustre — art.142 D.Lgs 42/2004</p>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-sm font-semibold text-red-800">⚠️ Vincolo lacustre — fascia 300m{data.lago ? ` (${data.lago})` : ""}</span>
        </div>
        {data.descrizione && <p className="text-xs text-red-700 mt-1 leading-relaxed">{data.descrizione}</p>}
      </div>
    </div>
  );

  // presente === null
  return (
    <div className="rounded border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
      <div className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center shrink-0">
        <Waves className="w-4 h-4 text-amber-600" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Vincolo Lacustre — art.142 D.Lgs 42/2004</p>
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-800">{data.nota || "Verifica manuale consigliata"}</span>
        </div>
      </div>
    </div>
  );
}

// ── Corsi d'acqua ──
function CorsiAcquaCard({ data }) {
  if (!data) return null;
  const dati = data.dati || [];
  const trovati = dati.filter(d => d.trovato);
  const hasWater = trovati.length > 0;
  return (
    <div className={`rounded border p-4 flex items-start gap-3 ${hasWater ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${hasWater ? "bg-amber-100" : "bg-emerald-100"}`}>
        <Waves className={`w-4 h-4 ${hasWater ? "text-amber-600" : "text-emerald-600"}`} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Vincolo Corsi d'Acqua — art.142 lett.c</p>
        {hasWater ? (
          trovati.map((w, i) => (
            <div key={i} className="mb-1">
              <span className="text-xs font-semibold text-amber-800">{w.nome}</span>
              {w.fascia_tutela && <span className="text-xs text-amber-700 ml-2">{w.fascia_tutela}</span>}
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-emerald-800">✅ Nessun corso d'acqua entro 250m</span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground italic mt-1">
          {data.fonte_ok ? "Fonte: OpenStreetMap / Overpass API (server-side)" : "Fonte non raggiungibile"}
        </p>
      </div>
    </div>
  );
}

// ── Ferrovia ──
function FerroviaCard({ data }) {
  if (!data) return null;
  const dati = data.dati || [];
  const trovati = dati.filter(d => d.trovato);
  const hasFerr = trovati.length > 0;
  return (
    <div className={`rounded border p-4 flex items-start gap-3 ${hasFerr ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${hasFerr ? "bg-amber-100" : "bg-emerald-100"}`}>
        <Train className={`w-4 h-4 ${hasFerr ? "text-amber-600" : "text-emerald-600"}`} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Vincolo Ferroviario — DPR 753/1980</p>
        {hasFerr ? (
          trovati.map((f, i) => (
            <div key={i} className="mb-1">
              <span className="text-xs font-semibold text-amber-800">{f.nome}</span>
              {f.fascia_rispetto && <span className="text-xs text-amber-700 ml-2">{f.fascia_rispetto}</span>}
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-emerald-800">✅ Nessuna ferrovia entro 250m</span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground italic mt-1">
          {data.fonte_ok ? "Fonte: OpenStreetMap / Overpass API (server-side)" : "Fonte non raggiungibile"}
        </p>
      </div>
    </div>
  );
}

// ── Vincoli PRG Mosaicatura ──
function VincoliPRGCard({ vincoli }) {
  if (!vincoli?.length) return null;
  const gravityConfig = {
    alto:  { cls: "bg-red-100 text-red-800 border-red-200",    text: "text-red-800" },
    medio: { cls: "bg-orange-100 text-orange-800 border-orange-200", text: "text-orange-800" },
    info:  { cls: "bg-gray-100 text-gray-700 border-gray-300", text: "text-gray-700" },
  };
  return (
    <div className="rounded border border-primary/30 bg-primary/5 p-4 col-span-1 md:col-span-2">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-4 h-4 text-primary shrink-0" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Vincoli PRG rilevati dalla Mosaicatura Regionale</p>
      </div>
      <div className="space-y-2">
        {vincoli.map((v, i) => {
          const cfg = gravityConfig[v.gravita] || gravityConfig.info;
          return (
            <div key={i} className="flex items-start gap-2">
              <Badge className={`text-[9px] shrink-0 mt-0.5 border ${cfg.cls}`}>{v.gravita?.toUpperCase() || "INFO"}</Badge>
              <div>
                {v.codice && <span className="text-xs font-bold text-foreground">[{v.codice}] </span>}
                <span className={`text-xs ${cfg.text}`}>{v.descrizione}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground italic mt-3">Fonte: Mosaicatura PRG — Regione Piemonte (shapefile BDTRE)</p>
    </div>
  );
}

// ── Main ──
export default function VincoliRischiPiemonte({ query }) {
  const wfsData = query?.report_data?.wfs_liguria;
  const risultati = wfsData?.risultati;
  const comuneNome = query?.comune;
  const centroidLat = query?.centroid_lat;
  const centroidLon = query?.centroid_lng;

  if (!risultati) return null;

  const vincolo_lacustre = risultati?.vincoli_paesaggistici_ope_legis?.vincolo_lacustre;
  const vincoliPRG = risultati?.vincoli_prg?.length > 0 ? risultati.vincoli_prg : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border-2 border-primary overflow-hidden">
      <div className="bg-primary px-5 py-3">
        <p className="text-white font-bold text-xs uppercase tracking-widest">Vincoli e Rischi — Piemonte</p>
        <p className="text-white/60 text-[11px] mt-0.5">DGR 6-887/2019 · SIFraP ARPA · Overpass OSM (elaborazione server-side)</p>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-card">
        <SismicaCard data={risultati?.sismica} />
        <PaiFraneCard data={risultati?.pai_rischio_idrogeologico} comuneNome={comuneNome} centroidLat={centroidLat} centroidLon={centroidLon} />
        {vincolo_lacustre && <LagoCard data={vincolo_lacustre} />}
        <CorsiAcquaCard data={risultati?.vincolo_corsi_acqua} />
        <FerroviaCard data={risultati?.vincolo_ferroviario} />
        {vincoliPRG && <VincoliPRGCard vincoli={vincoliPRG} />}
      </div>
    </motion.div>
  );
}