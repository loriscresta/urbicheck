import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { user_email, credits, package_label } = session.metadata || {};

    if (!user_email || !credits) {
      console.error('Missing metadata in session:', session.id);
      return new Response('Missing metadata', { status: 400 });
    }

    const creditAmount = parseFloat(credits);

    try {
      const base44 = createClientFromRequest(req);

      // Find or create UserCredits record
      const existing = await base44.asServiceRole.entities.UserCredits.filter({ user_email });
      
      if (existing.length > 0) {
        const current = existing[0];
        await base44.asServiceRole.entities.UserCredits.update(current.id, {
          balance: (current.balance || 0) + creditAmount,
          total_spent: (current.total_spent || 0) + (session.amount_total / 100),
        });
      } else {
        await base44.asServiceRole.entities.UserCredits.create({
          user_email,
          balance: creditAmount,
          total_spent: session.amount_total / 100,
          total_queries: 0,
        });
      }

      // Log the transaction
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_email,
        type: 'purchase',
        amount: creditAmount,
        description: `Acquisto pacchetto: ${package_label || 'Crediti UrbiCheck'}`,
      });

      // Notify Make.com webhook (fire-and-forget)
      fetch('https://hook.eu1.make.com/ymhq6x0siot8olv8l6ya6cjllpd8sfws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email, amount: creditAmount, type: 'purchase' }),
        signal: AbortSignal.timeout(10000),
      }).catch(() => {});

      // Send confirmation email via Brevo API directly
      try {
        const brevoApiKey = Deno.env.get("BREVO_API_KEY");
        if (brevoApiKey) {
          const amountDesc = creditAmount >= 9.90
            ? `${creditAmount / 9.90} analisi`
            : `crediti (€${creditAmount.toFixed(2)})`;
          await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": brevoApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender: { name: "UrbiCheck", email: "noreply@urbicheck.it" },
              to: [{ email: user_email }],
              subject: "✅ Pagamento ricevuto — UrbiCheck",
              htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1C1A17; background: #F4EFE6;">
                  <h2 style="color: #1A3A6B; border-bottom: 3px solid #B33A2A; padding-bottom: 10px; margin-bottom: 20px;">
                    ✅ Pagamento ricevuto
                  </h2>
                  <p style="font-size: 16px; line-height: 1.6;">
                    Ciao,<br/>
                    grazie per il tuo acquisto su <strong>UrbiCheck</strong>.
                  </p>
                  <div style="background: #ffffff; border: 1px solid #C4BAA8; padding: 16px; margin: 16px 0; font-size: 15px;">
                    <p style="margin: 0 0 4px 0;"><strong>Hai acquistato:</strong> ${package_label || 'Crediti UrbiCheck'}</p>
                    <p style="margin: 0;"><strong>Importo:</strong> €${creditAmount.toFixed(2)}</p>
                    <p style="margin: 0 0 4px 0; color: #7A7268; font-size: 13px;">
                      (${amountDesc} disponibili nel tuo account)
                    </p>
                  </div>
                  <p style="font-size: 15px; line-height: 1.6;">
                    I crediti sono già disponibili nel tuo account. Torna su Urbicheck.it per riprendere la tua analisi catastale.
                  </p>
                  <a href="https://urbicheck.it/search" style="display: inline-block; background: #1A3A6B; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; margin: 12px 0; border-bottom: 3px solid #B33A2A;">
                    Vai all'analisi →
                  </a>
                  <p style="font-size: 12px; color: #7A7268; margin-top: 24px; border-top: 1px solid #C4BAA8; padding-top: 12px;">
                    UrbiCheck — Analisi urbanistica e catastale<br/>
                    <a href="https://urbicheck.it" style="color: #1A3A6B;">urbicheck.it</a>
                  </p>
                </div>
              `,
            }),
            signal: AbortSignal.timeout(15000),
          });
        } else {
          console.warn('BREVO_API_KEY not set — skipping email');
        }
      } catch (emailErr) {
        console.error('Brevo email send failed (non-blocking):', emailErr.message);
      }

      console.log(`Credits added: ${creditAmount} for ${user_email}`);
    } catch (dbErr) {
      console.error('DB update failed:', dbErr.message);
      return new Response('DB error', { status: 500 });
    }
  }

  return new Response('OK', { status: 200 });
});