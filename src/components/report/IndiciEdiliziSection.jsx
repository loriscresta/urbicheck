/**
 * IndiciEdiliziSection v3.0 — Dati NTA da ntaDatabase.js
 * Lookup case-insensitive a 3 livelli: DB diretto → provinciale → AI
 */
import React, { useState, useEffect } from "react";
import { BarChart3, ExternalLink, Info, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReportSection from "@/components/report/ReportSection";
import { base44 } from "@/api/base44Client";

import { NTA_LOOKUP, INDICI_NTA, LIGURIA_PROVINCE_MAP, PROVINCE_CAPOLUOGHI, CDU_LINKS, lookupNTA, findInNta, extractZonaWfs } from "@/lib/ntaDatabase";

// ── Lookup sigla provincia: prima da query, poi da ComuneItalia ─────────────
async function getSiglaProvincia(comune, regione, query) {
  if (query?.sigla_provincia) return query.sigla_provincia;
  try {
    const filter = { nome: comune };
    if (regione) filter.regione = regione;
    const results = await base44.entities.ComuneItalia.filter(filter, null, 1);
    return results[0]?.sigla_provincia || null;
  } catch (_e) { return null; }
}

const NTA_SERVICE_URL = "https://urbicheck-prg-agent-production.up.railway.app";

// ── Tier -1 — NTA live dal microservizio UrbiCheck (fonte: PDF NTA comunale) ──
async function resolveNtaFromService(comune, query, wfsZona) {
  if (!comune) return null;
  const comuneKey = comune.trim().replace(/\s+/g, "_");
  const dest = wfsZona?.destinazione
            || query?.report_data?.wfs_liguria?.risultati?.zona_urbanistica?.destinazione
            || query?.report_data?.zonizzazione?.destinazione_prevalente || null;
  if (!dest) return null;
  const r = await fetch(`${NTA_SERVICE_URL}/nta/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comune: comuneKey, destinazione: dest }),
  });
  if (!r.ok) return null;
  const data = await r.json();
  if (!data?.trovato || !data?.match) return null;
  const z = data.match;
  const p = z.parametri || {};
  const ifVal = p.indice_fabbric_fondiario_If?.valore ?? p.indice_util_fondiaria_Uf?.valore ?? p.indice_util_territoriale_Ut?.valore ?? null;
  const ifUn = p.indice_fabbric_fondiario_If ? "mc/mq" : ((p.indice_util_fondiaria_Uf || p.indice_util_territoriale_Ut) ? "mq/mq" : "");
  return {
    IF: ifVal != null ? `${ifVal} ${ifUn}`.trim() : null,
    RC: p.rapporto_copertura_max_pct != null ? `${p.rapporto_copertura_max_pct}%` : null,
    Hmax: p.altezza_max_m != null ? `${p.altezza_max_m} m` : null,
    Dc: p.distanza_min_confini_m != null ? `${p.distanza_min_confini_m} m` : null,
    Df: null,
    Ds: p.distanza_min_strade_m != null ? `${p.distanza_min_strade_m} m` : null,
    strumento: z.riferimento || "NTA comunale",
    fonte: `NTA ${comune} — ${z.articolo}`,
    note: z.note || (z.destinazioni_ammesse?.length ? `Destinazioni ammesse: ${z.destinazioni_ammesse.slice(0, 6).join("; ")}` : null),
    fonte_tipo: "diretta",
    nomeZona: z.nome,
    zonaWfs: dest,
    disclaimer: null,
    capoluogo: null,
  };
}

// ── 4-level cascade (async per AI) ─────────────────────────────────────────
async function resolveNta(comune, regione, query, wfsZona) {
  // Tier -1 — NTA live dal microservizio (indici reali dal PDF NTA comunale)
  try {
    const svc = await resolveNtaFromService(comune, query, wfsZona);
    if (svc && (svc.IF || svc.Hmax || svc.RC)) return svc;
  } catch (_e) { /* fallback ai tier locali */ }

  // Tier 0 — NTA_LOOKUP database reale PRG/PGT/PUC (massima priorità)
  const zonaFromReport = query?.report_data?.zonizzazione?.zona_codice || null;
  const ntaDbResult = lookupNTA(comune, zonaFromReport);
  if (ntaDbResult) {
    const fonteLabel = ntaDbResult.source === 'DB_NTA_FUZZY'
      ? `Dati NTA — corrispondenza approssimata (${ntaDbResult.zona}) — Database UrbiCheck`
      : `Dati diretti NTA — Database UrbiCheck (${ntaDbResult.nome})`;
    return {
      IF: ntaDbResult.IF,
      RC: ntaDbResult.RC,
      Hmax: ntaDbResult.H,
      Dc: ntaDbResult.DC,
      Df: ntaDbResult.DF,
      Ds: ntaDbResult.DS,
      strumento: ntaDbResult.strumento,
      fonte: fonteLabel,
      note: ntaDbResult.note || null,
      fonte_tipo: 'diretta',
      nomeZona: ntaDbResult.nome,
      zonaWfs: null,
      disclaimer: ntaDbResult.note ? `⚠️ ${ntaDbResult.note}` : null,
      capoluogo: null,
    };
  }

  // Tier 1 — lookup diretto
  const direct = findInNta(comune);
  if (direct) {
    const zonaWfs = extractZonaWfs(query);
    return { ...direct, fonte_tipo: 'diretta', nomeZona: 'Zona residenziale', zonaWfs, disclaimer: null, capoluogo: null };
  }

  // Tier 1.5a — fallback da mappa provinciale Liguria (lookup statico)
  const reg = (regione || '').toLowerCase();
  if (reg.includes('liguria')) {
    const capoluogo = LIGURIA_PROVINCE_MAP[comune] ||
      LIGURIA_PROVINCE_MAP[Object.keys(LIGURIA_PROVINCE_MAP).find(k => k.toLowerCase() === comune?.toLowerCase()?.trim())];
    if (capoluogo) {
      const provincial = findInNta(capoluogo);
      if (provincial) {
        return {
          ...provincial,
          fonte_tipo: 'provinciale',
          nomeZona: 'Zona residenziale (stima provinciale)',
          capoluogo,
          disclaimer: `Valori stimati su base provinciale (${capoluogo}). Il comune di ${comune} non è ancora nel database NTA specifico. Verificare sempre con CDU ufficiale del Comune.`,
        };
      }
    }
  }

  // Tier 1.5b — lookup dinamico via ComuneItalia → PROVINCE_CAPOLUOGHI
  const sigla = await getSiglaProvincia(comune, regione, query);
  if (sigla) {
    const entry = PROVINCE_CAPOLUOGHI[sigla.toUpperCase()];
    if (entry) {
      const provincial = findInNta(entry.capoluogo);
      if (provincial) {
        return {
          ...provincial,
          fonte_tipo: 'provinciale',
          nomeZona: 'Zona residenziale (stima provinciale)',
          capoluogo: entry.capoluogo,
          disclaimer: `⚠️ Indici stimati su base provinciale (${sigla}) — Il comune di ${comune} non è ancora nel database NTA specifico. Verificare obbligatoriamente con le NTA o CDU del Comune.`,
        };
      }
    }
  }

  // Tier 2 — stima AI
  const regioneLabel = regione || 'Italia';
  try {
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un esperto di urbanistica italiana. Fornisci una stima orientativa degli indici edilizi NTA/PRG per una zona residenziale tipica nel comune di "${comune}", ${regioneLabel}, Italia. Rispondi SOLO con un oggetto JSON valido, senza testo aggiuntivo.`,
      response_json_schema: {
        type: "object",
        properties: {
          IF: { type: "string" },
          RC: { type: "string" },
          Hmax: { type: "string" },
          Dc: { type: "string" },
          Df: { type: "string" },
          Ds: { type: "string" },
          note: { type: "string" },
          strumento: { type: "string" },
        }
      }
    });
    if (aiResult?.IF) {
      return {
        IF: aiResult.IF,
        RC: aiResult.RC,
        Hmax: aiResult.Hmax,
        Dc: aiResult.Dc,
        Df: aiResult.Df,
        Ds: aiResult.Ds,
        strumento: aiResult.strumento || 'PRG/PUC',
        fonte: `Stima AI — ${comune}, ${regioneLabel}`,
        note: aiResult.note || null,
        fonte_tipo: 'ai_stima',
        nomeZona: 'Zona residenziale (stima AI)',
        capoluogo: null,
        disclaimer: `⚠️ Indici generati da intelligenza artificiale per il comune di ${comune}. Questi valori sono puramente indicativi. Richiedere le NTA ufficiali o il CDU al Comune prima di qualsiasi decisione urbanistica.`,
      };
    }
  } catch (_e) { /* AI fallita */ }

  return null;
}

