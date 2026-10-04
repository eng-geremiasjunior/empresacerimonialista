-- ============================================================
-- 198 — O cartão na lista de presentes (03/10/2026)
-- ============================================================
-- Pedido dele: o convidado também paga no cartão de crédito, em até 6x,
-- e a taxa do cartão é de quem presenteia (decisão de 26/09, confirmada
-- hoje). O dinheiro se divide como no Pix (197): o casal recebe o
-- presente inteiro; a plataforma fica com a taxa de serviço e com a taxa
-- do cartão, que a Pagar.me desconta dela.
--
-- O que muda, só em presente_pagamento:
--   · meio: 'pix' ou 'cartao' (tudo o que já existe é Pix);
--   · parcelas: de 1 a 6 (no Pix, sempre 1);
--   · taxa_cartao_centavos: o que o convidado pagou a mais pelo cartão
--     (no Pix, 0). O total_centavos já soma tudo;
--   · o casal passa a ler meio e parcelas nos Recebidos ("cartão em 3x"):
--     o dinheiro do cartão cai em outro prazo. E-mail, origem e a taxa do
--     cartão continuam só com o servidor.
--
-- Nada do cartão fica aqui: número, validade e CVV vão do navegador
-- direto para a Pagar.me, que devolve um token de uso único.
--
-- Convergente: pode rodar de novo. Termina com a conferência (tudo true).
-- ============================================================

alter table public.presente_pagamento add column if not exists meio text not null default 'pix';
alter table public.presente_pagamento add column if not exists parcelas smallint not null default 1;
alter table public.presente_pagamento add column if not exists taxa_cartao_centavos integer not null default 0;

do $$
begin
  alter table public.presente_pagamento drop constraint if exists presente_pagamento_cartao_check;
  alter table public.presente_pagamento add constraint presente_pagamento_cartao_check check (
    meio in ('pix', 'cartao')
    and parcelas between 1 and 6
    and taxa_cartao_centavos >= 0
    and (meio = 'cartao' or (parcelas = 1 and taxa_cartao_centavos = 0))
  );
end $$;

-- os freios do cartão contam tentativas recusadas por lista, por origem e
-- por e-mail (a rota de pagamento): só as linhas do cartão entram aqui
create index if not exists idx_presente_pagamento_cartao
  on public.presente_pagamento (event_id, status, created_at desc)
  where meio = 'cartao';

-- o casal lê o meio e as parcelas (a 197 já deu as outras colunas; o
-- REVOKE de tabela da 197, se ela rodar de novo, apaga este GRANT — a tela
-- do casal sobrevive a isso e só deixa de dizer "cartão em 3x")
grant select (meio, parcelas) on public.presente_pagamento to authenticated;

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select 'colunas novas, sem nulo e com padrão' as item,
       (select count(*) = 3 and bool_and(is_nullable = 'NO' and column_default is not null)
          from information_schema.columns
         where table_schema = 'public' and table_name = 'presente_pagamento'
           and column_name in ('meio', 'parcelas', 'taxa_cartao_centavos')) as ok
union all
select 'a regra do cartão existe e vale para as linhas antigas',
       exists (select 1 from pg_constraint
                where conname = 'presente_pagamento_cartao_check'
                  and conrelid = 'public.presente_pagamento'::regclass
                  and convalidated)
union all
select 'nenhum Pix com parcela ou taxa de cartão',
       not exists (select 1 from public.presente_pagamento
                    where meio = 'pix' and (parcelas <> 1 or taxa_cartao_centavos <> 0))
union all
select 'o casal lê meio e parcelas',
       has_column_privilege('authenticated', 'public.presente_pagamento', 'meio', 'select')
       and has_column_privilege('authenticated', 'public.presente_pagamento', 'parcelas', 'select')
union all
select 'o casal NÃO lê a taxa do cartão, o e-mail nem a origem',
       not has_column_privilege('authenticated', 'public.presente_pagamento', 'taxa_cartao_centavos', 'select')
       and not has_column_privilege('authenticated', 'public.presente_pagamento', 'email', 'select')
       and not has_column_privilege('authenticated', 'public.presente_pagamento', 'origem', 'select')
union all
select 'o anônimo continua sem nada na tabela',
       not has_any_column_privilege('anon', 'public.presente_pagamento', 'SELECT, INSERT, UPDATE, REFERENCES')
       and not has_table_privilege('anon', 'public.presente_pagamento', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE')
union all
select 'o logado continua sem escrever na tabela',
       not has_table_privilege('authenticated', 'public.presente_pagamento', 'INSERT, UPDATE, DELETE, TRUNCATE')
       and not has_any_column_privilege('authenticated', 'public.presente_pagamento', 'INSERT, UPDATE')
union all
select 'a RLS continua ligada',
       (select relrowsecurity from pg_class where oid = 'public.presente_pagamento'::regclass);
