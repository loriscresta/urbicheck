import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { comune, foglio, particella, regione, esito, user_email } = body;

    if (!comune || !foglio || !particella || !esito) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await base44.asServiceRole.entities.SearchLog.create({
      comune: String(comune).trim(),
      foglio: String(foglio).trim(),
      particella: String(particella).trim(),
      regione: regione ? String(regione).trim() : '',
      esito: esito === 'trovata' ? 'trovata' : 'non_trovata',
      user_email: user_email ? String(user_email).trim() : '',
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('logSearch error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});