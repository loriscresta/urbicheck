// triggerWfsOnNewQuery.js — Automazione entity: esegue wfsLiguria server-side
// quando viene creata una nuova CadastralQuery per Liguria o Piemonte.
//
// FIX: aggiunge sleep 10s prima di richiamare wfsLiguria, in modo che:
//   1) catasto_resolver abbia il tempo di popolare centroid_lat/lng (evita geocoding)
//   2) se regione è assente (flusso visura), la cerca in ComuneItalia e la scrive sul record

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

    // ── Attendi 10 secondi: lascia il tempo a catasto_resolver di popolare ──
    // centroid_lat/lng e regione sul record prima che wfsLiguria venga invocato.
    await new Promise(r => setTimeout(r, 10000));

    // Re-fetch dati aggiornati dopo lo sleep
    const queries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: entityId });
    const q = queries[0];
    if (!q) return Response.json({ skipped: true, reason: 'query not found' });

    let regioneLower = (q.regione || '').toLowerCase();

    // ── Se regione è assente (flusso visura), cercala in ComuneItalia ──
    if (!regioneLower.includes('liguria') && !regioneLower.includes('piemonte') && q.comune) {
      try {
        const comuni = await base44.asServiceRole.entities.ComuneItalia.filter({ nome: q.comune });
        for (const c of (comuni || [])) {
          const r = String(c.regione || c.region || c.nome_regione || '').toLowerCase().trim();
          if (r.includes('liguria') || r.includes('piemonte')) {
            regioneLower = r;
            // Scrivi regione sul record in modo che wfsLiguria la legga correttamente
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

    // Dispatch wfsLiguria — a questo punto il record ha centroid_lat/lng (da catasto_resolver)
    // e regione valorizzata, quindi wfsLiguria userà le coordinate reali senza geocodificare
    const result = await base44.asServiceRole.functions.invoke('wfsLiguria', { query_id: entityId });

    return Response.json({ success: true, query_id: entityId, regione: regioneLower, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
