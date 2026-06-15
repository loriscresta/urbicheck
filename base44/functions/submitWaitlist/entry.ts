import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MAKE_WEBHOOK_URL = Deno.env.get('MAKE_WAITLIST_WEBHOOK_URL');

Deno.serve(async (req) => {
  try {
    const { email, ruolo, regione_interesse } = await req.json();
    if (!email) return Response.json({ error: 'email required' }, { status: 400 });

    // Store subscriber in database
    const base44 = createClientFromRequest(req);

    const existing = await base44.entities.WaitlistSubscriber.filter({ email });
    if (existing?.length > 0) {
      return Response.json({ duplicate: true });
    }

    await base44.entities.WaitlistSubscriber.create({
      email,
      ruolo: ruolo || 'altro',
      regione_interesse: regione_interesse || undefined,
    });

    // Forward to Make.com webhook (only if configured)
    if (MAKE_WEBHOOK_URL) {
      try {
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, ruolo: ruolo || 'altro', regione_interesse: regione_interesse || '' }),
        });
      } catch (err) {
        console.error('Make webhook error:', err.message);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});