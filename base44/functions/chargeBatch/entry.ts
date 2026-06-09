import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BATCH_FLAT_PRICE = 19.90;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { batch_id } = await req.json();
    if (!batch_id) return Response.json({ error: 'batch_id required' }, { status: 400 });

    // Admin bypass
    if (user.role === 'admin') {
      const batches = await base44.asServiceRole.entities.BatchQuery.filter({ id: batch_id });
      const batch = batches[0];
      if (!batch) return Response.json({ error: 'Batch not found' }, { status: 404 });
      if (!batch.paid) {
        await base44.asServiceRole.entities.BatchQuery.update(batch_id, { paid: true });
        const queryIds = batch.query_ids || [];
        await Promise.all(queryIds.map(qid =>
          base44.asServiceRole.entities.CadastralQuery.update(qid, { paid: true, status: 'completed' })
        ));
      }
      return Response.json({ ok: true, deducted: 0, tier: 'admin_free' });
    }

    // Verify batch belongs to user
    const batches = await base44.asServiceRole.entities.BatchQuery.filter({ id: batch_id });
    const batch = batches[0];
    if (!batch) return Response.json({ error: 'Batch not found' }, { status: 404 });
    if (batch.created_by_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Idempotent: already paid
    if (batch.paid) {
      return Response.json({ ok: true, already_paid: true });
    }

    // Load credits
    const creditsList = await base44.asServiceRole.entities.UserCredits.filter({ user_email: user.email });
    let credits = creditsList[0];

    if (!credits) {
      credits = await base44.asServiceRole.entities.UserCredits.create({
        user_email: user.email, balance: 0, total_spent: 0, total_queries: 0,
      });
    }

    if ((credits.balance || 0) < BATCH_FLAT_PRICE) {
      return Response.json({
        error: 'insufficient_credits',
        balance: credits.balance || 0,
        required: BATCH_FLAT_PRICE,
      }, { status: 402 });
    }

    // Deduct flat fee
    await base44.asServiceRole.entities.UserCredits.update(credits.id, {
      balance: parseFloat((credits.balance - BATCH_FLAT_PRICE).toFixed(2)),
      total_spent: parseFloat(((credits.total_spent || 0) + BATCH_FLAT_PRICE).toFixed(2)),
      total_queries: (credits.total_queries || 0) + (batch.total_units || 1),
    });

    // Mark batch and all queries as paid
    await base44.asServiceRole.entities.BatchQuery.update(batch_id, { paid: true });
    const queryIds = batch.query_ids || [];
    await Promise.all(queryIds.map(qid =>
      base44.asServiceRole.entities.CadastralQuery.update(qid, { paid: true, status: 'completed' })
    ));

    // Transaction log
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_email: user.email,
      type: 'query_charge',
      amount: -BATCH_FLAT_PRICE,
      description: `Palazzina ${batch.comune || ''} — ${batch.total_units} subalterni — tariffa flat €${BATCH_FLAT_PRICE.toFixed(2)}`,
      query_id: batch_id,
    });

    console.log(`chargeBatch: OK user=${user.email} batch=${batch_id} units=${batch.total_units} deducted=${BATCH_FLAT_PRICE}`);
    return Response.json({ ok: true, deducted: BATCH_FLAT_PRICE, units: batch.total_units });

  } catch (error) {
    console.error('chargeBatch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});