# Contratos funcionais — Explorar

Revisão da implementação antes do redesign. A fonte funcional é `src/components/explore.tsx`, `cards.tsx`, `shell.tsx`, `ui.tsx`, `game-switch.tsx` e `providers.tsx`.

## Catálogo e filtros

- A pesquisa é enviada pelo formulário e usa `q`, `game`, `type`, `attribute`, `offset` e `sort` em `/api/cards`. Manter submit por Enter e botão Buscar.
- Limpar busca zera o texto e pesquisa explicitamente com `q=''`.
- Categoria, atributo, ordenação e aba catálogo/comunidade disparam atualização automática. Requisições anteriores são abortadas.
- Jogo troca entre Yu-Gi-Oh! e Pokémon, reinicia categoria/atributo/paginação e persiste `duelink-game` no localStorage. Os botões expõem `aria-pressed`.
- Pokémon mostra Pokémon/Treinadores/Energias; Yu-Gi-Oh! mostra Monstros/Magias/Armadilhas/Fusão/Sincro/Xyz/Link.
- Filtros expandidos oferecem atributos corretos de cada jogo. Manter controles acessíveis e ação Limpar filtros.
- Ordenação Nome: A a Z ou Nome: Z a A. A paginação chama `search(cards.length, true)` e acrescenta resultados; botão desabilitado durante carregamento.
- Preservar skeletons, contagem, cobertura/traduções e mensagens de erro/vazio existentes.
- Aba comunidade consulta cartas disponíveis para troca e mostra estado vazio com CTA para cadastro ou coleção.

## Cards e diálogos

- Arte e nome abrem o mesmo CardDetail. Coração e adicionar são ações distintas e não devem disparar detalhes.
- Coração sem sessão navega a `/login?next=/desejos`; com sessão, alterna registro por usuário/card/jogo e atualiza desejos/toast.
- Adicionar sem sessão navega a `/login?next=/colecao`; com sessão, abre AddCardModal.
- Card da comunidade mantém dono/conservação e ação propor troca; carta do próprio usuário leva à coleção.
- CardDetail busca detalhes por `game` e `id`, mantém estatísticas específicas e ação adicionar.
- Dialog fecha por X, Escape e clique no backdrop; trava scroll de fundo e restaura ao fechar.
- AddCardModal mantém quantidade, conservação, idioma, raridade, edição, notas, disponibilidade para troca e tratamento de erro. Não simular gravação para revisão visual.
- Proposta mantém seleção da própria carta, mensagem, restrição de envio, erro e redirecionamento à conversa resultante. Não enviar propostas para revisão.

## Navegação e autenticação

- Acesso a Explorar, Marketplace, Vender cartas, Compras e vendas, Meus decks, Minha coleção, Lista de desejos, Meus matches, Minhas trocas e Comunidade.
- Menu mobile abre/fecha, overlay fecha e clicar em destino fecha o menu.
- Como funciona e Configurações continuam acessíveis; Administração somente para administrador.
- Entrar/Criar conta para visitante; Adicionar carta para usuário autenticado.
- Contagem de desejos filtrada pelo jogo, perfil e ação sair preservados.
- Hero Explorar cartas mantém âncora `#explorar`. Montar/Começar coleção vão a `/cadastro` sem sessão e `/colecao` com sessão.
- Rodapé mantém links legais, créditos de catálogo e links externos com `rel=noreferrer`.

## Limite da validação local

Smoke de visitante pode testar pesquisa real, filtros, ordenação, paginação, jogo persistido, detalhes e redirecionamentos sem gravar dados. Fluxos autenticados de coleção/desejos/propostas exigem sessão e backend e não serão declarados testados apenas pela leitura do código.

## Comportamentos preexistentes, separados de regressões

- Limpar filtros atualiza query sem pesquisa explícita; quando tipo/atributo já estão vazios, apenas mudar query não dispara o efeito de pesquisa.
- Comunidade ordena por criação e filtra nome/tipo; atributo e ordem alfabética não são aplicados no filtro local atual.

Não corrigir estes comportamentos incidentalmente durante a alteração visual sem escopo explícito.

## Resultado

Smoke real de visitante em `http://localhost:3000`: **11/11 verificações aprovadas, nenhum erro JavaScript de página**. Desktop 1440 × 1000 e mobile 390 × 844.

- Busca real por Mago Negro retornou 11 resultados; limpar atualizou a consulta.
- Magias retornou 2.898 resultados; atributo e limpeza, ordenação descendente e paginação de 24 para 48 cards funcionaram.
- Detalhes abriram e fecharam por X, Escape e backdrop; scroll do fundo foi travado e restaurado.
- Adicionar e coração redirecionaram para login com os respectivos destinos preservados.
- Comunidade exibiu vazio com CTA `/cadastro` e retornou ao catálogo.
- Pokémon retornou 21.256 cartas, mudou categorias e persistiu após reload; retorno a Yu-Gi-Oh! funcionou.
- Menu mobile abriu, fechou por X/Escape/link e navegou a `/desejos`; todos os destinos do checklist continuam acessíveis.
- Ação adicionar no mobile mediu 44 × 44 px; detalhe mobile abriu e fechou.
- Revalidação após correção do root: imagem local via API retorna HTTP 200 `image/jpeg` sem redirect a 0.0.0.0; imagem indisponível do detalhe utiliza `/card-back.svg`, carregado com dimensões 421 × 614.

Evidências: `smoke-results.json`, `media-verification.json`, `mobile-menu.png`, `mobile-detail-final.png`, `detail-X.png` e demais capturas deste diretório. `investigate.json` e capturas `mobile-investigate-*` são o diagnóstico histórico anterior à correção de imagens. Os dois timeouts da primeira execução foram investigados: a readiness capturava os 12 cards iniciais antes de estabilizar os 24 resultados, permitindo corridas com atualização. O smoke final aguarda estabilização e não mantém estas falhas como problemas do produto.

Não foram efetuadas gravações remotas. Fluxos autenticados de coleção, desejos, proposta e logout não foram testados ponta a ponta sem sessão disponível.
