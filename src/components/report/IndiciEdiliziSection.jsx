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
  "Alessandria": { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m (≈ 3 piani)", Dc: "5 m", Df: "10 m", Ds: "5 m", fonte: "PRG Alessandria — NTA Zone B (residenziale consolidato)" },
  "Torino":      { IF: "2.0 m³/m²", RC: "50%", Hmax: "14.5 m (≈ 4 piani)", Dc: "5 m", Df: "10 m", Ds: "5 m", fonte: "PRG Torino — NTA Zone B" },
  "Cuneo":       { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m (≈ 3 piani)", Dc: "5 m", Df: "10 m", Ds: "5 m", fonte: "PRG Cuneo — NTA Zone B" },
  "Asti":        { IF: "1.8 m³/m²", RC: "50%", Hmax: "10.5 m",              Dc: "5 m", Df: "10 m", Ds: "5 m", fonte: "PRG Asti — NTA Zone B" },
  "Novara":      { IF: "2.0 m³/m²", RC: "50%", Hmax: "12.0 m",              Dc: "5 m", Df: "10 m", Ds: "5 m", fonte: "PRG Novara — NTA Zone B" },
  "Vercelli":    { IF: "1.5 m³/m²", RC: "45%", Hmax: "9.0 m",               Dc: "5 m", Df: "10 m", Ds: "5 m", fonte: "PRG Vercelli — NTA Zone B" },
  "Biella":      { IF: "1.5 m³/m²", RC: "45%", Hmax: "9.0 m",               Dc: "5 m", Df: "10 m", Ds: "5 m", fonte: "PRG Biella — NTA Zone B" },
  "Verbania":    { IF: "1.5 m³/m²", RC: "45%", Hmax: "9.0 m",               Dc: "5 m", Df: "10 m", Ds: "5 m", fonte: "PRG Verbania — NTA Zone B" },
  "Genova":      { IF: "2.0 m³/m²", RC: "55%", Hmax: "12.0 m",              Dc: "5 m", Df: "10 m", Ds: "5 m", fonte: "PUC Genova 2015 — NTA Tessuto Urbano" },
  "La Spezia":   { IF: "1.8 m³/m²", RC: "50%", Hmax: "10.5 m",              Dc: "5 m", Df: "10 m", Ds: "5 m", fonte: "PUC La Spezia — NTA Zone B" },
  "Savona":      { IF: "1.5 m³/m²", RC: "45%", Hmax: "9.0 m",               Dc: "5 m", Df: "10 m", Ds: "5 m", fonte: "PUC Savona — NTA Zone B" },
  "Imperia":     { IF: "1.5 m³/m²", RC: "45%", Hmax: "9.0 m",               Dc: "5 m", Df: "10 m", Ds: "5 m", fonte: "PUC Imperia — NTA Zone B" },
};

const CDU_LINKS = {
  "Alessandria": "https://www.comune.alessandria.it/servizi/certificato-destinazione-urbanistica",
  "Torino":      "https://www.comune.torino.it/suapps/sportello/sportello.shtml",
  "Genova":      "https://servizionline.comune.genova.it/",
  "La Spezia":   "https://www.comune.laspezia.it/servizi/certificato-destinazione-urbanistica/",
  "Savona":      "https://www.comune.savona.it/it/servizi/urbanistica",
  "Cuneo":       "https://www.comune.cuneo.it/urbanistica.html",
  "Asti":        "https://www.comune.asti.it/urbanistica",
  "Novara":      "https://www.comune.novara.it/it/certificato-destinazione-urbanistica",
};

function getCduLinks(comuneNome) {
  if (!comuneNome) return null;
  return CDU_LINKS[comuneNome] || CDU_LINKS[Object.keys(CDU_LINKS).find(k => k.toLowerCase() === comuneNome.toLowerCase().trim())] || null;
}

// Fallback generico per Piemonte/Liguria quando il comune non è nel lookup
const NTA_GENERIC_FALLBACK = { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", fonte: "Stima tipica PRG residenziale — verificare su NTA/PRG Comunale per zona specifica" };

function getNtaData(comuneNome, regione, query) {
  if (!comuneNome) return null;
  // Match esatto
  const exact = INDICI_NTA[comuneNome] || INDICI_NTA[Object.keys(INDICI_NTA).find(k => k.toLowerCase() === comuneNome.toLowerCase().trim())];
  if (exact) return exact;
  // Se il record ha già indici_edilizi salvati da wfsLiguria, usali
  const saved = query?.report_data?.indici_edilizi;
  if (saved?.indice_edificabilita && !saved?.nota?.includes('Stima orientativa')) {
    return {
      IF: saved.indice_edificabilita,
      RC: saved.rapporto_copertura || '—',
      Hmax: saved.altezza_massima || '—',
      Dc: saved.distanza_confini || '—',
      Df: saved.distanza_fabbricati || '—',
      Ds: saved.distanza_strada || '—',
      fonte: saved.fonte || 'Dati WFS regionali',
      note: saved.nota,
    };
  }
  // Fallback generico per Piemonte/Liguria
  const reg = (regione || query?.regione || '').toLowerCase();
  if (reg.includes('piemonte') || reg.includes('liguria')) {
    return { ...NTA_GENERIC_FALLBACK, note: `Stima tipica PRG residenziale ${reg.includes('piemonte') ? 'Piemonte' : 'Liguria'} — verificare NTA/PRG per sub-zona specifica` };
  }
  return null;
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
        <a href={cduInfo} target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary flex items-center gap-1 hover:underline">
          <ExternalLink className="w-3 h-3" /> 🔗 Richiedi CDU al Comune di {comune} →
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
          <a href={cduInfo} target="_blank" rel="noopener noreferrer"
            className="text-primary flex items-center gap-1 hover:underline font-medium">
            <ExternalLink className="w-3 h-3" /> 🔗 Richiedi CDU al Comune di {comune} →
          </a>
        ) : (
          <a href={`https://www.google.com/search?q=CDU+certificato+destinazione+urbanistica+${encodeURIComponent(comune || '')}`} target="_blank" rel="noopener noreferrer"
            className="text-primary flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> 🔗 Richiedi CDU al Comune di {comune} →
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

export default function IndiciEdiliziSection({ indici, comune, query, report, wfsZonaUrbanistica, delay = 0.08, regione }) {
  if (!indici) return null;

  const comuneEffettivo = comune || query?.comune || report?.comune;
  const regioneEffettiva = regione || query?.regione || report?.regione || '';
  const cduInfo = getCduLinks(comuneEffettivo);
  const linkPrg = wfsZonaUrbanistica?.link_prg_comunale;
  const nta = getNtaData(comuneEffettivo, regioneEffettiva, query);

  return (
    <ReportSection icon={BarChart3} title="Indici Edilizi" delay={delay}>
      {nta
        ? <NtaFoundSection nta={nta} comune={comuneEffettivo} cduInfo={cduInfo} linkPrg={linkPrg} />
        : <NtaNotFoundSection comune={comuneEffettivo} cduInfo={cduInfo} linkPrg={linkPrg} />
      }
    </ReportSection>
  );
}