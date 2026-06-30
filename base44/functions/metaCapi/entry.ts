import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Pixel ID letto esclusivamente da variabile d'ambiente (nessun valore hardcoded).
const PIXEL_ID = Deno.env.get("META_PIXEL_ID");

// Origini CORS autorizzate, esternalizzate in env come lista separata da virgole
// (es. "https://urbicheck.it,https://www.urbicheck.it"). Nessun valore hardcoded.
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

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

async function sha256hex(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const allowedOrigin = getAllowedOrigin(req);
  const corsHeaders = allowedOrigin ? {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  } : {};

  if (req.method === "OPTIONS") {
    return new Response(null, { status: allowedOrigin ? 204 : 403, headers: corsHeaders });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

  const accessToken = Deno.env.get("META_CAPI_TOKEN");
  if (!accessToken) {
    console.error("[metaCapi] missing META_CAPI_TOKEN");
    return Response.json({ error: "missing META_CAPI_ACCESS_TOKEN" }, { status: 500, headers: corsHeaders });
  }

  if (!PIXEL_ID) {
    console.error("[metaCapi] missing META_PIXEL_ID");
    return Response.json({ error: "missing META_PIXEL_ID" }, { status: 500, headers: corsHeaders });
  }

  const body = await req.json();
  const { event_name, event_id, event_source_url, email, custom_data, fbp, fbc } = body;

  if (!event_name) {
    return Response.json({ error: "event_name is required" }, { status: 400, headers: corsHeaders });
  }

  const em = email ? [await sha256hex(email.toLowerCase().trim())] : undefined;

  const client_ip_address =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    undefined;
  const client_user_agent = req.headers.get("user-agent") || undefined;

  const user_data = {
    ...(em ? { em } : {}),
    ...(client_ip_address ? { client_ip_address } : {}),
    ...(client_user_agent ? { client_user_agent } : {}),
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
  };

  const event = {
    event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: event_id || crypto.randomUUID(),
    action_source: "website",
    event_source_url: event_source_url || undefined,
    user_data,
    ...(custom_data ? { custom_data } : {}),
  };

  const payload = { data: [event] };
  const testCode = Deno.env.get("META_CAPI_TEST_EVENT_CODE");
  if (testCode) payload.test_event_code = testCode;

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const result = await res.json();
  console.log(`[metaCapi] ${event_name} event_id=${event.event_id} fb_status=${res.status}`, JSON.stringify(result));

  // Restituisce status + body di Facebook per debug, senza mai esporre il token
  return Response.json({ fb_status: res.status, fb_response: result }, { headers: corsHeaders });
});