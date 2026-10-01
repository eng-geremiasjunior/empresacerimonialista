-- ============================================================
-- 190 — As brechas que a revisão da 189 achou (01/10/2026)
-- ============================================================
-- A 189 está no ar (30/09, SQL Editor) e hoje não vaza nada: os 12
-- acessos são 'casal'. Esta fecha o que abriria no PRIMEIRO acesso de
-- outro nível (familia, aprova, leitura, padrinho). Tem de estar no ar
-- ANTES de o app gravar um nível diferente de 'casal'. O app confere: o
-- formulário "Acesso da cliente" só grava outro nível quando existe
-- portal_opcoes_das_escolhas, a ÚLTIMA coisa que esta migração cria
-- (acesso-cliente-actions.ts). Sem a 190, ele recusa e pede 'casal'.
--
-- NÃO reaplica a 189. Muda duas das 27 RPCs embrulhadas pelo EMBRULHO
-- (portal_escrever_campo e portal_ajustar_convite), nunca pela _base, e
-- não toca no que a 191 mexe (portal_salvar_estrutura_site_base,
-- site_montado, site_publico, balde 'site'): a ordem entre 190 e 191 não
-- importa.
--
-- Decisões do dono (30/09, .claude/plans/portal-noivos-v4.md, "A 190"):
--   1) evento_campo_valor: moeda, verba, reserva, valores e orçamentos só
--      com 'financeiro'; alergia e medicamento só com 'saude' (área nova:
--      não está em nivel_permite, cai no "else" = só o casal);
--   1b) Guia de estilo: a flor vetada por alergia (motivo_interno "alergia
--      da noiva") também só com 'saude';
--   2) portal_escrever_campo: quem não vê alergia/medicamento não responde;
--   3) pagamentos_fornecedor_por_mes: só a EQUIPE e a chave de serviço
--      (nenhuma tela chama; a família sai de vez);
--   4) portal_ajustar_convite: Pix, titular, link e texto da lista só com
--      'gestao' (só o casal);
--   5) álbum, músicas e recados: escrita só com 'escrever'; músicas e
--      recados a família lê só com 'convidados' (o padrinho não lê);
--   6) o preço da opção nas Escolhas (decisao_opcao.valor): só quem vê o
--      Financeiro. As opções saem por uma RPC que zera o valor para os
--      outros, e a leitura direta da tabela fica só para 'financeiro'.
--
-- O app que vem junto (mesmo commit):
--   * src/lib/supabase/curadoria.ts lê as opções pela RPC nova; sem a 190
--     aplicada, cai na leitura direta de antes (as duas ordens funcionam);
--   * presentes/actions.ts: cadastrar o recebedor e a prova de vida só
--     com nível 'casal';
--   * o formulário "Acesso da cliente" grava o nível só no acesso NOVO
--     (casamento: mãe/pai nascem 'familia', o resto 'casal'); quem já
--     entra no evento mantém o nível que tem.
--
-- Convergente: pode rodar de novo. Não apaga dado, não muda o nível de
-- ninguém. Depois do commit, um bloco prova o "sim" com os dados de
-- verdade (o casal e a equipe continuam recebendo; diferença = erro) e
-- a conferência fecha (tudo true) — o item dos 27 embrulhos vale rodar
-- depois de QUALQUER migração.
-- ============================================================

-- a 190 vem depois da 189 (sem ela, os embrulhos daqui chamariam o vazio)
do $$
begin
  if to_regprocedure('public.portal_escrever_campo_base(uuid, jsonb, timestamptz)') is null
     or to_regprocedure('public.portal_ajustar_convite_base(uuid, text, text, text, text, text, text, text, text, text, text)') is null
     or to_regprocedure('public.eventos_da_cliente_na(text)') is null
     or to_regprocedure('public.portal_pode(uuid, text)') is null
     or to_regprocedure('public.portal_pode_fazer(uuid, text)') is null then
    raise exception 'a 190 vem depois da 189: aplique a 189 primeiro';
  end if;
end $$;

begin;

-- ------------------------------------------------------------
-- 1) evento_campo_valor: o número que a 189 escondeu nas RPCs também
--    não sai pela tabela; alergia e medicamento só com 'saude'
-- ------------------------------------------------------------
-- Dinheiro = o mesmo vocabulário das travas da 090 e da 146 (moeda,
-- verba_total, reserva_pct, valor%, orcamento% — este pega os
-- "Orçamentos (até 3)" em texto livre, que podem ter preço digitado).
-- Nenhuma tela do portal lê esses campos: getPerguntasDaCliente filtra
-- pergunta_cliente (dinheiro nunca é pergunta, 090/146), getDatasDoConvite
-- lê só data_envio_std/data_envio_convites. A pergunta de alergia e de
-- medicamento some da tela de quem não é do casal (é o pedido).
-- A equipe entra pela evento_campo_valor_select (089:112), que soma por OR.
-- 'to authenticated': o portal sempre tem sessão, e anon não executa
-- eventos_da_cliente*.
drop policy if exists portal_campo_valor_select on public.evento_campo_valor;
create policy portal_campo_valor_select on public.evento_campo_valor
  for select to authenticated using (
    event_id in (select public.eventos_da_cliente())
    and visivel_portal
    and evento_decisao_id in (
      select ed.id from public.evento_decisao ed
       where ed.event_id in (select public.eventos_da_cliente())
         and ed.responsavel in ('noivos', 'ambos'))
    -- dinheiro: só quem tem 'financeiro'
    and (not (tipo = 'moeda'
              or codigo in ('verba_total', 'reserva_pct')
              or codigo like 'valor%'
              or codigo like 'orcamento%')
         or event_id in (select public.eventos_da_cliente_na('financeiro')))
    -- alergia e medicamento: só quem tem 'saude' (hoje, só o casal)
    and (sensibilidade = 'normal'
         or event_id in (select public.eventos_da_cliente_na('saude')))
  );

