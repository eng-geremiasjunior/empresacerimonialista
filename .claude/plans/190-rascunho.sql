-- ============================================================
-- 190 — O que a revisão da 189 achou aberto (rascunho, 30/09/2026)
-- ============================================================
-- A 189 já está no ar (30/09, SQL Editor). Esta NÃO reaplica a 189: só
-- fecha o que a revisão cética achou aberto. Aditiva e convergente (pode
-- rodar de novo), não apaga dado, não muda o nível de ninguém. Precisa
-- estar no ar ANTES do primeiro acesso com nível diferente de 'casal'
-- (tela "Família e acessos", convite com papel, UPDATE manual de nivel).
--
--   1) evento_campo_valor: dinheiro só com 'financeiro'; alergia e
--      medicamento só com 'saude' (área nova: não está em nivel_permite,
--      cai no "else" = só o casal);
--   2) portal_escrever_campo: quem não vê alergia/medicamento não responde;
--   3) pagamentos_fornecedor_por_mes: o portão passa a ser 'financeiro'
--      (a equipe, a chave de serviço e o casal continuam como hoje);
--   4) portal_ajustar_convite: Pix, titular, link e texto da lista só com
--      'gestao' (só o casal). Trocar por 'presentes' abre para mãe e quem
--      aprova e fecha só o padrinho — decisão do dono;
--   5) álbum, músicas e recados: escrita só com 'escrever'.
-- O preço da opção (decisao_opcao.valor) NÃO entra aqui: espera a decisão
-- do dono sobre "preço da opção é financeiro?".
--
-- A conferência também prova que os 27 embrulhos da 189 continuam
-- embrulhos: é o item que pega uma migração antiga reaplicada por cima.
-- Rode-a depois de QUALQUER migração.
-- ============================================================

-- a 190 vem depois da 189 (sem ela, os embrulhos daqui chamariam o vazio)
do $$
begin
  if to_regprocedure('public.portal_escrever_campo_base(uuid, jsonb, timestamptz)') is null
     or to_regprocedure('public.portal_ajustar_convite_base(uuid, text, text, text, text, text, text, text, text, text, text)') is null
     or to_regprocedure('public.eventos_da_cliente_na(text)') is null then
    raise exception 'a 190 vem depois da 189: aplique a 189 primeiro';
  end if;
end $$;

begin;

-- ------------------------------------------------------------
-- 1) evento_campo_valor: o número que a 189 escondeu nas RPCs também
--    não sai pela tabela
-- ------------------------------------------------------------
-- Dinheiro = o mesmo vocabulário das travas da 090 e da 146 (moeda,
-- verba_total, reserva_pct, valor%, orcamento% — este último pega os
-- "Orçamentos (até 3)" em texto livre, que podem ter preço digitado).
-- Nenhuma tela do portal lê esses campos: getPerguntasDaCliente filtra
-- pergunta_cliente (dinheiro nunca é pergunta, 090/146) e getDatasDoConvite
-- lê só data_envio_std/data_envio_convites. A equipe entra pela
-- evento_campo_valor_select (089:112), que soma por OR.
-- 'to authenticated': o portal sempre tem sessão; anon nem avalia.
drop policy if exists portal_campo_valor_select on public.evento_campo_valor;
create policy portal_campo_valor_select on public.evento_campo_valor
  for select to authenticated using (
    event_id in (select public.eventos_da_cliente())
    and visivel_portal
    and evento_decisao_id in (
      select ed.id from public.evento_decisao ed
       where ed.event_id in (select public.eventos_da_cliente())
         and ed.responsavel in ('noivos', 'ambos'))
    -- dinheiro: só quem tem 'financeiro'
    and (not (tipo = 'moeda'
              or codigo in ('verba_total', 'reserva_pct')
              or codigo like 'valor%'
              or codigo like 'orcamento%')
         or event_id in (select public.eventos_da_cliente_na('financeiro')))
    -- alergia e medicamento: só quem tem 'saude' (hoje, só o casal)
    and (sensibilidade = 'normal'
         or event_id in (select public.eventos_da_cliente_na('saude')))
  );

