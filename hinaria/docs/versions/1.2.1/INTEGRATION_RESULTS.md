# Verificação da integração 1.2.1

Resultados locais medidos após reunir o jogo e os laboratórios no projeto original:

| Verificação | Resultado |
| --- | --- |
| Regressões do jogo | 44/44 aprovadas |
| Imports e pacote | 72 módulos JS com imports resolvidos; assets e configuração Android presentes |
| URLs do projeto e build offline | Quatro HTMLs, seis imagens, jogo, redirects, HEAD, downloads e bloqueio de caminhos privados aprovados |
| Laboratório 2D | 32/32 animações; controles, layout mobile e exportação HTML aprovados |
| Laboratório 3D | 12/12 cenas; câmera, recursos GPU, PNG, HTML, mobile e perda de contexto aprovados |
| Java: dados | 70 clipes; quaternions normalizados, loops contínuos, buffers válidos e quatro erros de CLI tratados |
| Java: execução independente | JAR reproduziu os sete GLBs byte a byte fora da pasta do projeto |
| Java: glTF Validator | Sete GLBs com zero erros e zero warnings |
| Java: navegador | 70/70 combinações modelo/clipe importadas e renderizadas pelo GLTFLoader oficial |
| Comparativo dos modelos | 84/84 combinações de modelo/pose, oito combinações de equipamento/armadura e mobile aprovados |
| Portal do projeto | Desktop e 390×844; seis imagens carregadas; download do APK pelo navegador com SHA256 idêntico |
| Jogo offline no navegador | 9/9 cenários: desktop, cinco resoluções, toque, compatibilidade e fallback gráfico |
| Android | Gradle `assembleDebug` concluído; APK 1.2.1, código 3, pacote `br.com.hinaria.rpg` |
| Conteúdo real do APK | 219 arquivos conferidos pelo manifesto SHA256; inclui os 72 módulos JS e o Studio atual |

Build web: `1.2.1-projeto-integrado`, fingerprint `6416e6fbf41e`.

APK: `downloads/HINARIA_MODELOS_CORRIGIDOS_1.2.1_DEBUG.apk`, 29.775.554 bytes.

SHA256 do APK: `7cd72c17c40e18842d7cd518ed778f20cfbc9e9bf0ee0c9933ea4944b1a99c5a`.

Certificado debug SHA256: `9cdb501eedf49aad4fc660d4571a98f6b0bbdb718e702c3c725e0aa0f47750af`, igual ao usado anteriormente neste ambiente.

Os hashes do APK e do JAR ficam em `downloads/SHA256SUMS.txt` e são atualizados pelos comandos de build. A conferência do APK usa Node/fflate, sem exigir `unzip` externo. Os relatórios e capturas desta integração ficam em `MODELOS_QA/integration/`.

Os testes gráficos usaram Chromium headless e SwiftShader. As verificações mobile usam toque e viewport emulados. Não houve teste em aparelho Android físico nem execução em uma máquina Windows; os scripts de montagem e verificação foram preparados para resolver caminhos de forma portátil. O workflow do GitHub está incluído; estes resultados se referem às execuções locais, não à execução remota do workflow.
