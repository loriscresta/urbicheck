import { metaCapi } from "@/functions/metaCapi";

const CONSENT_KEY = "cookie_consent";

export function hasMarketingConsent() {
  return localStorage.getItem(CONSENT_KEY) === "granted";
}

function getCookieValue(name) {
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]+)"));
  return match ? match[2] : undefined;
}

/**
 * Traccia un evento sia sul pixel browser (fbq) che via CAPI server-side (metaCapi).
 * Usa lo stesso event_id per la deduplicazione.
 * Invoca solo se cookie_consent = "granted".
 *
 * @param {string} eventName  es. "PageView", "Search", "Lead", "CompleteRegistration"
 * @param {object} options    { customData, email }
 */
export function trackEvent(eventName, options = {}) {
  if (!hasMarketingConsent()) return;

  const { customData = {}, email, _event_id } = options;
  // Usa event_id esterno se fornito (es. Purchase già inviato via fbq diretto), altrimenti genera uno nuovo
  const event_id = _event_id || crypto.randomUUID();
  const event_source_url = window.location.href;

  // 1. Pixel browser — stesso event_id per deduplicazione (solo se non già inviato esternamente)
  if (!_event_id && typeof window.fbq !== "undefined") {
    window.fbq("track", eventName, customData, { eventID: event_id });
  }

  // 2. CAPI server-side — stesso event_id
  metaCapi({
    event_name: eventName,
    event_id,
    event_source_url,
    email: email || undefined,
    custom_data: Object.keys(customData).length > 0 ? customData : undefined,
    fbp: getCookieValue("_fbp"),
    fbc: getCookieValue("_fbc"),
  }).catch((err) => console.warn("[metaCapi] error:", err));
}