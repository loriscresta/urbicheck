/**
 * URBICHECK — PDF Generator (complete, all sections)
 */

const FINALITA_LABELS = {
  acquisto_privato: "Acquisto privato",
  investimento: "Investimento",
  sviluppo_immobiliare: "Sviluppo immobiliare",
  asta_giudiziaria: "Asta giudiziaria",
  due_diligence: "Due diligence",
  valutazione_professionale: "Valutazione professionale",
};

function loadJsPDF() {
  if (window.jspdf) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function fmtEur(n) {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

// Helper: add a section header, returns new y
function sectionHeader(doc, margin, y, num, title) {
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 95);
  doc.text(`${num}. ${title}`, margin, y);
  y += 4;
  doc.setDrawColor(30, 58, 95);
  doc.line(margin, y, 190, y);
  return y + 6;
}

// Helper: sub-header inside section
function subHeader(doc, margin, y, title) {
  if (y > 265) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 95);
  doc.text(title, margin + 2, y);
  return y + 6;
}

// Helper: key-value row
function kvRow(doc, margin, y, label, value, col2 = 90, maxWidth = 98) {
  if (y > 270) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text(String(label), margin + 2, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(value || "—"), col2, y, { maxWidth });
  return y + 8;
}

// Helper: alternating stripe
function stripe(doc, margin, y, isEven) {
  if (isEven) {
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y - 4, 170, 7, "F");
  }
}

// Helper: add new page with watermark
function newPage(doc) {
  doc.addPage();
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.04 }));
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(60);
  doc.setFont("helvetica", "bold");
  doc.text("URBICHECK", 30, 180, { angle: 45 });
  doc.restoreGraphicsState();
  return 20;
}

/**
 * Carica un'immagine da URL come data URL base64 per includerla nel PDF.
 * Timeout 8s per evitare attese eccessive.
 */
async function fetchImageAsDataUrl(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (_e) {
    return null;
  }
}

import { getOMIDataByNome } from './omiData.js';
import { findInNta, lookupNTA } from './ntaDatabase.js';
import { buildStaticMapUrl } from '../components/report/StaticParcellaMap';

