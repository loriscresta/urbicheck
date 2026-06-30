// notifyMakeCredit — proxy backend per il webhook Make.com su ricarica crediti admin.
// L'URL del webhook è tenuto SOLO lato server (env MAKE_PURCHASE_WEBHOOK_URL), mai nel frontend.
// Solo admin autenticati possono invocarlo.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try { user = await base44.auth.me(); } catch (_e) {}
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const webhookUrl = Deno.env.get('MAKE_PURCHASE_WEBHOOK_URL');
    if (!webhookUrl) {
      console.warn('[notifyMakeCredit] MAKE_PURCHASE_WEBHOOK_URL non impostata — notifica saltata');
      return Response.json({ success: true, skipped: 'webhook not configured' });
    }

    let body;
    try { body = await req.json(); } catch (_e) {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { user_email, amount, type } = body || {};
    if (!user_email || amount == null) {
      return Response.json({ error: 'user_email e amount sono obbligatori' }, { status: 400 });
    }

    // Fire-and-forget: non blocchiamo la risposta sull'esito del webhook.
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email, amount, type: type || 'purchase' }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (e) {
      console.warn('[notifyMakeCredit] webhook call failed (non-blocking):', e.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[notifyMakeCredit] error:', error.message);
    return Response.json({ error: 'Errore interno' }, { status: 500 });
  }
});
