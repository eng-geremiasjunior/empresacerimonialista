-- ============================================================
-- 192 — O cortejo do casamento (01/10/2026)
-- ============================================================
-- Pedido do dono: "esse cortejo nosso ficou bem preguiçoso". No casamento
-- o cortejo vira UMA sequência de entradas na ordem em que entram (e não
-- listas soltas por grupo), e cada entrada ganha:
--   · par    — quem entra junto ("Ana e Pedro", "o noivo com a mãe")
--   · lado   — do noivo ou da noiva
--   · musica — a música daquela entrada, para a folha e o ensaio
--
-- `papel` já é texto livre desde a 125 (só o tamanho é conferido), então
-- os papéis novos do casamento (celebrante, noivo, noiva, pais, avós…)
-- não pedem mudança de CHECK. `nome` vazio é a entrada "a definir" do
-- cortejo tradicional; o portal da família não a mostra (getCortejo).
--
-- A ordem: até aqui cada grupo numerava a sua (10, 20… por papel). No
-- casamento a ordem passa a ser uma só, do evento inteiro. Os casamentos
-- que já têm cortejo são renumerados uma vez na ordem típica (padrinhos,
-- madrinhas, damas, pajens, alianças), mantendo a ordem dentro de cada
-- grupo. Só se renumera o evento que ainda tem ordem repetida — rodar de
-- novo não desfaz a ordem que a cerimonialista arrumou.
--
-- Aditiva e reexecutável. Conferência no fim: tudo true.
-- ============================================================

-- 1) as colunas (CHECK separado: `add column if not exists ... check`
--    não é convergente — ver a 145)
alter table public.evento_cortejo_pessoa add column if not exists par text;
alter table public.evento_cortejo_pessoa add column if not exists lado text;
alter table public.evento_cortejo_pessoa add column if not exists musica text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'evento_cortejo_pessoa_par_len') then
    alter table public.evento_cortejo_pessoa
      add constraint evento_cortejo_pessoa_par_len check (par is null or char_length(par) <= 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'evento_cortejo_pessoa_lado_valido') then
    alter table public.evento_cortejo_pessoa
      add constraint evento_cortejo_pessoa_lado_valido check (lado is null or lado in ('noivo', 'noiva'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'evento_cortejo_pessoa_musica_len') then
    alter table public.evento_cortejo_pessoa
      add constraint evento_cortejo_pessoa_musica_len check (musica is null or char_length(musica) <= 160);
  end if;
end $$;

comment on column public.evento_cortejo_pessoa.par is
  'Quem entra junto nesta entrada (192): o par dos padrinhos, a mãe do noivo, o pai da noiva.';
comment on column public.evento_cortejo_pessoa.lado is
  'De que lado é a entrada (192): noivo ou noiva. Nulo quando não se aplica.';
comment on column public.evento_cortejo_pessoa.musica is
  'A música da entrada (192), para a folha do mestre de cerimônias e o ensaio.';

-- 2) a ordem única dos casamentos que já têm cortejo (só os que ainda têm
--    ordem repetida, que é a marca da numeração antiga por grupo)
update public.evento_cortejo_pessoa c
   set ordem = r.n * 10
  from (
    select x.id,
           row_number() over (
             partition by x.event_id
             order by case x.papel
                        when 'padrinho' then 1
                        when 'madrinha' then 2
                        when 'dama' then 3
                        when 'pajem' then 4
                        when 'porta_alianca' then 5
                        else 6
                      end,
                      x.ordem, x.nome, x.id
           ) as n
      from public.evento_cortejo_pessoa x, public.events e
     where e.id = x.event_id
       and e.type::text = 'casamento'
       and x.event_id in (
             select d.event_id
               from public.evento_cortejo_pessoa d
              group by d.event_id
             having count(*) <> count(distinct d.ordem)
           )
  ) r
 where r.id = c.id;

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select 'colunas par, lado e musica' as verificacao,
       (select count(*) from information_schema.columns
         where table_schema = 'public' and table_name = 'evento_cortejo_pessoa'
           and column_name in ('par', 'lado', 'musica')) = 3 as aplicou
union all
select 'os tres CHECKs',
       (select count(*) from pg_constraint
         where conname in ('evento_cortejo_pessoa_par_len',
                           'evento_cortejo_pessoa_lado_valido',
                           'evento_cortejo_pessoa_musica_len')) = 3
union all
select 'nenhum casamento com ordem repetida no cortejo',
       not exists (
         select 1
           from public.evento_cortejo_pessoa d, public.events e
          where e.id = d.event_id and e.type::text = 'casamento'
          group by d.event_id
         having count(*) <> count(distinct d.ordem)
       );
