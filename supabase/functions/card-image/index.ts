import { createClient } from 'jsr:@supabase/supabase-js@2';

// Gateway JWT validation stays enabled. Only catalog images can be fetched.
Deno.serve(async (request: Request) => {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^\d{1,10}$/.test(id)) return new Response(null, { status: 400 });
  const storage = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  ).storage.from('card-images');
  const headers = {
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  };
  const { data: cached } = await storage.download(`${id}.jpg`);
  if (cached) return new Response(cached, { headers });
  try {
    const upstream = await fetch(`https://images.ygoprodeck.com/images/cards/${id}.jpg`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok || !upstream.headers.get('content-type')?.includes('image/'))
      return new Response(null, { status: 404 });
    if (Number(upstream.headers.get('content-length') || 0) > 3000000)
      return new Response(null, { status: 413 });
    const image = await upstream.arrayBuffer();
    if (image.byteLength > 3000000) return new Response(null, { status: 413 });
    const { error } = await storage.upload(`${id}.jpg`, image, {
      contentType: 'image/jpeg',
      upsert: false,
      cacheControl: '31536000',
    });
    if (error && !/already exists|Duplicate/i.test(error.message))
      return new Response(null, { status: 503 });
    return new Response(image, { headers });
  } catch {
    return new Response(null, { status: 502 });
  }
});
