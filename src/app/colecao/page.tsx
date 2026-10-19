import { Suspense } from 'react';
import { Library } from '@/components/library';
export const metadata = { title: 'Minha coleção' };
export default function Page() {
  return (
    <Suspense>
      <Library />
    </Suspense>
  );
}