-- ------------------------------------------------------------
-- 1b) Guia de estilo: a flor vetada por alergia só com 'saude'
-- ------------------------------------------------------------
-- A flor vetada leva o motivo_interno ("alergia da noiva", sensibilidade
-- 'alergia'), e o Guia de estilo é tela de todos os níveis: a 096 deixou
-- evento_guia_flor_select = pode_ver_guia() puro (eventos_da_cliente()),
-- e a 189 não passou por aqui. O mesmo nome da 096, para não somar outra
-- política por OR: a flor normal segue para todos; a de alergia, só para
-- a equipe e quem tem 'saude' (hoje, o casal). O _write da 096 é
-- pode_editar_guia (só a equipe) e não abre leitura para a família. O
-- link do fornecedor (guia_publico, 126) é security definer e lê só o
-- motivo_fornecedor: não muda.
drop policy if exists evento_guia_flor_select on public.evento_guia_flor;
create policy evento_guia_flor_select on public.evento_guia_flor
  for select to authenticated using (
    public.pode_ver_guia(guia_id)
    and (sensibilidade = 'normal'
         or exists (select 1 from public.evento_guia_estilo g
                     where g.id = evento_guia_flor.guia_id
                       and (g.event_id in (select public.eventos_visiveis())
                            or g.event_id in (select public.eventos_da_cliente_na('saude')))))
  );

