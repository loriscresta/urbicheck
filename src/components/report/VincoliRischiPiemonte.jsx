/**
 * VincoliRischiPiemonte — sezione "Vincoli e Rischi" specifica per Piemonte
 * Layer 1: Zona sismica (da ComuneItalia.zona_sismica)
 * Layer 2: Frane SIFraP ARPA Piemonte (ArcGIS REST)
 * Layer 3: Vincolo lacustre art.142 (Overpass API)
 * Layer 2 e 3 si caricano in parallelo con skeleton loader.
 */
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, Activity, Droplets, Waves, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ── Skeleton loader ──
function SkeletonCard() {
  return (
    <div className="rounded border border-border bg-muted/30 p-4 animate-pulse">
      <div className="h-3 w-32 bg-muted rounded mb-2" />
      <div className="h-4 w-48 bg-muted rounded" />
    </div>
  );
}

// ── Zona Sismica ──
const ZONA_CONFIG = {
  "1":  { label: "Zona 1 — rischio sismico molto alto",    badge: "bg-red-100 text-red-800 border-red-300" },
  "2":  { label: "Zona 2 — rischio sismico alto",          badge: "bg-orange-100 text-orange-800 border-orange-300" },
  "3S": { label: "Zona 3S — rischio sismico moderato-alto",badge: "bg-orange-100 text-orange-800 border-orange-300" },
  "3":  { label: "Zona 3 — rischio sismico moderato",      badge: "bg-amber-100 text-amber-800 border-amber-300" },
  "4":  { label: "Zona 4 — rischio sismico basso",         badge: "bg-emerald-100 text-emerald-800 border-emerald-300" },
};

function ZonaSismicaCard({ zona }) {
  const cfg = ZONA_CONFIG[zona] || { label: `Zona ${zona}`, badge: "bg-muted text-muted-foreground border-border" };
  return (
    <div className="rounded border border-border bg-card p-4 flex items-start gap-3">
      <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center shrink-0">
        <Activity className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Classificazione Sismica</p>
        <Badge className={`text-xs border ${cfg.badge}`}>{cfg.label}</Badge>
        <p className="text-[11px] text-muted-foreground mt-1">Fonte: DGR Piemonte n. 6-887 del 30.12.2019 — NTC 2018</p>
      </div>
    </div>
  );
}

