import { cookies } from 'next/headers';
import { pkce, seal } from '@/lib/payments/core';
import { currentUser, failure, paymentConfig } from '@/lib/payments/server';

export async function GET() {
  try {
    const { user } = await currentUser();
    const config = paymentConfig();
    const codes = pkce();
    (await cookies()).set(
      'duelink_mp_oauth',
      seal({ ...codes, userId: user.id, expiresAt: Date.now() + 600000 }, config.key),
      {
        httpOnly: true,
        secure: config.origin.startsWith('https:'),
        sameSite: 'lax',
        path: '/api/marketplace/callback',
        maxAge: 600,
      },
    );
    const url = new URL('https://auth.mercadopago.com.br/authorization');
    url.search = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      platform_id: 'mp',
      redirect_uri: config.redirectUri,
      state: codes.state,
      code_challenge: codes.challenge,
      code_challenge_method: 'S256',
    }).toString();
    return Response.redirect(url, 303);
  } catch (error) {
    return failure(error);
  }
}
