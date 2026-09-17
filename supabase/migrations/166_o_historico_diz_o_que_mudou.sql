-- ============================================================
-- 166 — O HISTÓRICO DO EVENTO DIZ O QUE MUDOU
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- Pedido do dono (16/09/2026): a aba Histórico do evento só dizia
-- "Evento atualizado", "Evento atualizado"... sem dizer o quê nem quem.
-- Havia 450 linhas assim, nenhuma com descrição. A causa era o gatilho da
-- 008: QUALQUER update em events virava uma linha, inclusive o que o
-- próprio sistema grava sozinho (a hora em que o lembrete saiu, a capa,
-- o arquivamento em lote).
--
-- Agora:
--   * só entra no histórico o que a equipe enxerga como mudança do evento
--     (nome, tipo, cliente, data, horário, local, espaço, convidados,
--     responsável, situação, porte, cenário, valores, confirmação de
--     presença, lembretes aos fornecedores, capa, arquivamento, porta);
--     carimbo do sistema e código de acesso não geram linha;
--   * a descrição diz o que mudou, uma linha por campo
--     ("Data: 10/10/2026 → 17/10/2026"). Valor do contrato e verba
--     aparecem sem o número: o histórico não é tela de dinheiro;
--   * a linha guarda quem fez (activities.autor): o nome de quem estava
--     logado, ou "Sistema" quando foi uma rotina;
--   * um erro aqui nunca impede salvar o evento: o gatilho engole a
--     exceção e só deixa de registrar.
--
-- POR QUE UM ARQUIVO NOVO, e não a 008 editada: a 008 não pode rodar de
-- novo. Ela cria a policy "activities_own" sem apagar antes, e a 024
-- trocou essa policy por outras três; rodar a 008 outra vez recriaria a
-- antiga, que deixa cada pessoa EDITAR o próprio histórico.
--
-- As 450 linhas antigas ficam no banco (nada é apagado); a tela é que
-- deixa de mostrá-las uma a uma.

begin;

alter table public.activities add column if not exists autor text;

comment on column public.activities.autor is
  'Quem fez: o nome de quem estava logado, ou Sistema quando foi uma rotina. Nulo nas linhas anteriores à 166.';

-- ------------------------------------------------------------
-- 1) O nome do tipo, para os dez tipos (a 008 só conhecia dois)
-- ------------------------------------------------------------
create or replace function public.rotulo_tipo_evento(p_type text)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_type
    when 'casamento'     then 'Casamento'
    when 'debutante'     then 'Debutante'
    when 'formatura'     then 'Formatura'
    when 'aniversario'   then 'Aniversário'
    when 'corporativo'   then 'Corporativo'
    when 'cha_revelacao' then 'Chá Revelação'
    when 'batizado'      then 'Batizado'
    when 'bodas'         then 'Bodas'
    when 'show'          then 'Show / Grande porte'
    when 'outro'         then 'Outro'
    else initcap(replace(coalesce(p_type, 'evento'), '_', ' '))
  end
$$;

revoke all on function public.rotulo_tipo_evento(text) from public, anon;
grant execute on function public.rotulo_tipo_evento(text) to authenticated, service_role;

-- O rótulo do feed ("Formatura — Ana"), agora com os dez tipos. O
-- CREATE OR REPLACE mantém os privilégios que a 117 deu.
create or replace function public.event_label(p_type text, p_client_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    public.rotulo_tipo_evento(p_type)
    || ' — '
    || coalesce(
      (select name from public.clients where id = p_client_id),
      'Sem cliente'
    )
$$;

-- ------------------------------------------------------------
-- 2) O gatilho: o que mudou, quando e quem
-- ------------------------------------------------------------
create or replace function public.log_event_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type   text;
  v_title  text;
  v_linhas text[] := '{}';
  v_autor  text;
  v_uid    uuid := auth.uid();
  v_de     text;
  v_para   text;
