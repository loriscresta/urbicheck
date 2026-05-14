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
    ["Consistenza / Superficie", r.dati_catastali?.consistenza || "Non disponibile — richiedere visura ufficiale AdE"],
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

  doc.setTextColor(150, 100, 0);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.text("Nota: valori orientativi da elaborazione AI — verificare sempre su NTA/PRG del Comune", margin + 2, y);
  y += 6;

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const ie = r.indici_edilizi || {};
  const ND_INDICI = "Verificare su NTA/PRG Comunale";
  const indici = [
    ["Indice di Fabbricabilità (IF)", ie.if_mc_mq || ND_INDICI, "m³/m²"],
    ["Rapporto di Copertura (RC)", ie.rc_percentuale || ND_INDICI, "%"],
    ["Altezza massima (H max)", ie.h_max || ND_INDICI, "m"],
    ["Distanza dai confini", ie.distanza_confini || ND_INDICI, "m"],
    ["Distanza dalla strada", ie.distanza_strada || ND_INDICI, "m"],
    ["Distanza tra fabbricati", ie.distanza_fabbricati || ND_INDICI, "m"],
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

  // ── SEZIONE 3 — VINCOLI PAESAGGISTICI (fonte WFS se disponibile, altrimenti AI) ──
  y += 4;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 95);
  doc.text("3. VINCOLI PAESAGGISTICI E IDROGEOLOGICI", margin, y);
  y += 4;
  doc.setDrawColor(30, 58, 95);
  doc.line(margin, y, 190, y);
  y += 6;

  // Prefer WFS Liguria authoritative data for vincoli paesaggistici
  const wfsData = r.wfs_liguria?.risultati;
  const wfsPaesagg = wfsData?.vincoli_paesaggistici_ope_legis;
  const wfsPai = wfsData?.pai_rischio_idrogeologico;
  const wfsSismica = wfsData?.sismica;

  if (wfsPaesagg) {
    // Use authoritative WFS ope legis data
    const wfsVincoli = (wfsPaesagg.vincoli || []).filter(v => v.livello !== 'NESSUN_VINCOLO_RILEVATO');
    const hasWfsVincoli = wfsVincoli.length > 0;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("Fonte: Analisi ope legis art.142 D.Lgs 42/2004 — liguriavincoli.it", margin + 2, y);
    y += 6;

    if (hasWfsVincoli) {
      wfsVincoli.forEach((v, i) => {
        if (y > 265) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(255, 245, 245); doc.rect(margin, y - 4, 170, 7, "F"); }
        doc.setFont("helvetica", "bold");
        doc.setTextColor(200, 50, 50);
        doc.text("⚠ " + (v.tipo || "Vincolo"), margin + 2, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const fasciaText = v.fascia_tutela ? ` — ${v.fascia_tutela}` : "";
        doc.text((v.riferimento_normativo || "") + fasciaText, 80, y, { maxWidth: 108 });
        doc.setTextColor(50, 50, 50);
        y += 8;
      });
    } else {
      doc.setFillColor(240, 255, 245);
      doc.rect(margin, y - 4, 170, 7, "F");
      doc.setFont("helvetica", "normal");
      doc.setTextColor(39, 174, 96);
      doc.text("✓ Nessun vincolo paesaggistico ope legis rilevato per questo comune", margin + 2, y);
      doc.setTextColor(50, 50, 50);
      y += 8;
    }

    // PAI from WFS
    if (wfsPai) {
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 95);
      doc.text("PAI — Rischio idrogeologico (WFS M450 Regione Liguria):", margin + 2, y);
      y += 6;
      (wfsPai.dati || []).forEach((d, i) => {
        if (y > 265) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(margin, y - 4, 170, 7, "F"); }
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 50, 50);
        doc.text(d.layer || "", margin + 2, y);
        doc.setFont("helvetica", "normal");
        if (d.trovato) {
          doc.setTextColor(200, 50, 50);
          doc.text(`Rischio rilevato${d.classe ? " — Classe " + d.classe : ""}`, 90, y);
        } else {
          doc.setTextColor(100, 150, 100);
          doc.text("Nessun rischio PAI rilevato", 90, y);
        }
        doc.setTextColor(50, 50, 50);
        y += 8;
      });
    }

    // Sismica from WFS
    if (wfsSismica) {
      y += 2;
      if (y > 265) { doc.addPage(); y = 20; }
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y - 4, 170, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      doc.text("Zona sismica", margin + 2, y);
      doc.setFont("helvetica", "normal");
      doc.text(`Zona ${wfsSismica.zona} — ${wfsSismica.descrizione}`, 90, y, { maxWidth: 98 });
      y += 8;
    }
  } else {
    // Fallback: AI-generated vincoli (with disclaimer)
    const vv = r.vincoli || {};
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 100, 0);
    doc.text("Nota: dati da elaborazione AI — per Liguria eseguire Analisi WFS per dati ufficiali", margin + 2, y);
    y += 7;

    const vincoli = [
      ["Vincolo sismico", vv.vincolo_sismico?.presente ? `Presente — ${vv.vincolo_sismico?.zona || ""}` : "Assente", "OPCM 3274/2003", vv.vincolo_sismico?.presente],
      ["Rischio idraulico", vv.vincolo_idraulico?.presente ? `Presente — ${vv.vincolo_idraulico?.classe_rischio || ""}` : "Assente", "PAI - Autorità di Bacino", vv.vincolo_idraulico?.presente],
      ["Vincolo paesaggistico", vv.vincolo_paesaggistico?.presente ? `Presente — ${vv.vincolo_paesaggistico?.tipo || ""}` : "Assente", "D.Lgs. 42/2004", vv.vincolo_paesaggistico?.presente],
      ["Vincolo archeologico", vv.vincolo_archeologico?.presente ? "Presente" : "Assente", "D.Lgs. 42/2004", vv.vincolo_archeologico?.presente],
    ];

    doc.setFontSize(8.5);
    vincoli.forEach(([k, v, norma, presente], i) => {
      if (y > 265) { doc.addPage(); y = 20; }
      if (i % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(margin, y - 4, 170, 7, "F"); }
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

  // ── SEZIONE 6 — VINCOLI INFRASTRUTTURALI (ferrovia + corsi d'acqua WFS) ──
  y += 6;
  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 95);
  doc.text("6. VINCOLI INFRASTRUTTURALI", margin, y);
  y += 4;
  doc.setDrawColor(30, 58, 95);
  doc.line(margin, y, 190, y);
  y += 6;

  const wfsFerr = wfsData?.vincolo_ferroviario;
  const wfsAcqua = wfsData?.vincolo_corsi_acqua;

  // Ferrovia
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 95);
  doc.text("Vincolo Ferroviario — DPR 11 luglio 1980 n.753 (fascia 30m asse binario)", margin + 2, y);
  y += 6;

  if (!wfsFerr) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150, 100, 0);
    doc.text("Verifica necessaria — eseguire Analisi WFS Liguria per ottenere i dati", margin + 2, y);
    y += 7;
  } else if (!wfsFerr.fonte_ok) {
    doc.setFillColor(255, 248, 230);
    doc.rect(margin, y - 4, 170, 7, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 100, 0);
    doc.text("Verifica necessaria — dati non disponibili automaticamente, consultare RFI", margin + 2, y);
    doc.setTextColor(50, 50, 50);
    y += 8;
  } else {
    const ferrDati = (wfsFerr.dati || []);
    const ferrTrovati = ferrDati.filter(d => d.trovato);
    if (ferrTrovati.length === 0) {
      doc.setFillColor(240, 255, 245);
      doc.rect(margin, y - 4, 170, 7, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(39, 174, 96);
      doc.text("✓ Nessuna ferrovia rilevata entro 250m dal punto analizzato", margin + 2, y);
      doc.setTextColor(50, 50, 50);
      y += 8;
    } else {
      ferrTrovati.forEach((f, i) => {
        if (y > 265) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(255, 245, 220); doc.rect(margin, y - 4, 170, 7, "F"); }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(180, 100, 0);
        doc.text("⚠ " + (f.nome || "Ferrovia"), margin + 2, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(f.fascia_rispetto || "30m dall'asse binario", 80, y, { maxWidth: 108 });
        doc.setTextColor(50, 50, 50);
        y += 8;
      });
    }
  }

  y += 4;
  if (y > 265) { doc.addPage(); y = 20; }

  // Corsi d'acqua
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 95);
  doc.text("Vincolo Corsi d'Acqua — Art.142 c.1 lett. c) D.Lgs 42/2004 (fascia 150m sponda)", margin + 2, y);
  y += 6;

  if (!wfsAcqua) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150, 100, 0);
    doc.text("Verifica necessaria — eseguire Analisi WFS Liguria per ottenere i dati", margin + 2, y);
    y += 7;
  } else if (!wfsAcqua.fonte_ok) {
    doc.setFillColor(255, 248, 230);
    doc.rect(margin, y - 4, 170, 7, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 100, 0);
    doc.text("Verifica necessaria — consultare Catasto Acque Regione Liguria", margin + 2, y);
    doc.setTextColor(50, 50, 50);
    y += 8;
  } else {
    const acquaDati = (wfsAcqua.dati || []);
    const acquaTrovati = acquaDati.filter(d => d.trovato);
    if (acquaTrovati.length === 0) {
      doc.setFillColor(240, 255, 245);
      doc.rect(margin, y - 4, 170, 7, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(39, 174, 96);
      doc.text("✓ Nessun corso d'acqua rilevato entro 250m dal punto analizzato", margin + 2, y);
      doc.setTextColor(50, 50, 50);
      y += 8;
    } else {
      acquaTrovati.forEach((w, i) => {
        if (y > 265) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(230, 245, 255); doc.rect(margin, y - 4, 170, 7, "F"); }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 100, 180);
        const livTag = w.livello === 'POSSIBILE_VINCOLO_ALTO' ? " [Alta probabilità]" : "";
        doc.text("⚠ " + (w.nome || "Corso d'acqua") + livTag, margin + 2, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text("150m dal ciglio di sponda — Art.142 D.Lgs 42/2004", 80, y, { maxWidth: 108 });
        doc.setTextColor(50, 50, 50);
        y += 8;
      });
    }
  }

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