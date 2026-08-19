-- 101 — Blocos editáveis da proposta, comentários dos noivos e o fuso
--
-- Três dívidas do módulo de orçamento, na ordem em que doem:
--
-- 1) BLOCOS: "o que está incluso", "no dia" e "próximos passos" eram
--    copy fixa em arquivo de código — com alegações de OUTRA empresa
--    ("Top 1% GV", "120+ fornecedores") saindo em propostas reais, sem
--    nenhuma tela para editar. Nasce empresa_proposta_blocos, editável
--    no Catálogo. SEM seed em SQL, de propósito: a copy-padrão vive num
--    módulo TS único; banco vazio → o template usa o padrão; o editor
--    abre com o mesmo padrão e o primeiro salvar grava. Empresas de
--    hoje, de amanhã e tipos novos ficam idênticos por construção, e a
--    trigger de cadastro de empresa (que a 057 documenta como frágil)
--    não é tocada.
--
-- 2) COMENTÁRIOS: o design novo tem "Observações dos noivos" — o casal
--    pergunta na própria proposta em vez de sumir para o WhatsApp.
--    Tabela sem NENHUMA policy de anon: escrita só pela RPC (security
--    definer, hash como credencial, com teto e intervalo), leitura
--    pública só via consultar_orcamento_publico.
--
-- 3) FUSO: a validade expirava em UTC (current_date do servidor) — às
--    21:00 de Brasília a proposta já recusava aceite enquanto a tela
--    dizia "válida até hoje". Todos os pontos que comparam validade
--    passam a usar America/Sao_Paulo.
--
-- A RPC consultar_orcamento_publico é redefinida na PARTE 2 (arquivo
-- 101b), copy-forward da 059 com as chaves novas — aplique as duas.
--
-- Execute no SQL Editor do Supabase (depois da 100).

begin;

-- ============================================================
-- 1) BLOCOS EDITÁVEIS DA PROPOSTA
-- ============================================================
create table if not exists public.empresa_proposta_blocos (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  tipo_evento public.tipo_evento_catalogo not null,
  secao       text not null check (secao in ('incluso', 'no_dia', 'proximos_passos')),
  ordem       int not null default 0,
  icone       text,
  titulo      text not null,
  texto_curto text,
  texto_longo text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_proposta_blocos
  on public.empresa_proposta_blocos (empresa_id, tipo_evento, secao, ordem);

comment on table public.empresa_proposta_blocos is
  'Blocos de texto da proposta pública (incluso / no dia / próximos passos). Sem linha = o template usa a copy-padrão do código. O editor salva por (empresa, tipo, secao) — nunca por empresa/tipo inteiro.';

-- o insert em lote do PostgREST manda NULL explícito no que faltou, e
-- NULL explícito não aciona DEFAULT (lição da 093)
create or replace function public.trg_proposta_bloco_defaults()
returns trigger
language plpgsql
as $$
begin
  new.ordem := coalesce(new.ordem, 0);
  return new;
end $$;

drop trigger if exists trg_proposta_bloco_defaults on public.empresa_proposta_blocos;
create trigger trg_proposta_bloco_defaults
  before insert or update on public.empresa_proposta_blocos
  for each row execute function public.trg_proposta_bloco_defaults();

alter table public.empresa_proposta_blocos enable row level security;

drop policy if exists "proposta_blocos_proprietaria" on public.empresa_proposta_blocos;
create policy "proposta_blocos_proprietaria"
  on public.empresa_proposta_blocos
  for all
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- ============================================================
-- 2) CITAÇÃO DO HERO (o único campo institucional que faltava;
--    os stats existem desde a 045)
-- ============================================================
alter table public.empresa_conteudo_institucional
  add column if not exists citacao_hero text;

