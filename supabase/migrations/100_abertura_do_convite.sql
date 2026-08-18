-- 100 — Saber quem ABRIU o convite, não só quem recebeu
--
-- A tela de fornecedores mostra hoje "Convite enviado em 14/08" e para
-- por aí. Isso mistura duas situações que exigem reações opostas: o
-- fornecedor que abriu o link e não respondeu (cobrar a resposta) e o
-- que nem abriu (cobrar o recebimento, ou trocar o canal).
--
-- O gancho já existia: consultar_confirmacao(hash) é chamada
-- exatamente quando o fornecedor abre /confirmacao/[hash]. Ela só
-- precisava contar a visita. Era `language sql` + `stable` — função
-- stable não escreve —, então vira plpgsql volatile com o MESMO nome,
-- os mesmos argumentos e o mesmo retorno (json), para que a página
-- pública continue funcionando sem tocar em uma linha de código.
--
-- Também nasce events.email_auto, o par que faltava de whatsapp_auto
-- (075): a barra de automação da tela nova liga e desliga os dois
-- canais, e sem esta coluna o toggle de e-mail seria enfeite.
--
-- Execute no SQL Editor do Supabase (depois da 099).

begin;

-- ============================================================
-- 1) ABERTURA DO MAGIC LINK
-- ============================================================
alter table public.supplier_confirmations
  add column if not exists aberturas int not null default 0;

alter table public.supplier_confirmations
  add column if not exists ultima_abertura timestamptz;

comment on column public.supplier_confirmations.aberturas is
  'Quantas vezes o fornecedor abriu o link. Contado pela própria consultar_confirmacao — não há pixel de rastreio em e-mail.';

-- o insert em lote do PostgREST manda NULL explícito nas colunas
-- omitidas, e NULL explícito não aciona DEFAULT (lição da 093)
create or replace function public.trg_confirmacao_defaults()
returns trigger
language plpgsql
as $$
begin
  new.status    := coalesce(new.status, 'pendente');
  new.aberturas := coalesce(new.aberturas, 0);
  return new;
end $$;

drop trigger if exists trg_confirmacao_defaults on public.supplier_confirmations;
create trigger trg_confirmacao_defaults
  before insert or update on public.supplier_confirmations
  for each row execute function public.trg_confirmacao_defaults();

-- ============================================================
-- 2) A CONSULTA PÚBLICA PASSA A CONTAR A VISITA
-- ============================================================
-- Mesma assinatura, mesmo retorno: /confirmacao/[hash] não muda.
-- Conta sempre que abre, inclusive depois de responder — o fato é que
-- ele abriu; quem decide o que fazer com isso é a tela.
--
-- security definer + hash como credencial: quem tem o link conta uma
-- abertura, e é exatamente o que se espera de um link.
create or replace function public.consultar_confirmacao(p_hash text)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_json json;
begin
  update public.supplier_confirmations
  set aberturas = coalesce(aberturas, 0) + 1,
      ultima_abertura = now()
  where hash = p_hash;

  select json_build_object(
    'supplier_name', s.name,
    'event_label', public.event_label(e.type, e.client_id),
    'event_date', e.date,
    'event_time', e.time,
    'event_location', e.location,
    'status', sc.status,
    'responded_at', sc.responded_at
  )
  into v_json
  from public.supplier_confirmations sc
  join public.suppliers s on s.id = sc.supplier_id
  join public.events e on e.id = sc.event_id
  where sc.hash = p_hash;

  return v_json;
end;
$$;

revoke all on function public.consultar_confirmacao(text) from public;
grant execute on function public.consultar_confirmacao(text) to anon, authenticated;

-- ============================================================
-- 3) O CANAL DE E-MAIL LIGA E DESLIGA POR EVENTO
-- ============================================================
-- Espelho de whatsapp_auto (075). Padrão ligado: o e-mail é o canal
-- que gera o magic link, e desligá-lo por engano deixaria o evento sem
-- convite nenhum.
alter table public.events
  add column if not exists email_auto boolean not null default true;

comment on column public.events.email_auto is
  'Canal de e-mail da confirmação automática deste evento. Desligado, o cron não envia — e sem e-mail não há magic link.';

commit;

do $$
begin
  raise notice '100 aplicada: supplier_confirmations conta aberturas (consultar_confirmacao agora é volatile) e events ganhou email_auto.';
end $$;
