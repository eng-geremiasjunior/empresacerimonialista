-- ============================================================
-- 151 — Conta cancelada vira somente leitura, depois da cortesia
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- O BURACO. Cancelar parava a cobrança e travava a criação de evento e
-- de login, mas `pode_editar_evento` — a função por onde passam 180
-- policies — NUNCA consultou a assinatura. Quem cancelasse com a agenda
-- cheia seguia operando os eventos que já tinha, de graça, até o último
-- deles concluir: um ano, no pior caso (dono, 06/09/2026).
--
-- A REGRA, escolhida por ele: a conta continua vendo, imprimindo e
-- exportando para sempre — isso é dela e os termos prometem. Trinta dias
-- depois do fim do período pago, ela deixa de ACEITAR ALTERAÇÕES. Assinou
-- de novo, destrava na hora.
--
-- Os trinta dias não são generosidade: sem eles, quem cancela no dia 5 e
-- tem um casamento no dia 2 do mês seguinte fica sem roteiro editável no
-- dia do evento — e quem apanha na frente da cliente é ela, por uma
-- decisão comercial nossa.
--
-- O QUE ESTA MIGRAÇÃO NÃO PODE FAZER, e a conferência prova que não faz:
-- congelar quem nunca assinou. Conta em trial, em cortesia, no plano
-- piloto ou sem linha nenhuma em `assinaturas` NÃO entra aqui — o teto
-- delas já é o de conta sem plano (um evento na vida), e congelá-las
-- quebraria o primeiro evento por nossa conta e toda conta herdada.
-- Inadimplente também fica de fora: cobrança recusada não bloqueia nada
-- (doutrina da tela e dos termos); o caminho dela é virar cancelada, e aí
-- sim a contagem começa.
--
-- QUATRO CORREÇÕES DA REVISÃO ADVERSARIAL (06/09/2026), todas do lado
-- de "não congelar quem não devia" ou "não deixar passar quem devia":
--
--   1. FUSO. A sessão do Postgres roda em UTC. Com `current_date`, a
--      conta congelava às 21h do ÚLTIMO dia de cortesia — e se esse dia
--      for o do casamento, o roteiro para de salvar no meio da festa,
--      exatamente o desastre que os 30 dias existem para evitar. Agora a
--      data é medida em America/Sao_Paulo, como no resto do sistema
--      (101, 108, 114, 137 e src/lib/tempo.ts).
--
--   2. JÁ FOI PAGANTE. O painel do dono carimba `cancelada_em = hoje` em
--      QUALQUER conta que ele marque como 'cancelada' — inclusive trial e
--      piloto, e criando a linha em `assinaturas` se não existia. Só o
--      status não prova que a conta um dia pagou. Agora exige-se também
--      rastro de assinatura de verdade: id no gateway, um pagamento
--      registrado ou um vencimento conhecido. Sem rastro, não congela.
--
--   3. O MÊS PAGO NÃO SE PERDE NUM NULO. `proximo_vencimento` é o fim do
--      período pago, e o webhook do gateway o sobrescreve com null no
--      cancelamento (assinatura encerrada não tem próxima cobrança). Sem
--      defesa, a cortesia passaria a contar do dia do cancelamento e a
--      conta congelaria ~25 dias antes do combinado. `ultimo_pagamento_em
--      + 30` entra como piso: o ciclo é mensal, e o que foi pago vale.
--
--   4. UMA FÓRMULA SÓ. A aritmética dos 30 dias estava escrita três
--      vezes (função, função-irmã e conferência) — a conferência provava
--      a cópia dela, não o código instalado. Agora existe
--      `congela_em(...)`, e as três chamam a mesma.
--
-- E DUAS PORTAS QUE `pode_editar_evento` NÃO FECHA:
--
--   · RPC `security definer` não passa por policy nenhuma. Sem tratar uma
--     a uma, a conta congelada abria o Modo Evento no sábado e conduzia o
--     roteiro item a item, a festa inteira — que é justamente o que ela
--     deixou de pagar. Tratadas aqui: `conferir_item_dia` e
--     `atualizar_status_item`.
--   · `events_delete`, `clients_*` e `suppliers_*` nunca passaram por
--     `pode_editar_evento`. Conta "só para leitura" que não corrige um
--     horário mas apaga o evento inteiro é o pior desfecho possível.
--
-- Aditiva. Conferência no fim, tudo `true`.
-- ============================================================

