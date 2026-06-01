/**
 * geocodeAddress — Geocoding indirizzo via Google Maps API + Nominatim fallback
 * Usato dalla mappa del report per centrare sulla posizione reale dell'immobile
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
    const sigla = provincia ? provincia.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2) : '';
    const isRurale = indirizzo && /fraz\.?|frazione|loc\.?|localit[àa]|borgata|cascina|regione\s/i.test(indirizzo);

    // === 1. GOOGLE MAPS (solo se ha key) ===
    if (GOOGLE_KEY && indirizzo) {
      const q = sigla
        ? `${indirizzo}, ${comune}, ${sigla}, Italia`
        : `${indirizzo}, ${comune}, Italia`;

      console.log('[geocodeAddress] Google query:', q);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${GOOGLE_KEY}&language=it&region=it`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();

      if (data.status === 'OK' && data.results?.length) {
        const itResult = data.results.find(r =>
          r.address_components?.some(ac => ac.types.includes('country') && ac.short_name === 'IT')
        ) || data.results[0];

        const loc = itResult.geometry.location;
        const locationType = itResult.geometry.location_type;
        console.log('[geocodeAddress] Google result:', loc.lat, loc.lng, locationType);

        // Accetta solo risultati precisi
        if (locationType === 'ROOFTOP' || locationType === 'RANGE_INTERPOLATED') {
          return Response.json({
            lat: loc.lat, lng: loc.lng,
            location_type: locationType,
            formatted_address: itResult.formatted_address,
            source: 'google'
          });
        }
        console.log('[geocodeAddress] Google scartato (', locationType, ') — provo Nominatim');
      }
    }

    // === 2. NOMINATIM fallback (OpenStreetMap — ottimo per frazioni italiane) ===
    if (indirizzo) {
      // Prova query progressivamente più semplice
      const nominatimQueries = [
        indirizzo + ', ' + comune + ', ' + (sigla || 'Italia'),
        // Per frazioni: estrai solo il nome frazione senza numero civico
        indirizzo.replace(/\s*\d+\s*$/, '').trim() + ', ' + comune,
        comune + (sigla ? ', ' + sigla : '') + ', Italia'
      ];

      for (const q of nominatimQueries) {
        console.log('[geocodeAddress] Nominatim query:', q);
        try {
          const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=3&countrycodes=it&addressdetails=1`;
          const nomRes = await fetch(nomUrl, {
            headers: { 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)' },
            signal: AbortSignal.timeout(8000)
          });
          const nomData = await nomRes.json();

          if (nomData?.length) {
            // Preferisci risultati con class=place (frazione/locality) o building/highway
            const best = nomData.find(r => ['place','building','highway','residential'].includes(r.class))
              || nomData[0];

            const lat = parseFloat(best.lat);
            const lng = parseFloat(best.lon);
            console.log('[geocodeAddress] Nominatim ok:', lat, lng, best.display_name);
            return Response.json({
              lat, lng,
              location_type: 'NOMINATIM_' + (best.type || 'place').toUpperCase(),
              formatted_address: best.display_name,
              source: 'nominatim'
            });
          }
        } catch (e) {
          console.warn('[geocodeAddress] Nominatim errore:', e.message);
        }
      }
    }

    // === 3. Nessun risultato preciso ===
    console.log('[geocodeAddress] nessuna posizione trovata per:', indirizzo, comune);
    return Response.json({ lat: null, lng: null, error: 'Posizione non trovata' });

  } catch (error) {
    console.error('[geocodeAddress] errore:', error.message);
    return Response.json({ lat: null, lng: null, error: error.message });
  }
});