-- ------------------------------------------------------------
-- 2) portal_escrever_campo: quem não vê, não responde
-- ------------------------------------------------------------
-- O embrulho da 189 + a área 'saude' para campo sensível. Abrir para a
-- mãe = pôr 'saude' na lista de 'familia' em nivel_permite (abre ler e
-- responder juntos). Moeda não precisa de guarda: a base já recusa campo
-- que não é pergunta, e moeda nunca é pergunta.
create or replace function public.portal_escrever_campo(
  p_campo_id uuid, p_valor jsonb, p_updated_at_visto timestamptz default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_ev   uuid;
  v_sens text;
begin
  select c.event_id, c.sensibilidade into v_ev, v_sens
    from public.evento_campo_valor c where c.id = p_campo_id;
  if v_ev is null or not public.portal_pode_fazer(v_ev, 'escrever') then
    raise exception 'sem permissão';
  end if;
  if coalesce(v_sens, 'normal') <> 'normal' and not public.portal_pode_fazer(v_ev, 'saude') then
    raise exception 'sem permissão';
  end if;
  return public.portal_escrever_campo_base(p_campo_id, p_valor, p_updated_at_visto);
end $$;

revoke all on function public.portal_escrever_campo(uuid, jsonb, timestamptz) from public, anon;
grant execute on function public.portal_escrever_campo(uuid, jsonb, timestamptz) to authenticated;

-- ------------------------------------------------------------
-- 3) pagamentos_fornecedor_por_mes: só a equipe (e a chave de serviço)
-- ------------------------------------------------------------
-- Ficou fora dos embrulhos da 189 e entregava o pago por fornecedor e
-- por mês a qualquer nível. Nenhuma tela chama a função (só um
-- comentário em src/lib/verba-fornecedores.ts), então a família sai de
-- vez — como numeros_do_fechamento e saldo_do_caixa_evento (097).
-- A guarda fica uma vez só, fora do agrupamento. O texto
-- "t.type = 'despesa'" fica idêntico para a conferência da 135 seguir true.
create or replace function public.pagamentos_fornecedor_por_mes(p_event_id uuid)
returns table (
  supplier_id   uuid,
  fornecedor    text,
  mes           date,
  total_pago    numeric,
  qtd_parcelas  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.supplier_id,
    s.name as fornecedor,
    date_trunc('month', coalesce(t.paid_at::date, t.due_date))::date as mes,
    sum(t.value) as total_pago,
    count(*) as qtd_parcelas
  from public.transactions t
  join public.suppliers s on s.id = t.supplier_id
  where (coalesce(auth.role(), '') = 'service_role'
         or public.pode_ver_evento(p_event_id))
    and t.event_id = p_event_id
    and t.conta = 'fornecedor'
    and t.type = 'despesa'                -- a regra canônica (135)
    and t.paid
  group by t.supplier_id, s.name, 3
  order by 3, s.name;
$$;

revoke all on function public.pagamentos_fornecedor_por_mes(uuid) from public, anon;
grant execute on function public.pagamentos_fornecedor_por_mes(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) portal_ajustar_convite: para onde vai o dinheiro é do casal
-- ------------------------------------------------------------
-- O NossoSite reenvia Pix, titular, link e texto a cada salvamento. Por
-- isso a trava compara com o que está salvo, normalizado como a base
-- normaliza (186:169-171): reenviar o mesmo valor passa (a mãe muda a cor
-- sem tocar no Pix), e mudar exige 'gestao'. 'for update': a comparação
-- e a gravação veem a mesma linha. A mensagem aparece na tela (o site
-- mostra a mensagem do P0001).
create or replace function public.portal_ajustar_convite(
  p_event_id uuid, p_historia_titulo text, p_dress_code_titulo text, p_cor_acento text,
  p_cor_tinta text, p_cor_fundo text, p_presentes_texto text, p_pix_chave text,
  p_pix_titular text, p_presentes_link text, p_foto_casal_path text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_s public.evento_site%rowtype;
begin
  if not public.portal_pode_fazer(p_event_id, 'escrever') then
    raise exception 'sem permissão';
  end if;
  select * into v_s from public.evento_site where event_id = p_event_id for update;
  if (nullif(left(btrim(coalesce(p_pix_chave, '')), 120), '') is distinct from v_s.pix_chave
      or nullif(left(btrim(coalesce(p_pix_titular, '')), 120), '') is distinct from v_s.pix_titular
      or nullif(btrim(coalesce(p_presentes_link, '')), '') is distinct from v_s.presentes_link
      or nullif(left(btrim(coalesce(p_presentes_texto, '')), 400), '') is distinct from v_s.presentes_texto)
     and not public.portal_pode_fazer(p_event_id, 'gestao') then
    raise exception 'A chave Pix e a lista de presentes são do casal.';
  end if;
  perform public.portal_ajustar_convite_base(p_event_id, p_historia_titulo, p_dress_code_titulo,
    p_cor_acento, p_cor_tinta, p_cor_fundo, p_presentes_texto, p_pix_chave, p_pix_titular,
    p_presentes_link, p_foto_casal_path);
end $$;

revoke all on function public.portal_ajustar_convite(
  uuid, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.portal_ajustar_convite(
  uuid, text, text, text, text, text, text, text, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- 5) álbum, músicas e recados
-- ------------------------------------------------------------
-- A 129 deixou <t>_select e <t>_write com eventos_da_cliente() puro:
-- 'leitura' apagava recados, e o padrinho lia os recados (com o nome do
-- convidado) e os pedidos de música (com sugerida_por).
--
-- O nome '<t>_write' e o FOR ALL ficam (a conferência da 130 conta 3
-- políticas '%_write' com eventos_da_cliente — segue true). Como um FOR
-- ALL também vale para SELECT, o _write de músicas e recados pede
-- 'convidados' junto com 'escrever': senão o padrinho, que escreve,
-- leria pelo _write o que o _select fechou.
--
-- O convidado não muda nada: ele escreve pelas RPCs com o hash do evento
-- (deixar_recado, sugerir_musica, registrar_foto_album) e lê pelo
-- site_publico — todas security definer, nenhuma passa por estas
-- políticas. A tela Músicas do padrinho lê evento_trilha, não estas.

-- álbum: todos veem (evento_album_foto_select da 129 fica como está);
-- mexe quem escreve
drop policy if exists evento_album_foto_write on public.evento_album_foto;
create policy evento_album_foto_write on public.evento_album_foto
  for all to authenticated
  using (public.pode_editar_evento(event_id)
         or event_id in (select public.eventos_da_cliente_na('escrever')))
  with check (public.pode_editar_evento(event_id)
              or event_id in (select public.eventos_da_cliente_na('escrever')));

-- pedidos de música: a família lê com 'convidados' (o padrinho não)
drop policy if exists evento_musica_select on public.evento_musica;
create policy evento_musica_select on public.evento_musica
  for select to authenticated
  using (event_id in (select public.eventos_visiveis())
         or event_id in (select public.eventos_da_cliente_na('convidados')));
drop policy if exists evento_musica_write on public.evento_musica;
create policy evento_musica_write on public.evento_musica
  for all to authenticated
  using (public.pode_editar_evento(event_id)
         or (event_id in (select public.eventos_da_cliente_na('convidados'))
             and event_id in (select public.eventos_da_cliente_na('escrever'))))
  with check (public.pode_editar_evento(event_id)
              or (event_id in (select public.eventos_da_cliente_na('convidados'))
                  and event_id in (select public.eventos_da_cliente_na('escrever'))));

-- recados: a mesma regra
drop policy if exists evento_recado_select on public.evento_recado;
create policy evento_recado_select on public.evento_recado
  for select to authenticated
  using (event_id in (select public.eventos_visiveis())
         or event_id in (select public.eventos_da_cliente_na('convidados')));
drop policy if exists evento_recado_write on public.evento_recado;
create policy evento_recado_write on public.evento_recado
  for all to authenticated
  using (public.pode_editar_evento(event_id)
         or (event_id in (select public.eventos_da_cliente_na('convidados'))
             and event_id in (select public.eventos_da_cliente_na('escrever'))))
  with check (public.pode_editar_evento(event_id)
              or (event_id in (select public.eventos_da_cliente_na('convidados'))
                  and event_id in (select public.eventos_da_cliente_na('escrever'))));

-- ------------------------------------------------------------
-- 6) O preço da opção nas Escolhas: só quem vê o Financeiro
-- ------------------------------------------------------------
-- RLS é por linha: não dá para esconder só a coluna valor de quem lê a
-- tabela. Então:
--   a) a leitura direta de decisao_opcao pela família passa a pedir
--      'financeiro' (só o casal). A equipe segue pela opcao_select (092);
--   b) as opções publicadas saem por uma RPC, para todo nível (e para a
--      equipe que abre o portal), com o valor zerado para quem não tem
--      'financeiro'. As mesmas colunas que o app lia pelo embed
--      (COLUNAS_OPCAO em src/lib/supabase/curadoria.ts) + curadoria_id.
-- As telas já tratam valor nulo (CartaoOpcao e PainelEscolhaV2 não
-- mostram o preço).
-- A RPC é a ÚLTIMA coisa criada aqui, de propósito: o app só grava um
-- nível diferente de 'casal' quando ela existe (acesso-cliente-actions.ts).
drop policy if exists portal_opcao_select on public.decisao_opcao;
create policy portal_opcao_select on public.decisao_opcao
  for select to authenticated using (
    curadoria_id in (
      select c.id from public.decisao_curadoria c
       where c.event_id in (select public.eventos_da_cliente_na('financeiro'))
         and c.estado in ('publicada', 'escolhida', 'recusada'))
  );

