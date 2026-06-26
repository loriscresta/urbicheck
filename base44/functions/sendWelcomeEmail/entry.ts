import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = Deno.env.get("APP_URL") ?? "https://urbicheck.it";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── AUTH CHECK: solo utenti autenticati ──
    let user;
    try { user = await base44.auth.me(); } catch (_e) {}
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Usa l'email dell'utente autenticato, non del body ──
    const user_email = user.email;
    const user_name = user.name || user.full_name || '';

    // ── Nessun credito di benvenuto — il funnel gratuito è gestito da chargeReport ──
    // I primi 3 report sono gratis (€0), i successivi 3 a €2.99, poi €9.90 standard.
    // Il saldo parte da 0 e i tier sono determinati dai counter free_reports_used / beta_paid_reports_used.

    if (!user_email) return Response.json({ error: 'user_email required' }, { status: 400 });

    const firstName = (user_name || 'Utente').split(' ')[0];
    const searchUrl = `${APP_URL}/search`;
    const creditsUrl = `${APP_URL}/credits`;

    const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Benvenuto in UrbiCheck</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:28px 32px;border-bottom:4px solid #10b981;">
            <span style="font-family:'Courier New',monospace;font-size:22px;font-weight:700;letter-spacing:2px;">
              <span style="color:#f1f5f9;">URBI</span><span style="color:#10b981;">CHECK</span>
            </span>
            <p style="margin:4px 0 0;font-family:'Courier New',monospace;font-size:10px;color:rgba(241,245,249,0.5);letter-spacing:3px;text-transform:uppercase;">
              ANALISI URBANISTICA
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 28px;">
            <p style="margin:0 0 12px;font-family:'Courier New',monospace;font-size:14px;color:#374151;">
              Ciao <strong>${firstName}</strong> 👋
            </p>
            <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;font-weight:400;color:#1e3a5f;line-height:1.4;">
              Benvenuto in UrbiCheck —<br>la tua due diligence immobiliare istantanea.
            </h1>
            <p style="margin:0 0 28px;font-family:Georgia,serif;font-size:15px;color:#374151;line-height:1.7;">
              Con UrbiCheck puoi analizzare qualsiasi immobile in pochi minuti: zona urbanistica, vincoli, rischio sismico e idraulico, fattibilità di costruzione — tutto da fonti GIS ufficiali.
            </p>

            <!-- 3 key points -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;margin-bottom:32px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:40px;vertical-align:top;font-size:20px;">🔍</td>
                    <td style="vertical-align:top;padding-left:12px;">
                      <p style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#1e3a5f;">Analisi in 3 minuti</p>
                      <p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#64748b;line-height:1.5;">Inserisci comune, foglio e particella. Il report è pronto in pochi minuti.</p>
                    </td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:40px;vertical-align:top;font-size:20px;">📊</td>
                    <td style="vertical-align:top;padding-left:12px;">
                      <p style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#1e3a5f;">Dati GIS ufficiali</p>
                      <p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#64748b;line-height:1.5;">PAI, vincoli paesaggistici, sismica, zona urbanistica — da fonti regionali certificate.</p>
                    </td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:40px;vertical-align:top;font-size:20px;">💳</td>
                    <td style="vertical-align:top;padding-left:12px;">
                     <p style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#10b981;">🎁 3 report gratuiti inclusi in beta!</p>
                     <p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#64748b;line-height:1.5;">Le prime 3 analisi sono gratuite. Poi €2,99 a report durante la beta, €9,90 a regime. Nessun abbonamento.</p>
                    </td>
                  </tr></table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <tr><td align="center">
                <a href="${searchUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;font-family:'Courier New',monospace;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:16px 40px;text-decoration:none;border-bottom:4px solid #10b981;">
                  CREA IL TUO PRIMO REPORT →
                </a>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;text-align:center;font-family:'Courier New',monospace;font-size:12px;color:#94a3b8;">
              Hai bisogno di crediti prima?
            </p>
            <p style="margin:0;text-align:center;">
              <a href="${creditsUrl}" style="font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;text-decoration:underline;">
                Ricarica il saldo crediti →
              </a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:10px;color:#94a3b8;line-height:1.6;">
              Analisi orientativa — non sostituisce pareri professionali. UrbiCheck © 2026
            </p>
            <p style="margin:0;font-family:'Courier New',monospace;font-size:10px;color:#94a3b8;">
              Fenice Management — P.IVA IT02655840060 — Carentino (AL)
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user_email,
      subject: '👋 Benvenuto in UrbiCheck — la tua due diligence immobiliare istantanea',
      body: html,
      from_name: 'UrbiCheck',
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});