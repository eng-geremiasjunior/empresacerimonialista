-- ============================================================
-- 195 — O visitante do catálogo (02/10/2026)
-- ============================================================
-- Pedido do dono: um link para o Instagram em que qualquer pessoa entra
-- nos portais de exemplo (casamento, 15 anos…) e nos modelos de site,
-- sem cadastro. Quem entra é UM login compartilhado, o "visitante", com
-- um nível novo no evento de exemplo:
--
--   vitrine — VÊ tudo o que o casal vê (todas as áreas, inclusive
--             Financeiro e Documentos do exemplo, que são fictícios) e
--             NÃO GRAVA NADA.
--
-- Duas camadas, porque o login é compartilhado com a internet inteira:
--
--   1) a regra dos níveis (189): nivel_permite('vitrine', área) é true
--      para toda área, menos 'escrever' e 'aprovar'. Toda escrita da
--      família já pede 'escrever' (as 27 RPCs embrulhadas e as políticas
--      da 189/190) — o visitante cai no "sem permissão" de sempre;
--
--   2) uma trava GERAL no banco: um gatilho em todas as tabelas do
--      esquema public descarta (return null, sem erro) qualquer INSERT,
--      UPDATE ou DELETE feito por um login que tem acesso 'vitrine'. É
--      o que fecha o que a regra dos níveis não cobre — por exemplo
--      criar_conta_da_familia (187), que deixaria o visitante criar
--      contas e eventos. Descartar em vez de errar: a tela que grava
--      algo "de passagem" ao abrir (presença, visto, contadores) não
--      quebra para o visitante.
--
-- E o site público do evento de exemplo: recados e músicas que um
-- anônimo manda (deixar_recado / sugerir_musica, papel anon) são
-- descartados também. RSVP e álbum gravam pela chave de serviço; a
-- trava desses fica nas rotas (/api/rsvp e /api/album), que respondem
-- sem gravar e sem mandar e-mail.
--
-- "Evento de exemplo" = evento que tem um acesso 'vitrine' ativo
-- (eh_evento_vitrine). O app usa a mesma função para liberar a troca de
-- modelo no site público (?modelo=…) SÓ nesses eventos.
--
-- Aditiva e convergente: pode rodar de novo. Não muda o nível de
-- ninguém (hoje os 13 acessos são 'casal'). Tabela criada DEPOIS desta
-- migração fica só com a camada 1: rodar de novo a seção 4 depois de
-- criar tabela nova (o bloco é idempotente).
-- ============================================================

-- ------------------------------------------------------------
-- 1) O nível novo (superconjunto dos valores que existem)
-- ------------------------------------------------------------
alter table public.evento_acesso drop constraint if exists evento_acesso_nivel_check;
alter table public.evento_acesso
  add constraint evento_acesso_nivel_check
  check (nivel in ('casal', 'familia', 'aprova', 'leitura', 'padrinho', 'vitrine'));

-- ------------------------------------------------------------
-- 2) A regra (a da 189, com a linha do vitrine na frente)
-- ------------------------------------------------------------
create or replace function public.nivel_permite(p_nivel text, p_area text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when p_nivel = 'vitrine' then p_area not in ('escrever', 'aprovar')
    else case p_area
      when 'ver' then true
      when 'escrever' then p_nivel <> 'leitura'
      when 'aprovar' then p_nivel in ('casal', 'aprova')
      when 'convidados' then p_nivel in ('casal', 'familia', 'aprova', 'leitura')
      when 'fornecedores' then p_nivel in ('casal', 'familia', 'aprova', 'leitura')
      when 'presentes' then p_nivel in ('casal', 'familia', 'aprova', 'leitura')
      when 'lembretes' then p_nivel in ('casal', 'familia', 'aprova', 'leitura')
      when 'agenda' then p_nivel in ('casal', 'familia', 'aprova', 'leitura')
      else p_nivel = 'casal'
    end
  end;
$$;

revoke all on function public.nivel_permite(text, text) from public, anon;
grant execute on function public.nivel_permite(text, text) to authenticated;

-- ------------------------------------------------------------
-- 3) Quem é o visitante, e qual evento é de exemplo
-- ------------------------------------------------------------
create or replace function public.sou_login_vitrine()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and exists (
       select 1
         from public.evento_acesso ea
        where ea.user_id = auth.uid()
          and ea.nivel = 'vitrine'
          and ea.status = 'ativo'
     );
