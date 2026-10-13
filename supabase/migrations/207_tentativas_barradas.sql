-- ============================================================
-- 207 — As tentativas barradas, contadas por hora
-- ============================================================
-- Pedido dele (13/10/2026): saber se quem abriu contas em série voltou e
-- foi barrado. Até aqui o bloqueio por IP (middleware) e a recusa do
-- cadastro (bloqueios-de-cadastro.ts) não deixavam rastro nenhum.
--
-- Uma linha por hora × porta × motivo × IP, com o número de vezes: quem
-- insiste não enche a tabela. Nada do que a pessoa digitou (nome, e-mail,
-- CPF, senha) é gravado — só a porta, o motivo, o IP e a hora. Guardado
-- por 90 dias (a própria função apaga o que passou disso).
--
-- Quem grava: só o servidor, com a chave de serviço, pela função
-- registrar_tentativa_barrada. Quem lê: só o /admin (chave de serviço).
-- RLS ligada e nenhuma policy: a chave anônima e a sessão não veem nada.
--
-- Convergente: pode rodar mais de uma vez.

begin;

create table if not exists public.tentativa_barrada (
  id          bigint generated always as identity primary key,
  hora        timestamptz not null,
  porta       text not null,
  motivo      text not null,
  ip          text not null default '',
  vezes       integer not null default 1,
  primeira_em timestamptz not null default now(),
  ultima_em   timestamptz not null default now()
);

do $$
begin
  alter table public.tentativa_barrada drop constraint if exists tentativa_barrada_porta;
  alter table public.tentativa_barrada add constraint tentativa_barrada_porta
    check (porta in ('site', 'cadastro', 'assinatura'));
  alter table public.tentativa_barrada drop constraint if exists tentativa_barrada_motivo;
  alter table public.tentativa_barrada add constraint tentativa_barrada_motivo
    check (motivo in (
      'ip_bloqueado',        -- um dos IPs de ips-bloqueados.ts
      'navegador_barrado',   -- um dos navegadores de bloqueios-de-cadastro.ts
      'conta_suspensa',      -- o navegador ou o WhatsApp é de uma conta suspensa
      'email_descartavel',   -- caixa de 10 minutos
      'email_sem_caixa',     -- o domínio não recebe e-mail (sem MX)
      'documento_repetido',  -- CPF/CNPJ de outra conta
      'conta_repetida'       -- uma conta por pessoa: o mesmo navegador ou WhatsApp de uma conta ativa
    ));
  alter table public.tentativa_barrada drop constraint if exists tentativa_barrada_ip;
  alter table public.tentativa_barrada add constraint tentativa_barrada_ip
    check (length(ip) <= 64);
  alter table public.tentativa_barrada drop constraint if exists tentativa_barrada_uma_por_hora;
  alter table public.tentativa_barrada add constraint tentativa_barrada_uma_por_hora
    unique (hora, porta, motivo, ip);
end $$;

alter table public.tentativa_barrada enable row level security;
revoke all on public.tentativa_barrada from public, anon, authenticated;

comment on table public.tentativa_barrada is
  'Tentativas barradas (207): porta, motivo, IP e hora, contadas por hora. Sem nada do que a pessoa digitou. 90 dias. Só a chave de serviço.';

create or replace function public.registrar_tentativa_barrada(p_porta text, p_motivo text, p_ip text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_porta is null or p_motivo is null then return; end if;
  if p_porta not in ('site', 'cadastro', 'assinatura') then return; end if;
  if p_motivo not in ('ip_bloqueado', 'navegador_barrado', 'conta_suspensa', 'email_descartavel',
                      'email_sem_caixa', 'documento_repetido', 'conta_repetida') then return; end if;

  insert into public.tentativa_barrada as t (hora, porta, motivo, ip)
  values (date_trunc('hour', now()), p_porta, p_motivo, left(coalesce(p_ip, ''), 64))
  on conflict (hora, porta, motivo, ip)
  do update set vezes = t.vezes + 1, ultima_em = now();

  delete from public.tentativa_barrada where hora < now() - interval '90 days';
end;
$$;

revoke all on function public.registrar_tentativa_barrada(text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_tentativa_barrada(text, text, text) to service_role;

create index if not exists tentativa_barrada_por_hora on public.tentativa_barrada (hora desc);

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar 'true'.
-- ------------------------------------------------------------
select 'a tabela existe' as item,
       to_regclass('public.tentativa_barrada') is not null as ok
union all
select 'RLS ligada',
       (select relrowsecurity from pg_class where oid = 'public.tentativa_barrada'::regclass)
union all
select 'nenhuma policy (só a chave de serviço)',
       not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tentativa_barrada')
union all
select 'a chave anônima não lê a tabela',
       not has_table_privilege('anon', 'public.tentativa_barrada', 'select')
union all
select 'a sessão não lê a tabela',
       not has_table_privilege('authenticated', 'public.tentativa_barrada', 'select')
union all
select 'a chave anônima não grava pela função',
       not has_function_privilege('anon', 'public.registrar_tentativa_barrada(text, text, text)', 'execute')
union all
select 'a sessão não grava pela função',
       not has_function_privilege('authenticated', 'public.registrar_tentativa_barrada(text, text, text)', 'execute')
union all
select 'uma linha por hora, porta, motivo e IP',
       exists (select 1 from pg_constraint where conname = 'tentativa_barrada_uma_por_hora');
