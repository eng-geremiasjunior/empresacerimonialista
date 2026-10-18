-- ============================================================
-- 214 — O Comercial robusto: formulário dela, reunião ligada à
--       oportunidade e o pedido chegando ao evento (18/10/2026)
-- ============================================================
-- Pedido dele: "cansei de engessar e adivinhar o que é melhor para os
-- assessores". O formulário da página profissional ganha:
--   * a base fixa de sempre (nome, WhatsApp, tipo, data, cidade), que
--     alimenta a proposta e o evento;
--   * campos opcionais que ela liga e desliga (e-mail, convidados,
--     mensagem, "que tipo de serviço procura");
--   * até 10 perguntas DELA (texto curto, texto longo, escolha única,
--     várias escolhas, data, sim/não).
--
-- O que muda no banco, tudo aditivo:
--   1) empresa_pagina.formulario (jsonb) — a configuração, conferida por
--      formulario_valido() num CHECK.
--   2) pedido_orcamento.servico_desejado e .respostas — gravados pela ROTA
--      do servidor (chave de serviço) depois de validar contra o formulário.
--      A função pública registrar_pedido_publico NÃO muda.
--   3) pagina_publica() devolve também o formulário (é o que a página
--      desenha; nada interno). Mesmo corpo da 165, mais um campo.
--   4) agenda_item ganha orcamento_id e pedido_id: "Marcar reunião" na
--      oportunidade cria o compromisso já ligado a ela. Um gatilho recusa
--      ligar a proposta ou o pedido de OUTRA empresa.
--   5) quando a proposta que nasceu de um pedido vira evento, o recado, o
--      serviço e as respostas entram como anotação do evento (event_notes,
--      a que aparece no Resumo e no Caderno). O gatilho engole qualquer
--      erro: nunca derruba o aceite.
--
-- Rodar inteiro no SQL Editor. Pode rodar de novo. No fim, a conferência:
-- todas as linhas devem voltar `true`.

begin;

-- ------------------------------------------------------------
-- 1) O formulário dela
-- ------------------------------------------------------------
create or replace function public.formulario_valido(f jsonb)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_p    jsonb;
  v_o    jsonb;
  v_ids  text[] := '{}';
  v_tipo text;
  v_n    int;
