// geocodeQueryAddress.js — Geocodifica l'indirizzo immobile via Google Maps
// e salva geocoded_lat/lng sul record CadastralQuery.
// Trigger: entity automation su CadastralQuery create/update.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function getComuneCentroid(comune, provincia) {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) return null;
  const sigla = (provincia || '').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);
  const q = sigla ? `${comune}, ${sigla}, Italy` : `${comune}, Italy`;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data?.results?.[0]) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch (_e) {}
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const entityId = body?.event?.entity_id;
    if (!entityId) return Response.json({ skipped: true, reason: 'no entity_id' });

    const queries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: entityId });
    const q = queries[0];
    if (!q) return Response.json({ skipped: true, reason: 'query not found' });

    const indirizzo = q.indirizzo_immobile || q.indirizzo_catastale || '';
    const comune = q.comune || '';
    const provincia = q.provincia || q.sigla_provincia || '';

    // Salta se già geocodificato con lo stesso indirizzo
    if (q.geocoded_lat != null && q.geocoded_lng != null) {
      const dataAfter = body?.data;
      if (!dataAfter || dataAfter.indirizzo_immobile === body?.old_data?.indirizzo_immobile) {
        return Response.json({ skipped: true, reason: 'already geocoded, same address' });
      }
    }

    if (!indirizzo || !comune) {
      return Response.json({ skipped: true, reason: 'no address or comune' });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('[geocodeQueryAddress] GOOGLE_MAPS_API_KEY not set');
      return Response.json({ skipped: true, reason: 'no API key' });
    }

    // Ottieni centroide comune per validazione
    const comuneCentroid = await getComuneCentroid(comune, provincia);

    // Geocodifica via Google Maps
    let geocoded = null;
    const query = encodeURIComponent(`${indirizzo}, ${comune}, Italy`);
    const gmUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}`;
    try {
      const res = await fetch(gmUrl, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (data.status === 'OK' && data.results?.length) {
        // Filtra per distanza dal comune
        let candidates = data.results;
        if (comuneCentroid) {
          candidates = data.results.filter(r => {
            const loc = r.geometry.location;
            const d = haversineKm(comuneCentroid.lat, comuneCentroid.lng, loc.lat, loc.lng);
            return d < 30;
          });
        }
        if (candidates.length) {
          const best = candidates[0];
          const loc = best.geometry.location;
          const isComuneFallback = best.types?.includes('locality') && !best.types?.includes('street_address');
          if (!isComuneFallback) {
            geocoded = { lat: loc.lat, lng: loc.lng };
            console.log('[geocodeQueryAddress] Google Maps OK:', geocoded.lat, geocoded.lng, best.formatted_address);
          } else {
            console.log('[geocodeQueryAddress] Google Maps risultato troppo generico (prob. centroide comune), scartato');
          }
        }
      } else {
        console.log('[geocodeQueryAddress] Google Maps status:', data.status);
      }
    } catch (e) {
      console.error('[geocodeQueryAddress] Google Maps error:', e.message);
    }

    if (geocoded) {
      await base44.asServiceRole.entities.CadastralQuery.update(entityId, {
        geocoded_lat: geocoded.lat,
        geocoded_lng: geocoded.lng,
      });
      return Response.json({ success: true, geocoded });
    }

    // Fallback: usa centroide comune se disponibile
    if (comuneCentroid) {
      console.log('[geocodeQueryAddress] Fallback al centroide del comune');
      await base44.asServiceRole.entities.CadastralQuery.update(entityId, {
        geocoded_lat: comuneCentroid.lat,
        geocoded_lng: comuneCentroid.lng,
      });
      return Response.json({ success: true, fallback: 'comune_centroid', coords: comuneCentroid });
    }

    return Response.json({ skipped: true, reason: 'geocoding failed, no fallback' });
  } catch (error) {
    console.error('[geocodeQueryAddress] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});