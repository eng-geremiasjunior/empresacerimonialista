-- 211: o método em núcleo e opcionais (16/10/2026)
--
-- Medido nas contas: em 18 de 23 casamentos ninguém mexeu no Planejamento,
-- e quem mexeu gastou o tempo marcando "não se aplica" (59 e 33 itens). O
-- dono aprovou (lista em .claude/plans/nucleo-e-opcionais.md):
--   - NÚCLEO: o que a cerimonialista conduz; nasce em todo evento;
--   - OPCIONAL: nasce desligado ("não se aplica"), ela liga com um clique;
--   - RELIGIOSO: igreja, reserva, curso de noivos, leituras e ensaio nascem
--     desligados e LIGAM SOZINHOS quando o Formato do casamento diz
--     cerimônia religiosa (ou cenário igreja);
--   - ETAPA: cotações, visitas e degustação viram etapas dentro da linha do
--     fornecedor (etapa_de = o código da linha principal); a tela agrupa.
--
-- Como, sem reaplicar semente nem tocar no modelo próprio:
--   o "opcional" é o fora_do_modelo da 170 — instanciar_metodo_evento já
--   faz o item nascer em "não se aplica", e "salvar como meu modelo" já
--   desliga a marca quando ela liga o item. A empresa que JÁ SALVOU um
--   modelo daquele tipo não é tocada: o fora_do_modelo dela é escolha dela.
--   Eventos que já existem não mudam (quem quiser enxuga pela triagem).
--
-- 97 códigos: 73 desligados (opcional ou religioso), 25 viram etapa.
-- Convergente: pode rodar de novo por cima.

-- ------------------------------------------------------------
-- 1) O papel de cada código do método
-- ------------------------------------------------------------
create table if not exists public.metodo_codigo_papel (
  tipo_evento text not null,
  codigo      text not null,
  papel       text not null,
  etapa_de    text,
  primary key (tipo_evento, codigo)
);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'metodo_codigo_papel_papel_check') then
    alter table public.metodo_codigo_papel
      add constraint metodo_codigo_papel_papel_check check (papel in ('nucleo', 'opcional', 'religioso'));
  end if;
end $$;
alter table public.metodo_codigo_papel enable row level security;
revoke all on public.metodo_codigo_papel from public, anon, authenticated;

