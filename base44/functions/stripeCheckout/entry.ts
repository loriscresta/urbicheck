import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

const PACKAGES = {
  'price_1TbgLXLyFVq8L2LAeoECufB1': { credits: 2.90,  label: 'Pacchetto BETA — 1 analisi' },
  'price_1TYMpKLyFVq8L2LAu5vrVYJb': { credits: 9.90,  label: 'Pacchetto SINGOLA — 1 analisi' },
  'price_1TbgJJLyFVq8L2LAeYJAXKu6': { credits: 29.70, label: 'Pacchetto STARTER — 3 analisi' },
  'price_1TbgKBLyFVq8L2LAxMA6TlTj': { credits: 49.50, label: 'Pacchetto PRO — 5 analisi' },
  'price_1TZrnJLyFVq8L2LAnQJOOnOR': { credits: 99.00, label: 'Pacchetto BUSINESS — 10 analisi' },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { price_id, success_url, cancel_url } = await req.json();

    if (!PACKAGES[price_id]) {
      return Response.json({ error: 'Pacchetto non valido' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode: 'payment',
      success_url: success_url || `${req.headers.get('origin')}/credits?success=1`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/credits?cancelled=1`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_email: user.email,
        user_id: user.id,
        price_id,
        credits: String(PACKAGES[price_id].credits),
        package_label: PACKAGES[price_id].label,
      },
    });

    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('stripeCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});