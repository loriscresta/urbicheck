import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = 'https://app.urbicheck.it';

function buildEmailHtml({ userName, comune, foglio, particella, score, elementi, queryId }) {
  const scoreColor = score >= 7 ? '#059669' : score >= 5 ? '#d97706' : '#dc2626';
  const scoreLabel = score >= 7 ? 'Basso Rischio' : score >= 5 ? 'Rischio Medio' : 'Alto Rischio';
  const reportUrl = `${APP_URL}/report/${queryId}`;

  const elementiHtml = (elementi || []).map(e => `
    <tr>
      <td style="padding:10px 16px; border-bottom:1px solid #e5e7eb; font-family:'Courier New',monospace; font-size:13px; color:#374151;">
        ${e.icon} &nbsp;${e.label}
      </td>
      <td style="padding:10px 16px; border-bottom:1px solid #e5e7eb; font-family:'Courier New',monospace; font-size:13px; color:${e.ok ? '#059669' : '#dc2626'}; font-weight:600; text-align:right;">
        ${e.value}
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Report UrbiCheck pronto</title></head>
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
                    ✅ REPORT PRONTO
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;">
            <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:14px;color:#374151;">
              Ciao <strong>${userName}</strong>,
            </p>
            <p style="margin:0 0 24px;font-family:Georgia,serif;font-size:15px;color:#374151;line-height:1.7;">
              Il tuo report urbanistico è stato elaborato con successo. Puoi visualizzarlo e scaricarlo in PDF.
            </p>

            <!-- Property Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                  <p style="margin:0;font-family:'Courier New',monospace;font-size:10px;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;">IMMOBILE ANALIZZATO</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#1e3a5f;">
                    ${comune.toUpperCase()}
                  </p>
                  <p style="margin:0;font-family:'Courier New',monospace;font-size:13px;color:#64748b;">
                    Foglio ${foglio} &nbsp;·&nbsp; Particella ${particella}
                  </p>
                </td>
                <td align="right" style="padding:16px 20px;vertical-align:middle;">
                  <div style="background:${scoreColor};color:white;font-family:'Courier New',monospace;font-size:13px;font-weight:700;padding:10px 16px;text-align:center;">
                    Score ${score}/10<br>
                    <span style="font-size:10px;font-weight:400;">${scoreLabel}</span>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Key Findings -->
            ${elementiHtml ? `
            <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:10px;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;">ELEMENTI CHIAVE</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;margin-bottom:28px;">
              ${elementiHtml}
            </table>
            ` : ''}

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${reportUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;font-family:'Courier New',monospace;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:16px 40px;text-decoration:none;border-bottom:4px solid #10b981;">
                    VISUALIZZA REPORT COMPLETO →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;text-align:center;">
              <a href="${reportUrl}" style="font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;">
                Scarica anche il PDF dal report
              </a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:10px;color:#94a3b8;line-height:1.6;">
              <strong>Disclaimer:</strong> Analisi orientativa generata da fonti GIS ufficiali. Non sostituisce pareri professionali di geometra, architetto o ingegnere.
            </p>
            <p style="margin:0;font-family:'Courier New',monospace;font-size:10px;color:#94a3b8;">
              UrbiCheck © 2026 — Fenice Management — P.IVA IT02655840060
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    // Support both direct call (query_id) and entity automation payload (event.entity_id)
    const query_id = payload.query_id || payload.event?.entity_id || payload.data?.id;

    if (!query_id) {
      return Response.json({ error: 'query_id required' }, { status: 400 });
    }

    // Get query — prefer data from payload if already included
    let query = (payload.data?.status === 'completed') ? payload.data : null;
    if (!query) {
      const rows = await base44.asServiceRole.entities.CadastralQuery.filter({ id: query_id });
      query = rows[0];
    }
    if (!query) return Response.json({ error: 'Query not found' }, { status: 404 });

    const userEmail = query.created_by;
    if (!userEmail) return Response.json({ error: 'No user email' }, { status: 400 });

    // Get user name from User entity
    let userName = 'Utente';
    try {
      const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
      if (users[0]?.full_name) userName = users[0].full_name.split(' ')[0];
    } catch (_e) {}

    const r = query.report_data || {};

    // Build score
    const valSin = r.valutazione_sintetica || {};
    const scoreRaw = valSin.score_rischio || valSin.score || 7;
    const score = typeof scoreRaw === 'number' ? Math.min(10, Math.max(1, Math.round(scoreRaw))) : 7;

    // Build key elements
    const elementi = [];
    if (r.vincoli?.vincolo_sismico) {
      elementi.push({ icon: '🔴', label: 'Zona Sismica', value: r.vincoli.vincolo_sismico.zona || 'Zona 3', ok: false });
    }
    if (r.vincoli?.vincolo_paesaggistico) {
      const presente = r.vincoli.vincolo_paesaggistico.presente;
      elementi.push({ icon: presente ? '🟡' : '🟢', label: 'Vincolo Paesaggistico', value: presente ? 'Presente' : 'Assente', ok: !presente });
    }
    if (r.zonizzazione?.destinazione_prevalente) {
      elementi.push({ icon: '🏙️', label: 'Zona Urbanistica', value: r.zonizzazione.destinazione_prevalente, ok: true });
    }
    if (r.vincoli?.vincolo_idraulico) {
      const p = r.vincoli.vincolo_idraulico.presente;
      elementi.push({ icon: p ? '🔴' : '🟢', label: 'Rischio Idraulico', value: p ? `Classe ${r.vincoli.vincolo_idraulico.classe_rischio || '?'}` : 'Nessun rischio', ok: !p });
    }

    const subject = `✅ Il tuo report UrbiCheck è pronto — ${query.comune} Fg.${query.foglio} Map.${query.particella}`;
    const html = buildEmailHtml({
      userName,
      comune: query.comune,
      foglio: query.foglio,
      particella: query.particella,
      score,
      elementi: elementi.slice(0, 4),
      queryId: query_id,
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: userEmail,
      subject,
      body: html,
      from_name: 'UrbiCheck',
    });

    return Response.json({ ok: true, sent_to: userEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});