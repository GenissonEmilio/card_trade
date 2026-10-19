import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
async function authorize() {
  const client = await createClient();
  if (!client) return { error: json({ error: 'Serviço de contas indisponível.' }, 503) };
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { error: json({ error: 'Entre na sua conta.' }, 401) };
  const role = await client.rpc('get_my_role');
  if (role.error || role.data !== 'admin')
    return { error: json({ error: 'Acesso restrito à administração.' }, 403) };
  return { client };
}
export async function GET() {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const client = auth.client!;
  const [settings, members, audit] = await Promise.all([
    client.from('marketplace_settings').select('*').eq('id', true).single(),
    client.rpc('admin_list_members'),
    client.rpc('admin_get_audit'),
  ]);
  if (settings.error || members.error || audit.error)
    return json({ error: 'Não foi possível carregar a administração.' }, 503);
  return json({
    settings: settings.data,
    members: members.data,
    audit: audit.data,
    payments: {
      provider: 'Mercado Pago',
      mode: process.env.MERCADOPAGO_MODE || 'not_configured',
      checks: [
        {
          label: 'Conexão segura com o banco',
          configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
        {
          label: 'Identificação do aplicativo Mercado Pago',
          configured: Boolean(process.env.MERCADOPAGO_CLIENT_ID),
        },
        {
          label: 'Credencial privada do aplicativo',
          configured: Boolean(process.env.MERCADOPAGO_CLIENT_SECRET),
        },
        {
          label: 'Verificação das notificações de pagamento',
          configured: Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET),
        },
        {
          label: 'Proteção das credenciais dos vendedores',
          configured: Boolean(process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY),
        },
      ],
    },
  });
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origem da solicitação inválida.' }, 403);
  const auth = await authorize();
  if (auth.error) return auth.error;
  if (Number(request.headers.get('content-length') || 0) > 16000)
    return json({ error: 'Solicitação muito grande.' }, 413);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Solicitação inválida.' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ error: 'Solicitação inválida.' }, 400);
  const client = auth.client!;
  if (body.action === 'settings') {
    const fee = body.commission_bps;
    if (
      (fee !== null && (!Number.isInteger(fee) || Number(fee) < 0 || Number(fee) > 10000)) ||
      typeof body.enabled !== 'boolean' ||
      typeof body.pickup_instructions !== 'string' ||
      typeof body.operator_name !== 'string' ||
      typeof body.operator_contact !== 'string'
    )
      return json({ error: 'Confira a taxa e os dados da operação.' }, 400);
    const result = await client.rpc('admin_update_settings', {
      p_commission_bps: fee,
      p_enabled: body.enabled,
      p_pickup_instructions: body.pickup_instructions,
      p_operator_name: body.operator_name,
      p_operator_contact: body.operator_contact,
    });
    if (result.error)
      return json(
        {
          error:
            result.error.code === '23514'
              ? 'Informe nome, contato, taxa e instruções de retirada válidos antes de abrir as vendas.'
              : 'Não foi possível salvar as configurações.',
        },
        400,
      );
    return json({ settings: result.data });
  }
  if (body.action === 'role') {
    if (
      typeof body.user_id !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(body.user_id) ||
      !['user', 'admin'].includes(String(body.role))
    )
      return json({ error: 'Usuário ou permissão inválidos.' }, 400);
    const result = await client.rpc('admin_set_user_role', {
      p_user: body.user_id,
      p_role: body.role,
    });
    if (result.error)
      return json(
        {
          error: /ao menos um administrador/.test(result.error.message)
            ? result.error.message
            : 'Não foi possível alterar a permissão.',
        },
        400,
      );
    return json({ ok: true });
  }
  return json({ error: 'Ação inválida.' }, 400);
}
