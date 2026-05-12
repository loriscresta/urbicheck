/**
 * URBICHECK — PDF Generator
 * Carica jsPDF via CDN dinamicamente, poi genera il documento A4.
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

export async function generatePDF(query) {
  await loadJsPDF();

  const { jsPDF } = window.jspdf;
  const r = query.report_data || {};
  const isAsta = query.finalita === "asta_giudiziaria";

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 20;

  const schNum =
    "URB-" +
    new Date().toISOString().slice(0, 10).replace(/-/g, "") +
    "-" +
    Math.random().toString(36).substring(2, 8).toUpperCase();

  // ── HEADER NAVY ──────────────────────────────────────────────────────────
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

  // ── WATERMARK ─────────────────────────────────────────────────────────────
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.06 }));
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(60);
  doc.setFont("helvetica", "bold");
  doc.text("URBICHECK", 30, 180, { angle: 45 });
  doc.restoreGraphicsState();

  // ── SEZIONE 1 — DATI IDENTIFICATIVI ──────────────────────────────────────
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("1. DATI IDENTIFICATIVI IMMOBILE", margin, 38);
  doc.setDrawColor(30, 58, 95);
  doc.line(margin, 40, 190, 40);

  const rows1 = [
    ["Regione", query.regione],
    ["Provincia", query.provincia || "—"],
    ["Comune", query.comune],
    ["Foglio catastale", query.foglio],
    ["Particella", query.particella],
    ["Subalterno", query.subalterno || "—"],
    ["Categoria catastale", r.dati_catastali?.categoria || "—"],
    ["Consistenza / Superficie", r.dati_catastali?.consistenza || "—"],
    ["Finalità analisi", FINALITA_LABELS[query.finalita] || query.finalita || "—"],
  ];

  let y = 45;
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  rows1.forEach(([k, v], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y - 4, 170, 7, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.text(k, margin + 2, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(v || "—"), 90, y);
    y += 8;
  });

  // ── SEZIONE 2 — ZONIZZAZIONE ──────────────────────────────────────────────
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 95);
  doc.text("2. ZONIZZAZIONE URBANISTICA", margin, y);
  y += 4;
  doc.setDrawColor(30, 58, 95);
  doc.line(margin, y, 190, y);
  y += 6;

  const zonaColore = r.zonizzazione?.colore?.toLowerCase();
  const zonaColor =
    zonaColore === "verde"
      ? [39, 174, 96]
      : zonaColore === "rosso"
      ? [231, 76, 60]
      : [243, 156, 18];

  doc.setFillColor(...zonaColor);
  doc.roundedRect(margin, y, 170, 14, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const zonaNome =
    r.zonizzazione?.zona_codice ||
    r.zonizzazione?.destinazione_prevalente ||
    "Zona urbanistica";
  doc.text(zonaNome, margin + 6, y + 9);
  y += 20;

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const ie = r.indici_edilizi || {};
  const indici = [
    ["Indice di Fabbricabilità (IF)", ie.if_mc_mq, "m³/m²"],
    ["Rapporto di Copertura (RC)", ie.rc_percentuale, "%"],
    ["Altezza massima (H max)", ie.h_max, "m"],
    ["Distanza dai confini", ie.distanza_confini, "m"],
    ["Distanza dalla strada", ie.distanza_strada, "m"],
    ["Distanza tra fabbricati", ie.distanza_fabbricati, "m"],
  ];
  indici.forEach(([k, v, u], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y - 4, 170, 7, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.text(k, margin + 2, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(v || "—"), 130, y);
    doc.text(u, 165, y);
    y += 8;
  });

  // ── SEZIONE 3 — VINCOLI ───────────────────────────────────────────────────
  y += 4;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 95);
  doc.text("3. VINCOLI ATTIVI", margin, y);
  y += 4;
  doc.setDrawColor(30, 58, 95);
  doc.line(margin, y, 190, y);
  y += 6;

  const vv = r.vincoli || {};
  const vincoli = [
    [
      "Vincolo sismico",
      vv.vincolo_sismico?.presente
        ? `Presente — ${vv.vincolo_sismico?.zona || vv.vincolo_sismico?.dettagli || ""}`
        : "Assente",
      "OPCM 3274/2003",
      vv.vincolo_sismico?.presente,
    ],
    [
      "Rischio idraulico",
      vv.vincolo_idraulico?.presente
        ? `Presente — ${vv.vincolo_idraulico?.classe_rischio || vv.vincolo_idraulico?.dettagli || ""}`
        : "Assente",
      "PAI - Autorità di Bacino",
      vv.vincolo_idraulico?.presente,
    ],
    [
      "Vincolo paesaggistico",
      vv.vincolo_paesaggistico?.presente
        ? `Presente — ${vv.vincolo_paesaggistico?.tipo || vv.vincolo_paesaggistico?.dettagli || ""}`
        : "Assente",
      "D.Lgs. 42/2004",
      vv.vincolo_paesaggistico?.presente,
    ],
    [
      "Vincolo archeologico",
      vv.vincolo_archeologico?.presente ? "Presente" : "Assente",
      "D.Lgs. 42/2004",
      vv.vincolo_archeologico?.presente,
    ],
    ["Rischio frana", "Vedere PAI locale", "PAI vigente", false],
    ["Vincolo idrogeologico", "Vedere R.D. 3267/1923", "R.D. 3267/1923", false],
  ];

  doc.setFontSize(8.5);
  vincoli.forEach(([k, v, norma, presente], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y - 4, 170, 7, "F");
    }
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text(k, margin + 2, y);
    doc.setFont("helvetica", "normal");
    if (presente) {
      doc.setTextColor(200, 50, 50);
    } else {
      doc.setTextColor(100, 150, 100);
    }
    doc.text(String(v || "—"), 90, y, { maxWidth: 42 });
    doc.setTextColor(120, 120, 120);
    doc.text(norma, 135, y);
    doc.setTextColor(50, 50, 50);
    y += 8;
  });

  // ── SEZIONE 4 — FATTIBILITÀ ───────────────────────────────────────────────
  y += 4;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 95);
  doc.text("4. FATTIBILITÀ INTERVENTI", margin, y);
  y += 4;
  doc.setDrawColor(30, 58, 95);
  doc.line(margin, y, 190, y);
  y += 6;

  // Header row
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, y - 4, 170, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Tipo di intervento", margin + 2, y);
  doc.text("Fattibilità", 100, y);
  doc.text("Nota / Pratica", 135, y);
  y += 8;

  const fattRows =
    r.fattibilita_interventi?.length > 0
      ? r.fattibilita_interventi.map((fi) => [
          fi.tipo_intervento,
          fi.fattibilita === "fattibile"
            ? "✓ Fattibile"
            : fi.fattibilita === "non_fattibile"
            ? "✗ Non fattibile"
            : "⚠ Con autorizzazione",
          fi.note || "—",
        ])
      : [
          ["Manutenzione ordinaria", "✓ Fattibile", "Attività libera"],
          ["Manutenzione straordinaria", "✓ Fattibile", "CILA"],
          ["Ristrutturazione leggera", "⚠ Con autorizzazione", "SCIA"],
          ["Ristrutturazione pesante", "⚠ Con autorizzazione", "Permesso di costruire"],
          ["Cambio destinazione d'uso", "⚠ Con autorizzazione", "Verifica NTA"],
          ["Nuova costruzione", "⚠ Con autorizzazione", "Permesso di costruire"],
        ];

  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  fattRows.forEach(([k, v, n], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y - 4, 170, 7, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.text(String(k), margin + 2, y, { maxWidth: 54 });
    doc.setFont("helvetica", "normal");
    doc.text(String(v), 100, y);
    doc.setTextColor(100, 100, 100);
    doc.text(String(n), 135, y, { maxWidth: 52 });
    doc.setTextColor(50, 50, 50);
    y += 8;
  });

  // ── SEZIONE 5 — FONTI ─────────────────────────────────────────────────────
  y += 6;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 95);
  doc.text("5. FONTI DATI UFFICIALI", margin, y);
  y += 4;
  doc.setDrawColor(30, 58, 95);
  doc.line(margin, y, 190, y);
  y += 6;

  // Header
  doc.setFillColor(235, 244, 255);
  doc.rect(margin, y - 4, 170, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Tipo di dato", margin + 2, y);
  doc.text("Fonte ufficiale", 75, y);
  doc.text("Rif. normativo", 152, y);
  y += 8;

  const fonti = [
    [
      "Dati catastali",
      "Agenzia delle Entrate — Cartografia catastale",
      "D.Lgs. 347/1990",
    ],
    [
      "Zonizzazione PRG/PUC",
      query.regione === "Liguria"
        ? "Regione Liguria — WFS M2427"
        : "PRG Comunale + elaborazione AI",
      "DPR 380/2001",
    ],
    ["Zona sismica", "INGV — Protezione Civile Nazionale", "OPCM 3274/2003"],
    [
      "Rischio idraulico",
      query.regione === "Liguria"
        ? "Regione Liguria — WFS M2423"
        : "PAI Autorità di Bacino",
      "D.Lgs. 152/2006",
    ],
    ["Vincolo paesaggistico", "MiC — SITAP", "D.Lgs. 42/2004 art.142"],
    [
      "Normativa edilizia",
      `NTA del PRG/PUC Comune di ${query.comune}`,
      "DPR 380/2001",
    ],
  ];

  doc.setFont("helvetica", "normal");
  fonti.forEach(([k, v, n], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 4, 170, 7, "F");
    }
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text(k, margin + 2, y, { maxWidth: 50 });
    doc.setFont("helvetica", "normal");
    doc.text(v, 75, y, { maxWidth: 72 });
    doc.text(n, 152, y, { maxWidth: 36 });
    y += 8;
  });

  // ── SEZIONE ASTA (pagina extra se asta giudiziaria) ───────────────────────
  if (isAsta) {
    doc.addPage();
    let ay = 20;

    doc.setFillColor(180, 30, 30);
    doc.rect(0, 0, 210, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(
      "SEZIONE SPECIALE — ACQUISTO ALL'ASTA GIUDIZIARIA",
      pageW / 2,
      12,
      { align: "center" }
    );
    ay = 28;

    doc.setFillColor(255, 245, 230);
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.8);
    doc.rect(margin, ay, 170, 14, "FD");
    doc.setTextColor(120, 60, 0);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Verificare sempre la conformità urbanistica prima dell'offerta. CDU obbligatorio per aste ex art. 30 DPR 380/2001.",
      pageW / 2,
      ay + 6,
      { align: "center", maxWidth: 162 }
    );
    ay += 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 95);
    doc.text("Checklist Pre-Offerta", margin, ay);
    ay += 4;
    doc.setDrawColor(30, 58, 95);
    doc.line(margin, ay, 190, ay);
    ay += 6;

    const checklist = [
      ["CDU allegato alla perizia", "Obbligatorio ex art. 30 DPR 380/2001"],
      ["Conformità urbanistica", "Verifica titolo edilizio originario vs stato attuale"],
      ["Difformità edilizie", "Planimetria catastale vs stato di fatto"],
      ["Oneri urbanizzazione pendenti", "Verifica convenzioni urbanistiche attive"],
      ["Sanatoria possibile", "DPR 380/2001 art. 36 — abusi sanabili?"],
      ["Richiesta accesso atti UTC", "Ex art. 22 L.241/90, almeno 30 gg prima dell'asta"],
    ];

    doc.setFontSize(8.5);
    checklist.forEach(([k, v], i) => {
      if (i % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(margin, ay - 4, 170, 7, "F");
      }
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.text(k, margin + 2, ay);
      doc.setFont("helvetica", "normal");
      doc.text(v, 90, ay, { maxWidth: 96 });
      ay += 8;
    });

    // Testo CDU precompilato
    ay += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 95);
    doc.text(
      "Testo Precompilato — Richiesta CDU (art. 30 DPR 380/2001)",
      margin,
      ay
    );
    ay += 4;
    doc.setDrawColor(30, 58, 95);
    doc.line(margin, ay, 190, ay);
    ay += 6;

    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");

    const cduLines = [
      `Spett.le Comune di ${query.comune || "__________"}`,
      "Ufficio Tecnico Comunale — Sportello Urbanistica",
      "",
      "OGGETTO: Richiesta Certificato di Destinazione Urbanistica ai sensi dell'art. 30 del DPR 380/2001",
      "",
      "Il/La sottoscritto/a, richiedente ai sensi dell'art. 22 della L. 241/1990, chiede il rilascio",
      `del Certificato di Destinazione Urbanistica per l'immobile sito nel Comune di ${query.comune || "__________"},`,
      `Foglio ${query.foglio || "__"}, Particella ${query.particella || "__"}${query.subalterno ? `, Subalterno ${query.subalterno}` : ""}.`,
      "",
      "Si allegano: copia documento d'identità, visura catastale, marca da bollo €16,00.",
      "",
      `${query.comune || "__________"}, ${new Date().toLocaleDateString("it-IT")}`,
      "Firma: __________________________",
    ];

    for (const line of cduLines) {
      if (ay > 270) break;
      if (line === "") {
        ay += 3;
        continue;
      }
      doc.text(line, margin, ay);
      ay += 5;
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
    doc.text("Pag. " + i + "/" + pageCount, 100, 291, { align: "center" });
    doc.text(
      "Documento generato il " + new Date().toLocaleDateString("it-IT"),
      190,
      291,
      { align: "right" }
    );
    doc.setFontSize(6);
    doc.text(
      "Documento a valore informativo. Per atti notarili e pratiche edilizie è necessaria verifica tecnica professionale.",
      105,
      295,
      { align: "center" }
    );
  }

  return { doc, reportNum: schNum };
}