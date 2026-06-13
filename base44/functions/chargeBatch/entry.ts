import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Funnel beta ──────────────────────────────────────────────────────────
// Report 1–3:  GRATIS
// Report 4–6:  €2,99 (offerta lancio, max 3)
// Report 7+:   €9,90 (prezzo standard)
// Batch: segue il contatore beta. Flat €19,90 SOLO da 8 subalterni in su.
const FREE_REPORTS = 3;
const LAUNCH_PAID_REPORTS = 3;
const LAUNCH_PRICE = 2.99;
const STANDARD_PRICE = 9.90;
const BATCH_FLAT_THRESHOLD = 8;
const BATCH_FLAT_PRICE = 19.90;

// Categorie pertinenziali (non consumano crediti, non scalano contatore)
const PERTINENZA_CATEGORIES = ['C/2', 'C/6', 'C/7'];

function isPertinenza(sub) {
  if (sub.is_pertinenza === true) return true;
  const cat = (sub.categoria_catastale || sub.categoria || '').toUpperCase().trim();
  return PERTINENZA_CATEGORIES.some(p => cat === p || cat.startsWith(p));
}

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

    if (batch.paid) {
      return Response.json({ ok: true, already_paid: true });
    }

    // Load credits
    const creditsList = await base44.asServiceRole.entities.UserCredits.filter({ user_email: user.email });
    let credits = creditsList[0];
    if (!credits) {
      credits = await base44.asServiceRole.entities.UserCredits.create({
        user_email: user.email, balance: 0, total_spent: 0, total_queries: 0,
        free_reports_used: 0, beta_paid_reports_used: 0,
      });
    }

    // Fetch all queries in batch to count pertinenze
    const queryIds = batch.query_ids || [];
    const allQueries = [];
    for (const qid of queryIds) {
      const qs = await base44.asServiceRole.entities.CadastralQuery.filter({ id: qid });
      if (qs[0]) allQueries.push(qs[0]);
    }

    // Count billable units (exclude pertinenze)
    const billableUnits = allQueries.filter(q => !isPertinenza(q));
    const billableCount = billableUnits.length;
    const pertinenzeCount = allQueries.length - billableCount;

    console.log(`chargeBatch: user=${user.email} total=${allQueries.length} billable=${billableCount} pertinenze=${pertinenzeCount}`);

    let freeUsed = credits.free_reports_used || 0;
    let launchPaidUsed = credits.beta_paid_reports_used || 0;

    // Regola: fino a 2 sub, se il 2° è pertinenza → 1 report
    // Questa logica è gestita a monte (VisuraUploader), qui applichiamo il contatore
    // Se ci sono 0 unità billable (tutte pertinenze), è gratis
    if (billableCount === 0) {
      console.log('chargeBatch: all pertinenze — free');
      await base44.asServiceRole.entities.BatchQuery.update(batch_id, { paid: true });
      await Promise.all(queryIds.map(qid =>
        base44.asServiceRole.entities.CadastralQuery.update(qid, { paid: true, status: 'completed', cost: 0 })
      ));
      return Response.json({ ok: true, deducted: 0, billable: 0, pertinenze: pertinenzeCount, tier: 'free_pertinenze' });
    }

    // Flat price only for 8+ billable units
    if (billableCount >= BATCH_FLAT_THRESHOLD) {
      if ((credits.balance || 0) < BATCH_FLAT_PRICE) {
        return Response.json({
          error: 'insufficient_credits',
          balance: credits.balance || 0,
          required: BATCH_FLAT_PRICE,
        }, { status: 402 });
      }

      await base44.asServiceRole.entities.UserCredits.update(credits.id, {
        balance: parseFloat((credits.balance - BATCH_FLAT_PRICE).toFixed(2)),
        total_spent: parseFloat(((credits.total_spent || 0) + BATCH_FLAT_PRICE).toFixed(2)),
        total_queries: (credits.total_queries || 0) + billableCount,
        free_reports_used: freeUsed + billableCount, // consuma tutti i gratuiti
      });

      await base44.asServiceRole.entities.BatchQuery.update(batch_id, { paid: true });
      await Promise.all(queryIds.map(qid =>
        base44.asServiceRole.entities.CadastralQuery.update(qid, { paid: true, status: 'completed', cost: +(BATCH_FLAT_PRICE / billableCount).toFixed(2) })
      ));

      await base44.asServiceRole.entities.CreditTransaction.create({
        user_email: user.email, type: 'query_charge', amount: -BATCH_FLAT_PRICE,
        description: `Palazzina ${batch.comune || ''} — ${billableCount} unità (+${pertinenzeCount} pertinenze) — tariffa flat €${BATCH_FLAT_PRICE.toFixed(2)}`,
        query_id: batch_id,
      });

      return Response.json({ ok: true, deducted: BATCH_FLAT_PRICE, billable: billableCount, pertinenze: pertinenzeCount, tier: 'batch_flat' });
    }

    // ── Beta counter pricing: ogni unità billable scala il contatore ──
    let totalCost = 0;
    let remainingFree = billableCount;

    for (let i = 0; i < billableCount; i++) {
      if (freeUsed < FREE_REPORTS) {
        freeUsed++;
      } else if (launchPaidUsed < LAUNCH_PAID_REPORTS) {
        totalCost += LAUNCH_PRICE;
        launchPaidUsed++;
      } else {
        totalCost += STANDARD_PRICE;
      }
    }

    totalCost = parseFloat(totalCost.toFixed(2));
    console.log(`chargeBatch: beta counter — cost=${totalCost} freeUsed=${freeUsed} launchPaidUsed=${launchPaidUsed}`);

    if (totalCost > 0 && (credits.balance || 0) < totalCost) {
      return Response.json({
        error: 'insufficient_credits',
        balance: credits.balance || 0,
        required: totalCost,
      }, { status: 402 });
    }

    const newBalance = parseFloat((credits.balance - totalCost).toFixed(2));

    await base44.asServiceRole.entities.UserCredits.update(credits.id, {
      balance: newBalance,
      total_spent: parseFloat(((credits.total_spent || 0) + totalCost).toFixed(2)),
      total_queries: (credits.total_queries || 0) + billableCount,
      free_reports_used: freeUsed,
      beta_paid_reports_used: launchPaidUsed,
    });

    await base44.asServiceRole.entities.BatchQuery.update(batch_id, { paid: true });
    const costPerUnit = billableCount > 0 ? +(totalCost / billableCount).toFixed(2) : 0;
    await Promise.all(queryIds.map(qid =>
      base44.asServiceRole.entities.CadastralQuery.update(qid, { paid: true, status: 'completed', cost: costPerUnit })
    ));

    await base44.asServiceRole.entities.CreditTransaction.create({
      user_email: user.email, type: 'query_charge', amount: -totalCost,
      description: `Palazzina ${batch.comune || ''} — ${billableCount} unità (+${pertinenzeCount} pertinenze) — contatore beta (${totalCost === 0 ? 'gratis' : `€${totalCost.toFixed(2)}`})`,
      query_id: batch_id,
    });

    return Response.json({ ok: true, deducted: totalCost, billable: billableCount, pertinenze: pertinenzeCount, tier: totalCost === 0 ? 'free' : 'beta_counter' });

  } catch (error) {
    console.error('chargeBatch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});