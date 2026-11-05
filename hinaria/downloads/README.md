# Arquivos compilados

- `HINARIA_MODELOS_CORRIGIDOS_1.2.1_DEBUG.apk`: aplicativo Android debug compilado com o código integrado.
- `HinariaMotion.jar`: gerador Java, executável com `java -jar HinariaMotion.jar --out output` em JDK 17+.
- `SHA256SUMS.txt`: hashes dos dois arquivos compilados.

Execute `npm start` na raiz e acesse `http://localhost:8080/studio/` para usar os botões de download HTTP. O visualizador de arquivos do ambiente não executa APKs nem JARs.

Para reconstruir: `npm run build:animations` e `npm run build:android`, na raiz do repositório. Requisitos no README principal.
