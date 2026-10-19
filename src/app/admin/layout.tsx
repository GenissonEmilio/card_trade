import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const client = await createClient();
  const result = await client?.auth.getUser();
  if (!result?.data.user) redirect('/login?next=%2Fadmin');
  const role = await client?.rpc('get_my_role');
  if (role?.data !== 'admin')
    return (
      <div className="page-content">
        <div className="panel">
          <h1>Acesso restrito</h1>
          <p>Esta área está disponível somente para administradores.</p>
        </div>
      </div>
    );
  return children;
}