-- ============================================================
-- 3) COMENTÁRIOS DOS NOIVOS
-- ============================================================
create table if not exists public.orcamento_comentarios (
  id           uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  autor_nome   text not null,
  texto        text not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_orc_comentarios
  on public.orcamento_comentarios (orcamento_id, created_at);

alter table public.orcamento_comentarios enable row level security;

-- NENHUMA policy de anon: quem tem o hash escreve/lê pela RPC, e só.
drop policy if exists "comentarios_equipe_le" on public.orcamento_comentarios;
create policy "comentarios_equipe_le"
  on public.orcamento_comentarios
  for select using (
    exists (
      select 1 from public.orcamentos o
      where o.id = orcamento_id
        and o.empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    )
  );

drop policy if exists "comentarios_proprietaria_apaga" on public.orcamento_comentarios;
create policy "comentarios_proprietaria_apaga"
  on public.orcamento_comentarios
  for delete using (
    exists (
      select 1 from public.orcamentos o
      where o.id = orcamento_id
        and o.empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    )
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- o tipo novo de notificação (lista completa da 091 + o novo)
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'tarefa_proxima', 'evento', 'pagamento', 'mensagem', 'fornecedor',
    'orcamento_aprovado', 'orcamento_recusado', 'compromisso',
    'portal', 'orcamento_comentario'
  ));

create or replace function public.comentar_proposta_publica(
  p_hash  text,
  p_autor text,
  p_texto text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orc    public.orcamentos%rowtype;
  v_autor  text;
  v_texto  text;
  v_total  int;
  v_ultimo timestamptz;
  v_dono   uuid;
  v_id     uuid;
begin
  select * into v_orc from public.orcamentos where hash_publico = p_hash;
  -- erro genérico de propósito: não distinguir "não existe" de "expirou"
  if not found or v_orc.status not in ('enviado', 'aprovado') then
    return json_build_object('error', 'não foi possível comentar');
  end if;
  if v_orc.status = 'enviado'
     and v_orc.data_validade < (now() at time zone 'America/Sao_Paulo')::date then
    return json_build_object('error', 'não foi possível comentar');
  end if;

  v_autor := left(trim(coalesce(p_autor, '')), 80);
  v_texto := left(trim(coalesce(p_texto, '')), 500);
  if v_autor = '' or v_texto = '' then
    return json_build_object('error', 'escreva a observação e o seu nome');
  end if;

  -- teto de segurança: alto para uso real, baixo para conter flood
  select count(*), max(created_at) into v_total, v_ultimo
  from public.orcamento_comentarios where orcamento_id = v_orc.id;
  if v_total >= 30 then
    return json_build_object('error', 'limite de observações atingido — fale direto no WhatsApp');
  end if;
  -- intervalo mínimo: mata flood e o duplo-clique de uma vez
  if v_ultimo is not null and v_ultimo > now() - interval '20 seconds' then
    return json_build_object('error', 'aguarde um instante antes de enviar de novo');
  end if;

  insert into public.orcamento_comentarios (orcamento_id, autor_nome, texto)
  values (v_orc.id, v_autor, v_texto)
  returning id into v_id;

  select coalesce(
    (select m.user_id from public.membros_equipe m where m.id = v_orc.cerimonialista_responsavel_id),
    (select e.owner_user_id from public.empresas e where e.id = v_orc.empresa_id)
  ) into v_dono;

  if v_dono is not null then
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (v_dono, 'orcamento_comentario',
      v_autor || ' comentou na proposta',
      left(v_texto, 120) || case when length(v_texto) > 120 then '…' else '' end,
      '/orcamentos/' || v_orc.id);
  end if;

  return json_build_object(
    'success', true,
    'comentario', json_build_object(
      'id', v_id, 'autor_nome', v_autor, 'texto', v_texto, 'created_at', now()
    )
  );
end;
$$;

revoke all on function public.comentar_proposta_publica(text, text, text) from public;
grant execute on function public.comentar_proposta_publica(text, text, text) to anon, authenticated;

-- ============================================================
-- 4) FUSO: A VALIDADE EXPIRA À MEIA-NOITE DE BRASÍLIA
-- ============================================================
-- current_date no Supabase é UTC: a proposta "morria" às 21:00 de
-- Brasília. Corrigido nos pontos que comparam validade. O Brasil não
-- tem horário de verão desde 2019 — fuso fixo é seguro.

-- 4a) O cron de expiração (corpo da 043, só o fuso muda)
create or replace function public.expirar_orcamentos_vencidos()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qtd int;
begin
  update public.orcamentos
  set status = 'expirado', updated_at = now()
  where status = 'enviado'
    and data_validade < (now() at time zone 'America/Sao_Paulo')::date;
  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

