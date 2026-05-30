import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FREE_REPORTS = 3;
const BETA_PAID_REPORTS = 3;
const BETA_PRICE = 2.99;
const STANDARD_PRICE = 9.90; // post-launch fallback

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query_id } = await req.json();
    if (!query_id) return Response.json({ error: 'query_id required' }, { status: 400 });

    // Verify query belongs to user
    const queries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: query_id });
    const query = queries[0];
    if (!query) return Response.json({ error: 'Query not found' }, { status: 404 });
    if (query.created_by !== user.email) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Idempotent: already paid
    if (query.paid) {
      return Response.json({ ok: true, already_paid: true });
    }

    // Load credits
    const creditsList = await base44.asServiceRole.entities.UserCredits.filter({ user_email: user.email });
    let credits = creditsList[0];

    // Auto-create UserCredits if missing (new beta user)
    if (!credits) {
      credits = await base44.asServiceRole.entities.UserCredits.create({
        user_email: user.email,
        balance: 0,
        total_spent: 0,
        total_queries: 0,
        free_reports_used: 0,
        beta_paid_reports_used: 0,
      });
    }

    const freeUsed = credits.free_reports_used || 0;
    const betaPaidUsed = credits.beta_paid_reports_used || 0;

    // ── Beta pricing tiers ──────────────────────────────────────────────────
    if (freeUsed < FREE_REPORTS) {
      // FREE tier: first 3 reports are completely free
      console.log(`chargeReport: FREE tier — free_reports_used=${freeUsed}`);

      await base44.asServiceRole.entities.UserCredits.update(credits.id, {
        free_reports_used: freeUsed + 1,
        total_queries: (credits.total_queries || 0) + 1,
      });

      await base44.asServiceRole.entities.CadastralQuery.update(query_id, {
        paid: true,
        status: 'completed',
        cost: 0,
      });

      await base44.asServiceRole.entities.CreditTransaction.create({
        user_email: user.email,
        type: 'query_charge',
        amount: 0,
        description: `Report gratuito beta #${freeUsed + 1}/3 — ${query.comune || ''} F.${query.foglio} P.${query.particella}`,
        query_id,
      });

      return Response.json({ ok: true, deducted: 0, tier: 'free_beta' });

    } else if (betaPaidUsed < BETA_PAID_REPORTS) {
      // BETA PAID tier: €2,99 per report (reports 4–6)
      console.log(`chargeReport: BETA_PAID tier — beta_paid_reports_used=${betaPaidUsed}`);

      if ((credits.balance || 0) < BETA_PRICE) {
        return Response.json({
          error: 'insufficient_credits',
          balance: credits.balance || 0,
          required: BETA_PRICE,
        }, { status: 402 });
      }

      await base44.asServiceRole.entities.UserCredits.update(credits.id, {
        balance: parseFloat((credits.balance - BETA_PRICE).toFixed(2)),
        total_spent: parseFloat(((credits.total_spent || 0) + BETA_PRICE).toFixed(2)),
        total_queries: (credits.total_queries || 0) + 1,
        beta_paid_reports_used: betaPaidUsed + 1,
      });

      await base44.asServiceRole.entities.CadastralQuery.update(query_id, {
        paid: true,
        status: 'completed',
        cost: BETA_PRICE,
      });

      await base44.asServiceRole.entities.CreditTransaction.create({
        user_email: user.email,
        type: 'query_charge',
        amount: -BETA_PRICE,
        description: `Report beta €2,99 #${betaPaidUsed + 1}/3 — ${query.comune || ''} F.${query.foglio} P.${query.particella}`,
        query_id,
      });

      return Response.json({ ok: true, deducted: BETA_PRICE, tier: 'beta_paid' });

    } else {
      // LIMIT REACHED: 6 beta reports used up
      console.log(`chargeReport: BETA LIMIT REACHED — free=${freeUsed}, paid=${betaPaidUsed}`);
      return Response.json({
        error: 'beta_limit_reached',
        message: 'Hai raggiunto il limite di 6 report nella fase beta.',
        free_used: freeUsed,
        paid_used: betaPaidUsed,
      }, { status: 403 });
    }

  } catch (error) {
    console.error('chargeReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});