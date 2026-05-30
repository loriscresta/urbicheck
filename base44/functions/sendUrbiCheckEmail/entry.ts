/**
 * sendUrbiCheckEmail — Servizio email branded UrbiCheck
 * Gestisce 3 tipi: report_ready | welcome | credits_purchased
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = Deno.env.get('APP_BASE_URL') || 'https://urbicheck.base44.app';

// ── HTML template base ──
function baseTemplate(content) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UrbiCheck</title>
</head>
<body style="margin:0;padding:0;background:#F4EFE6;font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4EFE6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:#1A3A6B;border-bottom:3px solid #B33A2A;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-family:'Courier New',monospace;font-weight:700;font-size:20px;letter-spacing:4px;color:#F4EFE6;">URBI</span><span style="font-family:'Courier New',monospace;font-weight:700;font-size:20px;letter-spacing:4px;color:#B33A2A;">CHECK</span>
                  <div style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(244,239,230,0.5);margin-top:4px;">ANALISI URBANISTICA</div>
                </td>
                <td align="right">
                  <span style="font-family:'Courier New',monospace;font-size:9px;color:rgba(244,239,230,0.4);letter-spacing:2px;">urbicheck.it</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#ffffff;padding:40px 32px;">
            ${content}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#1C1A17;padding:24px 32px;border-top:1px solid #333;">
            <p style="font-family:'Courier New',monospace;font-size:10px;color:#7A7268;margin:0 0 8px 0;line-height:1.6;">
              ⚠ <strong>Disclaimer:</strong> Le informazioni contenute nel report UrbiCheck sono generate a scopo informativo e orientativo. Non sostituiscono la consulenza di un professionista abilitato (geometra, architetto, ingegnere). I dati urbanistici possono variare in base ad aggiornamenti normativi.
            </p>
            <p style="font-family:'Courier New',monospace;font-size:10px;color:#555;margin:0;line-height:1.6;">
              © 2026 UrbiCheck — Fenice Management · P.IVA IT02655840060<br>
              <a href="mailto:loris.cresta@gmail.com" style="color:#7A7268;">Contattaci</a> · 
              <a href="${APP_URL}" style="color:#7A7268;">urbicheck.it</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Email: Report Pronto ──
function buildReportReadyEmail({ query, reportUrl }) {
  const r = query.report_data || {};
  const comune = query.comune || '—';
  const foglio = query.foglio || '—';
  const particella = query.particella || '—';
  const reportNum = `UB-${(query.id || '').slice(-8).toUpperCase()}`;

  // Estrai score e rischio
  const score = r.valutazione_sintetica?.livello_complessita || null;
  const scoreBadge = score === 'Alto'
    ? `<span style="background:#fee2e2;color:#dc2626;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:1px;">⚠ CRITICITÀ ALTE</span>`
    : score === 'Medio'
    ? `<span style="background:#fef3c7;color:#d97706;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:1px;">▲ RISCHIO MEDIO</span>`
    : `<span style="background:#d1fae5;color:#059669;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:1px;">✓ BASSO RISCHIO</span>`;

  // Punti salienti — leggi da WFS (fonte autoritativa) con fallback su AI
  const highlights = [];
  const vincoli = r.vincoli || {};
  const wfsRis = r.wfs_liguria?.risultati;

  // Sismica: WFS autoritativo (zona "3", "2", "4" ecc.), fallback AI, fallback neutro
  const sismicaWfs = wfsRis?.sismica;
  if (sismicaWfs?.zona) {
    highlights.push(`🟠 Zona Sismica — Zona ${sismicaWfs.zona}${sismicaWfs.descrizione ? ' — ' + sismicaWfs.descrizione : ''}`);
  } else if (vincoli.vincolo_sismico?.presente) {
    highlights.push(`🟠 Zona Sismica — Verifica manuale`);
  }

  // Vincolo paesaggistico: da WFS ope legis
  const vpWfs = wfsRis?.vincoli_paesaggistici_ope_legis?.vincoli;
  if (vpWfs) {
    const presente = vpWfs.some(v => v.livello && v.livello !== 'NESSUN_VINCOLO_RILEVATO');
    highlights.push(presente ? `🟡 Vincolo paesaggistico art.142 — Presente` : `🟢 Vincolo paesaggistico — Assente`);
  } else if (vincoli.vincolo_paesaggistico?.presente !== undefined) {
    highlights.push(vincoli.vincolo_paesaggistico.presente ? `🟡 Vincolo paesaggistico art.142 — Presente` : `🟢 Vincolo paesaggistico — Assente`);
  }

  // Rischio idraulico: da WFS corsi acqua
  const corsiWfs = wfsRis?.vincolo_corsi_acqua?.dati;
  if (corsiWfs) {
    const trovato = corsiWfs.some(d => d.trovato);
    highlights.push(trovato ? `🔵 Corsi d'acqua — Vincolo rilevato` : `🟢 Rischio idraulico — Nessun rischio`);
  } else if (wfsRis?.pai_rischio_idrogeologico?.dati?.some(d => d.trovato)) {
    highlights.push(`🔵 PAI: rischio idrogeologico rilevato`);
  } else if (vincoli.vincolo_idraulico?.presente) {
    highlights.push(`🔵 Rischio idraulico — ${vincoli.vincolo_idraulico.classe_rischio || 'rilevato'}`);
  }

  // Zona urbanistica: WFS zona_urbanistica > zonizzazione AI
  const zonaUrb = wfsRis?.zona_urbanistica;
  const zonaCode = zonaUrb?.zona_codice || r.zonizzazione?.zona_codice || '';
  const zonaLabel = zonaUrb?.destinazione_uso || r.zonizzazione?.destinazione_prevalente || '';
  if (zonaCode || zonaLabel) {
    highlights.push(`🗺️ Zona: ${[zonaCode, zonaLabel].filter(Boolean).join(' — ')}`);
  }
  const topHighlights = highlights.slice(0, 3);

  const highlightsHtml = topHighlights.length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #C4BAA8;">
        ${topHighlights.map((h, i) => `
          <tr style="background:${i % 2 === 0 ? '#fff' : '#F4EFE6'};">
            <td style="padding:10px 16px;font-family:'Courier New',monospace;font-size:12px;color:#1C1A17;border-bottom:1px solid #C4BAA8;">${h}</td>
          </tr>`).join('')}
       </table>`
    : '';

  const subject = `✅ Il tuo report UrbiCheck è pronto — ${comune} Fg.${foglio} Map.${particella}`;

  const body = `
    <p style="font-family:'Courier New',monospace;font-size:12px;color:#7A7268;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;">REPORT COMPLETATO · ${reportNum}</p>
    <h1 style="font-size:22px;color:#1A3A6B;font-family:'Courier New',monospace;font-weight:700;margin:0 0 8px 0;line-height:1.3;">
      Il tuo report è pronto
    </h1>
    <p style="font-family:Georgia,serif;font-size:15px;color:#7A7268;margin:0 0 24px 0;line-height:1.6;">
      L'analisi urbanistica per <strong style="color:#1C1A17;">${comune}</strong> — Foglio ${foglio}, Particella ${particella} è stata completata.
    </p>

    <!-- Dati scheda -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #C4BAA8;margin-bottom:24px;">
      <tr style="background:#1A3A6B;">
        <td colspan="2" style="padding:10px 16px;font-family:'Courier New',monospace;font-size:10px;color:#F4EFE6;letter-spacing:2px;text-transform:uppercase;">RIEPILOGO SCHEDA</td>
      </tr>
      <tr style="background:#fff;"><td style="padding:10px 16px;font-family:'Courier New',monospace;font-size:11px;color:#7A7268;width:40%;border-bottom:1px solid #C4BAA8;">Comune</td><td style="padding:10px 16px;font-family:'Courier New',monospace;font-size:12px;color:#1C1A17;font-weight:700;border-bottom:1px solid #C4BAA8;">${comune}${query.provincia ? ` (${query.provincia})` : ''}</td></tr>
      <tr style="background:#F4EFE6;"><td style="padding:10px 16px;font-family:'Courier New',monospace;font-size:11px;color:#7A7268;border-bottom:1px solid #C4BAA8;">Foglio / Particella</td><td style="padding:10px 16px;font-family:'Courier New',monospace;font-size:12px;color:#1C1A17;font-weight:700;border-bottom:1px solid #C4BAA8;">Fg. ${foglio} — Map. ${particella}${query.subalterno ? ` / Sub. ${query.subalterno}` : ''}</td></tr>
      <tr style="background:#fff;"><td style="padding:10px 16px;font-family:'Courier New',monospace;font-size:11px;color:#7A7268;">Livello di complessità</td><td style="padding:10px 16px;">${scoreBadge}</td></tr>
    </table>

    ${topHighlights.length > 0 ? `
    <p style="font-family:'Courier New',monospace;font-size:10px;color:#7A7268;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;">ELEMENTI PRINCIPALI RILEVATI</p>
    ${highlightsHtml}` : ''}

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 16px 0;">
      <tr>
        <td align="center">
          <a href="${reportUrl}" style="display:inline-block;background:#1A3A6B;color:#ffffff;font-family:'Courier New',monospace;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 36px;text-decoration:none;border-bottom:3px solid #B33A2A;">
            Visualizza il report completo →
          </a>
        </td>
      </tr>
    </table>
    <p style="font-family:'Courier New',monospace;font-size:11px;color:#7A7268;text-align:center;margin:0;">
      Oppure copia questo link: <span style="color:#1A3A6B;">${reportUrl}</span>
    </p>
  `;

  return { subject, body: baseTemplate(body) };
}

// ── Email: Benvenuto ──
function buildWelcomeEmail({ userName }) {
  const subject = 'Benvenuto in UrbiCheck — la tua due diligence immobiliare istantanea';
  const name = userName || 'Utente';
  const body = `
    <p style="font-family:'Courier New',monospace;font-size:12px;color:#7A7268;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;">ACCESSO ATTIVATO</p>
    <h1 style="font-size:22px;color:#1A3A6B;font-family:'Courier New',monospace;font-weight:700;margin:0 0 8px 0;line-height:1.3;">
      Benvenuto in UrbiCheck, ${name} 👋
    </h1>
    <p style="font-family:Georgia,serif;font-size:15px;color:#7A7268;margin:0 0 24px 0;line-height:1.7;">
      Sei pronto a fare due diligence urbanistica in <strong style="color:#1C1A17;">60 secondi</strong>. Inserisci foglio e particella — ottieni vincoli, sismicità, rischi idrogeologici e valutazione finanziaria istantanea.
    </p>

    <!-- 3 punti chiave -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #C4BAA8;margin-bottom:28px;">
      ${[
        ['🗺️', 'Zona urbanistica', 'Destinazione d\'uso, indici edilizi e fattibilità interventi.'],
        ['⚠️', 'Vincoli art.142', 'Paesaggistici, idrogeologici, sismici — da WFS regionali ufficiali.'],
        ['💶', 'Valutazione finanziaria', 'OMI, stima rendita, ROI flip/affitto breve/lungo termine.'],
      ].map(([emoji, title, desc], i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#F4EFE6'};border-bottom:1px solid #C4BAA8;">
          <td style="padding:14px 16px;width:40px;font-size:20px;">${emoji}</td>
          <td style="padding:14px 16px;">
            <div style="font-family:'Courier New',monospace;font-size:12px;font-weight:700;color:#1A3A6B;margin-bottom:3px;">${title}</div>
            <div style="font-family:Georgia,serif;font-size:12px;color:#7A7268;line-height:1.5;">${desc}</div>
          </td>
        </tr>`).join('')}
    </table>

    <p style="font-family:'Courier New',monospace;font-size:12px;color:#7A7268;margin:0 0 20px 0;">
      Il tuo primo report costa <strong style="color:#B33A2A;">€9,90</strong> — ricarica i crediti e parti subito.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td align="center">
          <a href="${APP_URL}/credits" style="display:inline-block;background:#B33A2A;color:#ffffff;font-family:'Courier New',monospace;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 36px;text-decoration:none;border-bottom:3px solid rgba(0,0,0,0.25);">
            Ricarica crediti e inizia →
          </a>
        </td>
      </tr>
    </table>
    <p style="font-family:'Courier New',monospace;font-size:11px;color:#7A7268;text-align:center;">
      Oppure <a href="${APP_URL}/search" style="color:#1A3A6B;">crea subito una ricerca</a> se hai già crediti.
    </p>
  `;
  return { subject, body: baseTemplate(body) };
}

// ── Email: Acquisto Crediti ──
function buildCreditsPurchasedEmail({ userName, amount, newBalance }) {
  const subject = `✅ Hai ricaricato €${Number(amount).toFixed(2)} — saldo attuale €${Number(newBalance).toFixed(2)}`;
  const name = userName || 'Utente';
  const reports = Math.floor(newBalance / 9.9);
  const body = `
    <p style="font-family:'Courier New',monospace;font-size:12px;color:#7A7268;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;">RICARICA COMPLETATA</p>
    <h1 style="font-size:22px;color:#1A3A6B;font-family:'Courier New',monospace;font-weight:700;margin:0 0 8px 0;line-height:1.3;">
      Crediti ricaricati con successo ✓
    </h1>
    <p style="font-family:Georgia,serif;font-size:15px;color:#7A7268;margin:0 0 28px 0;line-height:1.6;">
      Ciao ${name}, la tua ricarica è stata elaborata. Sei pronto a fare le tue analisi.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #C4BAA8;margin-bottom:28px;">
      <tr style="background:#1A3A6B;">
        <td colspan="2" style="padding:10px 16px;font-family:'Courier New',monospace;font-size:10px;color:#F4EFE6;letter-spacing:2px;text-transform:uppercase;">DETTAGLIO TRANSAZIONE</td>
      </tr>
      <tr style="background:#fff;">
        <td style="padding:12px 16px;font-family:'Courier New',monospace;font-size:11px;color:#7A7268;border-bottom:1px solid #C4BAA8;">Importo ricaricato</td>
        <td style="padding:12px 16px;font-family:'Courier New',monospace;font-size:16px;color:#059669;font-weight:700;border-bottom:1px solid #C4BAA8;">+€${Number(amount).toFixed(2)}</td>
      </tr>
      <tr style="background:#F4EFE6;">
        <td style="padding:12px 16px;font-family:'Courier New',monospace;font-size:11px;color:#7A7268;border-bottom:1px solid #C4BAA8;">Saldo attuale</td>
        <td style="padding:12px 16px;font-family:'Courier New',monospace;font-size:16px;color:#1A3A6B;font-weight:700;border-bottom:1px solid #C4BAA8;">€${Number(newBalance).toFixed(2)}</td>
      </tr>
      <tr style="background:#fff;">
        <td style="padding:12px 16px;font-family:'Courier New',monospace;font-size:11px;color:#7A7268;">Report disponibili</td>
        <td style="padding:12px 16px;font-family:'Courier New',monospace;font-size:16px;color:#B33A2A;font-weight:700;">~${reports} report</td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${APP_URL}/search" style="display:inline-block;background:#1A3A6B;color:#ffffff;font-family:'Courier New',monospace;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 36px;text-decoration:none;border-bottom:3px solid #B33A2A;">
            Crea il tuo report →
          </a>
        </td>
      </tr>
    </table>
  `;
  return { subject, body: baseTemplate(body) };
}

// ── MAIN HANDLER ──
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  // Called from entity automation (no user auth) — use service role
  const isAutomation = body?.event?.type !== undefined;

  let user = null;
  if (!isAutomation) {
    user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Entity automation payload: { event, data, old_data }
  if (isAutomation) {
    const query = body.data;
    if (!query || query.status !== 'completed') {
      return Response.json({ skipped: true, reason: 'status not completed' });
    }
    // Get the owner email from created_by
    const ownerEmail = query.created_by;
    if (!ownerEmail) return Response.json({ skipped: true, reason: 'no owner email' });

    // Fetch full query data via service role to get report_data
    const queries = await base44.asServiceRole.entities.CadastralQuery.filter({ id: query.id });
    const fullQuery = queries[0];
    if (!fullQuery) return Response.json({ skipped: true, reason: 'query not found' });

    const reportUrl = `${APP_URL}/report/${fullQuery.id}`;
    const { subject, body: html } = buildReportReadyEmail({ query: fullQuery, reportUrl });
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: ownerEmail,
      subject,
      body: html,
      from_name: 'UrbiCheck',
    });
    return Response.json({ success: true, type: 'report_ready', to: ownerEmail });
  }

  const { type, query_id, amount, new_balance, user_name, user_email } = body;

  const targetEmail = user_email || user.email;
  const targetName = user_name || user.full_name || 'Utente';

  // Authorization: non-admin users can only send emails to their own address
  if (user_email && user_email !== user.email && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: cannot send emails to other users' }, { status: 403 });
  }

  if (type === 'report_ready') {
    if (!query_id) return Response.json({ error: 'query_id obbligatorio' }, { status: 400 });
    const queries = await base44.entities.CadastralQuery.filter({ id: query_id });
    const query = queries[0];
    if (!query) return Response.json({ error: 'Query non trovata' }, { status: 404 });
    const reportUrl = `${APP_URL}/report/${query_id}`;
    const { subject, body: html } = buildReportReadyEmail({ query, reportUrl });
    await base44.integrations.Core.SendEmail({ to: targetEmail, subject, body: html, from_name: 'UrbiCheck' });
    return Response.json({ success: true, type: 'report_ready', to: targetEmail });
  }

  if (type === 'welcome') {
    const { subject, body: html } = buildWelcomeEmail({ userName: targetName });
    await base44.integrations.Core.SendEmail({ to: targetEmail, subject, body: html, from_name: 'UrbiCheck' });
    return Response.json({ success: true, type: 'welcome', to: targetEmail });
  }

  if (type === 'credits_purchased') {
    if (!amount || new_balance === undefined) return Response.json({ error: 'amount e new_balance obbligatori' }, { status: 400 });
    const { subject, body: html } = buildCreditsPurchasedEmail({ userName: targetName, amount, newBalance: new_balance });
    await base44.integrations.Core.SendEmail({ to: targetEmail, subject, body: html, from_name: 'UrbiCheck' });
    return Response.json({ success: true, type: 'credits_purchased', to: targetEmail });
  }

  return Response.json({ error: 'type non riconosciuto. Valori: report_ready | welcome | credits_purchased' }, { status: 400 });
});