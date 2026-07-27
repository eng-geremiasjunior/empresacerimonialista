-- ============================================================
-- Vela — Migração 056: proposta interativa (pacotes, extras, aceite)
--
-- A proposta deixa de ser um documento de valor fixo e passa a ser uma
-- calculadora: o cliente escolhe pacote, ajusta convidados, marca extras
-- e assina. O valor que ELE fecha é o que vira contrato.
--
-- DECISÕES:
--  * Pacotes e extras viram CADASTRO da empresa (não hard-code, não por
--    orçamento): a cerimonialista mexe no preço num lugar só e vale para
--    todas as propostas.
--  * O aceite grava SNAPSHOT de tudo (nome e preço do pacote, extras,
--    percentuais) em vez de referência. Se ela reajustar o preço amanhã,
--    o que o casal assinou não pode mudar sozinho.
--  * Assinatura vai como data URI na própria linha, não em bucket. O
--    cliente é anônimo; abrir escrita de storage para anon seria um
--    buraco de segurança bem maior do que o custo de ~20 KB em texto.
--  * As condições (30% entrada / 7x / 5% à vista) JÁ existiam em
--    empresa_conteudo_institucional e batem com a arte — reaproveitadas.
--
-- Execute no SQL Editor do Supabase (depois da 055).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Pacotes oferecidos na proposta
-- ------------------------------------------------------------
create table if not exists public.empresa_pacotes (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  nome        text not null,
  subtitulo   text,                          -- "Para casais práticos"
  preco       numeric not null default 0,
  -- o que o pacote entrega e o que NÃO entrega (a arte mostra os dois)
  inclui      text[] not null default '{}',
  nao_inclui  text[] not null default '{}',
  recomendado boolean not null default false, -- selo "Mais escolhido"
  ordem       int not null default 0,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_empresa_pacotes
  on public.empresa_pacotes (empresa_id, ordem);

alter table public.empresa_pacotes enable row level security;

drop policy if exists "pacotes_proprietaria" on public.empresa_pacotes;
create policy "pacotes_proprietaria"
  on public.empresa_pacotes for all
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- ------------------------------------------------------------
-- 2) Extras opcionais
-- ------------------------------------------------------------
create table if not exists public.empresa_extras (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome       text not null,
  descricao  text,
  preco      numeric not null default 0,
  ordem      int not null default 0,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_empresa_extras
  on public.empresa_extras (empresa_id, ordem);

alter table public.empresa_extras enable row level security;

drop policy if exists "extras_proprietaria" on public.empresa_extras;
create policy "extras_proprietaria"
  on public.empresa_extras for all
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- ------------------------------------------------------------
-- 3) Regra do slider de convidados + texto longo da timeline
-- ------------------------------------------------------------
alter table public.empresa_conteudo_institucional
  add column if not exists convidados_inclusos        int not null default 150,
  add column if not exists valor_por_convidado_extra  numeric not null default 12,
  add column if not exists convidados_min             int not null default 50,
  add column if not exists convidados_max             int not null default 300;

-- Modal de cada etapa do "Como funciona" (a arte abre um texto longo).
alter table public.empresa_processo_etapas
  add column if not exists texto_longo text;

