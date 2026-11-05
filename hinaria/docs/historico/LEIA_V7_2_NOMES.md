# HINÁRIA V7.2 — Etiquetas de NPC e rato alinhadas

Este patch **não muda o modelo ou spawn do rato**. Ele altera só a projeção das etiquetas: o nome do rato, NPCs e outros monstros segue a cabeça do modelo em 3D, levando em conta escala, rotação, altura de terreno e animação. Também remove o resize duplicado da câmera.

Para verificar que o novo APK de fato contém a alteração, o HUD exibe `V7.2 · NOMES FIX · 31OUT`. O gerador de APK confere o marcador dentro do arquivo final e cria também `APK_GERADO/HINARIA_V7_2_NOMES_FIX_31OUT.apk`.

No Codespaces, depois de descompactar este patch em `/workspaces/Apk`, execute:

```bash
cd /workspaces/Apk/HINARIA_V7_ANDROID
node tests/test_label_anchor_v72.mjs
node tests/test_entity_tags.mjs
node tools/bump-android-version.mjs
npm run android:debug
unzip -p APK_GERADO/HINARIA_V7_2_NOMES_FIX_31OUT.apk assets/public/index.html | grep 'V7.2 · NOMES FIX · 31OUT'
```

Se o grep não mostrar nada, o APK não contém o hotfix. Se o app no telefone não mostrar `V7.2 · NOMES FIX · 31OUT` no painel da vida, você está executando uma instalação antiga. Baixe o arquivo `HINARIA_V7_2_NOMES_FIX_31OUT.apk` e atualize o app. Se o Android recusar instalar por incompatibilidade de assinatura, faça backup dos dados antes de desinstalar o app existente, pois isso pode apagar o progresso salvo.

**Limitação:** testes automatizados de matemática de etiquetas e estrutura foram executados; a posição visual precisa ser confirmada no Android real.
