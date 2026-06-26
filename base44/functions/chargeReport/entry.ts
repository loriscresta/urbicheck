import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Funnel di lancio ──────────────────────────────────────────────────────────
// Report 1–3:  GRATIS (per email normalizzata + per IP, entrambi sotto soglia)
// Report 4–6:  €2,99 (offerta lancio, max 3)
// Report 7+:   €9,90 (prezzo standard)
const APP_URL = Deno.env.get('APP_URL') || 'https://urbicheck.it';

const FREE_REPORTS = 3;        // report gratuiti per email normalizzata
const FREE_REPORTS_IP = 3;     // report gratuiti per indirizzo IP
const LAUNCH_PAID_REPORTS = 3; // report a prezzo lancio (dopo i gratuiti)
const LAUNCH_PRICE = 2.99;     // prezzo offerta lancio
const STANDARD_PRICE = 9.90;   // prezzo standard (report 7+)

// ── Email normalization + hash ────────────────────────────────────────────────
function normalizeEmail(email) {
  if (!email) return '';
  let [local, domain] = email.toLowerCase().trim().split('@');
  if (!domain) return email.toLowerCase().trim();

  // Rimuovi alias dopo il '+' (funziona per TUTTI i provider)
  const plusIdx = local.indexOf('+');
  if (plusIdx !== -1) {
    local = local.substring(0, plusIdx);
  }

  // Per Gmail/Googlemail: rimuovi anche i punti nella parte locale
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '');
  }

  return `${local}@${domain}`;
}

async function hashEmail(normalizedEmail) {
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedEmail);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Genera un token pubblico firmato con scadenza 72h e salva report_url sul record
async function generateAndSavePublicToken(base44, query_id, comune, foglio, particella) {
  const token = crypto.randomUUID().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const reportUrl = `${APP_URL}/report/public/${query_id}?token=${token}`;
  await base44.asServiceRole.entities.CadastralQuery.update(query_id, {
    public_token: token,
    token_expires_at: expiresAt,
    report_url: reportUrl,
  });
  console.log(`chargeReport: generated public token for ${query_id}, expires ${expiresAt}`);
  return { token, expiresAt, reportUrl };
}