-- ------------------------------------------------------------
-- 1) O DIA em que a conta congela — a fórmula, num lugar só
-- ------------------------------------------------------------
-- Pura: entra data, sai data. Existe para que a função que decide, a que
-- mostra o dia na tela e a conferência não possam divergir — antes eram
-- três cópias da mesma aritmética, e a conferência aprovava a si mesma.
--
-- `greatest` ignora nulos: o termo que faltar simplesmente não entra.
--   · proximo_vencimento  — o fim do período pago (o normal);
--   · ultimo_pagamento_em + 30 — o piso, para quando o webhook zerar o
--     vencimento no cancelamento (o ciclo é mensal e pré-pago);
--   · cancelada_em — nunca antes do dia em que ela cancelou.
-- +31 e não +30: o trigésimo dia ainda é dela inteiro; o congelamento é
-- no dia seguinte.
create or replace function public.congela_em(
  p_cancelada_em        date,
  p_proximo_vencimento  date,
  p_ultimo_pagamento_em date default null
)
returns date
language sql
immutable
as $$
  select case
    when p_cancelada_em is null then null
    else greatest(
           p_cancelada_em,
           p_proximo_vencimento,
           p_ultimo_pagamento_em + 30
         ) + 31
  end;
$$;

comment on function public.congela_em(date, date, date) is
  'O dia em que uma conta cancelada deixa de aceitar alterações: 30 dias completos depois do fim do período pago. Fórmula única — conta_congelada, conta_congela_em e a conferência chamam esta.';

revoke all on function public.congela_em(date, date, date) from public, anon;

-- ------------------------------------------------------------
-- 2) A conta está congelada?
-- ------------------------------------------------------------
-- Só existe UM jeito de ficar congelada: ter tido uma assinatura de
-- verdade, ter cancelado e ter passado a cortesia. Qualquer outro estado
-- devolve false.
create or replace function public.conta_congelada(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assinaturas a
    where a.empresa_id = p_empresa_id
      and a.status = 'cancelada'
      and a.cancelada_em is not null
      -- rastro de assinatura de verdade. Sem isto, o 'cancelada' que o
      -- dono carimba no painel para registrar que uma conta em TRIAL
      -- morreu congelaria uma conta que nunca pagou nada.
      and (
        a.gateway_subscription_id is not null
        or a.ultimo_pagamento_em is not null
        or a.proximo_vencimento is not null
      )
      -- "hoje" é em Brasília: às 21h do último dia de cortesia o UTC já
      -- virou, e o roteiro pararia de salvar no meio da festa
      and (now() at time zone 'America/Sao_Paulo')::date
          >= public.congela_em(a.cancelada_em, a.proximo_vencimento, a.ultimo_pagamento_em)
  );
$$;

comment on function public.conta_congelada(uuid) is
  'Conta que assinou, cancelou e passou os 30 dias de cortesia: continua lendo tudo, não aceita alterações. Trial, cortesia, piloto, inadimplente, conta sem assinatura e conta que nunca pagou NUNCA são congeladas.';

-- Nem `anon` nem `authenticated`: quem chama é a policy por dentro de
-- funções `security definer` (que rodam como dona) e as funções sem
-- argumento logo abaixo. Aberta a `authenticated`, esta função responderia
-- "a empresa tal cancelou, e congela no dia tal" a QUALQUER login do
-- sistema que conhecesse o uuid — informação comercial de outra conta.
revoke all on function public.conta_congelada(uuid) from public, anon, authenticated;

