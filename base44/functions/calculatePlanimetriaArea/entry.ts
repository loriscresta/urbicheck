/**
 * calculatePlanimetriaArea v3 — Stima superficie con Claude Vision
 * Legge la scala dalla planimetria, identifica i locali e stima la superficie totale.
 * Funziona con qualsiasi planimetria catastale AdE, non solo formato fisso.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── AUTH: obbligatorio — richiede utente autenticato ──────────────────
    let user;
    try { user = await base44.auth.me(); } catch (_e) {}
    if (!user) return Response.json({ error: 'Unauthorized — autenticazione richiesta' }, { status: 401 });

    const { file_url, query_id, superficie_catasto } = await req.json();

    // ── QUERY OWNERSHIP: verifica che la query appartenga all'utente ──────
    // Usa asServiceRole per leggere SEMPRE il record: con il client utente la RLS
    // nasconderebbe le query altrui (q undefined) facendo saltare il controllo 403,
    // mentre più sotto asServiceRole le aggiornerebbe comunque (IDOR). Qui neghiamo
    // esplicitamente se il record non esiste o non appartiene all'utente.
    if (query_id) {
      let ownerQuery;
      try {
        const queries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: query_id });
        ownerQuery = queries[0];
      } catch (_e) {
        console.warn('[calculatePlanimetriaArea] ownership check failed:', _e.message);
        return Response.json({ error: 'Errore verifica proprietà query' }, { status: 500 });
      }
      if (!ownerQuery) {
        return Response.json({ error: 'Query non trovata' }, { status: 404 });
      }
      if (ownerQuery.created_by_id !== user.id && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden — query non appartiene a questo utente' }, { status: 403 });
      }
    }
    if (!file_url) return Response.json({ error: 'file_url richiesto' }, { status: 400 });

    console.log('[planimetria-v3] analisi AI per:', file_url.slice(0, 80));

    // ── Analisi con InvokeLLM (Claude vision) ──────────────────────────────
    let aiResult = null;
    try {
      aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Sei un tecnico catastale esperto. Analizza questa planimetria catastale e stima la superficie utile totale in m².

PROCEDURA:
1. Cerca la SCALA indicata nel documento (es. "Scala 1:200", "1:100", "scala 1:50"). È quasi sempre stampata nell'angolo o nel cartiglio.
2. Se trovi la scala, usala per calcolare le dimensioni reali dei locali misurando visivamente le stanze.
3. Somma le superfici di TUTTI i locali/vani visibili (compreso corridoi, bagni, disimpegni) ma ESCLUDI muri e pareti.
4. Se la planimetria mostra più piani/livelli, sommali tutti.
5. Restituisci la stima come numero intero in m².

CONFIDENZA:
- "alta": scala leggibile e locali ben definiti
- "media": scala stimata o pianta parzialmente leggibile  
- "bassa": scala non trovata o planimetria non chiara

IMPORTANTE: non inventare valori se non riesci a leggere nulla. In quel caso restituisci area_mq=null.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            area_mq: { type: "number", description: "Superficie totale stimata in m² (intero), null se non determinabile" },
            scala: { type: "string", description: "Scala letta dal documento (es. '1:200'), null se non trovata" },
            confidence: { type: "string", enum: ["alta", "media", "bassa"] },
            note: { type: "string", description: "Breve spiegazione del calcolo" },
            piani: { type: "number", description: "Numero di piani/livelli rilevati nella planimetria" }
          }
        }
      });
    } catch (aiErr) {
      console.error('[planimetria-v3] AI error:', aiErr.message);
    }

    const areaMq = aiResult?.area_mq ?? null;
    const confidence = aiResult?.confidence ?? 'bassa';
    const scala = aiResult?.scala ?? null;
    const note = aiResult?.note ?? null;
    const piani = aiResult?.piani ?? 1;

    console.log('[planimetria-v3] result:', { areaMq, confidence, scala, note });

    // ── Salva su DB se abbiamo un risultato e un query_id ─────────────────
    if (query_id && areaMq) {
      try {
        const queries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: query_id });
        const current = queries[0];
        if (current) {
          await base44.asServiceRole.entities.CadastralQuery.update(query_id, {
            report_data: {
              ...current.report_data,
              superficie_planimetrica_mq: areaMq,
              planimetria_data: {
                ...(current.report_data?.planimetria_data || {}),
                source: 'planimetria_ai',
                superficie_mq: areaMq,
                method: 'claude_vision',
                scala,
                confidence,
                note,
                piani,
              },
            },
            ...(!current.superficie_mq ? { superficie_mq: areaMq } : {}),
          });
        }
      } catch (e) { console.error('[planimetria-v3] errore DB:', e.message); }
    }

    return Response.json({
      area_mq: areaMq,
      confidence,
      scala,
      note,
      piani,
      method: 'claude_vision',
    });

  } catch (error) {
    console.error('[planimetria-v3] errore:', error.message);
    return Response.json({ error: "Errore interno durante l'analisi della planimetria", area_mq: null }, { status: 500 });
  }
});