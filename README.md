# aprovaJA

Plataforma de questões e acompanhamento de estudos para concursos públicos.
Feita com **React + Vite + TypeScript + Tailwind** no front-end e **Supabase**
(banco de dados Postgres + autenticação) como back-end. Hospedagem 100%
gratuita no **GitHub Pages**.

---

## 1. Crie o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com), faça login e clique em **New project**.
2. Escolha um nome (ex: `aprovaja`), uma senha para o banco (guarde-a) e a região mais próxima (ex: São Paulo).
3. Aguarde o projeto ser criado (leva 1-2 minutos).

## 2. Rode o schema do banco de dados

1. No painel do Supabase, vá em **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/schema.sql` deste projeto, copie **todo o conteúdo** e cole no editor.
3. Clique em **Run**. Isso cria todas as tabelas, as regras de segurança (RLS) e as funções necessárias.

Se der algum erro, quase sempre é porque uma parte já rodou antes — pode rodar o arquivo inteiro de novo em um projeto novo sem problema.

## 3. Pegue as chaves da API

1. No painel do Supabase, vá em **Settings** (ícone de engrenagem) → **API**.
2. Copie a **Project URL** e a chave **anon public**.

## 4. Configure o projeto localmente

Você vai precisar do [Node.js](https://nodejs.org) instalado (versão 18 ou superior).

```bash
# entre na pasta do projeto
cd aprovaja

# instale as dependências
npm install

# copie o arquivo de variáveis de ambiente
cp .env.example .env
```

Abra o arquivo `.env` e preencha com os dados que você copiou no passo 3:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

Para testar localmente:

```bash
npm run dev
```

Acesse `http://localhost:5173`.

## 5. Crie o seu usuário professor

O cadastro público neste app é só para alunos (com código de turma), como você pediu —
você (professor) precisa criar sua conta direto pelo Supabase:

1. No painel do Supabase, vá em **Authentication** → **Users** → **Add user** → **Create new user**.
2. Preencha e-mail e senha, e marque **Auto Confirm User**.
3. Depois, vá em **Table Editor** → tabela `profiles`, encontre a linha desse usuário e mude a coluna `role` de `aluno` para `professor`.
4. Pronto — já dá pra fazer login no app com esse e-mail/senha e cair direto no painel do professor.

## 6. Publique no GitHub Pages

1. Crie um repositório novo no GitHub (ex: `aprovaja`) e suba este código:

```bash
git init
git add .
git commit -m "primeira versão do aprovaJA"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

2. **Importante:** abra `vite.config.ts` e troque `base: '/aprovaja/'` pelo nome exato do seu repositório (ex: se o repo se chama `aprovaja-app`, use `base: '/aprovaja-app/'`).

3. No GitHub, vá em **Settings** → **Pages** do repositório, e em "Build and deployment" escolha **Source: GitHub Actions**.

4. Ainda no GitHub, vá em **Settings** → **Secrets and variables** → **Actions** → **New repository secret** e crie dois segredos:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (com os mesmos valores do seu `.env`)

5. Faça um novo `git push` (ou vá na aba **Actions** do repositório e rode o workflow manualmente). Em alguns minutos o site estará no ar em `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.

A partir daí, todo `git push` na branch `main` publica a versão nova automaticamente.

---

## Como o sistema funciona

- **Professor**: cria turmas (cada uma com um código único gerado automaticamente),
  monta matérias e tópicos, cadastra questões (múltipla escolha ou V/F, avulsas ou
  em grupos com texto-base), monta o cronograma da turma num calendário e cria
  simulados (escolhendo questões manualmente ou sorteando por matéria/tópico).
- **Aluno**: se cadastra com o código da turma, vê o calendário de estudos,
  responde questões livremente pelo banco de questões, e faz os simulados
  com tempo cronometrado.
- **Segurança**: todo o controle de acesso é feito por *Row Level Security*
  no Postgres — um aluno nunca consegue ler dados de outra turma, e um professor
  só vê os alunos das turmas dele, mesmo que alguém tente manipular as
  chamadas no navegador.
