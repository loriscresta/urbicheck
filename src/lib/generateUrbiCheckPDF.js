/**
 * URBICHECK — Professional PDF Generator
 * Uses jsPDF loaded dynamically from CDN
 */

const NAVY = [30, 58, 95];
const WHITE = [255, 255, 255];
const LIGHT_GRAY = [245, 246, 248];
const MID_GRAY = [180, 185, 195];
const DARK_GRAY = [60, 70, 85];
const GREEN = [39, 174, 96];
const YELLOW = [243, 156, 18];
const RED = [231, 76, 60];
const AMBER = [217, 119, 6];

const FINALITA_LABELS = {
  acquisto_privato: "Acquisto privato",
  investimento: "Investimento",
  sviluppo_immobiliare: "Sviluppo immobiliare",
  asta_giudiziaria: "Asta giudiziaria",
  due_diligence: "Due diligence",
  valutazione_professionale: "Valutazione professionale",
};

function generateReportNum() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `URB-${y}${m}${d}-${rand}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

async function loadJsPDF() {
  if (window.jspdf) return window.jspdf.jsPDF;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function addWatermark(doc, pageWidth, pageHeight) {
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.06 }));
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(60);
  doc.setFont("helvetica", "bold");
  const cx = pageWidth / 2;
  const cy = pageHeight / 2;
  doc.text("URBICHECK", cx, cy, { angle: 45, align: "center" });
  doc.restoreGraphicsState();
}

function addFooter(doc, pageNum, totalPages, reportNum, pageWidth, pageHeight) {
  const footerY = pageHeight - 12;
  doc.setDrawColor(...MID_GRAY);
  doc.setLineWidth(0.3);
  doc.line(20, footerY - 4, pageWidth - 20, footerY - 4);

  doc.setFontSize(7);
  doc.setTextColor(...MID_GRAY);
  doc.setFont("helvetica", "normal");
  doc.text(`Generato da URBICHECK — urbicheck.it | Scheda N. ${reportNum}`, 20, footerY);
  doc.text(`Pagina ${pageNum} di ${totalPages}`, pageWidth / 2, footerY, { align: "center" });
  doc.text(`Documento generato il ${new Date().toLocaleDateString("it-IT")} — Dati da fonti GIS ufficiali`, pageWidth - 20, footerY, { align: "right" });

  // Disclaimer
  const disclaimerY = footerY + 4;
  doc.setFontSize(5.5);
  doc.text(
    "Questo documento ha valore informativo. Per atti notarili, pratiche edilizie e procedimenti legali è necessaria verifica tecnica professionale. URBICHECK non sostituisce il parere di geometra, architetto o tecnico abilitato.",
    pageWidth / 2, disclaimerY, { align: "center", maxWidth: pageWidth - 40 }
  );
}

function addHeader(doc, reportNum, createdDate, pageWidth) {
  const headerH = 28;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, headerH, "F");

  // Left: URBICHECK
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("URBICHECK", 20, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Sistema di Analisi Urbanistica e Catastale", 20, 17);

  // Right: numero + data + sito
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`SCHEDA N. ${reportNum}`, pageWidth - 20, 9, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Generata il ${formatDate(createdDate)}`, pageWidth - 20, 14, { align: "right" });
  doc.text("urbicheck.it", pageWidth - 20, 19, { align: "right" });

  return headerH + 6; // next Y
}

function sectionTitle(doc, title, y, pageWidth) {
  doc.setFillColor(...NAVY);
  doc.rect(20, y, pageWidth - 40, 7, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(title.toUpperCase(), 24, y + 4.8);
  return y + 10;
}

function twoColTable(doc, rows, y, pageWidth) {
  const colW = (pageWidth - 40) / 2;
  const rowH = 6.5;
  doc.setFontSize(8);
  let even = false;
  for (const [label, value] of rows) {
    if (even) {
      doc.setFillColor(...LIGHT_GRAY);
      doc.rect(20, y, pageWidth - 40, rowH, "F");
    }
    doc.setTextColor(...DARK_GRAY);
    doc.setFont("helvetica", "bold");
    doc.text(label, 22, y + 4.4);
    doc.setFont("helvetica", "normal");
    doc.text(String(value || "—"), 22 + colW, y + 4.4);
    even = !even;
    y += rowH;
  }
  return y + 2;
}

function threeColTable(doc, headers, rows, y, pageWidth, colWidths) {
  const totalW = pageWidth - 40;
  const cw = colWidths || [totalW * 0.35, totalW * 0.45, totalW * 0.2];
  const rowH = 7;

  // Header row
  doc.setFillColor(...NAVY);
  doc.rect(20, y, totalW, rowH, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  let x = 22;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x, y + 4.8);
    x += cw[i];
  }
  y += rowH;

  doc.setFontSize(7.5);
  let even = false;
  for (const row of rows) {
    if (even) {
      doc.setFillColor(...LIGHT_GRAY);
      doc.rect(20, y, totalW, rowH, "F");
    }
    doc.setTextColor(...DARK_GRAY);
    x = 22;
    for (let i = 0; i < row.length; i++) {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      const cell = String(row[i] || "—");
      doc.text(cell, x, y + 4.8, { maxWidth: cw[i] - 2 });
      x += cw[i];
    }
    even = !even;
    y += rowH;
  }
  return y + 3;
}

