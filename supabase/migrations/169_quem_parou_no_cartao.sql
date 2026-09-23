-- ============================================================
-- 169 — QUEM PAROU NO CARTÃO
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- Decisão do dono (22/09/2026). Desde 21/09 a conta só nasce com o
-- cartão — e o cadastro tem duas etapas: primeiro nome, negócio, e-mail
-- e WhatsApp; depois o cartão. Quem desistia no cartão levava tudo
-- consigo: a conta não existia, e o que ela tinha digitado sumia. Na
-- primeira noite, uma pessoa chegou ao cartão e saiu, e ele não tinha
-- como falar com ela.
--
-- Esta tabela guarda a PRIMEIRA ETAPA no momento em que ela passa para
-- o cartão. O painel do dono lista quem parou ali, com o WhatsApp, para
-- ele mesmo chamar — venda direta, uma pessoa por vez.
--
-- O QUE NUNCA ENTRA AQUI: senha, CPF, endereço ou qualquer coisa do
-- cartão. Só o que a pessoa digitou na etapa 1, fora a senha.
--
-- Ninguém lê nem escreve pela sessão: RLS ligada e nenhuma policy. Quem
-- grava é o servidor (chave de serviço), na action do cadastro, e quem
-- lê é o painel do dono, que confere o dono antes.

create table if not exists public.cadastro_interrompido (
  id              uuid primary key default gen_random_uuid(),
  -- um registro por e-mail: voltar e parar de novo atualiza a mesma linha
  email           text not null,
  nome            text,
  negocio         text,
  whatsapp        text,
  instagram       text,
  eventos_3_meses text,
  -- de onde veio (utm_source, utm_campaign, utm_content), para ele saber
  -- qual anúncio trouxe quem parou
  origem          jsonb,
  -- quantas vezes chegou ao cartão
  tentativas      int not null default 1,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  -- a conta nasceu depois (com este e-mail): sai da lista de pendentes
  convertido_em   timestamptz,
  -- ele marcou que já falou com a pessoa
  contatado_em    timestamptz
);

create unique index if not exists cadastro_interrompido_email_idx
  on public.cadastro_interrompido (lower(email));

create index if not exists cadastro_interrompido_atualizado_idx
  on public.cadastro_interrompido (atualizado_em desc);

comment on table public.cadastro_interrompido is
  'A etapa 1 do cadastro de quem chegou ao cartão (169). Nunca senha, CPF, endereço ou cartão. Só o servidor lê e escreve.';

alter table public.cadastro_interrompido enable row level security;
-- sem policy nenhuma, de propósito: anon e authenticated não veem nada

-- ------------------------------------------------------------
-- A gravação, numa função só: um e-mail = uma linha.
-- ------------------------------------------------------------
-- Upsert pelo e-mail em minúsculas. Quem volta e para de novo soma uma
-- tentativa e renova os dados; quem já virou conta não volta a ser
-- pendente (convertido_em não é apagado).
create or replace function public.registrar_cadastro_interrompido(
  p_email text,
  p_nome text,
  p_negocio text,
  p_whatsapp text,
  p_instagram text,
  p_eventos_3_meses text,
  p_origem jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(p_email), '') = '' then
    return;
  end if;
  insert into public.cadastro_interrompido
    (email, nome, negocio, whatsapp, instagram, eventos_3_meses, origem)
  values
    (lower(trim(p_email)), left(p_nome, 120), left(p_negocio, 120), left(p_whatsapp, 30),
     left(p_instagram, 60), left(p_eventos_3_meses, 20), p_origem)
  on conflict (lower(email)) do update
    set nome            = coalesce(excluded.nome, cadastro_interrompido.nome),
        negocio         = coalesce(excluded.negocio, cadastro_interrompido.negocio),
        whatsapp        = coalesce(excluded.whatsapp, cadastro_interrompido.whatsapp),
        instagram       = coalesce(excluded.instagram, cadastro_interrompido.instagram),
        eventos_3_meses = coalesce(excluded.eventos_3_meses, cadastro_interrompido.eventos_3_meses),
        origem          = coalesce(excluded.origem, cadastro_interrompido.origem),
        tentativas      = cadastro_interrompido.tentativas + 1,
        atualizado_em   = now();
end $$;

-- só o servidor chama
revoke all on function public.registrar_cadastro_interrompido(text, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.registrar_cadastro_interrompido(text, text, text, text, text, text, jsonb)
  to service_role;

-- ------------------------------------------------------------
-- Conferência: cada linha tem de voltar true
-- ------------------------------------------------------------
select 'tabela existe' as verificacao,
       to_regclass('public.cadastro_interrompido') is not null as aplicou
union all
select 'RLS ligada',
       (select relrowsecurity from pg_class where oid = 'public.cadastro_interrompido'::regclass)
union all
select 'e-mail único (índice)',
       to_regclass('public.cadastro_interrompido_email_idx') is not null
union all
select 'função existe',
       to_regprocedure('public.registrar_cadastro_interrompido(text, text, text, text, text, text, jsonb)') is not null
union all
select 'anon não chama a função',
       not has_function_privilege('anon', 'public.registrar_cadastro_interrompido(text, text, text, text, text, text, jsonb)', 'execute')
union all
select 'o servidor chama a função',
       has_function_privilege('service_role', 'public.registrar_cadastro_interrompido(text, text, text, text, text, text, jsonb)', 'execute');
