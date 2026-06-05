const PIXEL_ID = "1405555848052349";

async function sha256hex(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const accessToken = Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!accessToken) {
    console.error("[metaCapi] missing META_CAPI_ACCESS_TOKEN");
    return Response.json({ error: "missing META_CAPI_ACCESS_TOKEN" }, { status: 500 });
  }

  const body = await req.json();
  const { event_name, event_id, event_source_url, email, custom_data, fbp, fbc } = body;

  if (!event_name) {
    return Response.json({ error: "event_name is required" }, { status: 400 });
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
  return Response.json({ fb_status: res.status, fb_response: result });
});