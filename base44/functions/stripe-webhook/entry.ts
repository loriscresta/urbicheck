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

      // Send confirmation email
      try {
        await base44.asServiceRole.functions.invoke('sendCreditsPurchasedEmail', {
          user_email,
          credits_added: creditAmount,
          package_name: package_label,
        });
      } catch (emailErr) {
        console.error('Email send failed (non-blocking):', emailErr.message);
      }

      console.log(`Credits added: ${creditAmount} for ${user_email}`);
    } catch (dbErr) {
      console.error('DB update failed:', dbErr.message);
      return new Response('DB error', { status: 500 });
    }
  }

  return new Response('OK', { status: 200 });
});