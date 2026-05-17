import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = 'https://app.urbicheck.it';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { user_email, user_name, amount_purchased, new_balance } = payload;

    if (!user_email || !amount_purchased) {
      return Response.json({ error: 'user_email and amount_purchased required' }, { status: 400 });
    }

    const firstName = (user_name || 'Utente').split(' ')[0];
    const reportsCount = Math.floor(new_balance / 9.90);
    const searchUrl = `${APP_URL}/search`;

    const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Crediti ricaricati</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:28px 32px;border-bottom:4px solid #10b981;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-family:'Courier New',monospace;font-size:22px;font-weight:700;letter-spacing:2px;">
                    <span style="color:#f1f5f9;">URBI</span><span style="color:#10b981;">CHECK</span>
                  </span>
                  <p style="margin:4px 0 0;font-family:'Courier New',monospace;font-size:10px;color:rgba(241,245,249,0.5);letter-spacing:3px;text-transform:uppercase;">
                    ANALISI URBANISTICA
                  </p>
                </td>
                <td align="right">
                  <span style="background:#10b981;color:#0f172a;font-family:'Courier New',monospace;font-size:11px;font-weight:700;padding:6px 14px;letter-spacing:1px;">
                    💳 CREDITI RICARICATI
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 28px;">
            <p style="margin:0 0 12px;font-family:'Courier New',monospace;font-size:14px;color:#374151;">
              Ciao <strong>${firstName}</strong>,
            </p>
            <p style="margin:0 0 28px;font-family:Georgia,serif;font-size:15px;color:#374151;line-height:1.7;">
              Il tuo pagamento è andato a buon fine. Il tuo saldo UrbiCheck è stato aggiornato.
            </p>

            <!-- Balance box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td width="50%" style="padding:20px;background:#f0fdf4;border:2px solid #10b981;text-align:center;">
                  <p style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:10px;color:#059669;letter-spacing:3px;text-transform:uppercase;">RICARICA</p>
                  <p style="margin:0;font-family:'Courier New',monospace;font-size:28px;font-weight:700;color:#059669;">+€${Number(amount_purchased).toFixed(2)}</p>
                </td>
                <td width="50%" style="padding:20px;background:#f8fafc;border:1px solid #e5e7eb;text-align:center;">
                  <p style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:10px;color:#64748b;letter-spacing:3px;text-transform:uppercase;">SALDO ATTUALE</p>
                  <p style="margin:0;font-family:'Courier New',monospace;font-size:28px;font-weight:700;color:#1e3a5f;">€${Number(new_balance).toFixed(2)}</p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 28px;text-align:center;font-family:Georgia,serif;font-size:14px;color:#64748b;line-height:1.6;">
              Con il tuo saldo puoi analizzare fino a <strong style="color:#1e3a5f;">${reportsCount} immobili</strong> (€9,90 per report).
            </p>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${searchUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;font-family:'Courier New',monospace;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:16px 40px;text-decoration:none;border-bottom:4px solid #10b981;">
                    AVVIA UN'ANALISI →
                  </a>
                </td>
              </tr>
            </table>
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
      subject: `💳 Hai ricaricato €${Number(amount_purchased).toFixed(2)} — saldo attuale €${Number(new_balance).toFixed(2)}`,
      body: html,
      from_name: 'UrbiCheck',
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});