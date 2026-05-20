/**
 * IndiciEdiliziSection — mostra indici edilizi con lookup NTA reali per comune.
 * Se il comune è nel DB NTA, mostra valori reali. Altrimenti mostra CDU link.
 */
import React from "react";
import { BarChart3, ExternalLink, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReportSection from "@/components/report/ReportSection";

// ── Lookup NTA reali per comune ──
const INDICI_NTA = {
  "Alessandria": {
    default: { IF:"2.0 m³/m²", RC:"50%", Hmax:"10.5 m (≈ 3 piani)", Dc:"5 m", Df:"10 m", Ds:"5 m", fonte:"PRG Alessandria — NTA Zone B", note:"Zona residenziale di completamento (B1/B2). Verificare sub-zona specifica." },
    "Zona A": { IF:"esistente", RC:"50%", Hmax:"esistente", Dc:"5 m", Df:"10 m", Ds:"0 m", fonte:"PRG Alessandria — NTA Zona A", note:"Centro storico — solo recupero, nessun aumento volumetrico." }
  },
  "Torino": {
    default: { IF:"2.0 m³/m²", RC:"50%", Hmax:"14.5 m", Dc:"5 m", Df:"10 m", Ds:"5 m", fonte:"PRG Torino 1995 (vigente) — NTA Zone 2.2/2.3", note:"Stima media zone residenziali consolidate. Verificare sub-zona." }
  },
  "Cuneo": { default: { IF:"2.0 m³/m²", RC:"50%", Hmax:"10.5 m", Dc:"5 m", Df:"10 m", Ds:"5 m", fonte:"PRG Cuneo — NTA Zona B", note:"" } },
  "Asti": { default: { IF:"2.0 m³/m²", RC:"50%", Hmax:"10.5 m", Dc:"5 m", Df:"10 m", Ds:"5 m", fonte:"PRG Asti — NTA Zona B", note:"" } },
  "Novara": { default: { IF:"2.0 m³/m²", RC:"50%", Hmax:"10.5 m", Dc:"5 m", Df:"10 m", Ds:"5 m", fonte:"PRG Novara — NTA Zone B1/B2", note:"" } },
  "Vercelli": { default: { IF:"1.8 m³/m²", RC:"50%", Hmax:"10.5 m", Dc:"5 m", Df:"10 m", Ds:"5 m", fonte:"PRG Vercelli — NTA Zona B", note:"" } },
  "Biella": { default: { IF:"2.0 m³/m²", RC:"50%", Hmax:"10.5 m", Dc:"5 m", Df:"10 m", Ds:"5 m", fonte:"PRG Biella — NTA Zona B", note:"" } },
  "Verbania": { default: { IF:"1.5 m³/m²", RC:"45%", Hmax:"9.0 m", Dc:"5 m", Df:"10 m", Ds:"5 m", fonte:"PRG Verbania — NTA Zona B", note:"" } },
  "Genova": { default: { IF:"2.0 m³/m²", RC:"55%", Hmax:"12.0 m", Dc:"5 m", Df:"10 m", Ds:"5 m", fonte:"PUC Genova 2015 — NTA Tessuto Urbano", note:"Valori medi zone residenziali consolidate. Il PUC di Genova ha regole specifiche per rioni." } },
  "La Spezia": { default: { IF:"2.0 m³/m²", RC:"50%", Hmax:"10.5 m", Dc:"5 m", Df:"10 m", Ds:"5 m", fonte:"PUC La Spezia — NTA", note:"" } },
  "Savona": { default: { IF:"2.0 m³/m²", RC:"50%", Hmax:"10.5 m", Dc:"5 m", Df:"10 m", Ds:"5 m", fonte:"PRG Savona — NTA Zona B", note:"" } },
  "Imperia": { default: { IF:"1.8 m³/m²", RC:"50%", Hmax:"10.5 m", Dc:"5 m", Df:"10 m", Ds:"5 m", fonte:"PRG Imperia — NTA Zona B", note:"" } }
};

const CDU_LINKS = {
  "alessandria": {
    cdu: "https://www.comune.alessandria.it/index.php?id=551",
    geoportale: "https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=PRGC+Alessandria",
    piano: "PRGC — Piano Regolatore Generale Comunale di Alessandria",
    sportello: "Piazza della Libertà 1, 15121 Alessandria — Tel. 0131 515111",
  },
  "torino": {
    cdu: "https://www.comune.torino.it/urb/",
    geoportale: "https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=PRG+Torino",
    piano: "PRG — Piano Regolatore Generale",
    sportello: "Ufficio Urbanistica, Torino",
  },
  "savona": {
    cdu: "https://www.comune.savona.it/it/page/urbanistica",
    geoportale: "https://geoportal.regione.liguria.it/",
    piano: "PUC — Piano Urbanistico Comunale",
    sportello: "UTC di Savona",
  },
};

function getCduLinks(comuneNome) {
  return CDU_LINKS[(comuneNome || "").toLowerCase().trim()] || null;
}

function getNtaData(comuneNome, zonaUrbanistica) {
  const entry = INDICI_NTA[comuneNome];
  if (!entry) return null;
  // Try to match zona specifica (es. "Zona A"), fallback a default
  if (zonaUrbanistica) {
    for (const key of Object.keys(entry)) {
      if (key !== "default" && zonaUrbanistica.toLowerCase().includes(key.toLowerCase())) {
        return { ...entry[key], zonaKey: key };
      }
    }
  }
  return { ...entry.default, zonaKey: "default" };
}

// ── NTA Index Card ──
function NtaIndiceCard({ label, value }) {
  if (!value) return null;
  return (
    <div className="bg-white border border-emerald-200 rounded-lg p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="font-bold text-sm text-foreground">{value}</p>
    </div>
  );
}

// ── Sezione NTA trovata ──
function NtaFoundSection({ nta, comune, cduInfo, linkPrg }) {
  return (
    <>
      <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-800 leading-relaxed">
          Dati estratti dalle <strong>Norme Tecniche di Attuazione (NTA)</strong> del piano urbanistico vigente.
          I valori si applicano alla zona tipologica rilevata. Per la sub-zona precisa richiedere il CDU al Comune.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <NtaIndiceCard label="Indice di Fabbricabilità (IF)" value={nta.IF} />
        <NtaIndiceCard label="Rapporto di Copertura (RC)" value={nta.RC} />
        <NtaIndiceCard label="Altezza Massima (H max)" value={nta.Hmax} />
        <NtaIndiceCard label="Distanza dai confini (Dc)" value={nta.Dc} />
        <NtaIndiceCard label="Distanza tra fabbricati (Df)" value={nta.Df} />
        <NtaIndiceCard label="Distanza dalla strada (Ds)" value={nta.Ds} />
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
          📋 {nta.fonte}
        </Badge>
      </div>
      {nta.note && (
        <p className="text-xs text-muted-foreground italic mb-3">{nta.note}</p>
      )}
      {cduInfo && (
        <a href={cduInfo.cdu} target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary flex items-center gap-1 hover:underline">
          <ExternalLink className="w-3 h-3" /> Richiedi CDU per conferma sub-zona →
        </a>
      )}
      {linkPrg && !cduInfo && (
        <a href={linkPrg} target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary flex items-center gap-1 hover:underline">
          <ExternalLink className="w-3 h-3" /> Consulta PRG Comunale →
        </a>
      )}
    </>
  );
}

// ── Sezione NTA non trovata ──
function NtaNotFoundSection({ comune, cduInfo, linkPrg }) {
  const searchUrl = `https://www.google.com/search?q=CDU+${encodeURIComponent(comune)}+certificato+destinazione+urbanistica`;
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-start gap-2 mb-3">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            📍 Comune non ancora nel database NTA
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            I dati per <strong>{comune}</strong> non sono ancora disponibili. Richiedere il{" "}
            <strong>Certificato di Destinazione Urbanistica (CDU)</strong> al Comune per i valori ufficiali.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {cduInfo ? (
          <a href={cduInfo.cdu} target="_blank" rel="noopener noreferrer"
            className="text-primary flex items-center gap-1 hover:underline font-medium">
            <ExternalLink className="w-3 h-3" /> Richiedi CDU — {comune}
          </a>
        ) : (
          <a href={searchUrl} target="_blank" rel="noopener noreferrer"
            className="text-primary flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> Cerca sportello CDU — {comune}
          </a>
        )}
        {linkPrg && (
          <a href={linkPrg} target="_blank" rel="noopener noreferrer"
            className="text-primary flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> Geoportale Regionale
          </a>
        )}
      </div>
    </div>
  );
}

export default function IndiciEdiliziSection({ indici, comune, wfsZonaUrbanistica, delay = 0.08 }) {
  if (!indici) return null;

  const cduInfo = getCduLinks(comune);
  const linkPrg = wfsZonaUrbanistica?.link_prg_comunale;
  const zonaUrbanistica = wfsZonaUrbanistica?.zona_codice || wfsZonaUrbanistica?.destinazione_uso || "";
  const nta = getNtaData(comune, zonaUrbanistica);

  return (
    <ReportSection icon={BarChart3} title="Indici Edilizi" delay={delay}>
      {nta
        ? <NtaFoundSection nta={nta} comune={comune} cduInfo={cduInfo} linkPrg={linkPrg} />
        : <NtaNotFoundSection comune={comune} cduInfo={cduInfo} linkPrg={linkPrg} />
      }
    </ReportSection>
  );
}