import { metaConversionsApi } from "@/functions/metaConversionsApi";

const CONSENT_KEY = "cookie_consent";

export function hasMarketingConsent() {
  return localStorage.getItem(CONSENT_KEY) === "granted";
}

// Recupera cookie _fbp e _fbc dal browser
function getCookieValue(name) {
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]+)"));
  return match ? match[2] : undefined;
}

/**
 * Traccia un evento sia sul pixel browser che sulla CAPI server-side.
 * Solo se il consenso è stato dato.
 *
 * @param {string} eventName  es. "PageView", "Search", "Lead", "CompleteRegistration"
 * @param {object} options    { customData, email }
 */
export function trackEvent(eventName, options = {}) {
  if (!hasMarketingConsent()) return;

  const { customData = {}, email } = options;
  const event_id = crypto.randomUUID();
  const event_source_url = window.location.href;
  const event_time = Math.floor(Date.now() / 1000);

  // 1. Browser pixel
  if (typeof window.fbq !== "undefined") {
    window.fbq("track", eventName, customData, { eventID: event_id });
  }

  // 2. CAPI server-side (fire-and-forget)
  metaConversionsApi({
    event_name: eventName,
    event_id,
    event_source_url,
    event_time,
    email: email || undefined,
    custom_data: Object.keys(customData).length > 0 ? customData : undefined,
    fbp: getCookieValue("_fbp"),
    fbc: getCookieValue("_fbc"),
  }).catch((err) => console.warn("[MetaCAPI] fire-and-forget error:", err));
}