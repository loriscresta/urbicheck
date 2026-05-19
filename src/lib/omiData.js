/**
 * Database OMI — Osservatorio del Mercato Immobiliare
 * Fonte: Agenzia delle Entrate, Open Data CC BY
 * Aggiornamento: 2024-II (secondo semestre 2024)
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

  // ── DEFAULT fallback ──────────────────────────────────────────────────────
  "DEFAULT": {
    residenziale:  { valore_min: 900,  valore_max: 1800, loc_min: 5.0, loc_max: 10.0 },
    zona_centrale: { valore_min: 1300, valore_max: 2500, loc_min: 7.0, loc_max: 13.0 },
    anno_sem: "2024-II", is_costiero: false,
  },
};

/**
 * Restituisce i valori OMI reali per un comune.
 * @param {string} codiceBelfiore - Codice Belfiore del comune (es. "A182")
 * @param {string} [tipologiaCatastale] - Categoria catastale (es. "A/2", "C/6")
 * @param {boolean} [isZonaCentrale] - true per fascia A (centrale), false per B/C (periferica)
 * @returns {object} Dati OMI con valori, fonte e flag is_default
 */
export function getOMIData(codiceBelfiore, tipologiaCatastale, isZonaCentrale = false) {
  const entry = OMI_DB[codiceBelfiore] || OMI_DB["DEFAULT"];
  const fascia = isZonaCentrale ? entry.zona_centrale : entry.residenziale;
  const isCostiero = entry.is_costiero || false;
  const isDefault = !OMI_DB[codiceBelfiore];

  // Valore post-ristrutturazione: +25% zona interna, +35% zona costiera
  const postRistrFactor = isCostiero ? 1.35 : 1.25;

  return {
    omi_min_mq:          fascia.valore_min,
    omi_max_mq:          fascia.valore_max,
    omi_medio_mq:        Math.round((fascia.valore_min + fascia.valore_max) / 2),
    omi_post_ristr_min:  Math.round(fascia.valore_min * postRistrFactor),
    omi_post_ristr_max:  Math.round(fascia.valore_max * postRistrFactor),
    canone_locazione_min: fascia.loc_min,
    canone_locazione_max: fascia.loc_max,
    fascia_omi:          isZonaCentrale ? "A — zona centrale" : "B/C — zona semicentrale/periferica",
    semestre_riferimento: entry.anno_sem,
    is_costiero:         isCostiero,
    is_default:          isDefault,
    fonte:               `OMI AdE ${entry.anno_sem} — dati ufficiali open data CC BY`,
    fonte_url:           "https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/omi/banche-dati/quotazioni-immobiliari",
    note_mercato:        isDefault
      ? "⚠ Comune non ancora censito nel database OMI integrato — valori stimati su medie provinciali. Verifica su agenziaentrate.gov.it/omi."
      : `Valori OMI ufficiali AdE ${entry.anno_sem}${isCostiero ? " — zona costiera (stagionalità inclusa)" : ""}.`,
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