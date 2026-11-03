# Letreiro e círculo — SVG colorido

Pedido: utilizar somente o letreiro e o círculo da referência monocromática indicada pelo usuário, em cores e em SVG.

Entrega principal: `public/brand/duelink-letreiro-circulo.svg`.

- Sete letras de DUELINK vetorizadas a partir dos contornos da referência.
- Círculo reconstruído em curvas nas partes antes ocultas pelas cartas, com acabamento de movimento.
- Cartas, elo, desenhos internos das cartas e raios laterais removidos.
- Letreiro em dourado, círculo em ciano, contorno grafite e filete claro externo.
- Fundo transparente; grupos separados `circulo` e `letreiro`; sete letras com identificadores próprios.
- Somente elementos vetoriais: sem imagens raster embutidas, fontes, scripts ou recursos externos.
- ViewBox `0 40 1774 820`; escalável sem resolução fixa.

PNGs renderizados diretamente do SVG:

- `duelink-letreiro-circulo.png`: fundo transparente.
- `duelink-letreiro-circulo-preview.png`: apresentação em fundo grafite.
- `duelink-letreiro-circulo-fundo-claro.png`: apresentação em fundo branco.

O gerador reproduzível está em `source/build_lettering_circle.py`. A referência monocromática original já consta em `public/brand/duelink-logo-monocromatica-fundo-escuro.png`; pode ser passada ao gerador como primeiro argumento.

A entrega foi renderizada e conferida sobre fundo claro e escuro. O SVG foi validado como XML, com conferência dos sete contornos e da ausência de elementos de imagem e texto dependente de fonte.
