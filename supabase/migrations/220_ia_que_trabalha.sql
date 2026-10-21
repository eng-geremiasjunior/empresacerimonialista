-- ============================================================
-- 220 — IA que trabalha: o interruptor, a cota e os trabalhos (21/10/2026)
-- ============================================================
-- Fase 0 do plano "IA que trabalha". Três peças:
--
-- 1. ia_ajustes (uma linha): o interruptor geral, a liberação e as cotas
--    por plano. Pedido dele: enquanto ele testa, os trabalhos novos só
--    aparecem nas contas da casa; quando der o OK, liga "para todos" no
--    /admin/ajustes, sem deploy. Só a chave de serviço lê e grava.
--
-- 2. ia_consumo + ia_reservar / ia_devolver: a cota do mês contada no
--    banco, de forma atômica. A rota reserva ANTES de chamar o modelo (a
--    reserva só passa se couber no limite) e devolve se o provedor
--    falhar. Revisada por 2 céticos em 21/10/2026. Duas abas ao mesmo tempo não passam da cota. O limite vem do
--    servidor (plano + ia_ajustes); o banco só garante a soma.
--
-- 3. ia_trabalho: cada trabalho (montar o roteiro, preparar a semana…)
--    com as etapas, o pacote que ela confere e o resultado do que foi
--    gravado — é o que permite desfazer por 24 h. A equipe só LÊ; quem
--    grava é o servidor, depois de conferir cargo e evento. O texto de entrada é
--    apagado quando o trabalho termina (confirmado, descartado, desfeito
--    ou falhou): o banco não guarda o cronograma colado nem a transcrição.
--
-- Desde 30/10/2026 o Supabase não dá acesso da API a tabela nova sozinho:
-- cada tabela leva o GRANT explícito aqui, e a conferência confere.
--
-- Rodar inteiro no SQL Editor. Pode rodar de novo. Conferência no fim.

begin;

