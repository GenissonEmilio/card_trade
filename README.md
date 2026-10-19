# Duelink

Plataforma de troca presencial de cartas de Yu-Gi-Oh! para Lagarto, Sergipe.

**Site:** https://duelink-card-trade.vercel.app

## Funcionalidades

- Cadastro por e-mail, confirmação, login, logout e recuperação de senha.
- Perfil público, avatar, apresentação e bairro; edição da própria conta.
- Catálogo YGOPRODeck completo, busca, filtros de tipo/atributo e detalhes das cartas.
- Coleção com quantidade, conservação, idioma, raridade, edição e observações.
- Coleção pessoal privada ou cartas disponíveis publicamente para troca.
- Lista de desejos privada e correspondências recíprocas entre colecionadores.
- Propostas de uma carta por outra, aceite, recusa, cancelamento e reserva de itens.
- Chat privado em tempo real por negociação.
- Confirmação bilateral: só depois das duas confirmações as quantidades são atualizadas e as cartas recebidas entram na coleção pessoal.
- Avaliação única por participante após conclusão, exibida no perfil público.
- Interface responsiva, navegação por teclado e respeito a movimento reduzido.

A plataforma não processa pagamentos, custódia, envio ou autenticação física de cartas. Scanner OCR, preços em reais e serviços financeiros não fazem parte desta versão.

## Stack

Next.js 16 App Router, React 19, TypeScript, CSS, Lucide, Supabase Auth/PostgreSQL/Storage/Realtime e Vercel. Versões fixadas no `package.json` e no lockfile.

## Desenvolvimento

Requer Node.js 22 e npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Preencha `.env.local`:

| Variável                               | Uso                                                                   |
| -------------------------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL do projeto Supabase                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública moderna, `sb_publishable_...`                           |
| `SUPABASE_EDGE_ANON_KEY`               | Chave anon JWT para autenticar no gateway da Edge Function de imagens |
| `NEXT_PUBLIC_SITE_URL`                 | Origem do site; `http://localhost:3000` em desenvolvimento            |

Sem configuração do Supabase, o catálogo de destaque continua disponível; ações autenticadas informam que a conexão precisa ser configurada. Nunca use `service_role` em uma variável `NEXT_PUBLIC_`.

## Supabase

O projeto de produção `duelink` está na organização GenissonEmilio's Org, em São Paulo (`sa-east-1`). Referência: `kmhbnipjrhswmfuqguvu`.

As migrações em `supabase/migrations` criam perfis, coleção, desejos, propostas, mensagens, avaliações, políticas RLS e buckets. Há índices para correspondências e consultas por participante. As operações de troca usam funções transacionais que validam identidade, disponibilidade e transições, com bloqueios de linha para impedir reservas concorrentes. A API não permite atualizar propostas diretamente.

Para uma nova instalação, com a CLI autenticada:

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
npx supabase functions deploy card-image
```

A função `card-image` mantém `verify_jwt` habilitado. Usa as credenciais internas do próprio ambiente Supabase para salvar imagens no bucket `card-images`; a chave privilegiada não vai para o navegador ou para a Vercel.

Em Authentication → URL Configuration, configure Site URL para a origem pública e permita `https://SEU_DOMINIO/**`. Para desenvolvimento com e-mails locais, adicione também `http://localhost:3000/**`.

### E-mails

Configure SMTP próprio em Authentication → Emails → SMTP Settings. O SMTP padrão do Supabase só atende e-mails de membros da organização e não libera cadastro público.

Para o Gmail escolhido pelo mantenedor: `smtp.gmail.com`, porta `465`, usuário e remetente `officegenisson@gmail.com`, nome `Duelink` e uma senha de aplicativo gerada na Conta Google com verificação em duas etapas. Preencha a senha diretamente no painel; não a salve no repositório. Os limites e a capacidade de entrega do Gmail continuam aplicáveis.

Os modelos em `supabase/templates` usam links com `token_hash` para confirmação e recuperação, inclusive quando o e-mail é aberto em outro navegador. Publique-os nos respectivos templates do painel. Somente a confirmação do recebimento físico da troca, feita por ambos os participantes, altera as coleções.

## Catálogo e imagens

Metadados passam por `/api/cards`, com cache de 24 horas. Em indisponibilidade, há fallback explícito para as cartas iniciais. O catálogo original está em inglês; alguns nomes conhecidos também aceitam pesquisa em português.

As imagens de destaque são servidas localmente. As demais passam por `/api/card-image/:id` e pela Edge Function, que baixa e armazena a imagem no Supabase Storage. Não há hotlink contínuo para o provedor. A documentação do catálogo está em https://portal.ygoprodeck.com/api-guide/.

## Validação

```bash
npm run typecheck
npm test
npm run build
npm run format:check
```

Os testes usam PostgreSQL real em WASM (PGlite), com os mesmos SQLs de produção, papéis e políticas RLS. Cobrem propriedade de dados, privacidade, funções anônimas, matches, transições, reservas, confirmação bilateral e avaliações. A CI do GitHub executa tipos, testes e build.

O script opcional `scripts/smoke-cloud.mjs` valida a integração com um Supabase de testes usando três contas descartáveis previamente criadas. Ele lê `.env.test.local`, cria dados e exige limpeza administrativa após a execução. Não o execute sobre contas reais ou dados de usuários. Nenhuma conta de demonstração é criada automaticamente para visitantes.

## Vercel

Importe `GenissonEmilio/card_trade` como projeto Next.js, configure as quatro variáveis acima para produção e faça o deploy. Ou, com a CLI autenticada no projeto correto:

```bash
npx vercel link
npx vercel --prod
```

URLs de preview não são adicionadas automaticamente à lista de redirecionamentos de autenticação. Cada ambiente deve usar seu próprio banco ou configuração adequada. Segredos, sessões de testes e estado local da Vercel são ignorados pelo Git.

## Créditos

Catálogo: YGOPRODeck. Yu-Gi-Oh! e suas imagens pertencem aos respectivos titulares. Projeto independente de fãs, sem afiliação com a Konami. Tipografia DM Sans e Barlow Condensed sob SIL Open Font License; licenças incluídas em `public/fonts`.