-- O dia em que a conta congela (ou congelou). Null quando não se aplica —
-- é o que a tela mostra para avisar ANTES de acontecer.
create or replace function public.conta_congela_em(p_empresa_id uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select public.congela_em(a.cancelada_em, a.proximo_vencimento, a.ultimo_pagamento_em)
  from public.assinaturas a
  where a.empresa_id = p_empresa_id
    and a.status = 'cancelada'
    and a.cancelada_em is not null
    and (
      a.gateway_subscription_id is not null
      or a.ultimo_pagamento_em is not null
      or a.proximo_vencimento is not null
    );
$$;

revoke all on function public.conta_congela_em(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- 3) A pergunta que a tela faz — sempre sobre a PRÓPRIA conta
-- ------------------------------------------------------------
-- Duas portas sem argumento: ninguém pergunta pela conta alheia, e a
-- coordenadora e a cerimonialista (que não têm tela de assinatura, e a
-- quem `minha_assinatura()` não responde) descobrem pela mesma via.
create or replace function public.minha_conta_congelada()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select public.conta_congelada(mc.empresa_id) from public.meu_cargo() mc),
    false
  );
$$;

revoke all on function public.minha_conta_congelada() from public, anon;
grant execute on function public.minha_conta_congelada() to authenticated;

-- O estado e o DIA, numa consulta só. O layout do app chama esta em toda
-- navegação: `minha_assinatura()` devolveria a mesma resposta, mas
-- contando eventos e logins duas vezes para entregar um booleano.
create or replace function public.meu_congelamento()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'congelada',  public.conta_congelada(mc.empresa_id),
    'congela_em', public.conta_congela_em(mc.empresa_id)
  )
  from public.meu_cargo() mc;
$$;

revoke all on function public.meu_congelamento() from public, anon;
grant execute on function public.meu_congelamento() to authenticated;

-- ------------------------------------------------------------
-- 4) A porta única da escrita passa a olhar a assinatura
-- ------------------------------------------------------------
-- Mesma função da 037, verbatim, com uma cláusula a mais no fim. É por
-- ela que passam as policies de escrita de tudo o que pende de um
-- evento — roteiro, financeiro, convidados, fornecedores do evento,
-- contratos, portal. Uma cláusula, cento e oitenta policies.
create or replace function public.pode_editar_evento(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e, public.meu_cargo() mc
    where e.id = p_event_id
      and e.empresa_id = mc.empresa_id
      and (
        mc.cargo in ('proprietaria', 'coordenadora')
        or e.cerimonialista_responsavel_id = mc.membro_equipe_id
        or e.cerimonialista_id = auth.uid()
      )
      and not public.conta_congelada(e.empresa_id)
  );
$$;

-- ------------------------------------------------------------
-- 5) As portas que `pode_editar_evento` não cobre
-- ------------------------------------------------------------
-- CADASTROS. Eventos, clientes e fornecedores se apagam e se editam por
-- policies que só olham empresa e cargo (024, 036). Sem esta parte, a
-- conta "só para leitura" não corrigia o horário de um item do roteiro
-- mas apagava o evento inteiro — e a faixa do app, que diz que os
-- eventos e os cadastros não aceitam alterações, estaria mentindo em
-- três telas.
--
-- Cada policy abaixo é a da 024/036 verbatim, com uma cláusula a mais.
-- `events_insert` fica de fora de propósito: `pode_criar_evento` já
-- recusa (conta cancelada fora do mês pago volta ao teto de um evento na
-- vida, 147/150), e aquela policy carrega uma correção de segurança
-- própria que não se reescreve de passagem.

drop policy if exists "events_delete" on public.events;
create policy "events_delete" on public.events
  for delete using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
    and not public.minha_conta_congelada()
  );

drop policy if exists "suppliers_insert" on public.suppliers;
create policy "suppliers_insert" on public.suppliers
  for insert with check (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo())
        in ('proprietaria', 'coordenadora', 'cerimonialista')
    and not public.minha_conta_congelada()
  );

