# HINÁRIA — integração de texturas

**Base:** HINARIA_110_VISUAL_V3_FREEFRONTEND_MODELOS3D_MELHORADOS.

Adicionados 38 albedos e 38 normal maps do pacote enviado em `assets/textures/`.

**Aplicado no runtime:**
- Casas / prédios / mercado / ferraria / poço do catálogo `environmentV2.js`: madeira, telhado, pedra, reboco, vegetação e ferro; normal maps sutis nos materiais PBR.
- Objetos repetidos (árvores, pedras, caixas, cercas e outros) usam material com textura compartilhada sem alterar instancing e colisão.
- Interiores: madeira, reboco e rocha, com normals suaves.
- Personagens: detalhes em pele/roupas selecionadas antes do batching de meshes; evita texturizar indiscriminadamente o rig completo.
- Chão 96×96: texturas por bioma sobre o canvas já existente, sem novo mesh; centro da praça permanece legível.
- Água: albedo do pacote no material da superfície existente.

**Notas:** arquivos de textura são locais e copiados no build Capacitor (`assets/`). Nem toda textura é usada em todos os modelos: foram adicionados usos onde o material e o mapeamento UV permitem resultado coerente. Restante disponível para próximas iterações. Não há atualização da versão Three.js.

Comando: `npm install && npm run build:web`; para jogo local `npm start` não está definido no projeto, use `node server.js`.
