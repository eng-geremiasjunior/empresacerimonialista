-- ============================================================
-- 161 — O SUPORTE DENTRO DO SISTEMA
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- Em 13/09/2026 entrou a primeira conta de alguém que o dono não conhece,
-- vinda do anúncio. Até aqui a única porta de ajuda era o direct do
-- Instagram — fora do sistema, sem saber de qual conta a pessoa fala nem
-- em que tela ela estava.
--
-- A cliente escreve numa caixinha no canto do sistema; o dono lê e
-- responde pelo painel de gestão; a resposta volta para a mesma caixinha.
--
-- DESENHO DE ACESSO — o mais fechado possível:
--
--   * A tabela NÃO tem policy nenhuma. Ninguém logado lê nem escreve nela
--     direto. A cliente passa por DUAS funções, que só enxergam a conversa
--     do próprio auth.uid() — não existe parâmetro de "de quem".
--   * O painel do dono usa a chave de serviço, atrás do gate de
--     SUPER_ADMIN_EMAILS (lib/supabase/admin-painel.ts).
--
-- A CONVERSA É DA PESSOA, não da empresa: numa conta com equipe, a
-- dúvida da assistente não aparece para a proprietária, e vice-versa.

begin;

create table if not exists public.suporte_mensagem (
  id                   uuid primary key default gen_random_uuid(),
  empresa_id           uuid not null references public.empresas (id) on delete cascade,
  user_id              uuid references auth.users (id) on delete set null,
  autor                text not null check (autor in ('cliente', 'eorganizei')),
  texto                text not null check (char_length(btrim(texto)) between 1 and 2000),
  -- em que tela ela estava quando escreveu: metade das dúvidas se
  -- responde sabendo isso
  pagina               text check (pagina is null or char_length(pagina) <= 200),
  lida_pelo_suporte_em timestamptz,
  lida_pela_cliente_em timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists idx_suporte_conversa
  on public.suporte_mensagem (user_id, created_at);

-- a caixa de entrada do dono: o que ainda não foi lido
create index if not exists idx_suporte_nao_lidas
  on public.suporte_mensagem (created_at)
  where autor = 'cliente' and lida_pelo_suporte_em is null;

alter table public.suporte_mensagem enable row level security;
-- Sem policy, de propósito: ver o cabeçalho.

-- ------------------------------------------------------------
-- 1) Enviar
-- ------------------------------------------------------------
-- A empresa sai do login, nunca do navegador. Teto de 30 mensagens por
-- hora por pessoa: ninguém com dúvida escreve mais que isso, e sem teto a
-- caixinha vira um jeito de encher a caixa de entrada do dono.

create or replace function public.enviar_mensagem_suporte(p_texto text, p_pagina text default null)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_texto   text := btrim(coalesce(p_texto, ''));
  v_recentes int;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sessao expirada. Entre de novo.';
  end if;
  if char_length(v_texto) = 0 then
    raise exception 'Escreva a mensagem.';
  end if;
  if char_length(v_texto) > 2000 then
    raise exception 'Mensagem longa demais.';
  end if;

  select m.empresa_id into v_empresa
    from public.membros_equipe m
   where m.user_id = auth.uid() and m.status = 'ativo'
   order by m.created_at asc
   limit 1;
  if v_empresa is null then
    raise exception 'Perfil nao encontrado.';
  end if;

  select count(*) into v_recentes
    from public.suporte_mensagem s
   where s.user_id = auth.uid()
     and s.autor = 'cliente'
     and s.created_at > now() - interval '1 hour';
  if v_recentes >= 30 then
    raise exception 'Muitas mensagens seguidas. Tente de novo daqui a pouco.';
  end if;

  insert into public.suporte_mensagem (empresa_id, user_id, autor, texto, pagina)
  values (v_empresa, auth.uid(), 'cliente', v_texto, left(p_pagina, 200))
  returning id into v_id;

  return json_build_object('id', v_id);
end $$;

revoke all on function public.enviar_mensagem_suporte(text, text) from public, anon;
grant execute on function public.enviar_mensagem_suporte(text, text) to authenticated;

-- ------------------------------------------------------------
-- 2) Ler a própria conversa
-- ------------------------------------------------------------
-- `p_marcar_lidas`: a caixinha pergunta "tem resposta nova?" de tempos em
-- tempos sem abrir a conversa — essa consulta NÃO pode dar a resposta
-- como lida. Só quando ela abre.

create or replace function public.minha_conversa_suporte(p_marcar_lidas boolean default false)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_nao_lidas int;
begin
  if auth.uid() is null then return null; end if;

  select count(*) into v_nao_lidas
    from public.suporte_mensagem s
   where s.user_id = auth.uid()
     and s.autor = 'eorganizei'
     and s.lida_pela_cliente_em is null;

  if coalesce(p_marcar_lidas, false) and v_nao_lidas > 0 then
    update public.suporte_mensagem s
       set lida_pela_cliente_em = now()
     where s.user_id = auth.uid()
       and s.autor = 'eorganizei'
       and s.lida_pela_cliente_em is null;
  end if;

  return json_build_object(
    'nao_lidas', case when coalesce(p_marcar_lidas, false) then 0 else v_nao_lidas end,
    'mensagens', coalesce((
      select json_agg(json_build_object(
               'id', t.id, 'autor', t.autor, 'texto', t.texto, 'em', t.created_at
             ) order by t.created_at)
        from (
          select s.id, s.autor, s.texto, s.created_at
            from public.suporte_mensagem s
           where s.user_id = auth.uid()
           order by s.created_at desc
           limit 100
        ) t
    ), '[]'::json)
  );
end $$;

revoke all on function public.minha_conversa_suporte(boolean) from public, anon;
grant execute on function public.minha_conversa_suporte(boolean) to authenticated;

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
-- Sem `WITH`: cada linha é um subselect fechado (na 158 um `with` no meio
-- de um `union all` derrubou o arquivo inteiro).

select 'a tabela existe' as item,
       exists (
         select 1 from information_schema.tables
          where table_schema = 'public' and table_name = 'suporte_mensagem'
       ) as ok

union all
select 'RLS ligada',
       (select relrowsecurity from pg_class where oid = 'public.suporte_mensagem'::regclass)

union all
-- nenhuma policy: ninguém logado toca a tabela direto
select 'nenhuma policy (so as funcoes e o painel entram)',
       not exists (
         select 1 from pg_policies
          where schemaname = 'public' and tablename = 'suporte_mensagem'
       )

union all
select 'as duas funcoes existem e sao security definer',
       (
         select count(*) = 2 from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.proname in ('enviar_mensagem_suporte', 'minha_conversa_suporte')
            and p.prosecdef
       )

union all
select 'anon nao executa',
       not exists (
         select 1 from information_schema.routine_privileges
          where routine_schema = 'public'
            and routine_name in ('enviar_mensagem_suporte', 'minha_conversa_suporte')
            and grantee = 'anon'
       );
