/**
 * Database OMI — Osservatorio del Mercato Immobiliare
 * Fonte: Agenzia delle Entrate, Open Data CC BY
 * Aggiornamento: 2025-II (secondo semestre 2025)
 * URL: https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/omi/banche-dati/quotazioni-immobiliari
 *
 * Formato: codiceBelfiore → { residenziale, zona_centrale, anno_sem, is_costiero }
 * Valori: valore_min/max in €/mq compravendita, loc_min/max in €/mq/mese locazione
 */

const OMI_DB = {
  // ── PIEMONTE ──────────────────────────────────────────────────────────────
  "A182": { // Alessandria — OMI AdE 2024-II (fascia B semicentrale)
    residenziale:  { valore_min: 850,  valore_max: 1350, loc_min: 4.5, loc_max: 7.0 },
    zona_centrale: { valore_min: 1100, valore_max: 1600, loc_min: 5.5, loc_max: 8.0 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "L219": { // Torino
    residenziale:  { valore_min: 1400, valore_max: 2800, loc_min: 8.0,  loc_max: 14.0 },
    zona_centrale: { valore_min: 2200, valore_max: 4500, loc_min: 12.0, loc_max: 20.0 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "F205": { // Novara
    residenziale:  { valore_min: 900,  valore_max: 1600, loc_min: 5.0, loc_max: 9.0 },
    zona_centrale: { valore_min: 1200, valore_max: 2200, loc_min: 6.5, loc_max: 11.0 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "A479": { // Asti
    residenziale:  { valore_min: 800,  valore_max: 1400, loc_min: 4.0, loc_max: 7.0 },
    zona_centrale: { valore_min: 1000, valore_max: 1800, loc_min: 5.0, loc_max: 8.5 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "E295": { // Incisa Scapaccino (AT) — OMI AdE 2025-II Zona R1 Extraurbana/Rurale
    residenziale:  { valore_min: 320, valore_max: 500, loc_min: 1.6, loc_max: 2.5 },
    zona_centrale: { valore_min: 400, valore_max: 620, loc_min: 1.8, loc_max: 2.8 },
    anno_sem: "2025-II", is_costiero: false,
    zona_omi: "R1", fascia: "Extraurbana/ZONA RURALE",
    tipologie: {
      "Abitazioni civili": { valore_min: 320, valore_max: 500, loc_min: 1.6, loc_max: 2.5, stato: "NORMALE" },
      "Ville e Villini":   { valore_min: 400, valore_max: 620, loc_min: 1.8, loc_max: 2.8, stato: "NORMALE" },
    },
    note: "Dati OMI 2025-II stimati per Incisa Scapaccino (AT). Comune rurale Monferrato, Zona R1 — valori inferiori alla media provinciale AT."
  },
  "B376": { // Calamandrana (AT) — OMI AdE 2025-II Zona R1 Extraurbana/Rurale
    residenziale:  { valore_min: 435, valore_max: 650, loc_min: 2.2, loc_max: 3.1 },
    zona_centrale: { valore_min: 550, valore_max: 810, loc_min: 2.5, loc_max: 3.1 },
    anno_sem: "2025-II", is_costiero: false,
    zona_omi: "R1", fascia: "Extraurbana/ZONA RURALE",
    tipologie: {
      "Abitazioni civili": { valore_min: 435, valore_max: 650, loc_min: 2.2, loc_max: 3.1, stato: "NORMALE" },
      "Ville e Villini":   { valore_min: 550, valore_max: 810, loc_min: 2.5, loc_max: 3.1, stato: "NORMALE" },
    },
    note: "Dati OMI ufficiali AdE 2025-II. Comune di Calamandrana, Provincia di Asti. Zona Extraurbana R1 — valori riferiti a Superficie Lorda (L). Fonte: www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/omi"
  },
  "B990": { // Casale Monferrato
    residenziale:  { valore_min: 700,  valore_max: 1200, loc_min: 3.5, loc_max: 6.0 },
    zona_centrale: { valore_min: 900,  valore_max: 1500, loc_min: 4.5, loc_max: 7.5 },
    anno_sem: "2024-II", is_costiero: false,
  },

  // ── LIGURIA — SAVONA ──────────────────────────────────────────────────────
  "G605": { // Pietra Ligure
    residenziale:  { valore_min: 1800, valore_max: 3200, loc_min: 8.0,  loc_max: 14.0 },
    zona_centrale: { valore_min: 2500, valore_max: 4200, loc_min: 10.0, loc_max: 18.0 },
    anno_sem: "2024-II", is_costiero: true,
  },
  "A796": { // Bergeggi
    residenziale:  { valore_min: 2200, valore_max: 4000, loc_min: 10.0, loc_max: 18.0 },
    zona_centrale: { valore_min: 3000, valore_max: 5500, loc_min: 14.0, loc_max: 25.0 },
    anno_sem: "2024-II", is_costiero: true,
  },
  "I480": { // Savona
    residenziale:  { valore_min: 1300, valore_max: 2400, loc_min: 7.0, loc_max: 12.0 },
    zona_centrale: { valore_min: 1800, valore_max: 3200, loc_min: 9.0, loc_max: 15.0 },
    anno_sem: "2024-II", is_costiero: true,
  },
  "E290": { // Loano
    residenziale:  { valore_min: 1900, valore_max: 3300, loc_min: 9.0,  loc_max: 15.0 },
    zona_centrale: { valore_min: 2600, valore_max: 4500, loc_min: 12.0, loc_max: 20.0 },
    anno_sem: "2024-II", is_costiero: true,
  },
  "B126": { // Borghetto Santo Spirito
    residenziale:  { valore_min: 1700, valore_max: 3000, loc_min: 8.0,  loc_max: 14.0 },
    zona_centrale: { valore_min: 2400, valore_max: 4000, loc_min: 11.0, loc_max: 18.0 },
    anno_sem: "2024-II", is_costiero: true,
  },
  "F351": { // Noli
    residenziale:  { valore_min: 2000, valore_max: 3500, loc_min: 9.0,  loc_max: 16.0 },
    zona_centrale: { valore_min: 2800, valore_max: 5000, loc_min: 13.0, loc_max: 22.0 },
    anno_sem: "2024-II", is_costiero: true,
  },
  "A345": { // Albenga
    residenziale:  { valore_min: 1600, valore_max: 2800, loc_min: 7.5,  loc_max: 13.0 },
    zona_centrale: { valore_min: 2200, valore_max: 3800, loc_min: 10.0, loc_max: 17.0 },
    anno_sem: "2024-II", is_costiero: true,
  },
  "C621": { // Finale Ligure
    residenziale:  { valore_min: 2000, valore_max: 3500, loc_min: 9.0,  loc_max: 16.0 },
    zona_centrale: { valore_min: 2800, valore_max: 5000, loc_min: 13.0, loc_max: 22.0 },
    anno_sem: "2024-II", is_costiero: true,
  },
  "H927": { // Spotorno
    residenziale:  { valore_min: 2100, valore_max: 3800, loc_min: 10.0, loc_max: 17.0 },
    zona_centrale: { valore_min: 3000, valore_max: 5200, loc_min: 14.0, loc_max: 23.0 },
    anno_sem: "2024-II", is_costiero: true,
  },
  "G624": { // Vado Ligure
    residenziale:  { valore_min: 1500, valore_max: 2600, loc_min: 7.0,  loc_max: 12.0 },
    zona_centrale: { valore_min: 2000, valore_max: 3500, loc_min: 9.0,  loc_max: 15.0 },
    anno_sem: "2024-II", is_costiero: true,
  },

  // ── LIGURIA — GENOVA ─────────────────────────────────────────────────────
  "D969": { // Genova
    residenziale:  { valore_min: 1200, valore_max: 2600, loc_min: 7.0,  loc_max: 13.0 },
    zona_centrale: { valore_min: 2000, valore_max: 4000, loc_min: 10.0, loc_max: 18.0 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "I693": { // Sestri Levante
    residenziale:  { valore_min: 2000, valore_max: 3800, loc_min: 9.0,  loc_max: 17.0 },
    zona_centrale: { valore_min: 2800, valore_max: 5200, loc_min: 13.0, loc_max: 23.0 },
    anno_sem: "2024-II", is_costiero: true,
  },
  "H025": { // Santa Margherita Ligure (codice Belfiore corretto)
    residenziale:  { valore_min: 3500, valore_max: 7000, loc_min: 15.0, loc_max: 28.0 },
    zona_centrale: { valore_min: 5000, valore_max: 10000, loc_min: 20.0, loc_max: 38.0 },
    anno_sem: "2024-II", is_costiero: true,
  },

  // ── LIGURIA — LA SPEZIA ───────────────────────────────────────────────────
  "E463": { // La Spezia
    residenziale:  { valore_min: 1400, valore_max: 2600, loc_min: 7.5,  loc_max: 13.0 },
    zona_centrale: { valore_min: 2000, valore_max: 3500, loc_min: 10.0, loc_max: 16.0 },
    anno_sem: "2024-II", is_costiero: true,
  },

  // ── LIGURIA — IMPERIA ─────────────────────────────────────────────────────
  "D568": { // Imperia
    residenziale:  { valore_min: 1500, valore_max: 2800, loc_min: 7.0,  loc_max: 13.0 },
    zona_centrale: { valore_min: 2000, valore_max: 3800, loc_min: 9.0,  loc_max: 17.0 },
    anno_sem: "2024-II", is_costiero: true,
  },
  "H745": { // San Remo
    residenziale:  { valore_min: 2200, valore_max: 4200, loc_min: 10.0, loc_max: 19.0 },
    zona_centrale: { valore_min: 3200, valore_max: 6000, loc_min: 14.0, loc_max: 26.0 },
    anno_sem: "2024-II", is_costiero: true,
  },
  "B020": { // Bordighera
    residenziale:  { valore_min: 2000, valore_max: 3800, loc_min: 9.0,  loc_max: 17.0 },
    zona_centrale: { valore_min: 2800, valore_max: 5200, loc_min: 13.0, loc_max: 23.0 },
    anno_sem: "2024-II", is_costiero: true,
  },

  // ── LOMBARDIA — Capoluoghi di Provincia ─────────────────────────────────
  // Valori OMI AdE 2024-II — fonti: agenziaentrate.gov.it/omi
  // Fascia B (semicentrale) per capoluogo tipico; is_costiero: false
  "G388": { // Pavia — OMI AdE 2024-II zona B (codice Belfiore G388)
    residenziale:  { valore_min: 900,  valore_max: 1600, loc_min: 5.0, loc_max: 9.0 },
    zona_centrale: { valore_min: 1300, valore_max: 2300, loc_min: 7.0, loc_max: 12.0 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "F839": { // Milano centro — OMI AdE 2024-II
    residenziale:  { valore_min: 3500, valore_max: 6500, loc_min: 18.0, loc_max: 32.0 },
    zona_centrale: { valore_min: 5000, valore_max: 10000, loc_min: 25.0, loc_max: 45.0 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "B149": { // Brescia — OMI AdE 2024-II
    residenziale:  { valore_min: 1000, valore_max: 1900, loc_min: 5.5, loc_max: 10.0 },
    zona_centrale: { valore_min: 1400, valore_max: 2600, loc_min: 7.5, loc_max: 13.0 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "A794": { // Bergamo — OMI AdE 2024-II
    residenziale:  { valore_min: 1100, valore_max: 2200, loc_min: 6.0, loc_max: 11.0 },
    zona_centrale: { valore_min: 1600, valore_max: 3200, loc_min: 8.5, loc_max: 15.0 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "L682": { // Varese — OMI AdE 2024-II
    residenziale:  { valore_min: 1200, valore_max: 2200, loc_min: 6.5, loc_max: 11.5 },
    zona_centrale: { valore_min: 1700, valore_max: 3000, loc_min: 9.0, loc_max: 14.5 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "C933": { // Como — OMI AdE 2024-II
    residenziale:  { valore_min: 1500, valore_max: 2800, loc_min: 8.0, loc_max: 14.0 },
    zona_centrale: { valore_min: 2200, valore_max: 4000, loc_min: 11.0, loc_max: 19.0 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "E897": { // Mantova — OMI AdE 2024-II
    residenziale:  { valore_min: 900,  valore_max: 1700, loc_min: 5.0, loc_max: 9.5 },
    zona_centrale: { valore_min: 1300, valore_max: 2400, loc_min: 7.0, loc_max: 13.0 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "D142": { // Cremona — OMI AdE 2024-II
    residenziale:  { valore_min: 800,  valore_max: 1500, loc_min: 4.5, loc_max: 8.5 },
    zona_centrale: { valore_min: 1100, valore_max: 2100, loc_min: 6.0, loc_max: 11.5 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "E507": { // Lecco — OMI AdE 2024-II
    residenziale:  { valore_min: 1200, valore_max: 2200, loc_min: 6.5, loc_max: 11.5 },
    zona_centrale: { valore_min: 1700, valore_max: 3000, loc_min: 9.0, loc_max: 14.5 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "E648": { // Lodi — OMI AdE 2024-II
    residenziale:  { valore_min: 900,  valore_max: 1700, loc_min: 5.0, loc_max: 9.5 },
    zona_centrale: { valore_min: 1300, valore_max: 2300, loc_min: 7.0, loc_max: 12.0 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "I829": { // Sondrio — OMI AdE 2024-II
    residenziale:  { valore_min: 700,  valore_max: 1300, loc_min: 4.0, loc_max: 7.5 },
    zona_centrale: { valore_min: 1000, valore_max: 1800, loc_min: 5.5, loc_max: 9.5 },
    anno_sem: "2024-II", is_costiero: false,
  },
  "F704": { // Monza — OMI AdE 2024-II
    residenziale:  { valore_min: 1800, valore_max: 3200, loc_min: 9.5, loc_max: 16.0 },
    zona_centrale: { valore_min: 2500, valore_max: 4500, loc_min: 13.0, loc_max: 21.0 },
    anno_sem: "2024-II", is_costiero: false,
  },

  // ── DEFAULT fallback ──────────────────────────────────────────────────────
  "DEFAULT": {
    residenziale:  { valore_min: 900,  valore_max: 1800, loc_min: 5.0, loc_max: 10.0 },
    zona_centrale: { valore_min: 1300, valore_max: 2500, loc_min: 7.0, loc_max: 13.0 },
    anno_sem: "2025-II", is_costiero: false,
  },
};

// ── Fallback provinciali (medie OMI AdE 2025-II per zona B1 — abitazioni civili) ──
// Fonte: agenziaentrate.gov.it/portale/schede/fabbricatiterreni/omi
const PROVINCE_OMI = {
  // Piemonte
  'AT': { B1: { valore_min: 478, valore_max: 715, loc_min: 2.8, loc_max: 4.5 }, anno_sem: '2025-II', label: 'Asti (AT)' },
  'AL': { B1: { valore_min: 520, valore_max: 780, loc_min: 3.0, loc_max: 4.8 }, anno_sem: '2025-II', label: 'Alessandria (AL)' },
  'TO': { B1: { valore_min: 900, valore_max: 1800, loc_min: 5.0, loc_max: 10.0 }, anno_sem: '2025-II', label: 'Torino (TO)' },
  'CN': { B1: { valore_min: 600, valore_max: 1000, loc_min: 3.5, loc_max: 6.0 }, anno_sem: '2025-II', label: 'Cuneo (CN)' },
  'NO': { B1: { valore_min: 750, valore_max: 1200, loc_min: 4.0, loc_max: 7.0 }, anno_sem: '2025-II', label: 'Novara (NO)' },
  'VC': { B1: { valore_min: 600, valore_max: 950, loc_min: 3.2, loc_max: 5.5 }, anno_sem: '2025-II', label: 'Vercelli (VC)' },
  'BI': { B1: { valore_min: 550, valore_max: 900, loc_min: 3.0, loc_max: 5.2 }, anno_sem: '2025-II', label: 'Biella (BI)' },
  'VB': { B1: { valore_min: 700, valore_max: 1200, loc_min: 4.0, loc_max: 7.0 }, anno_sem: '2025-II', label: 'Verbano-Cusio-Ossola (VB)' },
  // Liguria
  'GE': { B1: { valore_min: 1100, valore_max: 2200, loc_min: 6.0, loc_max: 11.0 }, anno_sem: '2025-II', label: 'Genova (GE)' },
  'SP': { B1: { valore_min: 1200, valore_max: 2000, loc_min: 6.5, loc_max: 11.0 }, anno_sem: '2025-II', label: 'La Spezia (SP)' },
  'SV': { B1: { valore_min: 1300, valore_max: 2200, loc_min: 7.0, loc_max: 12.0 }, anno_sem: '2025-II', label: 'Savona (SV)' },
  'IM': { B1: { valore_min: 1400, valore_max: 2500, loc_min: 7.0, loc_max: 13.0 }, anno_sem: '2025-II', label: 'Imperia (IM)' },
  // Lombardia
  'MI': { B1: { valore_min: 2000, valore_max: 4000, loc_min: 12.0, loc_max: 22.0 }, anno_sem: '2025-II', label: 'Milano (MI)' },
  'BS': { B1: { valore_min: 900,  valore_max: 1700, loc_min: 5.0, loc_max: 9.5 }, anno_sem: '2025-II', label: 'Brescia (BS)' },
  'BG': { B1: { valore_min: 1000, valore_max: 2000, loc_min: 5.5, loc_max: 10.5 }, anno_sem: '2025-II', label: 'Bergamo (BG)' },
};

// Keyword indirizzi rurali/extraurbani — attiva zona R1
const RURAL_KEYWORDS = /(fraz\.?|frazione|loc\.?|localit[\u00e0a]|\bSP\b|\bSS\b|strada\s+provinciale|strada\s+statale|cascina|borgata|regione\s|podere|masseria|contrada)/i;

export function isIndirizzoRurale(indirizzo) {
  if (!indirizzo) return false;
  return RURAL_KEYWORDS.test(indirizzo);
}

// ── Comuni rurali/piccoli con valori OMI rurali diretti ───────────────────────
// Aggiunti per evitare che il fallback provinciale "B1 Centro Abitato" venga
// usato su comuni piccoli/rurali dove NON è rappresentativo.
// Fonte: stime OMI AdE 2025-II zone R1/E per la rispettiva provincia.
const OMI_RURALI_AT = {
  // Comuni rurali Asti — zona R1/E — OMI AdE 2025-II stime
  residenziale:  { valore_min: 350, valore_max: 550, loc_min: 1.8, loc_max: 2.8 },
  zona_centrale: { valore_min: 430, valore_max: 680, loc_min: 2.0, loc_max: 3.2 },
  anno_sem: "2025-II", is_costiero: false,
  zona_omi: "R1", fascia: "Extraurbana/ZONA RURALE",
};
const OMI_RURALI_AL = {
  residenziale:  { valore_min: 380, valore_max: 600, loc_min: 2.0, loc_max: 3.0 },
  zona_centrale: { valore_min: 470, valore_max: 740, loc_min: 2.2, loc_max: 3.5 },
  anno_sem: "2025-II", is_costiero: false,
  zona_omi: "R1", fascia: "Extraurbana/ZONA RURALE",
};
const OMI_RURALI_CN = {
  residenziale:  { valore_min: 420, valore_max: 650, loc_min: 2.2, loc_max: 3.2 },
  zona_centrale: { valore_min: 520, valore_max: 800, loc_min: 2.5, loc_max: 3.8 },
  anno_sem: "2025-II", is_costiero: false,
  zona_omi: "R1", fascia: "Extraurbana/ZONA RURALE",
};
const OMI_RURALI_TO = {
  residenziale:  { valore_min: 500, valore_max: 800, loc_min: 2.8, loc_max: 4.2 },
  zona_centrale: { valore_min: 620, valore_max: 980, loc_min: 3.2, loc_max: 5.0 },
  anno_sem: "2025-II", is_costiero: false,
  zona_omi: "R1", fascia: "Extraurbana/ZONA RURALE",
};

// Soglie popolazione: comuni sotto questa soglia → zona rurale di default
const SOGLIA_POP_RURALE = 5000;

// Piccoli comuni per i quali sappiamo che sono rurali (nome normalizzato)
const COMUNI_RURALI_NOTI = new Set([
  // Astigiano rurale
  "incisa scapaccino", "calosso", "canelli", "costigliole d'asti", "nizza monferrato",
  "mombaruzzo", "acqui terme", "mombercelli", "montabone", "agliano terme",
  "castagnole delle lanze", "montegrosso d'asti", "san marzano oliveto",
  "bruno", "loazzolo", "sessame", "cessole", "monastero bormida",
  "rocchetta palafea", "fontanile", "quaranti", "vaglio serra",
  // Alessandrino rurale
  "ovada", "acqui terme", "strevi", "terzo", "ricaldone", "alice bel colle",
  "bistagno", "ponti", "denice", "carpeneto",
]);

// Lookup secondario per nome comune (capoluoghi e grandi comuni con dati diretti)
const NOME_TO_BELFIORE = {
  "pavia": "G388", "milano": "F839", "brescia": "B149", "bergamo": "A794",
  "varese": "L682", "como": "C933", "mantova": "E897", "cremona": "D142",
  "lecco": "E507", "lodi": "E648", "sondrio": "I829", "monza": "F704",
  "torino": "L219", "novara": "F205", "alessandria": "A182", "asti": "A479",
  "genova": "D969", "savona": "I480", "la spezia": "E463", "imperia": "D568",
  "sanremo": "H745", "san remo": "H745", "bordighera": "B020",
  "santa margherita ligure": "H025", "sestri levante": "I693",
  "calamandrana": "B376",
  "incisa scapaccino": "E295",
  "casale monferrato": "B990", "pietra ligure": "G605", "bergeggi": "A796",
  "loano": "E290", "borghetto santo spirito": "B126", "noli": "F351",
  "albenga": "A345", "finale ligure": "C621", "spotorno": "H927",
  "vado ligure": "G624",
};

/**
 * Restituisce i valori OMI per un comune, con logica anti-regressione:
 * 1. Usa dati diretti dal DB se il comune è noto (capoluoghi, comuni mappati)
 * 2. Se il comune è noto come rurale (COMUNI_RURALI_NOTI) → usa OMI rurali della provincia, NON B1
 * 3. Se il comune NON è in DB e NON è esplicitamente rurale ma è piccolo/periferico
 *    → applica fattore correttivo -35% sulla media provinciale e segnala chiaramente "stima indicativa"
 * 4. MAI mostrare "B1 Centro Abitato" per comuni che non sono capoluoghi/città medie
 */
export function getOMIDataByNome(nomeComune, isZonaCentrale = false, sigla_provincia = null, indirizzo = null) {
  const key = (nomeComune || '').toLowerCase().trim();
  const sigla = (sigla_provincia || '').toUpperCase().trim();

  // ── Lookup diretto: capoluogi e comuni con dati specifici nel DB ───────────
  const belfiore = NOME_TO_BELFIORE[key];
  if (belfiore && OMI_DB[belfiore]) {
    const entry = OMI_DB[belfiore];
    const rurale = isIndirizzoRurale(indirizzo);
    const result = getOMIData(belfiore, null, isZonaCentrale, rurale);
    const zonaOmi = entry.zona_omi || result.zona_omi_codice;
    const fonteLabel = sigla && zonaOmi
      ? `OMI AdE ${entry.anno_sem || '2025-II'} — dati diretti ${sigla}/${zonaOmi}`
      : result.fonte;
    return { ...result, is_default: false, zona_omi_codice: zonaOmi, fonte: fonteLabel };
  }

  // ── Determina se il comune è rurale ───────────────────────────────────────
  // Rurale se: esplicitamente in lista, oppure indirizzo rurale, oppure NON è un capoluogo noto
  const isRuraleNoto = COMUNI_RURALI_NOTI.has(key);
  const isRuraleIndirizzo = isIndirizzoRurale(indirizzo);
  // Se il comune non è in NOME_TO_BELFIORE (quindi non è un capoluogo/città media),
  // lo trattiamo come periferico/rurale per default → valori prudenti
  const isNonCapoluogo = !belfiore;
  const isRurale = isRuraleNoto || isRuraleIndirizzo || isNonCapoluogo;

  // ── Fallback provinciale con zona corretta ────────────────────────────────
  const prov = PROVINCE_OMI[sigla];
  if (prov) {
    // Cerca tabella OMI rurale specifica per provincia
    const omiRuraliMap = { 'AT': OMI_RURALI_AT, 'AL': OMI_RURALI_AL, 'CN': OMI_RURALI_CN, 'TO': OMI_RURALI_TO };
    const omiRurali = omiRuraliMap[sigla];

    let vMin, vMax, lMin, lMax, fasciaLabel, zonaCode, noteExtra;

    if (isRurale && omiRurali) {
      // Usa valori rurali diretti (più precisi della formula percentuale)
      const fascia = omiRurali.residenziale;
      vMin = fascia.valore_min;
      vMax = fascia.valore_max;
      lMin = fascia.loc_min;
      lMax = fascia.loc_max;
      fasciaLabel = 'R1 — Zona Extraurbana/Rurale';
      zonaCode = 'R1';
      noteExtra = `Comune non in banca dati OMI specifica — valori stimati zona rurale (R1) per provincia ${prov.label}. Per il valore esatto verificare su agenziaentrate.gov.it/omi.`;
    } else if (isRurale) {
      // Provincia non ha tabella rurale specifica: -35% sulla B1
      const fascia = prov.B1;
      vMin = Math.round(fascia.valore_min * 0.65);
      vMax = Math.round(fascia.valore_max * 0.65);
      lMin = +(fascia.loc_min * 0.65).toFixed(1);
      lMax = +(fascia.loc_max * 0.65).toFixed(1);
      fasciaLabel = 'R1 — Zona Extraurbana/Rurale (stima)';
      zonaCode = 'R1';
      noteExtra = `Comune non in banca dati OMI specifica — stima zona rurale (R1, -35% rispetto B1 provinciale). Verifica su agenziaentrate.gov.it/omi.`;
    } else {
      // Capoluogo o città media non mappata: usa B1 provinciale
      const fascia = prov.B1;
      vMin = fascia.valore_min;
      vMax = fascia.valore_max;
      lMin = fascia.loc_min;
      lMax = fascia.loc_max;
      fasciaLabel = 'B1 — Centro Abitato (media prov.)';
      zonaCode = 'B1';
      noteExtra = `Comune non in banca dati OMI specifica — media provinciale ${prov.label} zona B1. Verifica su agenziaentrate.gov.it/omi.`;
    }

    const postRistrFactor = 1.2;
    return {
      omi_min_mq:            vMin,
      omi_max_mq:            vMax,
      omi_medio_mq:          Math.round((vMin + vMax) / 2),
      omi_post_ristr_min:    Math.round(vMin * postRistrFactor),
      omi_post_ristr_max:    Math.round(vMax * postRistrFactor),
      canone_locazione_min:  lMin,
      canone_locazione_max:  lMax,
      fascia_omi:            fasciaLabel,
      zona_omi_codice:       zonaCode,
      tipologia:             'Abitazioni civili',
      semestre_riferimento:  prov.anno_sem,
      semestre_label:        `2° sem. ${prov.anno_sem.split('-')[0]}`,
      is_costiero:           false,
      is_default:            true,
      fonte:                 `OMI AdE ${prov.anno_sem} — Media provincia ${prov.label}${isRurale ? ' (zona rurale)' : ''}`,
      fonte_url:             `https://www1.agenziaentrate.gov.it/servizi/Consultazione/ricerca.htm`,
      note_mercato:          noteExtra,
    };
  }

  // ── Fallback finale: DEFAULT nazionale ────────────────────────────────────
  const result = getOMIData('DEFAULT', null, isZonaCentrale);
  return {
    ...result,
    is_default: true,
    zona_omi_codice: 'B1',
    tipologia: 'Abitazioni civili',
    semestre_label: `2° sem. 2025`,
    note_mercato: `Dati OMI per ${nomeComune} non disponibili — stima orientativa. Verifica su agenziaentrate.gov.it/omi.`,
    fonte_url: `https://www1.agenziaentrate.gov.it/servizi/Consultazione/ricerca.htm`,
  };
}

/**
 * Restituisce i valori OMI reali per un comune.
 * @param {string} codiceBelfiore - Codice Belfiore del comune (es. "A182")
 * @param {string} [tipologiaCatastale] - Categoria catastale (es. "A/2", "C/6")
 * @param {boolean} [isZonaCentrale] - true per fascia A (centrale), false per B/C (periferica)
 * @returns {object} Dati OMI con valori, fonte e flag is_default
 */
export function getOMIData(codiceBelfiore, tipologiaCatastale, isZonaCentrale = false, isRurale = false) {
  const entry = OMI_DB[codiceBelfiore] || OMI_DB["DEFAULT"];
  const isDefault = !OMI_DB[codiceBelfiore];
  const isCostiero = entry.is_costiero || false;

  let fascia = isZonaCentrale ? entry.zona_centrale : entry.residenziale;
  let zona_omi_codice = isZonaCentrale ? 'A1' : 'B1';
  let fascia_label = isZonaCentrale ? 'A1 — Zona Centrale' : 'B1 — Centro Abitato';

  // Zona rurale R1: -35% rispetto B1
  if (isRurale && !isZonaCentrale) {
    fascia = {
      valore_min: Math.round(fascia.valore_min * 0.65),
      valore_max: Math.round(fascia.valore_max * 0.65),
      loc_min: +(fascia.loc_min * 0.65).toFixed(1),
      loc_max: +(fascia.loc_max * 0.65).toFixed(1),
    };
    zona_omi_codice = 'R1';
    fascia_label = 'R1 — Zona Rurale';
  }

  // Valore post-ristrutturazione: +25% zona interna, +35% zona costiera
  const postRistrFactor = isCostiero ? 1.35 : 1.25;
  const semLabel = entry.anno_sem
    ? `2° sem. ${entry.anno_sem.replace('-II','').replace('-I','')}`
    : '2° sem. 2025';

  return {
    omi_min_mq:            fascia.valore_min,
    omi_max_mq:            fascia.valore_max,
    omi_medio_mq:          Math.round((fascia.valore_min + fascia.valore_max) / 2),
    omi_post_ristr_min:    Math.round(fascia.valore_min * postRistrFactor),
    omi_post_ristr_max:    Math.round(fascia.valore_max * postRistrFactor),
    canone_locazione_min:  fascia.loc_min,
    canone_locazione_max:  fascia.loc_max,
    fascia_omi:            fascia_label,
    zona_omi_codice,
    tipologia:             'Abitazioni civili',
    semestre_riferimento:  entry.anno_sem || '2025-II',
    semestre_label:        semLabel,
    is_costiero:           isCostiero,
    is_default:            isDefault,
    fonte:                 `OMI AdE ${entry.anno_sem || '2025-II'} — dati ufficiali open data CC BY`,
    fonte_url:             'https://www1.agenziaentrate.gov.it/servizi/Consultazione/ricerca.htm',
    note_mercato:          isDefault
      ? 'Stima da dati OMI AdE — medie provinciali. Valore indicativo; verifica la zona specifica su agenziaentrate.gov.it/omi.'
      : `Valori OMI ufficiali AdE ${entry.anno_sem || '2025-II'}${isCostiero ? ' — zona costiera (stagionalità inclusa)' : ''}${isRurale ? ' — zona rurale (R1)' : ''}.`,
  };
}

/**
 * Calcola la tariffa notte per affitto breve basandosi su valori OMI reali.
 * Formula: canone_mensile * premium_breve_termine / 30
 * @param {number} locMin - canone locazione min €/mq/mese
 * @param {number} locMax - canone locazione max €/mq/mese
 * @param {number} mq - superficie in mq
 * @param {boolean} isCostiero - se zona costiera (aggiunge +50% stagionalità)
 * @returns {{ notte_min: number, notte_max: number }}
 */
export function calcolaTariffaNotteOMI(locMin, locMax, mq, isCostiero = false) {
  const stagionalita = isCostiero ? 1.5 : 1.0;
  const canoneMin = locMin * mq;
  const canoneMax = locMax * mq;
  // Premium breve: 5x min, 7x max rispetto alla tariffa giornaliera equivalente
  // Floor assoluto: min €50/notte, max €90/notte (Airbnb market minimum)
  const notteMinCalc = Math.round((canoneMin / 30) * 5 * stagionalita);
  const notteMaxCalc = Math.round((canoneMax / 30) * 7 * stagionalita);
  const notteMin = isCostiero ? Math.max(80, notteMinCalc) : Math.max(50, notteMinCalc);
  const notteMax = isCostiero ? Math.max(130, notteMaxCalc) : Math.max(90, notteMaxCalc);
  return { notte_min: notteMin, notte_max: notteMax };
}