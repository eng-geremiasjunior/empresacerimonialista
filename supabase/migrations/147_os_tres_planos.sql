-- ============================================================
-- 147 — Os três planos: Essencial, Profissional e Master
-- ============================================================
-- Decisão do dono (04/09/2026): três planos, R$ 97 / R$ 149 / R$ 199.
-- O produto é o mesmo inteiro nos três. O que separa as faixas é o
-- tamanho da agenda dela — quantos eventos estão EM ANDAMENTO ao mesmo
-- tempo — e quantas pessoas têm login. Nenhum módulo é desligado por
-- plano: tirar módulo da faixa de entrada faria o R$ 97 perder para o
-- concorrente de R$ 37 na aba do lado.
--
-- Doutrina que já estava escrita na tela de assinatura e esta migração
-- só obedece: "Seus eventos e tudo o que está dentro deles continuam
-- seus. Você só não poderá criar eventos novos." CORTA O CRIAR, NUNCA O
-- VER. Nada aqui esconde tela, apaga dado ou tranca evento aberto.
--
-- Três consertos que vêm junto, porque sem eles o plano é decorativo:
--
--   1. A conta era VITALÍCIA. eventos_que_contam (131) somava tudo que
--      não foi cancelado nem arquivado — inclusive casamento concluído.
--      Quem coubesse em "10 eventos" esbarraria no décimo primeiro da
--      vida, e a única saída era arquivar, o que tira o evento do
--      histórico do fornecedor e dos contratos. Agora conta só o que
--      está de pé: orçamento ou confirmado, não arquivado. Concluído sai
--      da conta sozinho — o cron concluir-eventos já muda o status.
--
--   2. O limite não valia quando a NOIVA aceitava a proposta.
--      criar_evento_do_orcamento tem grant para anon e o gatilho passa
--      direto sem sessão (131:161). É o fluxo normal do produto, não
--      má-fé — e a resposta certa NÃO é bloquear o aceite (nunca quebrar
--      a venda dela na frente da cliente). O aceite entra; a dona recebe
--      um aviso de que passou do plano; e a próxima criação PELA MÃO
--      DELA é que esbarra no limite, porque a conta já inclui o evento
--      que a cliente aceitou.
--
--   3. Não existia limite de pessoas com login. O cadastro passa por um
--      lugar só (criarCerimonialista, service role) — e por isso o
--      gatilho de assentos NÃO copia o "auth.uid() is null → passa" da
--      131: esse caminho não tem sessão e passaria por cima da trava.
--
-- Aditiva e convergente: rodar duas vezes dá o mesmo resultado. Nada
-- é apagado. A conferência no fim devolve tudo `true`.
-- ============================================================