-- ------------------------------------------------------------
-- 2) portal_escrever_campo: quem não vê, não responde
-- ------------------------------------------------------------
-- Mesmo embrulho da 189 + a área 'saude' para campo sensível. Abrir para
-- a mãe = pôr 'saude' na lista de 'familia' em nivel_permite (abre ler e
-- responder juntos). Moeda não precisa de guarda: a base já recusa campo
-- que não é pergunta, e moeda nunca é pergunta.
create or replace function public.portal_escrever_campo(
  p_campo_id uuid, p_valor jsonb, p_updated_at_visto timestamptz default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_ev   uuid;
  v_sens text;
begin
  select c.event_id, c.sensibilidade into v_ev, v_sens
    from public.evento_campo_valor c where c.id = p_campo_id;
  if v_ev is null or not public.portal_pode_fazer(v_ev, 'escrever') then
    raise exception 'sem permissão';
  end if;
  if coalesce(v_sens, 'normal') <> 'normal' and not public.portal_pode_fazer(v_ev, 'saude') then
    raise exception 'sem permissão';
  end if;
  return public.portal_escrever_campo_base(p_campo_id, p_valor, p_updated_at_visto);
end $$;

revoke all on function public.portal_escrever_campo(uuid, jsonb, timestamptz) from public, anon;
grant execute on function public.portal_escrever_campo(uuid, jsonb, timestamptz) to authenticated;

-- ------------------------------------------------------------
-- 3) pagamentos_fornecedor_por_mes: só com 'financeiro'
-- ------------------------------------------------------------
-- Ficou fora dos embrulhos da 189. portal_pode(…,'financeiro') = chave de
-- serviço OU pode_ver_evento (a guarda da equipe de antes) OU o casal.
-- Barra familia, aprova, leitura e padrinho. Nenhuma tela chama a função
-- (só um comentário em src/lib/verba-fornecedores.ts). O texto
-- "t.type = 'despesa'" fica idêntico para a conferência da 135 seguir true.
create or replace function public.pagamentos_fornecedor_por_mes(p_event_id uuid)
returns table (
  supplier_id   uuid,
  fornecedor    text,
  mes           date,
  total_pago    numeric,
  qtd_parcelas  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.supplier_id,
    s.name as fornecedor,
    date_trunc('month', coalesce(t.paid_at::date, t.due_date))::date as mes,
    sum(t.value) as total_pago,
    count(*) as qtd_parcelas
  from public.transactions t
  join public.suppliers s on s.id = t.supplier_id
  where public.portal_pode(p_event_id, 'financeiro')
    and t.event_id = p_event_id
    and t.conta = 'fornecedor'
    and t.type = 'despesa'
    and t.paid
  group by t.supplier_id, s.name, 3
  order by 3, s.name;
$$;

revoke all on function public.pagamentos_fornecedor_por_mes(uuid) from public, anon;
grant execute on function public.pagamentos_fornecedor_por_mes(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) portal_ajustar_convite: para onde vai o dinheiro é do casal
-- ------------------------------------------------------------
-- O NossoSite reenvia Pix, titular, link e texto a cada salvamento. Por
-- isso a trava compara com o que está salvo, normalizado como a base
-- normaliza (186:169-171): reenviar o mesmo valor passa, e mudar exige a
-- área. 'for update': a comparação e a gravação veem a mesma linha.
-- A mensagem aparece na tela (o site mostra a mensagem do P0001).
create or replace function public.portal_ajustar_convite(
  p_event_id uuid, p_historia_titulo text, p_dress_code_titulo text, p_cor_acento text,
  p_cor_tinta text, p_cor_fundo text, p_presentes_texto text, p_pix_chave text,
  p_pix_titular text, p_presentes_link text, p_foto_casal_path text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_s public.evento_site%rowtype;
begin
  if not public.portal_pode_fazer(p_event_id, 'escrever') then
    raise exception 'sem permissão';
  end if;
  select * into v_s from public.evento_site where event_id = p_event_id for update;
  if (nullif(left(btrim(coalesce(p_pix_chave, '')), 120), '') is distinct from v_s.pix_chave
      or nullif(left(btrim(coalesce(p_pix_titular, '')), 120), '') is distinct from v_s.pix_titular
      or nullif(btrim(coalesce(p_presentes_link, '')), '') is distinct from v_s.presentes_link
      or nullif(left(btrim(coalesce(p_presentes_texto, '')), 400), '') is distinct from v_s.presentes_texto)
     and not public.portal_pode_fazer(p_event_id, 'gestao') then   -- ou 'presentes': decisão do dono
    raise exception 'A chave Pix e a lista de presentes são do casal.';
  end if;
  perform public.portal_ajustar_convite_base(p_event_id, p_historia_titulo, p_dress_code_titulo,
    p_cor_acento, p_cor_tinta, p_cor_fundo, p_presentes_texto, p_pix_chave, p_pix_titular,
    p_presentes_link, p_foto_casal_path);
end $$;

revoke all on function public.portal_ajustar_convite(
  uuid, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.portal_ajustar_convite(
  uuid, text, text, text, text, text, text, text, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- 5) álbum, músicas e recados: escrita só com 'escrever'
-- ------------------------------------------------------------
-- A 129 deixou <t>_write com eventos_da_cliente() puro: 'leitura' apagava
-- recados. A leitura de todos continua pela <t>_select da 129. O nome
-- '_write' e o FOR ALL ficam iguais, e a conferência da 130 ("modera
-- fotos, recados e músicas", 3 políticas '%_write') segue true.
-- Separar por comando (e restringir o padrinho na leitura) espera a
-- decisão do dono.
do $$
declare t text;
begin
  foreach t in array array['evento_album_foto', 'evento_musica', 'evento_recado'] loop
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format(
      'create policy %I on public.%I for all using (
         public.pode_editar_evento(event_id)
         or event_id in (select public.eventos_da_cliente_na(''escrever'')))
       with check (
         public.pode_editar_evento(event_id)
         or event_id in (select public.eventos_da_cliente_na(''escrever'')))',
      t || '_write', t);
  end loop;
end $$;

commit;

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select 'evento_campo_valor: dinheiro só com financeiro' as item,
       exists (select 1 from pg_policies
                where schemaname = 'public' and tablename = 'evento_campo_valor'
                  and policyname = 'portal_campo_valor_select'
                  and qual ~ 'financeiro' and qual ~ 'moeda'
                  and qual ~ 'verba_total' and qual ~ 'orcamento') as ok
union all
select 'evento_campo_valor: alergia e medicamento só com saude (só o casal)',
       exists (select 1 from pg_policies
                where schemaname = 'public' and tablename = 'evento_campo_valor'
                  and policyname = 'portal_campo_valor_select'
                  and qual ~ 'sensibilidade' and qual ~ 'saude')
       and public.nivel_permite('casal', 'saude')
       and not public.nivel_permite('familia', 'saude')
       and not public.nivel_permite('aprova', 'saude')
       and not public.nivel_permite('leitura', 'saude')
       and not public.nivel_permite('padrinho', 'saude')
union all
select 'evento_campo_valor: nenhuma outra política abre para a família',
       not exists (select 1 from pg_policies
                    where schemaname = 'public' and tablename = 'evento_campo_valor'
                      and policyname <> 'portal_campo_valor_select'
                      and (coalesce(qual, '') ~ 'eventos_da_cliente'
                           or coalesce(with_check, '') ~ 'eventos_da_cliente'))
union all
select 'quem não vê alergia ou medicamento não responde',
       coalesce((select p.prosrc like '%sensibilidade%'
                        and p.prosrc like '%''saude''%'
                        and p.prosrc like '%portal_escrever_campo_base(%'
                   from pg_proc p
                  where p.oid = to_regprocedure('public.portal_escrever_campo(uuid, jsonb, timestamptz)')), false)
union all
select 'pagamentos por fornecedor: só com financeiro (e a regra da 135 continua)',
       coalesce((select p.prosrc like '%portal_pode(p_event_id, ''financeiro'')%'
                        and p.prosrc not like '%sou_cliente_do_evento%'
                        and p.prosrc like '%type = ''despesa''%'
                   from pg_proc p
                  where p.oid = to_regprocedure('public.pagamentos_fornecedor_por_mes(uuid)')), false)
       and has_function_privilege('authenticated', 'public.pagamentos_fornecedor_por_mes(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.pagamentos_fornecedor_por_mes(uuid)', 'execute')
union all
select 'chave Pix, titular, link e texto da lista: só com gestao',
       coalesce((select p.prosrc like '%''gestao''%'
                        and p.prosrc like '%pix_chave%'
                        and p.prosrc like '%presentes_link%'
                        and p.prosrc like '%for update%'
                        and p.prosrc like '%portal_ajustar_convite_base(%'
                   from pg_proc p
                  where p.oid = to_regprocedure('public.portal_ajustar_convite(uuid, text, text, text, text, text, text, text, text, text, text)')), false)
       and not has_function_privilege('anon', 'public.portal_ajustar_convite(uuid, text, text, text, text, text, text, text, text, text, text)', 'execute')
union all
select 'álbum, músicas e recados: escrita só com escrever',
       not exists (select 1 from pg_policies
                    where schemaname = 'public'
                      and tablename in ('evento_album_foto', 'evento_musica', 'evento_recado')
                      and cmd <> 'SELECT'
                      and (coalesce(qual, '') ~ 'eventos_da_cliente\(\)'
                           or coalesce(with_check, '') ~ 'eventos_da_cliente\(\)'))
       and (select count(*) = 3 from pg_policies
             where schemaname = 'public'
               and tablename in ('evento_album_foto', 'evento_musica', 'evento_recado')
               and policyname like '%\_write'
               and qual ~ 'escrever' and with_check ~ 'escrever')
union all
select 'os 27 embrulhos da 189 continuam embrulhos (nenhuma migração antiga por cima)',
       (select count(*) = 27
               and coalesce(bool_and(
                     r.emb is not null and r.base is not null
                     and position(r.nome || '_base(' in p.prosrc) > 0
                     and p.prosrc like '%portal_pode%'
                     and has_function_privilege('authenticated', r.emb::oid, 'execute')
                     and not has_function_privilege('anon', r.emb::oid, 'execute')
                     and not has_function_privilege('authenticated', r.base::oid, 'execute')
                     and not has_function_privilege('anon', r.base::oid, 'execute')), false)
          from (select v.nome,
                       to_regprocedure(format('public.%s(%s)', v.nome, v.args)) as emb,
                       to_regprocedure(format('public.%s_base(%s)', v.nome, v.args)) as base
                  from (values
                    ('portal_investimento', 'uuid'),
                    ('portal_prestacao_de_contas', 'uuid'),
                    ('portal_dinheiro', 'uuid'),
                    ('portal_marcar_pago', 'uuid, date, text, text'),
                    ('portal_desfazer_pago', 'uuid'),
                    ('portal_enviar_gasto', 'uuid'),
                    ('portal_fornecedores_contratados', 'uuid'),
                    ('portal_linha_do_tempo', 'uuid'),
                    ('portal_salao', 'uuid'),
                    ('portal_fornecedores_da_festa', 'uuid'),
                    ('portal_definir_rsvp_aberto', 'uuid, boolean'),
                    ('portal_definir_lembrete', 'uuid, integer'),
                    ('portal_enviar_site_para_revisao', 'uuid'),
                    ('definir_slug_site', 'uuid, text'),
                    ('publicar_site', 'uuid, boolean'),
                    ('portal_salvar_site', 'uuid, text, text, text'),
                    ('portal_ajustar_convite', 'uuid, text, text, text, text, text, text, text, text, text, text'),
                    ('portal_definir_blocos', 'uuid, boolean, boolean, boolean'),
                    ('portal_salvar_estrutura_site', 'uuid, jsonb, jsonb'),
                    ('portal_paleta_salvar', 'uuid, jsonb, text'),
                    ('portal_escrever_campo', 'uuid, jsonb, timestamptz'),
                    ('portal_concluir_tarefa', 'uuid, boolean'),
                    ('sugerir_no_cronograma', 'uuid, text, uuid, time, text, text'),
                    ('portal_desfazer_escolha', 'uuid'),
                    ('responder_curadoria', 'uuid, uuid, text'),
                    ('aprovar_guia_estilo', 'uuid'),
                    ('pedir_ajuste_guia', 'uuid, text')
                  ) v(nome, args)) r
          left join pg_proc p on p.oid = r.emb)
union all
select 'os helpers de storage continuam com o nível',
       (select count(*) = 3 and coalesce(bool_and(p.prosrc like '%familia_pode%'), false)
          from pg_proc p
         where p.oid in (to_regprocedure('public.pode_subir_imagem_evento(text)'),
                         to_regprocedure('public.pode_mexer_album(text)'),
                         to_regprocedure('public.pode_usar_comprovante_familia(text)')));