# HINÁRIA 1.1.0 — Interiores V2 Animados

Base: HINÁRIA 1.1.0 QA + Lore. Apenas `src/world/houseInteriors.js` foi modificado; `tests/test_interior_animated_v2.mjs` é novo.

## Melhorias
- Caminhada nas casas usando o CharacterAnimator original e a cópia isolada do rig.
- Rotação suave, sem caminhar contra paredes/colisores; sem alterar posição externa ou save.
- Câmera isométrica interna com seguimento suavizado e zoom mais agradável.
- Porta de frente aberta: não cobre mais o personagem no enquadramento.
- Piso de tábuas, estruturas de madeira, acabamentos, janela, lanternas, quadros e decoração.
- InstancedMesh para lotes de caixas estáticas com o mesmo material; geometria compartilhada e materiais reaproveitados dentro da sala.
- Interações E/🔎 e saída F, missões e interiores por bairro preservados.

## Comandos de teste
`npm run test:qa` (26 testes Node.js). Para Android, depois de `npm install`, `npm run android:add` apenas se a pasta Android ainda não existir, e `npm run android:debug`.

## Validação
Testes de sintaxe e regressão Node.js passaram. Renderização WebGL, aparência final, FPS dentro de casas e compilação do APK não testados neste ambiente. O arquivo de diagnóstico do usuário era da zona `world`, por isso seus 51 FPS/694 draw calls/2009 geometrias não são medições do novo interior.

## Checklist visual para o usuário
1. Entrar em Casa do Bosque e andar usando WASD ou analógico.
2. Verificar animação das pernas e dos braços, rotação suave e parada junto aos móveis.
3. Conferir se a porta não cobre mais o personagem e se a câmera enquadra bem.
4. Usar E/🔎 para examinar um móvel e F para sair.
5. Reentrar, testar outras classes e comparar F3 do interior com o exterior.
