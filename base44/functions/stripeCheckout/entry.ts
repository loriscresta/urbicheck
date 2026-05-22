import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

const PACKAGES = {
  'price_1TZrnJLyFVq8L2LAyYXq0y8u': { credits: 25,  label: 'Starter — €25 crediti' },
  'price_1TZrnJLyFVq8L2LAKICk86H0': { credits: 55,  label: 'Pro — €55 crediti' },
  'price_1TZrnJLyFVq8L2LAnQJOOnOR': { credits: 99,  label: 'Business — €99 crediti' },
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