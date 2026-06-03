/**
 * geocodeAddress v4 — Nominatim con validazione comune, Google per urbano
 * Fix: rimuove "n." dal nome frazione, valida che il risultato sia vicino al comune
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { indirizzo, comune, provincia } = await req.json();
    if (!comune) return Response.json({ error: 'comune richiesto' }, { status: 400 });

    const GOOGLE_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const sigla = (provincia || '').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);

    // Frazione/rurale
    const isRurale = indirizzo && /fraz[.\s]|frazione|loc[.\s]|localit[àa]|borgata|cascina|regione\s/i.test(indirizzo);

    // ── Haversine: distanza km tra due coordinate ─────────────────────────────
    function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    // ── Recupera centroide del comune (per validazione) ────────────────────────
    async function getComuneCentroid(): Promise<{lat: number, lng: number} | null> {
      try {
        const q = sigla ? `${comune}, ${sigla}, Italia` : `${comune}, Italia`;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=it`;
        const res = await fetch(url, { headers: { 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)' }, signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      } catch (_e) {}
      return null;
    }

    // ── Nominatim helper ──────────────────────────────────────────────────────
    async function tryNominatim(queries: string[], comuneCentroid: {lat:number,lng:number} | null, maxKm = 30): Promise<object | null> {
      for (const q of queries) {
        try {
          console.log('[geocodeAddress] Nominatim:', q);
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=it&addressdetails=1`;
          const res = await fetch(url, { headers: { 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)' }, signal: AbortSignal.timeout(8000) });
          const data = await res.json();
          if (!data?.length) continue;

          // Filtra per distanza dal comune (evita false positivi lontani)
          let candidates = data;
          if (comuneCentroid) {
            candidates = data.filter((r: any) => {
              const d = haversineKm(comuneCentroid.lat, comuneCentroid.lng, parseFloat(r.lat), parseFloat(r.lon));
              return d < maxKm;
            });
          }
          if (!candidates.length) {
            console.log('[geocodeAddress] Nominatim: tutti i risultati fuori dal raggio', maxKm, 'km dal comune');
            continue;
          }

          const notRoad = candidates.filter((r: any) => !['road','house','building'].includes(r.type));
          const best = notRoad[0] || candidates[0];
          console.log('[geocodeAddress] Nominatim ok:', best.lat, best.lon, best.display_name, best.type);
          return { lat: parseFloat(best.lat), lng: parseFloat(best.lon),
            location_type: 'NOMINATIM_' + (best.type || 'place').toUpperCase(),
            formatted_address: best.display_name, source: 'nominatim' };
        } catch(e) { console.warn('[geocodeAddress] Nominatim err:', e); }
      }
      return null;
    }

    // ── Google Maps helper ────────────────────────────────────────────────────
    async function tryGoogle(q: string, comuneCentroid: {lat:number,lng:number} | null): Promise<object | null> {
      if (!GOOGLE_KEY) return null;
      try {
        console.log('[geocodeAddress] Google:', q);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${GOOGLE_KEY}&language=it&region=it`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data.status !== 'OK' || !data.results?.length) return null;
        const r = data.results.find((x: any) =>
          x.address_components?.some((ac: any) => ac.types.includes('country') && ac.short_name === 'IT')
        ) || data.results[0];
        const loc = r.geometry.location;
        const lt = r.geometry.location_type;

        // Valida distanza dal comune
        if (comuneCentroid) {
          const d = haversineKm(comuneCentroid.lat, comuneCentroid.lng, loc.lat, loc.lng);
          if (d > 50) {
            console.log('[geocodeAddress] Google: risultato troppo lontano dal comune:', d.toFixed(1), 'km — scartato');
            return null;
          }
        }

        console.log('[geocodeAddress] Google result:', loc.lat, loc.lng, lt);
        // FIX v6: per frazioni/rurali accetta QUALSIASI risultato Google (ROOFTOP, GEOMETRIC_CENTER, APPROXIMATE)
        // Il filtro location_type causava il fallback al centroide comunale sbagliato per le frazioni
        const isRuraleAddress = /fraz|frazione|loc\.|borgh|cascina|regione\s|localit/i.test(q || '');
        if (lt === 'ROOFTOP' || lt === 'RANGE_INTERPOLATED' || isRuraleAddress) {
          return { lat: loc.lat, lng: loc.lng, location_type: lt,
            formatted_address: r.formatted_address, source: 'google' };
        }
        return null;
      } catch(e) { return null; }
    }

    // Ottieni centroide del comune per validazione
    const comuneCentroid = await getComuneCentroid();
    console.log('[geocodeAddress] Comune centroid:', comuneCentroid);

    let result = null;

    if (isRurale && indirizzo) {
      // Pulizia: rimuovi numero civico E "n." dal nome frazione
      const nomeFrazione = indirizzo
        .replace(/\s*n[.°]?\s*\d+\s*$/i, '')   // rimuove "n. 16" o "n°16"
        .replace(/\s*\d+\s*$/,'')                // rimuove numero finale
        .trim();
      console.log('[geocodeAddress] nomeFrazione pulito:', nomeFrazione);

      const queries = [
        `${nomeFrazione}, ${comune}, ${sigla}, Italia`,
        `${nomeFrazione}, ${comune}, Italia`,
        `${comune}, ${sigla}, Italia`,
      ];
      result = await tryNominatim(queries, comuneCentroid, 30);

      if (!result && GOOGLE_KEY) {
        const q = sigla ? `${indirizzo}, ${comune}, ${sigla}, Italia` : `${indirizzo}, ${comune}, Italia`;
        result = await tryGoogle(q, comuneCentroid);
      }

      // Fallback finale: centroide del comune stesso
      if (!result && comuneCentroid) {
        console.log('[geocodeAddress] Fallback al centroide del comune');
        result = { lat: comuneCentroid.lat, lng: comuneCentroid.lng,
          location_type: 'COMUNE_CENTROID', formatted_address: `${comune} (${sigla})`, source: 'nominatim' };
      }
    } else if (indirizzo) {
      const q = sigla ? `${indirizzo}, ${comune}, ${sigla}, Italia` : `${indirizzo}, ${comune}, Italia`;
      result = await tryGoogle(q, comuneCentroid);
      if (!result) result = await tryNominatim([q, `${comune}, ${sigla}, Italia`], comuneCentroid, 30);
    }

    if (result) return Response.json(result);
    // Fallback: centroide del comune
    if (comuneCentroid) return Response.json({ ...comuneCentroid, location_type: 'COMUNE_FALLBACK', source: 'nominatim', formatted_address: comune });
    return Response.json({ lat: null, lng: null, error: 'Posizione non trovata' });

  } catch (error) {
    console.error('[geocodeAddress] errore:', error.message);
    return Response.json({ lat: null, lng: null, error: error.message });
  }
});
