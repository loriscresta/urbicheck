// triggerWfsOnNewQuery.js — Automazione entity: esegue wfsLiguria server-side
// quando viene creata una nuova CadastralQuery per Liguria o Piemonte.
//
// Sicurezza: il token interno (_internal_token) DEVE essere presente nel payload
// per verificare che la chiamata provenga dall'automation autorizzata.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const INTERNAL_TOKEN_SECRET = Deno.env.get('INTERNAL_AUTH_TOKEN');
const FALLBACK_INTERNAL_TOKEN = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

function isInternalCall(payload) {
  const token = payload._internal_token;
  if (!token) return false;
  return token === FALLBACK_INTERNAL_TOKEN || (INTERNAL_TOKEN_SECRET && token === INTERNAL_TOKEN_SECRET);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // ── Auth: verify internal token ───────────────────────────────────────
    if (!isInternalCall(body)) {
      return Response.json({ error: 'Forbidden: internal token required' }, { status: 403 });
    }

    const entityId = body?.event?.entity_id;
    const eventType = body?.event?.type;

    if (!entityId || eventType !== 'create') {
      return Response.json({ skipped: true, reason: 'not a create event' });
    }

    // ── Attendi che catasto_resolver completi: polling su codice_comune_catasto ──
    let codiceOk = false;
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const check = await base44.asServiceRole.entities.CadastralQuery.filter({ id: entityId });
        if (check[0]?.codice_comune_catasto) { codiceOk = true; break; }
      } catch (_e) {}
    }
    if (!codiceOk) {
      console.warn(`triggerWfsOnNewQuery: codice_comune_catasto mai valorizzato per ${entityId} dopo 60s — skip wfsLiguria`);
      return Response.json({ skipped: true, reason: 'codice_comune_catasto not set after 60s' });
    }

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

    return Response.json({ success: true, query_id: entityId, regione: regioneLower, result });
  } catch (error) {
    console.error('[triggerWfsOnNewQuery] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});