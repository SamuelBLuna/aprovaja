-- =====================================================================
-- APROVAJA — CORREÇÕES (rode isso no SQL Editor, depois do schema.sql)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Função auxiliar correta: verifica se o ALUNO logado tem acesso
--    ao conteúdo de um determinado professor (via alguma turma em comum).
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 2) Corrige as políticas que usavam a função errada
--    (antes checavam "sou professor desta turma?", deveria checar
--    "o professor desta turma é o dono deste conteúdo?")
-- ---------------------------------------------------------------------
drop policy if exists "materias_aluno_select" on public.materias;
create policy "materias_aluno_select" on public.materias for select using (
  public.aluno_tem_acesso_ao_professor(materias.professor_id)
);

drop policy if exists "topicos_aluno_select" on public.topicos;
create policy "topicos_aluno_select" on public.topicos for select using (
  exists (select 1 from public.materias m where m.id = topicos.materia_id and public.aluno_tem_acesso_ao_professor(m.professor_id))
);

drop policy if exists "grupos_aluno_select" on public.grupos_questoes;
create policy "grupos_aluno_select" on public.grupos_questoes for select using (
  public.aluno_tem_acesso_ao_professor(grupos_questoes.professor_id)
);

drop policy if exists "questoes_aluno_select" on public.questoes;
create policy "questoes_aluno_select" on public.questoes for select using (
  public.aluno_tem_acesso_ao_professor(questoes.professor_id)
);

-- ---------------------------------------------------------------------
-- 3) Função pública para validar um código de turma ANTES de criar a
--    conta (sem expor a tabela turmas inteira — só diz se é válido).
-- ---------------------------------------------------------------------
create or replace function public.validar_codigo_turma(p_codigo text)
returns table(turma_id uuid, nome text)
language sql security definer stable as $$
  select id, nome from public.turmas
  where upper(codigo_turma) = upper(p_codigo)
    and status = 'ativa'
    and data_fim >= current_date;
$$;

grant execute on function public.validar_codigo_turma(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4) Gatilho de criação de conta agora também matricula o aluno na
--    turma, usando o código enviado nos metadados do cadastro — isso
--    roda sempre (com ou sem confirmação de e-mail, com ou sem sessão).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_turma_id uuid;
  v_status public.turma_status;
  v_data_fim date;
begin
  insert into public.profiles (id, nome, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'aluno')
  );

  if new.raw_user_meta_data ? 'codigo_turma' then
    begin
      select id, status, data_fim into v_turma_id, v_status, v_data_fim
      from public.turmas
      where upper(codigo_turma) = upper(new.raw_user_meta_data->>'codigo_turma');

      if v_turma_id is not null and v_status = 'ativa' and v_data_fim >= current_date then
        insert into public.turma_alunos (turma_id, aluno_id)
        values (v_turma_id, new.id)
        on conflict do nothing;
      end if;
    exception when others then
      -- nunca deixa um problema aqui impedir a criação da conta
      null;
    end;
  end if;

  return new;
end;
$$;

-- =====================================================================
-- FIM DAS CORREÇÕES
-- =====================================================================
