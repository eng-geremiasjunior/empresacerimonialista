-- ============================================================
-- Vela — Migração 053: depoimentos de clientes
--
-- Prova social na proposta, cadastrada pela cerimonialista. Mesmo padrão
-- do FAQ (Etapa 7): tabela própria, RLS da proprietária, flag `ativo`
-- como interruptor de exibição pública, e leitura pela RPC.
--
-- SEM seed: depoimento é fala de cliente real. Inventar um texto padrão
-- que aparecesse na proposta de todo mundo seria colocar na boca da
-- cerimonialista um elogio que ninguém disse.
--
-- Execute no SQL Editor do Supabase (depois da 052).
-- ============================================================

begin;

create table if not exists public.empresa_depoimentos (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  texto      text not null,
  autor      text not null,
  contexto   text,                          -- ex.: "Casamento em 2024"
  ordem      int not null default 0,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_empresa_depoimentos
  on public.empresa_depoimentos (empresa_id, ordem);

alter table public.empresa_depoimentos enable row level security;

drop policy if exists "depoimentos_proprietaria" on public.empresa_depoimentos;
create policy "depoimentos_proprietaria"
  on public.empresa_depoimentos
  for all
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

commit;

-- ------------------------------------------------------------
-- RPC pública: devolve os depoimentos ativos
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
    ),

    'depoimentos', coalesce(
      (
        select json_agg(
          json_build_object('texto', dp.texto, 'autor', dp.autor, 'contexto', dp.contexto)
          order by dp.ordem, dp.created_at
        )
        from public.empresa_depoimentos dp
        where dp.empresa_id = o.empresa_id and dp.ativo
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
