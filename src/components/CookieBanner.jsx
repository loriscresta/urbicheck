import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("urbicheck_cookie_consent");
    if (!consent) setVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem("urbicheck_cookie_consent", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border"
      style={{ background: '#1A3A6B', fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-white/80 leading-relaxed text-center sm:text-left">
          UrbiCheck utilizza cookie tecnici necessari al funzionamento del servizio. Nessun cookie di profilazione.{" "}
          <Link to="/cookie" className="underline text-white/90 hover:text-white">
            Cookie Policy
          </Link>
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-white border border-white/40 hover:bg-white/10 transition-colors"
        >
          Ho capito
        </button>
      </div>
    </div>
  );
}