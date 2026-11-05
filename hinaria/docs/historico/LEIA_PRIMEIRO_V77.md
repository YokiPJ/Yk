# HINÁRIA V7.7 — VILARRUBRA CLEAN (31/10/2026)

## Correções implementadas

- **Casas vermelhas/laranjas por efeito de dano:** o material MeshLambert vertex-coloured era um objeto global usado por casas, NPCs e personagens. O loop de combate altera `emissive` nos personagens atingidos; como todos usavam o mesmo material, o brilho se espalhava. Agora cada raiz usa seu próprio material, preservando animações e hit flash.
- **Decoração com manchas pretas:** a textura grayscale de pedra era usada em TODOS os objetos instanciados junto às cores por vértice. Removida só desse material de props; a geometria e iluminação preservadas.
- **Mercado:** banca de madeira grossa, toldo listrado, frutas e verduras limpas, sacos, cestos de palha.
- **Praça:** floreiras maiores e canteiros em tons naturais. Poço retrabalhado. Objetos novos são decorativos e não bloqueiam a navegação.
- **Preservado:** Vilarrubra, classes, vida, missões, arsenal, analógico, nome/HP, animações e projeto Android.

## Instalação no Codespaces

1. Envie `HINARIA_V7_7_VILARRUBRA_COMPLETA.zip` a `/workspaces/Apk`.
2. Execute:

```bash
cd /workspaces/Apk
unzip -o HINARIA_V7_7_VILARRUBRA_COMPLETA.zip
bash INSTALAR_V77_CODESPACES.sh
```

O script faz backup dos fontes atuais, copia a V7.7 limpa (não mistura patches), mantém `android/` e `node_modules/`, roda testes e compila o APK.

### Teste rápido antes do APK

```bash
cd /workspaces/Apk/HINARIA_V7_ANDROID
node tests/test_v77_materials_market.mjs
node test_v7_village.mjs
npm run build:web
node server.js
```

Abra a porta 8000 (ou a configurada no servidor) no Codespaces e atualize a página. Veja os telhados e canteiros quando o personagem recebe dano ou um efeito.

**APK esperado:** `HINARIA_V7_ANDROID/APK_GERADO/HINARIA_V7_7_VILARRUBRA_CLEAN.apk`.
**Identificador no HUD:** `V7.7 · VILARRUBRA CLEAN · 31OUT`.

## Validação / limites

Passaram testes automatizados de regressão de lógica de mapa, missões, arsenal, mobile, modelos e isolamento de materiais. A inspeção visual na GPU real / APK ainda é necessária, e este pacote NÃO inclui o Android SDK, o `android/` gerado nem `node_modules/` (os do Codespaces são reutilizados).
