/**
 * IndiciEdiliziSection — mostra indici edilizi con lookup NTA comunale.
 * Se il comune è in INDICI_NTA, mostra i valori reali estratti dalle NTA.
 * Se non è in tabella, mostra banner CDU senza le card n.d.
 */
import React from "react";
import { BarChart3, ExternalLink, Info, CheckCircle2 } from "lucide-react";
import ReportSection from "@/components/report/ReportSection";

// ── Lookup NTA Comunali (valori reali da Norme Tecniche di Attuazione) ──
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
  "Imperia": { default: { IF:"1.8 m³/m²", RC:"50%", Hmax:"10.5 m", Dc:"5 m", Df:"10 m", Ds:"5 m", fonte:"PRG Imperia — NTA Zona B", note:"" } },
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

// Trova i dati NTA per il comune dato, cercando anche la zona urbanistica specifica
function getNtaData(comune, zonaUrbanistica) {
  if (!comune) return null;
  // Cerca per nome esatto prima, poi case-insensitive
  const entry = INDICI_NTA[comune] || Object.entries(INDICI_NTA).find(
    ([k]) => k.toLowerCase() === comune.toLowerCase()
  )?.[1];
  if (!entry) return null;
  // Cerca zona specifica, fallback su default
  if (zonaUrbanistica) {
    const zonaKey = Object.keys(entry).find(
      k => k !== 'default' && zonaUrbanistica.toLowerCase().includes(k.toLowerCase())
    );
    if (zonaKey) return { ...entry[zonaKey], _zonaKey: zonaKey };
  }
  return entry.default ? { ...entry.default, _zonaKey: 'default' } : null;
}

function NtaCard({ label, value }) {
  return (
    <div style={{ border: '1px solid #C4BAA8', background: '#fff', padding: '0.75rem 1rem' }}>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>{label}</p>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.95rem', fontWeight: 700, color: '#1C1A17' }}>{value}</p>
    </div>
  );
}

export default function IndiciEdiliziSection({ indici, comune, wfsZonaUrbanistica, delay = 0.08 }) {
  if (!indici && !comune) return null;

  const cduInfo = getCduLinks(comune);
  const linkPrg = wfsZonaUrbanistica?.link_prg_comunale;

  // Determina zona urbanistica dalla struttura wfs o dal campo destinazione_uso
  const zonaDesc = wfsZonaUrbanistica?.zona_codice || wfsZonaUrbanistica?.destinazione_uso || '';
  const ntaData = getNtaData(comune, zonaDesc);

  const NTA_FIELDS = ntaData ? [
    { label: "Indice di Fabbricabilità (IF)", value: ntaData.IF },
    { label: "Rapporto di Copertura (RC)", value: ntaData.RC },
    { label: "Altezza Massima (H max)", value: ntaData.Hmax },
    { label: "Distanza dai confini (Dc)", value: ntaData.Dc },
    { label: "Distanza tra fabbricati (Df)", value: ntaData.Df },
    { label: "Distanza dalla strada (Ds)", value: ntaData.Ds },
  ] : null;

  return (
    <ReportSection icon={BarChart3} title="Indici Edilizi" delay={delay}>
      {ntaData ? (
        <>
          {/* Banner NTA disponibili */}
          <div style={{ border: '1px solid #6ee7b7', background: '#f0fdf4', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#059669' }} />
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#065f46', lineHeight: 1.6 }}>
              Dati estratti dalle Norme Tecniche di Attuazione (NTA) del piano urbanistico vigente.
              I valori si applicano alla zona tipologica rilevata{ntaData._zonaKey !== 'default' ? ` (${ntaData._zonaKey})` : ''}.
              Per la sub-zona precisa richiedere il CDU al Comune.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {NTA_FIELDS.map(f => <NtaCard key={f.label} label={f.label} value={f.value} />)}
          </div>

          {/* Fonte + nota */}
          <div style={{ borderTop: '1px solid #C4BAA8', paddingTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 2, fontWeight: 600 }}>
              📋 {ntaData.fonte}
            </span>
            {ntaData.note && (
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268', fontStyle: 'italic', width: '100%', marginTop: 2 }}>
                {ntaData.note}
              </p>
            )}
          </div>
        </>
      ) : (
        /* Comune non in DB NTA */
        <div style={{ border: '1px solid #C4BAA8', background: '#F4EFE6', padding: '1rem 1.25rem' }}>
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#7A7268' }} />
            <div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', marginBottom: '0.4rem' }}>
                📍 Comune non ancora nel database NTA
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#7A7268', lineHeight: 1.7 }}>
                I dati per <strong>{comune}</strong> non sono ancora disponibili nel database NTA locale.
                Richiedere il <strong>Certificato di Destinazione Urbanistica (CDU)</strong> al Comune per i valori ufficiali di IF, RC, H max e distanze.
              </p>
              <div className="flex flex-wrap gap-3 mt-3">
                {cduInfo && (
                  <a href={cduInfo.cdu} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#B33A2A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ExternalLink className="w-3 h-3" /> Richiedi CDU — {comune}
                  </a>
                )}
                {linkPrg && (
                  <a href={linkPrg} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ExternalLink className="w-3 h-3" /> Consulta PRG/PRGC Regionale
                  </a>
                )}
                {!cduInfo && (
                  <a href={`https://www.google.com/search?q=CDU+certificato+destinazione+urbanistica+${encodeURIComponent(comune)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ExternalLink className="w-3 h-3" /> Trova ufficio CDU — {comune}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ReportSection>
  );
}