- **Encerramento de turma**: o professor pode encerrar uma turma quando o
  concurso passa. Isso bloqueia novas atividades e o acesso dos alunos a ela,
  mas mantém o histórico de desempenho.
- **Exclusão de conta**: é uma "exclusão suave" — a conta fica marcada e a
  pessoa pode recuperá-la fazendo login novamente. Para apagar de fato os
  dados de autenticação (não só marcar), seria necessário criar uma Supabase
  Edge Function com a service role key rodando periodicamente — isso é um
  passo mais avançado, opcional, e não foi incluído aqui pois exige mais
  infraestrutura do que o GitHub Pages sozinho oferece.

## Próximos passos sugeridos (não incluídos ainda)

- Múltiplos professores numa mesma turma pela interface (hoje a tabela já
  suporta isso — `turma_professores` — mas falta a telinha de "convidar
  professor").
- Notificações por e-mail (hoje só existem dentro do próprio app).

---

## Changelog

### Atualização — correções de bugs + gerenciamento de turma + notificações + visão por aluno

**Se você já tinha o projeto rodando, faça nessa ordem:**

1. Rode `supabase/migration_04_correcoes_e_melhorias.sql` no SQL Editor (se ainda não rodou).
2. Rode `supabase/migration_05_notificacoes.sql` no SQL Editor.
3. Substitua as pastas `src` e `supabase` pelas novas.
4. `npm run dev` de novo (sem dependência nova dessa vez).

**O que mudou:**

- **Bug corrigido**: o tópico escolhido ao criar um grupo de questões nunca
  era salvo de verdade (a tabela nem tinha essa coluna) — por isso as
  perguntas do grupo não apareciam ao filtrar por tópico. Corrigido, e a
  migration já tenta recuperar o tópico certo dos grupos que você já criou.
- **Bug corrigido**: o embaralhamento de questões no banco livre do aluno
  era enviesado, fazendo sempre aparecer as mesmas primeiro. Trocado por um
  embaralhamento correto, e agora questões nunca respondidas vêm primeiro,
  as erradas em seguida, e as já dominadas (acertadas recentemente) vão
  pro final — em vez de ficar repetindo sempre a mesma.
- **Notificações para o aluno**: quando o professor encerra uma turma, cada
  aluno recebe um aviso persistente ("Turma encerrada") que aparece assim
  que ele entra no app, mesmo já sem acesso à turma. Ele pode dispensar o
  aviso quando quiser.
- **Gerenciar turma** (nova seção no Cronograma): editar nome da turma, ver
  a lista de alunos matriculados com opção de remover um específico, e
  excluir a turma inteira (com confirmação por nome) para quando foi criada
  por engano. Também dá pra reativar uma turma encerrada sem querer.
- **Turma "vencida"**: se a data final passou mas ninguém clicou em
  encerrar, o sistema já trava a criação de conteúdo novo sozinho e mostra
  um aviso sugerindo encerrar de vez.
- **Nova tela do professor: Alunos** — lista todo mundo matriculado na
  turma com resumo (questões respondidas, taxa de acerto, última
  atividade) e, ao clicar, abre o desempenho detalhado por matéria e o
  progresso no cronograma daquele aluno específico. Essa era a peça que
  faltava desde a ideia original do projeto: acompanhar UM aluno de perto,
  não só a turma como um todo.
- **Questões**: checkbox "só as que precisam de revisão", e o card do
  Painel agora leva direto pra essa lista filtrada.
- Pequenos reforços de tratamento de erro (ex: tela de Desempenho do aluno
  agora mostra uma mensagem clara em vez de ficar em branco se algo falhar).

---

## Changelog

### Atualização — melhorias de professor, aluno e segurança

**Se você já tinha o projeto rodando, faça nessa ordem:**

1. Rode `supabase/migration_01_fix_signup_e_rls.sql` no SQL Editor (se ainda não rodou).
2. Rode `supabase/migration_02_professor_aluno_melhorias.sql` no SQL Editor.
3. Substitua as pastas `src`, `package.json` e `supabase` deste projeto pelas novas.
4. Rode `npm install` de novo (entrou uma biblioteca nova, `recharts`, para os gráficos).

**O que mudou:**

- **Segurança**: aluno sem turma válida agora nunca é criado — é uma trava no banco
  de dados (não só na tela), então nem em caso de erro fica conta "órfã".
- **Painel do professor**: gráfico de barras por matéria e gráfico de evolução do
  aproveitamento nas últimas 8 semanas, além das métricas.
- **Cronograma**: agora aceita um intervalo de dias (ex: dia 1 ao 14) num único
  item, em vez de repetir dia a dia. Campo de título removido — a matéria já
  identifica o item. Calendário maior, com botão "ir para hoje". Também dá
  para editar um item já criado.
- **Matérias**: editar nome da matéria e nome/descrição de um tópico.
- **Questões**: fluxo de "questão avulsa" e "grupo de questões" agora são
  telas separadas. No grupo, você define o texto-base uma vez e vai
  adicionando pergunta após pergunta. Questões (avulsas e de grupo) podem
  ser editadas.
- **Simulados**: dá para editar um simulado já criado (trocar questões,
  título, tempo, data limite).
- **Configurações**: trocar a senha agora exige a senha atual (professor e aluno).
- **Painel do aluno**: redesenhado — calendário maior, cronograma do dia com
  contagem de questões vinculadas, botão de ação "Ir para Questões",
  indicadores (questões respondidas, taxa de acerto, dias consecutivos,
  questões para revisão) e card do último simulado.
- **Nova tela: Desempenho (aluno)**: gráficos de desempenho por matéria e
  evolução diária, com filtro por hoje / 7 dias / 30 dias / período
  personalizado.
- **Telas de Questões e Simulados do aluno** agora mostram uma mensagem clara
  quando ele não está em nenhuma turma, em vez de aparecer vazio sem explicação.
- **Responsividade**: menu lateral vira gaveta no celular, grades reorganizam
  em coluna única em telas pequenas.

---

### Atualização — correções de fluxo do aluno + design profissional

**Se você já tinha o projeto rodando, faça nessa ordem:**

1. Rode `supabase/migration_06_conclusao_por_dia.sql` no SQL Editor.
2. Substitua as pastas `src` e `supabase` pelas novas.
3. Rode `npm install` de novo (entrou uma biblioteca nova: `lucide-react`, pros ícones).
4. `npm run dev`.

**O que mudou:**

- **Bug corrigido**: marcar um dia como concluído num item de cronograma que
  cobre vários dias (ex: dia 1 ao 5) não marca mais os outros dias junto —
  agora cada dia tem sua própria conclusão.
- **Questões do aluno**: agora mostra a matéria e o tópico da questão
  enquanto ele responde, no banco livre.
- **Trava de repetição infinita**: questões vinculadas pelo professor a um
  dia do cronograma agora só podem ser respondidas uma vez — se o aluno sair
  e voltar, vê exatamente a resposta que já deu, sem poder refazer. Um item
  com questões só fica "concluído" depois que TODAS forem respondidas
  (automático, sem checkbox manual). Itens sem questão continuam com
  checkbox manual normal. O banco de questões livre continua permitindo
  responder à vontade, como já era.
- **Bug corrigido**: horário de "disponível até" dos simulados salvando 3h
  adiantado/atrasado (problema clássico de fuso horário no campo de
  data/hora). Também refiz o cronômetro do simulado pra recalcular sempre a
  partir do horário absoluto, em vez de ir descontando segundo a segundo —
  mais preciso mesmo se a aba ficar em segundo plano.
- **Mobile**: corrigido scroll lateral indevido em algumas telas.
- **Visual**: ícones de verdade na navegação, telas de Login/Cadastro
  redesenhadas com painel de marca, cards de métricas com ícone, e uma
  blindagem contra tela branca em caso de erro inesperado.

## Uma recomendação sincera

Tem uma coisa que não é bug nem feature, mas que pode te pegar de surpresa
se você não souber: **projetos gratuitos do Supabase pausam sozinhos depois
de ~7 dias sem nenhum acesso**. Se o professor e o aluno passarem uma semana
de férias sem abrir o app, ele "morre" sozinho — e a mensagem de erro que
aparece não deixa isso óbvio. Basta entrar no painel do Supabase e clicar em
"Restore" quando isso acontecer, mas é bom saber que existe, pra não achar
que quebrou de verdade bem na véspera de uma prova. Se algum dia isso virar
sério (mais de um professor, mais alunos pagando), vale migrar pro plano
pago do Supabase só por causa disso.

---

### Atualização — simulados no estilo de prova real + gestão de cronograma

**Se você já tinha o projeto rodando, faça nessa ordem:**

1. Rode `supabase/migration_07_sincronizar_relogio.sql` no SQL Editor.
2. Substitua as pastas `src` e `supabase` pelas novas.
3. Não precisa de `npm install` dessa vez (nenhuma dependência nova).

**O que mudou:**

- **Bug corrigido de vez**: o cronômetro do simulado sempre mostrava um
  pouco mais de tempo do que o configurado. A causa era confiar no relógio
  do computador do aluno, que pode estar dessincronizado. Agora o app
  sincroniza com o relógio do servidor assim que o simulado começa.
- **Simulado com cara de prova de concurso de verdade**: as questões agora
  aparecem agrupadas por matéria, com um título centralizado separando cada
  seção — e o professor escolhe a ordem das matérias (com setas ↑↓), pra
  seguir a ordem oficial do edital.
- **Grade de progresso**: durante o simulado, uma grade de quadradinhos
  numerados mostra em verde quais questões já foram respondidas — clicar
  num número leva direto pra aquela questão.
- **Resultados do simulado**: o professor agora vê, pra cada aluno que
  fez o simulado, o percentual de acerto e pode abrir o detalhe
  questão por questão (o que respondeu, se acertou, qual era a certa). O
  aluno também tem essa mesma visão de detalhe no resultado dele.
- **Cronograma**: agora dá pra adicionar, sortear e remover questões de uma
  atividade tanto na criação quanto na edição — igual já funcionava nos
  simulados.
- **Questões avulsas**: depois de salvar uma, a tela continua com a matéria
  e o tópico preenchidos, pronta pra cadastrar a próxima em sequência (bom
  pra quem vai digitar um lote grande de questões de uma vez).

---

### Atualização — funcionalidades pendentes + repaginação visual completa

**Se você já tinha o projeto rodando, faça nessa ordem:**

1. Rode `supabase/migration_08_pausar_cronometro.sql` no SQL Editor.
2. Substitua **todo o projeto** (não só `src`/`supabase`) — o `tailwind.config.js` também mudou. Mais seguro: baixe o zip inteiro e substitua tudo, exceto o seu `.env`.
3. Não precisa de `npm install` (nenhuma dependência nova).

**O que mudou:**

- **Cronômetro do simulado agora pausa de verdade**: só conta o tempo em
  que o aluno está ativamente na tela. Se ele sair (ou sumir por um mês),
  o tempo fica congelado exatamente onde parou até ele voltar e continuar.
- **Painel do aluno avisa sobre simulados pendentes**: agora aparece um
  aviso destacado no topo assim que entra — "você tem um simulado pra
  fazer" ou "pausado, continue" — em vez de só mostrar depois de concluído.
- **Desempenho por tópico**: no painel de Desempenho do aluno, clicar numa
  barra de matéria agora abre o detalhamento por tópico dentro dela —
  mostra exatamente onde ele está errando mais.
- **Repaginação visual completa**: nova paleta e sombras mais suaves,
  cantos mais arredondados, sidebar com gradiente e avatar de iniciais,
  cards com ícone em círculo, tipografia mais consistente em todas as
  telas. Criei um pequeno sistema de design (`src/components/ui`) pra
  manter tudo com a mesma cara daqui pra frente.
