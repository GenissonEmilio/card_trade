import { cookies } from 'next/headers';
import { PaymentError, unseal } from '@/lib/payments/core';
import { currentUser, exchangeCode, paymentConfig, storeTokens } from '@/lib/payments/server';

export async function GET(request: Request) {
  try {
    const { user } = await currentUser();
    const config = paymentConfig();
    const url = new URL(request.url);
    const store = await cookies();
    const saved = store.get('duelink_mp_oauth')?.value;
    store.delete({ name: 'duelink_mp_oauth', path: '/api/marketplace/callback' });
    if (!saved)
      throw new PaymentError('A conexão expirou. Inicie novamente pelo painel de vendas.', 400);
    const state = unseal<{ userId: string; state: string; verifier: string; expiresAt: number }>(
      saved,
      config.key,
    );
    if (
      state.userId !== user.id ||
      state.state !== url.searchParams.get('state') ||
      state.expiresAt < Date.now() ||
      !url.searchParams.get('code')
    )
      throw new PaymentError('A autorização não foi concluída ou expirou. Tente novamente.', 400);
    await storeTokens(user.id, await exchangeCode(url.searchParams.get('code')!, state.verifier));
    return Response.redirect(`${config.origin}/vender?conexao=sucesso`, 303);
  } catch (error) {
    const reason =
      error instanceof PaymentError
        ? error.status === 503
          ? 'configuracao'
          : error.status === 401
            ? 'login'
            : 'autorizacao'
        : 'indisponivel';
    const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://duelink.mage.dev.br').origin;
    return Response.redirect(`${origin}/vender?conexao=erro&motivo=${reason}`, 303);
  }
}
