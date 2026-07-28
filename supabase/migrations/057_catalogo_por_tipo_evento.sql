-- 057 — Catálogo: conteúdo da proposta por tipo de evento
--
-- Até aqui pacotes, textos, FAQ, depoimentos, fotos e imagens eram únicos
-- por empresa: mexer em qualquer um mudava toda proposta enviada, fosse
-- casamento ou batizado. O Catálogo separa isso — cada tipo de evento
-- passa a ter o seu conteúdo.
--
-- O que já existe vira o de casamento: é o default da coluna nova, então
-- o backfill acontece sozinho no ALTER e nenhuma proposta em aberto muda
-- de conteúdo.

-- ------------------------------------------------------------
-- 1) tipo_evento nas tabelas de conteúdo
-- ------------------------------------------------------------

-- Os 9 tipos de src/lib/types.ts (EventType). Num domain para a lista
-- viver num lugar só, em vez de repetir o mesmo check em 7 tabelas —
-- incluir um tipo novo depois é um alter domain, não sete.
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'tipo_evento_catalogo' and n.nspname = 'public'
  ) then
    create domain public.tipo_evento_catalogo as text
      check (value in (
        'casamento', 'debutante', 'formatura', 'aniversario', 'corporativo',
        'cha_revelacao', 'batizado', 'bodas', 'outro'
      ));
  end if;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'empresa_pacotes',
    'empresa_extras',
    'empresa_conteudo_institucional',
    'empresa_processo_etapas',
    'empresa_faq',
    'empresa_depoimentos',
    'portfolio_fotos'
  ] loop
    execute format(
      'alter table public.%I add column if not exists tipo_evento '
      || 'public.tipo_evento_catalogo not null default ''casamento''',
      t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 2) Uma linha de conteúdo institucional por (empresa, tipo)
-- ------------------------------------------------------------
-- A unique era inline na coluna (empresa_id ... unique), o que agora
-- impediria a empresa de ter casamento e debutante ao mesmo tempo.
alter table public.empresa_conteudo_institucional
  drop constraint if exists empresa_conteudo_institucional_empresa_id_key;

create unique index if not exists idx_conteudo_institucional_empresa_tipo
  on public.empresa_conteudo_institucional (empresa_id, tipo_evento);

-- ------------------------------------------------------------
-- 3) Imagens da proposta passam a ser por tipo
-- ------------------------------------------------------------
-- Estavam em `empresas` (uma capa para tudo). Vêm para cá porque agora
-- variam por tipo de evento. As colunas antigas ficam de pé nesta
-- migração — derrubá-las junto quebraria qualquer instância ainda
-- rodando o código anterior; podem ser removidas numa migração futura.
alter table public.empresa_conteudo_institucional
  add column if not exists hero_imagem_url text,
  add column if not exists no_dia_evento_imagem_url text;

update public.empresa_conteudo_institucional c
set hero_imagem_url = coalesce(c.hero_imagem_url, e.hero_imagem_url),
    no_dia_evento_imagem_url = coalesce(
      c.no_dia_evento_imagem_url, e.no_dia_evento_imagem_url
    )
from public.empresas e
where e.id = c.empresa_id
  and c.tipo_evento = 'casamento';

-- ------------------------------------------------------------
-- 4) Índices: toda leitura agora filtra por empresa + tipo
-- ------------------------------------------------------------
drop index if exists public.idx_empresa_pacotes;
drop index if exists public.idx_empresa_extras;
drop index if exists public.idx_processo_etapas_empresa;
drop index if exists public.idx_faq_empresa;
drop index if exists public.idx_empresa_depoimentos;
drop index if exists public.idx_portfolio_fotos_empresa;

create index if not exists idx_empresa_pacotes
  on public.empresa_pacotes (empresa_id, tipo_evento, ordem);
create index if not exists idx_empresa_extras
  on public.empresa_extras (empresa_id, tipo_evento, ordem);
create index if not exists idx_processo_etapas_empresa
  on public.empresa_processo_etapas (empresa_id, tipo_evento, ordem);