-- ------------------------------------------------------------
-- 4) Aceite: snapshot do que foi fechado + assinaturas
-- ------------------------------------------------------------
create table if not exists public.orcamento_aceites (
  id            uuid primary key default gen_random_uuid(),
  orcamento_id  uuid not null references public.orcamentos (id) on delete cascade,
  recibo_codigo text not null unique,

  -- snapshot: o que valia no momento da assinatura
  pacote_nome     text not null,
  pacote_preco    numeric not null,
  convidados      int not null,
  convidados_inclusos int not null,
  valor_por_convidado_extra numeric not null,
  valor_convidados_extra numeric not null default 0,
  extras          jsonb not null default '[]'::jsonb,  -- [{nome, preco}]
  valor_extras    numeric not null default 0,
  forma_pagamento text not null,               -- 'vista' | 'parcelado'
  parcelas        int,
  desconto_percentual numeric not null default 0,
  valor_desconto  numeric not null default 0,
  valor_total     numeric not null,
  valor_entrada   numeric not null default 0,
  valor_parcela   numeric,

  -- quem assinou
  nome_noiva      text not null,
  nome_noivo      text,
  assinatura_noiva text,                        -- data URI (PNG)
  assinatura_noivo text,
  observacoes     text,

  ip_origem   text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_orcamento_aceites
  on public.orcamento_aceites (orcamento_id);

alter table public.orcamento_aceites enable row level security;

-- A equipe só LÊ (o aceite é do cliente; ninguém edita o que foi assinado).
drop policy if exists "aceites_leitura_equipe" on public.orcamento_aceites;
create policy "aceites_leitura_equipe"
  on public.orcamento_aceites for select
  using (
    orcamento_id in (
      select o.id from public.orcamentos o
      where o.empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    )
  );

commit;

-- ------------------------------------------------------------
-- 5) Consulta pública: passa a devolver pacotes, extras e regras
-- ------------------------------------------------------------
create or replace function public.consultar_orcamento_publico(p_hash text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'nome_contato', o.contato_nome,
    'tipo_evento', o.tipo_evento,
    'data_evento', o.data_evento,
    'local_evento', o.local_evento,
    'cidade_evento', o.cidade_evento,
    'numero_convidados', o.numero_convidados,
    'valor_total', o.valor_total,
    'data_criacao', o.data_criacao,
    'data_validade', o.data_validade,
    'validade_dias', o.validade_dias,
    'status', o.status,
    'respondido_em', o.respondido_em,
    'ficha_preenchida', o.ficha_preenchida_em is not null,
    'logo_url', e.logo_url,
    'nome_empresa', e.nome,
    'dias_restantes', greatest(0, o.data_validade - current_date),
    'hero_imagem_url', e.hero_imagem_url,
    'no_dia_evento_imagem_url', e.no_dia_evento_imagem_url,

    'itens', coalesce(
      (
        select json_agg(
          json_build_object(
            'nome', oi.nome, 'descricao', oi.descricao,
            'valor', oi.valor_calculado, 'tipo_calculo', oi.tipo_calculo,
            'valor_unitario', oi.valor_unitario,
            'quantidade_convidados', oi.quantidade_convidados_aplicada,
            'taxa_fixa', oi.taxa_fixa, 'categoria', mp.categoria
          ) order by oi.ordem
        )
        from public.orcamento_itens oi
        left join public.modelos_precificacao mp on mp.id = oi.modelo_precificacao_id
        where oi.orcamento_id = o.id
      ), '[]'::json
    ),

    'pacotes', coalesce(
      (
        select json_agg(
          json_build_object(
            'id', p.id, 'nome', p.nome, 'subtitulo', p.subtitulo,
            'preco', p.preco, 'inclui', to_json(p.inclui),
            'nao_inclui', to_json(p.nao_inclui), 'recomendado', p.recomendado
          ) order by p.ordem, p.created_at
        )
        from public.empresa_pacotes p
        where p.empresa_id = o.empresa_id and p.ativo
      ), '[]'::json
    ),

    'extras', coalesce(
      (
        select json_agg(
          json_build_object('id', x.id, 'nome', x.nome, 'descricao', x.descricao, 'preco', x.preco)
          order by x.ordem, x.created_at
        )
        from public.empresa_extras x
        where x.empresa_id = o.empresa_id and x.ativo
      ), '[]'::json
    ),

    'institucional', (
      select json_build_object(
        'sobre_nos_texto', c.sobre_nos_texto,
        'stat_anos_experiencia', c.stat_anos_experiencia,
        'stat_eventos_realizados', c.stat_eventos_realizados,
        'stat_dedicacao_percentual', c.stat_dedicacao_percentual,
        'stat_equipe_texto', c.stat_equipe_texto,
        'condicao_entrada_percentual', c.condicao_entrada_percentual,
        'condicao_parcelas_maximo', c.condicao_parcelas_maximo,
        'condicao_desconto_a_vista_percentual', c.condicao_desconto_a_vista_percentual,
        'condicao_prazo_parcelas_texto', c.condicao_prazo_parcelas_texto,
        'whatsapp_contato', c.whatsapp_contato,
        'email_contato', c.email_contato,
        'responsabilidades_dia_evento', to_json(c.responsabilidades_dia_evento),
        'pos_evento_cards', c.pos_evento_cards,
        'convidados_inclusos', c.convidados_inclusos,
        'valor_por_convidado_extra', c.valor_por_convidado_extra,
        'convidados_min', c.convidados_min,
        'convidados_max', c.convidados_max
      )
      from public.empresa_conteudo_institucional c
      where c.empresa_id = o.empresa_id
    ),

    'etapas', coalesce(
      (
        select json_agg(
          json_build_object('titulo', pe.titulo, 'descricao', pe.descricao, 'texto_longo', pe.texto_longo)
          order by pe.ordem
        )
        from public.empresa_processo_etapas pe
        where pe.empresa_id = o.empresa_id
      ), '[]'::json
    ),

    'faq', coalesce(
      (
        select json_agg(json_build_object('pergunta', f.pergunta, 'resposta', f.resposta) order by f.ordem)
        from public.empresa_faq f
        where f.empresa_id = o.empresa_id and f.ativo
      ), '[]'::json
    ),

    'fotos', coalesce(
      (
        select json_agg(json_build_object('url', pf.url, 'legenda', pf.legenda) order by pf.ordem, pf.created_at)
        from public.portfolio_fotos pf
        where pf.empresa_id = o.empresa_id and pf.ativo
      ), '[]'::json
    ),

    'depoimentos', coalesce(
      (
        select json_agg(json_build_object('texto', dp.texto, 'autor', dp.autor, 'contexto', dp.contexto)
          order by dp.ordem, dp.created_at)
        from public.empresa_depoimentos dp
        where dp.empresa_id = o.empresa_id and dp.ativo
      ), '[]'::json
    ),

    -- se já houve aceite, a landing mostra o recibo em vez da calculadora
    'aceite', (
      select json_build_object(
        'recibo_codigo', a.recibo_codigo, 'pacote_nome', a.pacote_nome,
        'valor_total', a.valor_total, 'created_at', a.created_at
      )
      from public.orcamento_aceites a
      where a.orcamento_id = o.id
      order by a.created_at desc limit 1
    )
  )
  from public.orcamentos o
  join public.empresas e on e.id = o.empresa_id
  where o.hash_publico = p_hash;
