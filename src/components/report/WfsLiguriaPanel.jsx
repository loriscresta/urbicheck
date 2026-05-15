import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Map, Shield, Droplets, Activity, ExternalLink, Train, Waves,
  Loader2, CheckCircle2, AlertTriangle, Info, XCircle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
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
            <ExternalLink className="w-3 h-3" />
            {data.link_verifica_ufficiale.includes('piemonte') ? 'geoportale.piemonte.it' : 'liguriavincoli.it'}
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

// ── Database CDU link comunali ──
const CDU_LINKS = {
  "alessandria": {
    cdu: "https://www.comune.alessandria.it/index.php?id=551",
    geoportale: "https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=PRGC+Alessandria",
    piano: "PRGC — Piano Regolatore Generale Comunale",
    sportello: "Piazza della Libertà 1, Alessandria — Ufficio Urbanistica",
  },
  "torino": {
    cdu: "https://www.comune.torino.it/urb/",
    geoportale: "https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=PRG+Torino",
    piano: "PRG — Piano Regolatore Generale",
  },
  "savona": {
    cdu: "https://www.comune.savona.it/it/page/urbanistica",
    geoportale: "https://geoportal.regione.liguria.it/",
    piano: "PUC — Piano Urbanistico Comunale",
  },
};

function getCduLinks(comuneNome) {
  return CDU_LINKS[(comuneNome || '').toLowerCase()] || null;
}

