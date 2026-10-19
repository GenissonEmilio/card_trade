import { TradeDetail } from '@/components/trades';
export const metadata = { title: 'Proposta de troca' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TradeDetail id={id} />;
}
