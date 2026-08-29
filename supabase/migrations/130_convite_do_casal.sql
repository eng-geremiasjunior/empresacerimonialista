-- ============================================================
-- Vela — Migração 130: o casal edita o próprio convite
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- A 129 deu ao convite os campos (títulos, cores, presentes, foto do
-- casal, blocos) — mas quem escreve em evento_site é só a equipe: a
-- cliente tem apenas SELECT ali, de propósito, porque a mesma linha
-- carrega o `publicado` e o `slug`. Dar update largo à cliente seria
-- dar a ela o botão de publicar e o endereço impresso.
--
-- Então a escrita dela continua por função, com as colunas listadas uma
-- a uma — o mesmo desenho de portal_salvar_site (128). Duas funções:
-- uma para o conteúdo do convite, outra para os três blocos que ela
-- liga e desliga durante a festa.
--
-- A moderação (esconder foto, esconder recado, aprovar música) NÃO
-- precisa de função: aquelas tabelas nasceram na 129 com policy de
-- escrita para a cliente, porque são dela por natureza.

-- ------------------------------------------------------------
-- 1) O conteúdo do convite que é do casal
-- ------------------------------------------------------------
create or replace function public.portal_ajustar_convite(
  p_event_id          uuid,
  p_historia_titulo   text,
  p_dress_code_titulo text,
  p_cor_acento        text,
  p_cor_tinta         text,
  p_cor_fundo         text,
  p_presentes_texto   text,
  p_pix_chave         text,
  p_pix_titular       text,
  p_presentes_link    text,
  p_foto_casal_path   text
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_hex constant text := '^#[0-9a-fA-F]{6}$';
  v_link text := nullif(btrim(coalesce(p_presentes_link, '')), '');
begin
  if not (public.sou_cliente_do_evento(p_event_id)
          or public.pode_editar_evento(p_event_id)) then
    raise exception 'sem permissão para este evento';
  end if;

  -- cor entra no style da página: só #rrggbb passa
  if (p_cor_acento is not null and p_cor_acento !~ v_hex)
     or (p_cor_tinta is not null and p_cor_tinta !~ v_hex)
     or (p_cor_fundo is not null and p_cor_fundo !~ v_hex) then
    raise exception 'cor inválida: use o formato #rrggbb';
  end if;

  -- o link vira href na página pública; javascript: fica de fora
  if v_link is not null and v_link !~* '^https?://' then
    raise exception 'o link da lista precisa começar com https://';
  end if;

  insert into public.evento_site (event_id, atualizado_por)
  values (p_event_id, auth.uid())
  on conflict (event_id) do nothing;

  update public.evento_site
     set historia_titulo   = nullif(left(btrim(coalesce(p_historia_titulo, '')), 120), ''),
         dress_code_titulo = nullif(left(btrim(coalesce(p_dress_code_titulo, '')), 60), ''),
         cor_acento        = p_cor_acento,
         cor_tinta         = p_cor_tinta,
         cor_fundo         = p_cor_fundo,
         presentes_texto   = nullif(left(btrim(coalesce(p_presentes_texto, '')), 400), ''),
         pix_chave         = nullif(left(btrim(coalesce(p_pix_chave, '')), 120), ''),
         pix_titular       = nullif(left(btrim(coalesce(p_pix_titular, '')), 120), ''),
         presentes_link    = v_link,
         -- a foto vive no bucket das inspirações, que a cliente já
         -- alimenta; o caminho tem que ser da pasta DESTE evento
         foto_casal_path   = case
                               when p_foto_casal_path is null then foto_casal_path
                               when p_foto_casal_path = '' then null
                               when p_foto_casal_path like (p_event_id::text || '/%')
                                 then p_foto_casal_path
                               else foto_casal_path
                             end,
         atualizado_por    = auth.uid(),
         updated_at        = now()
   where event_id = p_event_id;
end $$;

revoke all on function public.portal_ajustar_convite(
  uuid, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.portal_ajustar_convite(
  uuid, text, text, text, text, text, text, text, text, text, text) to authenticated;

comment on function public.portal_ajustar_convite(
  uuid, text, text, text, text, text, text, text, text, text, text) is
  'O casal ajusta o próprio convite (títulos, cores, presentes, foto). Função e não policy: a mesma linha carrega publicado e slug, que são da cerimonialista.';

-- ------------------------------------------------------------
-- 2) Os três blocos do convidado, ligados e desligados na hora
-- ------------------------------------------------------------
create or replace function public.portal_definir_blocos(
  p_event_id uuid,
  p_album    boolean,
  p_playlist boolean,
  p_recados  boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not (public.sou_cliente_do_evento(p_event_id)
          or public.pode_editar_evento(p_event_id)) then
    raise exception 'sem permissão para este evento';
  end if;

  insert into public.evento_site (event_id, atualizado_por)
  values (p_event_id, auth.uid())
  on conflict (event_id) do nothing;

  update public.evento_site
     set album_aberto    = coalesce(p_album, album_aberto),
         playlist_aberta = coalesce(p_playlist, playlist_aberta),
         recados_aberto  = coalesce(p_recados, recados_aberto),
         atualizado_por  = auth.uid(),
         updated_at      = now()
   where event_id = p_event_id;
end $$;

revoke all on function public.portal_definir_blocos(uuid, boolean, boolean, boolean) from public, anon;
grant execute on function public.portal_definir_blocos(uuid, boolean, boolean, boolean) to authenticated;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'as duas funções do casal existem' as item,
       exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.proname = 'portal_ajustar_convite')
       and exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname = 'portal_definir_blocos') as ok
union all
select 'anon não executa nenhuma das duas',
       not has_function_privilege('anon',
         'public.portal_ajustar_convite(uuid, text, text, text, text, text, text, text, text, text, text)', 'execute')
       and not has_function_privilege('anon',
         'public.portal_definir_blocos(uuid, boolean, boolean, boolean)', 'execute')
union all
select 'as duas exigem vínculo com o evento',
       (pg_get_functiondef('public.portal_ajustar_convite(uuid, text, text, text, text, text, text, text, text, text, text)'::regprocedure)
         like '%sou_cliente_do_evento%')
       and (pg_get_functiondef('public.portal_definir_blocos(uuid, boolean, boolean, boolean)'::regprocedure)
         like '%sou_cliente_do_evento%')
union all
select 'a cor é validada antes de virar style',
       (pg_get_functiondef('public.portal_ajustar_convite(uuid, text, text, text, text, text, text, text, text, text, text)'::regprocedure)
         like '%cor inválida%')
union all
select 'o link da lista só aceita http(s)',
       (pg_get_functiondef('public.portal_ajustar_convite(uuid, text, text, text, text, text, text, text, text, text, text)'::regprocedure)
         like '%https%')
union all
select 'o casal continua SEM escrita direta em evento_site',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'evento_site'
           and cmd in ('UPDATE', 'ALL')
           and coalesce(qual, with_check) like '%eventos_da_cliente%'
       )
union all
select 'mas modera fotos, recados e músicas direto (são dela)',
       (select count(*) = 3 from pg_policies
        where schemaname = 'public'
          and tablename in ('evento_album_foto', 'evento_recado', 'evento_musica')
          and policyname like '%_write'
          and coalesce(qual, with_check) like '%eventos_da_cliente%');
