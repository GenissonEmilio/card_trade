# Duelink

Comunidade de coleção, decks, trocas e marketplace de cartas físicas de Yu-Gi-Oh! e Pokémon para Lagarto, Sergipe.

**Site:** https://duelink.mage.dev.br

## Funcionalidades

- Cadastro por e-mail, confirmação, login, logout e recuperação de senha.
- Perfil público, avatar, apresentação e bairro; edição da própria conta.
- Catálogos YGOPRODeck e TCGdex sincronizados e versionados, busca por nomes PT/EN, acentos, edição e códigos, com filtros por jogo.
- Decks privados ou públicos, rascunhos, validação estrutural, duplicação, exportação e indicação de cartas possuídas/faltantes.
- Coleção com quantidade, conservação, idioma, raridade, edição e observações.
- Coleção pessoal privada ou cartas disponíveis publicamente para troca.
- Lista de desejos privada e correspondências recíprocas entre colecionadores.
- Propostas de uma carta por outra, aceite, recusa, cancelamento e reserva de itens.
- Chat privado em tempo real por negociação.
- Confirmação bilateral: só depois das duas confirmações as quantidades são atualizadas e as cartas recebidas entram na coleção pessoal.
- Avaliação única por participante após conclusão, exibida no perfil público.
- Interface responsiva, navegação por teclado e respeito a movimento reduzido.

- Marketplace com anúncios de exemplares da coleção, fotos reais, preços em centavos de BRL, moderação, carrinho com um vendedor, pedidos, mensagens e retirada local.
- Administração com taxas configuráveis, papéis protegidos no banco, gestão de contas, moderação, conciliação e histórico administrativo.
- Mercado Pago Checkout Pro com OAuth/PKCE por vendedor, Pix/cartão conforme habilitação, split vendedor/plataforma, notificações verificadas e reembolsos.

O lançamento comercial é de retirada local combinada em Lagarto. Não há envio contratado, autenticação profissional das cartas ou custódia financeira própria. Vendas ficam desabilitadas até a configuração comercial e financeira; credenciais ausentes retornam indisponibilidade, sem simular pagamentos aprovados.

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

Sem configuração do Supabase, o catálogo sincronizado continua disponível; ações autenticadas informam que a conexão precisa ser configurada. Nunca use `service_role` em uma variável `NEXT_PUBLIC_`.

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

Na produção, a origem é `https://duelink.mage.dev.br`, também permitida nos redirecionamentos. Os modelos de e-mail usam essa origem para confirmação e recuperação de senha.

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

O projeto `duelink-card-trade` pertence ao workspace `esgenisson-gmailcoms-projects` e está conectado ao repositório GitHub para deploys automáticos. O endereço público é `duelink.mage.dev.br`, com DNS gerenciado no Registro.br. Use `NEXT_PUBLIC_SITE_URL=https://duelink.mage.dev.br` em produção.

Importe `GenissonEmilio/card_trade` como projeto Next.js, configure as quatro variáveis acima para produção e faça o deploy. Ou, com a CLI autenticada no projeto correto:

```bash
npx vercel link
npx vercel --prod
```

URLs de preview não são adicionadas automaticamente à lista de redirecionamentos de autenticação. Cada ambiente deve usar seu próprio banco ou configuração adequada. Segredos, sessões de testes e estado local da Vercel são ignorados pelo Git.

## Créditos

Catálogo: YGOPRODeck. Yu-Gi-Oh! e suas imagens pertencem aos respectivos titulares. Projeto independente de fãs, sem afiliação com a Konami. Tipografia DM Sans e Barlow Condensed sob SIL Open Font License; licenças incluídas em `public/fonts`.

## Catálogos e decks

O snapshot `src/data/catalog.json.gz` é lido somente no servidor e inclui todo o conjunto físico recebido dos fornecedores. O relatório em `src/data/catalog-report.json` identifica cobertura por idioma e data. Tradução ausente é exibida como nome original. Pokémon TCG Pocket é excluído. Atualize com `node scripts/sync-catalog.mjs`, confira o relatório, rode os testes e publique o snapshot; uma sincronização incompleta não substitui o anterior. Créditos e licenças dos fornecedores estão em `src/data/README.md`.

Cartas usam a identidade `(game, card_id)`; IDs externos são strings, inclusive os IDs Pokémon com ponto. Decks não criam ou reservam estoque. A validação estrutural não certifica rotações, banlists ou todas as exceções competitivas.

## Administração

`/admin` exige sessão verificada e papel persistido em `private.user_roles`. A conta pública não pode editar esse papel; `user_metadata` não é usado para autorização. A primeira atribuição é uma operação de administração do banco, após identificar a conta solicitada pelo responsável. Não há promoção automática por e-mail. Depois, administradores podem atribuir ou remover acessos pelo painel; a última conta administrativa é protegida.

A comissão é armazenada em pontos-base (100 = 1%) e o pedido conserva sua própria regra. Mudança de taxa/termos pausa anúncios até novo aceite e moderação. Comissão da plataforma, tarifas do Mercado Pago e eventual participação entre desenvolvedor e loja são relações distintas; a participação negociada não é distribuída automaticamente pelo checkout.

