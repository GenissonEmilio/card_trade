# Conferência do cabeçalho e menu no tablet

Após o ajuste dos breakpoints, foram verificadas exclusivamente as larguras **768, 1024, 1200, 1279 e 1280 px**, com viewport de 844 px de altura. A auditoria anterior do restante da página não foi repetida.

Resultado: **aprovado nas cinco larguras**. Sem overflow horizontal da página nem sobreposição entre logo, navegação, ações de conta e menu. A navegação secundária permanece contida; no menor tablet, sua área pode rolar horizontalmente.

| Largura | Menu | Abertura/fechamento | Navegação principal |
| --- | --- | --- | --- |
| 768 | visível | passou | 3 links + menu completo |
| 1024 | visível | passou | 3 links + menu completo |
| 1200 | visível | passou | 3 links + menu completo |
| 1279 | visível | passou | 3 links + menu completo |
| 1280 | oculto | não aplicável | 5 links visíveis |

O menu contém “Comunidade” e “Minha coleção” em todas as quatro larguras intermediárias. O CTA de criar conta está oculto em 768, preservando espaço; reaparece em 1024. Em 1280, a navegação completa cabe no cabeçalho sem precisar do menu.

Evidências: `tablet-header-report.json`, `{768,1024,1200,1279,1280}-header.png` e `{768,1024,1200,1279}-tablet-menu.png`. O script intercepta apenas os dados do catálogo para evitar carregamentos externos fora do escopo; o menu, header e seus eventos são reais.
