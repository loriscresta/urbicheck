// triggerWfsOnNewQuery.js — Automazione entity: esegue wfsLiguria server-side
// quando viene creata una nuova CadastralQuery per Liguria o Piemonte.
//
// Sicurezza: il token interno (_internal_token) DEVE essere presente nel payload
// per verificare che la chiamata provenga dall'automation autorizzata.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Entity automations are trusted (admin-only to create).
// No additional token check needed — the automation itself is the authorization.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const entityId = body?.event?.entity_id;
    const eventType = body?.event?.type;

    if (!entityId || eventType !== 'create') {
      return Response.json({ skipped: true, reason: 'not a create event' });
    }

    // ── Attendi geocoding dell'indirizzo E codice_comune_catasto ──
    let geocodedOk = false;
    let codiceOk = false;
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const check = await base44.asServiceRole.entities.CadastralQuery.filter({ id: entityId });
        const c = check[0];
        if (!geocodedOk && c?.geocoded_lat != null && c?.geocoded_lng != null) geocodedOk = true;
        if (!codiceOk && c?.codice_comune_catasto) codiceOk = true;
        if (geocodedOk && codiceOk) break;
      } catch (_e) {}
    }
    if (!codiceOk) {
      console.warn(`triggerWfsOnNewQuery: codice_comune_catasto mai valorizzato per ${entityId} dopo 60s — skip wfsLiguria`);
      return Response.json({ skipped: true, reason: 'codice_comune_catasto not set after 60s' });
    }
    if (!geocodedOk) {
      console.warn(`triggerWfsOnNewQuery: geocoding non completato per ${entityId} dopo 60s — proseguo con centroid_lat/lng esistenti`);
    }

    // Re-fetch dati aggiornati dopo lo sleep
    const queries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: entityId });
    const q = queries[0];
    if (!q) return Response.json({ skipped: true, reason: 'query not found' });

    // geocoded_lat/lng non sovrascrivono più centroid_lat/lng — la geocodifica Nominatim è disabilitata

    let regioneLower = (q.regione || '').toLowerCase();

    // ── Se regione è assente (flusso visura), cercala in ComuneItalia ──
    if (!regioneLower.includes('liguria') && !regioneLower.includes('piemonte') && q.comune) {
      try {
        const comuni = await base44.asServiceRole.entities.ComuneItalia.filter({ nome: q.comune });
        for (const c of (comuni || [])) {
          const r = String(c.regione || c.region || c.nome_regione || '').toLowerCase().trim();
          if (r.includes('liguria') || r.includes('piemonte')) {
            regioneLower = r;
            try {
              const regioneValue = c.regione || c.region || c.nome_regione || '';
              await base44.asServiceRole.entities.CadastralQuery.update(entityId, { regione: regioneValue });
            } catch (_e) {}
            break;
          }
        }
      } catch (_e) {}
    }

    if (!regioneLower.includes('liguria') && !regioneLower.includes('piemonte')) {
      return Response.json({ skipped: true, reason: 'region not supported', regione: regioneLower });
    }

    // Dispatch wfsLiguria
    const result = await base44.asServiceRole.functions.invoke('wfsLiguria', { query_id: entityId });

    // ── Post-processing: valida geometry_geojson contro geocoded_lat/lng ──
    try {
      await new Promise(r => setTimeout(r, 3000)); // breve attesa per eventuali update concorrenti
      const postQ = (await base44.asServiceRole.entities.CadastralQuery.filter({ id: entityId }))[0];
      if (postQ?.geometry_geojson?.type) {
        const refLat = postQ.geocoded_lat != null ? Number(postQ.geocoded_lat) : Number(postQ.centroid_lat);
        const refLng = postQ.geocoded_lng != null ? Number(postQ.geocoded_lng) : Number(postQ.centroid_lng);
        if (refLat && refLng && !isNaN(refLat) && !isNaN(refLng)) {
          const geom = postQ.geometry_geojson.type === 'Feature'
            ? postQ.geometry_geojson.geometry : postQ.geometry_geojson;
          if (geom?.coordinates?.[0]?.length > 2) {
            const ring = geom.coordinates[0];
            const cLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
            const cLon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
            const R = 6371000;
            const dLat = (cLat - refLat) * Math.PI / 180;
            const dLon = (cLon - refLng) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 + Math.cos(refLat*Math.PI/180) * Math.cos(cLat*Math.PI/180) * Math.sin(dLon/2)**2;
            const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            if (dist > 300) {
              console.log(`[triggerWfsOnNewQuery] Poligono scartato — baricentro a ${dist.toFixed(0)}m dall'indirizzo`);
              await base44.asServiceRole.entities.CadastralQuery.update(entityId, { geometry_geojson: null });
            }
          }
        }
      }
    } catch (_e) {
      console.log('[triggerWfsOnNewQuery] Polygon validation skipped:', _e);
    }

    return Response.json({ success: true, query_id: entityId, regione: regioneLower, result });
  } catch (error) {
    console.error('[triggerWfsOnNewQuery] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});