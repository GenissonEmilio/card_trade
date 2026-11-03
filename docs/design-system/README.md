# Design system Duelink

O sistema pixelado em roxo, creme e verde-lima está aplicado às 22 páginas do aplicativo, aos modos de recuperação de senha e deck compartilhado, aos estados de acesso, aos formulários e aos modais. A implementação usa os componentes React/TypeScript do produto.

## Estrutura compartilhada

| Fonte                                                       | Responsabilidade                                                                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/app/design-tokens.css`                                 | Cores semânticas, superfície clara/escura, tipografia, espaçamento, foco, estados e compatibilidade com variáveis existentes. |
| `src/app/design-system.css`                                 | Ações, campos, painéis, estados, dialogs e adaptações das famílias de telas.                                                  |
| `src/components/design-system.tsx`                          | `ActionButton`, `ActionLink`, `Panel` e `StatusBadge`.                                                                        |
| `src/components/explore-shell.tsx`                          | Cabeçalho e rodapé globais, navegação ativa por rota e menu responsivo.                                                       |
| `src/components/shell.tsx`                                  | Aplica o mesmo shell a todas as rotas.                                                                                        |
| `src/components/ui.tsx`                                     | Modal nativo, carregamento, estado vazio e título de página.                                                                  |
| `src/components/system-icons.tsx`                           | Nomes semânticos para 54 ícones da família Phosphor duotone.                                                                  |
| `src/components/design-icons.json`                          | 59 vetores locais; sem chamadas externas para renderizar ícones.                                                              |
| `src/components/marketplace.module.css`, `admin.module.css` | Composições específicas usando os tokens comuns.                                                                              |

O Explorar conserva sua composição aprovada. As páginas internas usam fundo creme, texto roxo escuro e painéis claros; dialogs usam superfície roxa e texto claro. As fontes Chakra Petch e DM Sans e os SVGs da marca são locais. A licença MIT dos ícones permanece em `public/brand/pixel/PHOSPHOR-LICENSE`.

A navegação indica a rota atual, conserva o contador de desejos por jogo e mantém acesso administrativo condicionado ao papel original. Os contextos escuros compartilham tokens de campos e foco; os controles compactos das cartas e dialogs continuam nativos.

As variáveis legadas `--gold`, `--panel`, `--muted` e `--text` continuam como aliases por contexto, para preservar componentes e estados durante a adoção. Componentes novos devem preferir os tokens `--ds-*`.

## Consumo

```tsx
import { ActionButton, ActionLink, Panel, StatusBadge } from '@/components/design-system';
import { Check } from '@/components/system-icons';

<Panel>
  <StatusBadge tone="success">Disponível</StatusBadge>
  <ActionButton type="submit" variant="primary" loading={saving}>
    <Check size={18} /> Salvar alterações
  </ActionButton>
  <ActionLink href="/colecao" variant="secondary">
    Minha coleção
  </ActionLink>
