# Duelink — redesign no Figma

Direção escolhida pelo usuário: roxo, creme e verde-lima, títulos geométricos e composição pixelada. Pixels em módulos de 16–32 px formam faixas largas e fragmentadas, molduras escalonadas das cartas, contorno geométrico do hero e transição do catálogo para o rodapé. A página Explorar preserva os textos e os contratos funcionais do projeto. O estudo foi implementado na rota `/`; detalhes e revisão visual estão em `../implementation-review/README.md`.

Os botões foram posteriormente adaptados à referência de faixas inclinadas: corpo em paralelogramo, bloco destacado do ícone, textura pontilhada deslocada e rótulos horizontais. Aplicado às ações principais, jogos, categorias, filtros, ordenação, busca e ações das cartas. O estado selecionado usa verde-lima/roxo; os rótulos foram conferidos no desktop e no mobile.

O rodapé dos cards foi revisado: status alinhado à esquerda, ação à direita, botão de 44 × 44 px com um sinal de adição simples e margem acima dos recortes da moldura. O espaçamento usa duas colunas, sem distâncias fixas entre texto e botão. `card-footer-review.json` registra a conferência dos 16 cards em desktop e mobile; `card-footer-figma.json` registra a publicação dos dois catálogos.

- [Desktop, 1440 px](https://www.figma.com/design/5um6rt7EPycsek27y2AEEw/Sem-t%C3%ADtulo?node-id=3-2)
- [Mobile, 390 px](https://www.figma.com/design/5um6rt7EPycsek27y2AEEw/Sem-t%C3%ADtulo?node-id=4-252)
- [Controles, filtros e estados](https://www.figma.com/design/5um6rt7EPycsek27y2AEEw/Sem-t%C3%ADtulo?node-id=9-6347)
- [Logo pixelada e conferência de legibilidade](https://www.figma.com/design/5um6rt7EPycsek27y2AEEw/Sem-t%C3%ADtulo?node-id=20-4373)

## Entregáveis

`desktop.html`, `mobile.html` e `states.html` são as fontes das prévias. `pixel-theme.css` contém a direção cromática final. A marca utilizada é `../../public/brand/duelink-logo-pixel.svg`: vetores reais com transparência, sem PNG incorporado. O letreiro usa letras contínuas em creme, convertidas em curvas, com moldura e símbolo pixelados. Foi conferido a 176 px e 125 px e aplicado no cabeçalho e rodapé das duas telas. A versão anterior foi preservada em `duelink-logo-completa-vetor.svg`.

A prancha da logo está em `logo-figma-nodes.json`; suas aplicações nas telas foram preservadas na revisão dos botões, registrada em `native-ribbon-v5-nodes.json`.

Ícones Phosphor duotone selecionados pelo catálogo público do 21st.dev e obtidos no repositório oficial da família, com licença MIT preservada em `icons/LICENSE`. O símbolo circular do seletor Pokémon é uma composição SVG local. O conector MCP do 21st.dev não estava disponível nesta sessão; a consulta foi ao catálogo público. Fontes: Chakra Petch e DM Sans.

## Correção da importação

A primeira importação HTML teve sobreposições, conteúdo incompleto e fontes substituídas. As seções defeituosas foram substituídas por geometria medida no navegador e importada pela Claude Bridge como grupos, textos nativos, imagens e vetores editáveis. A página não é uma imagem achatada.

`active-design-nodes.json` registra as seções atuais. A revisão dos rodapés substituiu apenas os dois catálogos e reposicionou o rodapé da página conforme suas novas alturas. Os registros `native-ribbon-v5-nodes.json` e `ribbon-v5-publish.json` documentam a revisão anterior dos botões; `extra-nodes.json` mantém os nós das pranchas auxiliares. Cada versão foi construída em uma área temporária e substituiu as seções anteriores somente após verificar textos e imagens. Os scripts anteriores e seus registros são históricos; não devem ser executados para publicar novamente.

Verificações finais em `figma-audit.json`: 11 seções verificadas, nenhum texto da prévia ausente, nenhuma sobreposição entre seções, 10 imagens em cada página principal e uma imagem na prancha de estados. Fontes dos textos nativos verificadas e pesos corrigidos. As capturas finais estão em `figma-desktop-final.png`, `figma-mobile-final.png` e `figma-states-final.png`.

## Contratos funcionais preservados

Navegação principal e menu mobile; autenticação; seletor Yu-Gi-Oh!/Pokémon; catálogo/comunidade; busca por nome/código; categorias; filtros de atributo/tipo; ordenação; desejos; detalhes da carta; adicionar à coleção; paginação; estados vazios e ações de conta. A prancha de estados documenta as variações visuais. O arquivo Figma não contém ligações de protótipo ou backend: os comportamentos continuam implementados no projeto original.

As cartas exibidas são amostras locais do catálogo do projeto. Indicadores de comunidade em zero não representam atividade confirmada em produção.
