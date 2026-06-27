import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/metaPixel";

const CONSENT_KEY = "cookie_consent";

export function loadMetaPixel() {
  if (window.fbq) return; // già caricato
  const META_PIXEL_ID = "1599024430406427";
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
}

export function getConsentStatus() {
  return localStorage.getItem(CONSENT_KEY); // "granted" | "denied" | null
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getConsentStatus();
    if (!consent) setVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "granted");
    loadMetaPixel();
    // Invia PageView via CAPI subito dopo il consenso
    setTimeout(() => trackEvent("PageView"), 500);
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, "denied");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border"
      style={{ background: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-white/80 leading-relaxed text-center sm:text-left">
          UrbiCheck usa cookie tecnici necessari al funzionamento del servizio e, previo tuo consenso, cookie di profilazione/marketing di terze parti (Meta Pixel) per finalità statistiche e pubblicitarie.{" "}
          <Link to="/cookie-policy" className="underline text-white/90 hover:text-white">
            Cookie Policy
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleReject}
            className="px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-white/80 border border-white/30 hover:bg-white/10 transition-colors"
          >
            Rifiuta
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-white border border-white/40 hover:bg-white/10 transition-colors"
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}