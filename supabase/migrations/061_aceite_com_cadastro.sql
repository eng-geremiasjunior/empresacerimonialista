-- 061 — Aceite grava o cadastro e avisa a cerimonialista
--
-- Ate aqui o aceite so registrava assinatura e valores; os dados do
-- cliente vinham depois, numa segunda chamada (preencher_ficha) que podia
-- falhar calada e deixar a proposta aceita sem cadastro nenhum.
--
-- Agora e uma transacao so: aceite + assinatura + ficha + notificacao. Os
-- tres parametros novos tem default null, entao qualquer chamada antiga
-- de 11 argumentos continua valida enquanto o deploy nao termina.
--
-- A 043 fixou a assinatura de 11 parametros; acrescentar parametros cria
-- uma sobrecarga em vez de substituir, por isso o drop explicito.

drop function if exists public.registrar_aceite_proposta(
  text, uuid, int, uuid[], text, int, text, text, text, text, text);

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
  -- cadastro do cliente: chega junto do aceite para tudo cair numa
  -- transacao so (antes eram duas chamadas, e a segunda podia falhar
  -- calada deixando o aceite sem ficha)
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
  -- contato_* preserva o que a cerimonialista digitou; ficha_* e o que o
  -- cliente confirmou ao assinar. So preenche o que veio: um template que
  -- ainda nao pede um campo nao apaga o que ja estava la.
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
