-- ============================================================
-- 216 — A proposta só liga a evento da MESMA empresa (18/10/2026)
-- ============================================================
-- Achado da revisão cética da 214: a RLS de orcamentos (041) confere a
-- empresa da PROPOSTA, mas não a do evento em evento_gerado_id. Quem
-- edita propostas na empresa A podia, mexendo direto na API, ligar a
-- própria proposta a um evento da empresa B (precisava do id dele). As
-- telas que leem "a proposta deste evento" (089, 163, 167) passariam a
-- mostrar a proposta de A dentro do evento de B.
--
-- A trava: um gatilho BEFORE recusa evento_gerado_id que não seja da
-- mesma empresa. Só a função do aceite (criar_evento_do_orcamento, 112)
-- grava essa coluna, sempre com o evento que ela mesma acabou de criar
-- na empresa da proposta, então nenhum caminho legítimo é barrado.
-- Conferido antes de escrever: 20 propostas com evento, 0 cruzadas.
--
-- Rodar inteiro no SQL Editor. Pode rodar de novo. Conferência no fim.

create or replace function public.orcamento_evento_da_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.evento_gerado_id is not null
     and (tg_op = 'INSERT'
          or new.evento_gerado_id is distinct from old.evento_gerado_id
          or new.empresa_id is distinct from old.empresa_id)
     and not exists (
       select 1 from public.events e
        where e.id = new.evento_gerado_id and e.empresa_id = new.empresa_id
     ) then
    raise exception 'evento de outra empresa' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.orcamento_evento_da_empresa() from public, anon, authenticated;

drop trigger if exists trg_evento_da_empresa on public.orcamentos;
create trigger trg_evento_da_empresa before insert or update of evento_gerado_id, empresa_id
  on public.orcamentos
  for each row execute function public.orcamento_evento_da_empresa();

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'a trava está ligada' as item,
       exists (select 1 from pg_trigger where tgname = 'trg_evento_da_empresa'
                  and tgrelid = 'public.orcamentos'::regclass) as ok
union all
select 'nenhuma proposta ligada a evento de outra empresa hoje',
       not exists (
         select 1 from public.orcamentos o
           join public.events e on e.id = o.evento_gerado_id
          where e.empresa_id <> o.empresa_id
       )
union all
select 'a função não fica aberta a ninguém',
       not has_function_privilege('anon', 'public.orcamento_evento_da_empresa()', 'execute')
       and not has_function_privilege('authenticated', 'public.orcamento_evento_da_empresa()', 'execute');
