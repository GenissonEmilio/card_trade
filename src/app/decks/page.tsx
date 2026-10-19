import { Suspense } from 'react';
import { Decks } from '@/components/decks';
export const metadata = { title: 'Meus decks' };
export default function Page() {
  return (
    <Suspense>
      <Decks />
    </Suspense>
  );
}
