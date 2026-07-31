import React, { useEffect, useState } from "react";
import { ExternalLink, X, Copy, Check } from "lucide-react";

/**
 * InAppBrowserBanner
 * ------------------
 * Il browser interno di Facebook/Instagram (webview) è ostile alle web-app:
 * doppio caricamento, crash del bridge nativo (postMessage/oggetto Java),
 * cookie/storage tagliati. Molti utenti dall'ad si perdono lì dentro PRIMA
 * ancora di poter cercare (click->landing ~18%).
 *
 * Questo banner si mostra SOLO dentro la webview FB/IG e offre una via d'uscita
 * verso il browser vero (Chrome/Safari), dove l'app funziona in modo affidabile.
 * Su qualsiasi altro browser il componente non renderizza nulla (return null).
 */

function getUA() {
  return (navigator.userAgent || navigator.vendor || "").toString();
}

// Firme note del browser in-app di Facebook / Instagram.
// (NON usiamo il generico "; wv" perché matcherebbe tutte le WebView Android.)
function isFacebookInApp() {
  return /FBAN|FBAV|FB_IAB|FBIOS|Instagram/i.test(getUA());
}

function isAndroid() {
  return /Android/i.test(getUA());
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(getUA());
}

export default function InAppBrowserBanner() {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      if (!isFacebookInApp()) return;
      if (sessionStorage.getItem("uc_inapp_banner_dismissed") === "1") return;
      setShow(true);
    } catch (_) {}
  }, []);

  if (!show) return null;

  const currentUrl = (() => {
    try { return window.location.href; } catch (_) { return "https://urbicheck.it/"; }
  })();

  const dismiss = () => {
    try { sessionStorage.setItem("uc_inapp_banner_dismissed", "1"); } catch (_) {}
    setShow(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // Fallback legacy per webview che bloccano clipboard API
      try {
        const ta = document.createElement("textarea");
        ta.value = currentUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (_) {}
    }
  };

  const openInBrowser = () => {
    try {
      if (isAndroid()) {
        // Chrome via Android intent. Se Chrome non c'è, l'utente resta dov'è
        // (mostriamo comunque le istruzioni + copia link come fallback).
        const noScheme = currentUrl.replace(/^https?:\/\//i, "");
        window.location.href =
          "intent://" + noScheme + "#Intent;scheme=https;package=com.android.chrome;end";
        return;
      }
      if (isIOS()) {
        // Prova ad aprire Chrome iOS se installato; altrimenti resta l'istruzione Safari.
        window.location.href = currentUrl.replace(/^https:\/\//i, "googlechromes://").replace(/^http:\/\//i, "googlechrome://");
        return;
      }
      window.open(currentUrl, "_blank");
    } catch (_) {}
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2147483647,
        background: "#1A3A6B",
        color: "#fff",
        borderBottom: "3px solid #B33A2A",
        boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
        fontFamily: "'IBM Plex Mono', monospace",
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", maxWidth: "640px", margin: "0 auto" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, lineHeight: 1.3 }}>
            Stai usando il browser interno di Facebook
          </div>
          <div style={{ fontSize: "0.72rem", opacity: 0.9, marginTop: "2px", lineHeight: 1.35 }}>
            {isIOS()
              ? "Per far funzionare la ricerca, apri in Safari: tocca ⋯ in alto a destra → “Apri in browser esterno”."
              : "Per far funzionare la ricerca, apri nel browser vero (Chrome)."}
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={openInBrowser}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#B33A2A",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 12px",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <ExternalLink style={{ width: 14, height: 14 }} />
              {isIOS() ? "Apri nel browser" : "Apri in Chrome"}
            </button>

            <button
              type="button"
              onClick={copyLink}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.5)",
                borderRadius: "6px",
                padding: "8px 12px",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
              {copied ? "Link copiato" : "Copia link"}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Chiudi"
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.8)",
            cursor: "pointer",
            padding: "2px",
            flexShrink: 0,
          }}
        >
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>
    </div>
  );
}
