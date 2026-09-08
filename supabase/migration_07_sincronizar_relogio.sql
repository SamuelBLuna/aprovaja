-- =====================================================================
-- APROVAJA — MIGRATION 07
-- Função pra sincronizar o cronômetro do simulado com o relógio do
-- servidor, em vez de confiar no relógio do computador do aluno (que pode
-- estar dessincronizado e fazer o tempo mostrado ficar sempre "a mais").
-- =====================================================================

create or replace function public.hora_atual()
returns timestamptz language sql stable as $$
  select now();
$$;

grant execute on function public.hora_atual() to authenticated, anon;

-- =====================================================================
-- FIM DA MIGRATION 07
-- =====================================================================
