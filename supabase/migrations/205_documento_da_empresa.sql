-- ============================================================
-- 205 — O CPF ou CNPJ da empresa, obrigatório no cadastro
-- ============================================================
-- Decisão dele (12/10/2026): "pra criar conta, deve ter um CPF ou CNPJ
-- válido, toda empresa precisa disso, justamente pra não acontecer isso" —
-- um usuário abriu contas em série com e-mails e telefones falsos.
--
-- empresas.documento: só os dígitos (11 = CPF, 14 = CNPJ), conferido no
-- servidor pelos dígitos verificadores (src/lib/documento.ts) e ÚNICO:
-- um documento, uma conta. A conta suspensa continua dona do documento —
-- quem foi suspenso não volta com o mesmo CPF.
--
-- As contas que já existem ficam sem documento (nulo); a regra vale para
-- o cadastro novo. Convergente: pode rodar mais de uma vez.

begin;

alter table public.empresas add column if not exists documento text;

do $$
begin
  alter table public.empresas drop constraint if exists empresas_documento_formato;
  alter table public.empresas add constraint empresas_documento_formato
    check (documento is null or documento ~ '^([0-9]{11}|[0-9]{14})$');
end $$;

create unique index if not exists empresas_documento_unico
  on public.empresas (documento)
  where documento is not null;

comment on column public.empresas.documento is
  'CPF (11) ou CNPJ (14) da empresa, só dígitos, único (205). Obrigatório no cadastro desde 12/10/2026; as contas antigas ficam nulas.';

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar 'true'.
-- ------------------------------------------------------------
select 'a coluna existe' as item,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'empresas' and column_name = 'documento') as ok
union all
select 'só dígitos, 11 ou 14',
       exists (select 1 from pg_constraint where conname = 'empresas_documento_formato')
union all
select 'um documento, uma conta',
       exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'empresas_documento_unico');
