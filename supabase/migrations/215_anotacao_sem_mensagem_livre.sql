-- ============================================================
-- 215 — A anotação do pedido no evento sem a mensagem livre (18/10/2026)
-- ============================================================
-- Decisão dele (opção 1): quando a proposta que nasceu de um pedido vira
-- evento, a anotação leva o serviço, os convidados e as respostas às
-- perguntas DELA — não a mensagem livre. Motivos:
--   * a anotação do evento é lida por toda a equipe do evento, inclusive
--     a assistente, e o pedido ficou fora do alcance da assistente desde
--     a 165 ("contato com cliente é dado comercial");
--   * a mensagem livre é onde a cliente costuma escrever telefone, e-mail
--     e o valor que pretende gastar;
--   * a cópia no evento não sai quando o pedido é apagado.
-- A mensagem continua no pedido e na tela da proposta nova, para quem
-- conduz a negociação.
--
-- Rodar inteiro no SQL Editor. Pode rodar de novo. Conferência no fim.

create or replace function public.pedido_vira_anotacao_do_evento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ped   public.pedido_orcamento%rowtype;
  v_autor uuid;
  v_texto text;
  v_r     jsonb;
  v_algo  boolean := false;
begin
  begin
    select * into v_ped from public.pedido_orcamento p
     where p.id = new.pedido_id and p.empresa_id = new.empresa_id;
    if not found then
      return new;
    end if;
    -- o evento também tem de ser da MESMA empresa (revisão cética da 214)
    if not exists (
      select 1 from public.events e
       where e.id = new.evento_gerado_id and e.empresa_id = new.empresa_id
    ) then
      return new;
    end if;

    v_texto := 'Do pedido de orçamento de ' || v_ped.nome
      || ' (' || to_char(v_ped.created_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || ')';
    if v_ped.servico_desejado is not null then
      v_texto := v_texto || E'\nServiço que procura: ' || v_ped.servico_desejado;
      v_algo := true;
    end if;
    if v_ped.convidados is not null then
      v_texto := v_texto || E'\nConvidados: ' || v_ped.convidados;
      v_algo := true;
    end if;
    if v_ped.respostas is not null then
      for v_r in select value from jsonb_array_elements(v_ped.respostas) loop
        if coalesce(btrim(v_r->>'resposta'), '') <> '' then
          v_texto := v_texto || E'\n' || coalesce(v_r->>'titulo', 'Pergunta') || ': ' || (v_r->>'resposta');
          v_algo := true;
        end if;
      end loop;
    end if;
    -- sem nada além do cabeçalho, não há o que anotar
    if not v_algo then
      return new;
    end if;

    v_autor := new.criado_por;
    if v_autor is null then
      select e.owner_user_id into v_autor from public.empresas e where e.id = new.empresa_id;
    end if;
    if v_autor is null then
      return new;
    end if;

    if not exists (
      select 1 from public.event_notes n
       where n.event_id = new.evento_gerado_id
         and n.content like 'Do pedido de orçamento de %'
    ) then
      insert into public.event_notes (event_id, author_id, content)
      values (new.evento_gerado_id, v_autor, left(v_texto, 4000));
    end if;
  exception when others then
    -- a anotação é conforto; o aceite e o evento não podem cair por ela
    raise warning 'pedido_vira_anotacao_do_evento: %', sqlstate;
  end;
  return new;
end;
$$;

revoke all on function public.pedido_vira_anotacao_do_evento() from public, anon, authenticated;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'a anotação não leva mais a mensagem livre' as item,
       (select prosrc not like '%v_ped.mensagem%' from pg_proc where proname = 'pedido_vira_anotacao_do_evento') as ok
union all
select 'continua com a trava de empresa do evento',
       (select prosrc like '%e.empresa_id = new.empresa_id%' from pg_proc where proname = 'pedido_vira_anotacao_do_evento')
union all
select 'o gatilho segue ligado',
       exists (select 1 from pg_trigger where tgname = 'trg_pedido_vira_anotacao' and tgrelid = 'public.orcamentos'::regclass)
union all
select 'a função não fica aberta a ninguém',
       not has_function_privilege('anon', 'public.pedido_vira_anotacao_do_evento()', 'execute');