drop policy if exists "suppliers_update" on public.suppliers;
create policy "suppliers_update" on public.suppliers
  for update using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo())
        in ('proprietaria', 'coordenadora', 'cerimonialista')
    and not public.minha_conta_congelada()
  );

drop policy if exists "suppliers_delete" on public.suppliers;
create policy "suppliers_delete" on public.suppliers
  for delete using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
    and not public.minha_conta_congelada()
  );

drop policy if exists "clients_insert" on public.clients;
create policy "clients_insert" on public.clients
  for insert with check (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo())
        in ('proprietaria', 'coordenadora', 'cerimonialista')
    and not public.minha_conta_congelada()
  );

-- a da 036 (quem cadastrou ajusta o próprio cadastro), com a cláusula
drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients
  for update using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (
      (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
      or cerimonialista_id = auth.uid()
      or exists (
        select 1 from public.events e
        where e.client_id = clients.id and public.pode_editar_evento(e.id)
      )
    )
    and not public.minha_conta_congelada()
  );

drop policy if exists "clients_delete" on public.clients;
create policy "clients_delete" on public.clients
  for delete using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
    and not public.minha_conta_congelada()
  );

-- ------------------------------------------------------------
-- 6) As RPCs que escrevem por fora das policies
-- ------------------------------------------------------------
-- `security definer` roda como dona da função: policy nenhuma é
-- consultada, e a cláusula da seção 4 nunca chega a ser executada por
-- estes caminhos. São eles que operam o DIA do evento — riscar o
-- checklist e conduzir o roteiro —, ou seja, exatamente o que a conta
-- cancelada deixou de pagar. Cada uma abaixo é a definição atual,
-- verbatim, com o congelamento consultado na porta.
--
-- `semear_checklist_dia` (111/125) fica de fora, decidido aqui: ela não
-- é decisão de ninguém, é a tela se montando a partir do método que já é
-- da conta. Bloqueá-la deixaria a conta congelada com um checklist vazio
-- e sem explicação — tirar leitura de quem a regra promete que continua
-- lendo. Riscar item, esse sim, é alteração, e para na porta seguinte.

