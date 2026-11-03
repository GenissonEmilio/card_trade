# Revisão visual do design system — comércio e administração

Revisão realizada em03/11/2026 no harness isolado `http://127.0.0.1:3102`, usando os componentes React e CSS reais da aplicação. Não foram usadas as antigas prévias HTML. Nenhum arquivo da aplicação ou do Figma foi alterado por este auditor.

**Situação inicial após a rodada de revisão:** as seis telas padrão, estados de feedback e modais estão visualmente consistentes com o DS; um caso extremo em detalhe de pedido ainda requer correção antes da aprovação final. O agente principal está aplicando os ajustes relatados abaixo.

## Cobertura e evidências

Capturas/JSON/scripts: `design/system-review/.local/commerce/` (artefatos locais ignorados pelo Git).

| Grupo                   | Casos | O que foi conferido                                                                                                                                                                                           |
| ----------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Telas preenchidas       | 12    | Marketplace, vendedor, pedidos, detalhe de pedido, administração e moderação, em1440 e390 px. Inspeção de capturas reais, hierarquia, cards, filtros, campos, valores, imagens e ações.                       |
| Estados                 | 30    | Vazio, erro e operação fechada nas telas pertinentes; moderação recusada para usuário sem papeladmin;1440 e390 px.                                                                                            |
| Modais                  | 18    | Detalhe de anúncio, carrinho, editor, moderação, ação do pedido e reembolso, em1440/390/360 px. Capturas superiores e inferiores para conteúdo rolável.                                                       |
| Dados extensos          | 12    | As seis telas em1440 e360 px, com nomes/identificadores sem espaços de aproximadamente90 caracteres, mensagens longas e valores deR$100.000,00. Dados alterados apenas por `addInitScript` dentro do harness. |
| Feedback após interação | 4     | Mensagem enviada, erro ao enviar mensagem, checkout externo bloqueado pelo harness e checkout de testeadmin bloqueado;390 px.                                                                                 |

Relatórios de suporte: `review-marketplace-seller-orders-order-detail-admin-moderation.json`, `states.json`, `modals.json`, `stress.json`, `interactions.json`. As capturas padrão são `<screen>-1440.png` e `<screen>-390.png`; extremos são `stress-<screen>-<width>.png`.

Nas telas padrão e nos30 estados, não foram encontrados erros de renderização, overflow horizontal, imagens locais ausentes ou controles fora da viewport. Nos18 modais, a largura do diálogo permaneceu contida, sem overflow interno horizontal e sem botões com texto cortado. A rolagem vertical permite alcançar o conteúdo inferior do editor, detalhe, moderação e reembolso.

## Análise por implementação

| Implementação     | Resultado visual                                                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Marketplace       | Hero escuro e cards em creme, arte proporcional, filtros em fluxo e CTAs em faixa. Grade de duas colunas permanece utilizável em390/360 px. Valores e títulos extensos não estouram a página, mas o nome do vendedor longo fica cortado no card sem indicação adequada.                                |
| Vendedor          | Título, conexão, avisos, seleção de situação, linhas e ações consistentes emdesktop/mobile. Estados de revisão necessária/rascunho/esgotado/publicado/em análise distinguíveis por texto. Editor responsivo e rolável; o último valor do resumo apresenta uma quebra indevida no caso descrito abaixo. |
| Pedidos           | Linhas, fotos, preço, situação e destino legíveis; estados vazios e de erro preservam a composição. Ícones das abas e da indicação “Ver pedido” estavam em linha separada por CSS global; foi solicitado alinhamento horizontal consistente.                                                           |
| Detalhe de pedido | Padrão1440/390 legível, com mensagens, resumo, cobranças, histórico e ajuda. Mensagens de sucesso/erro aparecem corretamente no contexto. Caso extremo com identificador/nome sem espaços em360 px expande a grade e corta grande parte do conteúdo; é o bloqueioP1.                                   |
| Administração     | Seções, formulário, checks, homologação, membros e histórico respeitam a paleta e tipografia. Nomes extensos nos membros quebram em várias linhas sem cobrir ações. Autor extenso no histórico não quebra e fica cortado.                                                                              |
| Moderação         | Métricas, abas, filtros, lista de revisão e modal legíveis. O aviso de operação fechada cabe em390 px. Estados negado/vazio/erro funcionam visualmente. Modais de revisão/reembolso ficam contidos em360 px; confirmação e campos permanecem alcançáveis por rolagem.                                  |

## Defeitos encontrados e encaminhados

### P1 — detalhe do pedido com dados extensos expande a grade no mobile

Evidência: `stress-order-detail-360.png` e `stress.json`.

