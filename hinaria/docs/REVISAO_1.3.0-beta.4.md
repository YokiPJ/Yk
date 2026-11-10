# Revisão geral · HINÁRIA 1.3.0 Beta 4

A revisão parte da Beta 3 publicada, sem mudanças remotas adicionais no início da tarefa. Foram examinados inicialização, identidade do APK, controles, combate, recursos, persistência, missões das duas partes, geração procedural, interiores, modelos/equipamentos, áudio e orçamento gráfico mobile.

## Falhas corrigidas

| Problema reproduzido | Comportamento corrigido | Verificação |
| --- | --- | --- |
| A preferência de música contendo JSON `null` impedia a importação do jogo. | Valores que não são objetos usam as preferências padrão; a inicialização continua. | Boot real com a chave contendo `null`; formatos inválidos em Node. |
| Novos personagens herdavam os recursos iniciais do Cavaleiro ao escolher outra classe. | A criação de uma aventura completa vida e mana da classe selecionada uma única vez. Editar uma aventura existente preserva seus recursos. | Feiticeiro novo com mana completa e edição posterior sem cura. |
| Replay após trocar de classe podia produzir 96/60 de vida e impedir o save. | A cura respeita a vida máxima atual, mantendo o custo e a recarga do Replay. | Histórico explícito de outra classe, habilidade pela tecla 4 e save real. |
| Soltar um botão depois de mais de 650 ms podia executar uma segunda ação. | O pointerdown executa o comando; o click do mesmo gesto é descartado independentemente da duração. Clicks de teclado e acessibilidade continuam aceitos. | Toque prolongado via CDP e handlers de produção em Node. |
| O combo do Cavaleiro ignorava a recarga restante de uma arma anterior. | O primeiro golpe só começa depois da recarga; a fila dos golpes seguintes continua funcionando. | Bridge/FSM reais e ataque pelo botão com uma recarga restante. |
| A amostragem da linha de visão permitia tiros e golpes por cantos fechados; a IA não conferia obstáculos ao golpear. | A consulta percorre as células da grade e os lados dos cantos. Inimigos também confirmam linha de visão antes de causar dano. | 800 segmentos contra uma análise independente de caixas, nos dois sentidos; inimigo real bloqueado e depois liberado. |
| Atordoados ainda terminavam o deslocamento até a próxima célula. | A movimentação para imediatamente e retoma depois do efeito. | Inimigo em movimento entre células, antes e depois do fim do stun. |
| Um save com etapa de missão inexistente podia carregar descartando a missão. | A definição da missão é validada antes de alterar o mundo; um backup válido é recuperado quando o principal é incompatível. A leitura legada isolada continua tolerante. | Save completo, backup e progresso parcial de missão preservado. |
| Saves antigos sem campos opcionais herdavam poderes, efeitos e equipamentos da sessão posterior. | Campos ausentes recebem valores iniciais seguros. Campos presentes continuam sendo restaurados. | Carregamento após aplicar buffs, Replay e recargas em outra sessão. |
| O desconto de ouro na morte usava deslocamento de bits: 3 bilhões podiam virar mais de 3,3 bilhões. | A penalidade continua em 25%, usando divisão e arredondamento sem overflow de 32 bits. | Morte por ataque real de inimigo e caso de ouro pequeno preservado. |

## Cobertura

Os 56 testes anteriores passaram antes das alterações. A revisão acrescenta duas suítes e amplia casos de combate, fluxo e saves. A geração lógica é verificada em 128 sementes, com rotas, portas, marcos, baús, rios, pontes e capacidade dos encontros da Parte II. A validação de imports usa os 81 módulos do jogo.

Os cenários de navegador usam o jogo original e sua build mobile: título, cinco classes/layouts, joystick com multitouch, menus, pausa, salvar/carregar, NPCs, interiores, chefes, as três missões da Parte II e os casos específicos desta revisão. Fixtures de teleporte, HP, histórico, armazenamento e obstáculos são declaradas nos respectivos scripts. Dano, projéteis, missões e recompensas continuam usando a implementação de produção.

O relatório final e as evidências ficam em [qa/1.3.0-beta.4/results.json](qa/1.3.0-beta.4/results.json). WebGL1, falhas induzidas de inicialização, pacote offline, assinatura e identidade Android são verificados separadamente.

## Executar

```bash
npm run setup
npm run game
npm run verify
npm run build:mobile
cd hinaria
CHROMIUM_PATH=/usr/bin/chromium node tools/test-review-browser.mjs --offline
```

`CHROMIUM_PATH` é opcional quando o Chromium do Playwright está instalado. Android exige JDK 21 e SDK 35; use `npm run build:android` na raiz.

Os testes gráficos usam Chromium/SwiftShader no Linux, com toque e falhas de compatibilidade simulados. Não houve execução em celular físico nem campanha manual completa. As medições de renderização descrevem esse ambiente e não representam FPS de um telefone.
