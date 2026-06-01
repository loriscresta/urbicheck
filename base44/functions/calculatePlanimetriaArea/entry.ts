import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, query_id } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url richiesto' }, { status: 400 });

    console.log('calculatePlanimetriaArea — file_url:', file_url, 'query_id:', query_id);

    // Extract superficie from PDF using AI (supports PDF, reads both text and visual content)
    const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          superficie_mq: {
            type: 'number',
            description: 'Superficie netta in m² della planimetria catastale. Cerca valori numerici vicino a parole chiave SUP, SUPERFICIE, MQ, superficie netta, superficie utile, superficie catastale. Se non trovato nel testo, stima visivamente l\'area del locale dalla planimetria grafica usando la barra scala se presente.'
          },
          method: {
            type: 'string',
            enum: ['testo', 'visivo'],
            description: '"testo" se il valore numerico è scritto esplicitamente nel documento, "visivo" se stimato dalla rappresentazione grafica della planimetria'
          }
        },
        required: ['superficie_mq', 'method']
      },
    });

    console.log('Extraction result:', JSON.stringify(extraction));

    if (extraction.status !== 'success' || !extraction.output) {
      return Response.json({
        error: 'Impossibile estrarre la superficie dal PDF',
        details: extraction.details || 'Nessun dato estratto'
      }, { status: 422 });
    }

    const area_mq = extraction.output.superficie_mq;
    const method = extraction.output.method || 'visivo';

    if (!area_mq || isNaN(Number(area_mq)) || Number(area_mq) <= 0) {
      return Response.json({ error: 'Superficie non trovata nel documento — verifica manuale necessaria' }, { status: 422 });
    }

    const areaMqNumber = Math.round(Number(area_mq) * 10) / 10;

    // Save to CadastralQuery
    if (query_id) {
      try {
        const queries = await base44.entities.CadastralQuery.filter({ id: query_id });
        const current = queries[0];
        if (current) {
          const updateData = {
            report_data: {
              ...current.report_data,
              superficie_planimetrica_mq: areaMqNumber,
              planimetria_data: {
                ...(current.report_data?.planimetria_data || {}),
                source: 'planimetria_upload',
                was_uploaded: true,
                superficie_mq: areaMqNumber,
                method,
              },
            },
          };
          // Update superficie_mq only if it was empty
          if (!current.superficie_mq) {
            updateData.superficie_mq = areaMqNumber;
          }
          await base44.entities.CadastralQuery.update(query_id, updateData);
          console.log('CadastralQuery updated — area_mq:', areaMqNumber, 'method:', method);
        }
      } catch (e) {
        console.error('Errore salvataggio superficie:', e.message);
      }
    }

    return Response.json({ area_mq: areaMqNumber, method });
  } catch (error) {
    console.error('calculatePlanimetriaArea error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});