-- =====================================================================
-- APROVAJA — MIGRATION 05
-- Sistema de notificações: o aluno precisa ficar sabendo quando a turma
-- dele é encerrada, mesmo depois de perder o acesso a ela.
-- =====================================================================

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.profiles(id) on delete cascade,
  titulo text not null,
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notificacoes enable row level security;

create policy "notif_select" on public.notificacoes for select using (aluno_id = auth.uid());
create policy "notif_update" on public.notificacoes for update using (aluno_id = auth.uid());
-- sem policy de insert para o próprio usuário de propósito: só funções do
-- servidor (security definer, como encerrar_turma) podem criar notificações.

-- encerrar_turma agora também avisa cada aluno antes de desvinculá-lo
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

-- =====================================================================
-- FIM DA MIGRATION 05
-- =====================================================================
