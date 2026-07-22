-- ============================================================
-- Vela — Migração 048: imagens de fundo da landing da proposta
--
-- Hero e "No dia do evento" passam a ter imagem de fundo. Quando a coluna
-- é NULL, a landing usa o asset padrão do sistema (/images/*.jpg); quando
-- preenchida, usa a URL customizada no Storage.
--
-- DECISÕES:
--  * Colunas em `empresas`, junto de logo_url: são propriedade da marca da
--    empresa, e a RLS de `empresas` já é owner-only — isso sozinho garante
--    a exigência de "só proprietária edita", sem policy nova.
--  * Bucket com escrita validada por função SECURITY DEFINER sobre a pasta
--    {empresa_id}/ (padrão das migrações 030/042/046).
--  * A RPC devolve as duas URLs no nível raiz (como logo_url) e NÃO dentro
--    de 'institucional': as imagens precisam aparecer mesmo se a empresa
--    não tiver conteúdo institucional cadastrado.
--
-- Execute no SQL Editor do Supabase (depois da 047).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Colunas
-- ------------------------------------------------------------
alter table public.empresas
  add column if not exists hero_imagem_url          text,
  add column if not exists no_dia_evento_imagem_url text;

commit;

-- ------------------------------------------------------------
-- 2) Bucket público + policies
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('landing-imagens', 'landing-imagens', true)
on conflict (id) do nothing;

create or replace function public.pode_gerenciar_landing_imagens(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meu_cargo() mc
    where mc.empresa_id::text = p_folder
      and mc.cargo = 'proprietaria'
  );
$$;

grant execute on function public.pode_gerenciar_landing_imagens(text) to authenticated;

drop policy if exists "Imagens da landing sao publicas" on storage.objects;
create policy "Imagens da landing sao publicas"
  on storage.objects for select
  using (bucket_id = 'landing-imagens');

drop policy if exists "Proprietaria sobe imagem da landing" on storage.objects;
create policy "Proprietaria sobe imagem da landing"
  on storage.objects for insert
  with check (
    bucket_id = 'landing-imagens'
    and public.pode_gerenciar_landing_imagens((storage.foldername(name))[1])
  );

-- upsert = update; sem esta policy, trocar a imagem falharia.
drop policy if exists "Proprietaria atualiza imagem da landing" on storage.objects;
create policy "Proprietaria atualiza imagem da landing"
  on storage.objects for update
  using (
    bucket_id = 'landing-imagens'
    and public.pode_gerenciar_landing_imagens((storage.foldername(name))[1])
  );

drop policy if exists "Proprietaria remove imagem da landing" on storage.objects;
create policy "Proprietaria remove imagem da landing"
  on storage.objects for delete
  using (
    bucket_id = 'landing-imagens'
    and public.pode_gerenciar_landing_imagens((storage.foldername(name))[1])
  );

-- ------------------------------------------------------------
-- 3) RPC pública: devolve as duas URLs
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

    -- NULL => a landing cai no asset padrão do sistema.
    'hero_imagem_url', e.hero_imagem_url,
    'no_dia_evento_imagem_url', e.no_dia_evento_imagem_url,

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
