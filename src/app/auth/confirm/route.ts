import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/utils';
export async function GET(request: Request) {
  const url = new URL(request.url),
    token_hash = url.searchParams.get('token_hash'),
    type = url.searchParams.get('type');
  if (
    token_hash &&
    type &&
    ['signup', 'recovery', 'email', 'email_change', 'invite'].includes(type)
  ) {
    const client = await createClient();
    const result = await client?.auth.verifyOtp({ token_hash, type: type as EmailOtpType });
    if (result && !result.error)
      return NextResponse.redirect(new URL(safeNext(url.searchParams.get('next')), url.origin));
  }
  return NextResponse.redirect(new URL('/login?erro=confirmacao', url.origin));
}