// Estrae l'IP reale del client dagli header della request
function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
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
        await generateAndSavePublicToken(base44, query_id, adminQuery.comune, adminQuery.foglio, adminQuery.particella);
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

    // ── Email normalization — aggrega free_reports_used tra tutti gli alias ──
    const normalizedEmail = normalizeEmail(user.email);

    // Trova (o crea) lo UserCredits per questo utente
    const creditsList = await base44.asServiceRole.entities.UserCredits.filter({ user_email: user.email });
    let credits = creditsList[0];

    // Auto-create UserCredits if missing (new user)
    if (!credits) {
      credits = await base44.asServiceRole.entities.UserCredits.create({
        user_email: user.email,
        normalized_email: normalizedEmail,
        balance: 0,
        total_spent: 0,
        total_queries: 0,
        free_reports_used: 0,
        beta_paid_reports_used: 0,
      });
      console.log(`chargeReport: created UserCredits for ${user.email} (normalized: ${normalizedEmail})`);
    } else if (!credits.normalized_email) {
      // Backfill normalized_email for legacy records
      await base44.asServiceRole.entities.UserCredits.update(credits.id, {
        normalized_email: normalizedEmail,
      });
      console.log(`chargeReport: backfilled normalized_email for ${user.email} → ${normalizedEmail}`);
    }

    // Aggrega free_reports_used su TUTTI gli UserCredits con la stessa email normalizzata
    const allNormalizedCredits = await base44.asServiceRole.entities.UserCredits.filter(
      { normalized_email: normalizedEmail },
      '', // sort
      200, // limit — copre casi di molti alias
    );
    const aggregatedFreeUsed = allNormalizedCredits.reduce(
      (sum, c) => sum + (c.free_reports_used || 0), 0
    );
    const aggregatedLaunchUsed = allNormalizedCredits.reduce(
      (sum, c) => sum + (c.beta_paid_reports_used || 0), 0
    );

    // ── Anti-abuso: FreeTierLedger — contatori permanenti per email_hash ──────
    const emailHash = await hashEmail(normalizedEmail);
    const ledgerList = await base44.asServiceRole.entities.FreeTierLedger.filter({ email_hash: emailHash }, '', 1);
    const ledger = ledgerList[0] || null;
    const ledgerFreeUsed = ledger?.free_reports_used || 0;
    const ledgerBetaUsed = ledger?.beta_paid_reports_used || 0;

    // Usa il massimo tra il contatore live (UserCredits) e quello storico (FreeTierLedger)
    const effectiveFreeUsed = Math.max(aggregatedFreeUsed, ledgerFreeUsed);
    const effectiveLaunchUsed = Math.max(aggregatedLaunchUsed, ledgerBetaUsed);

    console.log(`chargeReport: email=${user.email} normalized=${normalizedEmail} aggregatedFree=${aggregatedFreeUsed} aggregatedLaunch=${aggregatedLaunchUsed} ledgerFree=${ledgerFreeUsed} ledgerBeta=${ledgerBetaUsed} effectiveFree=${effectiveFreeUsed} effectiveLaunch=${effectiveLaunchUsed}`);

    // ── Controllo limite IP ────────────────────────────────────────────────
    const clientIp = getClientIp(req);
    let ipRecord = null;
    let ipFreeUsed = 0;

    if (clientIp && clientIp !== 'unknown') {
      const ipList = await base44.asServiceRole.entities.FreeUsageIP.filter({ ip_address: clientIp });
      ipRecord = ipList[0] || null;
      ipFreeUsed = ipRecord?.free_count || 0;
    }

    console.log(`chargeReport: ip=${clientIp} ipFreeUsed=${ipFreeUsed}`);

    // ── Funnel pricing ────────────────────────────────────────────────────────
    // Un report è gratuito SOLO SE sia l'email normalizzata (incl. FreeTierLedger) che l'IP sono sotto soglia
    const emailUnderLimit = effectiveFreeUsed < FREE_REPORTS;
    const ipUnderLimit = clientIp === 'unknown' || ipFreeUsed < FREE_REPORTS_IP;

    if (emailUnderLimit && ipUnderLimit) {
      // TIER 1 — GRATIS (report 1–3, entrambe le condizioni soddisfatte)
      console.log(`chargeReport: FREE tier — effectiveFree=${effectiveFreeUsed} ipFree=${ipFreeUsed}`);

      await base44.asServiceRole.entities.UserCredits.update(credits.id, {
        free_reports_used: (credits.free_reports_used || 0) + 1,
        total_queries: (credits.total_queries || 0) + 1,
        normalized_email: normalizedEmail,
      });

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

      await base44.asServiceRole.entities.CadastralQuery.update(query_id, { paid: true, status: 'completed', cost: 0 });
      await generateAndSavePublicToken(base44, query_id, query.comune, query.foglio, query.particella);
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_email: user.email, type: 'query_charge', amount: 0,
        description: `Report gratuito #${effectiveFreeUsed + 1}/3 — ${query.comune || ''} F.${query.foglio} P.${query.particella}`,
        query_id,
      });
      return Response.json({ ok: true, deducted: 0, tier: 'free', free_reports_used: effectiveFreeUsed + 1, free_reports_total: FREE_REPORTS, launch_reports_total: LAUNCH_PAID_REPORTS });

    } else if (effectiveLaunchUsed < LAUNCH_PAID_REPORTS) {
      // TIER 2 — €2,99 offerta lancio (report 4–6)
      console.log(`chargeReport: LAUNCH_PAID tier — effectiveLaunch=${effectiveLaunchUsed}`);

      if ((credits.balance || 0) < LAUNCH_PRICE) {
        return Response.json({
          error: 'insufficient_credits',
          balance: credits.balance || 0,
          required: LAUNCH_PRICE,
          tier: 'launch_paid',
        }, { status: 402 });
      }

      await base44.asServiceRole.entities.UserCredits.update(credits.id, {
        balance: parseFloat((credits.balance - LAUNCH_PRICE).toFixed(2)),
        total_spent: parseFloat(((credits.total_spent || 0) + LAUNCH_PRICE).toFixed(2)),
        total_queries: (credits.total_queries || 0) + 1,
        beta_paid_reports_used: (credits.beta_paid_reports_used || 0) + 1,
        normalized_email: normalizedEmail,
      });
      await base44.asServiceRole.entities.CadastralQuery.update(query_id, { paid: true, status: 'completed', cost: LAUNCH_PRICE });
      await generateAndSavePublicToken(base44, query_id, query.comune, query.foglio, query.particella);
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_email: user.email, type: 'query_charge', amount: -LAUNCH_PRICE,
        description: `Report lancio €2,99 #${effectiveLaunchUsed + 1}/3 — ${query.comune || ''} F.${query.foglio} P.${query.particella}`,
        query_id,
      });
      return Response.json({ ok: true, deducted: LAUNCH_PRICE, tier: 'launch_paid', free_reports_used: effectiveFreeUsed, free_reports_total: FREE_REPORTS, launch_reports_used: effectiveLaunchUsed + 1, launch_reports_total: LAUNCH_PAID_REPORTS });

    } else {
      // TIER 3 — €9,90 prezzo standard (report 7+)
      console.log(`chargeReport: STANDARD tier — effectiveFree=${effectiveFreeUsed}, effectiveLaunch=${effectiveLaunchUsed}`);

      if ((credits.balance || 0) < STANDARD_PRICE) {
        return Response.json({
          error: 'insufficient_credits',
          balance: credits.balance || 0,
          required: STANDARD_PRICE,
          tier: 'standard',
        }, { status: 402 });
      }

      await base44.asServiceRole.entities.UserCredits.update(credits.id, {
        balance: parseFloat((credits.balance - STANDARD_PRICE).toFixed(2)),
        total_spent: parseFloat(((credits.total_spent || 0) + STANDARD_PRICE).toFixed(2)),
        total_queries: (credits.total_queries || 0) + 1,
        normalized_email: normalizedEmail,
      });
      await base44.asServiceRole.entities.CadastralQuery.update(query_id, { paid: true, status: 'completed', cost: STANDARD_PRICE });
      await generateAndSavePublicToken(base44, query_id, query.comune, query.foglio, query.particella);
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_email: user.email, type: 'query_charge', amount: -STANDARD_PRICE,
        description: `Report standard €9,90 — ${query.comune || ''} F.${query.foglio} P.${query.particella}`,
        query_id,
      });
      return Response.json({ ok: true, deducted: STANDARD_PRICE, tier: 'standard', free_reports_used: effectiveFreeUsed, free_reports_total: FREE_REPORTS });
    }

  } catch (error) {
    console.error('chargeReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});