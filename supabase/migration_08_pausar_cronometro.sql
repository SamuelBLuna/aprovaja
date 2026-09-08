-- =====================================================================
-- APROVAJA — MIGRATION 08
-- O cronômetro do simulado agora conta só o tempo ATIVO na tela — se o
-- aluno sair (ou fechar o app) no meio, o tempo fica pausado até ele
-- voltar, em vez de continuar correndo no relógio de verdade.
-- =====================================================================

alter table public.simulado_tentativas add column if not exists tempo_usado_segundos integer not null default 0;

-- =====================================================================
-- FIM DA MIGRATION 08
-- =====================================================================
