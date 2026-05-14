import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Map, Shield, Droplets, Activity, ExternalLink, Train, Waves,
  Loader2, CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronUp
} from "lucide-react";
import { wfsLiguria } from "@/functions/wfsLiguria";

// ── Vincoli Paesaggistici Card ──
function VincoliCard({ data }) {
  if (!data) return null;
  const vincoli = data.vincoli || [];
  const hasVincoli = vincoli.some(v => v.livello !== 'NESSUN_VINCOLO_RILEVATO');

  return (
    <div style={{ border: `1px solid ${hasVincoli ? '#fca5a5' : '#6ee7b7'}`, background: hasVincoli ? '#fff7f7' : '#f0fdf4' }}>
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex items-start gap-3">
          <div style={{ width: 32, height: 32, background: hasVincoli ? '#fee2e2' : '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield className="w-4 h-4" style={{ color: hasVincoli ? '#dc2626' : '#059669' }} />
          </div>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Vincoli Paesaggistici Ope Legis
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', marginTop: 2 }}>
              Art.142 D.Lgs 42/2004
            </p>
          </div>
        </div>
        {hasVincoli
          ? <Badge className="text-[10px] bg-red-100 text-red-800 border-red-200 whitespace-nowrap">⚠ {vincoli.filter(v => v.livello !== 'NESSUN_VINCOLO_RILEVATO').length} vincolo{vincoli.filter(v => v.livello !== 'NESSUN_VINCOLO_RILEVATO').length > 1 ? 'i' : ''}</Badge>
          : <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 whitespace-nowrap">✓ Nessun vincolo</Badge>
        }
      </div>

      {hasVincoli && (
        <div style={{ borderTop: '1px solid #fca5a5', padding: '0.75rem 1rem' }}>
          {vincoli.filter(v => v.livello !== 'NESSUN_VINCOLO_RILEVATO').map((v, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', fontWeight: 700, color: '#dc2626' }}>{v.tipo}</span>
                {v.fascia_tutela && <Badge variant="outline" className="text-[10px]">{v.fascia_tutela}</Badge>}
              </div>
              {v.riferimento_normativo && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268', marginLeft: '1.25rem' }}>{v.riferimento_normativo}</p>
              )}
              {v.nome_area_protetta && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#1C1A17', fontWeight: 600, marginLeft: '1.25rem' }}>{v.nome_area_protetta}</p>
              )}
              {v.descrizione && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268', marginLeft: '1.25rem', lineHeight: 1.6, marginTop: 2 }}>{v.descrizione}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasVincoli && (
        <div style={{ borderTop: '1px solid #6ee7b7', padding: '0.6rem 1rem' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#059669', fontStyle: 'italic' }}>
            {vincoli[0]?.nota}
          </p>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${hasVincoli ? '#fca5a5' : '#6ee7b7'}`, padding: '0.5rem 1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {data.link_verifica_ufficiale && (
          <a href={data.link_verifica_ufficiale} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink className="w-3 h-3" /> liguriavincoli.it
          </a>
        )}
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', fontStyle: 'italic' }}>
          {data.nota_foreste_boschi}
        </p>
      </div>
    </div>
  );
}

// ── PAI Card ──
function PaiCard({ data }) {
  if (!data) return null;
  const dati = data.dati || [];
  const trovati = dati.filter(d => d.trovato);
  const hasRischio = trovati.length > 0;

  const maxClasse = trovati.reduce((max, d) => {
    const n = parseInt((d.classe || '').replace(/[^0-9]/g, '')) || 0;
    return n > max ? n : max;
  }, 0);
  const isHighRisk = maxClasse >= 3;

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
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              PAI — Rischio Idrogeologico
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', marginTop: 2 }}>
              Piano di Bacino — Dataset M450
            </p>
          </div>
        </div>
        {hasRischio
          ? <Badge className={`text-[10px] whitespace-nowrap ${isHighRisk ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>⚠ Rischio rilevato</Badge>
          : <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 whitespace-nowrap">✓ Nessun rischio PAI</Badge>
        }
      </div>

      <div style={{ borderTop: `1px solid ${borderColor}`, padding: '0.75rem 1rem' }}>
        {dati.map((d, i) => (
          <div key={i} className="flex items-center justify-between mb-1 last:mb-0">
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#1C1A17' }}>{d.layer}</span>
            <div className="flex items-center gap-2">
              {d.trovato ? (
                <>
                  {d.classe && <Badge variant="outline" className="text-[10px]">Classe {d.classe}</Badge>}
                  {d.bacino && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268' }}>{d.bacino}</span>}
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                </>
              ) : (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${borderColor}`, padding: '0.5rem 1rem' }}>
        {data.link_pai && (
          <a href={data.link_pai} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink className="w-3 h-3" /> pai.ambienteinliguria.it
          </a>
        )}
      </div>
    </div>
  );
}

// ── Corsi Acqua Card ──
function CorsiAcquaCard({ data }) {
  if (!data) return null;
  const dati = data.dati || [];
  const trovati = dati.filter(d => d.trovato);
  const hasWater = trovati.length > 0;

  const borderColor = hasWater ? '#fde68a' : '#6ee7b7';
  const bgColor = hasWater ? '#fffbeb' : '#f0fdf4';

  return (
    <div style={{ border: `1px solid ${borderColor}`, background: bgColor }}>
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex items-start gap-3">
          <div style={{ width: 32, height: 32, background: hasWater ? '#fef3c7' : '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Waves className="w-4 h-4" style={{ color: hasWater ? '#d97706' : '#059669' }} />
          </div>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Vincolo Corsi d'Acqua
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', marginTop: 2 }}>
              Art.142 c.1 lett. c) D.Lgs 42/2004 — Overpass API
            </p>
          </div>
        </div>
        {hasWater
          ? <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200 whitespace-nowrap">⚠ {trovati.length} corso d'acqua</Badge>
          : <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 whitespace-nowrap">✓ Nessuno entro 250m</Badge>
        }
      </div>

      {hasWater && (
        <div style={{ borderTop: `1px solid ${borderColor}`, padding: '0.75rem 1rem' }}>
          {trovati.map((w, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', fontWeight: 700, color: '#d97706' }}>{w.nome}</span>
                <Badge variant="outline" className="text-[10px]">{w.tipo}</Badge>
                {w.livello === 'POSSIBILE_VINCOLO_ALTO' && <Badge className="text-[10px] bg-red-100 text-red-800 border-red-200">Alta prob.</Badge>}
              </div>
              {w.fascia_tutela && <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268' }}>{w.fascia_tutela} — {w.riferimento_normativo}</p>}
              {w.descrizione && <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268', lineHeight: 1.6, marginTop: 2 }}>{w.descrizione}</p>}
            </div>
          ))}
        </div>
      )}

      {!hasWater && (
        <div style={{ borderTop: `1px solid ${borderColor}`, padding: '0.6rem 1rem' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#059669', fontStyle: 'italic' }}>{dati[0]?.nota}</p>
        </div>
      )}
    </div>
  );
}

// ── Ferrovia Card ──
function FerroviaCard({ data }) {
  if (!data) return null;
  const dati = data.dati || [];
  const trovati = dati.filter(d => d.trovato);
  const hasFerr = trovati.length > 0;

  return (
    <div style={{ border: `1px solid ${hasFerr ? '#fde68a' : '#6ee7b7'}`, background: hasFerr ? '#fffbeb' : '#f0fdf4' }}>
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex items-start gap-3">
          <div style={{ width: 32, height: 32, background: hasFerr ? '#fef3c7' : '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Train className="w-4 h-4" style={{ color: hasFerr ? '#d97706' : '#059669' }} />
          </div>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Vincolo Ferroviario
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', marginTop: 2 }}>
              DPR 753/1980 — Overpass API (raggio 250m)
            </p>
          </div>
        </div>
        {hasFerr
          ? <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200 whitespace-nowrap">⚠ Ferrovia rilevata</Badge>
          : <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 whitespace-nowrap">✓ Nessuna entro 250m</Badge>
        }
      </div>

      {hasFerr && (
        <div style={{ borderTop: '1px solid #fde68a', padding: '0.75rem 1rem' }}>
          {trovati.map((f, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', fontWeight: 700, color: '#d97706' }}>{f.nome}</span>
                {f.fascia_rispetto && <Badge variant="outline" className="text-[10px]">{f.fascia_rispetto}</Badge>}
              </div>
              {f.descrizione && <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268', lineHeight: 1.6, marginTop: 2 }}>{f.descrizione}</p>}
            </div>
          ))}
        </div>
      )}

      {!hasFerr && (
        <div style={{ borderTop: '1px solid #6ee7b7', padding: '0.6rem 1rem' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#059669', fontStyle: 'italic' }}>{dati[0]?.nota}</p>
        </div>
      )}
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
  const badgeClass = zona === 2 ? 'bg-red-100 text-red-800 border-red-200' : zona === 3 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200';

  return (
    <div style={{ border: `1px solid ${borderColor}`, background: bgColor }}>
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex items-start gap-3">
          <div style={{ width: 32, height: 32, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity className="w-4 h-4" style={{ color: iconColor }} />
          </div>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Classificazione Sismica
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', marginTop: 2 }}>
              {data.riferimento_normativo}
            </p>
          </div>
        </div>
        <Badge className={`text-[10px] whitespace-nowrap ${badgeClass}`}>Zona {zona}</Badge>
      </div>
      <div style={{ borderTop: `1px solid ${borderColor}`, padding: '0.6rem 1rem' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', fontWeight: 600, color: '#1C1A17' }}>{data.descrizione}</p>
        {data.nota && <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268', marginTop: 2, fontStyle: 'italic' }}>{data.nota}</p>}
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
          <div>
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
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#7A7268', fontStyle: 'italic', lineHeight: 1.6 }}>
            {data.messaggio}
          </p>
        </div>
        {data.azione_consigliata && (
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#1A3A6B', fontWeight: 600, marginTop: '0.4rem' }}>
            → {data.azione_consigliata}
          </p>
        )}
      </div>
      <div style={{ borderTop: '1px solid #C4BAA8', padding: '0.5rem 1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {data.link_geoportale && (
          <a href={data.link_geoportale} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink className="w-3 h-3" /> Geoportale Liguria
          </a>
        )}
        {data.link_comune && (
          <a href={data.link_comune} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink className="w-3 h-3" /> PRG/PUC Comune
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
      setError(resp.data?.errore || resp.data?.error || "Errore durante l'analisi WFS.");
    }
  };

  const wfsData = result || existingWfs;
  const risultati = wfsData?.risultati;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ border: '2px solid #1A3A6B', background: '#fff', marginTop: '1.5rem' }}>

      {/* Header */}
      <div style={{ background: '#1A3A6B', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="flex items-center gap-3">
          <Map className="w-4 h-4 text-white" />
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '0.75rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Analisi Urbanistica — Regione Liguria
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'rgba(244,239,230,0.65)', marginTop: 2 }}>
              WFS PAI (M450) + vincoli ope legis + Overpass API (EPSG:3003)
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

      {/* Loading */}
      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: '#1A3A6B' }} />
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#7A7268' }}>
            Geocoding → EPSG:3003 → WFS PAI + Overpass API…
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #C4BAA8' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#B33A2A' }}>✗ {error}</p>
        </div>
      )}

      {/* Results */}
      {wfsData && !loading && (
        <>
          {/* Meta */}
          <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid #C4BAA8', background: '#F4EFE6', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
            {wfsData.coordinate && (
              <>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268' }}>
                  📍 {wfsData.coordinate.lat?.toFixed(5)}, {wfsData.coordinate.lon?.toFixed(5)}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268' }}>
                  EPSG:3003 → X:{wfsData.coordinate.x_gauss_boaga?.toLocaleString('it-IT')} Y:{wfsData.coordinate.y_gauss_boaga?.toLocaleString('it-IT')}
                </span>
              </>
            )}
            {wfsData.data_elaborazione && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268' }}>
                🕐 {new Date(wfsData.data_elaborazione).toLocaleString('it-IT')}
              </span>
            )}
          </div>

          {/* Cards */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <VincoliCard data={risultati?.vincoli_paesaggistici_ope_legis} />
            <PaiCard data={risultati?.pai_rischio_idrogeologico} />
            <CorsiAcquaCard data={risultati?.vincolo_corsi_acqua} />
            <FerroviaCard data={risultati?.vincolo_ferroviario} />
            <SismicaCard data={risultati?.sismica} />
            <ZonaUrbanisticaCard data={risultati?.zona_urbanistica} />
          </div>

          {/* Disclaimer */}
          {wfsData.disclaimer && (
            <div style={{ padding: '0.6rem 1.25rem', borderTop: '1px solid #C4BAA8', background: '#F4EFE6' }}>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', fontStyle: 'italic', lineHeight: 1.6 }}>
                ⚠ {wfsData.disclaimer}
              </p>
            </div>
          )}
        </>
      )}

      {/* Idle */}
      {!wfsData && !loading && !error && (
        <div style={{ padding: '1.5rem 1.25rem', borderTop: '1px solid #C4BAA8' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#7A7268', lineHeight: 1.8 }}>
            Analisi urbanistica ibrida per la Liguria:<br />
            — Vincoli ope legis (art.142 D.Lgs 42/2004) — analisi logica per comune<br />
            — PAI rischio idrogeologico/idraulico — WFS ufficiale M450<br />
            — Corsi d'acqua e ferrovie — Overpass API (raggio 250m)<br />
            — Classificazione sismica DGR Liguria
          </p>
        </div>
      )}
    </motion.div>
  );
}