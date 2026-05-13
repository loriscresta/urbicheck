import React, { useState } from "react";

const T = {
  live: '#1A3A6B',
  dev: '#E8832A',
  roadmap: '#C4BAA8',
  paper: '#F4EFE6',
  mono: "'IBM Plex Mono', monospace",
  serif: "'Libre Baskerville', serif",
};

const STATUS = {
  Liguria: { color: T.live, label: 'Live ●', detail: 'Live — dati WFS ufficiali' },
  Piemonte: { color: T.live, label: 'Live ●', detail: 'Live — dati WFS ufficiali' },
  Lombardia: { color: T.dev, label: 'Q3 2026', detail: 'In sviluppo — Q3 2026' },
  Veneto: { color: T.dev, label: 'Q3 2026', detail: 'In sviluppo — Q3 2026' },
  'Emilia-Romagna': { color: T.dev, label: 'Q3 2026', detail: 'In sviluppo — Q3 2026' },
  Toscana: { color: T.dev, label: 'Q4 2026', detail: 'In sviluppo — Q4 2026' },
  'Valle d\'Aosta': { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
  'Trentino-Alto Adige': { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
  'Friuli-Venezia Giulia': { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
  Lazio: { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
  Abruzzo: { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
  Molise: { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
  Campania: { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
  Puglia: { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
  Basilicata: { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
  Calabria: { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
  Sicilia: { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
  Sardegna: { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
  Marche: { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
  Umbria: { color: T.roadmap, label: '2027', detail: 'Roadmap 2027' },
};

// Simplified but recognizable SVG paths for Italian regions
// viewBox: 0 0 500 600
const REGIONS = [
  { name: "Valle d'Aosta", d: "M 82 52 L 102 47 L 115 55 L 112 68 L 93 72 L 80 65 Z" },
  { name: "Piemonte", d: "M 55 60 L 82 52 L 93 72 L 112 68 L 120 90 L 112 118 L 85 130 L 62 125 L 45 105 L 42 80 Z" },
  { name: "Liguria", d: "M 62 125 L 85 130 L 112 118 L 135 125 L 148 138 L 130 148 L 100 150 L 72 145 L 58 138 Z" },
  { name: "Lombardia", d: "M 112 68 L 160 55 L 200 60 L 215 75 L 210 100 L 185 115 L 155 118 L 135 125 L 112 118 L 120 90 Z" },
  { name: "Trentino-Alto Adige", d: "M 160 55 L 200 42 L 240 48 L 245 70 L 220 80 L 200 75 L 215 75 L 200 60 Z" },
  { name: "Veneto", d: "M 200 60 L 245 70 L 270 65 L 285 80 L 275 100 L 250 115 L 225 115 L 210 100 L 215 75 Z" },
  { name: "Friuli-Venezia Giulia", d: "M 270 65 L 310 60 L 320 78 L 300 90 L 285 80 Z" },
  { name: "Emilia-Romagna", d: "M 135 125 L 155 118 L 185 115 L 210 100 L 225 115 L 235 135 L 220 155 L 185 158 L 158 158 L 140 148 L 148 138 Z" },
  { name: "Toscana", d: "M 140 148 L 158 158 L 185 158 L 195 175 L 188 200 L 165 215 L 145 218 L 125 205 L 120 182 L 130 162 Z" },
  { name: "Marche", d: "M 235 135 L 265 128 L 278 150 L 270 172 L 248 178 L 232 165 L 220 155 Z" },
  { name: "Umbria", d: "M 188 200 L 195 175 L 220 155 L 232 165 L 235 185 L 220 205 L 200 210 Z" },
  { name: "Lazio", d: "M 165 215 L 188 200 L 200 210 L 220 205 L 225 225 L 218 252 L 195 262 L 172 258 L 158 242 L 155 220 Z" },
  { name: "Abruzzo", d: "M 248 178 L 270 172 L 280 195 L 272 218 L 252 225 L 235 215 L 225 225 L 220 205 L 235 185 L 232 165 Z" },
  { name: "Molise", d: "M 252 225 L 272 218 L 278 235 L 265 248 L 248 245 L 240 235 Z" },
  { name: "Campania", d: "M 218 252 L 225 225 L 235 215 L 240 235 L 248 245 L 255 262 L 248 288 L 225 302 L 200 298 L 188 278 L 192 258 Z" },
  { name: "Puglia", d: "M 272 218 L 300 212 L 318 232 L 325 262 L 318 288 L 295 312 L 278 322 L 268 308 L 275 285 L 272 258 L 265 248 L 278 235 Z" },
  { name: "Basilicata", d: "M 248 288 L 255 262 L 265 248 L 272 258 L 275 285 L 268 308 L 248 312 L 232 305 L 228 290 Z" },
  { name: "Calabria", d: "M 232 305 L 248 312 L 268 308 L 275 332 L 265 358 L 245 370 L 225 362 L 215 345 L 220 322 Z" },
  { name: "Sicilia", d: "M 175 390 L 220 378 L 258 382 L 280 398 L 278 418 L 252 432 L 218 438 L 185 432 L 162 415 L 162 400 Z" },
  { name: "Sardegna", d: "M 62 280 L 90 268 L 115 272 L 130 295 L 128 330 L 110 348 L 82 352 L 60 338 L 50 312 L 55 290 Z" },
];

export default function ItalyMap() {
  const [tooltip, setTooltip] = useState(null); // { name, x, y }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '520px' }}>
        <svg
          viewBox="0 0 370 460"
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseLeave={() => setTooltip(null)}
        >
          {REGIONS.map((r) => {
            const s = STATUS[r.name] || { color: T.roadmap };
            return (
              <path
                key={r.name}
                d={r.d}
                fill={s.color}
                stroke="#F4EFE6"
                strokeWidth="1.5"
                strokeLinejoin="round"
                style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={(e) => {
                  const svg = e.currentTarget.closest('svg');
                  const rect = svg.getBoundingClientRect();
                  const pt = svg.createSVGPoint();
                  pt.x = e.clientX;
                  pt.y = e.clientY;
                  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
                  setTooltip({ name: r.name, x: svgPt.x, y: svgPt.y });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}

          {/* Tooltip inside SVG */}
          {tooltip && (() => {
            const s = STATUS[tooltip.name] || { color: T.roadmap, detail: '2027' };
            const tx = Math.min(Math.max(tooltip.x - 60, 4), 250);
            const ty = tooltip.y > 40 ? tooltip.y - 38 : tooltip.y + 8;
            return (
              <g>
                <rect x={tx} y={ty} width="160" height="28" rx="0" fill="#1C1A17" opacity="0.92" />
                <text x={tx + 8} y={ty + 12} fontFamily="'IBM Plex Mono', monospace" fontSize="8" fill="#F4EFE6" fontWeight="700">
                  {tooltip.name}
                </text>
                <circle cx={tx + 8} cy={ty + 21} r="3" fill={s.color} />
                <text x={tx + 15} y={ty + 24} fontFamily="'IBM Plex Mono', monospace" fontSize="7.5" fill="#C4BAA8">
                  {s.detail}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legenda */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5rem',
        justifyContent: 'center',
        marginTop: '1.5rem',
      }}>
        {[
          { color: T.live, label: 'Live — dati WFS ufficiali' },
          { color: T.dev, label: 'In sviluppo — Q3/Q4 2026' },
          { color: T.roadmap, label: 'Roadmap 2027' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontFamily: T.mono, fontSize: '0.65rem', color: '#7A7268', letterSpacing: '0.5px' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}