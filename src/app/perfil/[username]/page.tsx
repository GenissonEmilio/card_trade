import { Profile } from '@/components/profile';
export const metadata = { title: 'Perfil do duelista' };
export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <Profile username={username} />;
}