-- ------------------------------------------------------------
-- 1) ia_ajustes — uma linha só
-- ------------------------------------------------------------
create table if not exists public.ia_ajustes (
  id                      smallint primary key default 1,
  ligada                  boolean not null default true,
  para_todos              boolean not null default false,
  cota_essencial          int not null default 150,
  cota_profissional       int not null default 400,
  cota_master             int not null default 1500,
  audio_min_essencial     int not null default 60,
  audio_min_profissional  int not null default 180,
  audio_min_master        int not null default 600,
  atualizado_em           timestamptz not null default now(),
  atualizado_por          uuid references auth.users (id) on delete set null
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ia_ajustes_uma_linha') then
    alter table public.ia_ajustes add constraint ia_ajustes_uma_linha check (id = 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ia_ajustes_cotas_validas') then
    alter table public.ia_ajustes add constraint ia_ajustes_cotas_validas check (
      cota_essencial between 0 and 100000 and cota_profissional between 0 and 100000
      and cota_master between 0 and 100000
      and audio_min_essencial between 0 and 100000 and audio_min_profissional between 0 and 100000
      and audio_min_master between 0 and 100000
    );
  end if;
end $$;

insert into public.ia_ajustes (id) values (1) on conflict (id) do nothing;

alter table public.ia_ajustes enable row level security;
revoke all on public.ia_ajustes from anon, authenticated;
grant select, insert, update on public.ia_ajustes to service_role;

-- ------------------------------------------------------------
-- 2) ia_consumo — o que cada empresa gastou no mês (horário de Brasília)
-- ------------------------------------------------------------
create table if not exists public.ia_consumo (
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  mes         date not null,
  acoes       int not null default 0 check (acoes >= 0),
  audio_seg   int not null default 0 check (audio_seg >= 0),
  primary key (empresa_id, mes)
);

alter table public.ia_consumo enable row level security;
revoke all on public.ia_consumo from anon, authenticated;
grant select, insert, update on public.ia_consumo to service_role;

-- Reserva atômica: soma só se couber no limite. Devolve o MÊS em que
-- reservou (null = não coube). A devolução recebe esse mês: uma reserva
-- às 23:59 do dia 31 devolvida depois da meia-noite volta ao mês certo.
-- A trava da linha (on conflict do update) serializa duas reservas.
-- (Revisão dos céticos, 21/10: limite nulo não passa; mês carregado.)
drop function if exists public.ia_reservar(uuid, int, int, int, int);
create function public.ia_reservar(
  p_empresa_id   uuid,
  p_acoes        int,
  p_audio_seg    int,
  p_limite_acoes int,
  p_limite_audio int
) returns date
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mes date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
  v_ok  boolean;
begin
  if p_empresa_id is null or p_acoes is null or p_audio_seg is null
     or p_limite_acoes is null or p_limite_audio is null
     or p_acoes < 0 or p_audio_seg < 0 then
    return null;
  end if;
  if p_acoes > p_limite_acoes or p_audio_seg > p_limite_audio * 60 then
    return null;
  end if;

  insert into public.ia_consumo as c (empresa_id, mes, acoes, audio_seg)
  values (p_empresa_id, v_mes, p_acoes, p_audio_seg)
  on conflict (empresa_id, mes) do update
    set acoes = c.acoes + excluded.acoes,
        audio_seg = c.audio_seg + excluded.audio_seg
    where c.acoes + excluded.acoes <= p_limite_acoes
      and c.audio_seg + excluded.audio_seg <= p_limite_audio * 60
  returning true into v_ok;

  return case when v_ok then v_mes else null end;
end;
$$;

-- Devolve o que foi reservado e não chegou a ser usado (o provedor falhou).
drop function if exists public.ia_devolver(uuid, int, int);
drop function if exists public.ia_devolver(uuid, date, int, int);
create function public.ia_devolver(
  p_empresa_id uuid,
  p_mes        date,
  p_acoes      int,
  p_audio_seg  int
) returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.ia_consumo
     set acoes = greatest(0, acoes - greatest(0, coalesce(p_acoes, 0))),
         audio_seg = greatest(0, audio_seg - greatest(0, coalesce(p_audio_seg, 0)))
   where empresa_id = p_empresa_id
     and mes = p_mes;
$$;

revoke all on function public.ia_reservar(uuid, int, int, int, int) from public, anon, authenticated;
revoke all on function public.ia_devolver(uuid, date, int, int) from public, anon, authenticated;
grant execute on function public.ia_reservar(uuid, int, int, int, int) to service_role;
grant execute on function public.ia_devolver(uuid, date, int, int) to service_role;

-- ------------------------------------------------------------
-- 3) ia_trabalho — cada trabalho, do pedido ao desfazer
-- ------------------------------------------------------------
create table if not exists public.ia_trabalho (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  event_id        uuid references public.events (id) on delete cascade,
  tipo            text not null,
  estado          text not null default 'correndo',
  entrada         jsonb not null default '{}'::jsonb,
  etapas          jsonb not null default '[]'::jsonb,
  pacote          jsonb,
  resultado       jsonb,
  erro            text,
  criado_por      uuid references auth.users (id) on delete set null default auth.uid(),
  confirmado_por  uuid references auth.users (id) on delete set null,
  confirmado_em   timestamptz,
  desfeito_em     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ia_trabalho_tipo_check') then
    alter table public.ia_trabalho add constraint ia_trabalho_tipo_check
      check (tipo ~ '^[a-z_]{2,40}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ia_trabalho_estado_check') then
    alter table public.ia_trabalho add constraint ia_trabalho_estado_check
      check (estado in ('correndo', 'pronto', 'confirmado', 'desfeito', 'descartado', 'falhou'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ia_trabalho_tamanhos_check') then
    alter table public.ia_trabalho add constraint ia_trabalho_tamanhos_check check (
      pg_column_size(entrada) <= 400000
      and pg_column_size(etapas) <= 400000
      and (pacote is null or pg_column_size(pacote) <= 400000)
      and (resultado is null or pg_column_size(resultado) <= 200000)
      and (erro is null or char_length(erro) <= 300)
    );
  end if;
end $$;

create index if not exists idx_ia_trabalho_empresa on public.ia_trabalho (empresa_id, created_at desc);
create index if not exists idx_ia_trabalho_evento on public.ia_trabalho (event_id, created_at desc);

-- Quem grava é o servidor, com a chave de serviço, depois de conferir o
-- cargo e o evento; ele manda a empresa e quem pediu. (Revisão dos
-- céticos, 21/10: se a sessão gravasse, dava para forjar o "resultado"
-- com ids de outra empresa e o desfazer apagaria o que não é dela.)
drop trigger if exists trg_fill_empresa on public.ia_trabalho;
drop trigger if exists trg_touch on public.ia_trabalho;
create trigger trg_touch before update on public.ia_trabalho
  for each row execute function public.set_updated_at();

-- O texto de entrada não fica: some quando o trabalho termina.
create or replace function public.ia_trabalho_apaga_entrada()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.estado in ('confirmado', 'descartado', 'desfeito', 'falhou') then
    new.entrada := '{}'::jsonb;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_apaga_entrada on public.ia_trabalho;
create trigger trg_apaga_entrada before insert or update on public.ia_trabalho
  for each row execute function public.ia_trabalho_apaga_entrada();

alter table public.ia_trabalho enable row level security;
revoke all on public.ia_trabalho from anon, authenticated;
grant select on public.ia_trabalho to authenticated;
grant select, insert, update, delete on public.ia_trabalho to service_role;

-- A sessão só LÊ: quem pediu, e a dona e a coordenadora, e só de evento
-- que ainda pode ver. Gravar, confirmar e desfazer passam pelo servidor.
drop policy if exists "ia_trabalho_insert" on public.ia_trabalho;
drop policy if exists "ia_trabalho_update" on public.ia_trabalho;
drop policy if exists "ia_trabalho_select" on public.ia_trabalho;
create policy "ia_trabalho_select" on public.ia_trabalho for select to authenticated using (
  empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  and (
    criado_por = auth.uid()
    or (select mc.cargo from public.meu_cargo() mc) in ('proprietaria', 'coordenadora')
  )
  and (event_id is null or public.pode_ver_evento(event_id))
);

-- A limpeza diária (chamada pelo /api/cron/diario): nenhum texto fica
-- parado. Trabalho que ficou "correndo" mais de 1 h (a função caiu no
-- meio) vira "falhou"; "pronto" que ninguém conferiu em 7 dias vira
-- "descartado" — o gatilho apaga a entrada. Depois de 30 dias de
-- terminado, o pacote e as etapas (que podem repetir trechos do texto)
-- também saem; o resultado (só ids) fica para medir.
create or replace function public.ia_limpar_trabalhos()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.ia_trabalho set estado = 'falhou', erro = 'tempo esgotado'
   where estado = 'correndo' and updated_at < now() - interval '1 hour';
  update public.ia_trabalho set estado = 'descartado'
   where estado = 'pronto' and updated_at < now() - interval '7 days';
  update public.ia_trabalho set pacote = null, etapas = '[]'::jsonb
   where estado in ('confirmado', 'descartado', 'desfeito', 'falhou')
     and updated_at < now() - interval '30 days'
     and (pacote is not null or etapas <> '[]'::jsonb);
$$;

revoke all on function public.ia_limpar_trabalhos() from public, anon, authenticated;
grant execute on function public.ia_limpar_trabalhos() to service_role;

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'ia_ajustes com uma linha' as item,
       (select count(*) = 1 from public.ia_ajustes) as ok
union all
select 'RLS ligada nas três tabelas',
       (select bool_and(relrowsecurity) from pg_class
         where oid in ('public.ia_ajustes'::regclass, 'public.ia_consumo'::regclass, 'public.ia_trabalho'::regclass))
union all
select 'ajustes e consumo: só a chave de serviço',
       not has_table_privilege('anon', 'public.ia_ajustes', 'select')
       and not has_table_privilege('authenticated', 'public.ia_ajustes', 'select')
       and not has_table_privilege('authenticated', 'public.ia_ajustes', 'update')
       and not has_table_privilege('anon', 'public.ia_consumo', 'select')
       and not has_table_privilege('authenticated', 'public.ia_consumo', 'select')
       and not has_table_privilege('authenticated', 'public.ia_consumo', 'update')
       and has_table_privilege('service_role', 'public.ia_ajustes', 'update')
       and has_table_privilege('service_role', 'public.ia_consumo', 'update')
union all
select 'ia_trabalho: a equipe só lê (GRANT explícito), o anônimo nada',
       has_table_privilege('authenticated', 'public.ia_trabalho', 'select')
       and not has_table_privilege('authenticated', 'public.ia_trabalho', 'insert')
       and not has_table_privilege('authenticated', 'public.ia_trabalho', 'update')
       and not has_table_privilege('authenticated', 'public.ia_trabalho', 'delete')
       and not has_table_privilege('anon', 'public.ia_trabalho', 'select')
       and has_table_privilege('service_role', 'public.ia_trabalho', 'insert')
       and has_table_privilege('service_role', 'public.ia_trabalho', 'update')
union all
select 'ia_trabalho: uma regra de acesso (só leitura)',
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'ia_trabalho') = 1
       and (select bool_and(cmd = 'SELECT') from pg_policies where schemaname = 'public' and tablename = 'ia_trabalho')
union all
select 'reservar, devolver e limpar: só a chave de serviço',
       not has_function_privilege('anon', 'public.ia_reservar(uuid, int, int, int, int)', 'execute')
       and not has_function_privilege('authenticated', 'public.ia_reservar(uuid, int, int, int, int)', 'execute')
       and not has_function_privilege('anon', 'public.ia_devolver(uuid, date, int, int)', 'execute')
       and not has_function_privilege('authenticated', 'public.ia_devolver(uuid, date, int, int)', 'execute')
       and not has_function_privilege('authenticated', 'public.ia_limpar_trabalhos()', 'execute')
       and has_function_privilege('service_role', 'public.ia_reservar(uuid, int, int, int, int)', 'execute')
       and has_function_privilege('service_role', 'public.ia_devolver(uuid, date, int, int)', 'execute')
       and has_function_privilege('service_role', 'public.ia_limpar_trabalhos()', 'execute')
union all
select 'a entrada some quando o trabalho termina',
       exists (select 1 from pg_trigger where tgname = 'trg_apaga_entrada'
                  and tgrelid = 'public.ia_trabalho'::regclass)
union all
select 'reserva com limite nulo é recusada',
       public.ia_reservar('00000000-0000-0000-0000-000000000000'::uuid, 1, 0, null, null) is null;
