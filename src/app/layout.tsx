import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { Shell } from '@/components/shell';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Duelink — Sua próxima troca está por perto', template: '%s · Duelink' },
  description:
    'Encontre cartas de Yu-Gi-Oh!, organize sua coleção e conecte-se com duelistas para trocar cartas em Lagarto, Sergipe.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  icons: { icon: '/logo.svg' },
  openGraph: {
    title: 'Duelink · Conecte sua coleção',
    description: 'Cartas que você tem. Cartas que você quer. Duelistas de Lagarto conectados.',
    locale: 'pt_BR',
    type: 'website',
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