$$;

revoke all on function public.consultar_orcamento_publico(text) from public;
grant execute on function public.consultar_orcamento_publico(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 6) Registrar o aceite (chamado pelo cliente anônimo)
-- ------------------------------------------------------------
create or replace function public.registrar_aceite_proposta(
  p_hash            text,
  p_pacote_id       uuid,
  p_convidados      int,
  p_extras_ids      uuid[],
  p_forma_pagamento text,
  p_parcelas        int,
  p_nome_noiva      text,
  p_nome_noivo      text,
  p_assinatura_noiva text,
  p_assinatura_noivo text,
  p_observacoes     text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orc     public.orcamentos%rowtype;
  v_cfg     public.empresa_conteudo_institucional%rowtype;
  v_pac     public.empresa_pacotes%rowtype;
  v_extras  jsonb := '[]'::jsonb;
  v_val_extras numeric := 0;
  v_convidados int;
  v_val_conv numeric := 0;
  v_subtotal numeric;
  v_desc_pct numeric := 0;
  v_desconto numeric := 0;
  v_total    numeric;
  v_entrada  numeric;
  v_parcela  numeric;
  v_codigo   text;
  v_dono     uuid;
  v_existente public.orcamento_aceites%rowtype;
begin
  select * into v_orc from public.orcamentos where hash_publico = p_hash;
  if not found then
    return json_build_object('error', 'proposta não encontrada');
  end if;

  -- Idempotente: reenvio devolve o mesmo recibo em vez de duplicar.
  select * into v_existente from public.orcamento_aceites
  where orcamento_id = v_orc.id order by created_at desc limit 1;
  if found then
    return json_build_object('success', true, 'recibo', v_existente.recibo_codigo,
      'valor_total', v_existente.valor_total, 'ja_existia', true);
  end if;

  if v_orc.status not in ('enviado') then
    return json_build_object('error', 'esta proposta não está disponível para aceite');
  end if;
  if v_orc.data_validade < current_date then
    update public.orcamentos set status = 'expirado', updated_at = now() where id = v_orc.id;
    return json_build_object('error', 'esta proposta expirou');
  end if;
  if coalesce(trim(p_nome_noiva), '') = '' then
    return json_build_object('error', 'informe o nome de quem está aceitando');
  end if;
  -- Assinatura: limite defensivo (~200 KB de data URI já é muito para um traço).
  if length(coalesce(p_assinatura_noiva, '')) > 200000
     or length(coalesce(p_assinatura_noivo, '')) > 200000 then
    return json_build_object('error', 'assinatura inválida');
  end if;

  select * into v_cfg from public.empresa_conteudo_institucional
  where empresa_id = v_orc.empresa_id;

  select * into v_pac from public.empresa_pacotes
  where id = p_pacote_id and empresa_id = v_orc.empresa_id and ativo;
  if not found then
    return json_build_object('error', 'pacote inválido');
  end if;

  -- Convidados dentro dos limites configurados.
  v_convidados := greatest(
    coalesce(v_cfg.convidados_min, 50),
    least(coalesce(v_cfg.convidados_max, 300), coalesce(p_convidados, v_cfg.convidados_inclusos))
  );
  v_val_conv := greatest(0, v_convidados - coalesce(v_cfg.convidados_inclusos, 150))
                * coalesce(v_cfg.valor_por_convidado_extra, 0);

  -- Extras: preço lido do BANCO, nunca do cliente.
  select coalesce(jsonb_agg(jsonb_build_object('nome', x.nome, 'preco', x.preco)), '[]'::jsonb),
         coalesce(sum(x.preco), 0)
    into v_extras, v_val_extras
  from public.empresa_extras x
  where x.empresa_id = v_orc.empresa_id and x.ativo
    and x.id = any(coalesce(p_extras_ids, '{}'::uuid[]));

  v_subtotal := v_pac.preco + v_val_conv + v_val_extras;

  if p_forma_pagamento = 'vista' then
    v_desc_pct := coalesce(v_cfg.condicao_desconto_a_vista_percentual, 0);
    v_desconto := v_subtotal * v_desc_pct / 100.0;
  end if;

  v_total   := v_subtotal - v_desconto;
  v_entrada := v_total * coalesce(v_cfg.condicao_entrada_percentual, 30) / 100.0;
  if p_forma_pagamento <> 'vista' and coalesce(p_parcelas, 0) > 0 then
    v_parcela := (v_total - v_entrada) / p_parcelas;
  end if;

  -- Código do recibo: iniciais da empresa + 6 hex. O unique da coluna é a
  -- garantia real; a chance de colisão aqui é desprezível.
  select upper(regexp_replace(substring(e.nome from 1 for 2), '[^a-zA-Z]', 'X', 'g'))
    into v_codigo from public.empresas e where e.id = v_orc.empresa_id;
  -- md5(random()) em vez de gen_random_bytes: pgcrypto pode nao estar no
  -- search_path fixado em public, e o unique da coluna e a garantia real.
  v_codigo := coalesce(v_codigo, 'VL') || '-' ||
              upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  insert into public.orcamento_aceites (
    orcamento_id, recibo_codigo, pacote_nome, pacote_preco, convidados,
    convidados_inclusos, valor_por_convidado_extra, valor_convidados_extra,
    extras, valor_extras, forma_pagamento, parcelas, desconto_percentual,
    valor_desconto, valor_total, valor_entrada, valor_parcela,
    nome_noiva, nome_noivo, assinatura_noiva, assinatura_noivo, observacoes
  ) values (
    v_orc.id, v_codigo, v_pac.nome, v_pac.preco, v_convidados,
    coalesce(v_cfg.convidados_inclusos, 150), coalesce(v_cfg.valor_por_convidado_extra, 0), v_val_conv,
    v_extras, v_val_extras, p_forma_pagamento, p_parcelas, v_desc_pct,
    v_desconto, v_total, v_entrada, v_parcela,
    trim(p_nome_noiva), nullif(trim(coalesce(p_nome_noivo, '')), ''),
    p_assinatura_noiva, p_assinatura_noivo, nullif(trim(coalesce(p_observacoes, '')), '')
  );

  -- O valor fechado passa a ser o valor do orçamento: é ele que alimenta
  -- o evento gerado, o financeiro e o PDF. O trigger de valor_total só
  -- dispara em orcamento_itens, então não sobrescreve isto.
  update public.orcamentos
  set status = 'aprovado', respondido_em = now(),
      valor_total = v_total, updated_at = now()
  where id = v_orc.id;

  select coalesce(
    (select m.user_id from public.membros_equipe m where m.id = v_orc.cerimonialista_responsavel_id),
    (select e.owner_user_id from public.empresas e where e.id = v_orc.empresa_id)
  ) into v_dono;

  if v_dono is not null then
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (v_dono, 'orcamento_aprovado',
      trim(p_nome_noiva) || ' aceitou a proposta!',
      v_pac.nome || ' — R$ ' || to_char(v_total, 'FM999G999G990D00') || ' · recibo ' || v_codigo,
      '/orcamentos/' || v_orc.id);
  end if;

  return json_build_object(
    'success', true, 'recibo', v_codigo, 'valor_total', v_total,
    'valor_entrada', v_entrada, 'valor_parcela', v_parcela, 'ja_existia', false
  );
end;
$$;

revoke all on function public.registrar_aceite_proposta(
  text, uuid, int, uuid[], text, int, text, text, text, text, text) from public;
grant execute on function public.registrar_aceite_proposta(
  text, uuid, int, uuid[], text, int, text, text, text, text, text) to anon, authenticated;