create or replace function public.portal_opcoes_das_escolhas(p_event_id uuid)
returns table (
  curadoria_id  uuid,
  id            uuid,
  nome          text,
  descricao     text,
  valor         numeric,
  inclui        text[],
  prazo_reserva date,
  nota          text,
  foto_path     text,
  recomendada   boolean,
  supplier_id   uuid,
  ordem         int
)
language sql
stable
security definer
set search_path = public
as $$
  select o.curadoria_id, o.id, o.nome, o.descricao,
         case when public.portal_pode(p_event_id, 'financeiro') then o.valor end,
         o.inclui, o.prazo_reserva, o.nota, o.foto_path, o.recomendada,
         o.supplier_id, o.ordem
    from public.decisao_opcao o
    join public.decisao_curadoria c on c.id = o.curadoria_id
   where public.portal_pode(p_event_id, 'ver')
     and c.event_id = p_event_id
     and c.estado in ('publicada', 'escolhida', 'recusada')
   order by o.curadoria_id, o.ordem;
$$;

revoke all on function public.portal_opcoes_das_escolhas(uuid) from public, anon;
grant execute on function public.portal_opcoes_das_escolhas(uuid) to authenticated;

commit;

-- ------------------------------------------------------------
-- O "sim": o casal e a equipe continuam recebendo
-- ------------------------------------------------------------
-- A conferência no fim prova o "não" (o catálogo, e que sem sessão nada
-- sai). Este bloco prova o outro lado com os dados de verdade e sem
-- gravar nada. Entra como até 5 acessos 'casal' ativos (de fora da
-- equipe) do jeito que o PostgREST entra — as claims da sessão e o papel
-- authenticated, os dois só nesta transação — e compara o que cada um
-- recebe com o que a regra de antes entregaria (089, 092, 096, 129): os
-- campos do portal, as opções com preço (pela RPC e pela tabela), as
-- flores do guia, os recados e os pedidos de música. Depois, como alguém
-- da equipe, o pago por fornecedor contra a chave de serviço.
-- Diferença = erro (para aqui, e a conferência não roda); sem dado para
-- provar = só o aviso com a contagem. No fim, volta o papel e as claims.
do $$
declare
  v_claims text := current_setting('request.jwt.claims', true);
  v_sub    text := current_setting('request.jwt.claim.sub', true);
  v_role   text := current_setting('request.jwt.claim.role', true);
  r        record;
  v_curs   uuid[];
  v_guias  uuid[];
  v_rls    boolean := true;
  e_campos int; e_opc int; e_preco int; e_flor int; e_rec int; e_mus int;
  o_campos int; o_opc int; o_preco int; o_tab int; o_tab_preco int;
  o_flor int; o_rec int; o_mus int;
  e_pag int; e_soma numeric; o_pag int; o_soma numeric;
  v_casais int := 0;
  v_equipe int := 0;