-- 4b) O aceite: corpo idêntico ao da 061; mudou SÓ o check de validade.
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
  p_observacoes     text default null,
  p_cpf             text default null,
  p_email           text default null,
  p_telefone        text default null
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

  select * into v_existente from public.orcamento_aceites
  where orcamento_id = v_orc.id order by created_at desc limit 1;
  if found then
    return json_build_object('success', true, 'recibo', v_existente.recibo_codigo,
      'valor_total', v_existente.valor_total, 'ja_existia', true);
  end if;

  if v_orc.status not in ('enviado') then
    return json_build_object('error', 'esta proposta não está disponível para aceite');
  end if;
  if v_orc.data_validade < (now() at time zone 'America/Sao_Paulo')::date then
    update public.orcamentos set status = 'expirado', updated_at = now() where id = v_orc.id;
    return json_build_object('error', 'esta proposta expirou');
  end if;
  if coalesce(trim(p_nome_noiva), '') = '' then
    return json_build_object('error', 'informe o nome de quem está aceitando');
  end if;
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

  v_convidados := greatest(
    coalesce(v_cfg.convidados_min, 50),
    least(coalesce(v_cfg.convidados_max, 300), coalesce(p_convidados, v_cfg.convidados_inclusos))
  );
  v_val_conv := greatest(0, v_convidados - coalesce(v_cfg.convidados_inclusos, 150))
                * coalesce(v_cfg.valor_por_convidado_extra, 0);

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

  select upper(regexp_replace(substring(e.nome from 1 for 2), '[^a-zA-Z]', 'X', 'g'))
    into v_codigo from public.empresas e where e.id = v_orc.empresa_id;
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

  update public.orcamentos
  set status = 'aprovado', respondido_em = now(),
      valor_total = v_total, updated_at = now(),
      ficha_nome     = coalesce(nullif(trim(p_nome_noiva), ''), ficha_nome),
      ficha_cpf      = coalesce(nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), ''), ficha_cpf),
      ficha_email    = coalesce(nullif(trim(coalesce(p_email, '')), ''), ficha_email),
      ficha_telefone = coalesce(nullif(trim(coalesce(p_telefone, '')), ''), ficha_telefone),
      ficha_whatsapp = coalesce(nullif(trim(coalesce(p_telefone, '')), ''), ficha_whatsapp),
      ficha_preenchida_em = case
        when coalesce(nullif(trim(coalesce(p_cpf, '')), ''),
                      nullif(trim(coalesce(p_email, '')), ''),
                      nullif(trim(coalesce(p_telefone, '')), '')) is not null
        then now() else ficha_preenchida_em end
  where id = v_orc.id;

  select coalesce(
    (select m.user_id from public.membros_equipe m where m.id = v_orc.cerimonialista_responsavel_id),
    (select e.owner_user_id from public.empresas e where e.id = v_orc.empresa_id)
  ) into v_dono;

  if v_dono is not null then
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (v_dono, 'orcamento_aprovado',
      trim(p_nome_noiva) || ' aceitou a proposta!',
      v_pac.nome || ' — R$ ' || to_char(v_total, 'FM999G999G990D00') || ' · recibo ' || v_codigo
        || coalesce(' · ' || nullif(trim(coalesce(p_telefone, '')), ''), '')
        || coalesce(' · ' || nullif(trim(coalesce(p_email, '')), ''), '')
        || coalesce(' · CPF ' || nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), ''), ''),
      '/orcamentos/' || v_orc.id);
  end if;

  return json_build_object(
    'success', true, 'recibo', v_codigo, 'valor_total', v_total,
    'valor_entrada', v_entrada, 'valor_parcela', v_parcela, 'ja_existia', false
  );
end;
$$;

revoke all on function public.registrar_aceite_proposta(
  text, uuid, int, uuid[], text, int, text, text, text, text, text, text, text, text) from public;
grant execute on function public.registrar_aceite_proposta(
  text, uuid, int, uuid[], text, int, text, text, text, text, text, text, text, text) to anon, authenticated;

commit;

do $$
begin
  raise notice '101 aplicada: blocos, citacao_hero, comentarios e fuso. Aplique tambem a 101b (consultar_orcamento_publico).';
end $$;
