# Implementação do redesign Duelink

A página Explorar (`/`) implementa a versão pixelada aprovada no Figma: roxo, creme e verde-lima; logo vetorial legível; hero central; navegação horizontal; controles em faixas inclinadas; cards escalonados com ação de 44 × 44 px. Esta pasta documenta a etapa inicial. O design system foi posteriormente aplicado às 22 páginas; consulte `../../docs/design-system/README.md` para a implementação atual e a análise por tela.

## Referência e implementação

- Arquivo Figma `5um6rt7EPycsek27y2AEEw`, desktop `3:2` e mobile `4:252`, consultado pela conexão local DesignAgent / Claude Bridge.
- Capturas e especificações atuais: `../figma/figma-implementation-desktop.png`, `figma-implementation-mobile.png` e `figma-spec-implementation-*.json`.
- `src/components/explore-shell.tsx`: cabeçalho, navegação mobile acessível por diálogo, conta e rodapé.
- `src/components/explore.tsx`: layout visual com os estados, consultas, handlers e destinos originais.
- `src/components/pixel-design.tsx`: composição de ícones locais e faixas.
- `src/app/pixel-explore.css`: tema restrito à classe `.pixel-app`, com adaptações para desktop, tablet e mobile.
- `public/brand/pixel/`: geometria SVG usada no projeto Figma. Ícones Phosphor duotone com licença MIT; fontes Chakra Petch locais com OFL. A logo permanece um SVG em curvas.

Busca, jogo selecionado e persistência, filtros, ordenação, paginação, desejos, detalhe, adicionar carta, comunidade e destinos de autenticação continuam ligados ao código original. O catálogo permanece dinâmico; a quantidade e as cartas exibidas dependem da consulta, sem limitar os dados às oito amostras do Figma.

## Revisão por agentes

- `desktop/`: comparação visual em 1440 e 1365 px, incluindo medidas contra o HTML que originou as camadas do Figma.
- `mobile/`: revisão em 360, 390 e 768 px, capturas de controles, cards, rodapé e menu.
- `behaviors/`: onze verificações interativas como visitante, com a API real.

As comparações visuais usam oito amostras do catálogo apenas no navegador de revisão para reproduzir as cartas da referência; essa interceptação não faz parte da aplicação. Os testes funcionais usam consultas reais. Fluxos que exigem sessão autenticada não foram exercitados.

## Imagens e validação

A revisão encontrou redirecionamentos de imagens locais para o endereço de bind `0.0.0.0` no servidor de desenvolvimento. A API agora serve esses arquivos e o verso de reserva diretamente. Os detalhes também usam o verso quando uma imagem remota falha. Imagens fora do acervo local continuam dependendo do provedor remoto configurado.

Executar `npm run dev` para abrir em `http://localhost:3000`. Verificações: `npm run typecheck`, `npm run build`, suíte Vitest e auditorias Playwright registradas nas subpastas acima. `tests/card-image.test.ts` cobre o erro do endereço de bind, a reserva local e a rejeição de identificadores inválidos.

A suíte padrão aprovou 179 testes e excedeu o limite de 15 segundos em um teste existente que ordena os dois catálogos completos. Esse teste passou na reexecução isolada com `--testTimeout 120000` (cerca de 56 segundos); o limite padrão do repositório e a lógica do catálogo não foram alterados. Build de produção e TypeScript aprovados. A versão de produção local pode ser iniciada com `npm run start -- --port 3001`.

`production-review.json` e `production-{largura}.png` registram a conferência final da versão compilada. Os ajustes finais também restauram a frase abaixo da contagem no mobile e permitem que o SVG da transição pixelada ocupe a largura planejada. O relatório de tablet `mobile/TABLET-HEADER-REVIEW.md` confirma os destinos de navegação entre 768 e 1280 px.
