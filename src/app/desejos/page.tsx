import { Suspense } from 'react';
import { Library } from '@/components/library';
export const metadata = { title: 'Lista de desejos' };
export default function Page() {
  return (
    <Suspense>
      <Library wishlist />
    </Suspense>
  );
}