insert into public.metodo_codigo_papel (tipo_evento, codigo, papel, etapa_de) values
  ('casamento', 'casal_historia', 'opcional', null),
  ('casamento', 'prioridades', 'opcional', null),
  ('casamento', 'cuidados_noivos', 'opcional', null),
  ('casamento', 'espaco_orcar', 'nucleo', 'espaco_contratar'),
  ('casamento', 'espaco_visitar', 'nucleo', 'espaco_contratar'),
  ('casamento', 'buffet_tipo_servico', 'nucleo', 'buffet_contratar'),
  ('casamento', 'buffet_orcar', 'nucleo', 'buffet_contratar'),
  ('casamento', 'buffet_degustar', 'nucleo', 'buffet_contratar'),
  ('casamento', 'drinks_contratar', 'opcional', null),
  ('casamento', 'bebidas_lista', 'opcional', null),
  ('casamento', 'igreja_escolher', 'religioso', null),
  ('casamento', 'igreja_reservar', 'religioso', 'igreja_escolher'),
  ('casamento', 'curso_noivos', 'religioso', null),
  ('casamento', 'leituras', 'religioso', null),
  ('casamento', 'ensaio_igreja', 'religioso', null),
  ('casamento', 'celebrante_orcar', 'nucleo', 'celebrante_contratar'),
  ('casamento', 'decoracao_orcar', 'nucleo', 'decoracao_contratar'),
  ('casamento', 'bouquet', 'opcional', null),
  ('casamento', 'foto_pesquisar', 'nucleo', 'foto_contratar'),
  ('casamento', 'foto_portfolio', 'nucleo', 'foto_contratar'),
  ('casamento', 'pre_wedding', 'opcional', null),
  ('casamento', 'musica_definir', 'nucleo', 'dj_contratar'),
  ('casamento', 'som_luz_contratar', 'opcional', null),
  ('casamento', 'atracoes_extras', 'opcional', null),
  ('casamento', 'vestido_modalidade', 'nucleo', 'vestido_escolher'),
  ('casamento', 'dia_noiva_contratar', 'opcional', null),
  ('casamento', 'sapatos', 'opcional', null),
  ('casamento', 'acessorios', 'opcional', null),
  ('casamento', 'teste_beleza', 'opcional', null),
  ('casamento', 'madrinhas', 'opcional', null),
  ('casamento', 'traje_noivo', 'opcional', null),
  ('casamento', 'daminhas', 'opcional', null),
  ('casamento', 'site_casamento', 'opcional', null),
  ('casamento', 'save_the_date', 'opcional', null),
  ('casamento', 'papelaria_pesquisar', 'nucleo', 'papelaria_contratar'),
  ('casamento', 'bem_casados_contratar', 'opcional', null),
  ('casamento', 'lembrancinhas', 'opcional', null),
  ('casamento', 'mesa_doces_responsavel', 'opcional', null),
  ('casamento', 'hotel_convidados', 'opcional', null),
  ('casamento', 'infra_extra_contratar', 'opcional', null),
  ('casamento', 'transporte_contratar', 'opcional', null),
  ('casamento', 'valet_contratar', 'opcional', null),
  ('casamento', 'mobiliario_locacao', 'opcional', null),
  ('casamento', 'ambulancia_contratar', 'opcional', null),
  ('casamento', 'recreacao_contratar', 'opcional', null),
  ('casamento', 'carro_noivos', 'opcional', null),
  ('casamento', 'regime_bens', 'opcional', null),
  ('casamento', 'docs_civil', 'opcional', null),
  ('casamento', 'cartorio', 'opcional', null),
  ('casamento', 'lua_mel_destino', 'opcional', null),
  ('casamento', 'lua_mel_reservas', 'opcional', null),
  ('casamento', 'lua_mel_docs', 'opcional', null),
  ('casamento', 'hotel_nupcias', 'opcional', null),
  ('casamento', 'noivado', 'opcional', null),
  ('casamento', 'cha', 'opcional', null),
  ('casamento', 'despedida', 'opcional', null),
  ('casamento', 'jantar_padrinhos', 'opcional', null),
  ('corporativo', 'corp_cenografia_contratar', 'opcional', null),
  ('corporativo', 'corp_materiais_definir', 'opcional', null),
  ('corporativo', 'corp_autoridades_definir', 'opcional', null),
  ('corporativo', 'corp_nominata', 'opcional', null),
  ('corporativo', 'corp_premiados_definir', 'opcional', null),
  ('corporativo', 'corp_trofeus_contratar', 'opcional', null),
  ('corporativo', 'corp_logistica_definir', 'opcional', null),
  ('debutante', 'deb_prioridades', 'opcional', null),
  ('debutante', 'deb_espaco_orcar', 'nucleo', 'deb_espaco_contratar'),
  ('debutante', 'deb_espaco_visitar', 'nucleo', 'deb_espaco_contratar'),
  ('debutante', 'deb_buffet_tipo_servico', 'nucleo', 'deb_buffet_contratar'),
  ('debutante', 'deb_buffet_orcar', 'nucleo', 'deb_buffet_contratar'),
  ('debutante', 'deb_buffet_degustar', 'nucleo', 'deb_buffet_contratar'),
  ('debutante', 'deb_drinks_jovem_definir', 'opcional', null),
  ('debutante', 'deb_decor_orcar', 'nucleo', 'deb_decor_contratar'),
  ('debutante', 'deb_painel_foto', 'opcional', null),
  ('debutante', 'deb_foto_orcar', 'nucleo', 'deb_foto_contratar'),
  ('debutante', 'deb_retrospectiva', 'opcional', null),
  ('debutante', 'deb_dj_orcar', 'nucleo', 'deb_dj_contratar'),
  ('debutante', 'deb_iluminacao_contratar', 'opcional', null),
  ('debutante', 'deb_atracoes_definir', 'opcional', null),
  ('debutante', 'deb_vestido_recepcao', 'opcional', null),
  ('debutante', 'deb_vestido_balada', 'opcional', null),
  ('debutante', 'deb_provas_finais', 'opcional', null),
  ('debutante', 'deb_beleza_teste', 'opcional', null),
  ('debutante', 'deb_book_contratar', 'opcional', null),
  ('debutante', 'deb_book_realizar', 'nucleo', 'deb_book_contratar'),
  ('debutante', 'deb_book_escolher', 'nucleo', 'deb_book_contratar'),
  ('debutante', 'deb_bolo_orcar', 'nucleo', 'deb_bolo_contratar'),
  ('debutante', 'deb_lembrancinhas', 'opcional', null),
  ('debutante', 'deb_identidade_tema', 'opcional', null),
  ('debutante', 'deb_seguranca_contratar', 'opcional', null),
  ('debutante', 'deb_plano_b_chuva', 'opcional', null),
  ('debutante', 'deb_transporte_debutante', 'opcional', null),
  ('formatura', 'form_fotos_convite', 'opcional', null),
  ('formatura', 'form_atracoes_definir', 'nucleo', 'form_atracoes_contratar'),
  ('formatura', 'form_telao_contratar', 'opcional', null),
  ('formatura', 'form_retrospectiva_turma', 'opcional', null),
  ('formatura', 'form_madrinha_anel', 'opcional', null),
  ('show', 'show_abertura_definir', 'opcional', null)
