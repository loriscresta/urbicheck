// notifyMakePurchase.js — Notifica Make.com webhook su acquisto crediti
// Trigger: entity automation su CreditTransaction create con type=purchase

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MAKE_WEBHOOK_URL = Deno.env.get('MAKE_PURCHASE_WEBHOOK_URL');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const entityData = body?.data;
    if (!entityData) return Response.json({ skipped: true, reason: 'no data' });

    const userEmail = entityData.user_email;
    const amount = entityData.amount;
    const type = entityData.type;

    if (!userEmail || amount == null || type !== 'purchase') {
      return Response.json({ skipped: true, reason: 'not a purchase or missing fields' });
    }

    // Se l'URL webhook non è configurato, salta la notifica (non bloccante)
    if (!MAKE_WEBHOOK_URL) {
      console.warn('[notifyMakePurchase] MAKE_PURCHASE_WEBHOOK_URL non impostata — notifica saltata');
      return Response.json({ success: true, skipped: 'webhook not configured' });
    }

    // Fire-and-forget: chiamiamo il webhook senza preoccuparci del risultato
    try {
      await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: userEmail,
          amount: amount,
          type: 'purchase',
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (e) {
      console.warn('[notifyMakePurchase] Webhook call failed (non-blocking):', e.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[notifyMakePurchase] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});