-- ------------------------------------------------------------
-- 1) O catálogo — o preço e os tetos viram DADO, num lugar só
-- ------------------------------------------------------------
-- Antes o único preço vivia numa variável de ambiente
-- (PAGARME_VALOR_MENSAL_CENTAVOS) e o plano era gravado como o texto
-- fixo 'mensal'. Agora a tela de assinatura, a cobrança e o admin leem
-- daqui. `eventos_em_andamento` / `logins` nulos = sem limite.
create table if not exists public.plano_catalogo (
  codigo               text primary key,
  nome                 text not null,
  valor_mensal         numeric(12, 2) not null check (valor_mensal >= 0),
  eventos_em_andamento int check (eventos_em_andamento is null or eventos_em_andamento > 0),
  logins               int check (logins is null or logins > 0),
  ordem                int not null default 0,
  ativo                boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table public.plano_catalogo is
  'Os planos vendidos. Preço e tetos são dado, não código: o admin edita aqui e a cobrança lê daqui.';
comment on column public.plano_catalogo.eventos_em_andamento is
  'Teto de eventos de pé (orçamento ou confirmado, não arquivado). NULL = sem limite.';
comment on column public.plano_catalogo.logins is
  'Teto de pessoas ativas com login na equipe (membros_equipe.status = ativo). NULL = sem limite.';

-- Semeado só se não existir: o dono edita preço e teto pelo admin, e
-- uma re-execução desta migração NÃO pode desfazer o que ele mudou.
insert into public.plano_catalogo (codigo, nome, valor_mensal, eventos_em_andamento, logins, ordem)
select v.codigo, v.nome, v.valor_mensal, v.eventos, v.logins, v.ordem
from (values
  ('essencial',    'Essencial',    97.00,  10,   1,    1),
  ('profissional', 'Profissional', 149.00, 25,   3,    2),
  ('master',       'Master',       199.00, null, 10,   3)
) as v (codigo, nome, valor_mensal, eventos, logins, ordem)
where not exists (select 1 from public.plano_catalogo c where c.codigo = v.codigo);

alter table public.plano_catalogo enable row level security;

-- Quem está logado lê o catálogo (a tela de planos precisa dele).
-- Ninguém escreve por policy: preço muda pelo service role, no admin.
drop policy if exists plano_catalogo_leitura on public.plano_catalogo;
create policy plano_catalogo_leitura
  on public.plano_catalogo for select
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- 2) O vocabulário de `assinaturas.plano`
-- ------------------------------------------------------------
-- Era texto livre com default 'piloto' (123:27). Passa a aceitar só o
-- que existe: os três do catálogo mais os dois herdados — 'piloto'
-- (default de quem nunca assinou) e 'cortesia' (as contas anteriores ao
-- limite, 131). O 'mensal' que assinar() gravava vira 'essencial': é o
-- que ele sempre foi — o plano único de antes das faixas.
--
-- O admin deixava digitar o plano como texto livre. Antes de pôr o CHECK,
-- o que existe é normalizado: maiúscula e espaço somem, 'mensal' vira
-- 'essencial', e o que não for nenhum dos cinco vira 'piloto' — sem isso
-- um "Mensal " digitado à mão abortaria a migração inteira no ADD
-- CONSTRAINT. Medido em produção: só existem 'cortesia' e 'mensal'.
update public.assinaturas set plano = lower(btrim(plano)) where plano <> lower(btrim(plano));
update public.assinaturas set plano = 'essencial' where plano = 'mensal';
update public.assinaturas set plano = 'piloto'
 where plano not in ('essencial', 'profissional', 'master', 'piloto', 'cortesia');

alter table public.assinaturas drop constraint if exists assinaturas_plano_check;
alter table public.assinaturas add constraint assinaturas_plano_check
  check (plano in ('essencial', 'profissional', 'master', 'piloto', 'cortesia'));

