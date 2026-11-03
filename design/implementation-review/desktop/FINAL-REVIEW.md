# Revisão visual desktop

**Aprovado em 1440 e 1365 px**, com as correções relatadas durante a revisão. Nenhuma mudança na aplicação foi feita por este agente.

Referência: captura atual do Figma via Design Bridge (`design/figma/figma-implementation-desktop.png`) e HTML de referência aprovado. Capturas reais: `app-fixture.png` (1440) e `desktop-1365-final.png` (1365). Comparação isolou oito amostras de dados via interceptação de API no navegador de teste; o código da aplicação permanece dinâmico. O teste inicial com dados reais está em `review-desktop.json` e `desktop-1440.png`.

## Conferido

- Hero, logo, moldura pixelada, duas cartas inclinadas, ícones próprios e botões em faixa mantêm a direção aprovada.
- Em 1440 px, posições e alturas do hero e seu conteúdo coincidem com a referência: hero y158/h768; introdução y254; título y319.5; descrição y481.156; CTAs y561.656; prova social y632.656; painel do match y720/h100.
- Stats y926/h108 e catálogo y1034 corretos. Após ajustes, abas y1304/h38.5 e linha de controles y1366.5/h52 coincidem com a referência.
- Cards de 294 × 497 px e ações de 44 × 44 px, com status legível e margem para recortes. Artes preservam proporção; oito imagens locais carregadas.
- Em 1365 px: quatro colunas de 294 px; oito botões de 44 px; nenhuma imagem ausente, overflow horizontal ou erro de página.
- Footer tem alturas corretas (CTA 355 px; footer 358.5 px); comunidade em x1076 no desktop1440, conforme a referência.
- Ordenação voltou ao fundo creme com texto roxo legível; conflitos de fontes/cores e layout do footer foram corrigidos.

## Correções identificadas e aplicadas pelo agente principal

1. `Icon is not defined` derrubava Explore no ErrorBoundary; corrigido.
2. Especificidade fazia ordenação roxa com texto roxo; corrigido.
3. Regras globais comprimiam footer e adicionavam margem ao hero/abas; corrigido.
4. Dimensões/padding/borda dos cards diferentes da referência; corrigido, medições 497/44 confirmadas.
5. Redirect de imagens locais sob hostname0.0.0.0 causava fallback indevido; agente principal ajustou a resposta local da API. As oito imagens locais passaram a carregar.
6. Última diferença medida: categoria com margem +1 px e espaço após grade +24 px. Agente principal confirmou ajustes para margens24/34, respectivamente.
7. Emendas de subpixel nas faixas SVG a1365px: agente principal aplicou `shape-rendering="crispEdges"` às artes retangulares.

## Limites e última verificação

As últimas correções de1/24px e crispEdges foram confirmadas pelo agente principal após as capturas anexas. A atualização final das capturas ficou pendente do runtime de produção: Playwright travou ao fechar páginas/browser durante carga de build/testes concorrentes. Os processos antigos desta revisão foram encerrados para liberar CPU. Não há bloqueio de design identificado; recomenda-se que o agente principal faça uma única captura final no runtime de produção já planejada.

Com dados reais, cartas sem imagem local dependem da configuração externa já existente; isto foi separado da verificação de fidelidade. Não houve alteração ou limitação do catálogo para oito cartas em produção.

## Conferência posterior na versão compilada

O agente principal concluiu a captura final em `http://localhost:3001`: `../production-review.json` e `../production-{1440,1365,390}.png` substituem a pendência acima. Desktop 1440/1365 tem 3456 px de altura e início do CTA em y2742, conforme o Figma. Todos os oito cards têm 497 px no desktop e 417 px no mobile; ações de 44 px, imagens carregadas, sem overflow ou erros JavaScript. A transição pixelada mobile mede 780 px e cobre a viewport, com a frase dos resultados visível.
