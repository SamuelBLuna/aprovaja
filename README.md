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

- Edição de questões já criadas (hoje dá pra criar e excluir, mas não editar).
- Múltiplos professores numa mesma turma pela interface (hoje a tabela já
  suporta isso — `turma_professores` — mas falta a telinha de "convidar
  professor").
- Gráficos de evolução ao longo do tempo (hoje o painel mostra o retrato
  atual, não a evolução histórica).
- Notificações por e-mail quando o professor adiciona algo novo no cronograma.
