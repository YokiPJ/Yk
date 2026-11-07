# Validação da Beta 3

O APK final e o bundle testado compartilham o fingerprint `ab14835f7775`. Os 211 arquivos web empacotados foram comparados com o manifesto SHA256; a identidade Android é br.com.hinaria.rpg, versão 1.3.0-beta.3, código 8. O certificado coincide com a Beta 2.

A suíte Node passou 56/56 casos; os testes novos executam o controlador puro de mira e a bridge de combate real com a FSM de combos, incluindo dano único, comandos antecipados, alvo invalidado, movimento e esquiva. A consulta frontal usada pelas habilidades mantém seus testes existentes.

O teste de navegador usa a build mobile real e as cinco classes escolhidas pela interface. Duas entidades reais são posicionadas em um corredor livre e atordoadas com 1000 HP; o teste confirma giro para o inimigo atrás pelo toque, seleção do mais próximo, paredes, alcance e ausência de ataques sem novos comandos. Flechas e cajados usam os projéteis e callbacks reais. As cinco capturas aim-*.png documentam essa fixture.

Os quatro testes dos ZIPs usam uma árvore Git candidata com os arquivos finais do jogo. Eles abrem a raiz com servidor estático e Node, aplicam o patch sobre a Beta 2 e verificam erro claro para dependências parciais. Nenhum desses cenários instala node_modules. Os pacotes de distribuição finais também são comparados por conteúdo antes da publicação; os registros dessa etapa e da publicação são acrescentados à documentação após a preparação.

Comandos a partir de hinaria/:

```bash
npm run test:qa
npm run build:mobile
CHROMIUM_PATH=/usr/bin/chromium node tools/test-attack-aim-browser.mjs --offline
CHROMIUM_PATH=/usr/bin/chromium node tools/test-bundle-browser.mjs
```

`CHROMIUM_PATH` é opcional quando o navegador do Playwright está instalado. O teste dos ZIPs usa HINARIA_SOURCE_ARCHIVE, HINARIA_PATCH_ARCHIVE, HINARIA_PREVIOUS_ARCHIVE e HINARIA_STARTUP_ARTIFACTS. Veja results.json e os relatórios individuais para os limites do ambiente.
