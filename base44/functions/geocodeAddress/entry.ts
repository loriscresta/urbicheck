/**
 * geocodeAddress — Geocoding indirizzo via Google Maps API
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
    if (!GOOGLE_KEY) {
      return Response.json({ lat: null, lng: null, error: 'Google Maps API key non configurata' });
    }

    // Determina se indirizzo rurale (frazioni/località) per query più specifica
    const isRurale = indirizzo && /fraz\.?|frazione|loc\.?|localit[\u00e0a]|borgata|cascina|regione\s/i.test(indirizzo);
    const sigla = provincia ? provincia.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2) : '';

    // Query precisa: indirizzo + comune + sigla provincia + Italia
    // Per rurali, il comune è già incluso in indirizzo (es. "Fraz. X, Comune") — aggiungiamo sigla per disambiguare
    let q;
    if (indirizzo) {
      q = sigla
        ? `${indirizzo}, ${comune}, ${sigla}, Italia`
        : `${indirizzo}, ${comune}, Italia`;
    } else {
      q = sigla ? `${comune}, ${sigla}, Italia` : `${comune}, Italia`;
    }

    console.log('[geocodeAddress] query:', q, '| rurale:', isRurale);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${GOOGLE_KEY}&language=it&region=it`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) {
      console.log('[geocodeAddress] fallito:', data.status, '| query:', q);
      return Response.json({ lat: null, lng: null, error: `Geocoding status: ${data.status}` });
    }

    // Prendi il primo risultato con country = 'IT'
    const itResult = data.results.find(r =>
      r.address_components?.some(ac => ac.types.includes('country') && ac.short_name === 'IT')
    ) || data.results[0];

    const loc = itResult.geometry.location;
    const locationType = itResult.geometry.location_type;
    console.log('[geocodeAddress] ok:', loc.lat, loc.lng, '| location_type:', locationType, '|', itResult.formatted_address);
    return Response.json({ lat: loc.lat, lng: loc.lng, location_type: locationType, formatted_address: itResult.formatted_address });

  } catch (error) {
    console.error('[geocodeAddress] errore:', error.message);
    return Response.json({ lat: null, lng: null, error: error.message });
  }
});