Funções de negócio privilegiadas são deliberadamente restritas por `GRANT` e validam usuário, propriedade, papel e transição. As tabelas privadas usam RLS sem políticas de cliente, como bloqueio total; são acessadas apenas por funções autorizadas. A função pública de disponibilidade retorna somente quantidades de anúncios visíveis, sem dados dos pedidos. Não remova essas verificações para contornar avisos genéricos de `SECURITY DEFINER`.

## Configuração do Mercado Pago

1. Na conta da operadora, criar aplicação de pagamentos online com **Checkout Pro / Marketplace**. Habilitar PKCE e cadastrar o callback `https://duelink.mage.dev.br/api/marketplace/callback`.
2. Configurar Webhooks para eventos de **Pagamentos** em `https://duelink.mage.dev.br/api/marketplace/webhook`. Guardar a assinatura secreta somente no servidor.
3. Configurar na Vercel `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_TOKEN_ENCRYPTION_KEY` (32 bytes aleatórios em base64), `NEXT_PUBLIC_APP_URL=https://duelink.mage.dev.br` e o conjunto privado do modo selecionado. Com `MERCADOPAGO_MODE=sandbox`, são obrigatórios **`MERCADOPAGO_SANDBOX_CLIENT_ID`**, **`MERCADOPAGO_SANDBOX_CLIENT_SECRET`** e **`MERCADOPAGO_SANDBOX_WEBHOOK_SECRET`**, pertencentes à aplicação de homologação da conta fictícia de marketplace. Com `MERCADOPAGO_MODE=production`, são obrigatórios `MERCADOPAGO_CLIENT_ID`, `MERCADOPAGO_CLIENT_SECRET` e `MERCADOPAGO_WEBHOOK_SECRET` da operadora real. Um conjunto ausente ou parcial bloqueia pagamentos; **não existe fallback de sandbox para as credenciais de produção**. Configurar o mesmo callback, PKCE e webhook na aplicação correspondente a cada conjunto.
4. A chave de criptografia deve ser preservada com segurança: trocar sem migração impede ler tokens já armazenados. Tokens dos vendedores são cifrados com AES-256-GCM e só acessados pelo backend; nunca publique credenciais no Git.
5. Cada vendedor conecta sua própria conta em `/vender`. A aprovação cadastral, os métodos habilitados, a chave Pix e as tarifas dependem do Mercado Pago. O app não garante habilitação comercial.
6. Homologar com contas/credenciais de teste: compra aprovada/negada/expirada, Pix, retorno sem pagamento, notificação duplicada/fora de ordem, reconexão, cancelamento, reembolso total/parcial e divergências. Só mudar para `production` após revisão e autorização do responsável. Não use dinheiro real para testar sem autorização específica.
7. No `/admin`, definir operadora, contato, retirada e comissão, revisar as políticas e então abrir as vendas. O frontend também exige configuração financeira; a reserva/baixa e o pagamento são validados no servidor/banco.

### Homologação com usuários de teste

O modo `sandbox` é uma proteção da aplicação, não um host separado do Checkout Pro. Use contas Mercado Pago de **vendedor e comprador de teste**, distintas e do Brasil; o painel também oferece conta de integrador para cenários de marketplace. Autorize o OAuth como vendedor de teste e entre no checkout como comprador de teste, em sessão separada da conta real. Use cartão de teste ou saldo fictício; o Pix de teste pode permanecer pendente, conforme a [documentação de compras de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/test-purchases).

O JSON cifrado de cada vendedor registra também o `client_id` da aplicação que emitiu a conexão. Antes de consultar `/users/me`, reutilizar checkout ou tentar refresh, o backend exige igualdade com a aplicação configurada no modo atual. O mesmo vínculo é conferido novamente após adquirir o lease de refresh. Conexões antigas sem `client_id`, ou emitidas por outro aplicativo, retornam pedido de reconexão em `/vender`; não são migradas silenciosamente nem tentam usar o secret do outro modo. Depois de configurar a aplicação de homologação, refaça o OAuth do vendedor fictício antes de retomar os testes. Preserve a chave de criptografia e o serviço seguro do Supabase; essa mudança não exige SQL nem rotação dessas chaves.

O redirecionamento e o campo privado `marketplace_checkouts.checkout_url` usam sempre `init_point`, inclusive na homologação; `sandbox_init_point` não deve ser utilizado. O e-mail real da conta Duelink não é preenchido no checkout em `sandbox`. `auto_return` só é enviado para endereço público HTTPS.

