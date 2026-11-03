# Revisão visual mobile e tablet

Referência: captura recente do Figma via Design Bridge (`design/figma/figma-implementation-mobile.png`) e HTML aprovado do estudo. Implementação verificada em `http://localhost:3000`.

## Resultado

Inspeção visual e medições em 390 × 844, 360 × 844 e 768 × 844. Nenhum overflow horizontal, texto importante fora da viewport ou erro JavaScript na rodada final. A versão tablet usa três colunas; as versões de 360 e 390 usam duas.

Os testes de fidelidade interceptaram **somente `/api/cards`** com as oito cartas locais do estudo. As imagens passaram pela API real `/api/card-image`, sem mock de imagens. Isso permite comparar o mesmo conteúdo do Figma sem trocar o comportamento do aplicativo ou depender de imagens externas do restante do catálogo. Os testes com catálogo real são verificados separadamente.

- Cabeçalho de 94 px, hero de 936 px e estatísticas de 276 px em mobile; início do catálogo em y=1306, igual à referência.
- Logo legível, cores, faixas inclinadas, detalhes pixelados, órbita e cartas decorativas preservados.
- Cards de 170 × 417 px em 390, e de 155 × 417 px em 360; proporção de 217,33 × 497 px no tablet.
- Ações de adicionar com área de 44 × 44 px, à direita; texto “No catálogo” à esquerda, sem interseção ou recorte. Imagens carregadas e nomes preservados.
- Busca, filtros e ordenação cabem; categorias quebram em linhas sem sobreposição; ordenação tem contraste correto após ajuste.
- CTA, transição pixelada e rodapé completos, com links legíveis e sem sobreposição.
- Menu mobile abre após hidratação, mostra todos os links e ações de conta dentro de 390 × 844. Captura `390-menu.png`.

## Problemas encontrados e corrigidos durante a revisão

1. `Icon is not defined` na renderização das categorias causava a boundary de erro da página.
2. Ordenação tinha texto roxo sobre faixa roxa por especificidade do pseudo-elemento.
3. Redirecionamento das imagens locais apontava para `0.0.0.0`, inválido no Chrome; API passou a servir bytes locais.
4. Margem herdada deslocava o texto do hero; reset aplicado.
5. Geometria dos cards estava 12 px menor; corrigida para 417 px.
6. Estilos herdados reduziam links do rodapé; tamanhos e layout corrigidos.

## Observação enviada

Na faixa 768–1199 px, duas entradas principais são ocultadas para caber no cabeçalho. Foi sugerido disponibilizar o menu nessa faixa para manter acesso direto a todos os destinos. Essa observação não afeta as capturas mobile de 360/390.

Evidências: `report.json` contém limites, fontes e carregamento. `{390,360,768}-top.png`, `-catalog-controls.png`, `-cards.png` e `-footer.png` registram a última rodada. Capturas dos controles podem mostrar uma imagem lazy ainda chegando abaixo da dobra; as capturas dos cards aguardam explicitamente carregamento e contêm as imagens finais.
