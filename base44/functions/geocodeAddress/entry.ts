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

    const q = indirizzo
      ? `${indirizzo}, ${comune}, ${provincia || ''}, Italia`
      : `${comune}, ${provincia || ''}, Italia`;

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${GOOGLE_KEY}&language=it&region=it`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) {
      console.log('[geocodeAddress] fallito:', data.status, '| query:', q);
      return Response.json({ lat: null, lng: null, error: `Geocoding status: ${data.status}` });
    }

    const loc = data.results[0].geometry.location;
    console.log('[geocodeAddress] ok:', loc.lat, loc.lng, '|', data.results[0].formatted_address);
    return Response.json({ lat: loc.lat, lng: loc.lng, formatted_address: data.results[0].formatted_address });

  } catch (error) {
    console.error('[geocodeAddress] errore:', error.message);
    return Response.json({ lat: null, lng: null, error: error.message });
  }
});