begin
  -- quem fez: sem sessão (rotina, chave de serviço) é o sistema
  if v_uid is null then
    v_autor := 'Sistema';
  else
    select nullif(btrim(m.nome), '') into v_autor
      from public.membros_equipe m
     where m.user_id = v_uid
     order by (m.empresa_id is not distinct from new.empresa_id) desc, m.created_at asc
     limit 1;
    v_autor := coalesce(v_autor, 'Equipe');
  end if;

  if tg_op = 'INSERT' then
    v_type := 'evento_criado';
    v_title := 'Novo evento criado';
  else
    -- uma linha por campo que a equipe enxerga
    if new.name is distinct from old.name then
      v_linhas := v_linhas || format('Nome: %s → %s',
        coalesce(nullif(btrim(old.name), ''), 'sem nome'),
        coalesce(nullif(btrim(new.name), ''), 'sem nome'));
    end if;

    if new.type is distinct from old.type then
      v_linhas := v_linhas || format('Tipo: %s → %s',
        public.rotulo_tipo_evento(old.type), public.rotulo_tipo_evento(new.type));
    end if;

    if new.client_id is distinct from old.client_id then
      v_linhas := v_linhas || format('Cliente: %s → %s',
        coalesce((select c.name from public.clients c where c.id = old.client_id), 'sem cliente'),
        coalesce((select c.name from public.clients c where c.id = new.client_id), 'sem cliente'));
    end if;

    if new.date is distinct from old.date then
      v_linhas := v_linhas || format('Data: %s → %s',
        coalesce(to_char(old.date, 'DD/MM/YYYY'), 'sem data'),
        coalesce(to_char(new.date, 'DD/MM/YYYY'), 'sem data'));
    end if;

    if new.time is distinct from old.time then
      -- time vira '19:30:00' em texto; os cinco primeiros são a hora
      v_linhas := v_linhas || format('Horário: %s → %s',
        coalesce(left(old.time::text, 5), 'sem horário'),
        coalesce(left(new.time::text, 5), 'sem horário'));
    end if;

    if new.location is distinct from old.location then
      v_linhas := v_linhas || format('Local: %s → %s',
        coalesce(nullif(btrim(old.location), ''), 'sem local'),
        coalesce(nullif(btrim(new.location), ''), 'sem local'));
    end if;

    if new.city is distinct from old.city then
      v_linhas := v_linhas || format('Cidade: %s → %s',
        coalesce(nullif(btrim(old.city), ''), 'sem cidade'),
        coalesce(nullif(btrim(new.city), ''), 'sem cidade'));
    end if;

    if new.espaco_id is distinct from old.espaco_id then
      v_linhas := v_linhas || format('Espaço: %s → %s',
        coalesce((select s.nome from public.espacos s where s.id = old.espaco_id), 'sem espaço'),
        coalesce((select s.nome from public.espacos s where s.id = new.espaco_id), 'sem espaço'));
    end if;

    if new.guests is distinct from old.guests then
      v_linhas := v_linhas || format('Convidados: %s → %s',
        coalesce(old.guests::text, 'não informado'), coalesce(new.guests::text, 'não informado'));
    end if;

    if new.guests_max is distinct from old.guests_max then
      v_linhas := v_linhas || format('Máximo de convidados: %s → %s',
        coalesce(old.guests_max::text, 'não informado'), coalesce(new.guests_max::text, 'não informado'));
    end if;

    if new.cerimonialista_responsavel_id is distinct from old.cerimonialista_responsavel_id then
      v_linhas := v_linhas || format('Responsável: %s → %s',
        coalesce((select nullif(btrim(m.nome), '') from public.membros_equipe m where m.id = old.cerimonialista_responsavel_id), 'ninguém'),
        coalesce((select nullif(btrim(m.nome), '') from public.membros_equipe m where m.id = new.cerimonialista_responsavel_id), 'ninguém'));
    end if;

    if new.status is distinct from old.status then
      if new.status = 'concluido' then
        v_type := 'evento_concluido';
        v_title := 'Evento concluído';
      elsif new.status = 'cancelado' then
        v_type := 'evento_cancelado';
        v_title := 'Evento cancelado';
      else
        v_linhas := v_linhas || format('Situação: %s → %s',
          case old.status when 'orcamento' then 'Orçamento' when 'confirmado' then 'Confirmado'
                          when 'concluido' then 'Concluído' when 'cancelado' then 'Cancelado'
                          else coalesce(old.status, '—') end,
          case new.status when 'orcamento' then 'Orçamento' when 'confirmado' then 'Confirmado'
                          else coalesce(new.status, '—') end);
      end if;
    end if;

    -- porte e cenário: o nome vem do método da empresa (083/141); sem ele,
    -- o código com espaço
    if new.escala is distinct from old.escala then
      select a.nome into v_de from public.metodo_arquetipo a
       where a.empresa_id = new.empresa_id and a.tipo_evento::text = old.type
         and a.eixo = 'escala' and a.codigo = old.escala limit 1;
      select a.nome into v_para from public.metodo_arquetipo a
       where a.empresa_id = new.empresa_id and a.tipo_evento::text = new.type
         and a.eixo = 'escala' and a.codigo = new.escala limit 1;
      v_linhas := v_linhas || format('Porte: %s → %s',
        coalesce(v_de, replace(old.escala, '_', ' '), 'não definido'),
        coalesce(v_para, replace(new.escala, '_', ' '), 'não definido'));
    end if;

    if new.cenario is distinct from old.cenario then
      v_de := null;
      v_para := null;
      select a.nome into v_de from public.metodo_arquetipo a
       where a.empresa_id = new.empresa_id and a.tipo_evento::text = old.type
         and a.eixo = 'cenario' and a.codigo = old.cenario limit 1;
      select a.nome into v_para from public.metodo_arquetipo a
       where a.empresa_id = new.empresa_id and a.tipo_evento::text = new.type
         and a.eixo = 'cenario' and a.codigo = new.cenario limit 1;
      v_linhas := v_linhas || format('Cenário: %s → %s',
        coalesce(v_de, replace(old.cenario, '_', ' '), 'não definido'),
        coalesce(v_para, replace(new.cenario, '_', ' '), 'não definido'));
    end if;

    -- dinheiro: diz que mudou, sem o número
    if new.contract_value is distinct from old.contract_value then
      v_linhas := v_linhas || 'Valor do contrato alterado'::text;
    end if;
    if new.verba_total is distinct from old.verba_total then
      v_linhas := v_linhas || 'Verba do evento alterada'::text;
    end if;

    if new.rsvp_aberto is distinct from old.rsvp_aberto then
      v_linhas := v_linhas || (case when coalesce(new.rsvp_aberto, false)
        then 'Confirmação de presença aberta' else 'Confirmação de presença encerrada' end);
    end if;
    if new.rsvp_lembrete_dias is distinct from old.rsvp_lembrete_dias then
      v_linhas := v_linhas || format('Lembrete da confirmação de presença: %s',
        coalesce(new.rsvp_lembrete_dias::text || ' dias antes', 'desligado'));
    end if;

    if new.confirmation_days_before is distinct from old.confirmation_days_before then
      v_linhas := v_linhas || format('Lembrete aos fornecedores: %s',
        coalesce(new.confirmation_days_before::text || ' dias antes', 'desligado'));
    end if;
    if new.whatsapp_auto is distinct from old.whatsapp_auto then
      v_linhas := v_linhas || (case when coalesce(new.whatsapp_auto, false)
        then 'Lembrete aos fornecedores por WhatsApp ligado' else 'Lembrete aos fornecedores por WhatsApp desligado' end);
    end if;
    if new.email_auto is distinct from old.email_auto then
      v_linhas := v_linhas || (case when coalesce(new.email_auto, false)
        then 'Lembrete aos fornecedores por e-mail ligado' else 'Lembrete aos fornecedores por e-mail desligado' end);
    end if;

    if new.cover_image_url is distinct from old.cover_image_url then
      v_linhas := v_linhas || (case when new.cover_image_url is null
        then 'Foto de capa removida' else 'Foto de capa trocada' end);
    end if;

    if new.porta_encerrada_em is distinct from old.porta_encerrada_em then
      v_linhas := v_linhas || (case when new.porta_encerrada_em is null
        then 'Porta do evento reaberta' else 'Porta do evento encerrada' end);
    end if;

    if new.evento_pai_id is distinct from old.evento_pai_id then
      v_linhas := v_linhas || 'Vínculo com outro evento alterado'::text;
    end if;

    if new.archived is distinct from old.archived then
      if coalesce(new.archived, false) then
        v_type := coalesce(v_type, 'evento_editado');
        v_title := coalesce(v_title, 'Evento arquivado');
      else
        v_linhas := v_linhas || 'Evento desarquivado'::text;
      end if;
    end if;

    if v_type is null then
      -- nada que a equipe enxergue mudou: sem linha no histórico
      if coalesce(array_length(v_linhas, 1), 0) = 0 then
        return new;
      end if;
      v_type := 'evento_editado';
      v_title := 'Evento atualizado';
    end if;
  end if;

  insert into public.activities
    (cerimonialista_id, category, type, title, description, event_id, event_name, autor)
  values
    (new.cerimonialista_id, 'eventos', v_type, v_title,
     nullif(array_to_string(v_linhas, E'\n'), ''),
     new.id, public.event_label(new.type, new.client_id), v_autor);

  return new;
