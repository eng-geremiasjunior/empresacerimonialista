-- ============================================================
-- 163 — O contrato da cerimonialista
-- ============================================================
-- Execute no SQL Editor do Supabase, DEPOIS da 162. Convergente: pode
-- rodar de novo.
--
-- Até aqui a proposta aceita virava termo assinado, mas o contrato de
-- prestação de serviço continuava no WhatsApp dela. Esta migração guarda
-- o MODELO de contrato que ela sobe (um padrão da empresa e, quando
-- quiser, um diferente por tipo de evento) e ensina a proposta pública a
-- mostrar esse contrato antes do aceite.
--
-- O QUE PASSA A VALER
--
--   1. ONDE O MODELO FICA. `empresas` (o padrão) e
--      `empresa_conteudo_institucional` (a exceção do tipo) ganham as
--      mesmas 5 colunas: caminho, nome, SHA-256, tamanho e quando subiu.
--      O arquivo mora no balde privado `contratos` (110), numa pasta que
--      não é de evento: {empresa}/modelos/{padrao|tipo}/{id}/{arquivo}.
--      As políticas do balde (119) só deixam a sessão ler caminho com
--      evento no 2º segmento — então ninguém lê o modelo pela sessão; quem
--      assina a leitura é o servidor, com a chave de serviço.
--
--   2. O CAMINHO SÓ APONTA PARA A PRÓPRIA EMPRESA. É CHECK, e não só
--      código: a proprietária grava estas colunas pela sessão (a policy
--      empresas_owner da 021 e a conteudo_institucional_proprietaria da
--      045 deixam), e a rota pública do contrato assina com a chave de
--      serviço o caminho que estiver aqui. Sem o CHECK, um caminho
--      forjado apontando para a pasta de outra empresa viraria um link
--      público para o arquivo dela. Caminho, nome e SHA-256 andam juntos:
--      ou os três, ou nenhum.
--
--   3. A PROPOSTA MOSTRA O CONTRATO ANTES DO ACEITE.
--      `consultar_orcamento_publico` (copy-forward da 101b — conferido
--      contra o banco em 15/09/2026: mesmas chaves, na mesma ordem) ganha
--      a chave `contrato` = {nome, sha256, aceito}:
--        - proposta aceita: o contrato que foi anexado ao aceite
--          (evento_documento, categoria contrato_prestacao), aceito=true;
--        - proposta ainda aberta: o modelo do tipo; sem ele, o padrão da
--          empresa; sem os dois, null.
--      O SHA-256 vai junto de propósito: o modal manda de volta o hash do
--      contrato que a cliente leu, e a rota recusa o aceite se o modelo
--      mudou nesse meio-tempo. O caminho do arquivo NUNCA sai daqui.
--
--   4. WHATSAPP E E-MAIL COM RESERVA. No bloco `institucional`,
--      `whatsapp_contato` e `email_contato` do tipo caem para o primeiro
--      preenchido de qualquer tipo da empresa — quem preencheu só o de
--      casamento não fica sem botão na proposta de debutante (a mesma
--      regra que lib/orcamento-evento.ts já usa no e-mail).
--
--   5. O TERMO É DE QUEM CONTRATA (decisão do dono, 15/09/2026: "dado de
--      pagamento e dado pessoal são de visão apenas da pessoa que
--      contrata"). O portal é aberto a quem a cerimonialista convida — mãe,
--      pai, outro —, então:
--        - a policy do portal em evento_documento (162) passa a entregar
--          SÓ o contrato de prestação. O termo (valor, CPF, e-mail,
--          telefone) chegava pela API a qualquer conta do portal, mesmo sem
--          tela nenhuma mostrando;
--        - portal_linha_do_tempo (089) deixa de devolver o valor do aceite.
--          A tela já escondia; a função entregava a quem chamasse direto.
--      Quem contrata recebe o termo por e-mail; a equipe continua vendo.
--
-- NÃO MUDA: nenhuma chave removida ou renomeada na RPC pública; nenhum
-- balde novo; as colunas de portal_linha_do_tempo são as mesmas.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) As colunas do modelo
-- ------------------------------------------------------------
alter table public.empresas add column if not exists contrato_modelo_path   text;
alter table public.empresas add column if not exists contrato_modelo_nome   text;
alter table public.empresas add column if not exists contrato_modelo_sha256 text;
alter table public.empresas add column if not exists contrato_modelo_bytes  int;
alter table public.empresas add column if not exists contrato_modelo_em     timestamptz;

