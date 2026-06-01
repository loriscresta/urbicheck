/**
 * calculatePlanimetriaArea v2 — Chiama Railway /pdf-area (PyMuPDF + analisi visiva)
 * L'analisi reale avviene su Railway che ha Python + image processing
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, query_id } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url richiesto' }, { status: 400 });

    const ENRICHMENT_URL = Deno.env.get('ENRICHMENT_API_URL');
    if (!ENRICHMENT_URL) {
      return Response.json({ error: 'ENRICHMENT_API_URL non configurata', area_mq: null }, { status: 500 });
    }

    console.log('[planimetria] download PDF da:', file_url);
    const pdfRes = await fetch(file_url, { signal: AbortSignal.timeout(15000) });
    if (!pdfRes.ok) return Response.json({ error: 'Impossibile scaricare il PDF' }, { status: 400 });
    const pdfBytes = await pdfRes.arrayBuffer();
    console.log('[planimetria] PDF size:', pdfBytes.byteLength, 'bytes');

    // Invia a Railway /pdf-area come multipart form
    const formData = new FormData();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    formData.append('file', blob, 'planimetria.pdf');

    console.log('[planimetria] chiamata Railway:', ENRICHMENT_URL + '/pdf-area');
    const railRes = await fetch(`${ENRICHMENT_URL}/pdf-area`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60000),
    });

    if (!railRes.ok) {
      const err = await railRes.text();
      console.error('[planimetria] Railway error:', err);
      return Response.json({ error: 'Calcolo fallito: ' + err, area_mq: null }, { status: 422 });
    }

    const result = await railRes.json();
    console.log('[planimetria] Railway result:', JSON.stringify(result));

    const areaMq = result.area_mq ?? null;

    // Salva su DB
    if (query_id && areaMq) {
      try {
        const queries = await base44.entities.CadastralQuery.filter({ id: query_id });
        const current = queries[0];
        if (current) {
          await base44.entities.CadastralQuery.update(query_id, {
            report_data: {
              ...current.report_data,
              superficie_planimetrica_mq: areaMq,
              planimetria_data: {
                ...(current.report_data?.planimetria_data || {}),
                source: 'planimetria_upload',
                superficie_mq: areaMq,
                method: result.method || 'visivo',
                scala: result.scale_px_per_m ? `${result.scale_px_per_m} px/m` : null,
                bands: result.bands || [],
                confidence: result.confidence || 'medium',
              },
            },
            ...(!current.superficie_mq ? { superficie_mq: areaMq } : {}),
          });
        }
      } catch (e) { console.error('[planimetria] errore DB:', e.message); }
    }

    return Response.json(result);

  } catch (error) {
    console.error('[planimetria] errore:', error.message);
    return Response.json({ error: error.message, area_mq: null }, { status: 500 });
  }
});
