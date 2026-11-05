# HINÁRIA 1.1.0 — Casas avançadas + balanceamento (base 96×96)

## Correções
- Remove a cópia de `userData` cíclico ao entrar em casas. A representação visual do jogador usa malhas compartilhadas sem copiar dados de gameplay.
- Mais decoração temática em taverna, capela, ferraria/oficina, Cabana Abandonada e outras casas.
- E para inspecionar móveis, botão touch Examinar, F (ou botão de interação) para sair. Não concede loot, XP ou recompensas duplicadas.
- Colisão com camas, mesas, baús e móveis temáticos; movimento com delta limitado.
- Ajuste leve das quatro classes; curva de crescimento de HP e dano de monstros reduzida nos níveis altos, bosses ainda fortes; ratos nível 1 preservados.
- Cadência levemente ajustada para ataques manuais fora do combo do Cavaleiro.

## Segurança
- Compatível com a base HINARIA_1_1_0_MAPA_96_VITORIA.
- Não altera IDs de armas, habilidades, missões, músicas, terrenos, cutscenes ou o modelo do rato.
- Na instalação sobre base diferente, o instalador recusa alterar arquivos.

## Validação
- Verificações de sintaxe e testes de módulos. Não houve teste gráfico real em Chrome/Android nem compilação de APK.
- O equilíbrio é uma proposta inicial, ainda sujeita a playtest.

## Build Codespaces (ZIP completo)
```
cd /workspaces/Apk
unzip -o HINARIA_110_CASAS_AVANCADAS_BALANCE_COMPLETA.zip
cd HINARIA_1_1_0_CASAS_AVANCADAS_BALANCE
npm install
# se ainda não houver pasta android: npm run android:add
npm run android:debug
```

## Patch, sem substituir o projeto inteiro
```
cd /workspaces/Apk
unzip -o HINARIA_110_CASAS_AVANCADAS_BALANCE_PATCH.zip
python3 HINARIA_CASAS_BALANCE_PATCH/INSTALAR.py HINARIA_1_1_0_MAPA_96_VITORIA
```
