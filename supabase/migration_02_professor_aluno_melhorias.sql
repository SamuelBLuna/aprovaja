-- =====================================================================
-- APROVAJA — MIGRATION 02
-- Rode depois da migration_01. Duas mudanças estruturais:
--   1) Aluno sem turma válida NUNCA é criado (trava no banco, não só na tela)
--   2) Cronograma passa a aceitar um intervalo de dias (data_inicio/data_fim)
--      em vez de um único dia por item
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) CADASTRO ATÔMICO: aluno só existe se entrar em uma turma válida.
--    Se o código for inválido/ausente, a criação inteira do usuário é
--    revertida — não fica "meio criado".
-- ---------------------------------------------------------------------
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

-- ATENÇÃO: se você já tem professores criados manualmente pelo painel do
-- Supabase (Authentication > Users > Add user) sem definir "role" nos
-- metadados, o padrão agora É 'aluno' — e criar um novo usuário assim,
-- sem código de turma, vai falhar de propósito. Ao criar um professor
-- manualmente, sempre preencha o campo "User Metadata" com:
--   {"role": "professor", "nome": "Seu Nome"}

-- ---------------------------------------------------------------------
-- 2) CRONOGRAMA POR INTERVALO: um item agora cobre de data_inicio até
--    data_fim (um único dia é só um intervalo onde as duas datas são
--    iguais). O campo "titulo" deixa de ser obrigatório — a matéria já
--    identifica o item.
-- ---------------------------------------------------------------------
alter table public.cronograma_itens rename column data to data_inicio;
alter table public.cronograma_itens add column data_fim date;
update public.cronograma_itens set data_fim = data_inicio where data_fim is null;
alter table public.cronograma_itens alter column data_fim set not null;
alter table public.cronograma_itens add constraint cronograma_datas_validas check (data_fim >= data_inicio);
alter table public.cronograma_itens alter column titulo drop not null;

drop index if exists cronograma_turma_data_idx;
create index cronograma_turma_datas_idx on public.cronograma_itens (turma_id, data_inicio, data_fim);

-- =====================================================================
-- FIM DA MIGRATION 02
-- =====================================================================
