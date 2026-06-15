// validatePolygonAgainstAddress.js — Valida geometry_geojson contro geocoded_lat/lng
// Se il baricentro del poligono dista >300m dall'indirizzo geocodificato, imposta geometry_geojson = null
// Trigger: entity automation su CadastralQuery update (quando geometry_geojson cambia)

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MAX_DISTANCE_M = 300;

function polygonCentroidDistance(polygonGeom, refLat, refLng) {
  if (!polygonGeom?.coordinates?.[0]?.length || refLat == null || refLng == null) return null;
  const ring = polygonGeom.coordinates[0];
  const cLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  const cLon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  const R = 6371000;
  const dLat = (cLat - refLat) * Math.PI / 180;
  const dLon = (cLon - refLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(refLat * Math.PI / 180) * Math.cos(cLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const entityId = body?.event?.entity_id;
    if (!entityId) return Response.json({ skipped: true, reason: 'no entity_id' });

    // Leggi lo stato corrente del record
    const queries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: entityId });
    const q = queries[0];
    if (!q) return Response.json({ skipped: true, reason: 'query not found' });

    // Controlla se geometry_geojson è stato appena impostato (prima era null/assente)
    const oldGeom = body?.old_data?.geometry_geojson;
    const newGeom = q.geometry_geojson;

    if (!newGeom || !newGeom.type) {
      return Response.json({ skipped: true, reason: 'no geometry_geojson' });
    }

    // Se la geometria non è cambiata, non ricalcolare
    if (oldGeom && JSON.stringify(oldGeom) === JSON.stringify(newGeom)) {
      return Response.json({ skipped: true, reason: 'geometry unchanged' });
    }

    // Coordinata di riferimento: geocoded_lat/lng (autorità primaria) > centroid_lat/lng (fallback)
    const refLat = q.geocoded_lat != null ? Number(q.geocoded_lat) : (q.centroid_lat != null ? Number(q.centroid_lat) : null);
    const refLng = q.geocoded_lng != null ? Number(q.geocoded_lng) : (q.centroid_lng != null ? Number(q.centroid_lng) : null);

    if (refLat == null || refLng == null || isNaN(refLat) || isNaN(refLng)) {
      return Response.json({ skipped: true, reason: 'no reference coordinates (geocoded or centroid)' });
    }

    // Estrai la geometria pura (potrebbe essere Feature o Geometry)
    const geom = newGeom.type === 'Feature' ? newGeom.geometry : newGeom;
    if (!geom || !geom.type) {
      return Response.json({ skipped: true, reason: 'invalid geometry' });
    }

    const dist = polygonCentroidDistance(geom, refLat, refLng);
    if (dist === null) {
      return Response.json({ skipped: true, reason: 'could not compute distance' });
    }

    if (dist > MAX_DISTANCE_M) {
      console.log(`[validatePolygonAgainstAddress] REJECTED — polygon centroid ${dist.toFixed(0)}m from address reference (max ${MAX_DISTANCE_M}m)`);
      await base44.asServiceRole.entities.CadastralQuery.update(entityId, {
        geometry_geojson: null,
      });
      return Response.json({ action: 'cleared', distance_m: Math.round(dist), reason: `polygon centroid ${Math.round(dist)}m from address (max ${MAX_DISTANCE_M}m)` });
    }

    console.log(`[validatePolygonAgainstAddress] ACCEPTED — polygon centroid ${dist.toFixed(0)}m from address`);
    return Response.json({ action: 'kept', distance_m: Math.round(dist) });
  } catch (error) {
    console.error('[validatePolygonAgainstAddress] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});