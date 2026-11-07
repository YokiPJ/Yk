# HINÁRIA 1.3.0 Beta 2

Esta atualização corrige a entrada do projeto no PC e preserva a Parte II e as otimizações da [Beta 1](MOBILE_1.3.0-beta.1.md).

O ZIP completo e o patch incluem os quatro módulos de execução fixados pelo lockfile e suas licenças. A raiz encaminha para `hinaria/` em servidores estáticos. O servidor Node aceita as bibliotecas locais do ZIP e só consulta node_modules quando necessário. Os inicializadores verificam os arquivos exigidos e abrem o navegador depois de o servidor conseguir iniciar.

Para atualizar a Beta 1, feche o servidor anterior, extraia o patch na pasta que contém `INICIAR_PROJETO.bat`, substitua os arquivos e execute esse inicializador. Use a mesma porta/origem do navegador para continuar acessando seus saves.

A validação usa ZIPs extraídos em pastas novas sem node_modules: servidor estático pela raiz, servidor Node e patch sobre a Beta 1. Além da inicialização, verifica movimento real, bibliotecas locais, ausência de requests externos/404 e falha clara em instalações incompletas.

[Resultados](qa/1.3.0-beta.2/results.json). Os testes de navegador são executados em Chromium/SwiftShader no Linux; o BAT não foi executado no Windows e não houve teste em celular físico.