alter table public.empresa_conteudo_institucional add column if not exists contrato_modelo_path   text;
alter table public.empresa_conteudo_institucional add column if not exists contrato_modelo_nome   text;
alter table public.empresa_conteudo_institucional add column if not exists contrato_modelo_sha256 text;
alter table public.empresa_conteudo_institucional add column if not exists contrato_modelo_bytes  int;
alter table public.empresa_conteudo_institucional add column if not exists contrato_modelo_em     timestamptz;

comment on column public.empresas.contrato_modelo_path is
  'Contrato de prestação padrão da empresa, no balde contratos: {empresa}/modelos/padrao/{id}/{arquivo}. A exceção por tipo mora em empresa_conteudo_institucional.';
comment on column public.empresa_conteudo_institucional.contrato_modelo_path is
  'Contrato de prestação só deste tipo de evento (exceção ao padrão da empresa): {empresa}/modelos/{tipo}/{id}/{arquivo}.';

-- ------------------------------------------------------------
-- 2) As travas: caminho da própria empresa, trio completo, hash em hex
-- ------------------------------------------------------------
-- Em bloco DO, e não inline no ADD COLUMN: é o molde do projeto para
-- CHECK convergente (a migração pode rodar de novo sem duplicar nada).
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'empresas_contrato_modelo_path_check'
                    and conrelid = 'public.empresas'::regclass) then
    alter table public.empresas
      add constraint empresas_contrato_modelo_path_check
      check (contrato_modelo_path is null
             or contrato_modelo_path like (id::text || '/modelos/%'));
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'empresas_contrato_modelo_completo_check'
                    and conrelid = 'public.empresas'::regclass) then
    alter table public.empresas
      add constraint empresas_contrato_modelo_completo_check
      check ((contrato_modelo_path is null) = (contrato_modelo_nome is null)
             and (contrato_modelo_path is null) = (contrato_modelo_sha256 is null));
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'empresas_contrato_modelo_sha256_check'
                    and conrelid = 'public.empresas'::regclass) then
    alter table public.empresas
      add constraint empresas_contrato_modelo_sha256_check
      check (contrato_modelo_sha256 is null
             or contrato_modelo_sha256 ~ '^[0-9a-f]{64}$');
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'conteudo_contrato_modelo_path_check'
                    and conrelid = 'public.empresa_conteudo_institucional'::regclass) then
    alter table public.empresa_conteudo_institucional
      add constraint conteudo_contrato_modelo_path_check
      check (contrato_modelo_path is null
             or contrato_modelo_path like (empresa_id::text || '/modelos/%'));
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'conteudo_contrato_modelo_completo_check'
                    and conrelid = 'public.empresa_conteudo_institucional'::regclass) then
    alter table public.empresa_conteudo_institucional
      add constraint conteudo_contrato_modelo_completo_check
      check ((contrato_modelo_path is null) = (contrato_modelo_nome is null)
             and (contrato_modelo_path is null) = (contrato_modelo_sha256 is null));
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'conteudo_contrato_modelo_sha256_check'
                    and conrelid = 'public.empresa_conteudo_institucional'::regclass) then
    alter table public.empresa_conteudo_institucional
      add constraint conteudo_contrato_modelo_sha256_check
      check (contrato_modelo_sha256 is null
             or contrato_modelo_sha256 ~ '^[0-9a-f]{64}$');
  end if;
end $$;

