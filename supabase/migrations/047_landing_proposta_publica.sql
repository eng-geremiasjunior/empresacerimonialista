-- ============================================================
-- Vela — Migração 047: landing page pública da proposta (Etapa 9 de 10)
--
-- Completa o conteúdo institucional que faltava para as seções novas e
-- transforma consultar_orcamento_publico em UMA chamada que devolve tudo
-- que a landing precisa (orçamento + itens + institucional + FAQ +
-- processo + portfólio).
--
-- DECISÕES:
--  * "No dia do evento" e "Pós-evento" viraram COLUNAS de
--    empresa_conteudo_institucional, não linhas em empresa_processo_etapas
--    com flag de categoria: salvarEtapas() (Etapa 7) faz DELETE de todas as
--    linhas da empresa antes de reinserir, então os cards de pós-evento
--    sumiriam toda vez que a cerimonialista salvasse "Como funciona".
--  * email_contato entra aqui porque `empresas` só tem nome e logo_url, e
--    o rodapé da proposta pede telefone + e-mail.
--  * A RPC continua SECURITY DEFINER com grant a anon: a landing é pública
--    e as tabelas (portfolio_fotos, faq, institucional) têm RLS restrita a
--    proprietária/coordenadora — sem a função, anon não leria nada.
--  * Só entram FAQ e fotos com ativo = true: é o interruptor de exibição
--    pública das Etapas 7 e 8.
--
-- Execute no SQL Editor do Supabase (depois da 046).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Campos novos de conteúdo institucional
-- ------------------------------------------------------------
alter table public.empresa_conteudo_institucional
  add column if not exists responsabilidades_dia_evento text[] not null default '{}',
  add column if not exists pos_evento_cards jsonb not null default '[]'::jsonb,
  add column if not exists email_contato text;

-- Seed dos campos novos onde ainda estão vazios (empresas que já rodaram a
-- 045). Não sobrescreve quem já editou.
update public.empresa_conteudo_institucional
set responsabilidades_dia_evento = array[
  'Coordenação da cerimônia e recepção',
  'Recepção e acomodação dos convidados',
  'Cronograma e tempo de cada etapa',
  'Acompanhamento de fornecedores',
  'Supervisão de montagem e decoração',
  'Gestão de imprevistos com tranquilidade'
]
where responsabilidades_dia_evento = '{}';

update public.empresa_conteudo_institucional
set pos_evento_cards = '[
  {"titulo":"Relatório completo","descricao":"Registro de tudo o que foi entregue e alinhado."},
  {"titulo":"Fechamento financeiro","descricao":"Prestação de contas dos fornecedores contratados."},
  {"titulo":"Suporte contínuo","descricao":"Canal aberto para dúvidas após o grande dia."}
]'::jsonb
where pos_evento_cards = '[]'::jsonb;

-- Mesmo seed para empresas criadas daqui pra frente.
create or replace function public.semear_conteudo_institucional(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.empresa_conteudo_institucional
    (empresa_id, stat_anos_experiencia, stat_eventos_realizados,
     responsabilidades_dia_evento, pos_evento_cards)
  values (
    p_empresa_id, 1, 0,
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
  on conflict (empresa_id) do nothing;

  if not exists (
    select 1 from public.empresa_processo_etapas where empresa_id = p_empresa_id
  ) then
    insert into public.empresa_processo_etapas (empresa_id, ordem, titulo, descricao)
    select p_empresa_id, v.ordem, v.titulo, v.descricao
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
    select 1 from public.empresa_faq where empresa_id = p_empresa_id
  ) then
    insert into public.empresa_faq (empresa_id, ordem, pergunta, resposta)
    select p_empresa_id, v.ordem, v.pergunta, v.resposta
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

-- ------------------------------------------------------------
-- 2) Consulta pública — agora devolve a landing inteira
-- ------------------------------------------------------------
create or replace function public.consultar_orcamento_publico(p_hash text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    -- ----- orçamento (mantido igual à 043: a Etapa 5/6 depende disto) -----
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
    -- dias restantes de validade, para o badge do hero
    'dias_restantes', greatest(0, o.data_validade - current_date),

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
            -- categoria vem do modelo de precificação (a Etapa 3 não
            -- copiou para o item); serve só para escolher o ícone.
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

    -- ----- conteúdo institucional (Etapa 7 + campos desta migração) -----
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

commit;
