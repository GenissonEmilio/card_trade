import { NextResponse } from 'next/server';
export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'duelink',
    databaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  });
}