begin
  -- 1) o casal: tudo o que o portal mostrava continua chegando
  for r in
    select a.user_id, a.event_id
      from public.evento_acesso a
     where a.nivel = 'casal' and a.status = 'ativo' and a.user_id is not null
       and not exists (select 1 from public.membros_equipe m where m.user_id = a.user_id)
     order by exists (select 1 from public.decisao_curadoria c
                        join public.decisao_opcao o on o.curadoria_id = c.id
                       where c.event_id = a.event_id
                         and c.estado in ('publicada', 'escolhida', 'recusada')
                         and o.valor is not null) desc,
              a.created_at desc
     limit 5
  loop
    perform set_config('request.jwt.claims',
                       json_build_object('sub', r.user_id, 'role', 'authenticated')::text, true),
            set_config('request.jwt.claim.sub', r.user_id::text, true),
            set_config('request.jwt.claim.role', 'authenticated', true);

    -- o esperado, pela regra de antes (aqui ainda como dono das tabelas)
    select count(*) into e_campos
      from public.evento_campo_valor c
     where c.event_id = r.event_id
       and c.event_id in (select public.eventos_da_cliente())
       and c.visivel_portal
       and c.evento_decisao_id in (
             select ed.id from public.evento_decisao ed
              where ed.event_id in (select public.eventos_da_cliente())
                and ed.responsavel in ('noivos', 'ambos'));
    select coalesce(array_agg(c.id), '{}') into v_curs
      from public.decisao_curadoria c
     where c.event_id = r.event_id and c.estado in ('publicada', 'escolhida', 'recusada');
    select count(*), count(o.valor) into e_opc, e_preco
      from public.decisao_opcao o where o.curadoria_id = any (v_curs);
    select coalesce(array_agg(g.id), '{}') into v_guias
      from public.evento_guia_estilo g where g.event_id = r.event_id;
    select count(*) into e_flor from public.evento_guia_flor f where f.guia_id = any (v_guias);
    select count(*) into e_rec from public.evento_recado x where x.event_id = r.event_id;
    select count(*) into e_mus from public.evento_musica x where x.event_id = r.event_id;

    -- a RPC (security definer: só lê as claims)
    select count(*), count(x.valor) into o_opc, o_preco
      from public.portal_opcoes_das_escolhas(r.event_id) x;

    -- as tabelas, com a RLS de quem está logado
    begin
      execute 'set local role authenticated';
    exception when others then
      v_rls := false;
    end;
    if v_rls then
      select count(*) into o_campos from public.evento_campo_valor x where x.event_id = r.event_id;
      select count(*), count(x.valor) into o_tab, o_tab_preco
        from public.decisao_opcao x where x.curadoria_id = any (v_curs);
      select count(*) into o_flor from public.evento_guia_flor x where x.guia_id = any (v_guias);
      select count(*) into o_rec from public.evento_recado x where x.event_id = r.event_id;
      select count(*) into o_mus from public.evento_musica x where x.event_id = r.event_id;
      execute 'reset role';
    end if;

    if o_opc <> e_opc or o_preco <> e_preco
       or (v_rls and (o_campos <> e_campos or o_tab <> e_opc or o_tab_preco <> e_preco
                      or o_flor <> e_flor or o_rec <> e_rec or o_mus <> e_mus)) then
      raise exception 'a 190 tirou algo do casal (acesso %, evento %): campos %/%, opções pela RPC %/% (preço %/%), opções pela tabela %/% (preço %/%), flores %/%, recados %/%, músicas %/% (recebido/esperado)',
        r.user_id, r.event_id, o_campos, e_campos, o_opc, e_opc, o_preco, e_preco,
        o_tab, e_opc, o_tab_preco, e_preco, o_flor, e_flor, o_rec, e_rec, o_mus, e_mus;
    end if;
    if e_campos + e_opc + e_flor + e_rec + e_mus > 0 then
      v_casais := v_casais + 1;
    end if;
  end loop;

  -- 2) a equipe: o pago por fornecedor igual ao da chave de serviço
  for r in
    select x.event_id, x.user_id
      from (select distinct on (t.event_id) t.event_id, m.user_id
              from public.transactions t
              join public.events e on e.id = t.event_id
              join public.membros_equipe m on m.empresa_id = e.empresa_id
             where t.conta = 'fornecedor' and t.type = 'despesa' and t.paid
               and t.supplier_id is not null and m.user_id is not null
             order by t.event_id, m.is_owner desc nulls last) x
     limit 5
  loop
    perform set_config('request.jwt.claims',
                       json_build_object('sub', r.user_id, 'role', 'authenticated')::text, true),
            set_config('request.jwt.claim.sub', r.user_id::text, true),
            set_config('request.jwt.claim.role', 'authenticated', true);
    continue when not public.pode_ver_evento(r.event_id);
    select count(*), coalesce(sum(x.total_pago), 0) into o_pag, o_soma
      from public.pagamentos_fornecedor_por_mes(r.event_id) x;
    perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true),
            set_config('request.jwt.claim.sub', '', true),
            set_config('request.jwt.claim.role', 'service_role', true);
    select count(*), coalesce(sum(x.total_pago), 0) into e_pag, e_soma
      from public.pagamentos_fornecedor_por_mes(r.event_id) x;
    if e_pag = 0 or o_pag <> e_pag or o_soma <> e_soma then
      raise exception 'a 190 tirou da equipe o pago por fornecedor (usuário %, evento %): % linhas / % (recebido/chave de serviço), soma % / %',
        r.user_id, r.event_id, o_pag, e_pag, o_soma, e_soma;
    end if;
    v_equipe := v_equipe + 1;
  end loop;

  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true),
          set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true),
          set_config('request.jwt.claim.role', coalesce(v_role, ''), true);
  if not v_rls then
    raise notice '190, o "sim": este usuário não troca para authenticated; as tabelas não foram provadas, só as RPCs';
  end if;
  raise notice '190, o "sim": % acesso(s) do casal e % evento(s) da equipe provados (sem diferença)', v_casais, v_equipe;
