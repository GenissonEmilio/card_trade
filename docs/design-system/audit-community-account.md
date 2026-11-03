# Auditoria: conta, coleção e comunidade

Leitura do código em 03/11/2026, sem alterações na aplicação. Fontes: componentes React em `src/components/`, rotas em `src/app/`, `globals.css`, `multigame.css`, `navigation.css` e implementação aprovada do Explorar em `pixel-explore.css`. As regras locais de Next e a skill de revisão visual foram relidas.

## Rotas e contratos

| Rota                                                    | Componente                | Acesso e estados principais                                                                                                          |
| ------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/login`                                                | `AuthForm(mode="login")`  | Pública; email, senha, mostrar/ocultar, recuperação, erro, envio; `next` preservado por `safeNext`.                                  |
| `/cadastro`                                             | `AuthForm(mode="signup")` | Pública; nome, usuário, email, senha, consentimento; usuário duplicado, envio, confirmação por email ou sessão imediata.             |
| `/recuperar-senha`                                      | `AuthForm(mode="forgot")` | Pública; email, envio, sucesso, erro.                                                                                                |
| `/recuperar-senha?etapa=nova`                           | `AuthForm(mode="reset")`  | Pública visualmente; nova senha requer usuário vindo do link de recuperação. Sucesso oferece coleção.                                |
| `/login?erro=confirmacao`                               | `AuthForm`                | Link expirado/usado: alerta de confirmação antes do envio.                                                                           |
| `/colecao` e `?adicionar=1`                             | `Library`                 | `Protected`; coleção por jogo, total, busca, filtros todas/troca/pessoal, vazia/carregando/erro/conteúdo; query abre busca de carta. |
| `/desejos`                                              | `Library(wishlist)`       | `Protected`; desejos por jogo, nota de matches, total, busca, vazia/conteúdo.                                                        |
| `/decks`                                                | `Decks`                   | `Protected`; criar, lista, editar, validar, adicionar/remover, exportar, compartilhar, duplicar, excluir.                            |
| `/decks?ver=<id>`                                       | `DecksContent(viewId)`    | Pública; deck público somente leitura, indisponível/privado, loading/erro; usuário autenticado pode duplicar.                        |
| `/perfil/[username]`                                    | `Profile`                 | Pública; loading/erro/inexistente, avatar, bio, bairro, reputação, coleção por jogo, avaliações.                                     |
| `/configuracoes`                                        | `Settings`                | `Protected`; resumo do perfil, upload, formulário, salvar, erro/sucesso; email/cidade desabilitados e link de senha.                 |
| `/comunidade`                                           | `Community`               | Pública; loading/erro/vazia, busca por nome/usuário/bairro, lista de perfis.                                                         |
| `/matches`                                              | `Matches`                 | `Protected`; loading/erro/vazio, matches recíprocos por jogo, abrir perfil, propor troca.                                            |
| `/trocas`                                               | `Trades`                  | `Protected`; loading/erro/vazio, filtros todas/ativas/concluídas, lista com status.                                                  |
| `/trocas/[id]`                                          | `TradeDetail`             | `Protected`; não encontrada/sem acesso, loading; pending/accepted/completed/declined/cancelled, chat, confirmações e avaliações.     |
| `/como-funciona`, `/privacidade`, `/termos-marketplace` | páginas + `PageTitle`     | Públicas; etapas, blocos informativos e prose longa. São consumidores do mesmo shell e tipografia.                                   |

`/auth/callback` e `/auth/confirm` são handlers de autenticação, não telas a redesenhar. Não mudar seus redirects, cookies ou verificação de links. Não há rota `/reset` separada.

## Modais e superfícies secundárias

Todos usam `Modal` de `ui.tsx`: elemento nativo `<dialog class="modal [modal-wide]">`, `showModal`, fechamento por Escape e clique no backdrop, rolagem do corpo bloqueada durante abertura. Os seletores globais precisam atingir o conteúdo dentro desse dialog e manter o fundo/modal em contraste próprio.

| Superfície            | Conteúdo/ações a preservar                                                                                               | Consumidores                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `CardSearchModal`     | Jogo opcional/fixo; busca nome/código; loading/erro/vazio/resultados/mais; escolher carta.                               | Coleção, desejos, decks.                              |
| `CardDetail` (`wide`) | Arte, nome localizado/original, tipo/atributo/nível/ATK/DEF ou dados Pokémon, descrição longa, créditos e CTA opcional.  | Explorar, coleção, desejos, decks, perfil próprio.    |
| `AddCardModal`        | Quantidade, conservação, idioma, raridade/datalist, edição, notas, disponível para troca; adicionar/editar, erro e busy. | Coleção e Explorar.                                   |
| Remover carta         | Nome da carta, explicação, erro, voltar/remover.                                                                         | Coleção.                                              |
| Novo/excluir deck     | Nome, rascunho privado, erro/busy; confirmação de excluir preserva coleção.                                              | Decks.                                                |
| `ProposeModal`        | Carta solicitada; visitante: login; coleção sem cartas: CTA; usuário: carta oferecida, mensagem, informação, erro/envio. | Perfil de terceiro, matches e comunidade do Explorar. |
| Confirmar transição   | Recebeu carta/recusar/cancelar; explicação, voltar/confirmar, busy.                                                      | Detalhe da troca.                                     |
| Toast                 | Sucesso/erro, texto longo e fechar; some em 5 s.                                                                         | Providers, todas as telas.                            |

## Seletores que o sistema precisa abranger

### Fundações e UI compartilhada

`body`, fontes e tokens; `.page-content`, `.page-heading`, `.eyebrow`, `.section-heading`, `.muted`, `.gold-text`, `.panel`, `.button`, `.button-gold`, `.button-small`, `.icon-button`, `.text-link`, `.full-width`, `.tag`, `.status`, `.avatar`, `.micro-avatar`, `.field-hint`, `.info-note`, `.optional`, `.sr-only`, `.empty-state`, `.empty-icon`, `.empty-inline`, `.loading-state`, `.spin`, `.card-skeletons`, `.card-skeleton`, `.toast`, `.toast-error`.

Formulários: `.form`, `.form label`, `input/select/textarea`, `.form-row`, `.checkbox-label`, `.password-field`, disabled/focus/hover/invalid, `.auth-error`, `.auth-success`. Dialogs: `.modal`, `.modal-wide`, `.modal::backdrop`, `.modal-inner`, `.modal-heading`, `.trade-buttons`, `.selected-card`.

Não pintar todos os SVG com a mesma regra: ícones `stroke` da biblioteca e duotone têm semânticas diferentes; respeitar `currentColor` e estados. Ribbons devem manter texto horizontal e podem usar contorno/recorte decorativo sem recortar foco/conteúdo.

### Autenticação

`.auth-page`, `.auth-card`, `.auth-logo`, `.auth-card h1`, `.auth-card > p`, `.auth-card .form`, `.auth-forgot`, `.auth-switch`, `.auth-legal`, `.password-field > button`.

O asset atual é `/logo.svg`, um símbolo antigo de 50 px. A nova marca legível pede troca explícita do `src` e dimensões apropriadas; CSS sozinho não troca esse asset. Preservar todos os títulos/copy, padrões de usuário e atributos de autofill.

### Coleção e desejos

`.game-switch`, `.inventory-toolbar`, `.inventory-total`, `.inventory-card`, `.inventory-actions`, `.inventory-badge`, `.inventory-badge.private`, `.filter-tabs`, `.filter-tabs .active`, `.wishlist-note`, `.cards-grid`, `.card-tile` e todos seus descendentes.

`CardTile` fora do catálogo recebe **“Na sua lista de desejos”**, **“Na sua coleção”** ou nomes de donos. Essas strings não cabem na mesma largura que “No catálogo” em 2 colunas mobile. `.catalog-label` / `.card-owner` devem poder quebrar ou limitar linhas sem invadir o botão de 44 px. Não usar `white-space:nowrap` global no rodapé. A linha de editar/remover é externa ao `CardTile`; a moldura pixelada não pode cobrir `.inventory-actions`.

### Decks

`.decks-workspace`, `.shared-deck`, `.deck-list`, `.deck-list button.selected`, `.deck-editor`, `.deck-settings`, `.deck-visibility`, `.deck-read-heading`, `.deck-toolbar`, `.deck-validation`, `.deck-validation.valid`, `.deck-section`, `.deck-lines`, `.deck-line`, `.deck-card-info`, `.deck-owned`, `.deck-line-controls`, `.danger`.

O editor é mutável apenas quando `selected.user_id === user.id`. Não revelar controles de edição no deck público pelo redesign. `visibility=public` é necessário antes de copiar link. `.deck-validation` distingue rascunho com erros e estrutura completa; preservar a lista e a nota. O seletor de seção existe só para Yu-Gi-Oh!, mantendo main/extra/side. Os textos de coleção/faltam aparecem só para usuário autenticado.

### Perfil e configurações

`.profile-hero`, `.profile-hero .avatar`, `.profile-bio`, `.profile-card-grid`, `.reviews`, `.review-card`, `.review-stars`, `.settings-layout`, `.profile-summary`, `.avatar-upload`, `.avatar-upload label`, `.avatar-upload small`.

Nomes podem ter até 60 caracteres, usuário até 24, bairro até 80, bio até 500. Adotar `min-width:0`, `overflow-wrap:anywhere` nos dados livres e grids `minmax(0,1fr)`. Não truncar a bio completa sem alternativa. Upload aceita JPG/PNG/WebP até 2 MB; não mudar input, validação ou ações para conseguir uma prévia visual.

### Comunidade e matches

`.community-grid`, `.duelist-card`, `.duelist-card .avatar`, `.duelist-card .text-link`, `.match-grid`, `.match-card`, `.match-top`, `.match-top .tag`, `.match-cards`, `.match-cards > svg`, `.match-cards img`, `.match-cards strong`.

O cartão de comunidade inteiro é link; evitar inserir botões aninhados. Match tem dois cards+seta e badge “MATCH RECÍPROCO”, além de nome/avatar; o badge precisa quebrar de linha em 360 px. Os dois nomes de cartas podem ser longos. Manter semântica distinta de “match” decorativo do hero.

### Trocas, chat e avaliações

`.trade-list`, `.trade-row`, `.trade-thumbs`, `.trade-row-copy`, `.status-pending`, `.status-accepted`, `.status-completed`, `.status-declined`, `.status-cancelled`, `.trade-detail-layout`, `.trade-details`, `.trade-party`, `.trade-buttons`, `.chat-panel`, `.chat-header`, `.messages`, `.message`, `.message.mine`, `.message p`, `.message time`, `.chat-input`, `.chat-empty`, `.review-form`.

Todos os status precisam de texto legível, não só cor. `pending`: recipiente aceita/recusa; proponente cancela. `accepted`: reserva, confirmação individual e cancelar. `completed`: aviso de coleção atualizada + avaliação caso ainda não feita. Chat só permite envio em pending/accepted; outros estados exibem aviso de conversa encerrada. Preservar realtime, ordenação/deduplicação das mensagens, `aria-live`, confirmação de recebimento por ambos e timezone de Fortaleza.

## Riscos responsivos prioritários

1. **360 px com modal:** dialog `width:calc(100% - 32px)` mais padding interno de 20 px deixa cerca de 288 px úteis; CTA longos, selects e `.form-row` devem caber ou empilhar. Evitar margens fixas/pixels excedendo molduras. O botão de fechar precisa continuar acessível após rolar.
2. **Coleção/desejos:** duas colunas + label longo + ação 44 px; medir largura real e nomes/owner. Evitar que CSS de catálogo de 170 px seja aplicado cegamente a todo card com metadados diferentes.
3. **Deck:** sidebar horizontal <=1000 px, editor em 1 coluna; toolbar precisa wrap; `.deck-line` e controles quebram <=560 px. Ribbons maiores não podem impedir edição de quantidade/seção. `.deck-visibility` deve empilhar. Nomes/erros longos podem expandir grid.
4. **Trocas:** `.trade-row .status` tem margem esquerda fixa de 90 px na versão antiga; remover/adaptar para não gastar espaço em 360. Chat precisa input `min-width:0`, botão de envio fixo e quebra de URLs/texto longo. A altura de `.messages` e a rolagem precisam continuar úteis com teclado móvel.
5. **Auth:** formulário de cadastro já é alto; evitar centro vertical com altura fixa que corte início/fim. CTA de recuperação é longo. Links de legal e checkbox devem quebrar naturalmente. Inputs com 16 px no mobile evitam zoom automático de iOS.
6. **Perfil/match:** avatar + nome comprido + badge exige wrap ou coluna. Fotos e cartas devem preservar proporção. `.review-card` pode conter comentários/nomes longos.
7. **CSS herdado:** `globals.css` tem colores fixas e estilos `!important` (por exemplo `.field-hint`); `multigame.css` redefine game-switch/decks; `pixel-explore.css` está escopado `.pixel-app` e só a home usa esse shell atualmente. A ordem de importação deve ser deliberada. Não reaplicar regras de `.pixel-app` que pressupõem catálogo creme em um panel roxo sem variante.
8. **Estado de sessão:** deslogado mostra `Protected`/Empty, não o formulário privado. Aprovar somente esse gate não valida a coleção/deck/chat reais; uma rodada autenticada ou fixture de rede precisa cobrir essas telas antes de afirmar revisão completa.

## Plano de QA sem alterar app

Automação em `design/system-review/account-public-review.cjs`: capturas reais 390/360 das rotas públicas, modos de auth e estados de proteção; mede overflow, elementos de texto fora do viewport, imagens, headings e erros JS. Pode também capturar desktop para comparação do shell. Não gera HTML de prévia nem envia formulários externos. Interações locais possíveis: visibilidade da senha, filtros de busca da comunidade vazia e menu. Estados autenticados/modais dependentes de dados ficam registrados como pendentes até haver fixture/test account autorizada, sem criar contas ou transações reais.
