/**
 * geocodeAddress v3 — Nominatim PRIMA per frazioni, Google Maps per indirizzi urbani
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

    // Frazione/rurale = Nominatim prima (più preciso per luoghi italiani)
    const isRurale = indirizzo && /fraz[.\s]|frazione|loc[.\s]|localit[àa]|borgata|cascina|regione\s/i.test(indirizzo);

    // ── Nominatim helper ──────────────────────────────────────────────────────
    async function tryNominatim(queries: string[]): Promise<object | null> {
      for (const q of queries) {
        try {
          console.log('[geocodeAddress] Nominatim:', q);
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=it&addressdetails=1`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)' },
            signal: AbortSignal.timeout(8000)
          });
          const data = await res.json();
          if (!data?.length) continue;

          // Preferisci risultati place/hamlet/village/locality, non roads
          const notRoad = data.filter((r: any) => !['road','house','building'].includes(r.type));
          const best = notRoad[0] || data[0];
          console.log('[geocodeAddress] Nominatim ok:', best.lat, best.lon, best.display_name, best.type);
          return { lat: parseFloat(best.lat), lng: parseFloat(best.lon),
            location_type: 'NOMINATIM_' + (best.type || 'place').toUpperCase(),
            formatted_address: best.display_name, source: 'nominatim' };
        } catch(e) { console.warn('[geocodeAddress] Nominatim err:', e); }
      }
      return null;
    }

    // ── Google Maps helper ────────────────────────────────────────────────────
    async function tryGoogle(q: string): Promise<object | null> {
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
        console.log('[geocodeAddress] Google result:', loc.lat, loc.lng, lt);
        if (lt === 'ROOFTOP' || lt === 'RANGE_INTERPOLATED') {
          return { lat: loc.lat, lng: loc.lng, location_type: lt,
            formatted_address: r.formatted_address, source: 'google' };
        }
        return null; // scarta GEOMETRIC_CENTER / APPROXIMATE
      } catch(e) { return null; }
    }

    let result = null;

    if (isRurale && indirizzo) {
      // FRAZIONI → Nominatim prima (conosce i luoghi italiani meglio di Google)
      // Estrai nome frazione senza numero civico
      const nomeFrazione = indirizzo.replace(/\s*\d+\s*$/, '').trim();
      const queries = [
        `${nomeFrazione}, ${comune}, ${sigla}, Italia`,
        `${nomeFrazione}, ${comune}, Italia`,
        `${comune}, ${sigla}, Italia`,
      ];
      result = await tryNominatim(queries);

      // Fallback Google se Nominatim fallisce
      if (!result && GOOGLE_KEY) {
        const q = sigla ? `${indirizzo}, ${comune}, ${sigla}, Italia` : `${indirizzo}, ${comune}, Italia`;
        result = await tryGoogle(q);
      }
    } else if (indirizzo) {
      // INDIRIZZI URBANI → Google prima, poi Nominatim
      const q = sigla ? `${indirizzo}, ${comune}, ${sigla}, Italia` : `${indirizzo}, ${comune}, Italia`;
      result = await tryGoogle(q);
      if (!result) result = await tryNominatim([q, `${comune}, ${sigla}, Italia`]);
    }

    if (result) return Response.json(result);
    return Response.json({ lat: null, lng: null, error: 'Posizione non trovata' });

  } catch (error) {
    console.error('[geocodeAddress] errore:', error.message);
    return Response.json({ lat: null, lng: null, error: error.message });
  }
});