// ── Zona Urbanistica Card ──
function ZonaUrbanisticaCard({ data, comuneNome }) {
  if (!data) return null;
  const cduInfo = !data.disponibile ? getCduLinks(comuneNome) : null;
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
      {/* Links: prima il DB locale (più preciso), poi i link dal WFS */}
      <div style={{ borderTop: '1px solid #C4BAA8', padding: '0.5rem 1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {cduInfo ? (
          <>
            <a href={cduInfo.cdu} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#B33A2A', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
              <ExternalLink className="w-3 h-3" /> Richiedi CDU — Comune di {comuneNome}
            </a>
            <a href={cduInfo.geoportale} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ExternalLink className="w-3 h-3" /> Geoportale Regionale
            </a>
          </>
        ) : (
          <>
            {data.link_geoportale && (
              <a href={data.link_geoportale} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink className="w-3 h-3" />
                {data.link_geoportale.includes('piemonte') ? 'Geoportale Piemonte' : 'Geoportale Liguria'}
              </a>
            )}
            {data.link_comune && (
              <a href={data.link_comune} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink className="w-3 h-3" /> PRG/PUC Comune
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Lago Card (Piemonte) — con logica intelligente per comuni interni ──
// Comuni Piemonte senza laghi noti entro 300m (comune interno)
const COMUNI_INTERNI_PIEMONTE = [
  "alessandria","asti","casale monferrato","tortona","ovada","acqui terme",
  "novi ligure","cuneo","fossano","savigliano","bra","alba","asti","vercelli",
  "biella","verbania"
];

function LagoCard({ vincolo_lacustre, comuneNome }) {
  if (!vincolo_lacustre) return null;

  // Se non verificabile (presente===null), applicare logica intelligente per comuni interni
  const isComune = (comuneNome || '').toLowerCase();
  const isInterno = COMUNI_INTERNI_PIEMONTE.some(c => isComune.includes(c));
  const vincoloEffettivo = (vincolo_lacustre.presente === null && isInterno)
    ? { presente: false, nota: `Nessun vincolo lacustre rilevato — ${comuneNome} è comune interno senza laghi noti entro 300m.` }
    : vincolo_lacustre;

  if (vincoloEffettivo.presente === false) {
    return (
      <div style={{ border: '1px solid #6ee7b7', background: '#f0fdf4' }}>
        <div className="flex items-start justify-between p-4 gap-3">
          <div className="flex items-start gap-3">
            <div style={{ width: 32, height: 32, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Waves className="w-4 h-4" style={{ color: '#059669' }} />
            </div>
            <div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Vincolo Lacustre
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', marginTop: 2 }}>
                Art.142 c.1 lett. b) D.Lgs 42/2004 — Overpass (raggio 300m)
              </p>
            </div>
          </div>
          <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 whitespace-nowrap">✓ Nessun lago entro 300m</Badge>
        </div>
        <div style={{ borderTop: '1px solid #6ee7b7', padding: '0.6rem 1rem' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#059669', fontStyle: 'italic' }}>{vincoloEffettivo.nota}</p>
        </div>
      </div>
    );
  }
  if (vincoloEffettivo.presente === true) {
    return (
      <div style={{ border: '1px solid #fca5a5', background: '#fff7f7' }}>
        <div className="flex items-start justify-between p-4 gap-3">
          <div className="flex items-start gap-3">
            <div style={{ width: 32, height: 32, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Waves className="w-4 h-4" style={{ color: '#dc2626' }} />
            </div>
            <div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Vincolo Lacustre
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', marginTop: 2 }}>
                Art.142 c.1 lett. b) D.Lgs 42/2004 — 300m dalla sponda
              </p>
            </div>
          </div>
          <Badge className="text-[10px] bg-red-100 text-red-800 border-red-200 whitespace-nowrap">⚠ Lago rilevato</Badge>
        </div>
        <div style={{ borderTop: '1px solid #fca5a5', padding: '0.75rem 1rem' }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', fontWeight: 700, color: '#dc2626' }}>{vincoloEffettivo.lago}</span>
            {vincoloEffettivo.fascia_tutela && <Badge variant="outline" className="text-[10px]">{vincoloEffettivo.fascia_tutela}</Badge>}
          </div>
          {vincoloEffettivo.descrizione && (
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268', marginLeft: '1.25rem', lineHeight: 1.6 }}>{vincoloEffettivo.descrizione}</p>
          )}
        </div>
      </div>
    );
  }
  // presente === null e non comune interno noto → warning con link verifica
  return (
    <div style={{ border: '1px solid #fde68a', background: '#fffbeb' }}>
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex items-start gap-3">
          <div style={{ width: 32, height: 32, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Waves className="w-4 h-4" style={{ color: '#d97706' }} />
          </div>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Vincolo Lacustre
            </p>
          </div>
        </div>
        <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200 whitespace-nowrap">⚠ Verificare</Badge>
      </div>
      <div style={{ borderTop: '1px solid #fde68a', padding: '0.6rem 1rem' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#d97706', fontStyle: 'italic' }}>{vincolo_lacustre.nota || "Verifica manuale consigliata — comune potenzialmente vicino a laghi."}</p>
        <a href="https://www.geoportale.piemonte.it/geonetwork/srv/ita/catalog.search#/search?any=vincoli+paesaggistici" target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <ExternalLink className="w-3 h-3" /> Verifica su Geoportale Piemonte
        </a>
      </div>
    </div>
  );
}

// ── PAI Piemonte Card ──
function PaiFraneCard({ data }) {
  if (!data) return null;
  const totali = data.features_totali || 0;
  const fonteOk = data.fonte_ok;
  const hasFrane = totali > 0;
  const borderColor = !fonteOk ? '#fde68a' : hasFrane ? '#fca5a5' : '#6ee7b7';
  const bgColor = !fonteOk ? '#fffbeb' : hasFrane ? '#fff7f7' : '#f0fdf4';

  return (
    <div style={{ border: `1px solid ${borderColor}`, background: bgColor }}>
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex items-start gap-3">
          <div style={{ width: 32, height: 32, background: !fonteOk ? '#fef3c7' : hasFrane ? '#fee2e2' : '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Droplets className="w-4 h-4" style={{ color: !fonteOk ? '#d97706' : hasFrane ? '#dc2626' : '#059669' }} />
          </div>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#1C1A17', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              PAI Frane — ARPA Piemonte
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#7A7268', marginTop: 2 }}>
              Inventario Fenomeni Franosi (POLIGONALI + PIFF)
            </p>
          </div>
        </div>
        {!fonteOk
          ? <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200 whitespace-nowrap">⚠ WFS non disponibile</Badge>
          : hasFrane
            ? <Badge className="text-[10px] bg-red-100 text-red-800 border-red-200 whitespace-nowrap">⚠ {totali} geometrie</Badge>
            : <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 whitespace-nowrap">✓ Nessuna frana</Badge>
        }
      </div>
      <div style={{ borderTop: `1px solid ${borderColor}`, padding: '0.75rem 1rem' }}>
        {(data.dati || []).map((d, i) => (
          <div key={i} className="flex items-center justify-between mb-1 last:mb-0">
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#1C1A17' }}>{d.layer}</span>
            <div className="flex items-center gap-2">
              {!d.fonte_ok
                ? <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#d97706' }}>N/D</span>
                : d.trovato
                  ? <><span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#dc2626' }}>{d.features_count} geometrie</span><AlertTriangle className="w-3 h-3 text-amber-500" /></>
                  : <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              }
            </div>
          </div>
        ))}
        {data.nota && (
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268', fontStyle: 'italic', marginTop: 4 }}>{data.nota}</p>
        )}
      </div>
      {data.link_pai && (
        <div style={{ borderTop: `1px solid ${borderColor}`, padding: '0.5rem 1rem' }}>
          <a href={data.link_pai} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#1A3A6B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink className="w-3 h-3" /> webgis.arpa.piemonte.it
          </a>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000; // 2 min max

export default function WfsLiguriaPanel({ query, onComplete }) {
  const [launching, setLaunching] = useState(false);
  const [polling, setPolling] = useState(false);
  const [wfsData, setWfsData] = useState(query?.report_data?.wfs_liguria || null);
  const [error, setError] = useState('');
  const pollRef = useRef(null);
  const pollStartRef = useRef(null);

  // If query already has wfs data on mount, show it
  useEffect(() => {
    if (query?.report_data?.wfs_liguria) {
      setWfsData(query.report_data.wfs_liguria);
    }
  }, [query?.id]);

  // FIX B — Auto-avvio analisi se non ancora presente
  useEffect(() => {
    const alreadyDone = query?.report_data?.wfs_liguria?.risultati?.zona_urbanistica?.disponibile === true
      || query?.report_data?.wfs_liguria;
    if (!alreadyDone && query?.id && !launching && !polling) {
      handleAnalyze();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query?.id]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  };

  const startPolling = () => {
    setPolling(true);
    pollStartRef.current = Date.now();
    pollRef.current = setInterval(async () => {
      // Timeout guard
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        stopPolling();
        setError("Analisi scaduta (timeout 2 min). Riprova.");
        return;
      }
      try {
        const results = await base44.entities.CadastralQuery.filter({ id: query.id });
        const updated = results[0];
        if (!updated) return;
        if (updated.status === 'completed' && updated.report_data?.wfs_liguria) {
          stopPolling();
          setWfsData(updated.report_data.wfs_liguria);
          if (onComplete) onComplete();
        } else if (updated.status === 'failed') {
          stopPolling();
          setError("Analisi fallita. Riprova.");
        }
      } catch (_e) {
        // Network hiccup — keep polling
      }
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => () => stopPolling(), []);

  const handleAnalyze = async () => {
    setLaunching(true);
    setError('');
    setWfsData(null);
    try {
      await wfsLiguria({ query_id: query.id });
      // Function saved results directly — check immediately then poll
      const results = await base44.entities.CadastralQuery.filter({ id: query.id });
      const updated = results[0];
      if (updated?.status === 'completed' && updated?.report_data?.wfs_liguria) {
        setWfsData(updated.report_data.wfs_liguria);
        if (onComplete) onComplete();
        setLaunching(false);
        return;
      }
      // Not yet — start polling
      startPolling();
    } catch (err) {
      // Function call failed entirely — still try polling in case it saved before throwing
      startPolling();
    }
    setLaunching(false);
  };

  const isLoading = launching || polling;
  const risultati = wfsData?.risultati;
  const regioneLower = (query?.regione || '').toLowerCase();
  const isPiemonte = wfsData?.regione_logica === 'piemonte' || regioneLower.includes('piemonte');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ border: '2px solid #1A3A6B', background: '#fff', marginTop: '1.5rem' }}>

      {/* Header */}
      <div style={{ background: '#1A3A6B', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="flex items-center gap-3">
          <Map className="w-4 h-4 text-white shrink-0" />
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '0.75rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Analisi Urbanistica — {isPiemonte ? 'Regione Piemonte' : 'Regione Liguria'}
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'rgba(244,239,230,0.65)', marginTop: 2 }}>
              {isPiemonte
                ? 'WFS PAI ARPA Piemonte + vincoli ope legis + Overpass API'
                : 'WFS PAI (M450) + vincoli ope legis + Overpass API (EPSG:3003)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {wfsData && !isLoading && (
            <Badge className="bg-emerald-500 text-white text-[10px] border-0">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Completata
            </Badge>
          )}
          {isLoading && (
            <Badge className="bg-amber-500 text-white text-[10px] border-0">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> {launching ? 'Avvio…' : 'In corso…'}
            </Badge>
          )}
          {wfsData && !isLoading && (
            <button
              onClick={handleAnalyze}
              style={{
                background: '#7A7268',
                color: '#fff',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                border: 'none',
                height: '1.8rem',
                padding: '0 0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              Riesegui →
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: '#1A3A6B' }} />
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#7A7268' }}>
            {launching ? 'Avvio analisi…' : 'Geocoding → EPSG:3003 → WFS PAI + Overpass API…'}
          </p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#C4BAA8', marginTop: 6 }}>
            Attendi, elaborazione in corso (30–60s)
          </p>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #fca5a5', background: '#fff7f7', display: 'flex', alignItems: 'center', gap: 8 }}>
          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#B33A2A' }}>{error}</p>
        </div>
      )}

      {/* Results */}
      {wfsData && !isLoading && (
        <>
          {/* Meta */}
          <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid #C4BAA8', background: '#F4EFE6', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
            {wfsData.coordinate && (
              <>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268' }}>
                  📍 WGS84: {wfsData.coordinate.lat?.toFixed(5)}, {wfsData.coordinate.lon?.toFixed(5)}
                </span>
                {!isPiemonte && wfsData.coordinate.x_gauss_boaga && (
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#7A7268' }}>
                    EPSG:3003 → X:{wfsData.coordinate.x_gauss_boaga?.toLocaleString('it-IT')} Y:{wfsData.coordinate.y_gauss_boaga?.toLocaleString('it-IT')}
                  </span>
                )}
              </>
            )}
            {wfsData.geocoding_error && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#B33A2A' }}>
                ⚠ Geocoding parziale: {wfsData.geocoding_error}
              </span>
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
            {isPiemonte
              ? <PaiFraneCard data={risultati?.pai_rischio_idrogeologico} />
              : <PaiCard data={risultati?.pai_rischio_idrogeologico} />
            }
            {isPiemonte && risultati?.vincoli_paesaggistici_ope_legis?.vincolo_lacustre && (
              <LagoCard vincolo_lacustre={risultati.vincoli_paesaggistici_ope_legis.vincolo_lacustre} comuneNome={query?.comune} />
            )}
            <CorsiAcquaCard data={risultati?.vincolo_corsi_acqua} />
            <FerroviaCard data={risultati?.vincolo_ferroviario} />
            <SismicaCard data={risultati?.sismica} />
            <ZonaUrbanisticaCard data={risultati?.zona_urbanistica} comuneNome={query?.comune} />
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
      {!wfsData && !isLoading && !error && (
        <div style={{ padding: '1.5rem 1.25rem', borderTop: '1px solid #C4BAA8' }}>
          {isPiemonte ? (
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#7A7268', lineHeight: 1.8 }}>
              Analisi urbanistica ibrida per il Piemonte:<br />
              — Vincoli ope legis (art.142 D.Lgs 42/2004) — nessun vincolo costiero<br />
              — Vincolo lacustre (art.142 lett.b) — Overpass API (raggio 300m)<br />
              — PAI Frane — WFS ARPA Piemonte (POLIGONALI + PIFF)<br />
              — Corsi d'acqua e ferrovie — Overpass API (raggio 250m)<br />
              — Classificazione sismica DGR n.6-887/2019
            </p>
          ) : (
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#7A7268', lineHeight: 1.8 }}>
              Analisi urbanistica ibrida per la Liguria:<br />
              — Vincoli ope legis (art.142 D.Lgs 42/2004) — analisi logica per comune<br />
              — PAI rischio idrogeologico/idraulico — WFS ufficiale M450<br />
              — Corsi d'acqua e ferrovie — Overpass API (raggio 250m)<br />
              — Classificazione sismica DGR Liguria
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}