A troca OAuth omite `test_token` para obter o contrato `APP_USR-` usado pelo Checkout Pro. O prefixo sozinho não identifica o ambiente: antes de persistir tokens e antes de criar ou reutilizar preferências, o backend consulta `/users/me` e confere identidade, país/site brasileiro e `tags`. Em `sandbox`, exige `test_user`; em `production`, rejeita essa marca. Tokens `TEST-`, respostas incompletas, falhas de consulta e divergências bloqueiam a operação. A marca é utilizada pelo [plugin oficial do Mercado Pago](https://github.com/mercadopago/cart-magento2/blob/main/src/MercadoPago/Core/Observer/ConfigObserver.php#L205); as [credenciais de teste do Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/configure-development-enviroment) usam `APP_USR-`.

Uma URL em cache não dispensa essas verificações: a preferência é consultada novamente e seu `collector_id` e sua `external_reference` devem corresponder ao vendedor validado e ao pedido. Esse controle também se aplica após mudança de modo ou reconexão de conta. A integração mantém a conferência de `live_mode` dos pagamentos recebidos. Antes de abrir as vendas, conclua OAuth e uma compra com usuários fictícios; não mude para `production` para contornar uma falha, não exponha tokens ao conferir metadados e não use dinheiro real na homologação.

### Diagnóstico do Checkout Pro com as vendas fechadas

O admin possui um diagnóstico em `/api/admin/marketplace-test`, disponível somente com sessão administrativa validada e `MERCADOPAGO_MODE=sandbox`. Ele cria ou recupera uma preferência de **R$ 10 fictícios**, com comissão calculada a partir da configuração atual (taxa válida menor que 100%). Usa a própria conta de vendedor de teste conectada pelo admin, sem criar anúncios, pedidos, compradores Duelink ou estoque. `marketplace_settings.enabled` pode permanecer `false`.

`GET` retorna as dez sessões mais recentes do próprio admin, o valor fixo e a taxa atual. `POST {"action":"create"}` devolve `{url,test}`; `POST {"action":"refresh","testId":"uuid"}` consulta o Mercado Pago e devolve `{test}`. POST exige mesma origem. Os retornos `/admin?homologacao=…&retorno=…` são apenas informativos e jamais confirmam pagamento. Tokens, dados de cartão e informações pessoais do pagador não integram a resposta nem o registro de diagnóstico.

A migração `marketplace_checkout_diagnostics` mantém somente a sessão privada e sua última observação confirmada no provedor. As RPCs têm execução exclusiva pelo backend `service_role`; nem usuários comuns nem administradores podem gravar observações diretamente pela API pública. Lease por sessão, referência `duelink-sandbox:<uuid>`, busca de recuperação e chave de idempotência evitam recriar preferências após interrupção. Preferências novas e recuperadas usam o mesmo builder e conferência de coletor, referência, BRL, soma dos itens e comissão do checkout comercial.

A migração `checkout_diagnostic_issuer_binding` vincula cada sessão ao `client_id` da aplicação OAuth e remove as assinaturas antigas das RPCs que não recebiam esse vínculo. Sessões anteriores sem aplicativo permanecem no histórico, sem preenchimento retroativo: não são reutilizadas, atualizadas nem processadas por webhook. Trocar de aplicativo gera outra sessão e referência, mesmo para o mesmo vendedor e dentro dos 30 minutos de validade. O `client_id` permanece privado. Tanto o checkout comercial quanto o diagnóstico também conferem obrigatoriamente o `client_id` retornado pelo Mercado Pago para preferências novas, em cache ou recuperadas. Esse campo é o Application ID das credenciais usadas para criar a preferência, conforme a [referência oficial](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/get-preference/get); ausência ou divergência bloqueia a abertura. O campo `marketplace` não é utilizado como substituto presumido dessa identidade.

Para homologar, abra o `init_point` com uma conta MP de **comprador fictício distinta do vendedor**, em sessão separada da conta real. O cartão de teste com cenário `APRO` permite verificar aprovação fictícia. No Pix, a geração das instruções e o estado **pendente** são o resultado esperado; não efetue uma transferência real. O webhook exige HMAC e consulta remota do pagamento, conferindo identidade do vendedor, referência, valor, moeda, data e `live_mode=false`. Essas referências são tratadas antes de pedidos comerciais e **nunca** chamam `payment_apply`, alteram pedidos ou entregam cartas. A consulta manual usa as mesmas verificações remotas.

Esse diagnóstico comprova a fronteira navegador → API → banco → Mercado Pago → notificação/consulta. Uma preferência aceita com `marketplace_fee` e um pagamento fictício confirmado não comprovam crédito efetivo da comissão no extrato da plataforma. Tampouco representam uma compra comercial completa: reserva, autorização de participantes e entrega/estoque possuem testes próprios de banco; a homologação comercial no navegador exige usuários e anúncios reais autorizados em uma etapa posterior. A documentação oferece também conta MP de integrador para cenários marketplace, mas o diagnóstico não altera o aplicativo OAuth nem pressupõe a liquidação do split em sandbox.

O pedido salva itens, fotos, valores, comissão e termos. Eventos financeiros são idempotentes e conferidos no provedor. Pagamento tardio ou adicional vai para análise; uma página de retorno nunca marca o pedido como pago. Fotografias referidas no histórico são protegidas contra apagamento. O atendimento prevê cancelamento, devolução, contestação, conciliação e auditoria; reembolso só termina após confirmação financeira.
