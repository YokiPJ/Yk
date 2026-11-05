# HINÁRIA V7.8 — Conversas e casas por botões

Base: HINÁRIA V7.7 (Vilarrubra Clean), mantendo missões, combate, classes, Arsenal, analógico e a vila existente.

## Mudanças reais

- O painel de chat, os campos de texto e os chips `hi/sim/missao` foram removidos da interface.
- Perto de **Bram** ou **Yoki**, aparece **Conversar (F)**. Clique no NPC para ir até ele e abrir o painel ao chegar.
- **Receber missão / Aceitar / Entregar** agora são escolhas com botões; o mesmo `questSystem` mantém passos e recompensas.
- Bram: **Arsenal**, armaduras, nome e trabalho. Yoki: história, tribo, espelho, Replay e habilidades.
- Avisos de combate/missões continuam aparecendo brevemente como notificações, não como chat.
- Perto da porta de uma casa aparece **Entrar (F)**. Há uma cena 3D interna reutilizável com cama, mesa, estante, tapete e baú, movimentação com analógico/WASD e **Sair (F)**. O mundo externo fica intacto e o jogador retorna à mesma posição.
- As casas compartilham modelo interno base com variação de cores e nome. **As casas não têm NPCs internos ainda.**
- Para PC: F para interagir, WASD/setas para mover, Esc para fechar diálogo, B para o Arsenal, J para Diário.
- Para celular: o botão aparece na tela ao aproximar-se; o analógico controla o personagem dentro e fora das casas.

## Instalar no Codespaces

1. Envie `HINARIA_V7_8_BOTOES_E_CASAS_COMPLETA.zip` para `/workspaces/Apk`.
2. Abra o terminal do Codespaces.
3. Execute:

```bash
cd /workspaces/Apk
unzip -o HINARIA_V7_8_BOTOES_E_CASAS_COMPLETA.zip
bash INSTALAR_V78_CODESPACES.sh
```

O script faz backup antes de substituir os arquivos, preserva o projeto nativo `android/` e o ícone, testa o código e tenta compilar.

APK: `HINARIA_V7_ANDROID/APK_GERADO/HINARIA_V7_8_BOTOES_CASAS.apk`.

## Testes e limites

Os testes de unidade cobrem missões, opções de NPC, Arsenal, interiores simulados, controles e navegação. O layout do painel foi inspecionado separadamente em 915x412 (navegador isolado).

**Ainda é necessário testar o jogo 3D real na porta 8000 e no Android.** Este ambiente não tem o pacote Three.js para renderizar o jogo inteiro nem o SDK Android para compilar o APK.

**Fora deste pacote:** reconstrução completa do desenho das ruas/casas (a planta da vila permanece a V7.7); interiores únicos com NPCs; cutscenes de portas; persistência de posição dentro das casas. Este pacote prioriza a mudança pedida: abolir o chat e usar botões.

Identificação visível no HUD: `V7.8 · DIÁLOGOS POR BOTÕES · 31OUT`.