-- ------------------------------------------------------------
-- 3) O que CONTA: eventos em andamento, não eventos da vida
-- ------------------------------------------------------------
create or replace function public.eventos_que_contam(p_empresa_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.events e
  where e.empresa_id = p_empresa_id
    -- de pé = ainda vai acontecer. Concluído saiu da agenda; cancelado
    -- e arquivado nunca contaram (131) e continuam não contando.
    and e.status in ('orcamento', 'confirmado')
    and coalesce(e.archived, false) = false;
$$;

-- O TRIAL continua contando a VIDA, não a agenda: "o primeiro evento é
-- por nossa conta" quer dizer um evento, não um por vez. Se o trial
-- olhasse só o que está de pé, o evento grátis concluiria e liberaria a
-- vaga para um segundo grátis, e um terceiro — e a assinatura nunca
-- seria o caminho para o segundo. É exatamente a régua da 131.
-- Conta TUDO que já foi criado — arquivado e cancelado inclusive. A 131
-- excluía os dois, e "arquivar" é um clique sem confirmação que deixa o
-- evento inteiro e acessível: arquivar o evento grátis e criar outro
-- era um furo de dois cliques. O primeiro evento é a primeira linha.
create or replace function public.eventos_da_vida(p_empresa_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.events e
  where e.empresa_id = p_empresa_id;
$$;

revoke all on function public.eventos_da_vida(uuid) from public, anon;
grant execute on function public.eventos_da_vida(uuid) to authenticated;

-- O mesmo, para pessoas: quem está ativo na equipe. Desativar alguém
-- libera a vaga — e é a saída honesta para caber num plano menor.
create or replace function public.logins_que_contam(p_empresa_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.membros_equipe m
  where m.empresa_id = p_empresa_id
    and m.status = 'ativo';
$$;

revoke all on function public.logins_que_contam(uuid) from public, anon;
grant execute on function public.logins_que_contam(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) O teto de cada conta, lido do plano
-- ------------------------------------------------------------
-- Uma função só responde "quanto esta empresa pode?", para evento e
-- para login, e as duas travas leem dela. Regras:
--   * assinatura ativa, inadimplente ou pausada → o teto do plano
--     (inadimplente NÃO trava: a decisão da 131 foi avisar, não punir);
--   * plano fora do catálogo ('cortesia', 'piloto' com status ativo)
--     → sem limite, como sempre foi;
--   * sem assinatura, trial ou cancelada → 1 evento e 1 login: o
--     primeiro evento é por nossa conta, e a conta é dela sozinha.
-- drop antes: `create or replace` não aceita mudar a forma de um `returns
-- table` — um rascunho anterior desta função com menos colunas abortaria
-- a migração aqui. Nada depende dela por dependência de objeto (só por
-- nome, dentro de outras funções), então dropar é seguro.
drop function if exists public.teto_do_plano(uuid);
create function public.teto_do_plano(p_empresa_id uuid)
returns table (eventos int, logins int, plano text, plano_nome text, pagante boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when a.status in ('ativa', 'inadimplente', 'pausada')
        then case when c.codigo is null then null else c.eventos_em_andamento end
      else 1
    end as eventos,
    case
      when a.status in ('ativa', 'inadimplente', 'pausada')
        then case when c.codigo is null then null else c.logins end
      else 1
    end as logins,
    coalesce(a.plano, 'piloto') as plano,
    coalesce(c.nome, initcap(coalesce(a.plano, 'piloto'))) as plano_nome,
    coalesce(a.status in ('ativa', 'inadimplente', 'pausada'), false) as pagante
  from (select p_empresa_id as id) e
  left join public.assinaturas a on a.empresa_id = e.id
  left join public.plano_catalogo c on c.codigo = a.plano;
$$;

revoke all on function public.teto_do_plano(uuid) from public, anon;
grant execute on function public.teto_do_plano(uuid) to authenticated;

-- A conta pode criar mais um evento? (assinatura da 131 preservada:
-- o gatilho e a tela continuam chamando este nome)
--   pagante → a agenda (eventos de pé) contra o teto do plano;
--   trial   → a vida (o primeiro evento é UM evento, não um por vez).
create or replace function public.pode_criar_evento(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when t.pagante then coalesce(public.eventos_que_contam(p_empresa_id) < t.eventos, true)
    else public.eventos_da_vida(p_empresa_id) < 1
  end
  from public.teto_do_plano(p_empresa_id) t;
$$;

-- A POLICY DE INSERT DE EVENTS (034) só perguntava "esta empresa pode
-- criar?" — e pode_criar_evento é security definer, não olha quem
-- pergunta. Qualquer usuária logada conseguia inserir um evento com o
-- empresa_id de OUTRA empresa pelo PostgREST, desde que a outra tivesse
-- vaga. Furo anterior a esta migração; fecha aqui porque é a função dela
-- que está sendo reescrita. Agora: só na MINHA empresa, e só se ela pode.
-- (O aceite anônimo e o service role passam por security definer e não
-- por policy — nada muda para eles.)
drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events
  for insert with check (
    empresa_id in (select mc.empresa_id from public.meu_cargo() mc)
    and public.pode_criar_evento(empresa_id)
  );

-- A conta pode dar login a mais uma pessoa?
create or replace function public.pode_adicionar_login(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.logins_que_contam(p_empresa_id) < t.logins,
    true
  )
  from public.teto_do_plano(p_empresa_id) t;
$$;

revoke all on function public.pode_adicionar_login(uuid) from public, anon;
grant execute on function public.pode_adicionar_login(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5) A trava de eventos — agora com o aviso no caminho da noiva
-- ------------------------------------------------------------
create or replace function public.trg_limite_do_plano()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dona uuid;
  v_teto int;
  v_pagante boolean;
begin
  if new.empresa_id is null then
    return new;
  end if;

  -- Sem sessão: service role, cron, migração — e o ACEITE DA PROPOSTA
  -- pela cliente (criar_evento_do_orcamento, grant para anon). O evento
  -- entra de todo jeito: uma venda fechada nunca é recusada na frente da
  -- cliente. Mas se isso estourou o teto, a dona fica sabendo agora, e
  -- não quando for criar o próximo pela mão dela e esbarrar na trava.
  if auth.uid() is null then
    if not public.pode_criar_evento(new.empresa_id) then
      select t.eventos, t.pagante into v_teto, v_pagante from public.teto_do_plano(new.empresa_id) t;
      select m.user_id into v_dona
      from public.membros_equipe m
      where m.empresa_id = new.empresa_id and m.is_owner and m.status = 'ativo'
      limit 1;
      if v_dona is not null then
        insert into public.notifications (cerimonialista_id, type, title, message, link)
        values (
          v_dona, 'evento',
          case when v_pagante then 'Você passou do seu plano' else 'Um evento entrou pelo aceite' end,
          case when v_pagante then
            format('Um evento entrou pelo aceite da proposta e sua agenda ficou com %s eventos em andamento — o plano permite %s. Nada foi travado; para criar o próximo, mude de plano ou espere um evento concluir.',
                   public.eventos_que_contam(new.empresa_id) + 1, v_teto)
          else
            'Sua cliente aceitou a proposta e o evento já está criado. O primeiro é por nossa conta; para criar os próximos, ative a assinatura.'
          end,
          '/assinatura'
        );
      end if;
    end if;
    return new;
  end if;

  if public.pode_criar_evento(new.empresa_id) then
    return new;
  end if;

  -- Duas mensagens: quem nunca assinou ouve que o primeiro é por nossa
  -- conta; quem assinou ouve que bateu no teto do plano.
  if exists (select 1 from public.assinaturas a
             where a.empresa_id = new.empresa_id
               and a.status in ('ativa', 'inadimplente', 'pausada')) then
    raise exception 'plano_no_limite'
      using hint = 'Sua agenda chegou ao teto do plano. Mude de plano ou espere um evento concluir.';
  end if;
  raise exception 'plano_gratuito_no_limite'
    using hint = 'O primeiro evento é por nossa conta. Para criar outros, ative a assinatura.';
end $$;

drop trigger if exists trg_limite_do_plano on public.events;
create trigger trg_limite_do_plano
  before insert on public.events
  for each row execute function public.trg_limite_do_plano();

-- Reativar também é criar: arquivar um evento e desarquivar depois, ou
-- tirar um cancelado do cancelamento, devolve um evento à agenda. Sem
-- isto, "arquiva, cria outro, desarquiva" seria um furo de duas cliques.
create or replace function public.trg_limite_do_plano_reativar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contava boolean;
  v_conta   boolean;
begin
  if auth.uid() is null or new.empresa_id is null then
    return new;
  end if;
  v_contava := old.status in ('orcamento', 'confirmado') and coalesce(old.archived, false) = false;
  v_conta   := new.status in ('orcamento', 'confirmado') and coalesce(new.archived, false) = false;
  if v_conta and not v_contava and not public.pode_criar_evento(new.empresa_id) then
    raise exception 'plano_no_limite'
      using hint = 'Sua agenda chegou ao teto do plano. Mude de plano ou espere um evento concluir.';
  end if;
  return new;
end $$;

drop trigger if exists trg_limite_do_plano_reativar on public.events;
create trigger trg_limite_do_plano_reativar
  before update of status, archived on public.events
  for each row execute function public.trg_limite_do_plano_reativar();

-- ------------------------------------------------------------
-- 6) A trava de logins
-- ------------------------------------------------------------
-- Sem o "auth.uid() is null → passa": quem insere aqui é o service role
-- (criarCerimonialista), justamente o caminho sem sessão. A dona
-- entrando pelo gatilho de signup passa porque, naquele instante, a
-- empresa tem zero logins e o teto do trial é 1.
create or replace function public.trg_limite_de_logins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id is null or new.status <> 'ativo' then
    return new;
  end if;
  if public.pode_adicionar_login(new.empresa_id) then
    return new;
  end if;
  raise exception 'plano_sem_vaga_de_login'
    using hint = 'Seu plano não tem mais vaga de login. Desative um acesso ou mude de plano.';
end $$;

drop trigger if exists trg_limite_de_logins on public.membros_equipe;
create trigger trg_limite_de_logins
  before insert on public.membros_equipe
  for each row execute function public.trg_limite_de_logins();

-- Reativar um membro inativo também ocupa vaga.
create or replace function public.trg_limite_de_logins_reativar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'ativo' or new.status <> 'ativo' or new.empresa_id is null then
    return new;
  end if;
  if public.pode_adicionar_login(new.empresa_id) then
    return new;
  end if;
  raise exception 'plano_sem_vaga_de_login'
    using hint = 'Seu plano não tem mais vaga de login. Desative um acesso ou mude de plano.';
end $$;

drop trigger if exists trg_limite_de_logins_reativar on public.membros_equipe;
create trigger trg_limite_de_logins_reativar
  before update of status on public.membros_equipe
  for each row execute function public.trg_limite_de_logins_reativar();

-- ------------------------------------------------------------
-- 7) O que a tela dela lê
-- ------------------------------------------------------------
-- A mesma consulta única da 131, agora sabendo o plano, os tetos, os
-- logins e se a conta está ACIMA do plano (o aceite da noiva pode ter
-- deixado 11 em 10). A tela não precisa da regra — só do que fazer.
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
                      and public.eventos_que_contam(mc.empresa_id) > t.eventos
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
-- ------------------------------------------------------------
select 'catálogo com os três planos' as item,
       (select count(*) = 3 from public.plano_catalogo
        where codigo in ('essencial', 'profissional', 'master')) as ok
union all
-- (preço e teto NÃO são conferidos pelo valor: a semente é "só se não
-- existir" para o dono editar pelo admin, e uma re-execução depois de
-- ele mudar um preço não pode voltar false)
select 'todo plano ativo tem preço e logins',
       (select bool_and(valor_mensal > 0 and logins > 0) from public.plano_catalogo where ativo)
union all
select 'a policy de insert de events exige ser da empresa',
       (select pg_get_expr(polwithcheck, polrelid) ilike '%meu_cargo%'
        from pg_policy where polname = 'events_insert' and polrelid = 'public.events'::regclass)
union all
select 'nenhuma assinatura com plano fora do vocabulário',
       (select count(*) = 0 from public.assinaturas
        where plano not in ('essencial', 'profissional', 'master', 'piloto', 'cortesia'))
union all
select 'o CHECK de plano existe',
       (select count(*) = 1 from pg_constraint
        where conrelid = 'public.assinaturas'::regclass and conname = 'assinaturas_plano_check')
union all
select 'evento concluído não conta mais',
       (select pg_get_functiondef('public.eventos_que_contam(uuid)'::regprocedure)
        ilike '%in (''orcamento'', ''confirmado'')%')
union all
select 'teto_do_plano, eventos_da_vida, logins_que_contam e pode_adicionar_login existem uma vez',
       (select count(*) = 4 from pg_proc
        where proname in ('teto_do_plano', 'eventos_da_vida', 'logins_que_contam', 'pode_adicionar_login')
          and pronamespace = 'public'::regnamespace)
union all
select 'o trial continua contando a vida (um evento, não um por vez)',
       (select pg_get_functiondef('public.pode_criar_evento(uuid)'::regprocedure)
        ilike '%eventos_da_vida%')
union all
select 'os quatro gatilhos estão de pé',
       (select count(*) = 4 from pg_trigger
        where tgname in ('trg_limite_do_plano', 'trg_limite_do_plano_reativar',
                         'trg_limite_de_logins', 'trg_limite_de_logins_reativar')
          and not tgisinternal)
union all
select 'o gatilho de eventos avisa a dona no caminho sem sessão',
       (select pg_get_functiondef('public.trg_limite_do_plano()'::regprocedure)
        ilike '%Você passou do seu plano%')
union all
select 'minha_assinatura devolve os tetos',
       (select pg_get_functiondef('public.minha_assinatura()'::regprocedure)
        ilike '%limite_logins%')
union all
select 'conta de cortesia continua sem limite',
       (select coalesce(bool_and(t.eventos is null and t.logins is null), true)
        from public.assinaturas a
        cross join lateral public.teto_do_plano(a.empresa_id) t
        where a.plano = 'cortesia' and a.status in ('ativa', 'inadimplente', 'pausada'))
union all
select 'anon não executa nenhuma função nova',
       (select not has_function_privilege('anon', 'public.teto_do_plano(uuid)', 'execute')
           and not has_function_privilege('anon', 'public.pode_adicionar_login(uuid)', 'execute')
           and not has_function_privilege('anon', 'public.logins_que_contam(uuid)', 'execute'));