on conflict (tipo_evento, codigo) do update
  set papel = excluded.papel, etapa_de = excluded.etapa_de;

-- ------------------------------------------------------------
-- 2) A etapa no molde (a tela agrupa por ela)
-- ------------------------------------------------------------
alter table public.metodo_decisao add column if not exists etapa_de text;

update public.metodo_decisao md
   set etapa_de = p.etapa_de
  from public.metodo_objetivo mo, public.metodo_codigo_papel p
 where mo.id = md.objetivo_id
   and p.tipo_evento = mo.tipo_evento::text
   and p.codigo = md.codigo
   and not md.proprio
   and md.etapa_de is distinct from p.etapa_de;

-- ------------------------------------------------------------
-- 3) Opcional e religioso nascem desligados — só em quem não salvou modelo
-- ------------------------------------------------------------
update public.metodo_decisao md
   set fora_do_modelo = true
  from public.metodo_objetivo mo, public.metodo_codigo_papel p
 where mo.id = md.objetivo_id
   and p.tipo_evento = mo.tipo_evento::text
   and p.codigo = md.codigo
   and p.papel in ('opcional', 'religioso')
   and not md.proprio
   and not md.fora_do_modelo
   and not exists (
     select 1 from public.metodo_modelo_salvo s
      where s.empresa_id = md.empresa_id and s.tipo_evento::text = mo.tipo_evento::text);

-- ------------------------------------------------------------
-- 4) A semente reaplicada e a empresa nova já nascem com o papel
-- ------------------------------------------------------------
create or replace function public.trg_papel_do_metodo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text;
  v_papel text;
  v_etapa text;
begin
  if new.proprio then
    return new;
  end if;
  select mo.tipo_evento::text into v_tipo from public.metodo_objetivo mo where mo.id = new.objetivo_id;
  select p.papel, p.etapa_de into v_papel, v_etapa
    from public.metodo_codigo_papel p
   where p.tipo_evento = v_tipo and p.codigo = new.codigo;
  if v_papel is null then
    return new;
  end if;
  new.etapa_de := v_etapa;
  if v_papel in ('opcional', 'religioso') and not exists (
    select 1 from public.metodo_modelo_salvo s
     where s.empresa_id = new.empresa_id and s.tipo_evento::text = v_tipo) then
    new.fora_do_modelo := true;
  end if;
  return new;
