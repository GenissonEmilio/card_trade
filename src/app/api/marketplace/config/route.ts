import { createClient } from '@/lib/supabase/server';
import { paymentsReady, rpc } from '@/lib/payments/server';

export async function GET() {
  // Stock is released by its deadline even before this housekeeping pass.
  if (paymentsReady()) {
    try {
      await rpc('payment_expire_orders', {});
    } catch {
      /* configuration remains readable during provider maintenance */
    }
  }
  const client = await createClient();
  const result = client
    ? await client
        .from('marketplace_settings')
        .select('enabled,commission_bps,pickup_instructions,terms_version')
        .eq('id', true)
        .single()
    : null;
  if (!result || result.error || !result.data)
    return Response.json(
      { error: 'As configurações do marketplace estão temporariamente indisponíveis.' },
      { status: 503 },
    );
  return Response.json(
    { ...result.data, payments_ready: paymentsReady(), payment_methods: ['pix', 'credit_card'] },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
