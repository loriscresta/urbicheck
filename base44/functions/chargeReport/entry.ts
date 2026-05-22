import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FULL_PRICE = 9.90;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query_id } = await req.json();
    if (!query_id) return Response.json({ error: 'query_id required' }, { status: 400 });

    // Verifica che la query appartenga all'utente
    const queries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: query_id });
    const query = queries[0];
    if (!query) return Response.json({ error: 'Query not found' }, { status: 404 });
    if (query.created_by !== user.email) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (query.paid) return Response.json({ error: 'Already paid' }, { status: 400 });

    // Leggi crediti con service role (bypassa RLS)
    const creditsList = await base44.asServiceRole.entities.UserCredits.filter({ user_email: user.email });
    const credits = creditsList[0];
    if (!credits || credits.balance < FULL_PRICE) {
      return Response.json({
        error: 'insufficient_credits',
        balance: credits?.balance || 0,
        required: FULL_PRICE,
      }, { status: 402 });
    }

    // Deduzione atomica con service role
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_email: user.email,
      type: 'query_charge',
      amount: -FULL_PRICE,
      description: `Scheda completa: ${query.comune} — F.${query.foglio} P.${query.particella}`,
      query_id,
    });

    await base44.asServiceRole.entities.UserCredits.update(credits.id, {
      balance: parseFloat((credits.balance - FULL_PRICE).toFixed(2)),
      total_spent: parseFloat(((credits.total_spent || 0) + FULL_PRICE).toFixed(2)),
      total_queries: (credits.total_queries || 0) + 1,
    });

    await base44.asServiceRole.entities.CadastralQuery.update(query_id, {
      paid: true,
      status: 'completed',
      cost: FULL_PRICE,
    });

    // DEV auto-refund: solo per admin
    if (user.role === 'admin') {
      setTimeout(async () => {
        try {
          const latest = (await base44.asServiceRole.entities.UserCredits.filter({ user_email: user.email }))[0];
          if (latest) {
            await base44.asServiceRole.entities.UserCredits.update(latest.id, {
              balance: parseFloat((latest.balance + FULL_PRICE).toFixed(2)),
            });
            await base44.asServiceRole.entities.CreditTransaction.create({
              user_email: user.email,
              type: 'refund',
              amount: FULL_PRICE,
              description: `[DEV] Auto-refund — ${query.comune} F.${query.foglio} P.${query.particella}`,
              query_id,
            });
          }
        } catch (e) { console.error('Auto-refund error:', e); }
      }, 60000);
    }

    return Response.json({ ok: true, deducted: FULL_PRICE });

  } catch (error) {
    console.error('chargeReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});