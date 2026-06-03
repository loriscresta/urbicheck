/**
 * ntaDatabase.js — UrbiCheck NTA Database v3.0
 * Database PRG/PGT/PUC per comuni italiani (Piemonte, Liguria, Lombardia)
 * Lookup case-insensitive su nome comune + zona
 */

// ── NTA_LOOKUP: chiave "Comune|Zona" — dati PRG/PGT/PUC ufficiali ─────────
export const NTA_LOOKUP = {
  // ── PIEMONTE — Alessandria (AL) ─────────────────────────────────────────
  "Alessandria|Zona A":   { IF:"esistente", RC:"esistente", H:"esistente", DC:"0m", DF:"0m", DS:"0m (allineamento)", nome:"Centro storico", strumento:"PRG", note:"Interventi subordinati a Piano di Recupero o progetto unitario. Solo restauro/risanamento conservativo — no nuova volumetria." },
  "Alessandria|Zona B1":  { IF:"2.0", RC:"50%", H:"20m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata centrale", strumento:"PRG", note:"" },
  "Alessandria|Zona B2":  { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Alessandria|Zona B3":  { IF:"1.0", RC:"40%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale periferica consolidata", strumento:"PRG", note:"" },
  "Alessandria|Zona C1":  { IF:"0.8", RC:"35%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PRG", note:"Parcheggi: 1 posto auto ogni 80 mq SLP. Piani attuativi richiesti." },
  "Alessandria|Zona C2":  { IF:"1.0", RC:"40%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale intensiva", strumento:"PRG", note:"Piani attuativi richiesti." },
  "Alessandria|Zona D":   { IF:"—", RC:"60%", H:"10m", DC:"5m", DF:"10m", DS:"10m", nome:"Produttiva/artigianale", strumento:"PRG", note:"IF libero nei limiti di RC e H." },
  "Alessandria|Zona E":   { IF:"0.03", RC:"3%", H:"7.5m", DC:"10m", DF:"—", DS:"—", nome:"Agricola", strumento:"PRG", note:"Solo residenza rurale per conduttori del fondo." },
  "Alessandria|Zona F":   { IF:"variabile", RC:"variabile", H:"variabile", DC:"5m", DF:"10m", DS:"5m", nome:"Attrezzature pubbliche e servizi", strumento:"PRG", note:"IF e H definiti dal progetto unitario approvato." },
  "Alessandria|Zona residenziale": { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B2 tipica)", strumento:"PRG", note:"Verificare sub-zona specifica con CDU." },
  "Alessandria|DEFAULT":  { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B2 tipica)", strumento:"PRG", note:"Valori PRG Alessandria — Zona B2. Verificare sub-zona con CDU ufficiale." },

  // ── PIEMONTE — Torino (TO) ──────────────────────────────────────────────
  "Torino|Zona A":        { IF:"esistente", RC:"esistente", H:"esistente", DC:"0m (allineamento)", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PRG", note:"Solo restauro/risanamento conservativo. Piano di Recupero obbligatorio." },
  "Torino|Zona B":        { IF:"2.0", RC:"50%", H:"20m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Torino|Zona B1":       { IF:"2.0", RC:"50%", H:"20m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata centrale", strumento:"PRG", note:"" },
  "Torino|Zona B2":       { IF:"1.5", RC:"45%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata pericentrale", strumento:"PRG", note:"" },
  "Torino|Zona C1":       { IF:"0.7", RC:"35%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PRG", note:"Piani attuativi obbligatori." },
  "Torino|Zona C2":       { IF:"1.0", RC:"40%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale intensiva", strumento:"PRG", note:"Piani attuativi obbligatori." },
  "Torino|Zona D":        { IF:"—", RC:"60%", H:"10m", DC:"5m", DF:"10m", DS:"10m", nome:"Produttiva/artigianale", strumento:"PRG", note:"" },
  "Torino|Zona E":        { IF:"0.03", RC:"3%", H:"7.5m", DC:"10m", DF:"—", DS:"—", nome:"Agricola", strumento:"PRG", note:"Solo uso agricolo e residenza rurale." },
  "Torino|Zona residenziale": { IF:"2.0", RC:"50%", H:"20m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Verificare sub-zona specifica con CDU." },
  "Torino|DEFAULT":       { IF:"2.0", RC:"50%", H:"20m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Valori PRG Torino 2013 — Zona B. Verificare sub-zona con CDU." },

  // ── PIEMONTE — Novara (NO) ──────────────────────────────────────────────
  "Novara|Zona A":        { IF:"esistente", RC:"esistente", H:"esistente", DC:"0m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PRG", note:"Solo recupero conservativo. Nessun aumento volumetrico." },
  "Novara|Zona B":        { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Novara|Zona B1":       { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata centrale", strumento:"PRG", note:"" },
  "Novara|Zona B2":       { IF:"1.2", RC:"45%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata periferica", strumento:"PRG", note:"" },
  "Novara|Zona C":        { IF:"0.8", RC:"35%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PRG", note:"Piani attuativi obbligatori." },
  "Novara|Zona D":        { IF:"—", RC:"60%", H:"10m", DC:"5m", DF:"10m", DS:"10m", nome:"Produttiva/artigianale", strumento:"PRG", note:"" },
  "Novara|Zona E":        { IF:"0.03", RC:"3%", H:"7.5m", DC:"10m", DF:"—", DS:"—", nome:"Agricola", strumento:"PRG", note:"" },
  "Novara|Zona residenziale": { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Verificare sub-zona con CDU." },
  "Novara|DEFAULT":       { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Valori PRG Novara. Verificare sub-zona con CDU ufficiale." },

  // ── PIEMONTE — Galliate (NO) ─────────────────────────────────────────────
  "Galliate|Zona A":      { IF:"esistente", RC:"esistente", H:"esistente", DC:"0m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PRG", note:"Solo interventi di recupero e restauro." },
  "Galliate|Zona B":      { IF:"1.5", RC:"50%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Galliate|Zona C":      { IF:"0.8", RC:"35%", H:"9m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PRG", note:"Piani attuativi obbligatori." },
  "Galliate|Zona D":      { IF:"—", RC:"60%", H:"8m", DC:"5m", DF:"10m", DS:"10m", nome:"Produttiva/artigianale", strumento:"PRG", note:"" },
  "Galliate|Zona E":      { IF:"0.03", RC:"3%", H:"7.5m", DC:"10m", DF:"—", DS:"—", nome:"Agricola", strumento:"PRG", note:"" },
  "Galliate|Zona residenziale": { IF:"1.5", RC:"50%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Verificare sub-zona con CDU." },
  "Galliate|DEFAULT":     { IF:"1.5", RC:"50%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Valori PRG Galliate. Verificare sub-zona con CDU." },

  // ── PIEMONTE — Vercelli (VC) ────────────────────────────────────────────
  "Vercelli|Zona A":      { IF:"esistente", RC:"esistente", H:"esistente", DC:"0m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PRG", note:"Solo recupero conservativo." },
  "Vercelli|Zona B":      { IF:"1.5", RC:"45%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Vercelli|Zona C":      { IF:"0.7", RC:"35%", H:"9m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PRG", note:"Piani attuativi obbligatori." },
  "Vercelli|Zona residenziale": { IF:"1.5", RC:"45%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Verificare sub-zona con CDU." },
  "Vercelli|DEFAULT":     { IF:"1.5", RC:"45%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Valori PRG Vercelli. Verificare sub-zona con CDU." },

  // ── PIEMONTE — Asti (AT) ────────────────────────────────────────────────
  "Asti|Zona A":          { IF:"esistente", RC:"esistente", H:"esistente", DC:"0m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PRG", note:"Solo recupero conservativo." },
  "Asti|Zona B":          { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Asti|Zona C":          { IF:"0.8", RC:"35%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PRG", note:"Piani attuativi obbligatori." },
  "Asti|Zona residenziale": { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Verificare sub-zona con CDU." },
  "Asti|DEFAULT":         { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Valori PRG Asti. Verificare sub-zona con CDU." },

  // ── PIEMONTE — Calamandrana (AT) — PRG vigente Variante strutturale LR 56/77 ──
  // NTA ufficiali: https://www.comune.calamandrana.at.it/s3prod/uploads/ckeditor/attachments/1/8/2/3/4/NTA.pdf
  "Calamandrana|R.N":     { IF:"esistente", RC:"40%", H:"8m",  DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale nuclei storici (R.N)", strumento:"PRG Calamandrana", note:"Solo interventi sul patrimonio esistente. Verificare NTA comunali." },
  "Calamandrana|R.R":     { IF:"1.0", RC:"40%", H:"9m",  DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale recente (R.R)", strumento:"PRG Calamandrana", note:"Zone residenziali di completamento recente. LR 56/77 e s.m.i." },
  "Calamandrana|Ba":      { IF:"1.0", RC:"45%", H:"9m",  DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale completamento A (Ba)", strumento:"PRG Calamandrana", note:"Verificare schede normative allegate alle NTA." },
  "Calamandrana|Bb":      { IF:"0.8", RC:"40%", H:"8m",  DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale completamento B (Bb)", strumento:"PRG Calamandrana", note:"Verificare schede normative allegate alle NTA." },
  "Calamandrana|Ca":      { IF:"0.6", RC:"35%", H:"8m",  DC:"5m", DF:"10m", DS:"5m", nome:"Nuova espansione residenziale A (Ca)", strumento:"PRG Calamandrana", note:"Piani esecutivi obbligatori." },
  "Calamandrana|Cb":      { IF:"0.5", RC:"30%", H:"7m",  DC:"5m", DF:"10m", DS:"5m", nome:"Nuova espansione residenziale B (Cb)", strumento:"PRG Calamandrana", note:"Piani esecutivi obbligatori." },
  "Calamandrana|D":       { IF:"—",   RC:"55%", H:"8m",  DC:"5m", DF:"10m", DS:"10m",nome:"Produttiva/artigianale (D)", strumento:"PRG Calamandrana", note:"IF libero nei limiti di RC e H — verificare NTA." },
  "Calamandrana|Zona residenziale": { IF:"1.0", RC:"40%", H:"9m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (R.R/Ba — verificare zona)", strumento:"PRG Calamandrana", note:"Verificare la zona esatta con CDU al Comune." },
  "Calamandrana|DEFAULT": { IF:"1.0", RC:"40%", H:"9m",  DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale — PRG Calamandrana (LR 56/77)", strumento:"PRG Calamandrana", note:"⚠ Richiedere CDU al Comune per la zona specifica. NTA: https://www.comune.calamandrana.at.it/s3prod/uploads/ckeditor/attachments/1/8/2/3/4/NTA.pdf" },

  // ── PIEMONTE — Cuneo (CN) ───────────────────────────────────────────────
  "Cuneo|Zona A":         { IF:"esistente", RC:"esistente", H:"esistente", DC:"0m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PRG", note:"Solo recupero conservativo." },
  "Cuneo|Zona B":         { IF:"1.5", RC:"50%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Cuneo|Zona C":         { IF:"0.7", RC:"35%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PRG", note:"Piani attuativi obbligatori." },
  "Cuneo|Zona residenziale": { IF:"1.5", RC:"50%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Verificare sub-zona con CDU." },
  "Cuneo|DEFAULT":        { IF:"1.5", RC:"50%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Valori PRG Cuneo. Verificare sub-zona con CDU." },

  // ── PIEMONTE — Biella (BI) ──────────────────────────────────────────────
  "Biella|Zona A":        { IF:"esistente", RC:"esistente", H:"esistente", DC:"0m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PRG", note:"Solo recupero conservativo." },
  "Biella|Zona B":        { IF:"1.2", RC:"45%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Biella|Zona C":        { IF:"0.6", RC:"30%", H:"9m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PRG", note:"Piani attuativi obbligatori." },
  "Biella|Zona residenziale": { IF:"1.2", RC:"45%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Verificare sub-zona con CDU." },
  "Biella|DEFAULT":       { IF:"1.2", RC:"45%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PRG", note:"Valori PRG Biella. Verificare sub-zona con CDU." },

  // ── PIEMONTE — Verbania (VB) ────────────────────────────────────────────
  "Verbania|Zona B":      { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Verbania|Zona residenziale": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Verbania)", strumento:"PRG", note:"" },
  "Verbania|DEFAULT":     { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Verbania)", strumento:"PRG", note:"Valori di zona residenziale consolidata. Verificare sub-zona con CDU." },

  // ── LOMBARDIA — Milano (MI) ─────────────────────────────────────────────
  "Milano|Zona A":        { IF:"esistente", RC:"70%", H:"esistente", DC:"esistente", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PGT", note:"Solo recupero conservativo." },
  "Milano|Zona R1":       { IF:"2.5", RC:"55%", H:"25m", DC:"5m", DF:"10m", DS:"5m", nome:"Tessuto urbano consolidato denso", strumento:"PGT", note:"Zone centrali e semicentrali dense." },
  "Milano|Zona R2":       { IF:"1.5", RC:"50%", H:"20m", DC:"5m", DF:"10m", DS:"5m", nome:"Tessuto urbano consolidato", strumento:"PGT", note:"" },
  "Milano|Zona R3":       { IF:"1.0", RC:"40%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Tessuto residenziale periferico", strumento:"PGT", note:"" },
  "Milano|Zona P":        { IF:"—", RC:"65%", H:"12m", DC:"5m", DF:"10m", DS:"10m", nome:"Produttivo/artigianale", strumento:"PGT", note:"" },
  "Milano|Zona residenziale": { IF:"1.5", RC:"50%", H:"20m", DC:"5m", DF:"10m", DS:"5m", nome:"Tessuto urbano consolidato (R2)", strumento:"PGT", note:"Verificare sub-zona con CDU." },
  "Milano|DEFAULT":       { IF:"1.5", RC:"50%", H:"20m", DC:"5m", DF:"10m", DS:"5m", nome:"Tessuto urbano consolidato (R2)", strumento:"PGT", note:"Valori PGT Milano — Zona R2. Verificare sub-zona con CDU." },

  // ── LOMBARDIA — Pavia (PV) ──────────────────────────────────────────────
  "Pavia|Zona A":         { IF:"esistente", RC:"50%", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PGT", note:"Solo recupero conservativo." },
  "Pavia|Ambito R1":      { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Ambito residenziale consolidato centrale", strumento:"PGT", note:"" },
  "Pavia|Ambito R2":      { IF:"1.0", RC:"40%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Ambito residenziale consolidato", strumento:"PGT", note:"" },
  "Pavia|Ambito R3":      { IF:"0.7", RC:"35%", H:"10m", DC:"5m", DF:"10m", DS:"5m", nome:"Ambito residenziale periferico", strumento:"PGT", note:"Piani attuativi obbligatori." },
  "Pavia|Ambito P":       { IF:"—", RC:"60%", H:"10m", DC:"5m", DF:"10m", DS:"10m", nome:"Produttivo/artigianale", strumento:"PGT", note:"" },
  "Pavia|Zona E":         { IF:"0.03", RC:"3%", H:"7.5m", DC:"10m", DF:"—", DS:"—", nome:"Agricola", strumento:"PGT", note:"Solo uso agricolo." },
  "Pavia|Zona residenziale": { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Ambito R1 residenziale consolidato", strumento:"PGT", note:"Verificare ambito specifico con CDU." },
  "Pavia|DEFAULT":        { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Ambito R1 residenziale consolidato", strumento:"PGT", note:"Valori PGT Pavia — Ambito R1. Verificare con CDU ufficiale." },

  // ── LOMBARDIA — Bergamo (BG) ────────────────────────────────────────────
  "Bergamo|Zona A":       { IF:"esistente", RC:"60%", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico (Città Alta)", strumento:"PGT", note:"Recupero conservativo obbligatorio." },
  "Bergamo|Zona B":       { IF:"2.0", RC:"50%", H:"20m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PGT", note:"" },
  "Bergamo|Zona C":       { IF:"0.8", RC:"35%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PGT", note:"Piani attuativi obbligatori." },
  "Bergamo|Zona residenziale": { IF:"2.0", RC:"50%", H:"20m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PGT", note:"Verificare sub-zona con CDU." },
  "Bergamo|DEFAULT":      { IF:"2.0", RC:"50%", H:"20m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PGT", note:"Valori PGT Bergamo — Zona B. Verificare sub-zona con CDU." },

  // ── LOMBARDIA — Brescia (BS) ────────────────────────────────────────────
  "Brescia|Zona A":       { IF:"esistente", RC:"60%", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PGT", note:"Solo recupero conservativo." },
  "Brescia|ATR":          { IF:"1.5", RC:"50%", H:"18m", DC:"5m", DF:"10m", DS:"5m", nome:"Ambito di Trasformazione Residenziale centrale", strumento:"PGT", note:"" },
  "Brescia|ATR periferica": { IF:"0.8", RC:"35%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Ambito di Trasformazione Residenziale periferico", strumento:"PGT", note:"Piani attuativi obbligatori." },
  "Brescia|Zona B1":      { IF:"1.5", RC:"50%", H:"18m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata centrale", strumento:"PGT", note:"" },
  "Brescia|Zona B2":      { IF:"1.0", RC:"45%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PGT", note:"" },
  "Brescia|Zona residenziale": { IF:"1.5", RC:"50%", H:"18m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B1 tipica)", strumento:"PGT", note:"Verificare sub-zona con CDU." },
  "Brescia|DEFAULT":      { IF:"1.5", RC:"50%", H:"18m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B1 tipica)", strumento:"PGT", note:"Valori PGT Brescia — ATR/B1. Verificare sub-zona con CDU." },

  // ── LOMBARDIA — Como (CO) ───────────────────────────────────────────────
  "Como|Zona A":          { IF:"esistente", RC:"esistente", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PGT", note:"Solo recupero conservativo." },
  "Como|Zona B":          { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PGT", note:"" },
  "Como|Zona C":          { IF:"0.7", RC:"35%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PGT", note:"Piani attuativi obbligatori." },
  "Como|Zona residenziale": { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PGT", note:"Verificare sub-zona con CDU." },
  "Como|DEFAULT":         { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PGT", note:"Valori PGT Como. Verificare sub-zona con CDU." },

  // ── LOMBARDIA — Varese (VA) ─────────────────────────────────────────────
  "Varese|Zona A":        { IF:"esistente", RC:"esistente", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PGT", note:"Solo recupero conservativo." },
  "Varese|Zona B":        { IF:"1.5", RC:"50%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PGT", note:"" },
  "Varese|Zona C":        { IF:"0.6", RC:"30%", H:"10m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PGT", note:"Piani attuativi obbligatori." },
  "Varese|Zona residenziale": { IF:"1.5", RC:"50%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PGT", note:"Verificare sub-zona con CDU." },
  "Varese|DEFAULT":       { IF:"1.5", RC:"50%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PGT", note:"Valori PGT Varese. Verificare sub-zona con CDU." },

  // ── LOMBARDIA — Monza (MB) ──────────────────────────────────────────────
  "Monza|Zona A":         { IF:"esistente", RC:"esistente", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PGT", note:"Solo recupero conservativo." },
  "Monza|Zona R":         { IF:"1.5", RC:"50%", H:"18m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PGT", note:"" },
  "Monza|Zona C":         { IF:"0.8", RC:"35%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PGT", note:"Piani attuativi obbligatori." },
  "Monza|Zona residenziale": { IF:"1.5", RC:"50%", H:"18m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (R tipica)", strumento:"PGT", note:"Verificare sub-zona con CDU." },
  "Monza|DEFAULT":        { IF:"1.5", RC:"50%", H:"18m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (R tipica)", strumento:"PGT", note:"Valori PGT Monza. Verificare sub-zona con CDU." },

  // ── LOMBARDIA — Lodi (LO) ───────────────────────────────────────────────
  "Lodi|Zona A":          { IF:"esistente", RC:"esistente", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PGT", note:"Solo recupero conservativo." },
  "Lodi|Zona B":          { IF:"1.5", RC:"45%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PGT", note:"" },
  "Lodi|Zona C":          { IF:"0.7", RC:"35%", H:"10m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PGT", note:"Piani attuativi obbligatori." },
  "Lodi|Zona residenziale": { IF:"1.5", RC:"45%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PGT", note:"Verificare sub-zona con CDU." },
  "Lodi|DEFAULT":         { IF:"1.5", RC:"45%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PGT", note:"Valori PGT Lodi. Verificare sub-zona con CDU." },

  // ── LOMBARDIA — altri capoluoghi ────────────────────────────────────────
  "Cremona|Zona B":       { IF:"2.0", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PGT", note:"" },
  "Cremona|Zona residenziale": { IF:"2.0", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale PGT Cremona", strumento:"PGT", note:"" },
  "Cremona|DEFAULT":      { IF:"2.0", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale PGT Cremona", strumento:"PGT", note:"Verificare sub-zona con CDU." },
  "Lecco|Zona B":         { IF:"1.8", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PGT", note:"" },
  "Lecco|Zona residenziale": { IF:"1.8", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale PGT Lecco", strumento:"PGT", note:"" },
  "Lecco|DEFAULT":        { IF:"1.8", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale PGT Lecco", strumento:"PGT", note:"Verificare sub-zona con CDU." },
  "Mantova|Zona A":       { IF:"esistente", RC:"55%", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PGT", note:"Zona UNESCO." },
  "Mantova|Zona B":       { IF:"2.0", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PGT", note:"" },
  "Mantova|Zona residenziale": { IF:"2.0", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale PGT Mantova", strumento:"PGT", note:"" },
  "Mantova|DEFAULT":      { IF:"2.0", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale PGT Mantova", strumento:"PGT", note:"Verificare sub-zona con CDU." },
  "Sondrio|Zona B":       { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PGT", note:"Vincoli paesaggistici alpini." },
  "Sondrio|Zona residenziale": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale PGT Sondrio", strumento:"PGT", note:"" },
  "Sondrio|DEFAULT":      { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale PGT Sondrio", strumento:"PGT", note:"Verificare sub-zona con CDU." },

  // ── LIGURIA — Genova (GE) ───────────────────────────────────────────────
  "Genova|Zona A":        { IF:"esistente", RC:"esistente", H:"esistente ±2m", DC:"5m (spesso derogato)", DF:"10m", DS:"0m (fronte strada)", nome:"Centro storico (Caruggi e nuclei)", strumento:"PUC", note:"Recupero conservativo. Disciplina specifica per rioni storici." },
  "Genova|Zona B":        { IF:"2.0", RC:"55%", H:"22m", DC:"5m", DF:"10m", DS:"5m", nome:"Tessuto urbano consolidato", strumento:"PUC", note:"" },
  "Genova|Zona C":        { IF:"1.0", RC:"40%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PUC", note:"Piani attuativi obbligatori." },
  "Genova|Zona D":        { IF:"—", RC:"60%", H:"12m", DC:"5m", DF:"10m", DS:"10m", nome:"Produttivo/artigianale", strumento:"PUC", note:"" },
  "Genova|Zona E":        { IF:"0.03", RC:"3%", H:"7.5m", DC:"10m", DF:"—", DS:"—", nome:"Agricola", strumento:"PUC", note:"" },
  "Genova|TU (Tessuto Urbano)": { IF:"2.0–3.5", RC:"60–70%", H:"esistente ±2m", DC:"5m", DF:"10m", DS:"0m (fronte strada)", nome:"Tessuto urbano denso consolidato", strumento:"PUC", note:"Disciplina specifica per rioni storici." },
  "Genova|RA (Residenziale aperto)": { IF:"0.8–1.2", RC:"30–40%", H:"7.5–10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale aperto collinare/periferico", strumento:"PUC", note:"" },
  "Genova|Zona residenziale": { IF:"2.0", RC:"55%", H:"22m", DC:"5m", DF:"10m", DS:"5m", nome:"Tessuto urbano consolidato (B tipica)", strumento:"PUC", note:"Verificare sub-zona con CDU." },
  "Genova|DEFAULT":       { IF:"2.0", RC:"55%", H:"22m", DC:"5m", DF:"10m", DS:"5m", nome:"Tessuto urbano consolidato (B tipica)", strumento:"PUC", note:"Valori PUC Genova 2015. Verificare sub-zona con CDU." },

  // ── LIGURIA — Savona (SV) ───────────────────────────────────────────────
  "Savona|Zona A":        { IF:"esistente", RC:"esistente", H:"esistente", DC:"0m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PUC", note:"Solo recupero conservativo." },
  "Savona|Zona B":        { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PUC", note:"" },
  "Savona|Zona C":        { IF:"0.8", RC:"40%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PUC", note:"Piani attuativi obbligatori." },
  "Savona|Zona residenziale": { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PUC", note:"Verificare sub-zona con CDU." },
  "Savona|DEFAULT":       { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PUC", note:"Valori PUC Savona. Verificare sub-zona con CDU." },

  // ── LIGURIA — La Spezia (SP) ────────────────────────────────────────────
  "La Spezia|Zona A":     { IF:"esistente", RC:"esistente", H:"esistente", DC:"0m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PUC", note:"Solo recupero conservativo." },
  "La Spezia|Zona B":     { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PUC", note:"" },
  "La Spezia|Zona C":     { IF:"0.8", RC:"35%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PUC", note:"Piani attuativi obbligatori." },
  "La Spezia|Zona residenziale": { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PUC", note:"Verificare sub-zona con CDU." },
  "La Spezia|DEFAULT":    { IF:"1.5", RC:"50%", H:"16m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PUC", note:"Valori PUC La Spezia. Verificare sub-zona con CDU." },

  // ── LIGURIA — Imperia (IM) ──────────────────────────────────────────────
  "Imperia|Zona A":       { IF:"esistente", RC:"esistente", H:"esistente", DC:"0m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PUC", note:"Solo recupero conservativo." },
  "Imperia|Zona B":       { IF:"1.2", RC:"45%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PUC", note:"" },
  "Imperia|Zona C":       { IF:"0.6", RC:"35%", H:"10m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PUC", note:"Piani attuativi obbligatori." },
  "Imperia|Zona residenziale": { IF:"1.2", RC:"45%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PUC", note:"Verificare sub-zona con CDU." },
  "Imperia|DEFAULT":      { IF:"1.2", RC:"45%", H:"14m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PUC", note:"Valori PUC Imperia. Verificare sub-zona con CDU." },

  // ── LIGURIA — Lavagna (GE) ──────────────────────────────────────────────
  "Lavagna|Zona A":       { IF:"esistente", RC:"50%", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PUC", note:"Interventi di recupero." },
  "Lavagna|Zona B":       { IF:"1.5", RC:"50%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PUC", note:"" },
  "Lavagna|Zona C":       { IF:"0.8", RC:"35%", H:"9m", DC:"5m", DF:"10m", DS:"5m", nome:"Espansione residenziale", strumento:"PUC", note:"Piani attuativi obbligatori." },
  "Lavagna|Zona residenziale": { IF:"1.5", RC:"50%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PUC", note:"Verificare sub-zona con CDU." },
  "Lavagna|DEFAULT":      { IF:"1.5", RC:"50%", H:"12m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata (B tipica)", strumento:"PUC", note:"Valori PUC Lavagna. Verificare sub-zona con CDU." },

  // ── LIGURIA — altri comuni ───────────────────────────────────────────────
  "Chiavari|Zona A":      { IF:"esistente", RC:"60%", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PUC", note:"" },
  "Chiavari|Zona B":      { IF:"2.0", RC:"50%", H:"12.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PUC", note:"" },
  "Chiavari|Zona C":      { IF:"0.8", RC:"35%", H:"9.0m", DC:"5m", DF:"10m", DS:"8m", nome:"Espansione residenziale", strumento:"PUC", note:"" },
  "Chiavari|Zona residenziale": { IF:"2.0", RC:"50%", H:"12.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PUC Chiavari)", strumento:"PUC", note:"" },
  "Chiavari|DEFAULT":     { IF:"2.0", RC:"50%", H:"12.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PUC Chiavari)", strumento:"PUC", note:"Verificare sub-zona con CDU." },
  "Rapallo|Zona A":       { IF:"esistente", RC:"55%", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PUC", note:"" },
  "Rapallo|Zona B":       { IF:"1.5", RC:"45%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PUC", note:"" },
  "Rapallo|Zona residenziale": { IF:"1.5", RC:"45%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PUC Rapallo)", strumento:"PUC", note:"" },
  "Rapallo|DEFAULT":      { IF:"1.5", RC:"45%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PUC Rapallo)", strumento:"PUC", note:"Verificare sub-zona con CDU." },
  "Santa Margherita Ligure|Zona B": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PUC", note:"" },
  "Santa Margherita Ligure|Zona residenziale": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PUC SML)", strumento:"PUC", note:"" },
  "Santa Margherita Ligure|DEFAULT": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PUC SML)", strumento:"PUC", note:"Verificare sub-zona con CDU." },
  "Sestri Levante|Zona B": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PUC", note:"" },
  "Sestri Levante|Zona residenziale": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PUC Sestri Levante)", strumento:"PUC", note:"" },
  "Sestri Levante|DEFAULT": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PUC Sestri Levante)", strumento:"PUC", note:"Verificare sub-zona con CDU." },
  "Recco|Zona B":         { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Recco|Zona residenziale": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Recco)", strumento:"PRG", note:"" },
  "Recco|DEFAULT":        { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Recco)", strumento:"PRG", note:"Verificare sub-zona con CDU." },
  "Albenga|Zona A":       { IF:"esistente", RC:"50%", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico medievale", strumento:"PRG", note:"" },
  "Albenga|Zona B":       { IF:"2.0", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Albenga|Zona C":       { IF:"0.8", RC:"35%", H:"7.5m", DC:"5m", DF:"10m", DS:"8m", nome:"Espansione residenziale", strumento:"PRG", note:"" },
  "Albenga|Zona residenziale": { IF:"2.0", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Albenga)", strumento:"PRG", note:"" },
  "Albenga|DEFAULT":      { IF:"2.0", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Albenga)", strumento:"PRG", note:"Verificare sub-zona con CDU." },
  "Finale Ligure|Zona B": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Finale Ligure|Zona residenziale": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Finale Ligure)", strumento:"PRG", note:"" },
  "Finale Ligure|DEFAULT": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Finale Ligure)", strumento:"PRG", note:"Verificare sub-zona con CDU." },
  "Sanremo|Zona A":       { IF:"esistente", RC:"60%", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico (La Pigna)", strumento:"PUC", note:"" },
  "Sanremo|Zona B":       { IF:"2.0", RC:"50%", H:"12.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PUC", note:"" },
  "Sanremo|Zona residenziale": { IF:"2.0", RC:"50%", H:"12.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PUC Sanremo)", strumento:"PUC", note:"" },
  "Sanremo|DEFAULT":      { IF:"2.0", RC:"50%", H:"12.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PUC Sanremo)", strumento:"PUC", note:"Verificare sub-zona con CDU." },
  "Bordighera|Zona B":    { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Bordighera|Zona residenziale": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Bordighera)", strumento:"PRG", note:"" },
  "Bordighera|DEFAULT":   { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Bordighera)", strumento:"PRG", note:"Verificare sub-zona con CDU." },
  "Lerici|Zona B":        { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PUC", note:"" },
  "Lerici|Zona residenziale": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PUC Lerici)", strumento:"PUC", note:"" },
  "Lerici|DEFAULT":       { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PUC Lerici)", strumento:"PUC", note:"Verificare sub-zona con CDU." },
  "Sarzana|Zona A":       { IF:"esistente", RC:"50%", H:"esistente", DC:"5m", DF:"10m", DS:"0m", nome:"Centro storico", strumento:"PRG", note:"" },
  "Sarzana|Zona B":       { IF:"2.0", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Sarzana|Zona residenziale": { IF:"2.0", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Sarzana)", strumento:"PRG", note:"" },
  "Sarzana|DEFAULT":      { IF:"2.0", RC:"50%", H:"10.5m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Sarzana)", strumento:"PRG", note:"Verificare sub-zona con CDU." },
  "Ventimiglia|Zona B":   { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale consolidata", strumento:"PRG", note:"" },
  "Ventimiglia|Zona residenziale": { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Ventimiglia)", strumento:"PRG", note:"" },
  "Ventimiglia|DEFAULT":  { IF:"1.5", RC:"45%", H:"9.0m", DC:"5m", DF:"10m", DS:"5m", nome:"Residenziale (PRG Ventimiglia)", strumento:"PRG", note:"Verificare sub-zona con CDU." },
};

// ── Lookup NTA flat per comune (zona residenziale B tipica) ─────────────────
export const INDICI_NTA = {
  // Piemonte
  "Alessandria":             { IF:"1.5 mc/mq", RC:"50%", Hmax:"16 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Alessandria — NTA Zona B2" },
  "Torino":                  { IF:"2.0 mc/mq", RC:"50%", Hmax:"20 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Torino 2013 — NTA Zona B" },
  "Cuneo":                   { IF:"1.5 mc/mq", RC:"50%", Hmax:"14 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Cuneo — NTA Zona B" },
  "Asti":                    { IF:"1.5 mc/mq", RC:"50%", Hmax:"16 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Asti — NTA Zona B" },
  "Calamandrana":            { IF:"1.0 mc/mq", RC:"40%", Hmax:"9 m",   Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Calamandrana — NTA Zone R.R/Ba (LR 56/77)" },
  "Novara":                  { IF:"1.5 mc/mq", RC:"50%", Hmax:"16 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Novara — NTA Zona B" },
  "Vercelli":                { IF:"1.5 mc/mq", RC:"45%", Hmax:"14 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Vercelli — NTA Zona B" },
  "Biella":                  { IF:"1.2 mc/mq", RC:"45%", Hmax:"12 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Biella — NTA Zona B" },
  "Verbania":                { IF:"1.5 mc/mq", RC:"45%", Hmax:"9 m",   Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Verbania — NTA Zona B" },
  "Galliate":                { IF:"1.5 mc/mq", RC:"50%", Hmax:"12 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Galliate — NTA Zona B" },
  // Liguria
  "Genova":                  { IF:"2.0 mc/mq", RC:"55%", Hmax:"22 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PUC", fonte:"PUC Genova 2015 — NTA Zona B/Tessuto Urbano" },
  "La Spezia":               { IF:"1.5 mc/mq", RC:"50%", Hmax:"16 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PUC", fonte:"PUC La Spezia — NTA Zona B" },
  "Savona":                  { IF:"1.5 mc/mq", RC:"50%", Hmax:"16 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PUC", fonte:"PUC Savona — NTA Zona B" },
  "Imperia":                 { IF:"1.2 mc/mq", RC:"45%", Hmax:"14 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PUC", fonte:"PUC Imperia — NTA Zona B" },
  "Lavagna":                 { IF:"1.5 mc/mq", RC:"50%", Hmax:"12 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PUC", fonte:"PUC Lavagna — NTA Zona B" },
  "Chiavari":                { IF:"2.0 mc/mq", RC:"50%", Hmax:"12 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PUC", fonte:"PUC Chiavari — NTA Zona B" },
  "Rapallo":                 { IF:"1.5 mc/mq", RC:"45%", Hmax:"10.5 m",Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PUC", fonte:"PUC Rapallo — NTA Zona B" },
  "Santa Margherita Ligure": { IF:"1.5 mc/mq", RC:"45%", Hmax:"9 m",   Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PUC", fonte:"PUC Santa Margherita Ligure — NTA Zona B" },
  "Sestri Levante":          { IF:"1.5 mc/mq", RC:"45%", Hmax:"9 m",   Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PUC", fonte:"PUC Sestri Levante — NTA Zona B" },
  "Recco":                   { IF:"1.5 mc/mq", RC:"45%", Hmax:"9 m",   Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Recco — NTA Zona B" },
  "Albenga":                 { IF:"2.0 mc/mq", RC:"50%", Hmax:"10.5 m",Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Albenga — NTA Zona B" },
  "Finale Ligure":           { IF:"1.5 mc/mq", RC:"45%", Hmax:"9 m",   Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Finale Ligure — NTA Zona B" },
  "Sanremo":                 { IF:"2.0 mc/mq", RC:"50%", Hmax:"12 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PUC", fonte:"PUC Sanremo — NTA Zona B" },
  "Bordighera":              { IF:"1.5 mc/mq", RC:"45%", Hmax:"9 m",   Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Bordighera — NTA Zona B" },
  "Lerici":                  { IF:"1.5 mc/mq", RC:"45%", Hmax:"9 m",   Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PUC", fonte:"PUC Lerici — NTA Zona B" },
  "Sarzana":                 { IF:"2.0 mc/mq", RC:"50%", Hmax:"10.5 m",Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Sarzana — NTA Zona B" },
  "Ventimiglia":             { IF:"1.5 mc/mq", RC:"45%", Hmax:"9 m",   Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PRG", fonte:"PRG Ventimiglia — NTA Zona B" },
  // Lombardia
  "Milano":                  { IF:"1.5 mc/mq", RC:"50%", Hmax:"20 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PGT", fonte:"PGT Milano 2019 — NTA Zona R2" },
  "Brescia":                 { IF:"1.5 mc/mq", RC:"50%", Hmax:"18 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PGT", fonte:"PGT Brescia — NTA ATR/B1" },
  "Bergamo":                 { IF:"2.0 mc/mq", RC:"50%", Hmax:"20 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PGT", fonte:"PGT Bergamo — NTA Zona B" },
  "Varese":                  { IF:"1.5 mc/mq", RC:"50%", Hmax:"14 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PGT", fonte:"PGT Varese — NTA Zona B" },
  "Como":                    { IF:"1.5 mc/mq", RC:"50%", Hmax:"16 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PGT", fonte:"PGT Como — NTA Zona B" },
  "Mantova":                 { IF:"2.0 mc/mq", RC:"50%", Hmax:"10.5 m",Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PGT", fonte:"PGT Mantova — NTA Zona B" },
  "Cremona":                 { IF:"2.0 mc/mq", RC:"50%", Hmax:"10.5 m",Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PGT", fonte:"PGT Cremona — NTA Zona B" },
  "Pavia":                   { IF:"1.5 mc/mq", RC:"50%", Hmax:"16 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PGT", fonte:"PGT Pavia — NTA Ambito R1" },
  "Lodi":                    { IF:"1.5 mc/mq", RC:"45%", Hmax:"14 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PGT", fonte:"PGT Lodi — NTA Zona B" },
  "Lecco":                   { IF:"1.8 mc/mq", RC:"50%", Hmax:"10.5 m",Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PGT", fonte:"PGT Lecco — NTA Zona B" },
  "Sondrio":                 { IF:"1.2 mc/mq", RC:"40%", Hmax:"9 m",   Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PGT", fonte:"PGT Sondrio — NTA Zona B" },
  "Monza":                   { IF:"1.5 mc/mq", RC:"50%", Hmax:"18 m",  Dc:"5 m", Df:"10 m", Ds:"5 m", strumento:"PGT", fonte:"PGT Monza — NTA Zona R" },
};

// ── Mappa provinciale Liguria: comune → capoluogo NTA ──────────────────────
export const LIGURIA_PROVINCE_MAP = {
  "Arenzano":"Genova","Avegno":"Genova","Bargagli":"Genova","Bogliasco":"Genova","Borzonasca":"Genova","Busalla":"Genova","Camogli":"Genova","Campo Ligure":"Genova","Campomorone":"Genova","Casarza Ligure":"Genova","Casella":"Genova","Castiglione Chiavarese":"Genova","Ceranesi":"Genova","Chiavari":"Genova","Cicagna":"Genova","Cogoleto":"Genova","Cogorno":"Genova","Coreglia Ligure":"Genova","Crocefieschi":"Genova","Davagna":"Genova","Fascia":"Genova","Favale di Malvaro":"Genova","Fontanigorda":"Genova","Genova":"Genova","Gorreto":"Genova","Isola del Cantone":"Genova","Lavagna":"Genova","Leivi":"Genova","Lorsica":"Genova","Lumarzo":"Genova","Mele":"Genova","Mezzanego":"Genova","Mignanego":"Genova","Moconesi":"Genova","Moneglia":"Genova","Montebruno":"Genova","Montoggio":"Genova","Ne":"Genova","Neirone":"Genova","Orero":"Genova","Pieve Ligure":"Genova","Portofino":"Genova","Propata":"Genova","Rapallo":"Genova","Recco":"Genova","Rezzoaglio":"Genova","Ronco Scrivia":"Genova","Rondanina":"Genova","Rossiglione":"Genova","Rovegno":"Genova","San Colombano Certenoli":"Genova","Santa Margherita Ligure":"Genova","Santo Stefano d'Aveto":"Genova","Savignone":"Genova","Serra Riccò":"Genova","Sestri Levante":"Genova","Sori":"Genova","Tiglieto":"Genova","Torriglia":"Genova","Tribogna":"Genova","Uscio":"Genova","Valbrevenna":"Genova","Vobbia":"Genova","Zoagli":"Genova",
  "Alassio":"Savona","Albenga":"Savona","Albissola Marina":"Savona","Albisola Superiore":"Savona","Altare":"Savona","Andora":"Savona","Arnasco":"Savona","Balestrino":"Savona","Bardineto":"Savona","Bergeggi":"Savona","Boissano":"Savona","Borghetto Santo Spirito":"Savona","Borgio Verezzi":"Savona","Cairo Montenotte":"Savona","Calice Ligure":"Savona","Calizzano":"Savona","Carcare":"Savona","Casanova Lerrone":"Savona","Castelbianco":"Savona","Castelvecchio di Rocca Barbena":"Savona","Celle Ligure":"Savona","Cengio":"Savona","Ceriale":"Savona","Cisano sul Neva":"Savona","Cosseria":"Savona","Dego":"Savona","Erli":"Savona","Finale Ligure":"Savona","Garlenda":"Savona","Giustenice":"Savona","Giusvalla":"Savona","Laigueglia":"Savona","Loano":"Savona","Magliolo":"Savona","Mallare":"Savona","Massimino":"Savona","Millesimo":"Savona","Mioglia":"Savona","Murialdo":"Savona","Nasino":"Savona","Noli":"Savona","Onzo":"Savona","Orco Feglino":"Savona","Osiglia":"Savona","Pallare":"Savona","Pietra Ligure":"Savona","Plodio":"Savona","Pontinvrea":"Savona","Quiliano":"Savona","Rialto":"Savona","Roccavignale":"Savona","Sassello":"Savona","Savona":"Savona","Spotorno":"Savona","Stella":"Savona","Stellanello":"Savona","Testico":"Savona","Toirano":"Savona","Tovo San Giacomo":"Savona","Urbe":"Savona","Vado Ligure":"Savona","Varazze":"Savona","Vendone":"Savona","Vezzi Portio":"Savona","Villanova d'Albenga":"Savona","Zuccarello":"Savona",
  "Ameglia":"La Spezia","Arcola":"La Spezia","Beverino":"La Spezia","Bolano":"La Spezia","Bonassola":"La Spezia","Borghetto di Vara":"La Spezia","Brugnato":"La Spezia","Calice al Cornoviglio":"La Spezia","Carro":"La Spezia","Carrodano":"La Spezia","Castelnuovo Magra":"La Spezia","Deiva Marina":"La Spezia","Follo":"La Spezia","Framura":"La Spezia","La Spezia":"La Spezia","Lerici":"La Spezia","Levanto":"La Spezia","Maissana":"La Spezia","Monterosso al Mare":"La Spezia","Ortonovo":"La Spezia","Pignone":"La Spezia","Portovenere":"La Spezia","Riccò del Golfo di Spezia":"La Spezia","Riomaggiore":"La Spezia","Rocchetta di Vara":"La Spezia","Santo Stefano di Magra":"La Spezia","Sarzana":"La Spezia","Sesta Godano":"La Spezia","Vezzano Ligure":"La Spezia","Vernazza":"La Spezia","Zignago":"La Spezia",
  "Airole":"Imperia","Apricale":"Imperia","Aquila d'Arroscia":"Imperia","Armo":"Imperia","Aurigo":"Imperia","Badalucco":"Imperia","Bajardo":"Imperia","Bordighera":"Imperia","Borghetto d'Arroscia":"Imperia","Borgomaro":"Imperia","Camporosso":"Imperia","Caravonica":"Imperia","Carpasio":"Imperia","Castellaro":"Imperia","Castel Vittorio":"Imperia","Ceriana":"Imperia","Cervo":"Imperia","Cesio":"Imperia","Chiusanico":"Imperia","Chiusavecchia":"Imperia","Cipressa":"Imperia","Civezza":"Imperia","Cosio d'Arroscia":"Imperia","Costarainera":"Imperia","Diano Arentino":"Imperia","Diano Castello":"Imperia","Diano Marina":"Imperia","Diano San Pietro":"Imperia","Dolceacqua":"Imperia","Dolcedo":"Imperia","Imperia":"Imperia","Isolabona":"Imperia","Lucinasco":"Imperia","Mendatica":"Imperia","Molini di Triora":"Imperia","Montalto Ligure":"Imperia","Montegrosso Pian Latte":"Imperia","Olivetta San Michele":"Imperia","Ospedaletti":"Imperia","Perinaldo":"Imperia","Pietrabruna":"Imperia","Pieve di Teco":"Imperia","Pigna":"Imperia","Pompeiana":"Imperia","Pontedassio":"Imperia","Pornassio":"Imperia","Prelà":"Imperia","Ranzo":"Imperia","Rezzo":"Imperia","Riva Ligure":"Imperia","Rocchetta Nervina":"Imperia","San Bartolomeo al Mare":"Imperia","San Biagio della Cima":"Imperia","San Lorenzo al Mare":"Imperia","Sanremo":"Imperia","Santo Stefano al Mare":"Imperia","Seborga":"Imperia","Soldano":"Imperia","Taggia":"Imperia","Terzorio":"Imperia","Triora":"Imperia","Vallecrosia":"Imperia","Vasia":"Imperia","Ventimiglia":"Imperia","Vessalico":"Imperia","Villa Faraldi":"Imperia",
};

// ── Mappa sigla provincia → capoluogo ───────────────────────────────────────
export const PROVINCE_CAPOLUOGHI = {
  'AL': { capoluogo:'Alessandria', regione:'Piemonte' },
  'AT': { capoluogo:'Asti',        regione:'Piemonte' },
  'BI': { capoluogo:'Biella',      regione:'Piemonte' },
  'CN': { capoluogo:'Cuneo',       regione:'Piemonte' },
  'NO': { capoluogo:'Novara',      regione:'Piemonte' },
  'TO': { capoluogo:'Torino',      regione:'Piemonte' },
  'VB': { capoluogo:'Verbania',    regione:'Piemonte' },
  'VC': { capoluogo:'Vercelli',    regione:'Piemonte' },
  'GE': { capoluogo:'Genova',      regione:'Liguria'  },
  'SV': { capoluogo:'Savona',      regione:'Liguria'  },
  'IM': { capoluogo:'Imperia',     regione:'Liguria'  },
  'SP': { capoluogo:'La Spezia',   regione:'Liguria'  },
  'MI': { capoluogo:'Milano',      regione:'Lombardia'},
  'BS': { capoluogo:'Brescia',     regione:'Lombardia'},
  'BG': { capoluogo:'Bergamo',     regione:'Lombardia'},
  'VA': { capoluogo:'Varese',      regione:'Lombardia'},
  'CO': { capoluogo:'Como',        regione:'Lombardia'},
  'MN': { capoluogo:'Mantova',     regione:'Lombardia'},
  'CR': { capoluogo:'Cremona',     regione:'Lombardia'},
  'PV': { capoluogo:'Pavia',       regione:'Lombardia'},
  'LO': { capoluogo:'Lodi',        regione:'Lombardia'},
  'LC': { capoluogo:'Lecco',       regione:'Lombardia'},
  'SO': { capoluogo:'Sondrio',     regione:'Lombardia'},
  'MB': { capoluogo:'Monza',       regione:'Lombardia'},
};

export const CDU_LINKS = {
  "Alessandria": "https://www.comune.alessandria.it/servizi/certificato-destinazione-urbanistica",
  "Torino":      "https://www.comune.torino.it/suapps/sportello/sportello.shtml",
  "Genova":      "https://servizionline.comune.genova.it/",
  "La Spezia":   "https://www.comune.laspezia.it/servizi/certificato-destinazione-urbanistica/",
  "Savona":      "https://www.comune.savona.it/it/servizi/urbanistica",
  "Cuneo":       "https://www.comune.cuneo.it/urbanistica.html",
  "Asti":        "https://www.comune.asti.it/urbanistica",
  "Novara":      "https://www.comune.novara.it/it/certificato-destinazione-urbanistica",
};

// ── Lookup NTA case-insensitive ─────────────────────────────────────────────
const _ntaKeys = Object.keys(NTA_LOOKUP);

function normComune(s) {
  return (s || '').trim().toLowerCase();
}

export function lookupNTA(comune, zonaFromNTA) {
  if (!comune) return null;
  const cn = normComune(comune);
  // Trova tutte le chiavi appartenenti a questo comune (case-insensitive)
  const comuneKeys = _ntaKeys.filter(k => normComune(k.split('|')[0]) === cn);
  if (!comuneKeys.length) return null;

  if (zonaFromNTA) {
    const zn = zonaFromNTA.trim().toLowerCase();
    // 1. Match esatto zona (case-insensitive)
    const exact = comuneKeys.find(k => k.split('|')[1].toLowerCase() === zn);
    if (exact) return { ...NTA_LOOKUP[exact], source:'DB_NTA', zona: zonaFromNTA };
    // 2. Match fuzzy zona
    for (const key of comuneKeys) {
      const keyZona = key.split('|')[1];
      if (keyZona === 'DEFAULT') continue;
      const kz = keyZona.toLowerCase();
      if (zn.includes(kz) || kz.includes(zn)) {
        return { ...NTA_LOOKUP[key], source:'DB_NTA_FUZZY', zona: keyZona };
      }
    }
  }
  // 3. DEFAULT del comune
  const defaultKey = comuneKeys.find(k => k.split('|')[1] === 'DEFAULT');
  if (defaultKey) return { ...NTA_LOOKUP[defaultKey], source:'DB_NTA_DEFAULT', zona:'DEFAULT' };
  return null;
}

// ── Lookup flat per comune (INDICI_NTA) case-insensitive ─────────────────────
const _ntaFlatKeys = Object.keys(INDICI_NTA);

export function findInNta(nome) {
  if (!nome) return null;
  const n = normComune(nome);
  const found = _ntaFlatKeys.find(k => k.toLowerCase() === n);
  return found ? INDICI_NTA[found] : null;
}

// ── Estrai zona urbanistica dai dati WFS ─────────────────────────────────────
export function extractZonaWfs(query) {
  const wfs = query?.report_data?.wfs_liguria;
  const prg = wfs?.risultati?.zona_urbanistica;
  if (!prg) return null;
  const raw = prg.zona_codice || prg.destinazione_uso || prg.messaggio || '';
  const match = String(raw).match(/\b(Zona\s+[A-Z][0-9]?(?:\.[0-9])?|TU|RA|RE|RF|RU|RS)\b/i);
  return match ? match[0].trim() : null;
}