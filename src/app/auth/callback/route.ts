import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/utils';
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get('code'),
    next = safeNext(url.searchParams.get('next'));
  if (code) {
    const client = await createClient();
    const result = await client?.auth.exchangeCodeForSession(code);
    if (result && !result.error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL('/login?erro=confirmacao', url.origin));
}
