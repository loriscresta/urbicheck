// geocodeAddressCascade — Geocoding a cascata: Google (primario) → Nominatim (fallback)
// La chiave Google resta lato server (env), mai esposta al browser.
// Pubblico: usato nella ricerca per indirizzo anche prima del login.
// Le coordinate restituite alimentano lookupParcelByCoords (foglio/particella) lato frontend.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    // Nessun auth: la ricerca per indirizzo è pubblica
    let body;
    try { body = await req.json(); } catch (_e) {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const address = (body?.address || '').trim();
    if (!address) return Response.json({ error: 'address richiesto' }, { status: 400 });

    const GOOGLE_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

    // ── 1) PRIMARIO: Google Geocoding API ───────────────────────────────
    if (GOOGLE_KEY) {
      try {
        const params = new URLSearchParams({
          address,
          key: GOOGLE_KEY,
          language: 'it',
          region: 'it',
          components: 'country:IT',
        });
        const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data.status === 'OK' && Array.isArray(data.results) && data.results.length) {
          // Accetta solo risultati precisi per il primario
          const precise = data.results.find((r) =>
            r.geometry?.location_type === 'ROOFTOP' ||
            r.geometry?.location_type === 'RANGE_INTERPOLATED'
          );
          if (precise) {
            const loc = precise.geometry.location;
            const comune = extractComuneFromGoogle(precise.address_components);
            console.log('[geocodeAddressCascade] Google OK:', loc.lat, loc.lng, precise.geometry.location_type, '| comune:', comune);
            return Response.json({
              found: true,
              source: 'google',
              lat: loc.lat,
              lng: loc.lng,
              location_type: precise.geometry.location_type,
              formatted_address: precise.formatted_address || null,
              comune,
            });
          }
          console.log('[geocodeAddressCascade] Google: risultato impreciso (nessun ROOFTOP/RANGE_INTERPOLATED) — passo al fallback');
        } else {
          console.log('[geocodeAddressCascade] Google status:', data.status);
        }
      } catch (e) {
        console.warn('[geocodeAddressCascade] Google error:', e.message);
      }
    } else {
      console.log('[geocodeAddressCascade] GOOGLE_MAPS_API_KEY non impostata — salto al fallback Nominatim');
    }

    // ── 2) FALLBACK: Nominatim ───────────────────────────────────────────
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=it&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)' },
        signal: AbortSignal.timeout(8000),
      });
      const arr = await res.json();
      if (Array.isArray(arr) && arr.length) {
        const r = arr[0];
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lon);
        const comune = extractComuneFromNominatim(r.address);
        console.log('[geocodeAddressCascade] Nominatim OK:', lat, lng, '| comune:', comune);
        return Response.json({
          found: true,
          source: 'nominatim',
          lat,
          lng,
          location_type: 'NOMINATIM',
          formatted_address: r.display_name || null,
          comune,
        });
      }
      console.log('[geocodeAddressCascade] Nominatim: nessun risultato');
    } catch (e) {
      console.warn('[geocodeAddressCascade] Nominatim error:', e.message);
    }

    // ── 3) Nessun risultato: il frontend mostrerà il pin sul centroide del comune ──
    return Response.json({ found: false });
  } catch (error) {
    console.error('[geocodeAddressCascade] errore:', error.message);
    return Response.json({ found: false, error: error.message }, { status: 500 });
  }
});

// Estrae il comune dai componenti Google (administrative_area_level_3 o locality)
function extractComuneFromGoogle(components) {
  if (!Array.isArray(components)) return null;
  const c = components.find((c) => c.types?.includes('administrative_area_level_3')) ||
            components.find((c) => c.types?.includes('locality')) ||
            components.find((c) => c.types?.includes('postal_town')) ||
            components.find((c) => c.types?.includes('administrative_area_level_2'));
  return c?.long_name || null;
}

function extractComuneFromNominatim(addr) {
  if (!addr) return null;
  return addr.city || addr.town || addr.village || addr.municipality || null;
}