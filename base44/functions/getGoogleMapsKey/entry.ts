import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!key) return Response.json({ key: null, error: 'GOOGLE_MAPS_API_KEY not set' }, { status: 500 });
  return Response.json({ key });
});