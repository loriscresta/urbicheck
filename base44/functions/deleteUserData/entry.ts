// deleteUserData — GDPR: elimina tutti i dati dell'utente corrente.
// Prima di eliminare salva/aggiorna FreeTierLedger (anti-abuso free tier).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Normalizza email come chargeReport
function normalizeEmail(email) {
  if (!email) return '';
  let [local, domain] = email.toLowerCase().trim().split('@');
  if (!domain) return email.toLowerCase().trim();
  const plusIdx = local.indexOf('+');
  if (plusIdx !== -1) local = local.substring(0, plusIdx);
  if (domain === 'gmail.com' || domain === 'googlemail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

// SHA-256 dell'email normalizzata (hex string)
async function hashEmail(normalizedEmail) {
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedEmail);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Conferma esplicita richiesta: azione distruttiva e irreversibile (GDPR).
    // Impedisce cancellazioni accidentali o innescate senza intento esplicito.
    let reqBody = {};
    try { reqBody = await req.json(); } catch (_e) { reqBody = {}; }
    if (reqBody?.confirm !== true) {
      return Response.json({ error: 'Conferma esplicita richiesta: invia { confirm: true }' }, { status: 400 });
    }

    // Opera SEMPRE e solo sui dati dell'utente autenticato (mai su id/email forniti dal client).
    const email = user.email;
    const normalizedEmail = normalizeEmail(email);
    const emailHash = await hashEmail(normalizedEmail);

    console.log(`deleteUserData: starting for ${email} (hash: ${emailHash})`);

    // ── 1. Leggi contatori free tier da UserCredits (aggregati su tutti gli alias) ──
    const allCredits = await base44.asServiceRole.entities.UserCredits.filter(
      { normalized_email: normalizedEmail }, '', 200
    );
    const totalFreeUsed = allCredits.reduce((s, c) => s + (c.free_reports_used || 0), 0);
    const totalBetaUsed = allCredits.reduce((s, c) => s + (c.beta_paid_reports_used || 0), 0);

    // Fallback: anche le sole credenziali per l'email diretta
    const directCredits = await base44.asServiceRole.entities.UserCredits.filter({ user_email: email }, '', 10);
    const directFreeUsed = directCredits.reduce((s, c) => s + (c.free_reports_used || 0), 0);
    const directBetaUsed = directCredits.reduce((s, c) => s + (c.beta_paid_reports_used || 0), 0);

    const freeUsed = Math.max(totalFreeUsed, directFreeUsed);
    const betaUsed = Math.max(totalBetaUsed, directBetaUsed);

    console.log(`deleteUserData: freeUsed=${freeUsed} betaUsed=${betaUsed}`);

    // ── 2. Salva/aggiorna FreeTierLedger PRIMA di eliminare i dati ──
    const existing = await base44.asServiceRole.entities.FreeTierLedger.filter({ email_hash: emailHash }, '', 1);
    if (existing.length > 0) {
      const prev = existing[0];
      await base44.asServiceRole.entities.FreeTierLedger.update(prev.id, {
        free_reports_used: Math.max(prev.free_reports_used || 0, freeUsed),
        beta_paid_reports_used: Math.max(prev.beta_paid_reports_used || 0, betaUsed),
        updated_at: new Date().toISOString(),
      });
      console.log(`deleteUserData: updated FreeTierLedger for hash ${emailHash}`);
    } else {
      await base44.asServiceRole.entities.FreeTierLedger.create({
        email_hash: emailHash,
        free_reports_used: freeUsed,
        beta_paid_reports_used: betaUsed,
        updated_at: new Date().toISOString(),
      });
      console.log(`deleteUserData: created FreeTierLedger for hash ${emailHash}`);
    }

    // ── 3. Elimina tutti i dati dell'utente (in parallelo dove possibile) ──
    const deletions = await Promise.allSettled([
      base44.asServiceRole.entities.UserCredits.deleteMany({ user_email: email }),
      base44.asServiceRole.entities.CreditTransaction.deleteMany({ user_email: email }),
      base44.asServiceRole.entities.SearchLog.deleteMany({ user_email: email }),
      base44.asServiceRole.entities.CadastralQuery.deleteMany({ created_by_id: user.id }),
      base44.asServiceRole.entities.BatchQuery.deleteMany({ created_by_id: user.id }),
      base44.asServiceRole.entities.AttiRequest.deleteMany({ user_email: email }),
      base44.asServiceRole.entities.WaitlistSubscriber.deleteMany({ email }),
    ]);

    const errors = deletions
      .filter(r => r.status === 'rejected')
      .map(r => r.reason?.message || 'unknown error');

    if (errors.length > 0) {
      console.warn(`deleteUserData: some deletions had errors: ${errors.join(', ')}`);
    }

    console.log(`deleteUserData: completed for ${email}`);
    return Response.json({ ok: true, errors: errors.length > 0 ? errors : undefined });

  } catch (error) {
    console.error('deleteUserData error:', error.message);
    return Response.json({ error: 'Errore interno durante la cancellazione' }, { status: 500 });
  }
});