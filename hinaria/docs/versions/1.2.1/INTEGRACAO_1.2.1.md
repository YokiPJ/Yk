# Integração no projeto original

O diretório `hinaria/` reúne o jogo atualizado e os projetos antes mantidos em pastas separadas do ambiente.

- Jogo 1.2.1 com correções nos 12 modelos V2, modelos clássicos e clones dos interiores.
- HUD PixiJS, tela de título Three.js, fluxo de save, efeitos e demais melhorias do upgrade 1.2.0 preservados.
- Fontes, dependências e scripts dos quatro laboratórios incluídos em `tools/`.
- Gerador Java com snapshot comprimido incorporado ao JAR, sete modelos reais e dez clipes por modelo. O snapshot histórico 1.2.0 foi mantido para reproduzir as animações já entregues.
- Adaptador opcional de GLBs em `tools/motion-java/examples/HinariaMotionPlayer.mjs`.
- Galeria de seis cenários, com Vilarrubra como imagem principal.
- Portal local em `/studio/`, disponível por `npm start` na raiz do repositório.
- APK e JAR na pasta `downloads/`; download pelo HTTP com `Content-Disposition: attachment`.
- Build web offline inclui os HTMLs e o JAR. O APK não contém outra cópia de si mesmo; no pacote web isolado, a página informa sua localização no projeto completo.
- Scripts usam caminhos relativos ao projeto. Caches, SDK, dependências instaladas, chaves privadas e builds intermediários não fazem parte do Git.

Os laboratórios não criam outro loop de animação dentro do jogo. Cada visualizador tem sua própria página e controles. O jogo mantém seu animador e aplica as correções de equipamentos no fluxo normal de personagens.

Os resultados medidos desta integração ficam em `INTEGRATION_RESULTS.md`. Os relatórios anteriores do upgrade e dos modelos foram preservados, com seus escopos e versões originais.
