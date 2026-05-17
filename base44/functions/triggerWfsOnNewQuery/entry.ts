// triggerWfsOnNewQuery.js — Automazione entity: esegue wfsLiguria server-side
// quando viene creata una nuova CadastralQuery per Liguria o Piemonte.
// Evita chiamate CORS dal browser: tutto avviene server-side.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const entityId = body?.event?.entity_id;
    const eventType = body?.event?.type;

    if (!entityId || eventType !== 'create') {
      return Response.json({ skipped: true, reason: 'not a create event' });
    }

    // Fetch the new query
    const queries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: entityId });
    const q = queries[0];
    if (!q) return Response.json({ skipped: true, reason: 'query not found' });

    const regione = (q.regione || '').toLowerCase();
    if (!regione.includes('liguria') && !regione.includes('piemonte')) {
      return Response.json({ skipped: true, reason: 'region not supported', regione: q.regione });
    }

    // Dispatch wfsLiguria server-side
    const result = await base44.asServiceRole.functions.invoke('wfsLiguria', { query_id: entityId });

    return Response.json({ success: true, query_id: entityId, regione: q.regione, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});