-- ------------------------------------------------------------
-- 3) A proposta pública: contrato + contato com reserva
-- ------------------------------------------------------------
-- Corpo da 101b; mudou só o que está marcado com "163".
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
    'dias_restantes', greatest(0, o.data_validade - (now() at time zone 'America/Sao_Paulo')::date),

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
        'citacao_hero', c.citacao_hero,
        'stat_anos_experiencia', c.stat_anos_experiencia,
        'stat_eventos_realizados', c.stat_eventos_realizados,
        'stat_dedicacao_percentual', c.stat_dedicacao_percentual,
        'stat_equipe_texto', c.stat_equipe_texto,
        'condicao_entrada_percentual', c.condicao_entrada_percentual,
        'condicao_parcelas_maximo', c.condicao_parcelas_maximo,
        'condicao_desconto_a_vista_percentual', c.condicao_desconto_a_vista_percentual,
        'condicao_prazo_parcelas_texto', c.condicao_prazo_parcelas_texto,
        -- 163: o do tipo; vazio, o primeiro preenchido de qualquer tipo
        'whatsapp_contato', coalesce(
          nullif(trim(c.whatsapp_contato), ''),
          (select nullif(trim(c2.whatsapp_contato), '')
             from public.empresa_conteudo_institucional c2
            where c2.empresa_id = o.empresa_id
              and nullif(trim(c2.whatsapp_contato), '') is not null
            order by c2.tipo_evento
            limit 1)
        ),
        'email_contato', coalesce(
          nullif(trim(c.email_contato), ''),
          (select nullif(trim(c2.email_contato), '')
             from public.empresa_conteudo_institucional c2
            where c2.empresa_id = o.empresa_id
              and nullif(trim(c2.email_contato), '') is not null
            order by c2.tipo_evento
            limit 1)
        ),
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

    'blocos', coalesce(
      (
        select json_agg(
          json_build_object(
            'secao', b.secao, 'icone', b.icone, 'titulo', b.titulo,
            'texto_curto', b.texto_curto, 'texto_longo', b.texto_longo
          ) order by b.secao, b.ordem, b.created_at
        )
        from public.empresa_proposta_blocos b
        where b.empresa_id = o.empresa_id
          and b.tipo_evento = o.tipo_evento
      ), '[]'::json
    ),

    'comentarios', coalesce(
      (
        select json_agg(
          json_build_object('autor_nome', cm.autor_nome, 'texto', cm.texto, 'created_at', cm.created_at)
          order by cm.created_at
        )
        from (
          select * from public.orcamento_comentarios c2
          where c2.orcamento_id = o.id
          order by c2.created_at desc
          limit 50
        ) cm
      ), '[]'::json
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
    ),

    -- 163: o contrato de prestação. Aceita: o que foi anexado ao aceite.
    -- Aberta: o do tipo, senão o padrão da empresa. Nunca o caminho.
    'contrato', (
      select json_build_object('nome', m.nome, 'sha256', m.sha256, 'aceito', m.prioridade = 0)
      from (
        (select d.nome, d.sha256, 0 as prioridade
           from public.evento_documento d
          where d.orcamento_id = o.id
            and d.categoria = 'contrato_prestacao'
          order by d.created_at desc
          limit 1)
        union all
        (select c.contrato_modelo_nome, c.contrato_modelo_sha256, 1
           from public.empresa_conteudo_institucional c
          where o.status <> 'aprovado'
            and c.empresa_id = o.empresa_id
            and c.tipo_evento = o.tipo_evento
            and c.contrato_modelo_path is not null)
        union all
        (select e.contrato_modelo_nome, e.contrato_modelo_sha256, 2
          where o.status <> 'aprovado'
            and e.contrato_modelo_path is not null)
      ) m
      order by m.prioridade
      limit 1
    )
  )
  from public.orcamentos o
  join public.empresas e on e.id = o.empresa_id
  where o.hash_publico = p_hash;
$$;

revoke all on function public.consultar_orcamento_publico(text) from public;
grant execute on function public.consultar_orcamento_publico(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 5) O termo é de quem contrata
-- ------------------------------------------------------------
-- A mesma policy da 162, agora só com o contrato. A 162 também foi
-- editada no repositório com este texto, para uma reexecução dela não
-- reabrir o termo.
drop policy if exists "evento_documento_portal_le" on public.evento_documento;
create policy "evento_documento_portal_le"
  on public.evento_documento for select
  using (
    categoria = 'contrato_prestacao'
    and event_id in (select public.eventos_da_cliente())
  );

