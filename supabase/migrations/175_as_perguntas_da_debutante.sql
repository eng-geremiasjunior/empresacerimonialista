-- ============================================================
-- 175 — AS PERGUNTAS DA DEBUTANTE
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- Pedido do dono (25/09/2026): o portal da debutante, em
-- debut.eorganizei.com.br, onde a família organiza os 15 anos com a
-- cerimonialista. Medido antes de escrever: o método da debutante tem
-- 57 decisões, mas só 2 viram pergunta para a família no portal
-- (contra 39 no casamento). O resto a cerimonialista digita à mão.
--
-- Por que uma tabela NOVA, e não mais linhas na curadoria da 146:
-- metodo_pergunta_curada é chaveada só pelo código do CAMPO. A
-- debutante tem dois campos "musica" (a da valsa e a do parabéns), cada
-- um pedindo uma pergunta diferente, e um "onde" que no casamento não
-- existe com esse sentido. Aqui a chave é decisão + campo — e o código
-- da decisão já é único por empresa (deb_*), então a marcação não vaza
-- para nenhum outro tipo de evento.
--
-- O que fica de FORA de propósito:
--   * príncipe, pares da valsa e homenageados das 15 velas — a família
--     lista essas pessoas no cortejo do portal, em ordem, com os papéis
--     da debutante. Perguntar também aqui faria ela escrever duas vezes;
--   * dinheiro, fornecedor e anexo (as travas de sempre do gatilho);
--   * o que é da cerimonialista (visita técnica, plano B, segurança).
--
-- Mesma doutrina da 146: a marcação mora numa TABELA lida por GATILHO,
-- então sobrevive a qualquer re-semeadura do método da debutante.

-- ------------------------------------------------------------------
-- 1) A curadoria por decisão
-- ------------------------------------------------------------------
create table if not exists public.metodo_pergunta_curada_decisao (
  decisao_codigo text not null,
  campo_codigo   text not null,
  label_portal   text not null,
  created_at     timestamptz not null default now(),
  primary key (decisao_codigo, campo_codigo)
);

comment on table public.metodo_pergunta_curada_decisao is
  'Pergunta ao cliente pela DECISÃO + campo (175). Vence a curadoria por código da 146 quando as duas casam. Lida só pelo gatilho trg_campo_curado.';

-- só o gatilho (security definer) lê; ninguém de fora precisa
alter table public.metodo_pergunta_curada_decisao enable row level security;

insert into public.metodo_pergunta_curada_decisao (decisao_codigo, campo_codigo, label_portal)
values
  -- a festa
  ('deb_tema',                 'tema',              'Qual é o tema da festa?'),
  ('deb_tema',                 'paleta_tema',       'Quais são as cores do tema?'),
  ('deb_convidados_numero',    'numero_convidados', 'Quantas pessoas vocês imaginam convidar?'),
  ('deb_drinks_jovem_definir', 'drinks_menu',       'Que drinks sem álcool não podem faltar?'),
  ('deb_lembrancinhas',        'lembrancinha',      'Qual lembrancinha vocês imaginam?'),
  -- a noite dela
  ('deb_entrada_roteiro',      'roteiro',           'Como a debutante quer entrar na festa?'),
  ('deb_transporte_debutante', 'transporte',        'Como a debutante vai chegar à festa?'),
  ('deb_valsa_musica',         'musica',            'Qual é a música da valsa?'),
  ('deb_parabens_musica',      'musica',            'Qual música vai tocar no parabéns?'),
  ('deb_homenagens',           'homenagens',        'Vai ter homenagem ou discurso? De quem?'),
  ('deb_vestido_valsa',        'onde',              'Onde vai ser feito o vestido da valsa?'),
  ('deb_retrospectiva',        'fotos_video',       'Onde estão as fotos da infância para o vídeo da retrospectiva?')
on conflict (decisao_codigo, campo_codigo)
  do update set label_portal = excluded.label_portal;

-- ------------------------------------------------------------------
-- 2) O gatilho passa a ler as duas curadorias
-- ------------------------------------------------------------------
-- Idêntico ao da 146, com uma consulta a mais ANTES da antiga: a
-- curadoria por decisão vence; sem ela, vale a por código, como sempre.
-- As travas não mudam.

create or replace function public.trg_campo_curado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label       text;
  v_resp        text;
  v_dec_codigo  text;
