-- =====================================================================
-- APROVAJA — SCHEMA COMPLETO DO BANCO (Supabase / Postgres)
-- Rode este arquivo inteiro em: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

create extension if not exists "pgcrypto";

-- =====================================================================
-- ENUMS
-- =====================================================================
create type public.user_role as enum ('professor', 'aluno');
create type public.turma_status as enum ('ativa', 'encerrada');
create type public.questao_tipo as enum ('multipla_escolha', 'verdadeiro_falso');

-- =====================================================================
-- PROFILES — estende auth.users com nome, papel (role), etc.
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  role public.user_role not null default 'aluno',
  avatar_url text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Cria o profile automaticamente quando alguém se cadastra. Se for aluno,
-- EXIGE um código de turma válido nos metadados — sem ele, a criação
-- inteira do usuário é revertida (não existe aluno "órfão" sem turma).
-- Ao criar um professor manualmente pelo painel do Supabase, sempre
-- preencha "User Metadata" com {"role": "professor", "nome": "..."}.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role public.user_role;
  v_turma_id uuid;
  v_status public.turma_status;
  v_data_fim date;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'aluno');

  insert into public.profiles (id, nome, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    v_role
  );

  if v_role = 'aluno' then
    if not (new.raw_user_meta_data ? 'codigo_turma') or trim(new.raw_user_meta_data->>'codigo_turma') = '' then
      raise exception 'Cadastro de aluno requer um código de turma válido.';
    end if;

    select id, status, data_fim into v_turma_id, v_status, v_data_fim
    from public.turmas
    where upper(codigo_turma) = upper(new.raw_user_meta_data->>'codigo_turma');

    if v_turma_id is null or v_status <> 'ativa' or v_data_fim < current_date then
      raise exception 'Código de turma inválido ou turma encerrada.';
    end if;

    insert into public.turma_alunos (turma_id, aluno_id) values (v_turma_id, new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- TURMAS
-- =====================================================================
create table public.turmas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_turma text not null unique,
  data_inicio date not null,
  data_fim date not null,
  status public.turma_status not null default 'ativa',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 1 turma pode ter vários professores
create table public.turma_professores (
  turma_id uuid not null references public.turmas(id) on delete cascade,
  professor_id uuid not null references public.profiles(id) on delete cascade,
  primary key (turma_id, professor_id)
);

-- 1 aluno pode estar em várias turmas
create table public.turma_alunos (
  turma_id uuid not null references public.turmas(id) on delete cascade,
  aluno_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (turma_id, aluno_id)
);

-- =====================================================================
-- MATÉRIAS / TÓPICOS (banco de conteúdo do professor)
-- =====================================================================
create table public.materias (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  cor text not null default '#1B2A4A',
  created_at timestamptz not null default now()
);

create table public.topicos (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references public.materias(id) on delete cascade,
  nome text not null,
  descricao text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- GRUPOS DE QUESTÕES (texto-base / estudo de caso -> várias questões)
-- =====================================================================
create table public.grupos_questoes (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  materia_id uuid references public.materias(id) on delete set null,
  topico_id uuid references public.topicos(id) on delete set null,
  titulo text not null,
  texto_base text not null,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- QUESTÕES
-- =====================================================================
create table public.questoes (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  materia_id uuid not null references public.materias(id) on delete cascade,
  topico_id uuid references public.topicos(id) on delete set null,
  grupo_id uuid references public.grupos_questoes(id) on delete set null,
  tipo public.questao_tipo not null,
  enunciado text not null,
  alternativas jsonb, -- [{"id":"A","texto":"..."}, ...] — null quando for V/F
  resposta_correta text not null, -- 'A'..'E' ou 'V'/'F'
  explicacao text,
  nivel_dificuldade smallint not null default 2, -- 1 fácil, 2 médio, 3 difícil
  precisa_revisao boolean not null default false,
  created_at timestamptz not null default now()
);

create index questoes_materia_idx on public.questoes (materia_id);
create index questoes_topico_idx on public.questoes (topico_id);
create index questoes_professor_idx on public.questoes (professor_id);

-- =====================================================================
-- CRONOGRAMA (calendário de estudos da turma)
-- =====================================================================
create table public.cronograma_itens (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  data_inicio date not null,
  data_fim date not null,
  titulo text, -- opcional: se vazio, a interface usa o nome da matéria
  descricao text,
  materia_id uuid references public.materias(id) on delete set null,
  topico_id uuid references public.topicos(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint cronograma_datas_validas check (data_fim >= data_inicio)
);

create index cronograma_turma_datas_idx on public.cronograma_itens (turma_id, data_inicio, data_fim);

create table public.cronograma_questoes (
  cronograma_id uuid not null references public.cronograma_itens(id) on delete cascade,
  questao_id uuid not null references public.questoes(id) on delete cascade,
  primary key (cronograma_id, questao_id)
);

-- aluno marca o item do dia como concluído
create table public.cronograma_conclusoes (
  cronograma_id uuid not null references public.cronograma_itens(id) on delete cascade,
  aluno_id uuid not null references public.profiles(id) on delete cascade,
  data date not null, -- o dia específico marcado (um item pode cobrir vários dias)
  concluido_em timestamptz not null default now(),
  primary key (cronograma_id, aluno_id, data)
);

-- =====================================================================
-- SIMULADOS
-- =====================================================================
create table public.simulados (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  professor_id uuid not null references public.profiles(id) on delete cascade,
  titulo text not null,
  descricao text,
  data_disponivel timestamptz not null default now(),
  data_limite timestamptz,
  tempo_limite_minutos int not null default 60,
  created_at timestamptz not null default now()
);

create table public.simulado_questoes (
  simulado_id uuid not null references public.simulados(id) on delete cascade,
  questao_id uuid not null references public.questoes(id) on delete cascade,
  ordem int not null default 0,
  primary key (simulado_id, questao_id)
);

create table public.simulado_tentativas (
  id uuid primary key default gen_random_uuid(),
  simulado_id uuid not null references public.simulados(id) on delete cascade,
  aluno_id uuid not null references public.profiles(id) on delete cascade,
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  tempo_total_segundos int,
  tempo_usado_segundos int not null default 0, -- só o tempo ATIVO na tela (pausa quando o aluno sai)
  acertos int not null default 0,
  erros int not null default 0
);

create unique index simulado_tentativa_unica on public.simulado_tentativas (simulado_id, aluno_id);

-- =====================================================================
-- RESPOSTAS (banco de questões livre + respostas de simulado)
-- =====================================================================
create table public.respostas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.profiles(id) on delete cascade,
  questao_id uuid not null references public.questoes(id) on delete cascade,
  turma_id uuid references public.turmas(id) on delete set null,
  tentativa_id uuid references public.simulado_tentativas(id) on delete cascade,
  resposta_dada text not null,
  correta boolean not null,
  tempo_gasto_segundos int,
  created_at timestamptz not null default now()
);

create index respostas_aluno_idx on public.respostas (aluno_id);
create index respostas_questao_idx on public.respostas (questao_id);
create index respostas_turma_idx on public.respostas (turma_id);

-- =====================================================================
-- NOTIFICAÇÕES (avisos persistentes pro aluno, ex: turma encerrada)
-- =====================================================================
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.profiles(id) on delete cascade,
  titulo text not null,
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- FUNÇÕES AUXILIARES (usadas nas policies de RLS)
-- =====================================================================
create or replace function public.is_professor_da_turma(t_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.turma_professores tp
    where tp.turma_id = t_id and tp.professor_id = auth.uid()
  ) or exists (
    select 1 from public.turmas t where t.id = t_id and t.created_by = auth.uid()
  );
$$;

create or replace function public.is_aluno_da_turma(t_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.turma_alunos ta
    where ta.turma_id = t_id and ta.aluno_id = auth.uid()
  );
$$;

create or replace function public.get_my_role()
returns public.user_role language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- valida um código de turma publicamente, sem expor a tabela turmas inteira
-- (usado na tela de cadastro, antes de criar a conta)
create or replace function public.validar_codigo_turma(p_codigo text)
returns table(turma_id uuid, nome text)
language sql security definer stable as $$
  select id, nome from public.turmas
  where upper(codigo_turma) = upper(p_codigo)
    and status = 'ativa'
    and data_fim >= current_date;
$$;

grant execute on function public.validar_codigo_turma(text) to anon, authenticated;

-- verifica se o ALUNO logado tem acesso ao conteúdo de um determinado professor
-- (via alguma turma em comum) — usado nas policies de materias/topicos/questoes
create or replace function public.aluno_tem_acesso_ao_professor(p_professor_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.turma_alunos ta
    where ta.aluno_id = auth.uid()
    and (
      exists (select 1 from public.turma_professores tp where tp.turma_id = ta.turma_id and tp.professor_id = p_professor_id)
      or exists (select 1 from public.turmas t where t.id = ta.turma_id and t.created_by = p_professor_id)
    )
  );
$$;

-- aluno "atende" um código de turma pra entrar em uma turma ADICIONAL depois de já logado
-- (para o cadastro inicial, veja o gatilho handle_new_user + validar_codigo_turma acima)
create or replace function public.entrar_na_turma(p_codigo text)
returns uuid language plpgsql security definer as $$
declare
  v_turma_id uuid;
  v_status public.turma_status;
  v_data_fim date;
begin
  select id, status, data_fim into v_turma_id, v_status, v_data_fim
  from public.turmas where upper(codigo_turma) = upper(p_codigo);

  if v_turma_id is null then
    raise exception 'Código de turma inválido';
  end if;

  if v_status <> 'ativa' or v_data_fim < current_date then
    raise exception 'Esta turma já foi encerrada';
  end if;

  insert into public.turma_alunos (turma_id, aluno_id)
  values (v_turma_id, auth.uid())
  on conflict do nothing;

  return v_turma_id;
end;
$$;

-- professor encerra a turma: avisa cada aluno (notificação persistente),
-- desvincula todos de fato e bloqueia novas atividades, mas mantém o
-- histórico de respostas/tentativas
create or replace function public.encerrar_turma(p_turma_id uuid)
returns void language plpgsql security definer as $$
declare
  v_nome_turma text;
begin
  if not public.is_professor_da_turma(p_turma_id) then
    raise exception 'Sem permissão para encerrar esta turma';
  end if;

  select nome into v_nome_turma from public.turmas where id = p_turma_id;

  insert into public.notificacoes (aluno_id, titulo, mensagem)
  select aluno_id, 'Turma encerrada',
    'Sua turma "' || v_nome_turma || '" foi encerrada pelo professor. Seu histórico de desempenho continua disponível em Desempenho, mas o cronograma e os simulados dessa turma não estarão mais acessíveis.'
  from public.turma_alunos where turma_id = p_turma_id;

  update public.turmas set status = 'encerrada' where id = p_turma_id;
  delete from public.turma_alunos where turma_id = p_turma_id;
end;
$$;

-- a turma está ativa? também considera "vencida" (passou da data_fim) como
-- inativa, mesmo que o professor tenha esquecido de clicar em Encerrar
create or replace function public.turma_esta_ativa(t_id uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.turmas where id = t_id and status = 'ativa' and data_fim >= current_date);
$$;

-- professor reativa uma turma encerrada por engano (não recoloca os
-- alunos removidos automaticamente — eles precisam usar o código de novo)
create or replace function public.reativar_turma(p_turma_id uuid)
returns void language plpgsql security definer as $$
begin
  if not public.is_professor_da_turma(p_turma_id) then
    raise exception 'Sem permissão para reativar esta turma';
  end if;
  update public.turmas set status = 'ativa' where id = p_turma_id;
end;
$$;

-- aluno solicita exclusão da própria conta (soft delete, recuperável)
create or replace function public.solicitar_exclusao_conta()
returns void language sql security definer as $$
  update public.profiles set deleted_at = now() where id = auth.uid();
$$;

create or replace function public.cancelar_exclusao_conta()
returns void language sql security definer as $$
  update public.profiles set deleted_at = null where id = auth.uid();
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.turmas enable row level security;
alter table public.turma_professores enable row level security;
alter table public.turma_alunos enable row level security;
alter table public.materias enable row level security;
alter table public.topicos enable row level security;
alter table public.grupos_questoes enable row level security;
alter table public.questoes enable row level security;
alter table public.cronograma_itens enable row level security;
alter table public.cronograma_questoes enable row level security;
alter table public.cronograma_conclusoes enable row level security;
alter table public.simulados enable row level security;
alter table public.simulado_questoes enable row level security;
alter table public.simulado_tentativas enable row level security;
alter table public.respostas enable row level security;
alter table public.notificacoes enable row level security;

-- ---------- profiles ----------
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_select_related" on public.profiles for select using (
  exists (
    select 1 from public.turma_alunos ta
    where ta.aluno_id = profiles.id and public.is_professor_da_turma(ta.turma_id)
  )
);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- ---------- turmas ----------
create policy "turmas_select" on public.turmas for select using (
  created_by = auth.uid() or public.is_professor_da_turma(id) or public.is_aluno_da_turma(id)
);
create policy "turmas_insert" on public.turmas for insert with check (
  created_by = auth.uid() and public.get_my_role() = 'professor'
);
create policy "turmas_update" on public.turmas for update using (public.is_professor_da_turma(id));
create policy "turmas_delete" on public.turmas for delete using (created_by = auth.uid());

-- ---------- turma_professores ----------
create policy "tp_select" on public.turma_professores for select using (
  professor_id = auth.uid() or public.is_professor_da_turma(turma_id)
);
create policy "tp_insert" on public.turma_professores for insert with check (public.is_professor_da_turma(turma_id));
create policy "tp_delete" on public.turma_professores for delete using (public.is_professor_da_turma(turma_id));

-- ---------- turma_alunos ----------
create policy "ta_select" on public.turma_alunos for select using (
  aluno_id = auth.uid() or public.is_professor_da_turma(turma_id)
);
create policy "ta_insert_self" on public.turma_alunos for insert with check (aluno_id = auth.uid());
create policy "ta_delete" on public.turma_alunos for delete using (
  public.is_professor_da_turma(turma_id) or aluno_id = auth.uid()
);

-- ---------- materias ----------
create policy "materias_professor_all" on public.materias for all using (professor_id = auth.uid());
create policy "materias_aluno_select" on public.materias for select using (
  public.aluno_tem_acesso_ao_professor(materias.professor_id)
);

-- ---------- topicos ----------
create policy "topicos_professor_all" on public.topicos for all using (
  exists (select 1 from public.materias m where m.id = topicos.materia_id and m.professor_id = auth.uid())
);
create policy "topicos_aluno_select" on public.topicos for select using (
  exists (select 1 from public.materias m where m.id = topicos.materia_id and public.aluno_tem_acesso_ao_professor(m.professor_id))
);

-- ---------- grupos_questoes ----------
create policy "grupos_professor_all" on public.grupos_questoes for all using (professor_id = auth.uid());
create policy "grupos_aluno_select" on public.grupos_questoes for select using (
  public.aluno_tem_acesso_ao_professor(grupos_questoes.professor_id)
);

-- ---------- questoes ----------
create policy "questoes_professor_all" on public.questoes for all using (professor_id = auth.uid());
create policy "questoes_aluno_select" on public.questoes for select using (
  public.aluno_tem_acesso_ao_professor(questoes.professor_id)
);

-- ---------- cronograma_itens ----------
create policy "cron_select" on public.cronograma_itens for select using (
  public.is_professor_da_turma(turma_id) or public.is_aluno_da_turma(turma_id)
);
create policy "cron_insert" on public.cronograma_itens for insert with check (
  public.is_professor_da_turma(turma_id) and public.turma_esta_ativa(turma_id)
);
create policy "cron_update" on public.cronograma_itens for update using (public.is_professor_da_turma(turma_id));
create policy "cron_delete" on public.cronograma_itens for delete using (public.is_professor_da_turma(turma_id));

-- ---------- cronograma_questoes ----------
create policy "cq_select" on public.cronograma_questoes for select using (
  exists (select 1 from public.cronograma_itens ci where ci.id = cronograma_id
    and (public.is_professor_da_turma(ci.turma_id) or public.is_aluno_da_turma(ci.turma_id)))
);
create policy "cq_insert" on public.cronograma_questoes for insert with check (
  exists (select 1 from public.cronograma_itens ci where ci.id = cronograma_id
    and public.is_professor_da_turma(ci.turma_id) and public.turma_esta_ativa(ci.turma_id))
);
create policy "cq_delete" on public.cronograma_questoes for delete using (
  exists (select 1 from public.cronograma_itens ci where ci.id = cronograma_id and public.is_professor_da_turma(ci.turma_id))
);

-- ---------- cronograma_conclusoes ----------
create policy "cc_select" on public.cronograma_conclusoes for select using (
  aluno_id = auth.uid() or exists (select 1 from public.cronograma_itens ci where ci.id = cronograma_id and public.is_professor_da_turma(ci.turma_id))
);
create policy "cc_insert" on public.cronograma_conclusoes for insert with check (aluno_id = auth.uid());
create policy "cc_delete" on public.cronograma_conclusoes for delete using (aluno_id = auth.uid());

-- ---------- simulados ----------
create policy "sim_select" on public.simulados for select using (
  public.is_professor_da_turma(turma_id) or public.is_aluno_da_turma(turma_id)
);
create policy "sim_insert" on public.simulados for insert with check (
  public.is_professor_da_turma(turma_id) and public.turma_esta_ativa(turma_id)
);
create policy "sim_update" on public.simulados for update using (public.is_professor_da_turma(turma_id));
create policy "sim_delete" on public.simulados for delete using (public.is_professor_da_turma(turma_id));

-- ---------- simulado_questoes ----------
create policy "sq_select" on public.simulado_questoes for select using (
  exists (select 1 from public.simulados s where s.id = simulado_id
    and (public.is_professor_da_turma(s.turma_id) or public.is_aluno_da_turma(s.turma_id)))
);
create policy "sq_insert" on public.simulado_questoes for insert with check (
  exists (select 1 from public.simulados s where s.id = simulado_id
    and public.is_professor_da_turma(s.turma_id) and public.turma_esta_ativa(s.turma_id))
);
create policy "sq_delete" on public.simulado_questoes for delete using (
  exists (select 1 from public.simulados s where s.id = simulado_id and public.is_professor_da_turma(s.turma_id))
);

-- ---------- simulado_tentativas ----------
create policy "st_select" on public.simulado_tentativas for select using (
  aluno_id = auth.uid() or exists (select 1 from public.simulados s where s.id = simulado_id and public.is_professor_da_turma(s.turma_id))
);
create policy "st_insert" on public.simulado_tentativas for insert with check (aluno_id = auth.uid());
create policy "st_update" on public.simulado_tentativas for update using (aluno_id = auth.uid());

-- ---------- respostas ----------
create policy "resp_select_own" on public.respostas for select using (aluno_id = auth.uid());
create policy "resp_select_professor" on public.respostas for select using (
  turma_id is not null and public.is_professor_da_turma(turma_id)
);
create policy "resp_insert" on public.respostas for insert with check (aluno_id = auth.uid());

-- ---------- notificacoes ----------
create policy "notif_select" on public.notificacoes for select using (aluno_id = auth.uid());
create policy "notif_update" on public.notificacoes for update using (aluno_id = auth.uid());
-- sem policy de insert para o próprio usuário: só funções do servidor
-- (security definer, como encerrar_turma) podem criar notificações.

-- hora atual do servidor — usada pelo cronômetro do simulado, pra não
-- depender do relógio (possivelmente dessincronizado) do computador do aluno
create or replace function public.hora_atual()
returns timestamptz language sql stable as $$
  select now();
$$;

grant execute on function public.hora_atual() to authenticated, anon;

-- =====================================================================
-- FIM DO SCHEMA
-- =====================================================================
