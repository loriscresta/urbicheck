import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Endpoint diagnostico temporaneo — verifica la presenza dei secret CAPI
// SENZA esporne i valori sensibili. Accessibile solo a utenti autenticati.
// Da rimuovere una volta confermata la causa del silenzio server-side.
Deno.serve(async (req) => {
  let user = null;
  try {
    const base44 = createClientFromRequest(req);
    user = await base44.auth.me();
  } catch (_e) {
    // ignora
  }
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pixelId = Deno.env.get('META_PIXEL_ID') || null;
  const capiToken = Deno.env.get('META_CAPI_TOKEN') || null;
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS') || null;

  return Response.json({
    // Il pixel ID non è un segreto (è già nel frontend), quindi lo mostriamo.
    meta_pixel_id_present: !!pixelId,
    meta_pixel_id_value: pixelId,
    meta_pixel_id_is_correct: pixelId === '1962386827973256',
    // Il token è segreto: mostriamo solo presenza e lunghezza.
    meta_capi_token_present: !!capiToken,
    meta_capi_token_length: capiToken ? capiToken.length : 0,
    allowed_origins_present: !!allowedOrigins,
    allowed_origins_value: allowedOrigins,
    checked_at: new Date().toISOString(),
  });
});
