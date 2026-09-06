-- =====================================================================
-- APROVAJA — MIGRATION 06
-- Conclusão do cronograma passa a ser por DIA, não por item inteiro.
-- Isso corrige o bug de marcar o dia 1 de um período de 5 dias e o
-- sistema marcar os outros 4 dias como concluídos junto.
-- =====================================================================

alter table public.cronograma_conclusoes add column if not exists data date;

update public.cronograma_conclusoes cc
set data = ci.data_inicio
from public.cronograma_itens ci
where ci.id = cc.cronograma_id and cc.data is null;

alter table public.cronograma_conclusoes alter column data set not null;

alter table public.cronograma_conclusoes drop constraint if exists cronograma_conclusoes_pkey;
alter table public.cronograma_conclusoes add primary key (cronograma_id, aluno_id, data);

-- =====================================================================
-- FIM DA MIGRATION 06
-- =====================================================================
