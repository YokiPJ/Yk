# Validação · Inicialização Beta 2

54 suítes de regressão, 80 módulos, quatro cenários do pacote do PC, dois cenários Android/WebGL e sete testes de falha do bootstrap aprovados.

O ZIP anterior reproduziu o 404 de Three.js sem node_modules. O pacote novo e o patch sobre Beta1 abrem pela raiz, usam bibliotecas locais e entram em partida com movimento real sem erros 404 ou rede externa. O teste usa um servidor estático simples e o servidor Node do projeto.

[Resultados](results.json) · [Extração limpa](source-startup.json) · [APK](apk.json). Testes no Linux/Chromium, sem execução do BAT no Windows nem teste em celular físico.

[Beta 2 publicada](https://github.com/YokiPJ/Yk/releases/tag/v1.3.0-beta.2) · [Patch público conferido](public-patch.json) · [ZIPs finais extraídos e testados](final-source-startup.json).