end $$;

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
-- O "não": a regra (nivel_permite, chamada de verdade), o catálogo
-- (políticas, corpos, privilégios) e que, sem sessão, as duas funções de
-- leitura não devolvem nada. O "sim" (o casal e a equipe) é o bloco de
-- cima. A prova dos outros níveis é com login temporário 'familia' e
-- 'padrinho' depois de aplicar (hoje não existe nenhum no banco).
select 'a regra: dinheiro e saúde só o casal; padrinho sem convidados; leitura não escreve; Pix só o casal' as item,
       (select bool_and(public.nivel_permite(n, 'financeiro') = (n = 'casal')
                        and public.nivel_permite(n, 'saude') = (n = 'casal')
                        and public.nivel_permite(n, 'gestao') = (n = 'casal')
                        and public.nivel_permite(n, 'convidados') = (n <> 'padrinho')
                        and public.nivel_permite(n, 'escrever') = (n <> 'leitura')
                        and public.nivel_permite(n, 'ver'))
          from unnest(array['casal', 'familia', 'aprova', 'leitura', 'padrinho']) n) as ok
union all
select 'o nível que o app grava cabe no CHECK da 189',
       exists (select 1 from pg_constraint
                where conrelid = 'public.evento_acesso'::regclass
                  and conname = 'evento_acesso_nivel_check'
                  and pg_get_constraintdef(oid) ~ 'casal'
                  and pg_get_constraintdef(oid) ~ 'familia'
                  and pg_get_constraintdef(oid) ~ 'aprova'
                  and pg_get_constraintdef(oid) ~ 'leitura'
                  and pg_get_constraintdef(oid) ~ 'padrinho')
union all
select 'evento_campo_valor: dinheiro só com financeiro, alergia e medicamento só com saude',
       exists (select 1 from pg_policies
                where schemaname = 'public' and tablename = 'evento_campo_valor'
                  and policyname = 'portal_campo_valor_select'
                  and cmd = 'SELECT'
                  and roles = array['authenticated']::name[]
                  and qual ~ 'eventos_da_cliente_na\(''financeiro'''
                  and qual ~ 'moeda' and qual ~ 'verba_total' and qual ~ 'reserva_pct'
                  and qual ~ 'valor%' and qual ~ 'orcamento%'
                  and qual ~ 'sensibilidade'
                  and qual ~ 'eventos_da_cliente_na\(''saude''')
union all
select 'evento_campo_valor: nenhuma outra política abre para a família',
       not exists (select 1 from pg_policies
                    where schemaname = 'public' and tablename = 'evento_campo_valor'
                      and policyname <> 'portal_campo_valor_select'
                      and (coalesce(qual, '') ~ 'eventos_da_cliente'
                           or coalesce(with_check, '') ~ 'eventos_da_cliente'))
union all
select 'Guia de estilo: a flor vetada por alergia só com saude (a equipe segue vendo)',
       exists (select 1 from pg_policies
                where schemaname = 'public' and tablename = 'evento_guia_flor'
                  and policyname = 'evento_guia_flor_select'
                  and cmd = 'SELECT'
                  and roles = array['authenticated']::name[]
                  and qual ~ 'pode_ver_guia'
                  and qual ~ 'sensibilidade'
                  and qual ~ 'eventos_visiveis'
                  and qual ~ 'eventos_da_cliente_na\(''saude''')
       -- nenhuma outra política abre a flor para a família (somaria por OR)
       and not exists (select 1 from pg_policies
                        where schemaname = 'public' and tablename = 'evento_guia_flor'
                          and policyname <> 'evento_guia_flor_select'
                          and (coalesce(qual, '') ~ 'pode_ver_guia|eventos_da_cliente'
                               or coalesce(with_check, '') ~ 'pode_ver_guia|eventos_da_cliente'))
       -- e o _write (FOR ALL também lê) continua só da equipe
       and coalesce((select p.prosrc not like '%eventos_da_cliente%'
                            and p.prosrc like '%pode_editar_evento%'
                       from pg_proc p
                      where p.oid = to_regprocedure('public.pode_editar_guia(uuid)')), false)
union all
select 'quem não vê alergia ou medicamento não responde (e o embrulho continua embrulho)',
       coalesce((select p.prosrc like '%portal_pode_fazer(v_ev, ''escrever'')%'
                        and p.prosrc like '%sensibilidade%'
                        and p.prosrc like '%portal_pode_fazer(v_ev, ''saude'')%'
                        and p.prosrc like '%portal_escrever_campo_base(%'
                        and p.prosecdef
                        and array_to_string(p.proconfig, ',') like '%search_path=public%'
                   from pg_proc p
                  where p.oid = to_regprocedure('public.portal_escrever_campo(uuid, jsonb, timestamptz)')), false)
       and has_function_privilege('authenticated', 'public.portal_escrever_campo(uuid, jsonb, timestamptz)', 'execute')
       and not has_function_privilege('anon', 'public.portal_escrever_campo(uuid, jsonb, timestamptz)', 'execute')