// ── Frane SIFraP ──
function FraneCard({ data, error }) {
  if (error) {
    return (
      <div className="rounded border border-border bg-muted/30 p-4 flex items-start gap-3">
        <Droplets className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Frane SIFraP ARPA Piemonte</p>
          <p className="text-xs text-muted-foreground italic">Dati SIFraP non disponibili al momento</p>
        </div>
      </div>
    );
  }
  const hasFrane = data?.features?.length > 0;
  return (
    <div className={`rounded border p-4 flex items-start gap-3 ${hasFrane ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50"}`}>
      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${hasFrane ? "bg-red-100" : "bg-emerald-100"}`}>
        <Droplets className={`w-4 h-4 ${hasFrane ? "text-red-600" : "text-emerald-600"}`} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Frane SIFraP ARPA Piemonte</p>
        {hasFrane ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-sm font-semibold text-red-800">
                ⚠️ {data.features.length} frana/e censite nel perimetro (SIFraP ARPA Piemonte)
              </span>
            </div>
            <div className="space-y-1">
              {data.features.slice(0, 3).map((f, i) => {
                const p = f.attributes || {};
                const tipo = p.TIPO_FRANA || p.tipo_frana || p.TIPO || null;
                const stato = p.STATO_ATTIVITA || p.stato_attivita || p.STATO || null;
                return (
                  <div key={i} className="text-xs text-red-700 font-mono bg-red-100 rounded px-2 py-1">
                    {tipo && <span>Tipo: {tipo}</span>}
                    {tipo && stato && <span> · </span>}
                    {stato && <span>Stato: {stato}</span>}
                    {!tipo && !stato && <span>Frana censita #{i + 1}</span>}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-emerald-800">✅ Nessuna frana censita nel perimetro (SIFraP ARPA Piemonte)</span>
          </div>
        )}
        <a href="https://webgis.arpa.piemonte.it/ags/rest/services/rischi_naturali/SIFraP_SI_Frane_Piemonte/MapServer" 
          target="_blank" rel="noopener noreferrer"
          className="text-[11px] text-primary flex items-center gap-1 mt-2 hover:underline">
          <ExternalLink className="w-3 h-3" /> SIFraP — webgis.arpa.piemonte.it
        </a>
      </div>
    </div>
  );
}

// ── Vincolo Lacustre ──
function LagoCard({ data, error }) {
  if (error) {
    return (
      <div className="rounded border border-border bg-muted/30 p-4 flex items-start gap-3">
        <Waves className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Vincolo Lacustre art.142</p>
          <p className="text-xs text-muted-foreground italic">Dati Overpass non disponibili al momento</p>
        </div>
      </div>
    );
  }
  const elements = data?.elements || [];
  const hasLago = elements.length > 0;
  const lagoNome = elements[0]?.tags?.name || null;

  return (
    <div className={`rounded border p-4 flex items-start gap-3 ${hasLago ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${hasLago ? "bg-amber-100" : "bg-emerald-100"}`}>
        <Waves className={`w-4 h-4 ${hasLago ? "text-amber-600" : "text-emerald-600"}`} />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">
          Vincolo Paesaggistico Lacustre — art.142 D.Lgs. 42/2004
        </p>
        {hasLago ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-sm font-semibold text-amber-800">
                ⚠️ Vincolo lacustre rilevato — fascia 300m
                {lagoNome ? ` (${lagoNome})` : ""}
              </span>
            </div>
            <p className="text-xs text-amber-700">Art.142 c.1 lett. b) D.Lgs 42/2004 — fascia di 300m dalla sponda</p>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-emerald-800">✅ Nessun vincolo lacustre rilevato (Overpass OSM — fascia 300m)</span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-1 italic">
          Verifica da confermare con il piano paesaggistico regionale (PPR Piemonte).
        </p>
      </div>
    </div>
  );
}

// ── Main Component ──
export default function VincoliRischiPiemonte({ query, comuneRecord }) {
  const [loading, setLoading] = useState(true);
  const [franeData, setFraneData] = useState(null);
  const [franeError, setFraneError] = useState(false);
  const [lagoData, setLagoData] = useState(null);
  const [lagoError, setLagoError] = useState(false);

  const lat = query?.centroid_lat;
  const lon = query?.centroid_lng;
  const zonaSismica = comuneRecord?.zona_sismica || null;

  useEffect(() => {
    if (!lat || !lon) { setLoading(false); return; }

    const fetchFrane = async () => {
      const url = `https://webgis.arpa.piemonte.it/ags/rest/services/rischi_naturali/SIFraP_SI_Frane_Piemonte/MapServer/0/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    };

    const fetchLago = async () => {
      const q = `[out:json][timeout:10];\n(\n  way["natural"="water"]["water"="lake"](around:300,${lat},${lon});\n  relation["natural"="water"]["water"="lake"](around:300,${lat},${lon});\n  way["natural"="water"]["water"="reservoir"](around:300,${lat},${lon});\n  relation["natural"="water"]["water"="reservoir"](around:300,${lat},${lon});\n);\nout tags center;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: "data=" + encodeURIComponent(q),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    };

    Promise.all([
      fetchFrane().then(setFraneData).catch(() => setFraneError(true)),
      fetchLago().then(setLagoData).catch(() => setLagoError(true)),
    ]).finally(() => setLoading(false));
  }, [lat, lon]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border-2 border-primary overflow-hidden">
      <div className="bg-primary px-5 py-3">
        <p className="text-white font-bold text-xs uppercase tracking-widest">Vincoli e Rischi — Piemonte</p>
        <p className="text-white/60 text-[11px] mt-0.5">DGR 6-887/2019 · SIFraP ARPA · Overpass OSM</p>
      </div>
      <div className="p-4 space-y-3 bg-card">
        {/* Layer 1 — Zona sismica (sincrona) */}
        {zonaSismica
          ? <ZonaSismicaCard zona={zonaSismica} />
          : (
            <div className="rounded border border-border bg-muted/30 p-4 flex items-center gap-3">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Zona sismica non disponibile nel database ComuneItalia.</p>
            </div>
          )
        }

        {/* Layer 2+3 — Async con skeleton */}
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <FraneCard data={franeData} error={franeError} />
            <LagoCard data={lagoData} error={lagoError} />
          </>
        )}
      </div>
    </motion.div>
  );
}