// ── Sub-components ──────────────────────────────────────────────────────────
function NtaIndiceCard({ label, value }) {
  if (!value) return null;
  return (
    <div className="bg-white border border-emerald-200 rounded-lg p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="font-bold text-sm text-foreground">{value}</p>
    </div>
  );
}

function SourceBadge({ tipo, capoluogo }) {
  if (tipo === 'diretta') return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
      <CheckCircle2 className="w-3 h-3" /> Dati diretti NTA
    </span>
  );
  if (tipo === 'provinciale') return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
      <Info className="w-3 h-3" /> Stima provinciale ({capoluogo})
    </span>
  );
  if (tipo === 'ai_stima') return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
      <AlertTriangle className="w-3 h-3" /> Stima AI
    </span>
  );
  return null;
}

function DisclaimerBox({ tipo, disclaimer }) {
  if (!disclaimer) return null;
  const styles = tipo === 'ai_stima'
    ? "border-orange-300 bg-orange-50 text-orange-800"
    : "border-yellow-300 bg-yellow-50 text-yellow-800";
  return (
    <div className={`mb-3 rounded-lg border p-3 flex items-start gap-2 ${styles}`}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed">{disclaimer}</p>
    </div>
  );
}

function NtaFoundSection({ nta, comune, cduInfo, linkPrg }) {
  return (
    <>
      {nta.fonte_tipo === 'diretta' && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 leading-relaxed">
            Dati estratti dalle <strong>Norme Tecniche di Attuazione (NTA)</strong> del piano urbanistico vigente.
            Per la sub-zona precisa richiedere il CDU al Comune.
          </p>
        </div>
      )}
      <DisclaimerBox tipo={nta.fonte_tipo} disclaimer={nta.disclaimer} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <NtaIndiceCard label="Indice di Fabbricabilità (IF)" value={nta.IF} />
        <NtaIndiceCard label="Rapporto di Copertura (RC)" value={nta.RC} />
        <NtaIndiceCard label="Altezza Massima (H max)" value={nta.Hmax} />
        <NtaIndiceCard label="Distanza dai confini (Dc)" value={nta.Dc} />
        <NtaIndiceCard label="Distanza tra fabbricati (Df)" value={nta.Df} />
        <NtaIndiceCard label="Distanza dalla strada (Ds)" value={nta.Ds} />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Badge variant="outline" className="text-[10px] bg-white">
          📋 {nta.fonte}
        </Badge>
        {nta.strumento && (
          <Badge variant="outline" className="text-[10px] bg-white">
            🏛️ {nta.strumento}
          </Badge>
        )}
        {nta.nomeZona && (
          <Badge variant="outline" className="text-[10px] bg-white">
            📐 {nta.nomeZona}
          </Badge>
        )}
        {nta.zonaWfs && (
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-300">
            🗺️ WFS: {nta.zonaWfs}
          </Badge>
        )}
        <SourceBadge tipo={nta.fonte_tipo} capoluogo={nta.capoluogo} />
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

function NtaNotFoundSection({ comune, cduInfo, linkPrg }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-start gap-2 mb-3">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">📍 Comune non nel database NTA</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            I dati per <strong>{comune}</strong> non sono disponibili. Richiedere il{" "}
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
          <a href={`https://www.google.com/search?q=CDU+certificato+destinazione+urbanistica+${encodeURIComponent(comune || '')}`}
            target="_blank" rel="noopener noreferrer"
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

// ── Main component ──────────────────────────────────────────────────────────
export default function IndiciEdiliziSection({ indici, comune, query, report, wfsZonaUrbanistica, delay = 0.08, regione, onNtaResolved }) {
  const comuneEffettivo = comune || query?.comune || report?.comune;
  const [nta, setNta] = useState(null);
  const [loading, setLoading] = useState(true);

  const regioneEffettiva = regione || query?.regione || report?.regione || '';
  const cduInfo = CDU_LINKS[comuneEffettivo] ||
    CDU_LINKS[Object.keys(CDU_LINKS).find(k => k.toLowerCase() === comuneEffettivo?.toLowerCase()?.trim())] ||
    null;
  const linkPrg = wfsZonaUrbanistica?.link_prg_comunale;

  useEffect(() => {
    if (!comuneEffettivo) { setLoading(false); return; }
    setLoading(true);
    resolveNta(comuneEffettivo, regioneEffettiva, query, wfsZonaUrbanistica)
      .then(result => { setNta(result); if (onNtaResolved) onNtaResolved(result); })
      .finally(() => setLoading(false));
  }, [comuneEffettivo, regioneEffettiva, wfsZonaUrbanistica?.destinazione]);

  if (!indici) return null;

  return (
    <ReportSection icon={BarChart3} title="Indici Edilizi" delay={delay}>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Ricerca indici edilizi…
        </div>
      ) : nta ? (
        <NtaFoundSection nta={nta} comune={comuneEffettivo} cduInfo={cduInfo} linkPrg={linkPrg} />
      ) : (
        <NtaNotFoundSection comune={comuneEffettivo} cduInfo={cduInfo} linkPrg={linkPrg} />
      )}
    </ReportSection>
  );
}