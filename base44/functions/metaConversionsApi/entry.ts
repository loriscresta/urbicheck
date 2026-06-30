import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Il Pixel ID è un identificatore pubblico (visibile lato browser). Letto da env per best practice,
// con fallback al valore noto per non interrompere il tracking se il secret non è impostato.
const PIXEL_ID = Deno.env.get("META_CONVERSIONS_PIXEL_ID") || "1405555848052349";

const ALLOWED_ORIGINS = [
  "https://urbicheck.it",
  "https://www.urbicheck.it",
  "https://app--urbicheck--bfe5a741.base44.app",
];

function getAllowedOrigin(req) {
  const origin = req.headers.get("origin") || "";
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

// Auth check helper
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

  try {
    const accessToken = Deno.env.get("META_CAPI_ACCESS_TOKEN");
    if (!accessToken) {
      return Response.json({ error: "META_CAPI_ACCESS_TOKEN not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { event_name, event_id, event_source_url, event_time, email, custom_data, fbp, fbc } = body;

    if (!event_name) {
      return Response.json({ error: "event_name is required" }, { status: 400 });
    }

    // Normalizza e hasha l'email
    const em = email ? [await sha256hex(email.toLowerCase().trim())] : undefined;

    // Recupera IP e User-Agent dalla request
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

    const eventPayload = {
      event_name,
      event_time: event_time || Math.floor(Date.now() / 1000),
      event_source_url: event_source_url || undefined,
      action_source: "website",
      user_data,
      ...(event_id ? { event_id } : {}),
      ...(custom_data ? { custom_data } : {}),
    };

    const payload = { data: [eventPayload] };

    const testEventCode = Deno.env.get("META_CAPI_TEST_EVENT_CODE");
    if (testEventCode) payload.test_event_code = testEventCode;

    const url = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${accessToken}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log(`[MetaCAPI] ${event_name} event_id=${event_id} status=${response.status}`, JSON.stringify(result));

    if (!response.ok) {
      console.error("[MetaCAPI] Error from Meta API:", JSON.stringify(result));
      return Response.json({ success: false, error: result?.error?.message || "Meta API error" }, { status: 200, headers: corsHeaders });
    }

    return Response.json({ success: true, events_received: result.events_received }, { headers: corsHeaders });
  } catch (error) {
    console.error("[MetaCAPI] Exception:", error.message);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});