-- =====================================================================
-- APROVAJA — MIGRATION 03
-- Rode depois da migration_02. Duas correções:
--   1) Encerrar uma turma agora REALMENTE desvincula todos os alunos dela
--   2) Turma encerrada não aceita mais novos itens de cronograma/simulados
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) encerrar_turma agora remove todos os vínculos aluno-turma.
--    O histórico de respostas/tentativas NÃO é apagado (fica preservado
--    pra sempre no relatório), só o acesso do aluno à turma é removido.
-- ---------------------------------------------------------------------
create or replace function public.encerrar_turma(p_turma_id uuid)
returns void language plpgsql security definer as $$
begin
  if not public.is_professor_da_turma(p_turma_id) then
    raise exception 'Sem permissão para encerrar esta turma';
  end if;
  update public.turmas set status = 'encerrada' where id = p_turma_id;
  delete from public.turma_alunos where turma_id = p_turma_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 2) Função auxiliar: a turma está ativa?
-- ---------------------------------------------------------------------
create or replace function public.turma_esta_ativa(t_id uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.turmas where id = t_id and status = 'ativa');
$$;

-- ---------------------------------------------------------------------
-- 3) Bloqueia criar NOVOS itens de cronograma / simulados em turma encerrada
--    (editar ou excluir o que já existe continua permitido, só a criação
--    de coisa nova é travada).
-- ---------------------------------------------------------------------
drop policy if exists "cron_insert" on public.cronograma_itens;
create policy "cron_insert" on public.cronograma_itens for insert with check (
  public.is_professor_da_turma(turma_id) and public.turma_esta_ativa(turma_id)
);

drop policy if exists "cq_insert" on public.cronograma_questoes;
create policy "cq_insert" on public.cronograma_questoes for insert with check (
  exists (select 1 from public.cronograma_itens ci where ci.id = cronograma_id
    and public.is_professor_da_turma(ci.turma_id) and public.turma_esta_ativa(ci.turma_id))
);

drop policy if exists "sim_insert" on public.simulados;
create policy "sim_insert" on public.simulados for insert with check (
  public.is_professor_da_turma(turma_id) and public.turma_esta_ativa(turma_id)
);

drop policy if exists "sq_insert" on public.simulado_questoes;
create policy "sq_insert" on public.simulado_questoes for insert with check (
  exists (select 1 from public.simulados s where s.id = simulado_id
    and public.is_professor_da_turma(s.turma_id) and public.turma_esta_ativa(s.turma_id))
);

-- ---------------------------------------------------------------------
-- 4) Se você já tem alguma turma encerrada com alunos ainda vinculados
--    (de antes desta correção), isso limpa agora:
-- ---------------------------------------------------------------------
delete from public.turma_alunos ta
using public.turmas t
where ta.turma_id = t.id and t.status = 'encerrada';

-- =====================================================================
-- FIM DA MIGRATION 03
-- =====================================================================
