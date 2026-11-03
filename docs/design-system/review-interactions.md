# Revisão de interações do design system

Revisão em 03/11/2026. **13 grupos de verificações comportamentais aprovados**, sem erros JavaScript de página ou requisições externas. As interações usaram componentes React reais e os estilos do produto, compilados pelo harness isolado na porta 3102. Nenhuma fonte de aplicação foi alterada por esta revisão.

## Escopo verificado

| Superfície                         | Verificação                                                                                                                                                                                              | Resultado |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Recuperação e redefinição de senha | `forgot` e `reset` associados a `/recuperar-senha`; shell interno e `.ds-main` presentes.                                                                                                                | Aprovado  |
| ActionButton                       | Quatro variantes × dois tamanhos; rótulos preservados; clique na área do ícone alcança o handler; botão disabled não executa; Tab/Shift+Tab produz foco visível com outline sólido.                      | Aprovado  |
| Formulário e Modal reais           | Submit nativo por Enter; fechamento por Escape, X e backdrop; bloqueio e restauração do scroll de fundo.                                                                                                 | Aprovado  |
| ActionLink                         | Navegação à coleção preservada após o wrapper do DS.                                                                                                                                                     | Aprovado  |
| Coleção                            | Adicionar carta abre seletor; busca por Enter retorna resultados; selecionar e salvar quantidade 2 insere um registro somente na fixture; diálogo fecha.                                                 | Aprovado  |
| Decks                              | Criar por Enter e salvar rascunho usam botões nativos `type=submit` e mantêm os handlers.                                                                                                                | Aprovado  |
| Decks — falha e ocupado            | Falha simulada mantém diálogo aberto e mensagem visível; consulta pendente mantém submit desabilitado.                                                                                                   | Aprovado  |
| Configurações                      | Clique sobre o bloco do ícone de Salvar alterações dispara o submit e atualiza o perfil apenas em memória.                                                                                               | Aprovado  |
| Trocas                             | Envio vazio desabilitado; Enter envia mensagem; aceitar atualiza status; confirmação abre diálogo, aceita Escape e depois confirma; ação já confirmada fica desabilitada.                                | Aprovado  |
| Marketplace                        | Quantidade zero desabilita compra; quantidade 1 permite submit e atualiza somente o carrinho local da origem QA.                                                                                         | Aprovado  |
| Moderação                          | Aprovar fica desabilitado sem conferência; checklist com duas fotos locais permite submit de aprovação; Solicitar correção mantém `type=button` e envia a decisão de correção, sem aprovação incidental. | Aprovado  |
| Administração                      | Submit salva comissão; ação de papel mantém confirmação nativa e handler; todos os registros permanecem na fixture.                                                                                      | Aprovado  |
| Administração — falha              | Falha simulada mostra mensagem e libera novamente o botão para tentar outra vez.                                                                                                                         | Aprovado  |

Os submits da coleção, criação/salvamento de deck, configurações, chat, inclusão no carrinho, aprovação de anúncio e configurações administrativas foram inspecionados no DOM: continuaram sendo botões HTML de submit. A ação Solicitar correção permaneceu explicitamente `type=button`. Os wrappers de ícone não impediram eventos nem esconderam os nomes acessíveis dos controles testados.

## Prancha de componentes reais

A tela exclusiva de QA `?screen=components&role=user` usa os exports de `src/components/design-system.tsx` e `Modal` de `ui.tsx`. Inclui:

- `ActionButton`: primary, secondary, danger e quiet; regular/small; disabled e ocupado.
- `ActionLink`: os quatro tons com navegação real no ambiente isolado.
- `Panel`: default, soft e dark.
- `StatusBadge`: neutral, info, success, warning e danger.
- Campos com label, placeholder, descrição de erro associada, `aria-invalid`, disabled, select, textarea e checkbox.
- Diálogos padrão e amplo com ações locais.

Capturas completas em 1440 e 390 px foram inspecionadas. Nenhuma ultrapassagem horizontal ou controle fora da viewport foi encontrado nessas duas larguras. A prancha não cria rota ou bypass no app.

### Variante primária corrigida e revalidada

Na primeira captura, `variant="primary"` sem a classe legada `button-gold` perdia a faixa e a cor do texto por especificidade CSS. O implementador corrigiu os seletores da variante em `.ds-main` e `.modal`.

A correção foi revalidada em 1440 e 390 px: ActionButton regular/small e ActionLink primários usam `ribbon-primary.svg` e texto `rgb(33, 12, 46)`, igual ao token central `--ds-ink` (`#210c2e`). A faixa verde-lima aparece nas capturas finais; a variante secundária mantém `ribbon-secondary.svg` e texto creme. Dois cliques no botão primário atualizaram o contador local em cada largura. Nenhum overflow horizontal ou controle fora da viewport foi encontrado. Não há pendência deste achado.

## Evidência e reprodução

- Runner: `design/system-review/harness/interactions.cjs`.
- Resultados e capturas: `design/system-review/harness/.local/interactions/results.json` e PNGs adjacentes.
- Prancha: `design/system-review/harness/.local/components-1440.png`, `components-390.png` e `components-review.json`.
- Ordem CSS compilada: globals → multigame → navigation → pixel-explore → design-tokens → design-system → módulos marketplace/admin.

As capturas, bundle e bootstrap ficam apenas no diretório `.local/`, ignorado pelo Git. Os três ajustes do runner na preparação foram de método de teste: gerar modalidade de teclado antes de verificar `:focus-visible`, rolar o botão antes de clicar nas coordenadas do ícone e considerar a descrição de ajuda no nome acessível do campo de comissão. Não foram mudanças no comportamento do produto.

## Limites

Fixtures de usuário e administrador, consultas, RPCs e APIs são substituídas somente no bundle de QA. Escritas afetam apenas memória e o localStorage da origem 3102; recarregar restaura o dataset. O servidor recusa POSTs e não encaminha chamadas ao app, Supabase ou provedor de pagamentos. Esta revisão não valida RLS, permissões do backend, OAuth, e-mail ou pagamentos reais. Os guards da aplicação permanecem intactos.
