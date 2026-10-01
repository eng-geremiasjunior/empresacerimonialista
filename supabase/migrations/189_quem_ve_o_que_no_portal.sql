-- ============================================================
-- 189 — Quem vê o quê no portal (30/09/2026)
-- ============================================================
-- O portal dos noivos v4 (desenho do Claude Design) põe mais gente no
-- portal com PAPEL: o casal convida a mãe, o padrinho, alguém só para
-- ver, alguém que pode aprovar — e o menu e os atalhos somem conforme o
-- papel. O README pede a mesma regra no banco: a tela não é a fronteira
-- (quem abre o "inspecionar" chama a API direto).
--
-- O NÍVEL de cada acesso (evento_acesso.nivel):
--   casal    — vê e faz tudo (noiva e noivo). É o padrão: todo acesso
--              que já existe fica 'casal', e a debutante não muda nada;
--   familia  — mãe/pai: sem Financeiro, Documentos, Família e acessos,
--              Privacidade e ajustes do casal;
--   aprova   — como família, e aprova decisões;
--   leitura  — como família, e não escreve nada;
--   padrinho — só Visão geral, Linha do tempo, Músicas, Inspirações,
--              Roteiro e o que é de todos (guia, escolhas, convite,
--              cortejo, depois).
--
-- AS ÁREAS (nivel_permite):
--   ver          todos
--   escrever     todos menos 'leitura'
--   aprovar      casal e aprova
--   convidados, fornecedores, presentes, lembretes, agenda
--                casal, familia, aprova, leitura (padrinho não)
--   financeiro, documentos, acessos, privacidade, gestao
--                só casal
--   (área desconhecida: só casal — errar para o lado fechado)
--
-- COMO A REGRA ENTRA, sem reescrever o que já funciona:
--   · as POLÍTICAS de família trocam `eventos_da_cliente()` por
--     `eventos_da_cliente_na('<área>')` (e a escrita pede 'escrever');
--   · as RPCs do portal chamadas pelo nome ganham um EMBRULHO: a função
--     atual vira `<nome>_base` (sem grant para ninguém) e a nova, com o
--     mesmo nome e a mesma assinatura, confere a área e chama a base.
--     A partir daqui, mudar o que a RPC faz = mudar a `_base`;
--   · as funções de storage (chamadas pelas políticas dos baldes, que
--     guardam a função pelo identificador e não pelo nome) são
--     recriadas com a regra dentro.
-- A equipe continua como sempre: em todo lugar a condição da equipe
-- (pode_ver_evento / pode_editar_evento) vem ANTES da da família.
--
-- Aditiva e convergente. Termina com a conferência (tudo true).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) O nível do acesso
-- ------------------------------------------------------------
alter table public.evento_acesso
  add column if not exists nivel text not null default 'casal';

alter table public.evento_acesso drop constraint if exists evento_acesso_nivel_check;
alter table public.evento_acesso
  add constraint evento_acesso_nivel_check
  check (nivel in ('casal', 'familia', 'aprova', 'leitura', 'padrinho'));