-- Corpo da 089; mudou só o valor do aceite (163). As colunas do retorno
-- são as mesmas, e por isso create or replace basta.
create or replace function public.portal_linha_do_tempo(p_event_id uuid)
returns table (
  tipo    text,
  titulo  text,
  detalhe text,
  valor   numeric,
  quando  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select t.tipo, t.titulo, t.detalhe, t.valor, t.quando
  from (
    -- 1) o aceite que deu origem ao evento. 163: sem valor — o que ela
    --    pagou pela assessoria é de quem contrata, não de quem o portal
    --    alcança
    select 'aceite'::text        as tipo,
           'Proposta aceita'::text as titulo,
           a.pacote_nome         as detalhe,
           null::numeric         as valor,
           a.created_at          as quando
    from public.orcamentos o
    join public.orcamento_aceites a on a.orcamento_id = o.id
    where o.evento_gerado_id = p_event_id

    union all

    -- 2) contratações (mesma regra da RPC de contratados)
    select 'contratacao', c.titulo, c.fornecedor, c.valor, c.decidida_em
    from (
      select distinct on (ed.id)
        ed.titulo,
        s.name as fornecedor,
        ed.decidida_em,
        (select v.valor_numero
           from public.evento_campo_valor v
          where v.evento_decisao_id = ed.id
            and v.codigo = 'valor_contratado'
            and v.valor_numero is not null
          limit 1) as valor
      from public.evento_decisao ed
      join public.evento_campo_valor forn
        on forn.evento_decisao_id = ed.id
       and forn.tipo = 'fornecedor'
       and forn.valor_supplier_id is not null
      join public.suppliers s on s.id = forn.valor_supplier_id
      where ed.event_id = p_event_id
        and ed.estado = 'decidida'
      order by ed.id, forn.ordem
    ) c
    where c.decidida_em is not null

    union all

    -- 3) compromissos em que ela comparece (passado e futuro; cancelado
    --    fica fora). Meio-dia como hora neutra evita o dia "escorregar"
    --    na conversão de fuso quando hora é nula.
    select 'compromisso', co.titulo, co.local, null::numeric,
           (co.data + coalesce(co.hora, '12:00'::time))::timestamptz
    from public.compromisso co
    where co.event_id = p_event_id
      and co.responsavel in ('noivos', 'ambos')
      and co.estado <> 'cancelado'
  ) t
  where public.sou_cliente_do_evento(p_event_id)
     or public.pode_ver_evento(p_event_id)
  order by t.quando desc nulls last;
$$;

revoke all on function public.portal_linha_do_tempo(uuid) from public, anon;
grant execute on function public.portal_linha_do_tempo(uuid) to authenticated;

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'empresas: as 5 colunas do contrato modelo existem' as item,
       (select count(*) = 5 from information_schema.columns
         where table_schema = 'public' and table_name = 'empresas'
           and column_name in ('contrato_modelo_path', 'contrato_modelo_nome',
                               'contrato_modelo_sha256', 'contrato_modelo_bytes',
                               'contrato_modelo_em')) as ok

union all
select 'empresa_conteudo_institucional: as 5 colunas da exceção por tipo existem',
       (select count(*) = 5 from information_schema.columns
         where table_schema = 'public' and table_name = 'empresa_conteudo_institucional'
           and column_name in ('contrato_modelo_path', 'contrato_modelo_nome',
                               'contrato_modelo_sha256', 'contrato_modelo_bytes',
                               'contrato_modelo_em'))

union all
select 'empresas: as 3 travas do modelo existem (caminho, trio, hash)',
       (select count(*) = 3 from pg_constraint
         where conrelid = 'public.empresas'::regclass and contype = 'c'
           and conname in ('empresas_contrato_modelo_path_check',
                           'empresas_contrato_modelo_completo_check',
                           'empresas_contrato_modelo_sha256_check'))

union all
select 'empresa_conteudo_institucional: as 3 travas do modelo existem',
       (select count(*) = 3 from pg_constraint
         where conrelid = 'public.empresa_conteudo_institucional'::regclass and contype = 'c'
           and conname in ('conteudo_contrato_modelo_path_check',
                           'conteudo_contrato_modelo_completo_check',
                           'conteudo_contrato_modelo_sha256_check'))

-- pg_get_constraintdef reescreve: id::text vira (id)::text e LIKE vira ~~
union all
select 'empresas: o caminho do modelo só aponta para a pasta da própria empresa',
       (select pg_get_constraintdef(c.oid) ilike '%(id)::text%/modelos/%'
          from pg_constraint c
         where c.conrelid = 'public.empresas'::regclass
           and c.conname = 'empresas_contrato_modelo_path_check')

