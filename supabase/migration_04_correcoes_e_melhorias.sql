-- =====================================================================
-- APROVAJA — MIGRATION 04
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) BUG: grupos_questoes nunca teve coluna de tópico — por isso o
--    tópico escolhido na criação do grupo nunca era salvo, e as perguntas
--    do grupo ficavam sem tópico (não apareciam ao filtrar por tópico).
-- ---------------------------------------------------------------------
alter table public.grupos_questoes add column if not exists topico_id uuid references public.topicos(id) on delete set null;

-- corrige o histórico: para grupos já criados, tenta achar as perguntas
-- do grupo que JÁ têm um tópico salvo (se alguma tiver) e usa esse tópico
-- como o tópico oficial do grupo, pra não perder o que já foi feito manualmente.
update public.grupos_questoes g
set topico_id = sub.topico_id
from (
  select distinct on (grupo_id) grupo_id, topico_id
  from public.questoes
  where grupo_id is not null and topico_id is not null
) sub
where sub.grupo_id = g.id and g.topico_id is null;

-- ---------------------------------------------------------------------
-- 2) Reativar turma encerrada por engano (não recoloca os alunos
--    removidos automaticamente — eles precisam usar o código de novo).
-- ---------------------------------------------------------------------
create or replace function public.reativar_turma(p_turma_id uuid)
returns void language plpgsql security definer as $$
begin
  if not public.is_professor_da_turma(p_turma_id) then
    raise exception 'Sem permissão para reativar esta turma';
  end if;
  update public.turmas set status = 'ativa' where id = p_turma_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) Turma "vencida" (passou da data_fim) também trava criação de
--    conteúdo novo, mesmo que o professor esqueça de clicar em "Encerrar".
-- ---------------------------------------------------------------------
create or replace function public.turma_esta_ativa(t_id uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.turmas where id = t_id and status = 'ativa' and data_fim >= current_date);
$$;

-- =====================================================================
-- FIM DA MIGRATION 04
-- =====================================================================