</Panel>;
```

- Ações: `primary`, `secondary`, `danger` e `quiet`; tamanhos `regular` e `small`; estados de foco, hover, pressed, disabled e busy. O elemento permanece um botão ou link nativo. Ações em formulários preservam `type`, submit, validação e handlers.
- Painéis: `default`, `soft` e `dark`. Status: `neutral`, `info`, `success`, `warning` e `danger`, sempre acompanhados de texto.
- Campos: labels nativos, borda, placeholder, foco, inválido, desabilitado, ajuda e alertas. Checkboxes e radios mantêm suas dimensões próprias. Inputs visualmente ocultos conservam a utilidade `sr-only`.
- Dialogs: `<dialog>`, rolagem interna, bloqueio/restauração do scroll externo, Escape, X, backdrop e foco nativo.
- Botões de arte, favorito, fechar e quantidade usam seus controles compactos específicos. Eles não recebem a faixa completa de uma ação textual.

## Análise por página

| Rota                  | Implementação e análise                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                   | Hero e cards aprovados preservados; navegação global, fontes, ícones e ações de catálogo.                                                                                 |
| `/mercado`            | Hero escuro, filtros, cards, vendedor, preço, galeria e carrinho; contraste da eyebrow corrigido e imagens com reserva local.                                             |
| `/vender`             | Conexão, métricas, anúncios e editor; fotos, consentimento, campos e estimativa monetária conferidos em dialogs estreitos.                                                |
| `/pedidos`            | Abas de compras/vendas com ícones alinhados, status legíveis e listagem responsiva.                                                                                       |
| `/pedidos/[id]`       | Exemplares, retirada, atendimento, cobrança, histórico, problema/reembolso; grid corrigida para IDs extensos e valores monetários sem divisão.                            |
| `/colecao`            | Filtros, pesquisa, cards, adicionar/editar/remover e acesso protegido; badge e ações organizadas em duas linhas no mobile.                                                |
| `/desejos`            | Nota de matches, pesquisa, cards e remoção; status longo quebra sem invadir a ação de 44 px.                                                                              |
| `/decks`              | Lista, editor, validação, quantidade, busca e confirmações; informação da carta e controles separados em telas estreitas. Deck compartilhado continua em modo de leitura. |
| `/matches`            | Parceiros, pares de cartas, reciprocidade e proposta; nomes extensos e estados vazios conferidos.                                                                         |
| `/trocas`             | Filtros e estados pending/accepted/completed/declined/cancelled; miniaturas e texto em grade, status em linha separada no mobile.                                         |
| `/trocas/[id]`        | Partes da troca, ações, confirmação, avaliação e chat; trilhas com mínimo zero, nomes com quebra e horário claro sobre mensagem roxa.                                     |
| `/comunidade`         | Busca, perfis, avatar e bairro; nomes e bairros extensos não expandem a página.                                                                                           |
| `/perfil/[username]`  | Bio, reputação, coleção e avaliações; cabeçalho responsivo e nomes de proprietários com ellipsis explícito e título completo.                                             |
| `/configuracoes`      | Foto, perfil, ajuda, cidade/email desabilitados e salvar; arquivo oculto preservado e feedback conferido em memória.                                                      |
| `/login`              | Marca atual, campos, mostrar senha, erro de confirmação, feedback e links de conta.                                                                                       |
| `/cadastro`           | Nome, usuário, email, senha, consentimento e confirmação; mesma hierarquia e controles.                                                                                   |
| `/recuperar-senha`    | Envio de recuperação e modo `?etapa=nova`; sucesso, erro e validação visual.                                                                                              |
| `/como-funciona`      | Etapas em painéis e tipografia longa; três colunas passam a uma no mobile.                                                                                                |
| `/privacidade`        | Prosa, títulos e links com largura de leitura controlada; copy original preservada.                                                                                       |
| `/termos-marketplace` | Mesma composição de prosa; dados e regras existentes da operação preservados.                                                                                             |
| `/admin`              | Métricas, configurações, pagamento de teste, papéis e auditoria; nomes extensos, consentimento e ações conferidos. Guard server original permanece.                       |
| `/admin/mercado`      | Métricas, filtros, filas, moderação, correção e dialogs de pedido; acesso protegido e decisões preservados.                                                               |

404, erro e carregamento consomem as mesmas superfícies, tipografia e ações. `/auth/callback`, `/auth/confirm` e `/api/*` são handlers, não páginas visuais; seus contratos de autenticação e negócio foram preservados.

## Verificação

- Build de produção e TypeScript aprovados.
- 180 testes em 12 arquivos aprovados com `npm test -- --testTimeout 120000 --maxWorkers 1`. O limite ampliado é necessário para o teste existente que ordena os catálogos completos; a configuração padrão e a lógica do catálogo não foram alteradas.
- 52 verificações na aplicação compilada: 26 URLs/modos × desktop 1440 e mobile 390; sem sidebar antiga, overflow, erro JavaScript ou boundary de erro.
- Conteúdo de 15 telas autenticadas/administrativas renderizado em desktop no harness; revisões de conta em 390/360 e comércio/admin em 1440/390/360.
- 13 grupos de interações, 26 casos de modais de conta e 16 casos de feedback, além das telas/estados comerciais documentados nos relatórios.
- Retestes específicos de nomes, bairros, mensagens e identificadores extensos. A rolagem interna de inputs e o ellipsis intencional do proprietário são comportamentos esperados, não expansão da página.

Relatórios: [conta e comunidade](review-community-account.md), [comércio e administração](review-commerce-admin.md), [interações](review-interactions.md). Evidências geradas ficam em `design/system-review/.local/` e `harness/.local/`, ignoradas pelo Git.

## Revisão reproduzível

Com Chrome instalado:

```sh
npm run review:system
```

Abrir `http://127.0.0.1:3102/?screen=components&role=user` para o catálogo de componentes. A documentação do harness descreve os cenários de cada tela: `design/system-review/harness/README.md`.

```sh
npm run review:system:scan
npm run review:system:verify
npm run review:system:interactions
node design/system-review/production-routes.cjs http://localhost:3001
```

Esbuild e Playwright são dependências de desenvolvimento com versões fixadas. Os scripts de revisão usam essas dependências do projeto; `DUELINK_REVIEW_BROWSER` permite escolher outro canal do Playwright. Os scripts `migrate-*`, `refine-*` e `tokenize-*` registram a migração e não são necessários para executar a aplicação.

## Limites

Telas que exigem conta foram revisadas com componentes reais e dados sintéticos em um bundle exclusivo de QA. Escritas ficam em memória, requests externos são bloqueados e reload restaura os dados. A aplicação de produção mantém os guards e permissões originais. Essa revisão valida a interface e seus handlers, sem afirmar validação de OAuth, email, upload, RLS, pagamentos ou reembolsos reais.
