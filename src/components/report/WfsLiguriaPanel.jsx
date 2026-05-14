import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Map, Shield, Droplets, Activity,
  Loader2, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp
} from "lucide-react";
import { wfsLiguria } from "@/functions/wfsLiguria";

function StatusIcon({ dati }) {
  if (!dati || dati === 'non_disponibile') return <XCircle className="w-4 h-4 text-muted-foreground" />;
  if (dati === 'nessun_vincolo_rilevato') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
}

function StatusBadge({ dati, label }) {
  if (!dati || dati === 'non_disponibile') {
    return <Badge variant="outline" className="text-[10px] text-muted-foreground">Non disponibile</Badge>;
  }
  if (dati === 'nessun_vincolo_rilevato') {
    return <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200">Nessun vincolo rilevato</Badge>;
  }
  return <Badge className="text-[10px] bg-blue-100 text-blue-800 border-blue-200">Dati disponibili</Badge>;
}

function LayerSection({ icon: Icon, title, result, color }) {
  const [expanded, setExpanded] = useState(false);
  const hasData = result?.dati && result.dati !== 'non_disponibile' && result.dati !== 'nessun_vincolo_rilevato';
  const isVincolo = result?.dati === 'nessun_vincolo_rilevato';

  return (
    <div style={{ border: '1px solid #C4BAA8', background: '#fff', marginBottom: 0 }}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={() => hasData && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div style={{ width: 32, height: 32, background: '#F4EFE6', border: '1px solid #C4BAA8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
            {result?.layer_utilizzato && (
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268', marginTop: 2 }}>
                Layer: {result.layer_utilizzato}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isVincolo
            ? <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">✓ Nessun vincolo</Badge>
            : hasData
              ? <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">✓ Dati WFS</Badge>
              : <Badge variant="outline" className="text-[10px] text-muted-foreground">— N/D</Badge>
          }
          {hasData && (
            expanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && hasData && (
        <div style={{ borderTop: '1px solid #C4BAA8', padding: '1rem', background: '#F4EFE6' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(result.dati).map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', textTransform: 'uppercase', letterSpacing: '1px' }}>{k.replace(/_/g, ' ')}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#1C1A17', fontWeight: 600 }}>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WfsLiguriaPanel({ query, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Read existing WFS data if already run
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
      setError(resp.data?.error || 'Errore durante l\'analisi WFS.');
    }
  };

  const wfsData = result || existingWfs;

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
              srvcarto.regione.liguria.it — dati ufficiali
            </p>
          </div>
        </div>
        {!wfsData && (
          <Button
            onClick={handleAnalyze}
            disabled={loading}
            style={{ background: '#B33A2A', color: '#fff', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', border: 'none', height: '2.25rem', padding: '0 1.25rem', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Avvia Analisi →'}
          </Button>
        )}
        {wfsData && (
          <Badge className="bg-emerald-500 text-white text-[10px] border-0">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Completata
          </Badge>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: '#1A3A6B' }} />
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#7A7268' }}>
            Geocoding → GetCapabilities → Query layer WFS…
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
          {/* Meta */}
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #C4BAA8', background: '#F4EFE6', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            {wfsData.centroide && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#7A7268' }}>
                📍 {wfsData.centroide.lat?.toFixed(5)}, {wfsData.centroide.lon?.toFixed(5)}
              </span>
            )}
            {wfsData.data_elaborazione && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#7A7268' }}>
                🕐 {new Date(wfsData.data_elaborazione).toLocaleString('it-IT')}
              </span>
            )}
            {wfsData.fonte_dati && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#7A7268' }}>
                🔗 {wfsData.fonte_dati}
              </span>
            )}
          </div>

          {/* Layers */}
          <div style={{ borderTop: '1px solid #C4BAA8' }}>
            <LayerSection
              icon={Map}
              title="Zona Urbanistica"
              result={wfsData.analisi_urbanistica?.zona_urbanistica}
              color="#1A3A6B"
            />
            <div style={{ borderTop: '1px solid #C4BAA8' }}>
              <LayerSection
                icon={Shield}
                title="Vincoli Paesaggistici"
                result={wfsData.analisi_urbanistica?.vincoli_paesaggistici}
                color="#B33A2A"
              />
            </div>
            <div style={{ borderTop: '1px solid #C4BAA8' }}>
              <LayerSection
                icon={Droplets}
                title="Rischio Idrogeologico (PAI)"
                result={wfsData.analisi_urbanistica?.rischio_idrogeologico}
                color="#2563eb"
              />
            </div>
            <div style={{ borderTop: '1px solid #C4BAA8' }}>
              <LayerSection
                icon={Activity}
                title="Zonazione Sismica"
                result={wfsData.analisi_urbanistica?.zonazione_sismica}
                color="#d97706"
              />
            </div>
          </div>

          {/* Note */}
          {wfsData.note && (
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #C4BAA8', background: '#F4EFE6' }}>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268', fontStyle: 'italic' }}>
                {wfsData.note}
              </p>
            </div>
          )}

          {/* Re-run */}
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #C4BAA8', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleAnalyze}
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Riesegui analisi
            </button>
          </div>
        </>
      )}

      {/* Idle state (no data, not loading) */}
      {!wfsData && !loading && !error && (
        <div style={{ padding: '1.5rem 1.25rem', borderTop: '1px solid #C4BAA8' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#7A7268', lineHeight: 1.7 }}>
            Interroga i GeoServer della Regione Liguria per ottenere:<br />
            — Zona urbanistica (PRG/PUC) · — Vincoli D.Lgs 42/2004<br />
            — PAI idrogeologico · — Classificazione sismica
          </p>
        </div>
      )}
    </motion.div>
  );
}