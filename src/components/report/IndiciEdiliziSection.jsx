/**
 * IndiciEdiliziSection v2.0 — Lookup NTA a 3 livelli di fallback:
 *   1. Lookup diretto per comune (DB NTA v1.1)
 *   2. Fallback provinciale Liguria (capoluogo di provincia)
 *   3. Stima AI per comuni non coperti
 */
import React, { useState, useEffect } from "react";
import { BarChart3, ExternalLink, Info, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReportSection from "@/components/report/ReportSection";
import { base44 } from "@/api/base44Client";

// ── Lookup NTA flat per comune (v1.1 — 2026-05-22) ─────────────────────────
// Valori "Zona residenziale" (zona B consolidata tipica).
const INDICI_NTA = {
  // Piemonte
  "Alessandria":            { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Alessandria — NTA Zone B" },
  "Torino":                 { IF: "2.0 m³/m²", RC: "50%", Hmax: "14.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Torino 1995 — NTA Zone 2.2" },
  "Cuneo":                  { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Cuneo — NTA Zone B" },
  "Asti":                   { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Asti — NTA Zone B" },
  "Novara":                 { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Novara — NTA Zone B2" },
  "Vercelli":               { IF: "1.8 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Vercelli — NTA Zone B" },
  "Biella":                 { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Biella — NTA Zone B" },
  "Verbania":               { IF: "1.5 m³/m²", RC: "45%", Hmax: "9.0 m",  Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Verbania — NTA Zone B" },
  // Liguria — Capoluoghi
  "Genova":                 { IF: "2.0 m³/m²", RC: "55%", Hmax: "12.0 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PUC", fonte: "PUC Genova 2015 — NTA Tessuto Urbano" },
  "La Spezia":              { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PUC", fonte: "PUC La Spezia — NTA Zone residenziale" },
  "Savona":                 { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Savona — NTA Zone B" },
  "Imperia":                { IF: "1.8 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Imperia — NTA Zone B" },
  // Liguria — Levante
  "Lavagna":                { IF: "1.5 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Lavagna — NTA Zone B" },
  "Chiavari":               { IF: "2.0 m³/m²", RC: "50%", Hmax: "12.0 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PUC", fonte: "PUC Chiavari — NTA Zone B" },
  "Rapallo":                { IF: "1.5 m³/m²", RC: "45%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PUC", fonte: "PUC Rapallo — NTA Zone B" },
  "Santa Margherita Ligure":{ IF: "1.5 m³/m²", RC: "45%", Hmax: "9.0 m",  Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PUC", fonte: "PUC Santa Margherita Ligure — NTA Zone B" },
  "Sestri Levante":         { IF: "1.5 m³/m²", RC: "45%", Hmax: "9.0 m",  Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PUC", fonte: "PUC Sestri Levante — NTA Zone B" },
  "Recco":                  { IF: "1.5 m³/m²", RC: "45%", Hmax: "9.0 m",  Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Recco — NTA Zone B" },
  // Liguria — Ponente
  "Albenga":                { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Albenga — NTA Zone B" },
  "Finale Ligure":          { IF: "1.5 m³/m²", RC: "45%", Hmax: "9.0 m",  Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Finale Ligure — NTA Zone B" },
  "Sanremo":                { IF: "2.0 m³/m²", RC: "50%", Hmax: "12.0 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PUC", fonte: "PUC Sanremo — NTA Zone B" },
  "Bordighera":             { IF: "1.5 m³/m²", RC: "45%", Hmax: "9.0 m",  Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Bordighera — NTA Zone B" },
  // Liguria — La Spezia / Val di Magra
  "Lerici":                 { IF: "1.5 m³/m²", RC: "45%", Hmax: "9.0 m",  Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PUC", fonte: "PUC Lerici — NTA Zone B" },
  "Sarzana":                { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Sarzana — NTA Zone B" },
  "Ventimiglia":            { IF: "1.5 m³/m²", RC: "45%", Hmax: "9.0 m",  Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PRG", fonte: "PRG Ventimiglia — NTA Zone B" },
  // Lombardia — Capoluoghi di provincia (zona residenziale B/B2 — PGT vigente)
  "Milano":                 { IF: "2.5 m³/m²", RC: "55%", Hmax: "16.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PGT", fonte: "PGT Milano 2019 — NTA Tessuto Urbano Consolidato" },
  "Brescia":                { IF: "2.0 m³/m²", RC: "50%", Hmax: "12.0 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PGT", fonte: "PGT Brescia — NTA Zone Residenziali B" },
  "Bergamo":                { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PGT", fonte: "PGT Bergamo — NTA Zone B" },
  "Varese":                 { IF: "1.5 m³/m²", RC: "45%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PGT", fonte: "PGT Varese — NTA Zone Residenziali" },
  "Como":                   { IF: "1.5 m³/m²", RC: "45%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PGT", fonte: "PGT Como — NTA Zone B" },
  "Mantova":                { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PGT", fonte: "PGT Mantova — NTA Zone Residenziali B" },
  "Cremona":                { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PGT", fonte: "PGT Cremona — NTA Zone B" },
  "Pavia":                  { IF: "2.0 m³/m²", RC: "50%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PGT", fonte: "PGT Pavia — NTA Zone Residenziali" },
  "Lodi":                   { IF: "1.5 m³/m²", RC: "45%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PGT", fonte: "PGT Lodi — NTA Zone B" },
  "Lecco":                  { IF: "1.5 m³/m²", RC: "45%", Hmax: "10.5 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PGT", fonte: "PGT Lecco — NTA Zone Residenziali" },
  "Sondrio":                { IF: "1.2 m³/m²", RC: "40%", Hmax: "9.0 m",  Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PGT", fonte: "PGT Sondrio — NTA Zone B" },
  "Monza":                  { IF: "2.0 m³/m²", RC: "50%", Hmax: "12.0 m", Dc: "5 m", Df: "10 m", Ds: "5 m", strumento: "PGT", fonte: "PGT Monza — NTA Zone Residenziali B" },
};

// ── Mappa provinciale Liguria: comune → capoluogo NTA ──────────────────────
const LIGURIA_PROVINCE_MAP = {
  // Provincia di Genova
  "Arenzano":"Genova","Avegno":"Genova","Bargagli":"Genova","Bogliasco":"Genova",
  "Borzonasca":"Genova","Busalla":"Genova","Camogli":"Genova","Campo Ligure":"Genova",
  "Campomorone":"Genova","Casarza Ligure":"Genova","Casella":"Genova",
  "Castiglione Chiavarese":"Genova","Ceranesi":"Genova","Chiavari":"Genova",
  "Cicagna":"Genova","Cogoleto":"Genova","Cogorno":"Genova","Coreglia Ligure":"Genova",
  "Crocefieschi":"Genova","Davagna":"Genova","Fascia":"Genova","Favale di Malvaro":"Genova",
  "Fontanigorda":"Genova","Genova":"Genova","Gorreto":"Genova","Isola del Cantone":"Genova",
  "Lavagna":"Genova","Leivi":"Genova","Lorsica":"Genova","Lumarzo":"Genova","Mele":"Genova",
  "Mezzanego":"Genova","Mignanego":"Genova","Moconesi":"Genova","Moneglia":"Genova",
  "Montebruno":"Genova","Montoggio":"Genova","Ne":"Genova","Neirone":"Genova",
  "Orero":"Genova","Pieve Ligure":"Genova","Portofino":"Genova","Propata":"Genova",
  "Rapallo":"Genova","Recco":"Genova","Rezzoaglio":"Genova","Ronco Scrivia":"Genova",
  "Rondanina":"Genova","Rossiglione":"Genova","Rovegno":"Genova",
  "San Colombano Certenoli":"Genova","Santa Margherita Ligure":"Genova",
  "Santo Stefano d'Aveto":"Genova","Savignone":"Genova","Serra Riccò":"Genova",
  "Sestri Levante":"Genova","Sori":"Genova","Tiglieto":"Genova","Torriglia":"Genova",
  "Tribogna":"Genova","Uscio":"Genova","Valbrevenna":"Genova","Vobbia":"Genova","Zoagli":"Genova",
  // Provincia di Savona
  "Alassio":"Savona","Albenga":"Savona","Albissola Marina":"Savona","Albisola Superiore":"Savona",
  "Altare":"Savona","Andora":"Savona","Arnasco":"Savona","Balestrino":"Savona",
  "Bardineto":"Savona","Bergeggi":"Savona","Boissano":"Savona",
  "Borghetto Santo Spirito":"Savona","Borgio Verezzi":"Savona","Cairo Montenotte":"Savona",
  "Calice Ligure":"Savona","Calizzano":"Savona","Carcare":"Savona",
  "Casanova Lerrone":"Savona","Castelbianco":"Savona",
  "Castelvecchio di Rocca Barbena":"Savona","Celle Ligure":"Savona","Cengio":"Savona",
  "Ceriale":"Savona","Cisano sul Neva":"Savona","Cosseria":"Savona","Dego":"Savona",
  "Erli":"Savona","Finale Ligure":"Savona","Garlenda":"Savona","Giustenice":"Savona",
  "Giusvalla":"Savona","Laigueglia":"Savona","Loano":"Savona","Magliolo":"Savona",
  "Mallare":"Savona","Massimino":"Savona","Millesimo":"Savona","Mioglia":"Savona",
  "Murialdo":"Savona","Nasino":"Savona","Noli":"Savona","Onzo":"Savona",
  "Orco Feglino":"Savona","Osiglia":"Savona","Pallare":"Savona","Pietra Ligure":"Savona",
  "Plodio":"Savona","Pontinvrea":"Savona","Quiliano":"Savona","Rialto":"Savona",
  "Roccavignale":"Savona","Sassello":"Savona","Savona":"Savona","Spotorno":"Savona",
  "Stella":"Savona","Stellanello":"Savona","Testico":"Savona","Toirano":"Savona",
  "Tovo San Giacomo":"Savona","Urbe":"Savona","Vado Ligure":"Savona","Varazze":"Savona",
  "Vendone":"Savona","Vezzi Portio":"Savona","Villanova d'Albenga":"Savona","Zuccarello":"Savona",
  // Provincia di La Spezia
  "Ameglia":"La Spezia","Arcola":"La Spezia","Beverino":"La Spezia","Bolano":"La Spezia",
  "Bonassola":"La Spezia","Borghetto di Vara":"La Spezia","Brugnato":"La Spezia",
  "Calice al Cornoviglio":"La Spezia","Carro":"La Spezia","Carrodano":"La Spezia",
  "Castelnuovo Magra":"La Spezia","Deiva Marina":"La Spezia","Follo":"La Spezia",
  "Framura":"La Spezia","La Spezia":"La Spezia","Lerici":"La Spezia","Levanto":"La Spezia",
  "Maissana":"La Spezia","Monterosso al Mare":"La Spezia","Ortonovo":"La Spezia",
  "Pignone":"La Spezia","Portovenere":"La Spezia","Riccò del Golfo di Spezia":"La Spezia",
  "Riomaggiore":"La Spezia","Rocchetta di Vara":"La Spezia",
  "Santo Stefano di Magra":"La Spezia","Sarzana":"La Spezia","Sesta Godano":"La Spezia",
  "Vezzano Ligure":"La Spezia","Vernazza":"La Spezia","Zignago":"La Spezia",
  // Provincia di Imperia
  "Airole":"Imperia","Apricale":"Imperia","Aquila d'Arroscia":"Imperia","Armo":"Imperia",
  "Aurigo":"Imperia","Badalucco":"Imperia","Bajardo":"Imperia","Bordighera":"Imperia",
  "Borghetto d'Arroscia":"Imperia","Borgomaro":"Imperia","Camporosso":"Imperia",
  "Caravonica":"Imperia","Carpasio":"Imperia","Castellaro":"Imperia",
  "Castel Vittorio":"Imperia","Ceriana":"Imperia","Cervo":"Imperia","Cesio":"Imperia",
  "Chiusanico":"Imperia","Chiusavecchia":"Imperia","Cipressa":"Imperia","Civezza":"Imperia",
  "Cosio d'Arroscia":"Imperia","Costarainera":"Imperia","Diano Arentino":"Imperia",
  "Diano Castello":"Imperia","Diano Marina":"Imperia","Diano San Pietro":"Imperia",
  "Dolceacqua":"Imperia","Dolcedo":"Imperia","Imperia":"Imperia","Isolabona":"Imperia",
  "Lucinasco":"Imperia","Mendatica":"Imperia","Molini di Triora":"Imperia",
  "Montalto Ligure":"Imperia","Montegrosso Pian Latte":"Imperia",
  "Olivetta San Michele":"Imperia","Ospedaletti":"Imperia","Perinaldo":"Imperia",
  "Pietrabruna":"Imperia","Pieve di Teco":"Imperia","Pigna":"Imperia",
  "Pompeiana":"Imperia","Pontedassio":"Imperia","Pornassio":"Imperia","Prelà":"Imperia",
  "Ranzo":"Imperia","Rezzo":"Imperia","Riva Ligure":"Imperia","Rocchetta Nervina":"Imperia",
  "San Bartolomeo al Mare":"Imperia","San Biagio della Cima":"Imperia",
  "San Lorenzo al Mare":"Imperia","Sanremo":"Imperia","Santo Stefano al Mare":"Imperia",
  "Seborga":"Imperia","Soldano":"Imperia","Taggia":"Imperia","Terzorio":"Imperia",
  "Triora":"Imperia","Vallecrosia":"Imperia","Vasia":"Imperia","Ventimiglia":"Imperia",
  "Vessalico":"Imperia","Villa Faraldi":"Imperia",
};

// ── Mappa sigla provincia → capoluogo (espandibile a tutte le regioni) ──────
const PROVINCE_CAPOLUOGHI = {
  // PIEMONTE
  'AL': { capoluogo: 'Alessandria', regione: 'Piemonte' },
  'AT': { capoluogo: 'Asti',        regione: 'Piemonte' },
  'BI': { capoluogo: 'Biella',      regione: 'Piemonte' },
  'CN': { capoluogo: 'Cuneo',       regione: 'Piemonte' },
  'NO': { capoluogo: 'Novara',      regione: 'Piemonte' },
  'TO': { capoluogo: 'Torino',      regione: 'Piemonte' },
  'VB': { capoluogo: 'Verbania',    regione: 'Piemonte' },
  'VC': { capoluogo: 'Vercelli',    regione: 'Piemonte' },
  // LIGURIA
  'GE': { capoluogo: 'Genova',      regione: 'Liguria' },
  'SV': { capoluogo: 'Savona',      regione: 'Liguria' },
  'IM': { capoluogo: 'Imperia',     regione: 'Liguria' },
  'SP': { capoluogo: 'La Spezia',   regione: 'Liguria' },
  // LOMBARDIA
  'MI': { capoluogo: 'Milano',      regione: 'Lombardia' },
  'BS': { capoluogo: 'Brescia',     regione: 'Lombardia' },
  'BG': { capoluogo: 'Bergamo',     regione: 'Lombardia' },
  'VA': { capoluogo: 'Varese',      regione: 'Lombardia' },
  'CO': { capoluogo: 'Como',        regione: 'Lombardia' },
  'MN': { capoluogo: 'Mantova',     regione: 'Lombardia' },
  'CR': { capoluogo: 'Cremona',     regione: 'Lombardia' },
  'PV': { capoluogo: 'Pavia',       regione: 'Lombardia' },
  'LO': { capoluogo: 'Lodi',        regione: 'Lombardia' },
  'LC': { capoluogo: 'Lecco',       regione: 'Lombardia' },
  'SO': { capoluogo: 'Sondrio',     regione: 'Lombardia' },
  'MB': { capoluogo: 'Monza',       regione: 'Lombardia' },
};

const CDU_LINKS = {
  "Alessandria": "https://www.comune.alessandria.it/servizi/certificato-destinazione-urbanistica",
  "Torino":      "https://www.comune.torino.it/suapps/sportello/sportello.shtml",
  "Genova":      "https://servizionline.comune.genova.it/",
  "La Spezia":   "https://www.comune.laspezia.it/servizi/certificato-destinazione-urbanistica/",
  "Savona":      "https://www.comune.savona.it/it/servizi/urbanistica",
  "Cuneo":       "https://www.comune.cuneo.it/urbanistica.html",
  "Asti":        "https://www.comune.asti.it/urbanistica",
  "Novara":      "https://www.comune.novara.it/it/certificato-destinazione-urbanistica",
};

function findInNta(nome) {
  if (!nome) return null;
  return INDICI_NTA[nome] ||
    INDICI_NTA[Object.keys(INDICI_NTA).find(k => k.toLowerCase() === nome.toLowerCase().trim())] ||
    null;
}

// ── Estrai zona urbanistica dai dati WFS ────────────────────────────────────
function extractZonaWfs(query) {
  const wfs = query?.report_data?.wfs_liguria;
  const prg = wfs?.risultati?.zona_urbanistica;
  if (!prg) return null;
  const raw = prg.zona_codice || prg.destinazione_uso || prg.messaggio || '';
  const match = String(raw).match(/\b(Zona\s+[A-Z][0-9]?(?:\.[0-9])?|TU|RA|RE|RF|RU|RS)\b/i);
  return match ? match[0].trim() : null;
}

// ── Lookup sigla provincia: prima da query, poi da ComuneItalia ─────────────
async function getSiglaProvincia(comune, regione, query) {
  if (query?.sigla_provincia) return query.sigla_provincia;
  try {
    const filter = { nome: comune };
    if (regione) filter.regione = regione;
    const results = await base44.entities.ComuneItalia.filter(filter, null, 1);
    return results[0]?.sigla_provincia || null;
  } catch (_e) { return null; }
}

// ── 4-level cascade (async per AI) ─────────────────────────────────────────
async function resolveNta(comune, regione, query) {
  // Tier 1 — lookup diretto
  const direct = findInNta(comune);
  if (direct) {
    const zonaWfs = extractZonaWfs(query);
    return { ...direct, fonte_tipo: 'diretta', nomeZona: 'Zona residenziale', zonaWfs, disclaimer: null, capoluogo: null };
  }

  // Tier 1.5a — fallback da mappa provinciale Liguria (lookup statico)
  const reg = (regione || '').toLowerCase();
  if (reg.includes('liguria')) {
    const capoluogo = LIGURIA_PROVINCE_MAP[comune] ||
      LIGURIA_PROVINCE_MAP[Object.keys(LIGURIA_PROVINCE_MAP).find(k => k.toLowerCase() === comune?.toLowerCase()?.trim())];
    if (capoluogo) {
      const provincial = findInNta(capoluogo);
      if (provincial) {
        return {
          ...provincial,
          fonte_tipo: 'provinciale',
          nomeZona: 'Zona residenziale (stima provinciale)',
          capoluogo,
          disclaimer: `Valori stimati su base provinciale (${capoluogo}). Il comune di ${comune} non è ancora nel database NTA specifico. Verificare sempre con CDU ufficiale del Comune.`,
        };
      }
    }
  }

  // Tier 1.5b — lookup dinamico via ComuneItalia → PROVINCE_CAPOLUOGHI
  const sigla = await getSiglaProvincia(comune, regione, query);
  if (sigla) {
    const entry = PROVINCE_CAPOLUOGHI[sigla.toUpperCase()];
    if (entry) {
      const provincial = findInNta(entry.capoluogo);
      if (provincial) {
        return {
          ...provincial,
          fonte_tipo: 'provinciale',
          nomeZona: 'Zona residenziale (stima provinciale)',
          capoluogo: entry.capoluogo,
          disclaimer: `⚠️ Indici stimati su base provinciale (${sigla}) — Il comune di ${comune} non è ancora nel database NTA specifico. Verificare obbligatoriamente con le NTA o CDU del Comune.`,
        };
      }
    }
  }

  // Tier 2 — stima AI
  const regioneLabel = regione || 'Italia';
  try {
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un esperto di urbanistica italiana. Fornisci una stima orientativa degli indici edilizi NTA/PRG per una zona residenziale tipica nel comune di "${comune}", ${regioneLabel}, Italia. Rispondi SOLO con un oggetto JSON valido, senza testo aggiuntivo.`,
      response_json_schema: {
        type: "object",
        properties: {
          IF: { type: "string" },
          RC: { type: "string" },
          Hmax: { type: "string" },
          Dc: { type: "string" },
          Df: { type: "string" },
          Ds: { type: "string" },
          note: { type: "string" },
          strumento: { type: "string" },
        }
      }
    });
    if (aiResult?.IF) {
      return {
        IF: aiResult.IF,
        RC: aiResult.RC,
        Hmax: aiResult.Hmax,
        Dc: aiResult.Dc,
        Df: aiResult.Df,
        Ds: aiResult.Ds,
        strumento: aiResult.strumento || 'PRG/PUC',
        fonte: `Stima AI — ${comune}, ${regioneLabel}`,
        note: aiResult.note || null,
        fonte_tipo: 'ai_stima',
        nomeZona: 'Zona residenziale (stima AI)',
        capoluogo: null,
        disclaimer: `⚠️ Indici generati da intelligenza artificiale per il comune di ${comune}. Questi valori sono puramente indicativi. Richiedere le NTA ufficiali o il CDU al Comune prima di qualsiasi decisione urbanistica.`,
      };
    }
  } catch (_e) { /* AI fallita */ }

  return null;
}

// ── Sub-components ──────────────────────────────────────────────────────────
function NtaIndiceCard({ label, value }) {
  if (!value) return null;
  return (
    <div className="bg-white border border-emerald-200 rounded-lg p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="font-bold text-sm text-foreground">{value}</p>
    </div>
  );
}

function SourceBadge({ tipo, capoluogo }) {
  if (tipo === 'diretta') return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
      <CheckCircle2 className="w-3 h-3" /> Dati diretti NTA
    </span>
  );
  if (tipo === 'provinciale') return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
      <Info className="w-3 h-3" /> Stima provinciale ({capoluogo})
    </span>
  );
  if (tipo === 'ai_stima') return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
      <AlertTriangle className="w-3 h-3" /> Stima AI
    </span>
  );
  return null;
}

function DisclaimerBox({ tipo, disclaimer }) {
  if (!disclaimer) return null;
  const styles = tipo === 'ai_stima'
    ? "border-orange-300 bg-orange-50 text-orange-800"
    : "border-yellow-300 bg-yellow-50 text-yellow-800";
  return (
    <div className={`mb-3 rounded-lg border p-3 flex items-start gap-2 ${styles}`}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed">{disclaimer}</p>
    </div>
  );
}

function NtaFoundSection({ nta, comune, cduInfo, linkPrg }) {
  return (
    <>
      {nta.fonte_tipo === 'diretta' && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 leading-relaxed">
            Dati estratti dalle <strong>Norme Tecniche di Attuazione (NTA)</strong> del piano urbanistico vigente.
            Per la sub-zona precisa richiedere il CDU al Comune.
          </p>
        </div>
      )}
      <DisclaimerBox tipo={nta.fonte_tipo} disclaimer={nta.disclaimer} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <NtaIndiceCard label="Indice di Fabbricabilità (IF)" value={nta.IF} />
        <NtaIndiceCard label="Rapporto di Copertura (RC)" value={nta.RC} />
        <NtaIndiceCard label="Altezza Massima (H max)" value={nta.Hmax} />
        <NtaIndiceCard label="Distanza dai confini (Dc)" value={nta.Dc} />
        <NtaIndiceCard label="Distanza tra fabbricati (Df)" value={nta.Df} />
        <NtaIndiceCard label="Distanza dalla strada (Ds)" value={nta.Ds} />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Badge variant="outline" className="text-[10px] bg-white">
          📋 {nta.fonte}
        </Badge>
        {nta.strumento && (
          <Badge variant="outline" className="text-[10px] bg-white">
            🏛️ {nta.strumento}
          </Badge>
        )}
        {nta.nomeZona && (
          <Badge variant="outline" className="text-[10px] bg-white">
            📐 {nta.nomeZona}
          </Badge>
        )}
        {nta.zonaWfs && (
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-300">
            🗺️ WFS: {nta.zonaWfs}
          </Badge>
        )}
        <SourceBadge tipo={nta.fonte_tipo} capoluogo={nta.capoluogo} />
      </div>

      {nta.note && (
        <p className="text-xs text-muted-foreground italic mb-3">{nta.note}</p>
      )}
      {cduInfo && (
        <a href={cduInfo} target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary flex items-center gap-1 hover:underline">
          <ExternalLink className="w-3 h-3" /> 🔗 Richiedi CDU al Comune di {comune} →
        </a>
      )}
      {linkPrg && !cduInfo && (
        <a href={linkPrg} target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary flex items-center gap-1 hover:underline">
          <ExternalLink className="w-3 h-3" /> Consulta PRG Comunale →
        </a>
      )}
    </>
  );
}

function NtaNotFoundSection({ comune, cduInfo, linkPrg }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-start gap-2 mb-3">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">📍 Comune non nel database NTA</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            I dati per <strong>{comune}</strong> non sono disponibili. Richiedere il{" "}
            <strong>Certificato di Destinazione Urbanistica (CDU)</strong> al Comune per i valori ufficiali.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {cduInfo ? (
          <a href={cduInfo} target="_blank" rel="noopener noreferrer"
            className="text-primary flex items-center gap-1 hover:underline font-medium">
            <ExternalLink className="w-3 h-3" /> 🔗 Richiedi CDU al Comune di {comune} →
          </a>
        ) : (
          <a href={`https://www.google.com/search?q=CDU+certificato+destinazione+urbanistica+${encodeURIComponent(comune || '')}`}
            target="_blank" rel="noopener noreferrer"
            className="text-primary flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> 🔗 Richiedi CDU al Comune di {comune} →
          </a>
        )}
        {linkPrg && (
          <a href={linkPrg} target="_blank" rel="noopener noreferrer"
            className="text-primary flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> Geoportale Regionale
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function IndiciEdiliziSection({ indici, comune, query, report, wfsZonaUrbanistica, delay = 0.08, regione }) {
  const comuneEffettivo = comune || query?.comune || report?.comune;
  const [nta, setNta] = useState(null);
  const [loading, setLoading] = useState(true);

  const regioneEffettiva = regione || query?.regione || report?.regione || '';
  const cduInfo = CDU_LINKS[comuneEffettivo] ||
    CDU_LINKS[Object.keys(CDU_LINKS).find(k => k.toLowerCase() === comuneEffettivo?.toLowerCase()?.trim())] ||
    null;
  const linkPrg = wfsZonaUrbanistica?.link_prg_comunale;

  useEffect(() => {
    if (!comuneEffettivo) { setLoading(false); return; }
    setLoading(true);
    resolveNta(comuneEffettivo, regioneEffettiva, query)
      .then(setNta)
      .finally(() => setLoading(false));
  }, [comuneEffettivo, regioneEffettiva]);

  if (!indici) return null;

  return (
    <ReportSection icon={BarChart3} title="Indici Edilizi" delay={delay}>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Ricerca indici edilizi…
        </div>
      ) : nta ? (
        <NtaFoundSection nta={nta} comune={comuneEffettivo} cduInfo={cduInfo} linkPrg={linkPrg} />
      ) : (
        <NtaNotFoundSection comune={comuneEffettivo} cduInfo={cduInfo} linkPrg={linkPrg} />
      )}
    </ReportSection>
  );
}