union all
select 'pagamentos por fornecedor: só a equipe e a chave de serviço (e a regra da 135 continua)',
       coalesce((select p.prosrc like '%pode_ver_evento(p_event_id)%'
                        and p.prosrc like '%service_role%'
                        and p.prosrc not like '%sou_cliente_do_evento%'
                        and p.prosrc not like '%familia_pode%'
                        and p.prosrc not like '%eventos_da_cliente%'
                        and p.prosrc not like '%portal_pode%'
                        and p.prosrc like '%type = ''despesa''%'
                        and p.prosecdef
                        and array_to_string(p.proconfig, ',') like '%search_path=public%'
                   from pg_proc p
                  where p.oid = to_regprocedure('public.pagamentos_fornecedor_por_mes(uuid)')), false)
       and has_function_privilege('authenticated', 'public.pagamentos_fornecedor_por_mes(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.pagamentos_fornecedor_por_mes(uuid)', 'execute')
       -- sem sessão (o SQL Editor), nada sai — nem do evento que tem pagamento
       and not exists (select 1 from public.pagamentos_fornecedor_por_mes(
             (select t.event_id from public.transactions t
               where t.conta = 'fornecedor' and t.type = 'despesa' and t.paid
               limit 1)))
union all
select 'chave Pix, titular, link e texto da lista: só com gestao, comparando com o salvo',
       coalesce((select p.prosrc like '%portal_pode_fazer(p_event_id, ''escrever'')%'
                        and p.prosrc like '%portal_pode_fazer(p_event_id, ''gestao'')%'
                        and p.prosrc like '%is distinct from v_s.pix_chave%'
                        and p.prosrc like '%is distinct from v_s.pix_titular%'
                        and p.prosrc like '%is distinct from v_s.presentes_link%'
                        and p.prosrc like '%is distinct from v_s.presentes_texto%'
                        and p.prosrc like '%for update%'
                        and p.prosrc like '%portal_ajustar_convite_base(%'
                        and p.prosecdef
                   from pg_proc p
                  where p.oid = to_regprocedure('public.portal_ajustar_convite(uuid, text, text, text, text, text, text, text, text, text, text)')), false)
       and has_function_privilege('authenticated', 'public.portal_ajustar_convite(uuid, text, text, text, text, text, text, text, text, text, text)', 'execute')
       and not has_function_privilege('anon', 'public.portal_ajustar_convite(uuid, text, text, text, text, text, text, text, text, text, text)', 'execute')
union all
select 'álbum, músicas e recados: escrita só com escrever (o leitura não apaga)',
       (select count(*) = 3 from pg_policies
         where schemaname = 'public'
           and tablename in ('evento_album_foto', 'evento_musica', 'evento_recado')
           and policyname = tablename || '_write'
           and cmd = 'ALL'
           and roles = array['authenticated']::name[]
           and qual ~ 'pode_editar_evento' and qual ~ 'eventos_da_cliente_na\(''escrever'''
           and with_check ~ 'eventos_da_cliente_na\(''escrever''')
       -- nenhuma política que escreve nas três ainda usa eventos_da_cliente() puro
       and not exists (select 1 from pg_policies
                        where schemaname = 'public'
                          and tablename in ('evento_album_foto', 'evento_musica', 'evento_recado')
                          and cmd <> 'SELECT'
                          and (coalesce(qual, '') ~ 'eventos_da_cliente\(\)'
                               or coalesce(with_check, '') ~ 'eventos_da_cliente\(\)'))
union all
select 'músicas e recados: o padrinho não lê nem pelo _select nem pelo _write',
       (select count(*) = 4 from pg_policies
         where schemaname = 'public'
           and tablename in ('evento_musica', 'evento_recado')
           and policyname in (tablename || '_select', tablename || '_write')
           and roles = array['authenticated']::name[]
           and qual ~ 'eventos_da_cliente_na\(''convidados''')
       and not exists (select 1 from pg_policies
                        where schemaname = 'public'
                          and tablename in ('evento_musica', 'evento_recado')
                          and (coalesce(qual, '') ~ 'eventos_da_cliente\(\)'
                               or coalesce(with_check, '') ~ 'eventos_da_cliente\(\)'))
union all
select 'as conferências da 129 e da 130 continuam true (sem anon; 3 _write da família)',
       not exists (select 1 from pg_policies
                    where schemaname = 'public'
                      and tablename in ('evento_album_foto', 'evento_musica', 'evento_recado')
                      and 'anon' = any(roles))
       and (select count(*) = 3 from pg_policies
             where schemaname = 'public'
               and tablename in ('evento_album_foto', 'evento_recado', 'evento_musica')
               and policyname like '%_write'
               and coalesce(qual, with_check) like '%eventos_da_cliente%')
