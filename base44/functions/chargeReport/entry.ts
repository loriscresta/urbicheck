import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FREE_REPORTS = 3;       // report gratuiti per email
const FREE_REPORTS_IP = 5;    // report gratuiti per indirizzo IP — modifica qui per cambiare soglia
const BETA_PAID_REPORTS = 3;
const BETA_PRICE = 2.99;
const STANDARD_PRICE = 9.90; // post-launch fallback

// Estrae l'IP reale del client dagli header della request
function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for può contenere una lista: "client, proxy1, proxy2"
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query_id } = await req.json();
    if (!query_id) return Response.json({ error: 'query_id required' }, { status: 400 });

    // Admin bypass — free access, no credit deduction
    if (user.role === 'admin') {
      console.log(`chargeReport: ADMIN bypass for ${user.email}`);
      const adminQueries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: query_id });
      const adminQuery = adminQueries[0];
      if (!adminQuery) return Response.json({ error: 'Query not found' }, { status: 404 });
      if (!adminQuery.paid) {
        await base44.asServiceRole.entities.CadastralQuery.update(query_id, { paid: true, status: 'completed', cost: 0 });
      }
      return Response.json({ ok: true, deducted: 0, tier: 'admin_free' });
    }

    // Verify query belongs to user
    const queries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: query_id });
    const query = queries[0];
    if (!query) return Response.json({ error: 'Query not found' }, { status: 404 });
    if (query.created_by_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

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

    // ── Controllo limite IP ────────────────────────────────────────────────
    const clientIp = getClientIp(req);
    let ipRecord = null;
    let ipFreeUsed = 0;

    if (clientIp && clientIp !== 'unknown') {
      const ipList = await base44.asServiceRole.entities.FreeUsageIP.filter({ ip_address: clientIp });
      ipRecord = ipList[0] || null;
      ipFreeUsed = ipRecord?.free_count || 0;
    }

    console.log(`chargeReport: user=${user.email} ip=${clientIp} freeUsed=${freeUsed} ipFreeUsed=${ipFreeUsed}`);

    // ── Beta pricing tiers ──────────────────────────────────────────────────
    // Un report è gratuito SOLO SE sia l'email che l'IP sono sotto soglia
    const emailUnderLimit = freeUsed < FREE_REPORTS;
    const ipUnderLimit = clientIp === 'unknown' || ipFreeUsed < FREE_REPORTS_IP;

    if (emailUnderLimit && ipUnderLimit) {
      // FREE tier: entrambe le condizioni soddisfatte
      console.log(`chargeReport: FREE tier — free_reports_used=${freeUsed} ip_free_used=${ipFreeUsed}`);

      // Incrementa contatore email
      await base44.asServiceRole.entities.UserCredits.update(credits.id, {
        free_reports_used: freeUsed + 1,
        total_queries: (credits.total_queries || 0) + 1,
      });

      // Incrementa contatore IP
      if (clientIp && clientIp !== 'unknown') {
        if (ipRecord) {
          await base44.asServiceRole.entities.FreeUsageIP.update(ipRecord.id, {
            free_count: ipFreeUsed + 1,
            last_used: new Date().toISOString(),
          });
        } else {
          await base44.asServiceRole.entities.FreeUsageIP.create({
            ip_address: clientIp,
            free_count: 1,
            last_used: new Date().toISOString(),
          });
        }
      }

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
      // BETA PAID tier: €2,99 per report — email esaurita O IP saturo
      console.log(`chargeReport: BETA_PAID tier — beta_paid_reports_used=${betaPaidUsed} emailUnderLimit=${emailUnderLimit} ipUnderLimit=${ipUnderLimit}`);

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