-- ============================================================
-- 209 — Portal, fora do Brasil e a impressão digital do navegador
-- ============================================================
-- 14/10/2026: quem abriu contas em série voltou pelo portal da noiva (a
-- conta de família criada sozinha, que ainda não passava pelos bloqueios
-- do cadastro). O cadastro do portal passou a usar os mesmos bloqueios, e
-- a recusa dele precisa contar no /admin/logins com a porta "portal".
--
-- No mesmo dia, pedido dele: barrar por todos os mecanismos que existirem
-- e barrar o acesso de fora do Brasil (ele não atende outros países; VPN
-- costuma sair por outro país). Por isso esta migração também:
--   · aceita os motivos 'fora_do_brasil' e 'impressao_digital';
--   · guarda em origem_do_clique a impressão digital do navegador
--     (um resumo de 64 letras, sem dado pessoal: tela, fuso, placa de
--     vídeo, desenho de teste) — o que liga um cadastro novo a uma conta
--     suspensa mesmo com outro IP e sem cookies.
-- Convergente: pode rodar mais de uma vez.

begin;

do $$
begin
  alter table public.tentativa_barrada drop constraint if exists tentativa_barrada_porta;
  alter table public.tentativa_barrada add constraint tentativa_barrada_porta
    check (porta in ('site', 'cadastro', 'assinatura', 'portal'));
  alter table public.tentativa_barrada drop constraint if exists tentativa_barrada_motivo;
  alter table public.tentativa_barrada add constraint tentativa_barrada_motivo
    check (motivo in ('ip_bloqueado', 'navegador_barrado', 'conta_suspensa', 'email_descartavel',
                      'email_sem_caixa', 'documento_repetido', 'conta_repetida',
                      'fora_do_brasil', 'impressao_digital'));
  alter table public.origem_do_clique drop constraint if exists origem_do_clique_impressao;
end $$;

alter table public.origem_do_clique add column if not exists impressao text;
do $$
begin
  alter table public.origem_do_clique add constraint origem_do_clique_impressao
    check (impressao is null or impressao ~ '^[0-9a-f]{64}$');
end $$;
create index if not exists origem_do_clique_por_impressao on public.origem_do_clique (impressao) where impressao is not null;
comment on column public.origem_do_clique.impressao is
  'Impressão digital do navegador no cadastro (209): sha-256 de sinais técnicos (tela, fuso, placa de vídeo, desenho de teste). Liga um cadastro novo a uma conta suspensa.';

create or replace function public.registrar_tentativa_barrada(p_porta text, p_motivo text, p_ip text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_porta is null or p_motivo is null then return; end if;
  if p_porta not in ('site', 'cadastro', 'assinatura', 'portal') then return; end if;
  if p_motivo not in ('ip_bloqueado', 'navegador_barrado', 'conta_suspensa', 'email_descartavel',
                      'email_sem_caixa', 'documento_repetido', 'conta_repetida',
                      'fora_do_brasil', 'impressao_digital') then return; end if;

  insert into public.tentativa_barrada as t (hora, porta, motivo, ip)
  values (date_trunc('hour', now()), p_porta, p_motivo, left(coalesce(p_ip, ''), 64))
  on conflict (hora, porta, motivo, ip)
  do update set vezes = t.vezes + 1, ultima_em = now();

  delete from public.tentativa_barrada where hora < now() - interval '90 days';
end;
$$;

revoke all on function public.registrar_tentativa_barrada(text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_tentativa_barrada(text, text, text) to service_role;

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar 'true'.
-- ------------------------------------------------------------
select 'os motivos novos são aceitos' as item,
       pg_get_constraintdef((select oid from pg_constraint where conname = 'tentativa_barrada_motivo')) like '%fora_do_brasil%'
       and pg_get_constraintdef((select oid from pg_constraint where conname = 'tentativa_barrada_motivo')) like '%impressao_digital%' as ok
union all
select 'a coluna da impressão digital existe',
       exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'origem_do_clique' and column_name = 'impressao')
union all
select 'a impressão só aceita 64 letras hexadecimais',
       exists (select 1 from pg_constraint where conname = 'origem_do_clique_impressao')
union all
select 'a porta "portal" é aceita',
       pg_get_constraintdef((select oid from pg_constraint where conname = 'tentativa_barrada_porta')) like '%portal%' as ok
union all
select 'a função aceita a porta "portal"',
       (select prosrc from pg_proc where proname = 'registrar_tentativa_barrada') like '%''portal''%'
union all
select 'a chave anônima continua sem gravar',
       not has_function_privilege('anon', 'public.registrar_tentativa_barrada(text, text, text)', 'execute')
union all
select 'a sessão continua sem gravar',
       not has_function_privilege('authenticated', 'public.registrar_tentativa_barrada(text, text, text)', 'execute');
