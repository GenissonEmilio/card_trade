import { AuthForm } from '@/components/auth-form';
export const metadata = { title: 'Entrar' };
export default function Page() {
  return <AuthForm mode="login" />;
}
