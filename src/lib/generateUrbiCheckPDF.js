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

export async function generatePDF(query, financialSnapshot) {
  await loadJsPDF();
  const { jsPDF } = window.jspdf;
  const r = query.report_data || {};
  const isAsta = query.finalita === "asta_giudiziaria";
  const wfsData = r.wfs_liguria?.risultati;
  const fd = r.fin_data || {};

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

  const rows1 = [
    ["Regione", query.regione],
    ["Provincia", query.provincia || "—"],
    ["Comune", query.comune],
    ["Foglio catastale", query.foglio],
    ["Particella", query.particella],
    ["Subalterno", query.subalterno || "—"],
    ["Categoria catastale", r.dati_catastali?.categoria || "—"],
    ["Consistenza / Superficie", r.dati_catastali?.consistenza || "Non disponibile — richiedere visura ufficiale AdE"],
    ["Finalità analisi", FINALITA_LABELS[query.finalita] || query.finalita || "—"],
    ["Zona urbanistica", r.zonizzazione?.zona_codice || r.zonizzazione?.destinazione_prevalente || "—"],
    ["Stato conservativo", fd.stato_conservativo || "—"],
    ["Rendita catastale", r.dati_catastali?.rendita_catastale || "Disponibile su visura ufficiale AdE"],
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
  const ND = "Non disponibile — richiedere CU al Comune";
  const indici = [
    ["Indice di Fabbricabilita' (IF)", ie.if_mc_mq || ND, "m³/m²"],
    ["Rapporto di Copertura (RC)", ie.rc_percentuale || ND, "%"],
    ["Altezza massima (H max)", ie.h_max || ND, "m"],
    ["Distanza dai confini", ie.distanza_confini || ND, "m"],
    ["Distanza dalla strada", ie.distanza_strada || ND, "m"],
    ["Distanza tra fabbricati", ie.distanza_fabbricati || ND, "m"],
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
    doc.text("Fonte: Analisi ope legis art.142 D.Lgs 42/2004 — liguriavincoli.it", margin + 2, y);
    y += 6;

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
      doc.text("PAI — Rischio idrogeologico (WFS M450 Regione Liguria):", margin + 2, y);
      y += 6;
      (wfsPai.dati || []).forEach((d, i) => {
        if (y > 265) { y = newPage(doc); }
        stripe(doc, margin, y, i % 2 === 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(50, 50, 50);
        doc.text(d.layer || "", margin + 2, y);
        doc.setFont("helvetica", "normal");
        if (d.trovato) {
          doc.setTextColor(200, 50, 50);
          doc.text("Rischio rilevato" + (d.classe ? " — Classe " + d.classe : ""), 90, y);
        } else {
          doc.setTextColor(100, 150, 100);
          doc.text("Nessun rischio PAI rilevato", 90, y);
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
    doc.text("Nota: dati da elaborazione AI — per Liguria eseguire Analisi WFS per dati ufficiali", margin + 2, y);
    y += 7;

    const vincoli = [
      ["Vincolo sismico", vv.vincolo_sismico?.presente ? "Presente — " + (vv.vincolo_sismico?.zona || "") : "Assente", "OPCM 3274/2003", vv.vincolo_sismico?.presente],
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
  const mq = parseFloat(fd.superficie) || 80;
  const prezzoAcquisto = parseFloat(fd.prezzo_acquisto) || 0;
  const spesePerc = parseFloat(fd.spese_accessorie) || 10;
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

  // We always render financial section if there's ANY financial data OR if it's an investment/asta finalita
  const FIN_FINALITA = ["investimento", "sviluppo_immobiliare", "asta_giudiziaria"];
  const showFinancial = FIN_FINALITA.includes(query.finalita) || prezzoAcquisto > 0;

  if (showFinancial) {
    y += 4;
    if (y > 230) { y = newPage(doc); }
    y = sectionHeader(doc, margin, y, "7", "ANALISI FINANZIARIA E DUE DILIGENCE");

    // OMI data from financialSnapshot (passed in from page) or fallback note
    const snap = financialSnapshot || {};
    const omi = snap.omi || null;
    const score = snap.score || null;

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
        ["Valore stimato oggi (" + mq + " mq)", fmtEur(valoreMercatoMin) + " – " + fmtEur(valoreMercatoMax)],
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
      doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(150, 100, 0);
      const noOmiLines = [
        "Dati OMI non ancora caricati al momento del download.",
        "Per l'analisi finanziaria completa: apri la scheda online, attendi il caricamento",
        "della sezione 'Analisi Finanziaria', poi scarica nuovamente il PDF.",
      ];
      noOmiLines.forEach(l => { doc.text(l, margin + 2, y); y += 5; });
      y += 3;
    }

    // Stima costi ristrutturazione
    if (prezzoAcquisto > 0) {
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

      const ristrRows = [
        ["Costo ristr. (€/mq)", String(costs.min), String(costs.mid), String(costs.max)],
        ["Totale ristrutturazione", fmtEur(ristrMin), fmtEur(ristrMid), fmtEur(ristrMax)],
        ["Prezzo acquisto", fmtEur(prezzoAcquisto), fmtEur(prezzoAcquisto), fmtEur(prezzoAcquisto)],
        ["Spese accessorie (" + spesePerc + "%)", fmtEur(spese), fmtEur(spese), fmtEur(spese)],
        ["INVESTIMENTO TOTALE", fmtEur(totMin), fmtEur(totMid), fmtEur(totMax)],
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

  // ── SEZ 10 — VALUTAZIONE SINTETICA ────────────────────────────────────────
  if (r.valutazione_sintetica) {
    y += 4;
    if (y > 230) { y = newPage(doc); }
    y = sectionHeader(doc, margin, y, "8", "VALUTAZIONE SINTETICA");

    const vs = r.valutazione_sintetica;
    if (vs.livello_complessita) {
      const compColor = vs.livello_complessita === "Basso" ? [39, 174, 96] : vs.livello_complessita === "Alto" ? [220, 50, 50] : [200, 130, 0];
      doc.setFillColor(...compColor);
      doc.roundedRect(margin, y, 50, 9, 2, 2, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.text("Complessita': " + vs.livello_complessita, margin + 3, y + 6);
      y += 14;
    }

    const colW = 52;
    const sections3 = [
      { title: "Criticita'", items: vs.criticita_principali, color: [200, 80, 0] },
      { title: "Opportunita'", items: vs.opportunita, color: [39, 150, 80] },
      { title: "Raccomandazioni", items: vs.raccomandazioni, color: [30, 80, 180] },
    ];

    sections3.forEach((sec, si) => {
      if (!sec.items?.length) return;
      const colX = margin + si * (colW + 5);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...sec.color);
      doc.text(sec.title, colX, y);
    });
    y += 5;

    const maxItems = Math.max(...sections3.map(s => s.items?.length || 0));
    for (let row = 0; row < Math.min(maxItems, 5); row++) {
      if (y > 265) { y = newPage(doc); }
      sections3.forEach((sec, si) => {
        const item = sec.items?.[row];
        if (!item) return;
        const colX = margin + si * (colW + 5);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(60, 60, 60);
        const truncated = String(item).length > 38 ? String(item).slice(0, 36) + "…" : String(item);
        doc.text("• " + truncated, colX, y, { maxWidth: colW });
      });
      y += 7;
    }
  }

  // ── SEZ 9 — VINCOLI INFRASTRUTTURALI WFS ─────────────────────────────────
  {
    const wfsFerr = wfsData?.vincolo_ferroviario;
    const wfsAcqua = wfsData?.vincolo_corsi_acqua;
    y += 4;
    if (y > 230) { y = newPage(doc); }
    y = sectionHeader(doc, margin, y, "9", "VINCOLI INFRASTRUTTURALI (WFS LIGURIA)");

    y = subHeader(doc, margin, y, "Vincolo Ferroviario — DPR 753/1980 (fascia 30m asse binario)");
    if (!wfsFerr) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(150, 100, 0);
      doc.text("Eseguire Analisi WFS Liguria per ottenere i dati", margin + 2, y); y += 7;
    } else if (!wfsFerr.fonte_ok) {
      doc.setFillColor(255, 248, 230); doc.rect(margin, y - 4, 170, 7, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150, 100, 0);
      doc.text("fonte_ok=false — dati Overpass non disponibili, consultare RFI", margin + 2, y);
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
      doc.text("Eseguire Analisi WFS Liguria per ottenere i dati", margin + 2, y); y += 7;
    } else if (!wfsAcqua.fonte_ok) {
      doc.setFillColor(255, 248, 230); doc.rect(margin, y - 4, 170, 7, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150, 100, 0);
      doc.text("fonte_ok=false — consultare Catasto Acque Regione Liguria", margin + 2, y);
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
  }

  // ── SEZ 10 — FONTI DATI ───────────────────────────────────────────────────
  {
    y += 4;
    if (y > 230) { y = newPage(doc); }
    y = sectionHeader(doc, margin, y, "10", "FONTI DATI UFFICIALI");

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
      ["Zona sismica", wfsSismica ? "WFS Regione Liguria + OPCM 3274/2003" : "INGV — Protezione Civile", "OPCM 3274/2003"],
      ["Rischio idraulico", query.regione === "Liguria" ? "WFS M450 — PAI Autorita' di Bacino Liguria" : "PAI Autorita' di Bacino", "D.Lgs. 152/2006"],
      ["Vincolo paesaggistico", query.regione === "Liguria" ? "Analisi logica ope legis (COMUNI_COSTIERI / D.Lgs. 42/2004 art.142)" : "MiC — SITAP", "D.Lgs. 42/2004 art.142"],
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