begin
  if f is null then
    return true;
  end if;
  if jsonb_typeof(f) <> 'object' or octet_length(f::text) > 20000 then
    return false;
  end if;
  -- lista fechada: o formulário vai inteiro para a página pública, então
  -- nenhuma chave fora destas pode morar aqui
  if exists (
    select 1 from jsonb_object_keys(f) k
    where k not in ('intro_titulo', 'intro_texto', 'mostrar', 'servico_opcoes', 'perguntas')
  ) then
    return false;
  end if;

  -- a introdução: título e texto dela
  if f ? 'intro_titulo' and jsonb_typeof(f->'intro_titulo') not in ('string', 'null') then return false; end if;
  if char_length(coalesce(f->>'intro_titulo', '')) > 80 then return false; end if;
  if f ? 'intro_texto' and jsonb_typeof(f->'intro_texto') not in ('string', 'null') then return false; end if;
  if char_length(coalesce(f->>'intro_texto', '')) > 300 then return false; end if;

  -- os opcionais ligados ou desligados: só estes quatro, só booleano
  if f ? 'mostrar' then
    if jsonb_typeof(f->'mostrar') <> 'object' then return false; end if;
    if exists (
      select 1 from jsonb_each(f->'mostrar') e
      where e.key not in ('email', 'convidados', 'mensagem', 'servico')
         or jsonb_typeof(e.value) <> 'boolean'
    ) then
      return false;
    end if;
  end if;

  -- as opções de "que tipo de serviço procura"
  if f ? 'servico_opcoes' then
    if jsonb_typeof(f->'servico_opcoes') <> 'array' or jsonb_array_length(f->'servico_opcoes') > 8 then
      return false;
    end if;
    for v_o in select value from jsonb_array_elements(f->'servico_opcoes') loop
      if jsonb_typeof(v_o) <> 'string' or char_length(btrim(v_o #>> '{}')) not between 1 and 60 then
        return false;
      end if;
    end loop;
  end if;

  -- as perguntas dela
  if f ? 'perguntas' then
    if jsonb_typeof(f->'perguntas') <> 'array' or jsonb_array_length(f->'perguntas') > 10 then
      return false;
    end if;
    for v_p in select value from jsonb_array_elements(f->'perguntas') loop
      if jsonb_typeof(v_p) <> 'object' then return false; end if;
      if exists (
        select 1 from jsonb_object_keys(v_p) k
        where k not in ('id', 'titulo', 'descricao', 'tipo', 'obrigatoria', 'opcoes')
      ) then
        return false;
      end if;
      if jsonb_typeof(v_p->'id') is distinct from 'string'
         or jsonb_typeof(v_p->'titulo') is distinct from 'string'
         or jsonb_typeof(v_p->'tipo') is distinct from 'string'
         or (v_p ? 'descricao' and jsonb_typeof(v_p->'descricao') <> 'string') then
        return false;
      end if;
      if coalesce(v_p->>'id', '') !~ '^[a-z0-9]{4,16}$' then return false; end if;
      if (v_p->>'id') = any (v_ids) then return false; end if;
      v_ids := v_ids || (v_p->>'id');
      if char_length(btrim(coalesce(v_p->>'titulo', ''))) not between 1 and 120 then return false; end if;
      if char_length(coalesce(v_p->>'descricao', '')) > 200 then return false; end if;
      v_tipo := coalesce(v_p->>'tipo', '');
      if v_tipo not in ('texto_curto', 'texto_longo', 'escolha', 'multipla', 'data', 'sim_nao') then
        return false;
      end if;
      if jsonb_typeof(coalesce(v_p->'obrigatoria', 'false'::jsonb)) <> 'boolean' then return false; end if;
      if v_tipo in ('escolha', 'multipla') then
        if jsonb_typeof(coalesce(v_p->'opcoes', 'null'::jsonb)) <> 'array' then return false; end if;
        v_n := jsonb_array_length(v_p->'opcoes');
        if v_n < 2 or v_n > 10 then return false; end if;
        for v_o in select value from jsonb_array_elements(v_p->'opcoes') loop
          if jsonb_typeof(v_o) <> 'string' or char_length(btrim(v_o #>> '{}')) not between 1 and 60 then
            return false;
          end if;
        end loop;
      end if;
    end loop;
  end if;

  return true;
end;
$$;

comment on function public.formulario_valido(jsonb) is
  'O formulário da página profissional (214): introdução, opcionais ligados, opções de serviço e até 10 perguntas dela, com tipo, tamanho e ids únicos conferidos.';

alter table public.empresa_pagina add column if not exists formulario jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'empresa_pagina_formulario_check') then
    alter table public.empresa_pagina add constraint empresa_pagina_formulario_check
      check (public.formulario_valido(formulario));
  end if;
end $$;

-- ------------------------------------------------------------
-- 2) O que a pessoa respondeu
-- ------------------------------------------------------------
-- respostas: [{ "id", "titulo", "resposta" }] — o título vai junto, da
-- hora em que foi respondido: ela editar a pergunta depois não embaralha
-- as respostas antigas. A resposta é sempre texto (a rota formata data,
-- sim/não e várias escolhas).
alter table public.pedido_orcamento add column if not exists servico_desejado text;
alter table public.pedido_orcamento add column if not exists respostas jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pedido_orcamento_servico_check') then
    alter table public.pedido_orcamento add constraint pedido_orcamento_servico_check
      check (servico_desejado is null or char_length(servico_desejado) between 1 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pedido_orcamento_respostas_check') then
    alter table public.pedido_orcamento add constraint pedido_orcamento_respostas_check
      check (
        respostas is null
        or (jsonb_typeof(respostas) = 'array'
            and jsonb_array_length(respostas) <= 10
            and octet_length(respostas::text) <= 16000)
      );
  end if;
end $$;

-- ------------------------------------------------------------
-- 3) A página pública devolve o formulário
-- ------------------------------------------------------------
-- Corpo idêntico ao da 165, mais 'formulario'. (A 165 continua sendo a
-- fonte do resto; reaplicar a 165 exige reaplicar esta depois.)
create or replace function public.pagina_publica(p_ref text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ref     text := lower(trim(coalesce(p_ref, '')));
  v_empresa uuid;
  v_atual   text;
  v_pag     public.empresa_pagina%rowtype;
  v_nome    text;
  v_logo    text;
begin
  select s.empresa_id into v_empresa
  from public.empresa_pagina_slug s
  where s.slug = v_ref;

  if v_empresa is null then
    return null;
  end if;

  select * into v_pag from public.empresa_pagina p where p.empresa_id = v_empresa;
  if not found or not v_pag.publicada then
    return null;
  end if;

  select s.slug into v_atual
  from public.empresa_pagina_slug s
  where s.empresa_id = v_empresa and s.atual;

  select e.nome, e.logo_url into v_nome, v_logo
  from public.empresas e where e.id = v_empresa;

  return json_build_object(
    'slug_atual', v_atual,
    'por_slug_antigo', v_atual is distinct from v_ref,
    'nome_empresa', v_nome,
    'logo_url', v_logo,
    'titulo', v_pag.titulo,
    'posicionamento', v_pag.posicionamento,
    'para_quem', v_pag.para_quem,
    'cidade', v_pag.cidade,
    'tipos_atendidos', to_json(v_pag.tipos_atendidos),
    'servicos', v_pag.servicos,
    'motivos', to_json(v_pag.motivos),
    'whatsapp', v_pag.whatsapp,
    'instagram', v_pag.instagram,
    -- o pixel dela: o navegador só o carrega depois de a pessoa permitir
    'pixel_meta', v_pag.pixel_meta,
    -- o desenho que ela escolheu (só a forma; os dados são os mesmos)
    'modelo', v_pag.modelo,
    -- o retrato dela, que ela mesma pôs na página
    'retrato_url', v_pag.retrato_url,
    -- a paleta: só o nome; as cores moram no código
    'paleta', v_pag.paleta,
    -- o vídeo dela e a capa (os dois só dos baldes da própria empresa)
    'video_url', v_pag.video_url,
    'video_capa_url', v_pag.video_capa_url,
    -- o formulário dela (214): é o que a página desenha
    'formulario', v_pag.formulario,
    'fotos', coalesce((
      select json_agg(f)
      from (
        select pf.url, pf.legenda, pf.tipo_evento
        from public.portfolio_fotos pf
        where pf.empresa_id = v_empresa and pf.ativo and pf.na_pagina
        order by pf.tipo_evento, pf.ordem, pf.created_at
        limit 24
      ) f
    ), '[]'::json),
    'depoimentos', coalesce((
      select json_agg(d)
      from (
        select dp.texto, dp.autor, dp.contexto, dp.tipo_evento
        from public.empresa_depoimentos dp
        where dp.empresa_id = v_empresa and dp.ativo and dp.na_pagina
        order by dp.ordem, dp.created_at
        limit 12
      ) d
    ), '[]'::json)
  );
end;
$$;

revoke all on function public.pagina_publica(text) from public;
grant execute on function public.pagina_publica(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) A reunião ligada à oportunidade
-- ------------------------------------------------------------
alter table public.agenda_item
  add column if not exists orcamento_id uuid references public.orcamentos (id) on delete set null;
alter table public.agenda_item
  add column if not exists pedido_id uuid references public.pedido_orcamento (id) on delete set null;

create index if not exists idx_agenda_item_orcamento on public.agenda_item (orcamento_id) where orcamento_id is not null;
create index if not exists idx_agenda_item_pedido on public.agenda_item (pedido_id) where pedido_id is not null;

-- a proposta e o pedido têm de ser da MESMA empresa do compromisso. Roda
-- depois de trg_fill_empresa (ordem alfabética), com a empresa já posta.
create or replace function public.agenda_item_vinculo_da_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.orcamento_id is not null and not exists (
    select 1 from public.orcamentos o where o.id = new.orcamento_id and o.empresa_id = new.empresa_id
  ) then
    raise exception 'proposta de outra empresa' using errcode = '42501';
  end if;
  if new.pedido_id is not null and not exists (
    select 1 from public.pedido_orcamento p where p.id = new.pedido_id and p.empresa_id = new.empresa_id
  ) then
    raise exception 'pedido de outra empresa' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.agenda_item_vinculo_da_empresa() from public, anon, authenticated;

drop trigger if exists trg_vinculo_comercial on public.agenda_item;
create trigger trg_vinculo_comercial before insert or update of orcamento_id, pedido_id, empresa_id
  on public.agenda_item
  for each row execute function public.agenda_item_vinculo_da_empresa();

-- ------------------------------------------------------------
-- 5) O pedido chega ao evento
-- ------------------------------------------------------------
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
begin
  begin
    select * into v_ped from public.pedido_orcamento p
     where p.id = new.pedido_id and p.empresa_id = new.empresa_id;
    if not found then
      return new;
    end if;
    -- o evento também tem de ser da MESMA empresa: sem isto, uma proposta
    -- ligada à mão a um evento alheio escreveria a anotação lá (revisão
    -- cética de 18/10/2026)
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
    end if;
    if v_ped.convidados is not null then
      v_texto := v_texto || E'\nConvidados: ' || v_ped.convidados;
    end if;
    if v_ped.respostas is not null then
      for v_r in select value from jsonb_array_elements(v_ped.respostas) loop
        if coalesce(btrim(v_r->>'resposta'), '') <> '' then
          v_texto := v_texto || E'\n' || coalesce(v_r->>'titulo', 'Pergunta') || ': ' || (v_r->>'resposta');
        end if;
      end loop;
    end if;
    if v_ped.mensagem is not null then
      v_texto := v_texto || E'\nMensagem: ' || v_ped.mensagem;
    end if;

    v_autor := new.criado_por;
    if v_autor is null then
      select e.owner_user_id into v_autor from public.empresas e where e.id = new.empresa_id;
    end if;
    if v_autor is null then
      return new;
    end if;

    -- uma vez só por evento: rodar de novo (ou o evento religado) não duplica
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

drop trigger if exists trg_pedido_vira_anotacao on public.orcamentos;
create trigger trg_pedido_vira_anotacao after update of evento_gerado_id on public.orcamentos
  for each row
  when (old.evento_gerado_id is null and new.evento_gerado_id is not null and new.pedido_id is not null)
  execute function public.pedido_vira_anotacao_do_evento();

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'formulário: coluna e regra' as item,
       (select count(*) = 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'empresa_pagina' and column_name = 'formulario')
       and exists (select 1 from pg_constraint where conname = 'empresa_pagina_formulario_check') as ok
union all
select 'formulário válido passa',
       public.formulario_valido('{"intro_titulo":"Vamos conversar?","mostrar":{"email":true,"servico":true},"servico_opcoes":["Assessoria completa","Coordenação do dia"],"perguntas":[{"id":"estilo1","titulo":"Qual o estilo?","tipo":"escolha","opcoes":["Clássico","Rústico"],"obrigatoria":true},{"id":"local1","titulo":"Já tem local?","tipo":"sim_nao"}]}'::jsonb)
union all
select 'formulário torto é recusado (tipo, id repetido, opção, chave estranha, 11 perguntas)',
       not public.formulario_valido('{"perguntas":[{"id":"a1b2","titulo":"x","tipo":"arquivo"}]}'::jsonb)
       and not public.formulario_valido('{"perguntas":[{"id":"a1b2","titulo":"x","tipo":"data"},{"id":"a1b2","titulo":"y","tipo":"data"}]}'::jsonb)
       and not public.formulario_valido('{"perguntas":[{"id":"a1b2","titulo":"x","tipo":"escolha","opcoes":["só uma"]}]}'::jsonb)
       and not public.formulario_valido('{"mostrar":{"cpf":true}}'::jsonb)
       and not public.formulario_valido('{"interno":"x"}'::jsonb)
       and not public.formulario_valido('{"perguntas":[{"id":"a1b2","titulo":"x","tipo":"data","nota":"y"}]}'::jsonb)
       and not public.formulario_valido(
         jsonb_build_object('perguntas', (select jsonb_agg(jsonb_build_object('id', 'p' || g || 'xx', 'titulo', 'P', 'tipo', 'data')) from generate_series(1, 11) g)))
union all
select 'pedido: serviço e respostas, com regra',
       (select count(*) = 2 from information_schema.columns
         where table_schema = 'public' and table_name = 'pedido_orcamento' and column_name in ('servico_desejado', 'respostas'))
       and exists (select 1 from pg_constraint where conname = 'pedido_orcamento_respostas_check')
union all
select 'a página pública devolve o formulário e segue aberta ao anônimo',
       (select prosrc like '%''formulario''%' from pg_proc where proname = 'pagina_publica')
       and has_function_privilege('anon', 'public.pagina_publica(text)', 'execute')
union all
select 'a página pública não devolve dado interno',
       (select prosrc not ilike '%email%' and prosrc not ilike '%cpf%' and prosrc not ilike '%valor%'
          from pg_proc where proname = 'pagina_publica')
union all
select 'o pedido público continua só do servidor (não mudou)',
       not has_function_privilege('anon',
         'public.registrar_pedido_publico(text,text,text,text,text,date,text,int,text,text,text,text,text)', 'execute')
union all
select 'agenda: reunião ligada à oportunidade, com trava de empresa',
       (select count(*) = 2 from information_schema.columns
         where table_schema = 'public' and table_name = 'agenda_item' and column_name in ('orcamento_id', 'pedido_id'))
       and exists (select 1 from pg_trigger where tgname = 'trg_vinculo_comercial' and tgrelid = 'public.agenda_item'::regclass)
union all
select 'o pedido vira anotação do evento',
       exists (select 1 from pg_trigger where tgname = 'trg_pedido_vira_anotacao' and tgrelid = 'public.orcamentos'::regclass)
union all
select 'as funções novas não ficam abertas a ninguém',
       not has_function_privilege('anon', 'public.pedido_vira_anotacao_do_evento()', 'execute')
       and not has_function_privilege('authenticated', 'public.agenda_item_vinculo_da_empresa()', 'execute');
