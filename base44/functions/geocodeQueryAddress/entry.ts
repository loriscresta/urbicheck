// geocodeQueryAddress.js — Geocodifica l'indirizzo immobile via Nominatim
// e salva geocoded_lat/lng (+ centroid_lat/lng) sul record CadastralQuery.
// Trigger: entity automation su CadastralQuery create/update (quando indirizzo_immobile cambia).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const NOMINATIM_HEADERS = { 'User-Agent': 'UrbiCheck/1.0 (info@urbicheck.it)' };

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function getComuneCentroid(comune, provincia) {
  const sigla = (provincia || '').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);
  const q = sigla ? `${comune}, ${sigla}, Italia` : `${comune}, Italia`;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=it`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS, signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (_e) {}
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const entityId = body?.event?.entity_id;
    const eventType = body?.event?.type;
    if (!entityId) return Response.json({ skipped: true, reason: 'no entity_id' });

    // Leggi il record corrente
    const queries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: entityId });
    const q = queries[0];
    if (!q) return Response.json({ skipped: true, reason: 'query not found' });

    const indirizzo = q.indirizzo_immobile || q.indirizzo_catastale || '';
    const comune = q.comune || '';
    const provincia = q.provincia || q.sigla_provincia || '';

    // Salta se già geocodificato con lo stesso indirizzo (evita loop infiniti su update)
    if (q.geocoded_lat != null && q.geocoded_lng != null) {
      // Ricontrolla solo se l'indirizzo è cambiato (evento update)
      const dataAfter = body?.data;
      if (!dataAfter || dataAfter.indirizzo_immobile === body?.old_data?.indirizzo_immobile) {
        return Response.json({ skipped: true, reason: 'already geocoded, same address' });
      }
    }

    if (!indirizzo || !comune) {
      return Response.json({ skipped: true, reason: 'no address or comune' });
    }

    // Ottieni centroide comune per validazione
    const comuneCentroid = await getComuneCentroid(comune, provincia);

    // Geocodifica via Nominatim
    let geocoded = null;
    const query = encodeURIComponent(`${indirizzo}, ${comune}, ${provincia || 'Italia'}, Italia`);
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5&countrycodes=it&addressdetails=1`;
    try {
      const res = await fetch(nomUrl, { headers: NOMINATIM_HEADERS, signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (data?.length) {
        // Filtra per distanza dal comune
        let candidates = data;
        if (comuneCentroid) {
          candidates = data.filter(r => {
            const d = haversineKm(comuneCentroid.lat, comuneCentroid.lng, parseFloat(r.lat), parseFloat(r.lon));
            return d < 30; // entro 30km dal centroide comunale
          });
        }
        if (candidates.length) {
          const best = candidates[0];
          const lt = best.type || 'place';
          const isComuneFallback = !['building','house','amenity','shop','school','apartments'].includes(lt) &&
            best.display_name?.toLowerCase().split(',').length <= 3;

          if (!isComuneFallback) {
            geocoded = { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
            console.log('[geocodeQueryAddress] Nominatim OK:', geocoded.lat, geocoded.lng, best.display_name);
          } else {
            console.log('[geocodeQueryAddress] Nominatim risultato troppo generico (prob. centroide comune), scartato');
          }
        }
      }
    } catch (e) {
      console.error('[geocodeQueryAddress] Nominatim error:', e.message);
    }

    if (geocoded) {
      await base44.asServiceRole.entities.CadastralQuery.update(entityId, {
        geocoded_lat: geocoded.lat,
        geocoded_lng: geocoded.lng,
        centroid_lat: geocoded.lat,
        centroid_lng: geocoded.lng,
      });
      return Response.json({ success: true, geocoded });
    }

    // Fallback: usa centroide comune se disponibile
    if (comuneCentroid) {
      console.log('[geocodeQueryAddress] Fallback al centroide del comune');
      await base44.asServiceRole.entities.CadastralQuery.update(entityId, {
        geocoded_lat: comuneCentroid.lat,
        geocoded_lng: comuneCentroid.lng,
        centroid_lat: comuneCentroid.lat,
        centroid_lng: comuneCentroid.lng,
      });
      return Response.json({ success: true, fallback: 'comune_centroid', coords: comuneCentroid });
    }

    return Response.json({ skipped: true, reason: 'geocoding failed, no fallback' });
  } catch (error) {
    console.error('[geocodeQueryAddress] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});