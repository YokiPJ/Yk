# HINÁRIA — Machado do Replay / Yoki jogável

## Como usar
1. Na seleção de classe, escolha **Yoki** (novo personagem jogável) ou qualquer outra classe.
2. Abra **Menu > Arsenal > Armas**. O **Machado do Replay** da classe está liberado gratuitamente nesta versão de teste.
3. Equipe o machado. Ele substitui a arma anterior no modelo; não existe alvo automático.
4. Em combate, pressione **R** (ou **🔥 Despertar** no celular).
5. Gaste **1% da mana máxima (arredondado para cima, mínimo 1 ponto)** e acerte com **J/Espaço** ou **⚔ Golpe**.
6. A carga dura **12 s**, tem **26 s** de recarga contada desde a ativação, e cada poder só ativa no acerto em intervalos de **1,8 s**.

## Poderes conforme o portador
- **Yoki**: **Machado Explosivo Flamejante** — explosão curta, dano em área e queimadura (sua magia do D&D).
- **Cavaleiro**: **Ruptura de Ferro** — atordoa o inimigo atingido.
- **Paladino**: **Julgamento da Aurora** — golpe com recuperação moderada de vida.
- **Feiticeiro**: **Estilhaço Rúnico** — onda arcana curta em torno do alvo.
- **Druida**: **Raízes da Memória** — lentidão e recuperação de vida.

Os poderes são diferentes conforme a classe e não são sorteados a cada golpe. O Yoki também permanece NPC para as missões existentes; nesta versão a opção jogável representa o mesmo herói para testes de gameplay.

## Preservação
- O rato, mapa, casas, missões e cutscenes originais não foram modificados.
- O progresso do Arsenal continua na chave `hinaria.v7.arsenal.v1`. O machado é acrescentado sem apagar as armas já compradas.
- Cada classe possui uma variante de identificação do machado, mas é o mesmo conceito de artefato vinculado ao portador.
- A ativação não funciona durante casas, diálogo, seleção de classe ou cutscenes.
- A animação é reutilizada do combatente existente; visual ainda precisa de validação no navegador/Android.

## Testar
`npm run test:qa` após extrair a pasta; o teste `test_machado_replay.mjs` cobre mana, recarga e poderes.
O APK exige dependências Android e `npm run android:debug` no Codespaces.
