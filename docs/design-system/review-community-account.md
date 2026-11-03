# Revisão visual — conta e comunidade

Revisão em 03/11/2026. Aplicação Next real em `http://localhost:3000`; estados autenticados e mutáveis em harness isolado `http://127.0.0.1:3102`, importando os componentes TSX e os CSS reais. Não houve edição de arquivos da aplicação por este revisor.

## Cobertura

| Conjunto                                        | Viewports             | Casos | Situação                                                                                                                                                                                                                              |
| ----------------------------------------------- | --------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rotas Next públicas e gates                     | 390 × 844 e 360 × 844 | 38    | Sem overflow, texto fora da viewport ou erro JS. Inclui login, cadastro, recuperação, nova senha, confirmação expirada, comunidade, perfil inexistente, deck público indisponível, 7 gates, como funciona, privacidade, regras e 404. |
| Conteúdo autenticado do harness                 | 390 × 844 e 360 × 844 | 18    | Aprovado após correções e reteste final.                                                                                                                                                                                              |
| Estados vazios, erro, loading e status de troca | 390 × 844             | 19    | Sem boundary, erro JS ou overflow. Loading é intencional nos casos marcados.                                                                                                                                                          |
| Modais                                          | 390 × 844 e 360 × 844 | 26    | Passou largura, Escape e foco após Tab; inspeção visual do topo e final quando rolável.                                                                                                                                               |
| Feedback após ação local                        | 390 × 844 e 360 × 844 | 16    | Sucesso/erro legíveis, sem overflow.                                                                                                                                                                                                  |
| Textos extensos                                 | 360 × 844             | 9     | Corrigidos e revalidados; rolagem de inputs e ellipsis intencional documentados.                                                                                                                                                      |

As imagens do conjunto autenticado são arquivos locais existentes do catálogo. Para capturas de página completa, o harness de teste força o carregamento de imagens lazy antes do print; isso altera apenas a captura, sem modificar o produto.

## Correções motivadas pela revisão

1. Botões de arte/favoritar das cartas foram migrados indevidamente para `ActionButton`, recebendo faixa inclinada e deformando arte e posicionamento. Voltaram a botões nativos específicos; o mesmo cuidado foi aplicado ao X de fechar e controles compactos dos decks.
2. Linhas do editor de deck comprimiam os nomes em colunas de poucas letras. No mobile, informação da carta e controles agora ocupam linhas separadas.
3. Linhas das trocas comprimiam o nome do parceiro quando havia badge de status. A composição foi alterada para thumbs + texto e badge na linha seguinte.
4. Resumo de carta na troca tinha fundo roxo e texto escuro. O contexto claro agora usa superfície clara, preservando o contexto escuro nos modais.
5. Timestamp de mensagem própria tinha contraste insuficiente sobre roxo. Foi aplicada cor clara explícita.
6. Crédito do catálogo no detalhe da carta ficava encostado na ação principal. As caixas não se sobrepunham nas medições, mas foi acrescentada margem para separar texto, foco e faixa.
7. Labels longos do rodapé (“Na sua lista de desejos”, dono da carta) quebram linha sem invadir a ação de 44 px.

## Modais e feedback conferidos

Modais de busca, adicionar, editar, remover e detalhes da carta; busca de desejo; criar/excluir deck e buscar cartas; propor troca; recusar, confirmar recebimento e cancelar troca. Foram verificados 13 cenários em cada uma das duas larguras.

Os dialogs permanecem roláveis, com foco nativo e fechamento por Escape. Após clicar em buscar, o botão fica temporariamente desabilitado e o foco pode sair dele; o próximo Tab continua dentro do dialog. Não foi detectada fuga de foco para a página externa ao modal.

No harness, foram enviados somente formulários simulados: sucesso de cadastro/recuperação/nova senha; erro de login; erro ao salvar perfil/deck/adicionar carta; proposta aberta por visitante. As mutações são registradas em memória e descartadas ao recarregar. Nenhum email, usuário, pagamento, pedido ou troca real foi criado.

O alerta de confirmação expirada da rota Next foi conferido depois da hidratação, em vez de aceitar uma captura inicial anterior ao `useEffect`.

## Stress de dados

Dados sintéticos introduzidos pelo Playwright antes da montagem dos componentes, sem editar fixtures: nome de 60 caracteres, bairro de 80 caracteres sem espaços, bio de 500 caracteres, nome de deck de 100 caracteres e mensagem longa sem espaços. O teste cobre os 9 componentes principais.

A primeira rodada revelou expansão horizontal de perfil/comunidade, texto de nomes de cartas nas linhas de troca e min-content do detalhe da troca. Campos de input com valores longos podem rolar internamente; essa rolagem não conta como overflow da página. O resultado final será registrado após rechecagem.

## Evidências e limites

Capturas e JSONs: `design/system-review/.local/account/` (ignorado pelo Git):

- `public/initial-scan-summary.json`, capturas das 38 rotas e rechecagem focada de confirmação expirada.
- `harness/report.json`, `harness/states-report.json` e suas capturas.
- `modals/report.json` e topo/final de cada dialog.
- `feedback/report.json`, com alertas e mutações locais.
- `stress/report.json`, com dimensões e seletores que excederam limites.

Isso valida renderização e estados de UI, sem validar RLS, OAuth, entregas de email, uploads reais, reservas SQL ou realtime real. Esses contratos não foram alterados para facilitar as capturas. Desktop e superfícies comerciais/administrativas são revisados por outros agentes em relatórios próprios.

## Reteste final pelo agente principal

As correções foram revalidadas após a revisão inicial. `design/system-review/.local/commerce/stress.json` registra seis casos em 1440/360 sem overflow, descendentes fora da viewport ou erro JavaScript. `verify-fixes.json` confirma abas alinhadas, fechamento de 44 px e valores monetários em uma linha em 390/360. IDs de cobrança e seus rótulos agora dividem a largura sem comprimir a label em uma coluna de letras.

O reteste de nove telas de conta em 360 confirma a correção de perfil, comunidade, trocas e detalhe da troca. Foram distinguidos o scroll interno normal de campos com valores extensos e o ellipsis deliberado do proprietário da carta; nenhum deles expande a página. O input `sr-only` recebeu dimensões mínimas explícitas, e as ações do inventário foram organizadas em grade.

A inspeção das capturas finais e o scan de 15 telas de conteúdo em desktop não identificaram bloqueios restantes. A aplicação compilada foi conferida em 52 casos, sem overflow ou erros JavaScript. O relatório anterior de pendências acima fica como histórico dos defeitos encontrados, resolvidos neste reteste.
