-- 059 — Template escolhido por proposta
--
-- Debutante passou a ter dois templates (o clássico da 058 e o "Festa
-- Glam"). O tipo do evento sozinho não decide mais qual renderizar, então
-- a escolha vai no próprio orçamento.
--
-- null = usar o padrão do tipo (debutante → clássico, casamento → o único
-- que existe). Um valor explícito sobrepõe. A página pública lê isto.

alter table public.orcamentos
  add column if not exists template_proposta text;

-- Slugs conhecidos hoje. Deixo o null passar (é o "padrão do tipo") e
-- restrinjo o resto para não gravar um template que a página não conhece.
-- Ampliar é um alter constraint, como foi com template_orcamento.
alter table public.orcamentos
  drop constraint if exists orcamentos_template_proposta_check;
alter table public.orcamentos
  add constraint orcamentos_template_proposta_check
  check (
    template_proposta is null
    or template_proposta in ('debutante_classico', 'debutante_glam')
  );

-- ------------------------------------------------------------
-- Consulta pública devolve o template da proposta
-- ------------------------------------------------------------
-- Idêntica à 058, com 'template_proposta' a mais no topo.
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
    'template_proposta', o.template_proposta,
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
        'convidados_max', c.convidados_max,
        'video_url', c.video_url
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
