-- 058 — Template de debutante
--
-- Duas coisas: o campo de vídeo do hero (o handoff tem um teaser com
-- botão de play) e o conteúdo inicial de debutante, para o Catálogo não
-- abrir vazio.
--
-- O vídeo entra em empresa_conteudo_institucional porque desde a 057 essa
-- tabela é por (empresa, tipo) — cada tipo de evento tem o seu teaser.

-- ------------------------------------------------------------
-- 1) Vídeo do hero, por tipo de evento
-- ------------------------------------------------------------
alter table public.empresa_conteudo_institucional
  add column if not exists video_url text;

-- ------------------------------------------------------------
-- 2) Conteúdo inicial de debutante
-- ------------------------------------------------------------
-- Valores do handoff (design/template-2 debbut). Idempotente: cada bloco
-- só age em quem ainda não tem aquilo em debutante, então rodar de novo
-- não duplica nem sobrescreve o que a cerimonialista já ajustou.
--
-- O per-convidado é R$ 15 (o protótipo trazia 25, mas a regra do negócio
-- é 15). Tudo isso é editável em Catálogo › Debutante.
do $$
declare
  e record;
begin
  for e in select id from public.empresas loop

    -- regra de convidados e condições
    insert into public.empresa_conteudo_institucional
      (empresa_id, tipo_evento, convidados_min, convidados_max,
       convidados_inclusos, valor_por_convidado_extra,
       condicao_parcelas_maximo, condicao_desconto_a_vista_percentual,
       condicao_entrada_percentual)
    -- entrada 0 e desconto 0: o handoff mostra "6x de total/6 sem juros",
    -- sem entrada e sem opção à vista. Editável em Catálogo › Debutante —
    -- se a entrada voltar a ser > 0, a proposta passa a exibi-la sozinha.
    values (e.id, 'debutante', 80, 300, 150, 15, 6, 0, 0)
    on conflict (empresa_id, tipo_evento) do nothing;

    -- pacotes
    if not exists (
      select 1 from public.empresa_pacotes
      where empresa_id = e.id and tipo_evento = 'debutante'
    ) then
      insert into public.empresa_pacotes
        (empresa_id, tipo_evento, ordem, nome, subtitulo, preco, recomendado, ativo, inclui)
      values
        (e.id, 'debutante', 1, 'ESSENCIAL',
         'Para quem quer o essencial com elegância', 4900, false, true,
         array[
           '3 reuniões de planejamento',
           'Curadoria de 5 fornecedores chave',
           'Cronograma e checklist digital',
           'Assessoria no dia (8h)',
           '1 assessora no dia',
           'Suporte por WhatsApp'
         ]),
        (e.id, 'debutante', 2, 'COMPLETA',
         'Equilíbrio perfeito entre tranquilidade e luxo', 6900, true, true,
         array[
           'Reuniões ilimitadas',
           'Curadoria completa de fornecedores',
           'Cronograma detalhado + visitas técnicas',
           'Acompanhamento de provas e degustações',
           'Assessoria no dia (12h)',
           'Equipe de 2 assessores + kit emergência',
           'Suporte humanizado até o pós-evento'
         ]),
        (e.id, 'debutante', 3, 'PREMIUM',
         'Experiência white-glove inesquecível', 9700, false, true,
         array[
           'Tudo da Completa +',
           'Conceito criativo e identidade visual',
           'Chá de debutante incluso (consultoria)',
           'Roteiro cinematográfico do dia',
           'Assessoria no dia (16h) + 3 assessoras',
           'Cerimonialista bilíngue',
           'Pós-evento com entrega de presentes e agradecimentos',
           'Concierge 24h na semana do evento'
         ]);
    end if;

    -- extra: o chá é um adicional como qualquer outro, então entra na
    -- tabela de extras em vez de virar um campo especial do template
    if not exists (
      select 1 from public.empresa_extras
      where empresa_id = e.id and tipo_evento = 'debutante'
    ) then
      insert into public.empresa_extras
        (empresa_id, tipo_evento, ordem, nome, descricao, preco, ativo)
      values (e.id, 'debutante', 1, 'Chá de debutante',
              'Consultoria completa + lista + decór mini', 800, true);
    end if;

    -- etapas do processo
    if not exists (
      select 1 from public.empresa_processo_etapas
      where empresa_id = e.id and tipo_evento = 'debutante'
    ) then
      insert into public.empresa_processo_etapas
        (empresa_id, tipo_evento, ordem, titulo, descricao)
      values
        (e.id, 'debutante', 1, 'CONEXÃO',
         'Primeiro encontro para entender o sonho da debutante e da família.'),
        (e.id, 'debutante', 2, 'PLANEJAMENTO',
         'Criamos conceito, orçamento mestre e cronograma reverso.'),
        (e.id, 'debutante', 3, 'PREPARATIVOS',
         'Fornecedores, provas de vestido, convites e detalhes.'),
        (e.id, 'debutante', 4, 'ALINHAMENTOS',
         'Reuniões finais e ensaio técnico.'),
        (e.id, 'debutante', 5, 'O GRANDE DIA',
         'Você vive. Nós garantimos a magia.');
    end if;

  end loop;
end $$;

-- ------------------------------------------------------------
-- 3) Consulta pública devolve o vídeo
-- ------------------------------------------------------------
-- Só acrescenta 'video_url' ao institucional da 057; o resto é idêntico.
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