exception
  when others then
    -- o histórico nunca impede salvar o evento
    raise warning 'log_event_activity: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists trg_log_event_insert on public.events;
create trigger trg_log_event_insert
  after insert on public.events
  for each row execute function public.log_event_activity();

drop trigger if exists trg_log_event_update on public.events;
create trigger trg_log_event_update
  after update on public.events
  for each row execute function public.log_event_activity();

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'activities tem a coluna autor' as item,
       exists (
         select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'activities'
            and column_name = 'autor'
       ) as ok

union all
select 'o gatilho novo descreve o que mudou e guarda o autor',
       exists (
         select 1 from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'log_event_activity'
            and p.prosrc ilike '%v_linhas%'
            and p.prosrc ilike '%autor%'
            and p.prosecdef
       )

union all
select 'os dois gatilhos de events existem',
       (
         select count(*) = 2 from pg_trigger t
          where t.tgrelid = 'public.events'::regclass
            and t.tgname in ('trg_log_event_insert', 'trg_log_event_update')
            and not t.tgisinternal
       )

union all
select 'event_label conhece os dez tipos',
       public.event_label('cha_revelacao', null) = 'Chá Revelação — Sem cliente'

union all
select 'anon nao executa rotulo_tipo_evento nem event_label',
       not has_function_privilege('anon', 'public.rotulo_tipo_evento(text)', 'execute')
       and not has_function_privilege('anon', 'public.event_label(text, uuid)', 'execute')

union all
-- a policy antiga da 008 continua fora (ver cabeçalho)
select 'a policy activities_own continua fora',
       not exists (
         select 1 from pg_policies
          where schemaname = 'public' and tablename = 'activities'
            and policyname = 'activities_own'
       );
