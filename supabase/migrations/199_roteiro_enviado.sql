-- ============================================================
-- eOrganizei — Migração 199: quando o roteiro foi mandado ao fornecedor
-- Execute no SQL Editor do Supabase (depois da 198).
--
-- "Mandar o roteiro para todos" (04/10/2026) marca cada fornecedor como
-- enviado. Até aqui a marca ficava só no navegador de quem tocou: no
-- celular aparecia "enviado", no computador e para o resto da equipe não.
-- Uma coluna em roteiro_links (um por evento + fornecedor) resolve.
--
-- Só ADD COLUMN IF NOT EXISTS: pode rodar de novo sem efeito. Nada de
-- política nova — roteiro_links já tem as de cargo (024), e a escrita
-- passa pela mesma regra do "confirmou" (roteiro_links_update). O link
-- público (roteiro_publico) não lê esta coluna.
-- ============================================================

alter table public.roteiro_links
  add column if not exists roteiro_enviado_em timestamptz;

comment on column public.roteiro_links.roteiro_enviado_em is
  'Última vez que a equipe mandou o link do roteiro a este fornecedor pelo "Mandar o roteiro para todos" (199). Lembrete de quem já recebeu; não prova que ele abriu.';

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select 'coluna roteiro_enviado_em' as verificacao,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'roteiro_links'
                  and column_name = 'roteiro_enviado_em'
                  and data_type = 'timestamp with time zone') as aplicou
union all
select 'RLS de roteiro_links continua ligada',
       (select relrowsecurity from pg_class
         where oid = 'public.roteiro_links'::regclass);
