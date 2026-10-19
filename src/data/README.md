# Catálogo sincronizado do Duelink

`catalog.json.gz` é o índice completo de busca usado no servidor. Não faz parte do JavaScript enviado ao navegador. `catalog-report.json` registra fontes, data, volumes, traduções e exclusões da última importação válida.

Atualização: `node scripts/sync-catalog.mjs`. O script usa os endpoints públicos de YGOPRODeck e TCGdex, pagina os resultados de Pokémon, preserva os nomes em inglês e português por identidade e só substitui o arquivo após concluir e validar as duas importações. Uma falha mantém o snapshot anterior. O commit do snapshot atualizado e um novo deploy publicam a versão revisada.

Yu-Gi-Oh!: https://ygoprodeck.com/api-guide/ . Inclui cartas sem nome português; apenas o registro de placeholder `???` foi excluído. As imagens continuam no cache de Storage já usado pelo app, conforme as exigências do provedor.

Pokémon: https://tcgdex.dev/ . A série digital Pocket (`tcgp`) é excluída. A cobertura de português e imagens é parcial e está explicitada no relatório. Imagens são servidas por uma rota com origem fixa e cache; não são alteradas ou traduzidas. Detalhes de cartas Pokémon são enriquecidos sob demanda pela API e têm cache de 24 horas.

A base TCGdex usa a licença MIT, preservada em `LICENSE-TCGdex.txt`. A licença dos metadados não transfere direitos sobre marcas, artes ou propriedade intelectual dos jogos. O Duelink não se apresenta como produto oficial de suas editoras.
