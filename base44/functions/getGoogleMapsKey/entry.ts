import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Origini autorizzate a richiedere la chiave (browser).
const ALLOWED_ORIGINS = [
  "https://urbicheck.it",
  "https://www.urbicheck.it",
  "https://app--urbicheck--bfe5a741.base44.app",
];

function getAllowedOrigin(req) {
  const origin = req.headers.get("origin") || "";
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

async function getAuthenticatedUser(req) {
  try {
    const base44 = createClientFromRequest(req);
    return await base44.auth.me();
  } catch (_e) {
    return null;
  }
}

Deno.serve(async (req) => {
  const allowedOrigin = getAllowedOrigin(req);
  const corsHeaders = allowedOrigin ? {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  } : {};

  if (req.method === "OPTIONS") {
    return new Response(null, { status: allowedOrigin ? 204 : 403, headers: corsHeaders });
  }

  // Richiede un utente autenticato: la chiave non è più esposta a chiamanti anonimi.
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!key) {
    return Response.json({ key: null, error: 'GOOGLE_MAPS_API_KEY not set' }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ key }, { headers: corsHeaders });
});