-- Um toque risca, outro desfaz. Quem marcou e quando ficam gravados:
-- com três assistentes trabalhando, "quem conferiu o som?" é pergunta
-- real no meio da festa. O gate é pode_VER de propósito (a assistente
-- escalada risca); a RPC é o único caminho de escrita dela.
create or replace function public.conferir_item_dia(p_item_id uuid, p_conferido boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_event  uuid;
  v_membro uuid;
begin
  select event_id into v_event
  from public.evento_checklist_dia where id = p_item_id;

  if v_event is null or not public.pode_ver_evento(v_event) then
    return;
  end if;

  -- 151: quem decide aqui não é o cargo, é a assinatura. O gate acima
  -- continua sendo pode_VER (a assistente escalada risca); o que a conta
  -- congelada perde é o direito de alterar, seja quem for que aperte.
  if public.conta_congelada(
       (select e.empresa_id from public.events e where e.id = v_event)
     ) then
    return;
  end if;

  select mc.membro_equipe_id into v_membro from public.meu_cargo() mc;

  update public.evento_checklist_dia
  set conferido_em  = case when p_conferido then now() end,
      conferido_por = case when p_conferido then v_membro end,
      updated_at    = now()
  where id = p_item_id;
end;
$$;

revoke all on function public.conferir_item_dia(uuid, boolean) from public, anon;
grant execute on function public.conferir_item_dia(uuid, boolean) to authenticated;

-- O status do item do roteiro, agnóstico de canal (031). A origem
-- 'fornecedor' vem do link público (032) e NÃO trava: quem aperta ali é
-- o fornecedor no dia, não a conta — e o link público é leitura e
-- resposta dele, não escrita dela.
create or replace function public.atualizar_status_item(
  p_roteiro_item_id uuid,
  p_novo_status     text,
  p_observacao      text default null,
  p_origem          text default 'fornecedor'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item          public.roteiro_items%rowtype;
  v_descricao_log text;
  v_tipo_log      text;
  v_status_antigo text;
begin
  if p_novo_status not in ('planejado', 'em_andamento', 'concluido', 'problema') then
    return json_build_object('error', 'status inválido');
  end if;
  if p_origem not in ('fornecedor', 'cerimonialista', 'sistema') then
    return json_build_object('error', 'origem inválida');
  end if;

  select * into v_item from public.roteiro_items where id = p_roteiro_item_id;
  if not found then
    return json_build_object('error', 'item não encontrado');
  end if;

  -- 151: conta congelada não conduz o roteiro pelo app.
  if p_origem <> 'fornecedor'
     and public.conta_congelada(
           (select e.empresa_id from public.events e where e.id = v_item.event_id)
         ) then
    return json_build_object('error', 'conta somente leitura');
  end if;

  -- Equivalente no campo antigo (mantém as telas atuais coerentes).
  -- 'problema' não existe no antigo: preserva o valor atual.
  v_status_antigo := case p_novo_status
    when 'planejado'    then 'pendente'
    when 'em_andamento' then 'em_andamento'
    when 'concluido'    then 'concluido'
    else v_item.status
  end;

  update public.roteiro_items set
    status_novo = p_novo_status,
    status      = v_status_antigo,
    horario_real_inicio = case
      when p_novo_status = 'em_andamento' and horario_real_inicio is null
      then now() else horario_real_inicio end,
    horario_real_fim = case
      when p_novo_status = 'concluido' then now() else horario_real_fim end,
    observacao = coalesce(p_observacao, observacao)
  where id = p_roteiro_item_id;

  v_tipo_log := case p_novo_status
    when 'em_andamento' then 'iniciado'
    when 'concluido'    then 'concluido'
    when 'problema'     then 'problema_reportado'
    else 'status_atualizado'
  end;
  v_descricao_log := case p_novo_status
    when 'em_andamento' then 'Fornecedor iniciou a etapa'
    when 'concluido'    then 'Etapa concluída'
    when 'problema'     then 'Problema reportado'
    else 'Status atualizado'
  end;
  if p_origem = 'cerimonialista' then
    v_descricao_log := replace(v_descricao_log, 'Fornecedor', 'Cerimonialista');
  end if;

  insert into public.roteiro_item_log (roteiro_item_id, tipo_evento, descricao, origem)
  values (p_roteiro_item_id, v_tipo_log, v_descricao_log, p_origem);

  if p_observacao is not null and length(trim(p_observacao)) > 0 then
    insert into public.roteiro_item_log (roteiro_item_id, tipo_evento, descricao, origem)
    values (p_roteiro_item_id, 'observacao_adicionada',
            'Observação: ' || trim(p_observacao), p_origem);
  end if;

  return json_build_object('success', true, 'status', p_novo_status);
end;
$$;

revoke all on function public.atualizar_status_item(uuid, text, text, text) from public, anon;
grant execute on function public.atualizar_status_item(uuid, text, text, text)
  to authenticated, service_role;

-- ------------------------------------------------------------
-- 7) A tela precisa saber, para avisar antes e explicar depois
-- ------------------------------------------------------------
create or replace function public.minha_assinatura()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'empresa_id', mc.empresa_id,
    'status', coalesce(a.status, 'trial'),
    'plano', t.plano,
    'plano_nome', t.plano_nome,
    'valor_mensal', coalesce(a.valor_mensal, 0),
    'proximo_vencimento', a.proximo_vencimento,
    'ultimo_pagamento_em', a.ultimo_pagamento_em,
    'cartao_final', a.cartao_final,
    'cartao_bandeira', a.cartao_bandeira,
    'falhas_seguidas', coalesce(a.falhas_seguidas, 0),
    'tem_gateway', a.gateway_subscription_id is not null,
    'eventos', public.eventos_que_contam(mc.empresa_id),
    'limite_eventos', t.eventos,
    'pode_criar_evento', public.pode_criar_evento(mc.empresa_id),
    'logins', public.logins_que_contam(mc.empresa_id),
    'limite_logins', t.logins,
    'pode_adicionar_login', public.pode_adicionar_login(mc.empresa_id),
    'acima_do_plano', t.eventos is not null
                      and public.eventos_que_contam(mc.empresa_id) > t.eventos,
    -- a conta já congelou, e o dia em que congela (ou congelou)
    'congelada', public.conta_congelada(mc.empresa_id),
    'congela_em', public.conta_congela_em(mc.empresa_id)
  )
  from public.meu_cargo() mc
  left join public.assinaturas a on a.empresa_id = mc.empresa_id
  cross join lateral public.teto_do_plano(mc.empresa_id) t
  where mc.cargo = 'proprietaria';
