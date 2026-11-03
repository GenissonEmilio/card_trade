# Harness isolado de revisão visual

Executa componentes React **reais** de `src/components`, sem alterar os guards, autenticação ou contratos da aplicação. Os aliases de esbuild existem somente neste bundle de QA: `providers`, cliente Supabase, `next/navigation` e `next/link`. Todos os estilos `src/app/*.css` e os CSS modules usados pelos componentes são compilados diretamente das fontes do produto. Recarregue a página após alterações do app para reconstruir o bundle.

```powershell
node design/system-review/harness/server.cjs
```

Abrir `http://127.0.0.1:3102/?screen=library&role=user&state=populated`.

Os arquivos HTML de bootstrap, JS/CSS compilados, mapas e capturas são gerados apenas em `.local/`, ignorado pelo Git. A fonte das telas continua sendo TSX real do produto.

## Parâmetros

| Parâmetro  | Valores                                                                                                                                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `screen`   | `explore`, `library`, `wishlist`, `decks`, `settings`, `profile`, `community`, `matches`, `trades`, `trade-detail`, `marketplace`, `seller`, `orders`, `order-detail`, `admin`, `moderation`, `login`, `register`, `forgot`, `reset`, `components` |
| `role`     | `guest`, `user`, `admin`                                                                                                                                                                                                                           |
| `state`    | `populated`, `empty`, `error`, `loading`, `mutation-error`, `closed`, `unconfigured`, `auth-loading`                                                                                                                                               |
| `game`     | `yugioh`, `pokemon`                                                                                                                                                                                                                                |
| `status`   | Em `trade-detail`: `pending`, `accepted`, `completed`, `declined`, `cancelled`. Em `order-detail`: `pending_payment`, `paid`, `ready`, `completed`, `cancelled`, `expired`, `refunded`, `disputed`, `payment_review`.                              |
| `shell`    | `0` para inspecionar somente o componente; padrão inclui o Shell real.                                                                                                                                                                             |
| `id`       | Identificador do detalhe; padrão `trade-demo` ou `order-demo`. Um ID inexistente permite conferir estado não encontrado.                                                                                                                           |
| `username` | Perfil da fixture; padrão `bruno_tcg`. `nao-existe` confere perfil não encontrado.                                                                                                                                                                 |

`?screen=admin&role=admin` exibe painel com configurações, membros e histórico sintéticos. `role=user` testa a recusa da API simulada; `screen=moderation&role=user` preserva o guard real do componente. O layout server de produção não é importado nem modificado.

`state=loading` deixa as consultas pendentes. `auth-loading` mantém o carregamento do contexto; componentes públicos que não usam esse estado podem continuar aparecendo. `error` simula falhas das consultas; `mutation-error` permite carregar dados e simula falha somente ao salvar. Configurações dependentes de envio só mostram erro após a interação correspondente.

## Isolamento e evidência

- Servidor preso a `127.0.0.1:3102`, sem proxy para o app, Supabase, Mercado Pago ou outra API.
- `fetch('/api/...')` é respondido em memória; endpoints desconhecidos falham explicitamente. Requests externos são bloqueados no mock e por CSP.
- GETs de imagens e fontes só servem arquivos de `public/`. Imagens não disponíveis usam o verso local; nenhuma imagem é baixada da rede.
- Todas as operações mutáveis são gravadas em memória e desaparecem ao recarregar. POSTs no servidor são recusados com HTTP 405.
- Checkout e conexão externa nunca retornam URL de provedor. Botões correspondentes mostram a recusa isolada de QA.
- `window.__DUELINK_QA__.log`, `.mutations` e `.tables` permitem conferir quais consultas e mudanças locais ocorreram. Nenhuma chave ou credencial do ambiente é lida.

```powershell
node design/system-review/harness/scan.cjs
```

Gera capturas e relatório básico em `.local/scan.json`. O scan não substitui a inspeção visual das capturas. Os dados são sintéticos para forçar estados: não validam regras SQL, RLS, OAuth, pagamentos ou permissões reais do backend.

## Consumidores do design system

`?screen=components&role=user` compõe `ActionButton`, `ActionLink`, `Panel`, `StatusBadge` e `Modal` reais. A prancha inclui quatro variantes de ação em dois tamanhos, botões desabilitado e ocupado, três tons de painel, cinco tons de status, formulário com labels/erro/disabled e diálogos padrão/amplo. Essa tela só existe no harness: não cria rota na aplicação.

```powershell
node design/system-review/harness/interactions.cjs
node design/system-review/harness/capture-components.cjs
```

O primeiro comando verifica formulários e handlers dos componentes reais convertidos para DS; o segundo captura a prancha inteira em 1440 e 390 px. Evidências ficam em `.local/interactions/` e `.local/components-*.png`. Para repetir somente casos relacionados a uma alteração, passe trechos dos nomes, como `interactions.cjs 'Settings submit' 'Admin settings'`; o relatório preserva resultados anteriores e substitui os casos repetidos.

A ordem dos estilos segue o layout real: `globals`, `multigame`, `navigation`, `pixel-explore`, `design-tokens`, `design-system`, depois os CSS modules dos componentes. Os modos `forgot` e `reset` usam `/recuperar-senha` no mock de navegação e recebem o shell interno `.ds-main`.