end;
$$;
revoke all on function public.trg_papel_do_metodo() from public, anon, authenticated;

drop trigger if exists trg_papel_do_metodo on public.metodo_decisao;
create trigger trg_papel_do_metodo
  before insert on public.metodo_decisao
  for each row execute function public.trg_papel_do_metodo();

-- ------------------------------------------------------------
-- 5) Cerimônia religiosa liga os itens da igreja no evento
-- ------------------------------------------------------------
-- O Formato do casamento tem "tipo_cerimonia" (civil, religiosa,
-- simbolica, so_festa) e "cenario" (igreja, …). Religiosa ou igreja liga
-- o que nasceu desligado por esse motivo. Só liga — trocar para civil não
-- desliga nada que ela já esteja usando.
create or replace function public.trg_liga_cerimonia_religiosa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not ((new.codigo = 'tipo_cerimonia' and new.valor_opcao = 'religiosa')
       or (new.codigo = 'cenario' and new.valor_opcao = 'igreja')) then
    return new;
  end if;
  update public.evento_decisao ed
     set estado = 'pendente'
    from public.metodo_decisao md, public.metodo_objetivo mo, public.metodo_codigo_papel p
   where ed.event_id = new.event_id
     and ed.estado = 'nao_se_aplica'
     and md.id = ed.decisao_template_id
     and mo.id = md.objetivo_id
     and p.tipo_evento = mo.tipo_evento::text
     and p.codigo = md.codigo
     and p.papel = 'religioso';
  return new;
end;
$$;
revoke all on function public.trg_liga_cerimonia_religiosa() from public, anon, authenticated;

drop trigger if exists trg_liga_cerimonia_religiosa on public.evento_campo_valor;
create trigger trg_liga_cerimonia_religiosa
  after insert or update of valor_opcao on public.evento_campo_valor
  for each row execute function public.trg_liga_cerimonia_religiosa();

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select 'papel dos 97 códigos' as verificacao,
       (select count(*) from public.metodo_codigo_papel) = 97 as aplicou
union all
select 'molde tem etapa_de',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'metodo_decisao' and column_name = 'etapa_de')
union all
select 'opcionais desligados em quem não salvou modelo',
       not exists (
         select 1 from public.metodo_decisao md
           join public.metodo_objetivo mo on mo.id = md.objetivo_id
           join public.metodo_codigo_papel p on p.tipo_evento = mo.tipo_evento::text and p.codigo = md.codigo
          where p.papel in ('opcional', 'religioso') and not md.proprio and not md.fora_do_modelo
            and not exists (select 1 from public.metodo_modelo_salvo s
                             where s.empresa_id = md.empresa_id and s.tipo_evento::text = mo.tipo_evento::text))
union all
select 'etapas marcadas nos moldes',
       not exists (
         select 1 from public.metodo_decisao md
           join public.metodo_objetivo mo on mo.id = md.objetivo_id
           join public.metodo_codigo_papel p on p.tipo_evento = mo.tipo_evento::text and p.codigo = md.codigo
          where p.etapa_de is not null and not md.proprio and md.etapa_de is distinct from p.etapa_de)
union all
select 'gatilho da semente',
       exists (select 1 from pg_trigger where tgname = 'trg_papel_do_metodo'
                  and tgrelid = 'public.metodo_decisao'::regclass)
union all
select 'gatilho da cerimônia religiosa',
       exists (select 1 from pg_trigger where tgname = 'trg_liga_cerimonia_religiosa'
                  and tgrelid = 'public.evento_campo_valor'::regclass)
union all
select 'tabela de papéis fechada para a API',
       not has_table_privilege('anon', 'public.metodo_codigo_papel', 'select')
   and not has_table_privilege('authenticated', 'public.metodo_codigo_papel', 'select');