-- ------------------------------------------------------------
-- 2) A regra, num lugar só
-- ------------------------------------------------------------
create or replace function public.nivel_permite(p_nivel text, p_area text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case p_area
    when 'ver' then true
    when 'escrever' then p_nivel <> 'leitura'
    when 'aprovar' then p_nivel in ('casal', 'aprova')
    when 'convidados' then p_nivel in ('casal', 'familia', 'aprova', 'leitura')
    when 'fornecedores' then p_nivel in ('casal', 'familia', 'aprova', 'leitura')
    when 'presentes' then p_nivel in ('casal', 'familia', 'aprova', 'leitura')
    when 'lembretes' then p_nivel in ('casal', 'familia', 'aprova', 'leitura')
    when 'agenda' then p_nivel in ('casal', 'familia', 'aprova', 'leitura')
    else p_nivel = 'casal'
  end;
$$;

-- os eventos em que quem chama tem acesso de família que permite a área
create or replace function public.eventos_da_cliente_na(p_area text)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ea.event_id
    from public.evento_acesso ea
   where ea.user_id is not null
     and ea.user_id = auth.uid()
     and ea.status = 'ativo'
     and public.nivel_permite(ea.nivel, p_area);
$$;

create or replace function public.familia_pode(p_event_id uuid, p_area text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.eventos_da_cliente_na(p_area) e where e = p_event_id);
$$;

-- leitura: equipe que vê o evento, a chave de serviço, ou a família com a área
create or replace function public.portal_pode(p_event_id uuid, p_area text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role'
      or public.pode_ver_evento(p_event_id)
      or public.familia_pode(p_event_id, p_area);
$$;

-- escrita: equipe que edita o evento, a chave de serviço, ou a família
-- com a área E podendo escrever
create or replace function public.portal_pode_fazer(p_event_id uuid, p_area text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role'
      or public.pode_editar_evento(p_event_id)
      or (public.familia_pode(p_event_id, p_area) and public.familia_pode(p_event_id, 'escrever'));
$$;

-- para as telas: o nível de quem está logado (null = não é da família)
create or replace function public.portal_meu_nivel(p_event_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ea.nivel
    from public.evento_acesso ea
   where ea.event_id = p_event_id
     and ea.user_id = auth.uid()
     and ea.status = 'ativo'
   limit 1;
$$;

revoke all on function public.nivel_permite(text, text) from public, anon;
revoke all on function public.eventos_da_cliente_na(text) from public, anon;
revoke all on function public.familia_pode(uuid, text) from public, anon;
revoke all on function public.portal_pode(uuid, text) from public, anon;
revoke all on function public.portal_pode_fazer(uuid, text) from public, anon;
revoke all on function public.portal_meu_nivel(uuid) from public, anon;
grant execute on function public.nivel_permite(text, text) to authenticated;
grant execute on function public.eventos_da_cliente_na(text) to authenticated;
grant execute on function public.familia_pode(uuid, text) to authenticated;
grant execute on function public.portal_pode(uuid, text) to authenticated;
grant execute on function public.portal_pode_fazer(uuid, text) to authenticated;
grant execute on function public.portal_meu_nivel(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3) As políticas de família, por área
-- ------------------------------------------------------------
-- convidados (padrinho não vê a lista: telefones e e-mails de convidado)
drop policy if exists "portal_convidado_select" on public.evento_convidado;
create policy "portal_convidado_select" on public.evento_convidado for select
  using (event_id in (select public.eventos_da_cliente_na('convidados')));
drop policy if exists "portal_convidado_insert" on public.evento_convidado;
create policy "portal_convidado_insert" on public.evento_convidado for insert
  with check (event_id in (select public.eventos_da_cliente_na('convidados'))
              and event_id in (select public.eventos_da_cliente_na('escrever')));
drop policy if exists "portal_convidado_update" on public.evento_convidado;
create policy "portal_convidado_update" on public.evento_convidado for update
  using (event_id in (select public.eventos_da_cliente_na('convidados'))
         and event_id in (select public.eventos_da_cliente_na('escrever')))
  with check (event_id in (select public.eventos_da_cliente_na('convidados'))
              and event_id in (select public.eventos_da_cliente_na('escrever')));
drop policy if exists "portal_convidado_delete" on public.evento_convidado;
create policy "portal_convidado_delete" on public.evento_convidado for delete
  using (event_id in (select public.eventos_da_cliente_na('convidados'))
         and event_id in (select public.eventos_da_cliente_na('escrever')));

drop policy if exists "acompanhante_select" on public.evento_acompanhante;
create policy "acompanhante_select" on public.evento_acompanhante for select
  using (event_id in (select public.eventos_visiveis())
         or event_id in (select public.eventos_da_cliente_na('convidados')));
drop policy if exists "acompanhante_write" on public.evento_acompanhante;
create policy "acompanhante_write" on public.evento_acompanhante for all
  using (public.pode_editar_evento(event_id)
         or (event_id in (select public.eventos_da_cliente_na('convidados'))
             and event_id in (select public.eventos_da_cliente_na('escrever'))))
  with check (public.pode_editar_evento(event_id)
              or (event_id in (select public.eventos_da_cliente_na('convidados'))
                  and event_id in (select public.eventos_da_cliente_na('escrever'))));

drop policy if exists "chegada_select" on public.evento_chegada;
create policy "chegada_select" on public.evento_chegada for select
  using (event_id in (select public.eventos_visiveis())
         or event_id in (select public.eventos_da_cliente_na('convidados')));

-- documentos (o contrato da cerimonialista: só o casal)
drop policy if exists "evento_documento_portal_le" on public.evento_documento;
create policy "evento_documento_portal_le" on public.evento_documento for select
  using (categoria = 'contrato_prestacao'
         and event_id in (select public.eventos_da_cliente_na('documentos')));

-- financeiro (o dinheiro da família: só o casal)
drop policy if exists "familia_gasto_so_da_familia" on public.familia_gasto;
create policy "familia_gasto_so_da_familia" on public.familia_gasto for all to authenticated
  using (event_id in (select public.eventos_da_cliente_na('financeiro')))
  with check (event_id in (select public.eventos_da_cliente_na('financeiro'))
              and event_id in (select public.eventos_da_cliente_na('escrever')));
drop policy if exists "familia_orcamento_so_da_familia" on public.familia_orcamento;
create policy "familia_orcamento_so_da_familia" on public.familia_orcamento for all to authenticated
  using (event_id in (select public.eventos_da_cliente_na('financeiro')))
  with check (event_id in (select public.eventos_da_cliente_na('financeiro'))
              and event_id in (select public.eventos_da_cliente_na('escrever')));
drop policy if exists "dinheiro_pedido_select" on public.dinheiro_pedido;
create policy "dinheiro_pedido_select" on public.dinheiro_pedido for select to authenticated
  using (public.pode_ver_evento(event_id)
         or event_id in (select public.eventos_da_cliente_na('financeiro')));
drop policy if exists "dinheiro_pedido_insert" on public.dinheiro_pedido;
create policy "dinheiro_pedido_insert" on public.dinheiro_pedido for insert to authenticated
  with check (event_id in (select public.eventos_da_cliente_na('financeiro'))
              and event_id in (select public.eventos_da_cliente_na('escrever')));
drop policy if exists "dinheiro_pedido_delete" on public.dinheiro_pedido;
create policy "dinheiro_pedido_delete" on public.dinheiro_pedido for delete to authenticated
  using (event_id in (select public.eventos_da_cliente_na('financeiro'))
         and event_id in (select public.eventos_da_cliente_na('escrever'))
         and estado = 'aguardando');

-- presentes (o recebedor da lista)
drop policy if exists "evento_recebedor_select" on public.evento_recebedor;
create policy "evento_recebedor_select" on public.evento_recebedor for select to authenticated
  using (public.pode_ver_evento(event_id)
         or event_id in (select public.eventos_da_cliente_na('presentes')));

-- fornecedores da família
drop policy if exists "familia_fornecedor_select" on public.familia_fornecedor;
create policy "familia_fornecedor_select" on public.familia_fornecedor for select to authenticated
  using (public.pode_ver_evento(event_id)
         or event_id in (select public.eventos_da_cliente_na('fornecedores')));
drop policy if exists "familia_fornecedor_escrita" on public.familia_fornecedor;
create policy "familia_fornecedor_escrita" on public.familia_fornecedor for all to authenticated
  using (event_id in (select public.eventos_da_cliente_na('fornecedores'))
         and event_id in (select public.eventos_da_cliente_na('escrever')))
  with check (event_id in (select public.eventos_da_cliente_na('fornecedores'))
              and event_id in (select public.eventos_da_cliente_na('escrever')));

-- o resto: todos veem; quem é 'leitura' não escreve
drop policy if exists "portal_cortejo_insert" on public.evento_cortejo_pessoa;
create policy "portal_cortejo_insert" on public.evento_cortejo_pessoa for insert
  with check (event_id in (select public.eventos_da_cliente_na('escrever')));
drop policy if exists "portal_cortejo_update" on public.evento_cortejo_pessoa;
create policy "portal_cortejo_update" on public.evento_cortejo_pessoa for update
  using (event_id in (select public.eventos_da_cliente_na('escrever')))
  with check (event_id in (select public.eventos_da_cliente_na('escrever')));
drop policy if exists "portal_cortejo_delete" on public.evento_cortejo_pessoa;
create policy "portal_cortejo_delete" on public.evento_cortejo_pessoa for delete
  using (event_id in (select public.eventos_da_cliente_na('escrever')));

drop policy if exists "portal_inspiracao_insert" on public.evento_inspiracao;
create policy "portal_inspiracao_insert" on public.evento_inspiracao for insert
  with check (event_id in (select public.eventos_da_cliente_na('escrever')));
drop policy if exists "portal_inspiracao_delete" on public.evento_inspiracao;
create policy "portal_inspiracao_delete" on public.evento_inspiracao for delete
  using (event_id in (select public.eventos_da_cliente_na('escrever')));

drop policy if exists "evento_portal_estilo_insert" on public.evento_portal_estilo;
create policy "evento_portal_estilo_insert" on public.evento_portal_estilo for insert
  with check (public.pode_editar_evento(event_id)
              or event_id in (select public.eventos_da_cliente_na('escrever')));
drop policy if exists "evento_portal_estilo_update" on public.evento_portal_estilo;
create policy "evento_portal_estilo_update" on public.evento_portal_estilo for update
  using (public.pode_editar_evento(event_id)
         or event_id in (select public.eventos_da_cliente_na('escrever')))
  with check (public.pode_editar_evento(event_id)
              or event_id in (select public.eventos_da_cliente_na('escrever')));

drop policy if exists "decisao_proposta_insert" on public.decisao_proposta;
create policy "decisao_proposta_insert" on public.decisao_proposta for insert
  with check (public.pode_editar_evento(event_id)
              or event_id in (select public.eventos_da_cliente_na('escrever')));
drop policy if exists "decisao_proposta_delete" on public.decisao_proposta;
create policy "decisao_proposta_delete" on public.decisao_proposta for delete
  using (public.pode_editar_evento(event_id)
         or (event_id in (select public.eventos_da_cliente_na('escrever'))
             and criado_por = auth.uid() and estado = 'aguardando'));

drop policy if exists "familia_tarefa_insert" on public.familia_tarefa;
create policy "familia_tarefa_insert" on public.familia_tarefa for insert to authenticated
  with check (event_id in (select public.eventos_da_cliente_na('escrever')));
drop policy if exists "familia_tarefa_update" on public.familia_tarefa;
create policy "familia_tarefa_update" on public.familia_tarefa for update to authenticated
  using (event_id in (select public.eventos_da_cliente_na('escrever')))
  with check (event_id in (select public.eventos_da_cliente_na('escrever')));
drop policy if exists "familia_tarefa_delete" on public.familia_tarefa;
create policy "familia_tarefa_delete" on public.familia_tarefa for delete to authenticated
  using (event_id in (select public.eventos_da_cliente_na('escrever')));

drop policy if exists "evento_trilha_escrita" on public.evento_trilha;
create policy "evento_trilha_escrita" on public.evento_trilha for all to authenticated
  using (public.pode_editar_evento(event_id)
         or event_id in (select public.eventos_da_cliente_na('escrever')))
  with check (public.pode_editar_evento(event_id)
              or event_id in (select public.eventos_da_cliente_na('escrever')));

-- ------------------------------------------------------------
-- 4) As funções de storage (as políticas dos baldes as chamam)
-- ------------------------------------------------------------
create or replace function public.pode_subir_imagem_evento(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pode_editar_evento(p_folder::uuid)
      or public.familia_pode(p_folder::uuid, 'escrever');
$$;

create or replace function public.pode_mexer_album(p_folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public.pode_editar_evento(p_folder::uuid)
      or public.familia_pode(p_folder::uuid, 'escrever');
exception when others then
  return false;
end $$;

create or replace function public.pode_usar_comprovante_familia(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pastas text[];
begin
  v_pastas := storage.foldername(p_name);
  return v_pastas[2] = 'familia'
     and public.familia_pode(v_pastas[1]::uuid, 'financeiro');
exception when others then
  return false;
end $$;

-- ------------------------------------------------------------
-- 5) As RPCs do portal: o embrulho
-- ------------------------------------------------------------
-- Renomeia a atual para <nome>_base (uma vez; rodar de novo não renomeia
-- de novo) e fecha a base para todo mundo: só o embrulho a chama.
create or replace function public._embrulhar(p_nome text, p_args text)
returns void
language plpgsql
as $$
begin
  if to_regprocedure(format('public.%s_base(%s)', p_nome, p_args)) is null
     and to_regprocedure(format('public.%s(%s)', p_nome, p_args)) is not null then
    execute format('alter function public.%s(%s) rename to %s_base', p_nome, p_args, p_nome);
  end if;
  execute format('revoke all on function public.%s_base(%s) from public, anon, authenticated', p_nome, p_args);
end $$;

-- 5a) financeiro
select public._embrulhar('portal_investimento', 'uuid');
create or replace function public.portal_investimento(p_event_id uuid)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.portal_pode(p_event_id, 'financeiro') then return null; end if;
  return public.portal_investimento_base(p_event_id);
end $$;

select public._embrulhar('portal_prestacao_de_contas', 'uuid');
create or replace function public.portal_prestacao_de_contas(p_event_id uuid)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.portal_pode(p_event_id, 'financeiro') then return null; end if;
  return public.portal_prestacao_de_contas_base(p_event_id);
end $$;

select public._embrulhar('portal_dinheiro', 'uuid');
create or replace function public.portal_dinheiro(p_event_id uuid)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.portal_pode(p_event_id, 'financeiro') then return null; end if;
  return public.portal_dinheiro_base(p_event_id);
end $$;

select public._embrulhar('portal_marcar_pago', 'uuid, date, text, text');
create or replace function public.portal_marcar_pago(
  p_transaction_id uuid, p_pago_em date default null,
  p_comprovante_path text default null, p_comprovante_nome text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_ev uuid;
begin
  select t.event_id into v_ev from public.transactions t where t.id = p_transaction_id;
  if v_ev is null or not public.portal_pode_fazer(v_ev, 'financeiro') then
    raise exception 'sem permissão';
  end if;
  return public.portal_marcar_pago_base(p_transaction_id, p_pago_em, p_comprovante_path, p_comprovante_nome);
end $$;

select public._embrulhar('portal_desfazer_pago', 'uuid');
create or replace function public.portal_desfazer_pago(p_transaction_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_ev uuid;
begin
  select t.event_id into v_ev from public.transactions t where t.id = p_transaction_id;
  if v_ev is null or not public.portal_pode_fazer(v_ev, 'financeiro') then
    raise exception 'sem permissão';
  end if;
  return public.portal_desfazer_pago_base(p_transaction_id);
end $$;

select public._embrulhar('portal_enviar_gasto', 'uuid');
create or replace function public.portal_enviar_gasto(p_gasto_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_ev uuid;
begin
  select g.event_id into v_ev from public.familia_gasto g where g.id = p_gasto_id;
  if v_ev is null or not public.portal_pode_fazer(v_ev, 'financeiro') then
    raise exception 'sem permissão';
  end if;
  return public.portal_enviar_gasto_base(p_gasto_id);
end $$;

-- 5b) valores escondidos de quem não é do financeiro
select public._embrulhar('portal_fornecedores_contratados', 'uuid');
create or replace function public.portal_fornecedores_contratados(p_event_id uuid)
returns table (supplier_id uuid, fornecedor text, categoria text, decidida_em timestamptz, valor numeric)
language sql stable security definer set search_path = public as $$
  select b.supplier_id, b.fornecedor, b.categoria, b.decidida_em,
         case when public.portal_pode(p_event_id, 'financeiro') then b.valor end
    from public.portal_fornecedores_contratados_base(p_event_id) b
   where public.portal_pode(p_event_id, 'fornecedores');
$$;

select public._embrulhar('portal_linha_do_tempo', 'uuid');
create or replace function public.portal_linha_do_tempo(p_event_id uuid)
returns table (tipo text, titulo text, detalhe text, valor numeric, quando timestamptz)
language sql stable security definer set search_path = public as $$
  select b.tipo, b.titulo, b.detalhe,
         case when public.portal_pode(p_event_id, 'financeiro') then b.valor end,
         b.quando
    from public.portal_linha_do_tempo_base(p_event_id) b;
$$;

-- 5c) convidados e fornecedores
select public._embrulhar('portal_salao', 'uuid');
create or replace function public.portal_salao(p_event_id uuid)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.portal_pode(p_event_id, 'convidados') then return null; end if;
  return public.portal_salao_base(p_event_id);
end $$;

select public._embrulhar('portal_fornecedores_da_festa', 'uuid');
create or replace function public.portal_fornecedores_da_festa(p_event_id uuid)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.portal_pode(p_event_id, 'fornecedores') then return null; end if;
  return public.portal_fornecedores_da_festa_base(p_event_id);
end $$;

-- 5d) ajustes que são do casal
select public._embrulhar('portal_definir_rsvp_aberto', 'uuid, boolean');
create or replace function public.portal_definir_rsvp_aberto(p_event_id uuid, p_aberto boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.portal_pode_fazer(p_event_id, 'gestao') then raise exception 'sem permissão'; end if;
  perform public.portal_definir_rsvp_aberto_base(p_event_id, p_aberto);
end $$;

select public._embrulhar('portal_definir_lembrete', 'uuid, integer');
create or replace function public.portal_definir_lembrete(p_event_id uuid, p_dias int)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.portal_pode_fazer(p_event_id, 'gestao') then raise exception 'sem permissão'; end if;
  perform public.portal_definir_lembrete_base(p_event_id, p_dias);
end $$;

select public._embrulhar('portal_enviar_site_para_revisao', 'uuid');
create or replace function public.portal_enviar_site_para_revisao(p_event_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.portal_pode_fazer(p_event_id, 'gestao') then raise exception 'sem permissão'; end if;
  perform public.portal_enviar_site_para_revisao_base(p_event_id);
end $$;

select public._embrulhar('definir_slug_site', 'uuid, text');
create or replace function public.definir_slug_site(p_event_id uuid, p_slug text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.portal_pode_fazer(p_event_id, 'gestao') then raise exception 'sem permissão'; end if;
  perform public.definir_slug_site_base(p_event_id, p_slug);
end $$;

select public._embrulhar('publicar_site', 'uuid, boolean');
create or replace function public.publicar_site(p_event_id uuid, p_publicado boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.portal_pode_fazer(p_event_id, 'gestao') then raise exception 'sem permissão'; end if;
  perform public.publicar_site_base(p_event_id, p_publicado);
end $$;

-- 5e) escrita de todos (menos 'leitura')
select public._embrulhar('portal_salvar_site', 'uuid, text, text, text');
create or replace function public.portal_salvar_site(p_event_id uuid, p_mensagem text, p_historia text, p_dress_code text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.portal_pode_fazer(p_event_id, 'escrever') then raise exception 'sem permissão'; end if;
  perform public.portal_salvar_site_base(p_event_id, p_mensagem, p_historia, p_dress_code);
end $$;

select public._embrulhar('portal_ajustar_convite', 'uuid, text, text, text, text, text, text, text, text, text, text');
create or replace function public.portal_ajustar_convite(
  p_event_id uuid, p_historia_titulo text, p_dress_code_titulo text, p_cor_acento text,
  p_cor_tinta text, p_cor_fundo text, p_presentes_texto text, p_pix_chave text,
  p_pix_titular text, p_presentes_link text, p_foto_casal_path text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.portal_pode_fazer(p_event_id, 'escrever') then raise exception 'sem permissão'; end if;
  perform public.portal_ajustar_convite_base(p_event_id, p_historia_titulo, p_dress_code_titulo,
    p_cor_acento, p_cor_tinta, p_cor_fundo, p_presentes_texto, p_pix_chave, p_pix_titular,
    p_presentes_link, p_foto_casal_path);
end $$;

select public._embrulhar('portal_definir_blocos', 'uuid, boolean, boolean, boolean');
create or replace function public.portal_definir_blocos(p_event_id uuid, p_album boolean, p_playlist boolean, p_recados boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.portal_pode_fazer(p_event_id, 'escrever') then raise exception 'sem permissão'; end if;
  perform public.portal_definir_blocos_base(p_event_id, p_album, p_playlist, p_recados);
end $$;

select public._embrulhar('portal_salvar_estrutura_site', 'uuid, jsonb, jsonb');
create or replace function public.portal_salvar_estrutura_site(p_event_id uuid, p_estrutura jsonb, p_tema jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.portal_pode_fazer(p_event_id, 'escrever') then raise exception 'sem permissão'; end if;
  perform public.portal_salvar_estrutura_site_base(p_event_id, p_estrutura, p_tema);
end $$;

select public._embrulhar('portal_paleta_salvar', 'uuid, jsonb, text');
create or replace function public.portal_paleta_salvar(p_event_id uuid, p_cores jsonb, p_sensacao text default null)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.portal_pode_fazer(p_event_id, 'escrever') then raise exception 'sem permissão'; end if;
  return public.portal_paleta_salvar_base(p_event_id, p_cores, p_sensacao);
end $$;

select public._embrulhar('portal_escrever_campo', 'uuid, jsonb, timestamptz');
create or replace function public.portal_escrever_campo(p_campo_id uuid, p_valor jsonb, p_updated_at_visto timestamptz default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_ev uuid;
begin
  select c.event_id into v_ev from public.evento_campo_valor c where c.id = p_campo_id;
  if v_ev is null or not public.portal_pode_fazer(v_ev, 'escrever') then raise exception 'sem permissão'; end if;
  return public.portal_escrever_campo_base(p_campo_id, p_valor, p_updated_at_visto);
end $$;

select public._embrulhar('portal_concluir_tarefa', 'uuid, boolean');
create or replace function public.portal_concluir_tarefa(p_task_id uuid, p_feita boolean)
returns json language plpgsql security definer set search_path = public as $$
declare v_ev uuid;
begin
  select t.event_id into v_ev from public.tasks t where t.id = p_task_id;
  if v_ev is null or not public.portal_pode_fazer(v_ev, 'escrever') then raise exception 'sem permissão'; end if;
  return public.portal_concluir_tarefa_base(p_task_id, p_feita);
end $$;

select public._embrulhar('sugerir_no_cronograma', 'uuid, text, uuid, time, text, text');
create or replace function public.sugerir_no_cronograma(
  p_event_id uuid, p_tipo text, p_item_id uuid default null, p_horario time default null,
  p_titulo text default null, p_mensagem text default null)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.portal_pode_fazer(p_event_id, 'escrever') then raise exception 'sem permissão'; end if;
  return public.sugerir_no_cronograma_base(p_event_id, p_tipo, p_item_id, p_horario, p_titulo, p_mensagem);
end $$;

-- 5f) aprovar (casal e quem 'aprova')
select public._embrulhar('portal_desfazer_escolha', 'uuid');
create or replace function public.portal_desfazer_escolha(p_curadoria_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_ev uuid;
begin
  select c.event_id into v_ev from public.decisao_curadoria c where c.id = p_curadoria_id;
  if v_ev is null or not public.portal_pode_fazer(v_ev, 'aprovar') then raise exception 'sem permissão'; end if;
  return public.portal_desfazer_escolha_base(p_curadoria_id);
end $$;

select public._embrulhar('responder_curadoria', 'uuid, uuid, text');
create or replace function public.responder_curadoria(p_curadoria_id uuid, p_opcao_id uuid default null, p_motivo text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_ev uuid;
begin
  select c.event_id into v_ev from public.decisao_curadoria c where c.id = p_curadoria_id;
  if v_ev is null or not public.portal_pode_fazer(v_ev, 'aprovar') then raise exception 'sem permissão'; end if;
  return public.responder_curadoria_base(p_curadoria_id, p_opcao_id, p_motivo);
end $$;

select public._embrulhar('aprovar_guia_estilo', 'uuid');
create or replace function public.aprovar_guia_estilo(p_guia_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_ev uuid;
begin
  select g.event_id into v_ev from public.evento_guia_estilo g where g.id = p_guia_id;
  if v_ev is null or not public.portal_pode_fazer(v_ev, 'aprovar') then raise exception 'sem permissão'; end if;
  return public.aprovar_guia_estilo_base(p_guia_id);
end $$;

select public._embrulhar('pedir_ajuste_guia', 'uuid, text');
create or replace function public.pedir_ajuste_guia(p_guia_id uuid, p_mensagem text)
returns json language plpgsql security definer set search_path = public as $$
declare v_ev uuid;
begin
  select g.event_id into v_ev from public.evento_guia_estilo g where g.id = p_guia_id;
  if v_ev is null or not public.portal_pode_fazer(v_ev, 'escrever') then raise exception 'sem permissão'; end if;
  return public.pedir_ajuste_guia_base(p_guia_id, p_mensagem);
end $$;

-- as funções embrulhadas voltam para quem as chamava
grant execute on function public.portal_investimento(uuid) to authenticated;
grant execute on function public.portal_prestacao_de_contas(uuid) to authenticated;
grant execute on function public.portal_dinheiro(uuid) to authenticated;
grant execute on function public.portal_marcar_pago(uuid, date, text, text) to authenticated;
grant execute on function public.portal_desfazer_pago(uuid) to authenticated;
grant execute on function public.portal_enviar_gasto(uuid) to authenticated;
grant execute on function public.portal_fornecedores_contratados(uuid) to authenticated;
grant execute on function public.portal_linha_do_tempo(uuid) to authenticated;
grant execute on function public.portal_salao(uuid) to authenticated;
grant execute on function public.portal_fornecedores_da_festa(uuid) to authenticated;
grant execute on function public.portal_definir_rsvp_aberto(uuid, boolean) to authenticated;
grant execute on function public.portal_definir_lembrete(uuid, integer) to authenticated;
grant execute on function public.portal_enviar_site_para_revisao(uuid) to authenticated;
grant execute on function public.definir_slug_site(uuid, text) to authenticated;
grant execute on function public.publicar_site(uuid, boolean) to authenticated;
grant execute on function public.portal_salvar_site(uuid, text, text, text) to authenticated;
grant execute on function public.portal_ajustar_convite(uuid, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.portal_definir_blocos(uuid, boolean, boolean, boolean) to authenticated;
grant execute on function public.portal_salvar_estrutura_site(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.portal_paleta_salvar(uuid, jsonb, text) to authenticated;
grant execute on function public.portal_escrever_campo(uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.portal_concluir_tarefa(uuid, boolean) to authenticated;
grant execute on function public.sugerir_no_cronograma(uuid, text, uuid, time, text, text) to authenticated;
grant execute on function public.portal_desfazer_escolha(uuid) to authenticated;
grant execute on function public.responder_curadoria(uuid, uuid, text) to authenticated;
grant execute on function public.aprovar_guia_estilo(uuid) to authenticated;
grant execute on function public.pedir_ajuste_guia(uuid, text) to authenticated;
revoke all on function public.portal_investimento(uuid) from public, anon;
revoke all on function public.portal_prestacao_de_contas(uuid) from public, anon;
revoke all on function public.portal_dinheiro(uuid) from public, anon;
revoke all on function public.portal_marcar_pago(uuid, date, text, text) from public, anon;
revoke all on function public.portal_desfazer_pago(uuid) from public, anon;
revoke all on function public.portal_enviar_gasto(uuid) from public, anon;
revoke all on function public.portal_fornecedores_contratados(uuid) from public, anon;
revoke all on function public.portal_linha_do_tempo(uuid) from public, anon;
revoke all on function public.portal_salao(uuid) from public, anon;
revoke all on function public.portal_fornecedores_da_festa(uuid) from public, anon;
revoke all on function public.portal_definir_rsvp_aberto(uuid, boolean) from public, anon;
revoke all on function public.portal_definir_lembrete(uuid, integer) from public, anon;
revoke all on function public.portal_enviar_site_para_revisao(uuid) from public, anon;
revoke all on function public.definir_slug_site(uuid, text) from public, anon;
revoke all on function public.publicar_site(uuid, boolean) from public, anon;
revoke all on function public.portal_salvar_site(uuid, text, text, text) from public, anon;
revoke all on function public.portal_ajustar_convite(uuid, text, text, text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.portal_definir_blocos(uuid, boolean, boolean, boolean) from public, anon;
revoke all on function public.portal_salvar_estrutura_site(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.portal_paleta_salvar(uuid, jsonb, text) from public, anon;
revoke all on function public.portal_escrever_campo(uuid, jsonb, timestamptz) from public, anon;
revoke all on function public.portal_concluir_tarefa(uuid, boolean) from public, anon;
revoke all on function public.sugerir_no_cronograma(uuid, text, uuid, time, text, text) from public, anon;
revoke all on function public.portal_desfazer_escolha(uuid) from public, anon;
revoke all on function public.responder_curadoria(uuid, uuid, text) from public, anon;
revoke all on function public.aprovar_guia_estilo(uuid) from public, anon;
revoke all on function public.pedir_ajuste_guia(uuid, text) from public, anon;

drop function public._embrulhar(text, text);

-- ------------------------------------------------------------
-- 6) Família e acessos: o casal vê e ajusta quem entra
-- ------------------------------------------------------------
-- A lista das pessoas do evento (só o casal). Convidar alguém novo é do
-- servidor (cria o login pela Admin API) e passa por portal_pode_fazer.
create or replace function public.portal_pessoas_do_evento(p_event_id uuid)
returns table (id uuid, nome text, email text, papel text, nivel text, eu boolean)
language sql stable security definer set search_path = public as $$
  select a.id, a.nome, a.email, a.papel, a.nivel, a.user_id = auth.uid()
    from public.evento_acesso a
   where a.event_id = p_event_id
     and a.status = 'ativo'
     and public.familia_pode(p_event_id, 'acessos')
   order by (a.nivel = 'casal') desc, a.created_at;
$$;

-- trocar o nível de alguém ou tirar o acesso (nunca o próprio, nunca o
-- de outro 'casal': noiva e noivo não se tiram um ao outro)
create or replace function public.portal_ajustar_acesso(p_acesso_id uuid, p_nivel text default null, p_revogar boolean default false)
returns json language plpgsql security definer set search_path = public as $$
declare v_a public.evento_acesso%rowtype;
begin
  select * into v_a from public.evento_acesso where id = p_acesso_id for update;
  if not found or not public.familia_pode(v_a.event_id, 'acessos') then
    raise exception 'sem permissão';
  end if;
  if v_a.user_id = auth.uid() then
    raise exception 'acesso_proprio' using hint = 'Você não muda o próprio acesso por aqui.';
  end if;
  if v_a.nivel = 'casal' then
    raise exception 'acesso_do_casal' using hint = 'O acesso do casal não muda por aqui.';
  end if;
  if coalesce(p_revogar, false) then
    update public.evento_acesso set status = 'revogado', updated_at = now() where id = p_acesso_id;
    return json_build_object('ok', true, 'revogado', true);
  end if;
  if p_nivel is null or p_nivel not in ('familia', 'aprova', 'leitura', 'padrinho') then
    raise exception 'nivel_invalido';
  end if;
  update public.evento_acesso set nivel = p_nivel, updated_at = now() where id = p_acesso_id;
  return json_build_object('ok', true, 'nivel', p_nivel);
end $$;

revoke all on function public.portal_pessoas_do_evento(uuid) from public, anon;
revoke all on function public.portal_ajustar_acesso(uuid, text, boolean) from public, anon;
grant execute on function public.portal_pessoas_do_evento(uuid) to authenticated;
grant execute on function public.portal_ajustar_acesso(uuid, text, boolean) to authenticated;

commit;

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select 'todo acesso que já existia é do casal' as item,
       not exists (select 1 from public.evento_acesso where nivel <> 'casal') as ok
union all
select 'a regra: padrinho não vê convidados; família não vê financeiro; leitura não escreve',
       not public.nivel_permite('padrinho', 'convidados')
       and not public.nivel_permite('familia', 'financeiro')
       and not public.nivel_permite('leitura', 'escrever')
       and public.nivel_permite('aprova', 'aprovar')
       and not public.nivel_permite('familia', 'aprovar')
       and public.nivel_permite('casal', 'financeiro')
       -- área desconhecida: só o casal (que vê tudo); fechada para os outros
       and public.nivel_permite('casal', 'area_que_nao_existe')
       and not public.nivel_permite('familia', 'area_que_nao_existe')
       and not public.nivel_permite('padrinho', 'area_que_nao_existe')
union all
select 'as bases estão fechadas para a sessão',
       not has_function_privilege('authenticated', 'public.portal_investimento_base(uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.portal_dinheiro_base(uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.responder_curadoria_base(uuid, uuid, text)', 'execute')
       and not has_function_privilege('authenticated', 'public.publicar_site_base(uuid, boolean)', 'execute')
union all
select 'os embrulhos respondem pela sessão',
       has_function_privilege('authenticated', 'public.portal_investimento(uuid)', 'execute')
       and has_function_privilege('authenticated', 'public.responder_curadoria(uuid, uuid, text)', 'execute')
       and has_function_privilege('authenticated', 'public.portal_ajustar_convite(uuid, text, text, text, text, text, text, text, text, text, text)', 'execute')
union all
select 'anon não chama nada disto',
       not has_function_privilege('anon', 'public.portal_investimento(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.portal_pessoas_do_evento(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.portal_pode(uuid, text)', 'execute')
union all
select 'nenhuma política de família ainda usa eventos_da_cliente() puro nas áreas fechadas',
       not exists (select 1 from pg_policies
                    where schemaname = 'public'
                      and tablename in ('evento_convidado', 'evento_acompanhante', 'evento_chegada',
                                        'evento_documento', 'familia_gasto', 'familia_orcamento',
                                        'dinheiro_pedido', 'evento_recebedor', 'familia_fornecedor')
                      and (coalesce(qual, '') ~ 'eventos_da_cliente\(\)'
                           or coalesce(with_check, '') ~ 'eventos_da_cliente\(\)'))
union all
select 'o embrulhador temporário saiu',
       to_regprocedure('public._embrulhar(text, text)') is null;