union all
select 'empresa_conteudo_institucional: o caminho só aponta para a própria empresa',
       (select pg_get_constraintdef(c.oid) ilike '%(empresa_id)::text%/modelos/%'
          from pg_constraint c
         where c.conrelid = 'public.empresa_conteudo_institucional'::regclass
           and c.conname = 'conteudo_contrato_modelo_path_check')

union all
select 'consultar_orcamento_publico: devolve o contrato (aceito e modelo)',
       (select prosrc ilike '%''contrato'', (%'
           and prosrc ilike '%contrato_prestacao%'
           and prosrc ilike '%contrato_modelo_sha256%'
          from pg_proc
         where proname = 'consultar_orcamento_publico'
           and pronamespace = 'public'::regnamespace)

union all
select 'consultar_orcamento_publico: nunca devolve caminho de arquivo',
       (select prosrc not ilike '%storage_path%'
           and prosrc not ilike '%''contrato_modelo_path''%'
          from pg_proc
         where proname = 'consultar_orcamento_publico'
           and pronamespace = 'public'::regnamespace)

union all
select 'consultar_orcamento_publico: modelo só enquanto a proposta não foi aceita',
       (select prosrc ilike '%o.status <> ''aprovado''%'
          from pg_proc
         where proname = 'consultar_orcamento_publico'
           and pronamespace = 'public'::regnamespace)

union all
select 'consultar_orcamento_publico: WhatsApp e e-mail com reserva de qualquer tipo',
       (select prosrc ilike '%nullif(trim(c2.whatsapp_contato), '''')%'
           and prosrc ilike '%nullif(trim(c2.email_contato), '''')%'
          from pg_proc
         where proname = 'consultar_orcamento_publico'
           and pronamespace = 'public'::regnamespace)

union all
select 'consultar_orcamento_publico: nenhuma chave da 101b sumiu',
       (select prosrc ilike '%''itens''%' and prosrc ilike '%''pacotes''%'
           and prosrc ilike '%''extras''%' and prosrc ilike '%''institucional''%'
           and prosrc ilike '%''blocos''%' and prosrc ilike '%''comentarios''%'
           and prosrc ilike '%''etapas''%' and prosrc ilike '%''faq''%'
           and prosrc ilike '%''fotos''%' and prosrc ilike '%''depoimentos''%'
           and prosrc ilike '%''aceite''%' and prosrc ilike '%''citacao_hero''%'
           and prosrc ilike '%''video_url''%' and prosrc ilike '%''dias_restantes''%'
          from pg_proc
         where proname = 'consultar_orcamento_publico'
           and pronamespace = 'public'::regnamespace)

union all
select 'consultar_orcamento_publico: security definer, com search_path fixo',
       (select prosecdef and proconfig::text ilike '%search_path=public%'
          from pg_proc
         where proname = 'consultar_orcamento_publico'
           and pronamespace = 'public'::regnamespace)

union all
select 'evento_documento: o portal lê só o contrato — o termo (valor e CPF) nunca',
       (select qual ilike '%contrato_prestacao%'
           and qual not ilike '%termo_aceite%'
           and qual ilike '%eventos_da_cliente%'
          from pg_policies
         where schemaname = 'public' and tablename = 'evento_documento'
           and policyname = 'evento_documento_portal_le')

union all
select 'portal_linha_do_tempo: o aceite sai sem valor',
       (select prosrc not ilike '%a.valor_total%'
           and prosrc ilike '%null::numeric         as valor%'
           and prosrc ilike '%valor_contratado%'
          from pg_proc
         where proname = 'portal_linha_do_tempo'
           and pronamespace = 'public'::regnamespace)

union all
select 'portal_linha_do_tempo: só quem tem sessão executa (anon não)',
       has_function_privilege('authenticated', 'public.portal_linha_do_tempo(uuid)', 'EXECUTE')
       and not has_function_privilege('anon', 'public.portal_linha_do_tempo(uuid)', 'EXECUTE')

union all
select 'consultar_orcamento_publico: anon e authenticated executam',
       has_function_privilege('anon', 'public.consultar_orcamento_publico(text)', 'EXECUTE')
       and has_function_privilege('authenticated', 'public.consultar_orcamento_publico(text)', 'EXECUTE');
