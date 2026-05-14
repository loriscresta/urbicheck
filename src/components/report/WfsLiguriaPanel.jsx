import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Map, Shield, Droplets, Activity, ExternalLink,
  Loader2, CheckCircle2, AlertTriangle, XCircle, Info
} from "lucide-react";
import { wfsLiguria } from "@/functions/wfsLiguria";

// ── Vincoli Paesaggistici Card ──
function VincoliCard({ data }) {
  if (!data) return null;
  const hasVincoli = data.risultati && data.risultati.length > 0;

  return (
    <div style={{ border: `1px solid ${hasVincoli ? '#fca5a5' : '#6ee7b7'}`, background: hasVincoli ? '#fff7f7' : '#f0fdf4' }}>
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex items-start gap-3">
          <div style={{ width: 32, height: 32, background: hasVincoli ? '#fee2e2' : '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield className="w-4 h-4" style={{ color: hasVincoli ? '#dc2626' : '#059669' }} />
          </div>
          <div className="flex-1">
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Vincoli Paesaggistici (PPR art.142)
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', marginTop: 2 }}>
              {data.fonte}
            </p>
          </div>
        </div>
        <div>
          {hasVincoli
            ? <Badge className="text-[10px] bg-red-100 text-red-800 border-red-200 whitespace-nowrap">⚠ {data.risultati.length} vincolo{data.risultati.length > 1 ? 'i' : ''}</Badge>
            : <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 whitespace-nowrap">✓ Nessun vincolo</Badge>
          }
        </div>
      </div>

      {hasVincoli && (
        <div style={{ borderTop: `1px solid #fca5a5`, padding: '0.75rem 1rem' }}>
          <div className="space-y-2">
            {data.risultati.map((v, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', fontWeight: 700, color: '#dc2626' }}>{v.tipo}</span>
                  {v.dettaglio && v.dettaglio !== v.tipo && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#7A7268' }}> — {v.dettaglio}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.nota && !hasVincoli && (
        <div style={{ borderTop: `1px solid #6ee7b7`, padding: '0.6rem 1rem' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#059669', fontStyle: 'italic' }}>{data.nota}</p>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${hasVincoli ? '#fca5a5' : '#6ee7b7'}`, padding: '0.5rem 1rem', display: 'flex', gap: '1rem' }}>
        {data.url_viewer && (
          <a href={data.url_viewer} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink className="w-3 h-3" /> Viewer ufficiale
          </a>
        )}
      </div>
    </div>
  );
}

// ── PAI Rischio Card ──
function PaiCard({ data }) {
  if (!data) return null;
  const hasRischio = data.risultati && data.risultati.length > 0;

  const getClasse = () => {
    if (!hasRischio) return null;
    const classi = data.risultati.map(r => r.classe).filter(Boolean);
    return classi[0] || null;
  };

  const classe = getClasse();
  const isHighRisk = classe && (classe.toUpperCase().includes('R3') || classe.toUpperCase().includes('R4'));
  const isMedRisk = classe && (classe.toUpperCase().includes('R1') || classe.toUpperCase().includes('R2'));

  const borderColor = hasRischio ? (isHighRisk ? '#fca5a5' : '#fde68a') : '#6ee7b7';
  const bgColor = hasRischio ? (isHighRisk ? '#fff7f7' : '#fffbeb') : '#f0fdf4';
  const iconColor = hasRischio ? (isHighRisk ? '#dc2626' : '#d97706') : '#059669';
  const iconBg = hasRischio ? (isHighRisk ? '#fee2e2' : '#fef3c7') : '#d1fae5';

  return (
    <div style={{ border: `1px solid ${borderColor}`, background: bgColor }}>
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex items-start gap-3">
          <div style={{ width: 32, height: 32, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Droplets className="w-4 h-4" style={{ color: iconColor }} />
          </div>
          <div className="flex-1">
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              PAI — Rischio Idrogeologico
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', marginTop: 2 }}>
              {data.fonte}
            </p>
          </div>
        </div>
        <div>
          {hasRischio
            ? <Badge className={`text-[10px] whitespace-nowrap ${isHighRisk ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                ⚠ {data.risultati.length} area rischio
              </Badge>
            : <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 whitespace-nowrap">✓ Nessun rischio PAI</Badge>
          }
        </div>
      </div>

      {hasRischio && (
        <div style={{ borderTop: `1px solid ${borderColor}`, padding: '0.75rem 1rem' }}>
          <div className="space-y-2">
            {data.risultati.map((r, i) => (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', fontWeight: 700, color: isHighRisk ? '#dc2626' : '#d97706' }}>
                    {r.tipo}
                  </span>
                  {r.classe && (
                    <Badge variant="outline" className="text-[10px]">Classe {r.classe}</Badge>
                  )}
                </div>
                {r.bacino && <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268' }}>Bacino: {r.bacino}</p>}
                {r.descrizione && <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268' }}>{r.descrizione}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.nota && !hasRischio && (
        <div style={{ borderTop: `1px solid #6ee7b7`, padding: '0.6rem 1rem' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#059669', fontStyle: 'italic' }}>{data.nota}</p>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${borderColor}`, padding: '0.5rem 1rem' }}>
        {data.url_viewer && (
          <a href={data.url_viewer} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink className="w-3 h-3" /> Geoportale Liguria
          </a>
        )}
      </div>
    </div>
  );
}

// ── Sismica Card ──
function SismicaCard({ data }) {
  if (!data) return null;

  const zona = data.zona;
  const borderColor = zona === 2 ? '#fca5a5' : zona === 3 ? '#fde68a' : '#6ee7b7';
  const bgColor = zona === 2 ? '#fff7f7' : zona === 3 ? '#fffbeb' : '#f0fdf4';
  const iconColor = zona === 2 ? '#dc2626' : zona === 3 ? '#d97706' : '#059669';
  const iconBg = zona === 2 ? '#fee2e2' : zona === 3 ? '#fef3c7' : '#d1fae5';
  const badgeClass = zona === 2
    ? 'bg-red-100 text-red-800 border-red-200'
    : zona === 3
    ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-emerald-100 text-emerald-800 border-emerald-200';

  return (
    <div style={{ border: `1px solid ${borderColor}`, background: bgColor }}>
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex items-start gap-3">
          <div style={{ width: 32, height: 32, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity className="w-4 h-4" style={{ color: iconColor }} />
          </div>
          <div className="flex-1">
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Classificazione Sismica
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', marginTop: 2 }}>
              {data.fonte}
            </p>
          </div>
        </div>
        <Badge className={`text-[10px] whitespace-nowrap ${badgeClass}`}>Zona {zona}</Badge>
      </div>

      <div style={{ borderTop: `1px solid ${borderColor}`, padding: '0.6rem 1rem' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', fontWeight: 600, color: '#1C1A17' }}>{data.descrizione}</p>
      </div>

      <div style={{ borderTop: `1px solid ${borderColor}`, padding: '0.5rem 1rem' }}>
        {data.url_riferimento && (
          <a href={data.url_riferimento} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink className="w-3 h-3" /> Classificazione sismica DGR
          </a>
        )}
      </div>
    </div>
  );
}

// ── Zona Urbanistica Card ──
function ZonaUrbanisticaCard({ data }) {
  if (!data) return null;

  return (
    <div style={{ border: '1px solid #C4BAA8', background: '#fff' }}>
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex items-start gap-3">
          <div style={{ width: 32, height: 32, background: '#F4EFE6', border: '1px solid #C4BAA8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Map className="w-4 h-4" style={{ color: '#1A3A6B' }} />
          </div>
          <div className="flex-1">
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Zona Urbanistica (PUC/PRG)
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] text-muted-foreground whitespace-nowrap">Dati comunali</Badge>
      </div>

      <div style={{ borderTop: '1px solid #C4BAA8', padding: '0.6rem 1rem' }}>
        <div className="flex items-start gap-2">
          <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#7A7268', fontStyle: 'italic', lineHeight: 1.6 }}>{data.nota}</p>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #C4BAA8', padding: '0.5rem 1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {data.url_geoportale && (
          <a href={data.url_geoportale} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink className="w-3 h-3" /> Geoportale Liguria
          </a>
        )}
        {data.url_catalogo && (
          <a href={data.url_catalogo} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink className="w-3 h-3" /> Catalogo mappe
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ──
export default function WfsLiguriaPanel({ query, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const existingWfs = query?.report_data?.wfs_liguria;

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    const resp = await wfsLiguria({ query_id: query.id });
    setLoading(false);
    if (resp.data?.success) {
      setResult(resp.data.report);
      if (onComplete) onComplete();
    } else {
      setError(resp.data?.error || "Errore durante l'analisi WFS.");
    }
  };

  const wfsData = result || existingWfs;
  const analisi = wfsData?.analisi;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ border: '2px solid #1A3A6B', background: '#fff', marginTop: '1.5rem' }}>

      {/* Header */}
      <div style={{ background: '#1A3A6B', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="flex items-center gap-3">
          <Map className="w-4 h-4 text-white" />
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '0.75rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Analisi WFS — Regione Liguria
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'rgba(244,239,230,0.65)', marginTop: 2 }}>
              geoservizi.regione.liguria.it — dati ufficiali (EPSG:3003)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {wfsData && (
            <Badge className="bg-emerald-500 text-white text-[10px] border-0">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Completata
            </Badge>
          )}
          <Button
            onClick={handleAnalyze}
            disabled={loading}
            style={{ background: '#B33A2A', color: '#fff', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', border: 'none', height: '2.25rem', padding: '0 1.25rem', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : wfsData ? 'Riesegui →' : 'Avvia Analisi →'}
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: '#1A3A6B' }} />
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#7A7268' }}>
            Geocoding → EPSG:3003 → Query WFS layer…
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #C4BAA8' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#B33A2A' }}>
            ✗ {error}
          </p>
        </div>
      )}

      {/* Results */}
      {wfsData && !loading && (
        <>
          {/* Meta row */}
          <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid #C4BAA8', background: '#F4EFE6', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
            {wfsData.centroide && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268' }}>
                📍 {wfsData.centroide.lat?.toFixed(5)}, {wfsData.centroide.lon?.toFixed(5)}
              </span>
            )}
            {wfsData.coordinate_3003 && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268' }}>
                EPSG:3003 → X:{wfsData.coordinate_3003.x?.toLocaleString('it-IT')} Y:{wfsData.coordinate_3003.y?.toLocaleString('it-IT')}
              </span>
            )}
            {wfsData.data_elaborazione && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268' }}>
                🕐 {new Date(wfsData.data_elaborazione).toLocaleString('it-IT')}
              </span>
            )}
          </div>

          {/* Cards grid */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <VincoliCard data={analisi?.vincoli_paesaggistici} />
            <PaiCard data={analisi?.rischio_idrogeologico} />
            <SismicaCard data={analisi?.sismica} />
            <ZonaUrbanisticaCard data={analisi?.zona_urbanistica} />
          </div>

          {/* Footer note */}
          <div style={{ padding: '0.6rem 1.25rem', borderTop: '1px solid #C4BAA8', background: '#F4EFE6' }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', fontStyle: 'italic' }}>
              Dati WFS da Geoportale Regione Liguria (EPSG:3003). Layer: M2100 vincoli paesaggistici, M450 PAI. Verificare sempre sul viewer ufficiale.
            </p>
          </div>
        </>
      )}

      {/* Idle state */}
      {!wfsData && !loading && !error && (
        <div style={{ padding: '1.5rem 1.25rem', borderTop: '1px solid #C4BAA8' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#7A7268', lineHeight: 1.7 }}>
            Interroga i GeoServer ufficiali della Regione Liguria (geoservizi.regione.liguria.it):<br />
            — Vincoli paesaggistici OPE LEGIS (PPR art.142) · dataset M2100<br />
            — PAI rischio idrogeologico/idraulico · dataset M450<br />
            — Classificazione sismica DGR Liguria · — Zona urbanistica (link ufficiali)
          </p>
        </div>
      )}
    </motion.div>
  );
}