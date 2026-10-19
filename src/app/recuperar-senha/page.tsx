import { AuthForm } from '@/components/auth-form';
export const metadata = { title: 'Recuperar senha' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string }>;
}) {
  const p = await searchParams;
  return <AuthForm mode={p.etapa === 'nova' ? 'reset' : 'forgot'} />;
}
