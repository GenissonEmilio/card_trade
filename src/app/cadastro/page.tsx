import { AuthForm } from '@/components/auth-form';
export const metadata = { title: 'Criar conta' };
export default function Page() {
  return <AuthForm mode="signup" />;
}