export async function generatePDF(query, financialSnapshot, staticMapUrl = null) {
  await loadJsPDF();
  const { jsPDF } = window.jspdf;
  const r = query.report_data || {};
  const isAsta = query.finalita === "asta_giudiziaria";
  const wfsReport = r.wfs_liguria;
  const wfsData = wfsReport?.risultati;
  const isPiemonte = wfsReport?.regione_logica === 'piemonte' || (query.regione || '').toLowerCase().includes('piemonte');
  const fd = r.fin_data || {};

  // ── FIX 2: calcola OMI lato client se non passato ──────────────────────────
  let resolvedSnapshot = financialSnapshot;
  if (!resolvedSnapshot?.omi && query.comune) {
    const isZonaCentrale = !!(r.zonizzazione?.zona_codice || '').match(/A[0-9]?/i);
    const omiCalc = getOMIDataByNome(
      query.comune,
      isZonaCentrale,
      query.sigla_provincia || query.provincia,
      query.indirizzo_immobile
    );
    resolvedSnapshot = { ...(resolvedSnapshot || {}), omi: omiCalc };
  }

  // ── FIX 1: genera URL mappa statica se non presente ────────────────────────
  let resolvedMapUrl = staticMapUrl || query.mappa_image_url || null;
  if (!resolvedMapUrl && (query.centroid_lat || query.centroid_lng)) {
    const lat = parseFloat(query.centroid_lat);
    const lng = parseFloat(query.centroid_lng);
    const rawGeom = query.geometry_geojson || null;
    let polygonCoords = null;
    if (rawGeom) {
      const geom = rawGeom.type === "Feature" ? rawGeom.geometry : rawGeom;
      if (geom?.coordinates?.[0]?.length > 2) polygonCoords = geom.coordinates[0];
    }
    if (!isNaN(lat) && !isNaN(lng)) {
      resolvedMapUrl = buildStaticMapUrl({ lat, lng, polygonCoords, width: 800, height: 400 });
    }
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 20;

  const schNum =
    "URB-" +
    new Date().toISOString().slice(0, 10).replace(/-/g, "") +
    "-" +
    Math.random().toString(36).substring(2, 8).toUpperCase();

  // ── PAGE 1 ────────────────────────────────────────────────────────────────

  // Header navy
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("URBICHECK", margin, 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema di Analisi Urbanistica e Catastale", margin, 18);
  doc.setFontSize(9);
  doc.text("Scheda N. " + schNum, 140, 12);
  doc.text(new Date().toLocaleDateString("it-IT"), 140, 18);
  doc.text("urbicheck.it", 140, 24);

  // Watermark p1
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.05 }));
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(60);
  doc.setFont("helvetica", "bold");
  doc.text("URBICHECK", 30, 180, { angle: 45 });
  doc.restoreGraphicsState();

  // ── SEZ 1 — DATI IDENTIFICATIVI ──────────────────────────────────────────
  let y = 38;
  y = sectionHeader(doc, margin, y, "1", "DATI IDENTIFICATIVI IMMOBILE");

  const catastoData = r.catasto_data || {};
  const hasCoords = catastoData.lat || query.centroid_lat;
  const coordLat = catastoData.lat || query.centroid_lat;
  const coordLon = catastoData.lon || query.centroid_lng;

  const rows1 = [
    ["Regione", query.regione],
    ["Provincia", query.provincia || "—"],
    ["Comune", query.comune],
    ["Foglio catastale", query.foglio],
    ["Particella", query.particella],
    ["Subalterno", query.subalterno || "—"],
    ["Categoria catastale", query.categoria_catastale || r.dati_catastali?.categoria || "—"],
    ["Consistenza / Superficie",
      query.superficie_mq ? `${query.superficie_mq} mq` :
      r.dati_catastali?.consistenza || "Non disponibile — richiedere visura ufficiale AdE"],
    ["Finalità analisi", FINALITA_LABELS[query.finalita] || query.finalita || "—"],
    ["Zona urbanistica", r.zonizzazione?.zona_codice || r.zonizzazione?.destinazione_prevalente || "—"],
    ["Stato conservativo", fd.stato_conservativo || "—"],
    ["Rendita catastale",
      query.rendita_catastale != null
        ? fmtEur(query.rendita_catastale)
        : r.dati_catastali?.rendita_catastale || "Disponibile su visura ufficiale AdE"],
    ...(hasCoords ? [
      ["Coordinate WGS84 (lat, lon)", `${coordLat?.toFixed(5)}, ${coordLon?.toFixed(5)}`],
      ...(catastoData.inspire_id ? [["INSPIRE ID", catastoData.inspire_id]] : []),
      ["Fonte coordinate", catastoData.fonte || "OnData CC BY 4.0"],
    ] : []),
  ];

  doc.setFontSize(9);
  rows1.forEach(([k, v], i) => {
    stripe(doc, margin, y, i % 2 === 0);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(k, margin + 2, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(v || "—"), 90, y, { maxWidth: 98 });
    y += 8;
  });

  // ── SEZ 2 — ZONIZZAZIONE ──────────────────────────────────────────────────
  y += 4;
  y = sectionHeader(doc, margin, y, "2", "ZONIZZAZIONE URBANISTICA E INDICI EDILIZI");

  const zonaColore = r.zonizzazione?.colore?.toLowerCase();
  const zonaColor = zonaColore === "verde" ? [39, 174, 96] : zonaColore === "rosso" ? [231, 76, 60] : [243, 156, 18];
  if (y > 255) { y = newPage(doc); }
  doc.setFillColor(...zonaColor);
  doc.roundedRect(margin, y, 170, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const zonaNome = r.zonizzazione?.zona_codice || r.zonizzazione?.destinazione_prevalente || "Zona urbanistica";
  doc.text(zonaNome, margin + 6, y + 8);
  y += 18;

  if (r.zonizzazione?.descrizione) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const descLines = doc.splitTextToSize(r.zonizzazione.descrizione, 166);
    descLines.slice(0, 3).forEach(line => {
      if (y > 270) return;
      doc.text(line, margin + 2, y);
      y += 5;
    });
    y += 2;
  }

  // Disclaimer AI data for zonizzazione
  doc.setTextColor(150, 100, 0);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.text("AVVISO: Zona/Codice e indici edilizi sono stime AI orientative — NON provengono da WFS ufficiale.", margin + 2, y);
  y += 5;
  doc.text("Richiedere il Certificato Urbanistico (CU) al Comune per dati ufficiali verificati.", margin + 2, y);
  y += 7;

  const ie = r.indici_edilizi || {};
  const ND = "Da verificare con CDU al Comune";

  // ── FIX 3: lookup NTA database reale (Piemonte/Liguria/Lombardia) ──────────
  const zonaAI = r.zonizzazione?.zona_codice || r.zonizzazione?.destinazione_prevalente || null;
  const ntaDb = findInNta(query.comune) || lookupNTA(query.comune, zonaAI);
  // Fondi: 1) dati dal report AI  2) DB NTA UrbiCheck  3) ND
  const getIndice = (aiVal, ntaKey) => {
    if (aiVal && aiVal !== ND && aiVal !== "—") return aiVal;
    if (ntaDb?.[ntaKey]) return ntaDb[ntaKey];
    return ND;
  };

  const indici = [
    ["Indice di Fabbricabilita' (IF)", getIndice(ie.if_mc_mq, 'IF'), "m³/m²"],
    ["Rapporto di Copertura (RC)", getIndice(ie.rc_percentuale, 'RC'), "%"],
    ["Altezza massima (H max)", getIndice(ie.h_max, 'Hmax'), "m"],
    ["Distanza dai confini", getIndice(ie.distanza_confini, 'Dc'), "m"],
    ["Distanza dalla strada", getIndice(ie.distanza_strada, 'Ds'), "m"],
    ["Distanza tra fabbricati", getIndice(ie.distanza_fabbricati, 'Df'), "m"],
  ];
  doc.setFontSize(9);
  indici.forEach(([k, v, u], i) => {
    stripe(doc, margin, y, i % 2 === 0);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(k, margin + 2, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(v), 115, y, { maxWidth: 46 });
    doc.setTextColor(120, 120, 120);
    doc.text(u, 168, y);
    doc.setTextColor(50, 50, 50);
    y += 8;
  });
  // Fonte NTA se dati dal database interno
  if (ntaDb) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(80, 100, 80);
    const ntaFonte = ntaDb.fonte || ntaDb.strumento || 'Database NTA UrbiCheck';
    doc.text("Fonte indici: " + ntaFonte + " — verificare sempre con CDU ufficiale.", margin + 2, y, { maxWidth: 166 });
    y += 5; doc.setTextColor(50, 50, 50);
  }

  // ── SEZ 3 — VINCOLI PAESAGGISTICI ────────────────────────────────────────
  y += 4;
  if (y > 240) { y = newPage(doc); }
  y = sectionHeader(doc, margin, y, "3", "VINCOLI PAESAGGISTICI E IDROGEOLOGICI");

  const wfsPaesagg = wfsData?.vincoli_paesaggistici_ope_legis;
  const wfsPai = wfsData?.pai_rischio_idrogeologico;
  const wfsSismica = wfsData?.sismica;

  if (wfsPaesagg) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    const fonteLabel = isPiemonte
      ? "Fonte: Analisi ope legis art.142 D.Lgs 42/2004 — geoportale.piemonte.it"
      : "Fonte: Analisi ope legis art.142 D.Lgs 42/2004 — liguriavincoli.it";
    doc.text(fonteLabel, margin + 2, y);
    y += 6;

    // Vincolo lacustre (solo Piemonte)
    if (isPiemonte && wfsPaesagg.vincolo_lacustre) {
      if (y > 265) { y = newPage(doc); }
      const vl = wfsPaesagg.vincolo_lacustre;
      if (vl.presente === true) {
        doc.setFillColor(255, 240, 240); doc.rect(margin, y - 4, 170, 7, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(200, 50, 50);
        doc.text("! Vincolo Lacustre — " + (vl.lago || "Lago"), margin + 2, y);
        doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
        doc.text("Art.142 c.1 lett. b) — " + (vl.fascia_tutela || "300m dalla sponda"), 100, y, { maxWidth: 88 });
        doc.setTextColor(50, 50, 50); y += 8;
      } else if (vl.presente === false) {
        doc.setFillColor(240, 255, 245); doc.rect(margin, y - 4, 170, 7, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(39, 174, 96);
        doc.text("Vincolo lacustre: nessun lago rilevato entro 300m (Overpass API)", margin + 2, y);
        doc.setTextColor(50, 50, 50); y += 8;
      } else {
        doc.setFillColor(255, 248, 230); doc.rect(margin, y - 4, 170, 7, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150, 100, 0);
        doc.text("Vincolo lacustre: non verificabile — " + (vl.nota || ""), margin + 2, y, { maxWidth: 168 });
        doc.setTextColor(50, 50, 50); y += 8;
      }
    }

    const wfsVincoli = (wfsPaesagg.vincoli || []).filter(v => v.livello !== "NESSUN_VINCOLO_RILEVATO");
    if (wfsVincoli.length > 0) {
      wfsVincoli.forEach((v, i) => {
        if (y > 265) { y = newPage(doc); }
        if (i % 2 === 0) { doc.setFillColor(255, 245, 245); doc.rect(margin, y - 4, 170, 7, "F"); }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(200, 50, 50);
        doc.text("! " + (v.tipo || "Vincolo"), margin + 2, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const fasciaText = v.fascia_tutela ? " — " + v.fascia_tutela : "";
        doc.text((v.riferimento_normativo || "") + fasciaText, 82, y, { maxWidth: 106 });
        doc.setTextColor(50, 50, 50);
        y += 8;
      });
    } else {
      doc.setFillColor(240, 255, 245);
      doc.rect(margin, y - 4, 170, 7, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(39, 174, 96);
      doc.text("Nessun vincolo paesaggistico ope legis rilevato per questo comune", margin + 2, y);
      doc.setTextColor(50, 50, 50);
      y += 8;
    }

    if (wfsPai) {
      y += 2;
      if (y > 265) { y = newPage(doc); }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 95);
      const paiLabel = isPiemonte
        ? "PAI Frane — ARPA Piemonte (POLIGONALI + PIFF):"
        : "PAI — Rischio idrogeologico (WFS M450 Regione Liguria):";
      doc.text(paiLabel, margin + 2, y);
      y += 6;
      (wfsPai.dati || []).forEach((d, i) => {
        if (y > 265) { y = newPage(doc); }
        stripe(doc, margin, y, i % 2 === 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(50, 50, 50);
        doc.text(d.layer || "", margin + 2, y);
        doc.setFont("helvetica", "normal");
        if (!d.fonte_ok) {
          doc.setTextColor(150, 100, 0);
          doc.text("WFS non disponibile — verificare manualmente", 90, y);
        } else if (d.trovato) {
          doc.setTextColor(200, 50, 50);
          const countTxt = d.features_count ? ` — ${d.features_count} geometrie` : '';
          doc.text("Rischio rilevato" + (d.classe ? " — Classe " + d.classe : countTxt), 90, y);
        } else {
          doc.setTextColor(100, 150, 100);
          doc.text(isPiemonte ? "Nessuna frana censita ARPA Piemonte" : "Nessun rischio PAI rilevato", 90, y);
        }
        doc.setTextColor(50, 50, 50);
        y += 8;
      });
    }

    if (wfsSismica) {
      y += 2;
      if (y > 265) { y = newPage(doc); }
      stripe(doc, margin, y, true);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      doc.text("Zona sismica", margin + 2, y);
      doc.setFont("helvetica", "normal");
      doc.text("Zona " + wfsSismica.zona + " — " + wfsSismica.descrizione, 90, y, { maxWidth: 98 });
      y += 8;
    }
  } else {
    const vv = r.vincoli || {};
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 100, 0);
    const wfsHint = isPiemonte
      ? "Nota: dati da elaborazione AI — per Piemonte eseguire Analisi WFS per dati ufficiali"
      : "Nota: dati da elaborazione AI — per Liguria eseguire Analisi WFS per dati ufficiali";
    doc.text(wfsHint, margin + 2, y);
    y += 7;

    // Per Piemonte il vincolo sismico è SEMPRE presente (Zona 3 o 3S per DGR 6-887/2019)
    // Leggi zona dal campo WFS se disponibile
    const wfsSismicaZona = wfsSismica ? String(wfsSismica.zona) : '3';
    const sismicoPiemonteText = wfsSismicaZona === '3S'
      ? "Presente — Zona 3S (Alta sismicità), DGR n.6-887/2019"
      : "Presente — Zona 3 (Media sismicità), DGR n.6-887/2019";
    const sismicoVal = isPiemonte
      ? { presente: true, testo: sismicoPiemonteText }
      : { presente: vv.vincolo_sismico?.presente, testo: vv.vincolo_sismico?.presente ? "Presente — " + (vv.vincolo_sismico?.zona || "") : "Assente" };
    const vincoli = [
      ["Vincolo sismico", sismicoVal.testo, isPiemonte ? "DGR 6-887/2019" : "OPCM 3274/2003", sismicoVal.presente],
      ["Rischio idraulico", vv.vincolo_idraulico?.presente ? "Presente — " + (vv.vincolo_idraulico?.classe_rischio || "") : "Assente", "PAI - Autorità di Bacino", vv.vincolo_idraulico?.presente],
      ["Vincolo paesaggistico", vv.vincolo_paesaggistico?.presente ? "Presente — " + (vv.vincolo_paesaggistico?.tipo || "") : "Assente", "D.Lgs. 42/2004", vv.vincolo_paesaggistico?.presente],
      ["Vincolo archeologico", vv.vincolo_archeologico?.presente ? "Presente" : "Assente", "D.Lgs. 42/2004", vv.vincolo_archeologico?.presente],
    ];
    doc.setFontSize(8.5);
    vincoli.forEach(([k, v, norma, presente], i) => {
      if (y > 265) { y = newPage(doc); }
      stripe(doc, margin, y, i % 2 === 0);
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.text(k, margin + 2, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(presente ? 200 : 100, presente ? 50 : 150, presente ? 50 : 100);
      doc.text(String(v || "—"), 90, y, { maxWidth: 42 });
      doc.setTextColor(120, 120, 120);
      doc.text(norma, 135, y);
      doc.setTextColor(50, 50, 50);
      y += 8;
    });
  }

  // ── SEZ 4 — FATTIBILITÀ ───────────────────────────────────────────────────
  y += 4;
  if (y > 220) { y = newPage(doc); }
  y = sectionHeader(doc, margin, y, "4", "FATTIBILITA' INTERVENTI");

  // Header row
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, y - 4, 170, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Tipo di intervento", margin + 2, y);
  doc.text("Fattibilita'", 106, y);
  doc.text("Pratica / Nota", 138, y);
  y += 9;

  const fattRows =
    r.fattibilita_interventi?.length > 0
      ? r.fattibilita_interventi.map((fi) => [
          fi.tipo_intervento,
          fi.fattibilita === "fattibile" ? "Fattibile" : fi.fattibilita === "non_fattibile" ? "Non fattibile" : "Con autorizzazione",
          fi.note || "—",
          fi.fattibilita,
        ])
      : [
          ["Manutenzione ordinaria", "Fattibile", "Attivita' libera", "fattibile"],
          ["Manutenzione straordinaria", "Fattibile", "CILA", "fattibile"],
          ["Ristrutturazione leggera", "Con autorizzazione", "SCIA", "condizionato"],
          ["Ristrutturazione pesante", "Con autorizzazione", "Permesso di costruire", "condizionato"],
          ["Cambio destinazione d'uso", "Con autorizzazione", "Verifica NTA", "condizionato"],
          ["Nuova costruzione", "Con autorizzazione", "Permesso di costruire", "condizionato"],
        ];

  doc.setFontSize(8);
  fattRows.forEach(([tipoRaw, valore, nota, stato], i) => {
    if (y > 265) { y = newPage(doc); }
    // Row height: 9 to avoid overlap
    if (i % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(margin, y - 4, 170, 8, "F"); }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    // Truncate tipo to fit col
    const tipo = String(tipoRaw || "").length > 30 ? String(tipoRaw).slice(0, 28) + "…" : String(tipoRaw || "");
    doc.text(tipo, margin + 2, y, { maxWidth: 80 });
    doc.setFont("helvetica", "normal");
    if (stato === "fattibile" || valore === "Fattibile") doc.setTextColor(39, 174, 96);
    else if (stato === "non_fattibile" || valore === "Non fattibile") doc.setTextColor(220, 50, 50);
    else doc.setTextColor(200, 130, 0);
    doc.text(String(valore || "—"), 106, y);
    doc.setTextColor(90, 90, 90);
    const notaShort = String(nota || "").length > 24 ? String(nota).slice(0, 22) + "…" : String(nota || "");
    doc.text(notaShort, 138, y);
    doc.setTextColor(50, 50, 50);
    y += 9;
  });

  // ── SEZ 5 — PRATICHE NECESSARIE ───────────────────────────────────────────
  if (r.pratiche_necessarie?.length > 0) {
    y += 4;
    if (y > 230) { y = newPage(doc); }
    y = sectionHeader(doc, margin, y, "5", "PRATICHE EDILIZIE NECESSARIE");
    r.pratiche_necessarie.forEach((p, idx) => {
      if (y > 248) { y = newPage(doc); }
      const rowH = 24;
      if (idx % 2 === 0) { doc.setFillColor(248, 250, 255); } else { doc.setFillColor(255, 255, 255); }
      doc.rect(margin, y - 4, 170, rowH, "F");
      doc.setDrawColor(210, 220, 235);
      doc.rect(margin, y - 4, 170, rowH);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(30, 58, 95);
      const titoloStr = String(p.tipo_intervento || "—").slice(0, 55);
      doc.text(titoloStr, margin + 3, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(80, 80, 80);
      doc.text("Pratica: " + String(p.pratica_richiesta || "—").slice(0, 30), margin + 3, y + 7);
      doc.text("Ente: " + String(p.ente_competente || "—").slice(0, 30), 92, y + 7);
      doc.text("Tempi: " + String(p.tempistica_stimata || "—").slice(0, 28), margin + 3, y + 14);
      doc.text("Costi: " + String(p.costi_stimati || "—").slice(0, 28), 92, y + 14);
      doc.setTextColor(50, 50, 50);
      y += rowH + 4;
    });
  }

  // ── SEZ 6 — ACCESSO AGLI ATTI ─────────────────────────────────────────────
  if (r.accesso_atti) {
    y += 4;
    if (y > 230) { y = newPage(doc); }
    y = sectionHeader(doc, margin, y, "6", "ACCESSO AGLI ATTI");
    const attiRows = [
      ["Ufficio Catasto", r.accesso_atti.ufficio_catasto],
      ["Ufficio Urbanistica", r.accesso_atti.ufficio_urbanistica],
      ["Ufficio Edilizia", r.accesso_atti.ufficio_edilizia],
      ["Modalita' accesso", r.accesso_atti.modalita_accesso],
    ].filter(([, v]) => v);
    doc.setFontSize(8.5);
    attiRows.forEach(([k, v], i) => {
      if (y > 265) { y = newPage(doc); }
      stripe(doc, margin, y, i % 2 === 0);
      doc.setFont("helvetica", "bold"); doc.setTextColor(50, 50, 50);
      doc.text(k, margin + 2, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(v || "—"), 90, y, { maxWidth: 98 });
      y += 8;
    });
    if (r.accesso_atti.documenti_ottenibili?.length > 0) {
      y += 2;
      if (y > 265) { y = newPage(doc); }
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(30, 58, 95);
      doc.text("Documenti ottenibili:", margin + 2, y); y += 6;
      const docsLine = r.accesso_atti.documenti_ottenibili.join("  —  ");
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(50, 50, 50);
      const docLines = doc.splitTextToSize(docsLine, 166);
      docLines.slice(0, 3).forEach(line => { if (y > 270) return; doc.text(line, margin + 2, y); y += 5; });
      y += 2;
    }
  }

  // ── SEZ 7 — ANALISI FINANZIARIA ───────────────────────────────────────────
  // BUG2: usa superficie reale dall'entità (visura/catasto resolver), poi fin_data, poi default 80
  const mqRaw = query.superficie_mq || parseFloat(fd.superficie) || null;
  const mq = mqRaw ? parseFloat(mqRaw) : 80;
  const prezzoAcquisto = parseFloat(fd.prezzo_acquisto) || 0;
  const spesePerc = parseFloat(fd.spese_accessorie) || 10;
  // FIX 2: omi e score da resolvedSnapshot (calcolato all'inizio se mancante)
  const omi = resolvedSnapshot?.omi || null;
  const score = resolvedSnapshot?.score || null;
  const RISTR_COSTS = {
    ottimo:           { min: 0,   mid: 65,  max: 150  },
    buono:            { min: 200, mid: 275, max: 350  },
    da_ristrutturare: { min: 500, mid: 650, max: 800  },
    fatiscente:       { min: 900, mid: 1150, max: 1400 },
  };
  const statoKey = (fd.stato_conservativo || "buono").split(/\s/)[0].toLowerCase();
  const costs = RISTR_COSTS[statoKey] || RISTR_COSTS.buono;
  const spese = prezzoAcquisto * (spesePerc / 100);
  const ristrMin = costs.min * mq;
  const ristrMid = costs.mid * mq;
  const ristrMax = costs.max * mq;
  const totMin = prezzoAcquisto + ristrMin + spese;
  const totMid = prezzoAcquisto + ristrMid + spese;
  const totMax = prezzoAcquisto + ristrMax + spese;

  // usa valore OMI come proxy se prezzo non inserito
  const omiProxyPrezzo = prezzoAcquisto === 0 && omi ? (omi.omi_min_mq + omi.omi_max_mq) / 2 * mq : 0;
  const prezzoEffettivo = prezzoAcquisto > 0 ? prezzoAcquisto : omiProxyPrezzo;
  const usandoProxyPrezzo = prezzoAcquisto === 0 && omiProxyPrezzo > 0;

  const FIN_FINALITA = ["investimento", "sviluppo_immobiliare", "asta_giudiziaria"];
  const showFinancial = FIN_FINALITA.includes(query.finalita) || prezzoAcquisto > 0;

  if (showFinancial) {
    y += 4;
    if (y > 230) { y = newPage(doc); }
    y = sectionHeader(doc, margin, y, "7", "ANALISI FINANZIARIA E DUE DILIGENCE");

    // Avviso superficie non reale
    if (!mqRaw) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(150, 100, 0);
      doc.text("Nota: superficie non disponibile — calcoli su 80 mq di default. Inserire superficie reale per risultati precisi.", margin + 2, y, { maxWidth: 166 }); y += 6;
      doc.setTextColor(50, 50, 50);
    }
    // Avviso prezzo proxy
    if (usandoProxyPrezzo) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(150, 100, 0);
      doc.text("Avviso: prezzo d'acquisto non inserito — rendimento calcolato su valore OMI stimato (" + fmtEur(prezzoEffettivo) + ").", margin + 2, y, { maxWidth: 166 }); y += 6;
      doc.setTextColor(50, 50, 50);
    }

    if (omi) {
      y = subHeader(doc, margin, y, "Valori OMI — Osservatorio Mercato Immobiliare (stime AI — verifica su agenziaentrate.gov.it)");
      const valoreMercatoMin = omi.omi_min_mq * mq;
      const valoreMercatoMax = omi.omi_max_mq * mq;
      const valorePostRistrMin = omi.omi_post_ristr_min * mq;
      const valorePostRistrMax = omi.omi_post_ristr_max * mq;
      const omiRows = [
        ["Semestre riferimento", omi.semestre_riferimento || "—"],
        ["Fascia OMI", omi.fascia_omi || "—"],
        ["Valore mercato /mq", fmtEur(omi.omi_min_mq) + " – " + fmtEur(omi.omi_max_mq)],
        ["Valore stimato oggi (" + mq + " mq" + (mqRaw ? "" : " — stima") + ")", fmtEur(valoreMercatoMin) + " – " + fmtEur(valoreMercatoMax)],
        ["Post-ristrutturazione /mq", fmtEur(omi.omi_post_ristr_min) + " – " + fmtEur(omi.omi_post_ristr_max)],
        ["Valore post-ristr (" + mq + " mq)", fmtEur(valorePostRistrMin) + " – " + fmtEur(valorePostRistrMax)],
        ["Canone locazione /mq/mese", fmtEur(omi.canone_locazione_min) + " – " + fmtEur(omi.canone_locazione_max)],
      ];
      doc.setFontSize(8.5);
      omiRows.forEach(([k, v], i) => {
        if (y > 265) { y = newPage(doc); }
        stripe(doc, margin, y, i % 2 === 0);
        doc.setFont("helvetica", "bold"); doc.setTextColor(50, 50, 50);
        doc.text(k, margin + 2, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(v || "—"), 90, y, { maxWidth: 98 });
        y += 8;
      });
      if (omi.note_mercato) {
        y += 2;
        doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100);
        const noteLines = doc.splitTextToSize(omi.note_mercato, 166);
        noteLines.slice(0, 2).forEach(line => { if (y > 270) return; doc.text(line, margin + 2, y); y += 5; });
        y += 2;
      }
    } else {
      // Fallback: OMI non disponibile per questo comune
      doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(150, 100, 0);
      doc.text("Dati OMI non disponibili per questo comune — verifica su agenziaentrate.gov.it/omi.", margin + 2, y, { maxWidth: 166 }); y += 7;
      doc.setTextColor(50, 50, 50);
    }

    // BUG5: Stima costi ristrutturazione — sempre presente per finalità investimento
    // Costi corretti: ottimo=manutenzione, buono=upgrade, da_ristrutturare=ristr., fatiscente=integrale
    const RISTR_COSTS_PDF = {
      ottimo:           { min: 150,  mid: 250,  max: 400  },
      buono:            { min: 400,  mid: 600,  max: 900  },
      da_ristrutturare: { min: 700,  mid: 950,  max: 1200 },
      fatiscente:       { min: 900,  mid: 1150, max: 1400 },
    };
    const costsCorretti = RISTR_COSTS_PDF[statoKey] || RISTR_COSTS_PDF.buono;
    const ristrMinC = costsCorretti.min * mq;
    const ristrMidC = costsCorretti.mid * mq;
    const ristrMaxC = costsCorretti.max * mq;
    const totMinC = prezzoAcquisto + ristrMinC + spese;
    const totMidC = prezzoAcquisto + ristrMidC + spese;
    const totMaxC = prezzoAcquisto + ristrMaxC + spese;

    if (FIN_FINALITA.includes(query.finalita)) {
      y += 4;
      if (y > 240) { y = newPage(doc); }
      y = subHeader(doc, margin, y, "Stima Costi Ristrutturazione — 3 Scenari (stato: " + (fd.stato_conservativo || "buono") + ", " + mq + " mq)");

      // Table header
      if (y > 265) { y = newPage(doc); }
      doc.setFillColor(30, 58, 95); doc.rect(margin, y - 4, 170, 7, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text("Voce", margin + 2, y);
      doc.text("Base", 96, y);
      doc.text("Medio", 122, y);
      doc.text("Premium", 150, y);
      y += 9;

      const prezzoLabel = prezzoAcquisto > 0 ? fmtEur(prezzoAcquisto) : "—";
      const speseLabel = prezzoAcquisto > 0 ? fmtEur(spese) : "—";
      const ristrRows = [
        ["Costo ristr. (€/mq)", String(costsCorretti.min), String(costsCorretti.mid), String(costsCorretti.max)],
        ["Totale ristrutturazione", fmtEur(ristrMinC), fmtEur(ristrMidC), fmtEur(ristrMaxC)],
        ["Prezzo acquisto", prezzoLabel, prezzoLabel, prezzoLabel],
        ["Spese accessorie (" + spesePerc + "%)", speseLabel, speseLabel, speseLabel],
        ["INVESTIMENTO TOTALE", prezzoAcquisto > 0 ? fmtEur(totMinC) : "—", prezzoAcquisto > 0 ? fmtEur(totMidC) : "—", prezzoAcquisto > 0 ? fmtEur(totMaxC) : "—"],
      ];
      doc.setFontSize(8);
      ristrRows.forEach(([label, v1, v2, v3], i) => {
        if (y > 265) { y = newPage(doc); }
        const isBold = i === ristrRows.length - 1;
        if (isBold) { doc.setFillColor(220, 235, 255); } else if (i % 2 === 0) { doc.setFillColor(245, 247, 250); } else { doc.setFillColor(255, 255, 255); }
        doc.rect(margin, y - 4, 170, 8, "F");
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(50, 50, 50);
        doc.text(label, margin + 2, y);
        doc.setTextColor(isBold ? 39 : 50, isBold ? 174 : 50, isBold ? 96 : 50);
        doc.text(v1, 90, y, { align: "right" }); 
        doc.text(v2, 128, y, { align: "right" });
        doc.text(v3, 186, y, { align: "right" });
        y += 9;
      });
    }

    // Flipping analysis
    if (fd.destinazione_obiettivo === "flipping" && prezzoAcquisto > 0 && omi) {
      y += 4;
      if (y > 240) { y = newPage(doc); }
      y = subHeader(doc, margin, y, "Analisi Flipping — Scenario Medio");
      const valoreFlip = (omi.omi_post_ristr_max || 0) * mq;
      const margineLordo = valoreFlip - totMid;
      const tasse = margineLordo > 0 ? margineLordo * 0.26 : 0;
      const margineNetto = margineLordo - tasse;
      const roiFlip = totMid > 0 ? (margineLordo / totMid) * 100 : 0;
      const breakEvenMq = totMid > 0 && mq > 0 ? totMid / mq : 0;

      const flipRows = [
        ["Investimento totale (scenario medio)", fmtEur(totMid)],
        ["Valore post-ristrutturazione (OMI max)", fmtEur(valoreFlip)],
        ["Margine lordo", fmtEur(margineLordo)],
        ["Tassa plusvalenza (26%)", fmtEur(tasse)],
        ["MARGINE NETTO", fmtEur(margineNetto)],
        ["ROI Flip", roiFlip.toFixed(1) + "%"],
        ["Break-even (prezzo min/mq)", fmtEur(breakEvenMq) + "/mq"],
      ];
      doc.setFontSize(8.5);
      flipRows.forEach(([k, v], i) => {
        if (y > 265) { y = newPage(doc); }
        stripe(doc, margin, y, i % 2 === 0);
        doc.setFont("helvetica", i >= 4 ? "bold" : "normal");
        doc.setTextColor(50, 50, 50);
        doc.text(k, margin + 2, y);
        const isPositive = !String(v).startsWith("-");
        if (i >= 4) doc.setTextColor(isPositive ? 39 : 220, isPositive ? 174 : 50, isPositive ? 96 : 50);
        doc.text(String(v), 90, y, { maxWidth: 98 });
        doc.setTextColor(50, 50, 50);
        y += 8;
      });
    }

    // ── ROI Locazione (per finalità investimento) ──
    if (query.finalita === "investimento" && omi && mq > 0) {
      const canoneMinMese = (omi.canone_locazione_min || 0) * mq;
      const canoneMaxMese = (omi.canone_locazione_max || 0) * mq;
      const canoneMinAnno = canoneMinMese * 12;
      const canoneMaxAnno = canoneMaxMese * 12;
      const rendLordoMin = prezzoEffettivo > 0 ? (canoneMinAnno / prezzoEffettivo) * 100 : 0;
      const rendLordoMax = prezzoEffettivo > 0 ? (canoneMaxAnno / prezzoEffettivo) * 100 : 0;
      const rendNettoMin = rendLordoMin * 0.7;
      const rendNettoMax = rendLordoMax * 0.7;
      const paybackMin = canoneMaxAnno * 0.7 > 0 ? prezzoEffettivo / (canoneMaxAnno * 0.7) : 0;
      const paybackMax = canoneMinAnno * 0.7 > 0 ? prezzoEffettivo / (canoneMinAnno * 0.7) : 0;

      y += 4;
      if (y > 240) { y = newPage(doc); }
      y = subHeader(doc, margin, y, "Analisi Rendimento da Locazione");

      const roiRows = [
        ["Canone mensile stimato", fmtEur(canoneMinMese) + " – " + fmtEur(canoneMaxMese)],
        ["Canone annuo stimato", fmtEur(canoneMinAnno) + " – " + fmtEur(canoneMaxAnno)],
        ["Rendimento lordo annuo", rendLordoMin.toFixed(1) + "% – " + rendLordoMax.toFixed(1) + "%"],
        ["Rendimento netto stimato (×0.7)", rendNettoMin.toFixed(1) + "% – " + rendNettoMax.toFixed(1) + "%"],
        ["Anni per recupero investimento (payback)", paybackMin > 0 ? paybackMin.toFixed(0) + " – " + paybackMax.toFixed(0) + " anni" : "—"],
      ];
      doc.setFontSize(8.5);
      roiRows.forEach(([k, v], i) => {
        if (y > 265) { y = newPage(doc); }
        stripe(doc, margin, y, i % 2 === 0);
        doc.setFont("helvetica", i >= 2 ? "bold" : "normal");
        doc.setTextColor(50, 50, 50);
        doc.text(k, margin + 2, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(i >= 2 ? 30 : 50, i >= 2 ? 80 : 50, i >= 2 ? 180 : 50);
        doc.text(String(v), 90, y, { maxWidth: 98 });
        doc.setTextColor(50, 50, 50);
        y += 8;
      });
      y += 2;
      doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120);
      doc.text("Rendimento netto calcolato con detrazione stimata 30% (fiscalità, spese gestione, manutenzione).", margin + 2, y, { maxWidth: 166 }); y += 5;
      doc.text("Canoni basati su valori OMI — verifica su agenziaentrate.gov.it/omi.", margin + 2, y, { maxWidth: 166 }); y += 7;
      doc.setTextColor(50, 50, 50);
    }

    // Scorecard
    if (score) {
      y += 4;
      if (y > 240) { y = newPage(doc); }
      y = subHeader(doc, margin, y, "Scorecard Investimento");
      const s = Math.round(score.score);
      const scoreColor = s >= 7 ? [39, 174, 96] : s >= 5 ? [200, 130, 0] : [220, 50, 50];
      const scoreLabel = s >= 7 ? "Interessante" : s >= 5 ? "Valutare con cura" : "Rischio elevato";
      doc.setFillColor(...scoreColor);
      doc.circle(margin + 8, y + 4, 7, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text(String(s), margin + 8, y + 6, { align: "center" });
      doc.setTextColor(50, 50, 50); doc.setFontSize(9);
      doc.text(s + "/10 — " + scoreLabel, margin + 20, y + 5);
      y += 14;

      if (score.punti_forza?.length > 0) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(39, 174, 96);
        doc.text("Punti di forza:", margin + 2, y); y += 5;
        score.punti_forza.slice(0, 3).forEach(p => {
          if (y > 265) { y = newPage(doc); }
          doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
          doc.text("• " + String(p || ""), margin + 4, y, { maxWidth: 164 }); y += 5;
        });
        y += 2;
      }
      if (score.rischi?.length > 0) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(200, 50, 50);
        doc.text("Rischi:", margin + 2, y); y += 5;
        score.rischi.slice(0, 3).forEach(r2 => {
          if (y > 265) { y = newPage(doc); }
          doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
          doc.text("• " + String(r2 || ""), margin + 4, y, { maxWidth: 164 }); y += 5;
        });
      }
    }
  }

  // ── SEZ 8 — MAPPA PARTICELLA CATASTALE ──────────────────────────────────
  {
    const catastoData2 = r.catasto_data || {};
    const coordLat2 = catastoData2.lat || query.centroid_lat;
    const coordLon2 = catastoData2.lon || query.centroid_lng;
    y += 4;
    if (y > 230) { y = newPage(doc); }
    y = sectionHeader(doc, margin, y, "8", "GEOREFERENZIAZIONE CATASTALE");

    if (coordLat2 && coordLon2) {
      const mapRows = [
        ["Coordinate WGS84 (lat, lon)", `${Number(coordLat2).toFixed(6)}, ${Number(coordLon2).toFixed(6)}`],
        ...(catastoData2.inspire_id ? [["INSPIRE ID", catastoData2.inspire_id]] : []),
        ["Fonte coordinate", catastoData2.fonte || "OnData CC BY 4.0"],
        // BUG4: non mostrare "NULL" come sezione catastale
        ...(query.sezione_catastale && query.sezione_catastale !== "NULL" && query.sezione_catastale !== "null"
          ? [["Sezione catastale", query.sezione_catastale]]
          : []),
      ];
      doc.setFontSize(8.5);
      mapRows.forEach(([k, v], i) => {
        if (y > 265) { y = newPage(doc); }
        stripe(doc, margin, y, i % 2 === 0);
        doc.setFont("helvetica", "bold"); doc.setTextColor(50, 50, 50);
        doc.text(k, margin + 2, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(v || "—"), 90, y, { maxWidth: 98 });
        y += 8;
      });
      // Link geoportali
      y += 2;
      if (y > 258) { y = newPage(doc); }
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(30, 58, 95);
      doc.text("Link mappa:", margin + 2, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(30, 80, 180);
      doc.text("Geoportale AdE: https://geoportale.cartografia.agenziaentrate.gov.it/age-inspire/srv/ita/catalog.search#/map", margin + 4, y, { maxWidth: 164 }); y += 6;
      doc.text(`OpenStreetMap: https://www.openstreetmap.org/?mlat=${Number(coordLat2).toFixed(6)}&mlon=${Number(coordLon2).toFixed(6)}&zoom=18`, margin + 4, y, { maxWidth: 164 }); y += 6;
      if (query.geometry_geojson || catastoData2.geojson_polygon) {
        doc.setTextColor(80, 80, 80);
        doc.text("Poligono catastale vettoriale disponibile nel dashboard: urbicheck.it/report/" + (query.id || ""), margin + 4, y, { maxWidth: 164 });
      } else {
        doc.setTextColor(80, 80, 80);
        doc.text("Poligono catastale: urbicheck.it/report/" + (query.id || ""), margin + 4, y, { maxWidth: 164 });
      }
      doc.setTextColor(50, 50, 50);
      y += 7;
    } else {
      doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(150, 100, 0);
      doc.text("Coordinate non disponibili — eseguire la risoluzione catastale dalla scheda online.", margin + 2, y); y += 7;
    }
  }

  // ── SEZ — VALUTAZIONE SINTETICA COMPLETA ──────────────────────────────────
  if (r.valutazione_sintetica) {
    y += 4;
    if (y > 230) { y = newPage(doc); }
    y = sectionHeader(doc, margin, y, "9", "VALUTAZIONE SINTETICA");

    const vs = r.valutazione_sintetica;
    if (vs.livello_complessita) {
      const compColor = vs.livello_complessita === "Basso" ? [39, 174, 96] : vs.livello_complessita === "Alto" ? [220, 50, 50] : [200, 130, 0];
      doc.setFillColor(...compColor);
      doc.roundedRect(margin, y, 60, 9, 2, 2, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.text("Complessita': " + vs.livello_complessita, margin + 3, y + 6);
      y += 14;
    }

    // Render each sub-section separately (full, no truncation)
    const sinteticaSections = [
      { title: "Criticita' principali", items: vs.criticita_principali, color: [200, 80, 0] },
      { title: "Opportunita'", items: vs.opportunita, color: [39, 150, 80] },
      { title: "Raccomandazioni", items: vs.raccomandazioni, color: [30, 80, 180] },
    ];
    sinteticaSections.forEach(sec => {
      if (!sec.items?.length) return;
      if (y > 260) { y = newPage(doc); }
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...sec.color);
      doc.text(sec.title + ":", margin + 2, y); y += 6;
      sec.items.forEach((item, i) => {
        if (y > 268) { y = newPage(doc); }
        if (i % 2 === 0) { doc.setFillColor(248, 250, 255); doc.rect(margin, y - 4, 170, 7, "F"); }
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize("• " + String(item), 164);
        lines.forEach(line => {
          if (y > 268) { y = newPage(doc); }
          doc.text(line, margin + 2, y); y += 5;
        });
      });
      y += 4;
    });
  }

  // ── SEZ — VINCOLI INFRASTRUTTURALI WFS ─────────────────────────────────
  {
    const wfsFerr = wfsData?.vincolo_ferroviario;
    const wfsAcqua = wfsData?.vincolo_corsi_acqua;
    y += 4;
    if (y > 230) { y = newPage(doc); }
    y = sectionHeader(doc, margin, y, "10", isPiemonte ? "VINCOLI INFRASTRUTTURALI (PIEMONTE)" : "VINCOLI INFRASTRUTTURALI (WFS LIGURIA)");

    y = subHeader(doc, margin, y, "Vincolo Ferroviario — DPR 753/1980 (fascia 30m asse binario)");
    if (!wfsFerr) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(150, 100, 0);
      doc.text(isPiemonte ? "Dati non disponibili — eseguire analisi WFS Piemonte" : "Dati non disponibili — eseguire analisi WFS Liguria", margin + 2, y); y += 7;
    } else if (!wfsFerr.fonte_ok) {
      doc.setFillColor(255, 248, 230); doc.rect(margin, y - 4, 170, 7, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150, 100, 0);
      doc.text("⚠ Dato non disponibile dalla fonte WFS — Si consiglia verifica manuale presso RFI", margin + 2, y);
      doc.setTextColor(50, 50, 50); y += 8;
    } else {
      const ferrTrovati = (wfsFerr.dati || []).filter(d => d.trovato);
      if (ferrTrovati.length === 0) {
        doc.setFillColor(240, 255, 245); doc.rect(margin, y - 4, 170, 7, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(39, 174, 96);
        doc.text("Nessuna ferrovia rilevata entro 250m (fonte_ok=true)", margin + 2, y);
        doc.setTextColor(50, 50, 50); y += 8;
      } else {
        ferrTrovati.forEach((f, i) => {
          if (y > 265) { y = newPage(doc); }
          stripe(doc, margin, y, i % 2 === 0);
          doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(180, 100, 0);
          doc.text("! " + (f.nome || "Ferrovia"), margin + 2, y);
          doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
          doc.text(f.fascia_rispetto || "30m dall'asse binario", 82, y, { maxWidth: 106 });
          doc.setTextColor(50, 50, 50); y += 8;
        });
      }
    }

    y += 3;
    if (y > 265) { y = newPage(doc); }
    y = subHeader(doc, margin, y, "Vincolo Corsi d'Acqua — Art.142 c.1 lett. c) D.Lgs 42/2004 (fascia 150m)");
    if (!wfsAcqua) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(150, 100, 0);
      doc.text(isPiemonte ? "Dati non disponibili — eseguire analisi WFS Piemonte" : "Dati non disponibili — eseguire analisi WFS Liguria", margin + 2, y); y += 7;
    } else if (!wfsAcqua.fonte_ok) {
      doc.setFillColor(255, 248, 230); doc.rect(margin, y - 4, 170, 7, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150, 100, 0);
      const acquaEnteLabel = isPiemonte ? "ARPA Piemonte" : "Catasto Acque Regione Liguria";
      doc.text(`\u26a0 Dato non disponibile dalla fonte WFS — Si consiglia verifica manuale presso ${acquaEnteLabel}`, margin + 2, y, { maxWidth: 166 });
      doc.setTextColor(50, 50, 50); y += 8;
    } else {
      const acquaTrovati = (wfsAcqua.dati || []).filter(d => d.trovato);
      if (acquaTrovati.length === 0) {
        doc.setFillColor(240, 255, 245); doc.rect(margin, y - 4, 170, 7, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(39, 174, 96);
        doc.text("Nessun corso d'acqua rilevato entro 250m (fonte_ok=true)", margin + 2, y);
        doc.setTextColor(50, 50, 50); y += 8;
      } else {
        acquaTrovati.forEach((w, i) => {
          if (y > 265) { y = newPage(doc); }
          stripe(doc, margin, y, i % 2 === 0);
          doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(30, 100, 180);
          const livTag = w.livello === "POSSIBILE_VINCOLO_ALTO" ? " [Alta prob.]" : "";
          doc.text("! " + (w.nome || "Corso d'acqua") + livTag, margin + 2, y);
          doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
          doc.text("150m dal ciglio di sponda — Art.142 D.Lgs 42/2004", 82, y, { maxWidth: 106 });
          doc.setTextColor(50, 50, 50); y += 8;
        });
      }
    }

    // BUG6: Classificazione sismica — da WFS se disponibile, altrimenti default Piemonte
    y += 3;
    if (y > 265) { y = newPage(doc); }
    y = subHeader(doc, margin, y, "Classificazione Sismica (Ordinanza PCM 3274/2003 — NTC 2018)");
    if (wfsSismica) {
      stripe(doc, margin, y, true);
      doc.setFillColor(240, 248, 255); doc.rect(margin, y - 4, 170, 8, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(50, 50, 50);
      doc.text("Zona sismica", margin + 2, y);
      doc.setFont("helvetica", "normal");
      const sismicaText = "Zona " + wfsSismica.zona + (wfsSismica.descrizione ? " — " + wfsSismica.descrizione : "");
      doc.text(sismicaText, 90, y, { maxWidth: 98 });
      y += 8;
      if (wfsSismica.normativa || wfsSismica.nota) {
        doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100);
        doc.text(wfsSismica.normativa || wfsSismica.nota || "", margin + 2, y, { maxWidth: 166 }); y += 5;
        doc.setTextColor(50, 50, 50);
      }
    } else if (isPiemonte) {
      stripe(doc, margin, y, true);
      doc.setFillColor(240, 248, 255); doc.rect(margin, y - 4, 170, 8, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(50, 50, 50);
      doc.text("Zona sismica", margin + 2, y);
      doc.setFont("helvetica", "normal");
      doc.text("Zona 3 — Media sismicita' — DGR n.6-887/2019 — NTC 2018", 90, y, { maxWidth: 98 });
      y += 8;
    } else {
      doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(150, 100, 0);
      doc.text("Classificazione sismica: eseguire analisi WFS per dato ufficiale.", margin + 2, y); y += 7;
      doc.setTextColor(50, 50, 50);
    }
  }

  // ── SEZ MAPPA CATASTALE STATICA ──────────────────────────────────────────
  {
    const mapUrlToUse = resolvedMapUrl;
    y += 6;
    if (y > 200) { y = newPage(doc); }
    y = sectionHeader(doc, margin, y, "11", "MAPPA CATASTALE DELLA PARTICELLA");

    if (mapUrlToUse) {
      // Tenta di caricare l'immagine
      const imgData = await fetchImageAsDataUrl(mapUrlToUse);
      if (imgData) {
        // L'immagine occupa tutta la larghezza della pagina (170mm), altezza proporzionale 800×420 → ~89mm
        const imgW = 170;
        const imgH = Math.round(imgW * (420 / 800));
        if (y + imgH > 275) { y = newPage(doc); }
        doc.addImage(imgData, "PNG", margin, y, imgW, imgH);
        y += imgH + 4;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `${query.comune} · Foglio ${query.foglio} · Particella ${query.particella}${query.subalterno ? ` · Sub. ${query.subalterno}` : ""} · Fonte: Catasto AdE / INSPIRE · © OpenStreetMap contributors`,
          margin + 2, y, { maxWidth: 166 }
        );
        y += 6;
        doc.setTextColor(50, 50, 50);
      } else {
        // Fallback testo se immagine non caricabile
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("Mappa non disponibile nel PDF — visualizzabile online su urbicheck.it/report/" + (query.id || ""), margin + 2, y, { maxWidth: 166 });
        y += 8;
        if (query.centroid_lat && query.centroid_lng) {
          doc.setTextColor(30, 80, 180);
          doc.setFontSize(7.5);
          doc.text(`https://www.openstreetmap.org/?mlat=${Number(query.centroid_lat).toFixed(6)}&mlon=${Number(query.centroid_lng).toFixed(6)}&zoom=18`, margin + 2, y, { maxWidth: 166 });
          y += 7;
        }
        doc.setTextColor(50, 50, 50);
      }
    } else if (query.centroid_lat && query.centroid_lng) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("Immagine mappa non ancora generata — visualizzabile online:", margin + 2, y); y += 6;
      doc.setTextColor(30, 80, 180);
      doc.setFontSize(7.5);
      doc.text(`https://www.openstreetmap.org/?mlat=${Number(query.centroid_lat).toFixed(6)}&mlon=${Number(query.centroid_lng).toFixed(6)}&zoom=18`, margin + 2, y, { maxWidth: 166 });
      y += 8;
      doc.setTextColor(50, 50, 50);
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(150, 100, 0);
      doc.text("Coordinate non disponibili — georeferenziare il record per generare la mappa.", margin + 2, y); y += 7;
      doc.setTextColor(50, 50, 50);
    }
  }

  // ── SEZ FONTI DATI ───────────────────────────────────────────────────────
  {
    y += 4;
    if (y > 230) { y = newPage(doc); }
    y = sectionHeader(doc, margin, y, "12", "FONTI DATI UFFICIALI");


    doc.setFillColor(235, 244, 255);
    doc.rect(margin, y - 4, 170, 7, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("Tipo di dato", margin + 2, y);
    doc.text("Fonte", 75, y);
    doc.text("Rif. normativo", 152, y);
    y += 8;

    const fontiList = [
      ["Dati catastali", "Agenzia delle Entrate — Cartografia catastale", "D.Lgs. 347/1990"],
      ["Zonizzazione PRG/PUC", "Analisi AI orientativa (verifica CU al Comune)", "DPR 380/2001"],
      ["Zona sismica", isPiemonte ? (wfsSismica ? "DGR 6-887/2019 + NTC 2018 — ARPA Piemonte" : "DGR n.6-887/2019 Piemonte") : (wfsSismica ? "WFS Regione Liguria + OPCM 3274/2003" : "INGV — Protezione Civile"), isPiemonte ? "DGR 6-887/2019" : "OPCM 3274/2003"],
      ["Rischio idrogeologico", isPiemonte ? "WFS ARPA Piemonte — POLIGONALI + PIFF" : (query.regione === "Liguria" ? "WFS M450 — PAI Autorita' di Bacino Liguria" : "PAI Autorita' di Bacino"), "D.Lgs. 152/2006"],
      ["Vincolo paesaggistico", isPiemonte ? "Analisi logica ope legis + Overpass API (laghi)" : (query.regione === "Liguria" ? "Analisi logica ope legis (COMUNI_COSTIERI / D.Lgs. 42/2004 art.142)" : "MiC — SITAP"), "D.Lgs. 42/2004 art.142"],
      ["Normativa edilizia", "NTA del PRG/PUC Comune di " + query.comune, "DPR 380/2001"],
      ["Analisi finanziaria", "Stime AI su base dati OMI — verificare su agenziaentrate.gov.it/omi", "OMI AdE"],
    ];

    doc.setFont("helvetica", "normal");
    fontiList.forEach(([k, v, n], i) => {
      if (y > 265) { y = newPage(doc); }
      if (i % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(margin, y - 4, 170, 7, "F"); }
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.text(k, margin + 2, y, { maxWidth: 50 });
      doc.setFont("helvetica", "normal");
      doc.text(v, 75, y, { maxWidth: 72 });
      doc.text(n, 152, y, { maxWidth: 36 });
      y += 8;
    });
  }

  // ── SEZ ASTA (pagina separata) ────────────────────────────────────────────
  if (isAsta) {
    doc.addPage();
    let ay = 0;
    doc.setFillColor(180, 30, 30);
    doc.rect(0, 0, 210, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("SEZIONE SPECIALE — ACQUISTO ALL'ASTA GIUDIZIARIA", 105, 12, { align: "center" });
    ay = 28;

    doc.setFillColor(255, 245, 230);
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.8);
    doc.rect(margin, ay, 170, 14, "FD");
    doc.setTextColor(120, 60, 0);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("Verificare sempre la conformita' urbanistica prima dell'offerta. CDU obbligatorio per aste ex art. 30 DPR 380/2001.", 105, ay + 6, { align: "center", maxWidth: 162 });
    ay += 22;

    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 58, 95);
    doc.text("Checklist Pre-Offerta", margin, ay); ay += 4;
    doc.setDrawColor(30, 58, 95); doc.line(margin, ay, 190, ay); ay += 6;

    const checklist = [
      ["CDU allegato alla perizia", "Obbligatorio ex art. 30 DPR 380/2001"],
      ["Conformita' urbanistica", "Verifica titolo edilizio originario vs stato attuale"],
      ["Difformita' edilizie", "Planimetria catastale vs stato di fatto"],
      ["Oneri urbanizzazione pendenti", "Verifica convenzioni urbanistiche attive"],
      ["Sanatoria possibile", "DPR 380/2001 art. 36 — abusi sanabili?"],
      ["Richiesta accesso atti UTC", "Ex art. 22 L.241/90, almeno 30 gg prima dell'asta"],
    ];
    doc.setFontSize(8.5);
    checklist.forEach(([k, v], i) => {
      if (i % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(margin, ay - 4, 170, 7, "F"); }
      doc.setTextColor(50, 50, 50); doc.setFont("helvetica", "bold");
      doc.text(k, margin + 2, ay);
      doc.setFont("helvetica", "normal");
      doc.text(v, 90, ay, { maxWidth: 96 });
      ay += 8;
    });

    ay += 6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 58, 95);
    doc.text("Testo Precompilato — Richiesta CDU (art. 30 DPR 380/2001)", margin, ay); ay += 4;
    doc.setDrawColor(30, 58, 95); doc.line(margin, ay, 190, ay); ay += 6;

    const cduLines = [
      "Spett.le Comune di " + (query.comune || "__________"),
      "Ufficio Tecnico Comunale — Sportello Urbanistica",
      "",
      "OGGETTO: Richiesta Certificato di Destinazione Urbanistica ai sensi dell'art. 30 del DPR 380/2001",
      "",
      "Il/La sottoscritto/a, richiedente ai sensi dell'art. 22 della L. 241/1990, chiede il rilascio",
      "del Certificato di Destinazione Urbanistica per l'immobile sito nel Comune di " + (query.comune || "__________") + ",",
      "Foglio " + (query.foglio || "__") + ", Particella " + (query.particella || "__") + (query.subalterno ? ", Subalterno " + query.subalterno : "") + ".",
      "",
      "Si allegano: copia documento d'identita', visura catastale, marca da bollo EUR 16,00.",
      "",
      (query.comune || "__________") + ", " + new Date().toLocaleDateString("it-IT"),
      "Firma: __________________________",
    ];
    doc.setFontSize(7.5); doc.setTextColor(50, 50, 50); doc.setFont("helvetica", "normal");
    for (const line of cduLines) {
      if (ay > 270) break;
      if (line === "") { ay += 3; continue; }
      doc.text(line, margin, ay); ay += 5;
    }
  }

  // ── FOOTER SU TUTTE LE PAGINE ─────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 285, 210, 12, "F");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.text("URBICHECK — urbicheck.it | Scheda N. " + schNum, margin, 291);
    doc.text("Pag. " + i + "/" + pageCount, 105, 291, { align: "center" });
    doc.text("Documento generato il " + new Date().toLocaleDateString("it-IT"), 190, 291, { align: "right" });
    doc.setFontSize(6);
    doc.text("Documento a valore informativo. Per atti notarili e pratiche edilizie e' necessaria verifica tecnica professionale.", 105, 295, { align: "center" });
  }

  return { doc, reportNum: schNum };
}