begin
  -- marcação explícita do seed (corporativo da 141, casal_historia da
  -- 144, cuidados da 146) manda: a curadoria só preenche o que veio
  -- em branco
  if coalesce(new.pergunta_cliente, false) then
    return new;
  end if;

  select d.responsavel, d.codigo into v_resp, v_dec_codigo
  from public.metodo_decisao d
  where d.id = new.decisao_id;

  -- 175: pela decisão + campo primeiro
  select label_portal into v_label
  from public.metodo_pergunta_curada_decisao
  where decisao_codigo = v_dec_codigo
    and campo_codigo = new.codigo;

  -- 146: pelo código do campo
  if v_label is null then
    select label_portal into v_label
    from public.metodo_pergunta_curada
    where codigo = new.codigo;
  end if;

  if v_label is null then
    return new;
  end if;

  -- só pergunta o que pertence a uma decisão do cliente
  if v_resp is null or v_resp not in ('noivos', 'ambos') then
    return new;
  end if;

  -- travas que valem para sempre: dinheiro, fornecedor e anexo nunca são
  -- pergunta; escala e cenario redistribuem o método inteiro (083);
  -- reserva_pct é a reserva para imprevistos, que o cliente não vê
  if new.tipo in ('moeda', 'fornecedor', 'anexo')
     or new.codigo in ('escala', 'cenario', 'reserva_pct', 'verba_total')
     or new.codigo like 'valor%'
     or new.codigo like 'orcamento%' then
    return new;
  end if;

  new.pergunta_cliente := true;
  new.label_portal     := coalesce(new.label_portal, v_label);
  return new;
end $$;

-- o gatilho da 146 continua apontando para a função (create or replace
-- não o derruba); recriado aqui só para a migração se bastar sozinha
drop trigger if exists trg_campo_curado on public.metodo_campo;
create trigger trg_campo_curado
  before insert on public.metodo_campo
  for each row execute function public.trg_campo_curado();

-- ------------------------------------------------------------------
-- 3) O que já existe — o modelo de todas as empresas
-- ------------------------------------------------------------------
update public.metodo_campo c
   set pergunta_cliente = true,
       label_portal     = coalesce(c.label_portal, p.label_portal)
  from public.metodo_pergunta_curada_decisao p,
       public.metodo_decisao d
 where d.id = c.decisao_id
   and d.codigo = p.decisao_codigo
   and c.codigo = p.campo_codigo
   and d.responsavel in ('noivos', 'ambos')
   and c.tipo not in ('moeda', 'fornecedor', 'anexo')
   and c.codigo not in ('escala', 'cenario', 'reserva_pct', 'verba_total')
   and c.codigo not like 'valor%'
   and c.codigo not like 'orcamento%'
   and not c.pergunta_cliente;

-- ------------------------------------------------------------------
-- 4) E nos eventos de debutante VIVOS
-- ------------------------------------------------------------------
-- Só os campos desta curadoria; evento encerrado não volta a perguntar.
update public.evento_campo_valor v
   set pergunta_cliente = true,
       label_portal     = coalesce(v.label_portal, c.label_portal)
  from public.metodo_campo c,
       public.metodo_decisao d,
       public.metodo_pergunta_curada_decisao p,
       public.events e
 where c.id = v.campo_template_id
   and d.id = c.decisao_id
   and d.codigo = p.decisao_codigo
   and c.codigo = p.campo_codigo
   and c.pergunta_cliente
   and e.id = v.event_id
   and e.status not in ('cancelado', 'concluido')
   and coalesce(e.archived, false) = false
   and not v.pergunta_cliente;

-- ------------------------------------------------------------------
-- 5) O termo do responsável (pedido do dono, 25/09/2026)
-- ------------------------------------------------------------------
-- A debutante tem 14 ou 15 anos. Num evento de debutante, quem abre e
-- administra o portal é o pai, a mãe ou o responsável legal: no primeiro
-- acesso ele confirma isso numa caixa, e a data fica gravada no acesso
-- dele. O acesso de papel "debutante" só navega depois que ALGUM
-- responsável daquele evento confirmou.
--
-- A cliente nunca escreve em evento_acesso (086): a confirmação passa
-- por uma função que só marca a PRÓPRIA linha, e só num evento de
-- debutante, e só quando o papel não é o da própria debutante.

alter table public.evento_acesso
  add column if not exists responsavel_confirmado_em timestamptz;

