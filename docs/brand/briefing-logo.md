# Duelink — análise de referências e briefing da logo

## Contexto do projeto

O Duelink conecta colecionadores de cartas físicas de Yu-Gi-Oh! e Pokémon em Lagarto, Sergipe. A plataforma reúne catálogo, coleção, decks, desejos, correspondências, trocas e marketplace. A marca precisa comunicar tanto a energia do jogo quanto a aproximação entre pessoas.

Base da análise: referências fornecidas pelo usuário, README do projeto, identidade em `public/logo.svg` e cores de `src/app/globals.css`. As observações de cor das referências são visuais, sem pretensão de especificar seus valores originais exatos.

## Análise técnica das referências

### 1. Poke Decks

- **Tipografia:** lettering muito pesado, arredondado e irregular, com variações de escala e inclinação. As letras próximas e parcialmente sobrepostas formam uma massa compacta e divertida. As contraformas permanecem relativamente abertas.
- **Composição:** nome em duas linhas, com volume central dominante. Cartas e bolas nas laterais funcionam como moldura e situam a marca no universo Pokémon. O fundo roxo pertence à apresentação da referência; não precisa integrar a logo.
- **Cor e contraste:** amarelo/laranja quente contra azul profundo. Contornos em camadas, com borda clara externa, separam o letreiro de um fundo visualmente carregado.
- **Profundidade:** sombra deslocada e faixas de contorno criam volume gráfico. A sensação de relevo depende mais da construção das bordas do que de renderização realista.
- **Contribuição ao Duelink:** acolhimento, presença, contraste e leitura imediata do nome.
- **Limite de aplicação:** as ilustrações periféricas e as muitas bordas tendem a se aglutinar quando reduzidas. Para o Duelink, reduzir ornamentos e preservar contadores abertos.

### 2. Nexzin / NXZ Vendas — colorida

- **Tipografia:** caixa-alta larga, blocada e angular, com diagonais fortes e recortes geométricos. NXZ domina; VENDAS funciona como assinatura secundária. Os intervalos pretos isolam as letras e organizam a sobreposição.
- **Composição:** emblema aproximadamente circular atrás do letreiro. Fragmentos externos prolongam as direções do símbolo e sugerem expansão, velocidade e energia.
- **Cor e contraste:** azul vivo e ciano contíguos, com preto nos recortes e branco no texto secundário. O ciano funciona como borda iluminada e o azul como preenchimento principal.
- **Profundidade:** massas planas, sobreposições e espessura de contorno. A aparência é próxima de uma marca gamer/esports, com silhueta agressiva e alta ocupação da área.
- **Contribuição ao Duelink:** força tipográfica, diagonais, movimento circular e integração entre emblema e nome.
- **Limite de aplicação:** muitos fragmentos acrescentariam ruído ao cabeçalho de uma plataforma. A força deve vir do lettering e do símbolo central.

### 3. Nexzin — monocromática

- **Construção:** a remoção das cores conserva o reconhecimento pelas massas sólidas e pelos vazios. Isso evidencia que a estrutura principal independe do azul e do ciano.
- **Figura e fundo:** branco e preto mantêm a separação entre símbolo, texto e recortes. A versão demonstra uma direção útil para impressão simples e aplicações de alto contraste.
- **Contribuição ao Duelink:** planejar uma silhueta reconhecível, com poucos detalhes e separações que sobrevivam sem cor.
- **Limite de aplicação:** os menores fragmentos e interrupções continuam sensíveis à redução. A robustez monocromática não substitui a verificação de legibilidade em cada tamanho.

## Síntese criativa

Combinar a simpatia e os contornos da Poke Decks com a presença angular e o movimento da Nexzin. Traduzir o círculo energético em uma conexão entre cartas, ligando a forma ao propósito do produto.

Conceito: **duas cartas, uma conexão**.

## Briefing de criação

- **Nome exato:** DUELINK — sete letras, D U E L I N K, com um único L. Duel + link compartilham a letra L.
- **Personalidade:** enérgica, próxima, colecionável e confiável.
- **Mensagem central:** encontrar pessoas, conectar coleções e movimentar cartas.
- **Letreiro:** caixa-alta pesada, desenho personalizado e leve inclinação para a direita. Misturar terminais angulares com curvas controladas. Priorizar leitura do nome inteiro em uma linha.
- **Símbolo:** duas cartas genéricas entrelaçadas, parcialmente atrás do centro do letreiro. Um arco aberto sugere circulação e troca. Evitar ilustrações de cartas licenciadas, personagens, bolas e símbolos exclusivos de uma franquia.
- **Hierarquia:** nome primeiro, cartas depois, arco como apoio. O símbolo não deve interromper a leitura das letras.
- **Paleta proposta:** dourado principal `#E9C275`, luz dourada `#F1D191`, ciano de conexão `#73C5C5` e grafite `#0C0F12`, derivados da interface existente. Um ciano mais luminoso pode aparecer como acento gráfico. Branco quente serve à borda externa.
- **Acabamento:** aparência de ilustração vetorial, contornos limpos, poucos planos de cor, sombra curta e sólida. Volume gráfico discreto, sem textura metálica, brilho difuso ou efeito fotográfico.
- **Composição:** assinatura horizontal compacta, em torno de 2:1, com respiro externo e fundo realmente transparente. Pequenos acentos de energia podem reforçar o movimento, sem formar uma moldura de fragmentos.
- **Texto:** apenas DUELINK na assinatura principal. Uma frase de apoio reduziria a legibilidade e não é necessária para reconhecer a marca.
- **Aplicações previstas:** cabeçalho, materiais de comunidade, redes sociais e adesivos. O símbolo isolado exigirá uma adaptação própria antes de uso como favicon.

## Critérios de avaliação

1. Grafia correta e leitura contínua de DUELINK.
2. Relação perceptível entre cartas, conexão e troca.
3. Equilíbrio entre diversão e confiança.
4. Afinidade com as referências sem reproduzir suas marcas.
5. Fundo transparente e bordas sem recorte acidental.
6. Contadores e espaços negativos suficientes para redução.

## Entrega e limites

Arte criada pela ferramenta nativa de geração de imagens, a partir de `prompt-logo.txt`, com uma adaptação monocromática descrita em `prompt-logo-monocromatica.txt`.

| Arquivo | Formato | Fundo | Dimensões |
| --- | --- | --- | --- |
| `public/brand/duelink-logo.png` | PNG RGBA | Transparente | 1774 × 887 px |
| `public/brand/duelink-logo-monocromatica-fundo-escuro.png` | PNG | Grafite opaco | 1774 × 887 px |

Conferência da principal: nome DUELINK com sete letras, cartas e elo reconhecíveis, enquadramento horizontal, canal alpha real com valores entre 0 e 255 e margem externa transparente. A adaptação monocromática final foi revisada visualmente para leitura do nome e separação entre as formas; usa branco sobre fundo escuro incorporado, sem transparência.

O aspecto vetorial descreve o estilo visual; os arquivos entregues são raster, não SVGs editáveis. A versão monocromática é uma adaptação gerada e pode apresentar pequenas diferenças de contorno. Tamanhos mínimos de uso precisam ser validados na aplicação; não utilizar a assinatura completa como favicon sem uma adaptação do símbolo.

A criação da arte não altera automaticamente a interface do site.
