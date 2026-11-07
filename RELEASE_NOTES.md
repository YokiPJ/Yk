## HINÁRIA 1.3.0 Beta 3 · Alvo automático

Ao tocar **Atacar** ou apertar **J/Espaço**, o personagem vira automaticamente para o inimigo vivo mais próximo dentro do alcance e golpeia. Funciona nas cinco classes, com espadas, arcos, cajados e o Machado do Replay.

### Combate

- Seleção em 360 graus, inclusive atrás e ao lado; paredes, mortos, NPCs e modelos ocultos são ignorados.
- Um alvo por golpe do combo do Cavaleiro. O próximo golpe escolhe novamente; o comando antecipado não troca a vítima do golpe atual.
- O impacto confirma alcance e linha de visão. Se a vítima morrer, desaparecer ou fugir antes do impacto, busca outro inimigo válido.
- Movimento livre durante o golpe e direção da esquiva preservada.
- Flechas, magias, efeitos, dano, recargas e poderes do machado mantêm seus sistemas existentes.
- Saves compatíveis, Parte II e correções de inicialização das betas anteriores incluídos.

### Baixar e executar

- **HINARIA_1.3.0_BETA3_DEBUG.apk**: Android, versão 1.3.0-beta.3, código 8.
- **HINARIA_ALVO_AUTOMATICO_1.3.0-beta.3.zip**: atualização para o projeto da Beta 2. Feche o servidor, extraia sobre a pasta que contém INICIAR_PROJETO.bat, substitua os arquivos e execute o inicializador.
- **HINARIA_PROJETO_1.3.0-beta.3.zip**: projeto completo, incluindo as bibliotecas locais. Extraia e abra INICIAR_PROJETO.bat (Windows) ou INICIAR_PROJETO.sh (Linux/macOS). Requer Node.js 22+.
- **HinariaMotion.jar**, **MOBILE_TEST_RESULTS.json** e **SHA256SUMS.txt**: ferramenta Java independente, validação e integridade.

O jogo mantém os saves na mesma origem/porta do navegador. O APK usa o mesmo certificado debug das betas anteriores.

### Verificar

Aproxime-se de um inimigo, vire de costas e toque Atacar. O personagem deve virar e acertar. Repita com um obstáculo entre os dois ou fora do alcance: o golpe não deve atingir a vítima. Parar de apertar deve encerrar os ataques. Consulte os testes e seus limites em MOBILE_TEST_RESULTS.json.

Pré-release de testes. A versão 1.2.2 permanece como estável. Os testes gráficos usam Chromium/SwiftShader com toque emulado no Linux; não houve execução em celular físico ou do BAT no Windows.

### Cenários de Hinária

![Vilarrubra — imagem principal](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.3/01-vilarrubra.png)

| Ponte Velha | Clareira |
| --- | --- |
| ![Ponte Velha](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.3/02-ponte-velha.png) | ![Clareira](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.3/03-clareira.png) |

| Ruínas de Ardu | Caverna Sombria | Acampamento |
| --- | --- | --- |
| ![Ruínas de Ardu](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.3/04-ruinas-ardu.png) | ![Caverna Sombria](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.3/05-caverna-sombria.png) | ![Acampamento](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.3/06-acampamento.png) |

<!-- hinaria-release:v1.3.0-beta.3:aadd9b16e74acc939833c93e3a26203dd5baf3ca -->
