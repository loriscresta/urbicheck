/**
 * getPublicReport — endpoint pubblico (no auth) per accedere a un report tramite token firmato.
 * Valida token + scadenza e restituisce i dati della CadastralQuery.
 * 
 * POST { query_id, token }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query_id, token } = await req.json();

    if (!query_id || !token) {
      return Response.json({ error: 'query_id e token richiesti' }, { status: 400 });
    }

    const rows = await base44.asServiceRole.entities.CadastralQuery.filter({ id: query_id });
    const query = rows[0];

    if (!query) {
      return Response.json({ error: 'Report non trovato' }, { status: 404 });
    }
    if (query.public_token !== token) {
      return Response.json({ error: 'Token non valido' }, { status: 403 });
    }
    if (query.token_expires_at && new Date(query.token_expires_at) < new Date()) {
      return Response.json({ error: 'Link scaduto' }, { status: 403 });
    }
    if (!query.paid) {
      return Response.json({ error: 'Report non disponibile' }, { status: 403 });
    }

    return Response.json({ ok: true, query });

  } catch (error) {
    console.error('[getPublicReport] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});