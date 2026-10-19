import { MarketplaceOrderDetail } from '@/components/marketplace-orders';
export const metadata = { title: 'Detalhes do pedido' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MarketplaceOrderDetail id={id} />;
}
