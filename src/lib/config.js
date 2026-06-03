/**
 * Configurazione centralizzata UrbiCheck
 * Tutte le URL dei microservizi esterni sono definite qui.
 * Per modificare un endpoint basta aggiornare questo file.
 */

export const ENRICHMENT_API_URL = "https://web-production-6e951.up.railway.app";

export const ENDPOINTS = {
  analyze:      `${ENRICHMENT_API_URL}/analyze`,
  nta:          (comune) => `${ENRICHMENT_API_URL}/nta/${encodeURIComponent(comune)}`,
  parseVisura:  `${ENRICHMENT_API_URL}/parse-visura`,
  parsePerizia: `${ENRICHMENT_API_URL}/parse-perizia`,
  health:       `${ENRICHMENT_API_URL}/health`,
};