create or replace function public.portal_termo_responsavel(p_event_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_papel text;
  v_conf  timestamptz;
  v_tipo  text;
  v_algum boolean;
begin
  if auth.uid() is null then
    return null;
  end if;

  select a.papel, a.responsavel_confirmado_em into v_papel, v_conf
    from public.evento_acesso a
   where a.event_id = p_event_id
     and a.user_id = auth.uid()
     and a.status = 'ativo';
  if not found then
    return null;
  end if;

  select e.type::text into v_tipo from public.events e where e.id = p_event_id;
  if v_tipo is distinct from 'debutante' then
    return json_build_object('exige', false);
  end if;

  select exists (
    select 1 from public.evento_acesso x
     where x.event_id = p_event_id
       and x.status = 'ativo'
       and x.papel <> 'debutante'
       and x.responsavel_confirmado_em is not null
  ) into v_algum;

  return json_build_object(
    'exige', true,
    'eh_debutante', v_papel = 'debutante',
    'confirmou', v_conf is not null,
    'algum_responsavel_confirmou', v_algum
  );
end $$;

revoke all on function public.portal_termo_responsavel(uuid) from public, anon;
grant execute on function public.portal_termo_responsavel(uuid) to authenticated;

create or replace function public.portal_confirmar_responsavel(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.evento_acesso a
     set responsavel_confirmado_em = coalesce(a.responsavel_confirmado_em, now()),
         updated_at = now()
   where a.event_id = p_event_id
     and a.user_id = auth.uid()
     and a.status = 'ativo'
     and a.papel <> 'debutante'
     and exists (select 1 from public.events e
                  where e.id = a.event_id and e.type::text = 'debutante');
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

revoke all on function public.portal_confirmar_responsavel(uuid) from public, anon;
grant execute on function public.portal_confirmar_responsavel(uuid) to authenticated;

-- ------------------------------------------------------------------
-- 6) Conferência — tudo true
-- ------------------------------------------------------------------
select 'a curadoria por decisão tem as 12 perguntas da debutante' as item,
       (select count(*) = 12 from public.metodo_pergunta_curada_decisao
         where decisao_codigo like 'deb\_%') as ok
union all
select 'o gatilho lê a curadoria por decisão',
       pg_get_functiondef('public.trg_campo_curado()'::regprocedure)
         like '%metodo_pergunta_curada_decisao%'
union all
select 'o gatilho está no lugar',
       exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
               where c.relname = 'metodo_campo' and t.tgname = 'trg_campo_curado')
union all
select 'nenhum campo curado por decisão ficou sem virar pergunta no modelo',
       not exists (
         select 1
         from public.metodo_campo c
         join public.metodo_decisao d on d.id = c.decisao_id
         join public.metodo_pergunta_curada_decisao p
           on p.decisao_codigo = d.codigo and p.campo_codigo = c.codigo
         where d.responsavel in ('noivos', 'ambos')
           and c.tipo not in ('moeda', 'fornecedor', 'anexo')
           and not c.pergunta_cliente
       )
union all
select 'nenhuma pergunta ficou sem o texto na voz do cliente',
       not exists (
         select 1 from public.metodo_campo
         where pergunta_cliente and coalesce(label_portal, '') = ''
       )
union all
select 'dinheiro, fornecedor e anexo continuam fora do portal',
       not exists (
         select 1 from public.metodo_campo
         where pergunta_cliente
           and (tipo in ('moeda', 'fornecedor', 'anexo')
                or codigo in ('escala', 'cenario', 'reserva_pct', 'verba_total'))
       )
union all
select 'o acesso guarda a confirmação do responsável',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'evento_acesso'
                  and column_name = 'responsavel_confirmado_em')
union all
select 'anon não lê nem confirma o termo; authenticated sim',
       not has_function_privilege('anon', 'public.portal_termo_responsavel(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.portal_confirmar_responsavel(uuid)', 'execute')
       and has_function_privilege('authenticated', 'public.portal_termo_responsavel(uuid)', 'execute')
       and has_function_privilege('authenticated', 'public.portal_confirmar_responsavel(uuid)', 'execute')
union all
select 'a tabela nova tem RLS ligada e nenhuma policy (fechada por fora)',
       (select c.relrowsecurity from pg_class c
         where c.oid = 'public.metodo_pergunta_curada_decisao'::regclass)
       and not exists (select 1 from pg_policies
                        where schemaname = 'public'
                          and tablename = 'metodo_pergunta_curada_decisao');