$$;

create or replace function public.eh_evento_vitrine(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.evento_acesso ea
     where ea.event_id = p_event_id
       and ea.nivel = 'vitrine'
       and ea.status = 'ativo'
  );
$$;

revoke all on function public.sou_login_vitrine() from public;
revoke all on function public.eh_evento_vitrine(uuid) from public;
grant execute on function public.sou_login_vitrine() to anon, authenticated;
grant execute on function public.eh_evento_vitrine(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) A trava geral: o login vitrine não grava em tabela nenhuma
-- ------------------------------------------------------------
create or replace function public.vitrine_nao_grava()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- descarta a linha sem erro (o gatilho só dispara quando
  -- sou_login_vitrine() é true: ver o WHEN de cada gatilho)
  return null;
end $$;

-- em toda tabela do esquema public que é nossa; o nome começa com "a0_"
-- para rodar ANTES dos outros gatilhos BEFORE (a ordem é alfabética)
do $$
declare
  t record;
begin
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p')
       and not c.relispartition
       and pg_get_userbyid(c.relowner) = current_user
  loop
    execute format('drop trigger if exists a0_vitrine_nao_grava on public.%I', t.relname);
    execute format(
      'create trigger a0_vitrine_nao_grava before insert or update or delete on public.%I '
      'for each row when (public.sou_login_vitrine()) execute function public.vitrine_nao_grava()',
      t.relname
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 5) O site público do exemplo: recado e música de anônimo não entram
-- ------------------------------------------------------------
create or replace function public.vitrine_sem_envio_publico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and public.eh_evento_vitrine(new.event_id) then
    return null;
  end if;
  return new;
end $$;

drop trigger if exists a1_vitrine_sem_envio_publico on public.evento_recado;
create trigger a1_vitrine_sem_envio_publico
  before insert on public.evento_recado
  for each row execute function public.vitrine_sem_envio_publico();

drop trigger if exists a1_vitrine_sem_envio_publico on public.evento_musica;
create trigger a1_vitrine_sem_envio_publico
  before insert on public.evento_musica
  for each row execute function public.vitrine_sem_envio_publico();

-- ------------------------------------------------------------
-- 6) Conferência (tudo true)
-- ------------------------------------------------------------
select 'vitrine vê o financeiro e a gestão' as verificacao,
       public.nivel_permite('vitrine', 'financeiro') and public.nivel_permite('vitrine', 'gestao')
         and public.nivel_permite('vitrine', 'ver') and public.nivel_permite('vitrine', 'saude') as ok
union all
select 'vitrine não escreve nem aprova',
       not public.nivel_permite('vitrine', 'escrever') and not public.nivel_permite('vitrine', 'aprovar')
union all
select 'os outros níveis continuam como na 189/190',
       not public.nivel_permite('leitura', 'escrever') and public.nivel_permite('casal', 'financeiro')
         and not public.nivel_permite('familia', 'financeiro') and not public.nivel_permite('padrinho', 'convidados')
         and public.nivel_permite('aprova', 'aprovar') and not public.nivel_permite('familia', 'area_que_nao_existe')
union all
select 'o CHECK aceita vitrine',
       pg_get_constraintdef((select oid from pg_constraint where conname = 'evento_acesso_nivel_check')) like '%vitrine%'
union all
select 'a trava está em toda tabela nossa do public',
       not exists (
         select 1
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relkind in ('r', 'p')
            and not c.relispartition
            and pg_get_userbyid(c.relowner) = current_user
            and not exists (select 1 from pg_trigger g where g.tgrelid = c.oid and g.tgname = 'a0_vitrine_nao_grava')
       )
union all
select 'a trava pegou as tabelas do portal',
       (select count(*) from pg_trigger g join pg_class c on c.oid = g.tgrelid
         where g.tgname = 'a0_vitrine_nao_grava'
           and c.relname in ('events', 'empresas', 'evento_acesso', 'evento_convidado', 'evento_inspiracao',
                             'evento_trilha', 'evento_cortejo_pessoa', 'evento_site', 'transactions')) = 9
union all
select 'recado e música do site de exemplo barrados',
       (select count(*) from pg_trigger where tgname = 'a1_vitrine_sem_envio_publico') = 2;