Com nomes e payment_id de aproximadamente90 caracteres sem espaços, os painéis internos atingiram mais de600 px em uma viewport de360 px. Textos, valores e botões ficam cortados à direita. O wrapper com overflowclip impede que `document.scrollWidth` denuncie o problema; a medição de27 descendentes fora da viewport e a captura mostram o defeito.

Hipótese de implementação comunicada: `grid-template-columns:1fr` mantém mínimo intrínseco; usar trilha `minmax(0,1fr)`, `min-width:0` nos filhos principais/aside e quebra dos identificadores. Preservar valores monetários como unidades legíveis.

### P2 — valores monetários quebram dentro do resumo do editor

Evidência: `listing-editor-390-bottom.png`.

Na última linha “Estimativa antes das taxas do Mercado Pago”, `R$0,00` se dividiu em `R$0,` e `00`. O texto da label ocupa o espaço disponível e ostrong encolhe. Reservar a largura do valor monetário (`flex-shrink:0` ou arranjo equivalente) e permitir a label quebrar com `min-width:0`.

### P2 — nomes extensos cortados em vendedor, histórico e rodapé

Evidências: `stress-marketplace-360.png` e `stress-admin-360.png`.

- Nome do vendedor no card comercial ultrapassa o espaço e é cortado pelo `overflow:hidden` da listagem, sem ellipsis ou quebra.
- Nome do autor no histórico administrativo permanece sem quebra e é cortado.
- Nome de usuário no `.pixel-legal` do rodapé atravessa a viewport e termina cortado pelo wrapper global.

Foi solicitado wrap apropriado ou truncamento explícito com acesso ao nome completo, mantendo o ícone e as ações estáveis.

### P2 — alinhamento de ícones em abas e títulos

Evidências: `orders-390.png`, `orders-1440.png`, `order-detail-390.png`.

Em `.filter-tabs button` de pedidos, o ícone aparece em linha separada acima do rótulo. Em painéis do detalhe de pedido, os ícones de “Retirada”/“Atendimento” aparecem acima do título, enquanto as seções administrativas usam alinhamento horizontal. Solicitado alinhamento comflex/gap consistente. A indicação “Ver pedido” também deve manter seta e texto associados visualmente.

## Ajustes já confirmados durante a rodada

- Eyebrow do hero comercial tinha roxo sobre roxo, com baixo contraste. O agente principal marcou a superfície escura e aplicou lima; a captura posterior `stress-marketplace-360.png` confirma a correção.
- Botões somente de ícone, como fechar e remover do carrinho, haviam recebido a faixa completa com80 px de largura. O agente principal devolveu esses controles à versão compacta; as capturas posteriores dos modais mostram o botão de fechar quadrado e legível.
- O agente principal adicionou fallback de imagem à listagem/galeria/thumbs. As imagens locais do harness carregaram sem falhas nas capturas.
- Badges e métricas receberam limites/quebra para textos extensos; não produziram colisões nas telas padrão e nos cenários de moderação testados.

## Interações e limites da verificação

Envio de mensagem no harness adicionou um segundo item ao log e limpou o campo; erro simulado mostrou alerta sem desmontar a tela. A tentativa de checkout mostrou uma reserva local e o aviso explícito de que pagamentos externos estão desativados, com acesso legível a “Ver pedido”. O teste de checkoutadmin também mostrou erro controlado.

Essas operações ocorreram apenas em memória no harness isolado. Não validam autorização do servidor, RLS, SQL, OAuth, pagamentos, entrega, reembolso ou integração de produção. Nenhuma solicitação externa de pagamento ou mudança real de papel foi executada.

Estado inicial desta revisão: pendências identificadas para correção; resultados finais no complemento abaixo. As capturas existentes incluem o estado anterior dos defeitos para comparação.

## Reteste final pelo agente principal

As correções foram revalidadas após a revisão inicial. `design/system-review/.local/commerce/stress.json` registra seis casos em 1440/360 sem overflow, descendentes fora da viewport ou erro JavaScript. `verify-fixes.json` confirma abas alinhadas, fechamento de 44 px e valores monetários em uma linha em 390/360. IDs de cobrança e seus rótulos agora dividem a largura sem comprimir a label em uma coluna de letras.

O reteste de nove telas de conta em 360 confirma a correção de perfil, comunidade, trocas e detalhe da troca. Foram distinguidos o scroll interno normal de campos com valores extensos e o ellipsis deliberado do proprietário da carta; nenhum deles expande a página. O input `sr-only` recebeu dimensões mínimas explícitas, e as ações do inventário foram organizadas em grade.

A inspeção das capturas finais e o scan de 15 telas de conteúdo em desktop não identificaram bloqueios restantes. A aplicação compilada foi conferida em 52 casos, sem overflow ou erros JavaScript. O relatório anterior de pendências acima fica como histórico dos defeitos encontrados, resolvidos neste reteste.
