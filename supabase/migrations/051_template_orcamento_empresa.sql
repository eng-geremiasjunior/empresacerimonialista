-- ============================================================
-- Vela — Migração 051: template visual da proposta
--
-- A empresa escolhe entre 'template_1' (rosa/terracota) e 'template_2'
-- (verde oliva). A troca é só estética; a landing é a mesma.
--
-- A coluna vive em `empresas`, junto de logo_url e das imagens de fundo:
-- é identidade visual da marca, e a RLS owner-only da tabela já garante
-- que só a proprietária troca.
--
-- Execute no SQL Editor do Supabase (depois da 050).
-- ============================================================

begin;

alter table public.empresas
  add column if not exists template_orcamento text not null default 'template_1';

-- Evita valor inválido chegar ao front (que cairia no fallback, mas
-- silenciosamente).
alter table public.empresas drop constraint if exists empresas_template_orcamento_check;
alter table public.empresas
  add constraint empresas_template_orcamento_check
  check (template_orcamento in ('template_1', 'template_2'));

commit;

-- ------------------------------------------------------------
-- RPC pública: devolve o template escolhido
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
    'template_orcamento', e.template_orcamento,

    'itens', coalesce(
      (
        select json_agg(
          json_build_object(
            'nome', oi.nome,
            'descricao', oi.descricao,
            'valor', oi.valor_calculado,
            'tipo_calculo', oi.tipo_calculo,
            'valor_unitario', oi.valor_unitario,
            'quantidade_convidados', oi.quantidade_convidados_aplicada,
            'taxa_fixa', oi.taxa_fixa,
            'categoria', mp.categoria
          ) order by oi.ordem
        )
        from public.orcamento_itens oi
        left join public.modelos_precificacao mp
          on mp.id = oi.modelo_precificacao_id
        where oi.orcamento_id = o.id
      ),
      '[]'::json
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
        'pos_evento_cards', c.pos_evento_cards
      )
      from public.empresa_conteudo_institucional c
      where c.empresa_id = o.empresa_id
    ),

    'etapas', coalesce(
      (
        select json_agg(
          json_build_object('titulo', pe.titulo, 'descricao', pe.descricao)
          order by pe.ordem
        )
        from public.empresa_processo_etapas pe
        where pe.empresa_id = o.empresa_id
      ),
      '[]'::json
    ),

    'faq', coalesce(
      (
        select json_agg(
          json_build_object('pergunta', f.pergunta, 'resposta', f.resposta)
          order by f.ordem
        )
        from public.empresa_faq f
        where f.empresa_id = o.empresa_id and f.ativo
      ),
      '[]'::json
    ),

    'fotos', coalesce(
      (
        select json_agg(
          json_build_object('url', pf.url, 'legenda', pf.legenda)
          order by pf.ordem, pf.created_at
        )
        from public.portfolio_fotos pf
        where pf.empresa_id = o.empresa_id and pf.ativo
      ),
      '[]'::json
    )
  )
  from public.orcamentos o
  join public.empresas e on e.id = o.empresa_id
  where o.hash_publico = p_hash;
$$;

revoke all on function public.consultar_orcamento_publico(text) from public;
grant execute on function public.consultar_orcamento_publico(text) to anon, authenticated;