function zonizzazioneBox(doc, colore, zona_codice, destinazione, descrizione, y, pageWidth) {
  const colors = {
    verde: GREEN, giallo: YELLOW, rosso: RED,
  };
  const c = colors[colore?.toLowerCase()] || YELLOW;
  const boxH = 22;
  doc.setFillColor(...c);
  doc.setGlobalAlpha(0.12);
  doc.rect(20, y, pageWidth - 40, boxH, "F");
  doc.setGlobalAlpha(1);
  doc.setDrawColor(...c);
  doc.setLineWidth(1.5);
  doc.rect(20, y, pageWidth - 40, boxH, "S");
  doc.setLineWidth(0.3);

  // Colored dot
  doc.setFillColor(...c);
  doc.circle(26, y + 7, 3, "F");

  doc.setTextColor(...c);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`ZONA: ${zona_codice || "—"}`, 32, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK_GRAY);
  if (destinazione) doc.text(destinazione, 32, y + 13);
  if (descrizione) {
    doc.setFontSize(7);
    doc.text(descrizione, 22, y + 18.5, { maxWidth: pageWidth - 44 });
  }
  return y + boxH + 4;
}

function getFontisTable(query, r) {
  const regione = query.regione || "";
  const comune = query.comune || "—";
  let zonazFonte = `Comune di ${comune} — PRG vigente + elaborazione AI`;
  let idraFonte = "Autorità di Bacino distrettuale — PAI vigente";

  if (regione === "Liguria") {
    zonazFonte = "Regione Liguria — GeoServer WFS Layer M2427 (PUC vigente)";
    idraFonte = "Regione Liguria — WFS Layer M2423";
  } else if (regione === "Piemonte") {
    zonazFonte = "CSI Piemonte — WFS Catasto geoservices.csi.it";
  }

  return [
    ["Dati catastali (foglio/particella/superficie)", "Agenzia delle Entrate — Cartografia catastale nazionale", "Aggiornamento continuo"],
    ["Zonizzazione PRG/PUC", zonazFonte, "Vigente"],
    ["Zona sismica", "Protezione Civile Nazionale — Mappa pericolosità sismica INGV", "OPCM 3274/2003"],
    ["Rischio idraulico/frana", idraFonte, "PAI vigente"],
    ["Vincolo paesaggistico", "MIBACT — Sistema Informativo Territoriale SITAP", "D.Lgs. 42/2004"],
    ["Normativa edilizia", `NTA del PRG/PUC Comune di ${comune}`, "Aggiornamento vigente"],
  ];
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────

export async function generatePDF(query, credits) {
  const jsPDF = await loadJsPDF();
  const r = query.report_data || {};
  const isAsta = query.finalita === "asta_giudiziaria";

  const reportNum = generateReportNum();
  const pageWidth = 210;
  const pageHeight = 297;
  const bottomMargin = 24;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  let page = 1;
  // We'll track pages to add footer/watermark at the end
  const pageStarts = [];

  // ── PAGE 1 ──────────────────────────────────────────────────────────────
  pageStarts.push(1);
  let y = addHeader(doc, reportNum, query.created_date, pageWidth);

  addWatermark(doc, pageWidth, pageHeight);

  // SEZIONE 1 — DATI IDENTIFICATIVI
  y = sectionTitle(doc, "1 — Dati Identificativi Immobile", y, pageWidth);
  const identRows = [
    ["Regione", query.regione],
    ["Provincia", query.provincia || "—"],
    ["Comune", query.comune],
    ["Foglio catastale", query.foglio],
    ["Particella", query.particella],
    ["Subalterno", query.subalterno || "—"],
    ["Categoria catastale", r.dati_catastali?.categoria],
    ["Consistenza / Superficie stimata", r.dati_catastali?.consistenza],
    ["Finalità analisi", FINALITA_LABELS[query.finalita] || query.finalita],
  ];
  y = twoColTable(doc, identRows, y, pageWidth);

  // SEZIONE 2 — ZONIZZAZIONE
  y += 4;
  y = sectionTitle(doc, "2 — Zonizzazione Urbanistica", y, pageWidth);
  if (r.zonizzazione) {
    y = zonizzazioneBox(
      doc,
      r.zonizzazione.colore,
      r.zonizzazione.zona_codice,
      r.zonizzazione.destinazione_prevalente,
      r.zonizzazione.descrizione,
      y, pageWidth
    );
  }

  // Indici edilizi
  if (r.indici_edilizi) {
    const ie = r.indici_edilizi;
    const indiciRows = [
      ["Indice di Fabbricabilità (IF)", ie.if_mc_mq || "—", "m³/m²"],
      ["Rapporto di Copertura (RC)", ie.rc_percentuale || "—", "—"],
      ["Altezza massima (H max)", ie.h_max || "—", "m"],
      ["Distanza dai confini", ie.distanza_confini || "—", "m"],
      ["Distanza dalla strada", ie.distanza_strada || "—", "m"],
      ["Distanza tra fabbricati", ie.distanza_fabbricati || "—", "m"],
    ];
    y = threeColTable(doc, ["Parametro", "Valore", "Unità"], indiciRows, y, pageWidth);
  }

  // SEZIONE 3 — VINCOLI
  y += 2;
  // Check if we need a new page
  if (y > pageHeight - bottomMargin - 60) {
    addFooter(doc, page, 3 + (isAsta ? 1 : 0), reportNum, pageWidth, pageHeight);
    doc.addPage();
    page++;
    pageStarts.push(page);
    addWatermark(doc, pageWidth, pageHeight);
    y = 15;
  }

  y = sectionTitle(doc, "3 — Vincoli Attivi", y, pageWidth);
  const v = r.vincoli || {};
  const vincoliRows = [
    [
      "Vincolo sismico",
      v.vincolo_sismico?.presente ? `✓ Presente — ${v.vincolo_sismico?.zona || ""}` : "— Assente",
      "OPCM 3274/2003 + DGR regionale",
    ],
    [
      "Rischio idraulico",
      v.vincolo_idraulico?.presente ? `✓ Presente — ${v.vincolo_idraulico?.classe_rischio || ""}` : "— Assente",
      "PAI - Piano Assetto Idrogeologico",
    ],
    [
      "Rischio frana",
      "— Vedere PAI locale",
      "PAI - Autorità di Bacino",
    ],
    [
      "Vincolo paesaggistico",
      v.vincolo_paesaggistico?.presente ? `✓ Presente — ${v.vincolo_paesaggistico?.tipo || ""}` : "— Assente",
      "D.Lgs. 42/2004 art. 142",
    ],
    [
      "Vincolo idrogeologico",
      "— Vedere R.D. 3267/1923",
      "R.D. 3267/1923",
    ],
    [
      "Vincolo archeologico",
      v.vincolo_archeologico?.presente ? "✓ Presente" : "— Assente",
      "D.Lgs. 42/2004",
    ],
    [
      "Area protetta / Rete Natura 2000",
      "— Verificare locale",
      "L. 394/1991",
    ],
    [
      "Fascia rispetto stradale",
      "— Verificare planimetria",
      "D.Lgs. 285/1992",
    ],
    [
      "Fascia rispetto cimiteriale",
      "— Verificare locale",
      "T.U. 1265/1934 art. 338",
    ],
  ];

  // Add altri vincoli if present
  if (v.altri_vincoli?.length) {
    for (const av of v.altri_vincoli) {
      vincoliRows.push([av.nome || "Altro vincolo", av.presente ? "✓ Presente" : "— Assente", av.dettagli || "—"]);
    }
  }

  y = threeColTable(doc, ["Tipo vincolo", "Presenza / Classe", "Norma di riferimento"], vincoliRows, y, pageWidth);

  addFooter(doc, page, 2 + (isAsta ? 1 : 0), reportNum, pageWidth, pageHeight);

  // ── PAGE 2 ──────────────────────────────────────────────────────────────
  doc.addPage();
  page++;
  addWatermark(doc, pageWidth, pageHeight);
  y = 15;

  // SEZIONE 4 — FATTIBILITÀ INTERVENTI
  y = sectionTitle(doc, "4 — Fattibilità Interventi", y, pageWidth);

  const fattibilita = r.fattibilita_interventi || [];
  const defaultFattibilita = [
    ["Manutenzione ordinaria", "Libera (attività libera)", "CILA non necessaria"],
    ["Manutenzione straordinaria", "Autorizzata", "CILA"],
    ["Restauro e risanamento", "Autorizzata", "SCIA"],
    ["Ristrutturazione leggera", "Autorizzata", "SCIA"],
    ["Ristrutturazione pesante", "Autorizzata", "Permesso di costruire"],
    ["Cambio destinazione d'uso", "Verificare NTA", "Permesso di costruire"],
    ["Ampliamento volumetrico", "Condizionata", "Se IF residuo disponibile"],
    ["Demolizione e ricostruzione", "Vincolata", "Verifica PRG/NTA"],
    ["Nuova costruzione", "Verificare", "Permesso di costruire"],
  ];

  const fattRows = fattibilita.length > 0
    ? fattibilita.map(fi => [
        fi.tipo_intervento,
        fi.fattibilita === "fattibile" ? "✓ Fattibile" : fi.fattibilita === "non_fattibile" ? "✗ Non fattibile" : "⚠ Con autorizzazione",
        fi.note || "—",
      ])
    : defaultFattibilita;

  y = threeColTable(doc, ["Tipo di intervento", "Fattibilità", "Nota / Pratica"], fattRows, y, pageWidth);

  // SEZIONE 5 — FONTI DATI
  y += 4;
  if (y > pageHeight - bottomMargin - 55) {
    addFooter(doc, page, 2 + (isAsta ? 1 : 0), reportNum, pageWidth, pageHeight);
    doc.addPage();
    page++;
    addWatermark(doc, pageWidth, pageHeight);
    y = 15;
  }

  y = sectionTitle(doc, "5 — Fonti Dati Ufficiali e Riferimenti Normativi", y, pageWidth);
  const fontiRows = getFontisTable(query, r);
  y = threeColTable(doc, ["Dato / Informazione", "Fonte ufficiale", "Aggiornamento"], fontiRows, y, pageWidth, [
    (pageWidth - 40) * 0.28,
    (pageWidth - 40) * 0.52,
    (pageWidth - 40) * 0.20,
  ]);

  // Pratiche necessarie (if present)
  if (r.pratiche_necessarie?.length > 0) {
    y += 4;
    if (y > pageHeight - bottomMargin - 40) {
      addFooter(doc, page, 2 + (isAsta ? 1 : 0), reportNum, pageWidth, pageHeight);
      doc.addPage();
      page++;
      addWatermark(doc, pageWidth, pageHeight);
      y = 15;
    }
    y = sectionTitle(doc, "Pratiche Necessarie", y, pageWidth);
    const praticheRows = r.pratiche_necessarie.map(p => [
      p.tipo_intervento || "—",
      `${p.pratica_richiesta || "—"} — ${p.ente_competente || "—"}`,
      `${p.tempistica_stimata || "—"} / ${p.costi_stimati || "—"}`,
    ]);
    y = threeColTable(doc, ["Tipo intervento", "Pratica richiesta / Ente", "Tempi / Costi stimati"], praticheRows, y, pageWidth);
  }

  // Valutazione sintetica (if present)
  if (r.valutazione_sintetica) {
    y += 4;
    if (y > pageHeight - bottomMargin - 30) {
      addFooter(doc, page, 2 + (isAsta ? 1 : 0), reportNum, pageWidth, pageHeight);
      doc.addPage();
      page++;
      addWatermark(doc, pageWidth, pageHeight);
      y = 15;
    }
    y = sectionTitle(doc, "Valutazione Sintetica", y, pageWidth);
    const vs = r.valutazione_sintetica;
    if (vs.livello_complessita) {
      doc.setFontSize(8);
      doc.setTextColor(...DARK_GRAY);
      doc.setFont("helvetica", "bold");
      doc.text(`Livello di complessità: ${vs.livello_complessita}`, 22, y + 4);
      y += 8;
    }
    const vsRows = [];
    (vs.criticita_principali || []).forEach(c => vsRows.push(["⚠ Criticità", c, ""]));
    (vs.opportunita || []).forEach(o => vsRows.push(["✦ Opportunità", o, ""]));
    (vs.raccomandazioni || []).forEach(ra => vsRows.push(["→ Raccomandazione", ra, ""]));
    if (vsRows.length) {
      y = threeColTable(doc, ["Tipo", "Descrizione", ""], vsRows, y, pageWidth, [
        (pageWidth - 40) * 0.22,
        (pageWidth - 40) * 0.78,
        0,
      ]);
    }
  }

  addFooter(doc, page, page + (isAsta ? 1 : 0), reportNum, pageWidth, pageHeight);

  // ── PAGE 3 (ASTA) ────────────────────────────────────────────────────────
  if (isAsta) {
    doc.addPage();
    page++;
    addWatermark(doc, pageWidth, pageHeight);
    y = 15;

    // Red banner
    doc.setFillColor(180, 30, 30);
    doc.rect(20, y, pageWidth - 40, 12, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("SEZIONE SPECIALE — ACQUISTO ALL'ASTA GIUDIZIARIA", pageWidth / 2, y + 8, { align: "center" });
    y += 16;

    // Info box
    doc.setFillColor(255, 245, 230);
    doc.setDrawColor(...AMBER);
    doc.setLineWidth(0.8);
    doc.rect(20, y, pageWidth - 40, 12, "FD");
    doc.setTextColor(120, 60, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      "Questa scheda include analisi specifica per immobili in procedura esecutiva. Verificare sempre la conformità urbanistica prima dell'offerta.",
      pageWidth / 2, y + 5, { align: "center", maxWidth: pageWidth - 44 }
    );
    y += 18;

    // Checklist
    y = sectionTitle(doc, "Checklist Pre-Offerta", y, pageWidth);
    const checklist = [
      ["Conformità urbanistica", "Verificare che la destinazione d'uso sia conforme al titolo edilizio originario"],
      ["Difformità edilizie", "Richiedere il certificato di agibilità e verificare eventuali difformità nella planimetria catastale"],
      ["CDU allegato", "Il Certificato di Destinazione Urbanistica (art. 30 DPR 380/2001) deve essere allegato alla perizia"],
      ["Oneri urbanizzazione", "Verificare se vi sono oneri di urbanizzazione non pagati o convenzioni urbanistiche pendenti"],
      ["Sanatoria possibile", "Valutare se eventuali abusi sono sanabili ai sensi del DPR 380/2001 art. 36"],
      ["Accesso atti UTC", "Richiedere ex art. 22 L. 241/90 all'UTC almeno 30 gg prima dell'asta"],
    ];
    y = twoColTable(doc, checklist, y, pageWidth);

    // Testo precompilato CDU
    y += 6;
    y = sectionTitle(doc, "Testo Precompilato — Richiesta CDU (art. 30 DPR 380/2001)", y, pageWidth);
    doc.setFontSize(7);
    doc.setTextColor(...DARK_GRAY);
    doc.setFont("helvetica", "normal");
    const cduText = [
      `Spett.le Comune di ${query.comune || "__________"}`,
      `Ufficio Tecnico Comunale — Sportello Urbanistica`,
      "",
      "OGGETTO: Richiesta Certificato di Destinazione Urbanistica ai sensi dell'art. 30 del DPR 380/2001",
      "",
      `Il/La sottoscritto/a, richiedente ai sensi dell'art. 22 della L. 241/1990, chiede il rilascio del`,
      `Certificato di Destinazione Urbanistica per l'immobile sito nel Comune di ${query.comune || "__________"},`,
      `identificato catastalmente al Foglio ${query.foglio || "__"}, Particella ${query.particella || "__"}${query.subalterno ? `, Subalterno ${query.subalterno}` : ""}.`,
      "",
      "Si allegano: copia documento d'identità, visura catastale dell'immobile, marca da bollo €16,00.",
      "",
      `${query.comune || "__________"}, ${new Date().toLocaleDateString("it-IT")}`,
      "Firma: __________________________",
    ];
    for (const line of cduText) {
      if (y > pageHeight - bottomMargin - 8) break;
      if (line === "") { y += 2; continue; }
      doc.text(line, 22, y);
      y += 5;
    }

    addFooter(doc, page, page, reportNum, pageWidth, pageHeight);
  }

  return { doc, reportNum };
}