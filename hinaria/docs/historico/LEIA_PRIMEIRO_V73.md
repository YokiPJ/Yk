# HINÁRIA V7.3 — RECUPERAÇÃO COMPLETA

Este pacote reúne, em um único conjunto coerente, o Arsenal com 16 armas, correção das etiquetas/HP, analógico e Vilarrubra da V7. Não é um patch parcial.

**Não misture arquivos manualmente** nem extraia sobre o projeto antigo. Use o instalador `INSTALAR_V73_CODESPACES.sh` que acompanha o ZIP (na raiz do ZIP, fora desta pasta). Ele renomeia a pasta do projeto antigo como backup e copia esta versão limpa, preservando a pasta Android (Gradle, SDK e ícones), depois compila.

O marcador visual desta compilação é **V7.3 · BUILD LIMPA · 31OUT**.

O projeto ainda precisa de `npm install` e da compilação Android no Codespaces; o ZIP não contém APK nem Android SDK.

Testes locais cobriram arsenal, joystick, etiquetas, animações, missões, Vila, importações e sintaxe. Teste visual real no Android ainda precisa ser feito.

## Ícone personalizado

A imagem específica da Hinata ainda NÃO foi incluída, pois ela não foi anexada como imagem original separada. Não inventamos ícone. O projeto Android existente tem o ícone preservado; para trocar pela imagem fornecida, salve um PNG quadrado de 512x512 como `/workspaces/Apk/ICONE_HINATA.png`, e execute `node tools/apply-custom-icon.mjs /workspaces/Apk/ICONE_HINATA.png` dentro da pasta HINARIA_V7_ANDROID antes de compilar. Isso substitui o ícone no projeto Android existente.