$$;

revoke all on function public.minha_assinatura() from public, anon;
grant execute on function public.minha_assinatura() to authenticated;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
--
-- As cinco primeiras são as que importam: elas provam que a trava NÃO
-- alcança quem não cancelou, nem quem nunca pagou, nem quem ainda está
-- na cortesia. Se alguma delas voltar false, NÃO use esta migração —
-- significa que contas legítimas seriam congeladas.
--
-- Os cenários simulados chamam `public.congela_em`, a MESMA função que
-- decide em produção: aqui não se testa uma cópia da regra, testa-se a
-- regra instalada.
-- ------------------------------------------------------------
with hoje as (
  select (now() at time zone 'America/Sao_Paulo')::date as d
),
cenarios as (
  select * from (values
    -- dias contados a partir de hoje (negativo = passado).
    -- `ja_pagou` = a linha tem gateway_subscription_id, ultimo_pagamento_em
    -- ou proximo_vencimento: rastro de assinatura de verdade.
    -- status         cancel.  venc.   pagto   ja_pagou  esperado
    ('trial'::text,   null::int, null::int, null::int, false, false),
    ('ativa',         null,      12,        -18,       true,  false),
    ('pausada',       null,      null,      null,      false, false),
    ('inadimplente',  null,      -40,       -70,       true,  false),
    -- cancelou ontem, com o mês pago correndo: nem perto de congelar
    ('cancelada',     -3,        12,        -18,       true,  false),
    -- cancelou há 20 dias, mês pago terminou há 5: ainda na cortesia
    ('cancelada',     -20,       -5,        -35,       true,  false),
    -- cortesia vencida: congela
    ('cancelada',     -60,       -45,       -75,       true,  true),
    -- sem vencimento e sem pagamento, mas com assinatura no gateway
    ('cancelada',     -40,       null,      null,      true,  true),
    -- o carimbo do painel do dono numa conta que NUNCA pagou: não congela
    ('cancelada',     -60,       -45,       null,      false, false),
    -- a véspera e o dia: o trigésimo dia ainda é dela
    ('cancelada',     -60,       -30,       null,      true,  false),
    ('cancelada',     -60,       -31,       null,      true,  true),
    -- o webhook zerou o vencimento no cancelamento: o último pagamento
    -- segura o mês pago, e ela NÃO congela por causa do nulo
    ('cancelada',     -5,        null,      -6,        true,  false)
  ) as c(status, dias_cancelada, dias_venc, dias_pagto, ja_pagou, esperado)
),
simulado as (
  select
    c.esperado,
    (c.status = 'cancelada'
     and c.dias_cancelada is not null
     and c.ja_pagou
     and h.d >= public.congela_em(
                  h.d + c.dias_cancelada,
                  h.d + c.dias_venc,
                  h.d + c.dias_pagto
                )) as calculado
  from cenarios c cross join hoje h
)
select 'a regra congela exatamente os cenários previstos' as item,
       bool_and(coalesce(calculado, false) = esperado) as ok
from simulado