create index if not exists idx_faq_empresa
  on public.empresa_faq (empresa_id, tipo_evento, ordem);
create index if not exists idx_empresa_depoimentos
  on public.empresa_depoimentos (empresa_id, tipo_evento, ordem);
create index if not exists idx_portfolio_fotos_empresa
  on public.portfolio_fotos (empresa_id, tipo_evento, ordem);

-- ------------------------------------------------------------
-- 5) Consulta pública: o conteúdo do tipo do orçamento
-- ------------------------------------------------------------
-- Mesma função da 056, com `and X.tipo_evento = o.tipo_evento` em cada
-- fonte e as imagens vindo de conteudo_institucional. Um orçamento de
-- debutante deixa de mostrar os pacotes de casamento.
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

    -- imagens do tipo; cai nas colunas antigas de `empresas` enquanto a
    -- empresa não tiver configurado nada para este tipo de evento
    'hero_imagem_url', coalesce(
      (select c.hero_imagem_url from public.empresa_conteudo_institucional c
       where c.empresa_id = o.empresa_id and c.tipo_evento = o.tipo_evento),
      e.hero_imagem_url
    ),
    'no_dia_evento_imagem_url', coalesce(
      (select c.no_dia_evento_imagem_url from public.empresa_conteudo_institucional c
       where c.empresa_id = o.empresa_id and c.tipo_evento = o.tipo_evento),
      e.no_dia_evento_imagem_url
    ),

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
        where p.empresa_id = o.empresa_id
          and p.tipo_evento = o.tipo_evento
          and p.ativo
      ), '[]'::json
    ),

    'extras', coalesce(
      (
        select json_agg(
          json_build_object('id', x.id, 'nome', x.nome, 'descricao', x.descricao, 'preco', x.preco)
          order by x.ordem, x.created_at
        )
        from public.empresa_extras x
        where x.empresa_id = o.empresa_id
          and x.tipo_evento = o.tipo_evento
          and x.ativo
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
        and c.tipo_evento = o.tipo_evento
    ),

    'etapas', coalesce(
      (
        select json_agg(
          json_build_object('titulo', pe.titulo, 'descricao', pe.descricao, 'texto_longo', pe.texto_longo)
          order by pe.ordem
        )
        from public.empresa_processo_etapas pe
        where pe.empresa_id = o.empresa_id
          and pe.tipo_evento = o.tipo_evento
      ), '[]'::json
    ),

    'faq', coalesce(
      (
        select json_agg(json_build_object('pergunta', f.pergunta, 'resposta', f.resposta) order by f.ordem)
        from public.empresa_faq f
        where f.empresa_id = o.empresa_id
          and f.tipo_evento = o.tipo_evento
          and f.ativo
      ), '[]'::json
    ),

    'fotos', coalesce(
      (
        select json_agg(json_build_object('url', pf.url, 'legenda', pf.legenda) order by pf.ordem, pf.created_at)
        from public.portfolio_fotos pf
        where pf.empresa_id = o.empresa_id
          and pf.tipo_evento = o.tipo_evento
          and pf.ativo
      ), '[]'::json
    ),

    'depoimentos', coalesce(
      (
        select json_agg(json_build_object('texto', dp.texto, 'autor', dp.autor, 'contexto', dp.contexto)
          order by dp.ordem, dp.created_at)
        from public.empresa_depoimentos dp
        where dp.empresa_id = o.empresa_id
          and dp.tipo_evento = o.tipo_evento
          and dp.ativo
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
-- 6) Aceite: pacote, extras e regras do tipo do orcamento
-- ------------------------------------------------------------
-- Mesma funcao da 056 com o filtro de tipo em tres pontos. Sem ele o
-- cliente de uma proposta de debutante poderia mandar o UUID de um
-- pacote de casamento e fechar contrato pelo preco do outro tipo --
-- os IDs sao publicos, entao a checagem tem de ser aqui.
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
  where empresa_id = v_orc.empresa_id
    and tipo_evento = v_orc.tipo_evento;

  select * into v_pac from public.empresa_pacotes
  where id = p_pacote_id and empresa_id = v_orc.empresa_id
    and tipo_evento = v_orc.tipo_evento and ativo;
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
  where x.empresa_id = v_orc.empresa_id and x.tipo_evento = v_orc.tipo_evento and x.ativo
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

-- ------------------------------------------------------------
-- 7) Seed de empresa nova semeia o tipo casamento
-- ------------------------------------------------------------
-- semear_conteudo_institucional (047) fazia `on conflict (empresa_id)`, a
-- constraint que o passo 2 desta migração trocou por (empresa_id,
-- tipo_evento). Sem esta redefinição o cadastro de QUALQUER empresa nova
-- passa a falhar com "no unique or exclusion constraint matching the ON
-- CONFLICT specification" — o seed roda no cadastro.
--
-- Semeia casamento: é o tipo que o produto assume por padrão, e os demais
-- nascem vazios quando ela abrir cada um no Catálogo.
create or replace function public.semear_conteudo_institucional(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.empresa_conteudo_institucional
    (empresa_id, tipo_evento, stat_anos_experiencia, stat_eventos_realizados,
     responsabilidades_dia_evento, pos_evento_cards)
  values (
    p_empresa_id, 'casamento', 1, 0,
    array[
      'Coordenação da cerimônia e recepção',
      'Recepção e acomodação dos convidados',
      'Cronograma e tempo de cada etapa',
      'Acompanhamento de fornecedores',
      'Supervisão de montagem e decoração',
      'Gestão de imprevistos com tranquilidade'
    ],
    '[
      {"titulo":"Relatório completo","descricao":"Registro de tudo o que foi entregue e alinhado."},
      {"titulo":"Fechamento financeiro","descricao":"Prestação de contas dos fornecedores contratados."},
      {"titulo":"Suporte contínuo","descricao":"Canal aberto para dúvidas após o grande dia."}
    ]'::jsonb
  )
  on conflict (empresa_id, tipo_evento) do nothing;

  if not exists (
    select 1 from public.empresa_processo_etapas
    where empresa_id = p_empresa_id and tipo_evento = 'casamento'
  ) then
    insert into public.empresa_processo_etapas
      (empresa_id, tipo_evento, ordem, titulo, descricao)
    select p_empresa_id, 'casamento', v.ordem, v.titulo, v.descricao
    from (values
      (1, 'Briefing',      'Reunião inicial para entendermos seus sonhos e expectativas.'),
      (2, 'Planejamento',  'Criamos o budget, cronograma e checklist personalizado.'),
      (3, 'Contratações',  'Indicação, negociação e acompanhamento dos fornecedores.'),
      (4, 'Organização',   'Visitas técnicas, degustações, contratos e alinhamentos.'),
      (5, 'Evento',        'Coordenação completa do dia para vocês só aproveitarem.'),
      (6, 'Pós-evento',    'Relatório final com detalhes e informações importantes.')
    ) as v(ordem, titulo, descricao);
  end if;

  if not exists (
    select 1 from public.empresa_faq
    where empresa_id = p_empresa_id and tipo_evento = 'casamento'
  ) then
    insert into public.empresa_faq (empresa_id, tipo_evento, ordem, pergunta, resposta)
    select p_empresa_id, 'casamento', v.ordem, v.pergunta, v.resposta
    from (values
      (1, 'Como funciona o pagamento?',
          'A entrada garante a reserva da data; o restante pode ser parcelado sem juros até 5 dias antes do evento.'),
      (2, 'Vocês acompanham reuniões com fornecedores?',
          'Sim, acompanhamos negociações, visitas técnicas e degustações junto com vocês.'),
      (3, 'Quantas pessoas da equipe ficam no dia do evento?',
          'A equipe é dimensionada conforme o porte do evento e definida no fechamento do contrato.')
    ) as v(ordem, pergunta, resposta);
  end if;
end;
$$;
