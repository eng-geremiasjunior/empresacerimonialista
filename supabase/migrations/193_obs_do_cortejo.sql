-- ============================================================
-- 193 — A observação de cada entrada do cortejo (01/10/2026)
-- ============================================================
-- Revisão da folha do cortejo: faltava uma coluna "Obs." para o que é
-- instrução de bastidor ("entram de 2 em 2", "aguardar sinal da
-- assessoria", "entregar as alianças ao celebrante").
--
-- É anotação da EQUIPE, como a pronúncia (125): sai na tela da equipe e na
-- folha do mestre de cerimônias, e o portal da família não a lê (as telas
-- do portal pedem as colunas pelo nome e esta não está entre elas).
--
-- Aditiva e reexecutável (CHECK separado do add column — ver a 145).
-- Conferência no fim: tudo true.
-- ============================================================

alter table public.evento_cortejo_pessoa add column if not exists observacao text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'evento_cortejo_pessoa_observacao_len') then
    alter table public.evento_cortejo_pessoa
      add constraint evento_cortejo_pessoa_observacao_len check (observacao is null or char_length(observacao) <= 300);
  end if;
end $$;

comment on column public.evento_cortejo_pessoa.observacao is
  'Observação da equipe para a entrada (193): instrução de bastidor da folha do mestre de cerimônias. O portal da família não mostra.';

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select 'coluna observacao' as verificacao,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'evento_cortejo_pessoa'
                  and column_name = 'observacao') as aplicou
union all
select 'CHECK do tamanho',
       exists (select 1 from pg_constraint where conname = 'evento_cortejo_pessoa_observacao_len');