union all
select 'conta sem assinatura nenhuma nunca congela',
       not exists (
         select 1 from public.empresas emp
         where not exists (select 1 from public.assinaturas a where a.empresa_id = emp.id)
           and public.conta_congelada(emp.id)
       )

union all
select 'nenhuma conta em trial, cortesia, ativa ou inadimplente está congelada AGORA',
       not exists (
         select 1 from public.assinaturas a
         where a.status <> 'cancelada' and public.conta_congelada(a.empresa_id)
       )

union all
select 'toda conta congelada hoje já foi pagante de verdade',
       not exists (
         select 1 from public.assinaturas a
         where public.conta_congelada(a.empresa_id)
           and a.gateway_subscription_id is null
           and a.ultimo_pagamento_em is null
           and a.proximo_vencimento is null
       )

union all
select 'conta cancelada dentro da cortesia não está congelada',
       not exists (
         select 1 from public.assinaturas a, hoje h
         where a.status = 'cancelada'
           and a.cancelada_em is not null
           and h.d < public.congela_em(a.cancelada_em, a.proximo_vencimento,
                                       a.ultimo_pagamento_em)
           and public.conta_congelada(a.empresa_id)
       )

union all
select 'a regra mede o dia em Brasília, não em UTC',
       (select prosrc ilike '%America/Sao_Paulo%'
        from pg_proc where proname = 'conta_congelada'
          and pronamespace = 'public'::regnamespace)

union all
select 'pode_editar_evento passou a consultar a assinatura',
       (select prosrc ilike '%conta_congelada%'
        from pg_proc where proname = 'pode_editar_evento'
          and pronamespace = 'public'::regnamespace)

union all
select 'pode_editar_evento continua existindo uma vez só',
       (select count(*) = 1 from pg_proc
        where proname = 'pode_editar_evento' and pronamespace = 'public'::regnamespace)

union all
select 'as RPCs que escrevem no dia do evento consultam o congelamento',
       (select bool_and(prosrc ilike '%conta_congelada%')
        from pg_proc
        where pronamespace = 'public'::regnamespace
          and proname in ('conferir_item_dia', 'atualizar_status_item'))

union all
select 'o link público do fornecedor continua livre',
       (select prosrc ilike '%p_origem <> ''fornecedor''%'
        from pg_proc where proname = 'atualizar_status_item'
          and pronamespace = 'public'::regnamespace)

union all
select 'apagar evento, cliente e fornecedor também para na conta congelada',
       (select count(*) = 7 from pg_policies
        where schemaname = 'public'
          and policyname in ('events_delete', 'clients_insert', 'clients_update',
                             'clients_delete', 'suppliers_insert', 'suppliers_update',
                             'suppliers_delete')
          and coalesce(qual, '') || coalesce(with_check, '') ilike '%minha_conta_congelada%')

union all
select 'anon não executa nada disto',
       not has_function_privilege('anon', 'public.conta_congelada(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.conta_congela_em(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.minha_conta_congelada()', 'execute')
       and not has_function_privilege('anon', 'public.meu_congelamento()', 'execute')

union all
select 'ninguém pergunta pela conta de outra empresa',
       not has_function_privilege('authenticated', 'public.conta_congelada(uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.conta_congela_em(uuid)', 'execute')

union all
select 'a conta pergunta pela própria situação',
       has_function_privilege('authenticated', 'public.minha_conta_congelada()', 'execute')
       and has_function_privilege('authenticated', 'public.meu_congelamento()', 'execute')

union all
select 'minha_assinatura devolve congelada e congela_em',
       (select prosrc ilike '%congela_em%' and prosrc ilike '%''congelada''%'
        from pg_proc where proname = 'minha_assinatura'
          and pronamespace = 'public'::regnamespace)

union all
-- o retrato de hoje: quantas contas a trava alcança neste instante
select 'contas congeladas hoje: ' ||
       (select count(*)::text from public.assinaturas a
        where public.conta_congelada(a.empresa_id)),
       true;