union all
select 'preço da opção: a tabela só para o financeiro; a RPC zera o valor dos outros',
       exists (select 1 from pg_policies
                where schemaname = 'public' and tablename = 'decisao_opcao'
                  and policyname = 'portal_opcao_select'
                  and cmd = 'SELECT'
                  and roles = array['authenticated']::name[]
                  and qual ~ 'eventos_da_cliente_na\(''financeiro''')
       and not exists (select 1 from pg_policies
                        where schemaname = 'public' and tablename = 'decisao_opcao'
                          and (coalesce(qual, '') ~ 'eventos_da_cliente\(\)'
                               or coalesce(with_check, '') ~ 'eventos_da_cliente\(\)'))
       and coalesce((select p.prosrc like '%case when public.portal_pode(p_event_id, ''financeiro'') then o.valor end%'
                            and p.prosrc like '%portal_pode(p_event_id, ''ver'')%'
                            and p.prosrc like '%''publicada'', ''escolhida'', ''recusada''%'
                            and p.prosecdef
                            and array_to_string(p.proconfig, ',') like '%search_path=public%'
                            and pg_get_function_result(p.oid) like '%curadoria_id uuid%'
                            and pg_get_function_result(p.oid) like '%valor numeric%'
                            and pg_get_function_result(p.oid) like '%foto_path text%'
                       from pg_proc p
                      where p.oid = to_regprocedure('public.portal_opcoes_das_escolhas(uuid)')), false)
       and has_function_privilege('authenticated', 'public.portal_opcoes_das_escolhas(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.portal_opcoes_das_escolhas(uuid)', 'execute')
       -- sem sessão (o SQL Editor), nenhuma opção sai — nem de rodada publicada
       and not exists (select 1 from public.portal_opcoes_das_escolhas(
             (select c.event_id from public.decisao_curadoria c
               where c.estado in ('publicada', 'escolhida', 'recusada')
               limit 1)))
union all
select 'os 27 embrulhos da 189 continuam embrulhos (nenhuma migração antiga por cima)',
       (select count(*) = 27
               and coalesce(bool_and(
                     r.emb is not null and r.base is not null
                     and position(r.nome || '_base(' in p.prosrc) > 0
                     and p.prosrc like '%portal_pode%'
                     and has_function_privilege('authenticated', r.emb::oid, 'execute')
                     and not has_function_privilege('anon', r.emb::oid, 'execute')
                     and not has_function_privilege('authenticated', r.base::oid, 'execute')
                     and not has_function_privilege('anon', r.base::oid, 'execute')), false)
          from (select v.nome,
                       to_regprocedure(format('public.%s(%s)', v.nome, v.args)) as emb,
                       to_regprocedure(format('public.%s_base(%s)', v.nome, v.args)) as base
                  from (values
                    ('portal_investimento', 'uuid'),
                    ('portal_prestacao_de_contas', 'uuid'),
                    ('portal_dinheiro', 'uuid'),
                    ('portal_marcar_pago', 'uuid, date, text, text'),
                    ('portal_desfazer_pago', 'uuid'),
                    ('portal_enviar_gasto', 'uuid'),
                    ('portal_fornecedores_contratados', 'uuid'),
                    ('portal_linha_do_tempo', 'uuid'),
                    ('portal_salao', 'uuid'),
                    ('portal_fornecedores_da_festa', 'uuid'),
                    ('portal_definir_rsvp_aberto', 'uuid, boolean'),
                    ('portal_definir_lembrete', 'uuid, integer'),
                    ('portal_enviar_site_para_revisao', 'uuid'),
                    ('definir_slug_site', 'uuid, text'),
                    ('publicar_site', 'uuid, boolean'),
                    ('portal_salvar_site', 'uuid, text, text, text'),
                    ('portal_ajustar_convite', 'uuid, text, text, text, text, text, text, text, text, text, text'),
                    ('portal_definir_blocos', 'uuid, boolean, boolean, boolean'),
                    ('portal_salvar_estrutura_site', 'uuid, jsonb, jsonb'),
                    ('portal_paleta_salvar', 'uuid, jsonb, text'),
                    ('portal_escrever_campo', 'uuid, jsonb, timestamptz'),
                    ('portal_concluir_tarefa', 'uuid, boolean'),
                    ('sugerir_no_cronograma', 'uuid, text, uuid, time, text, text'),
                    ('portal_desfazer_escolha', 'uuid'),
                    ('responder_curadoria', 'uuid, uuid, text'),
                    ('aprovar_guia_estilo', 'uuid'),
                    ('pedir_ajuste_guia', 'uuid, text')
                  ) v(nome, args)) r
          left join pg_proc p on p.oid = r.emb)
union all
select 'os helpers de storage continuam com o nível',
       (select count(*) = 3 and coalesce(bool_and(p.prosrc like '%familia_pode%'), false)
          from pg_proc p
         where p.oid in (to_regprocedure('public.pode_subir_imagem_evento(text)'),
                         to_regprocedure('public.pode_mexer_album(text)'),
                         to_regprocedure('public.pode_usar_comprovante_familia(text)')));
