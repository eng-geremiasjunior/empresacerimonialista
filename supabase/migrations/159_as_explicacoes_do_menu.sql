-- ============================================================
-- 159 — AS EXPLICAÇÕES DO MENU
-- ============================================================
--
-- O sistema abre com quinze itens no menu e nenhuma condução. Quem nunca
-- viu não tem como saber que "Solicitações" é a fila de cobrança do dia,
-- nem que "Catálogo" é o que alimenta a proposta. Cada item do menu ganha
-- um `?` que abre uma ficha curta: o que é, para que serve, como usar.
--
-- Esta migração guarda UMA COISA: se a pessoa quer continuar vendo essas
-- fichas. O texto delas vive no código (src/lib/explicacoes-do-menu.ts) —
-- é conteúdo editorial, muda com o produto, e não tem por que custar uma
-- migração a cada palavra trocada.
--
-- POR QUE EM `membros_equipe` E NÃO NA EMPRESA: cada pessoa chega num
-- momento. A proprietária que usa há seis meses desliga; a assistente que
-- entrou ontem precisa das fichas ligadas. Preferência de PESSOA, no
-- mesmo lugar e com a mesma forma do consentimento de WhatsApp (116).
--
-- POR QUE `default true`: o padrão tem de servir a quem não conhece. Quem
-- conhece desliga em um clique, dentro da própria ficha.

begin;

-- ------------------------------------------------------------
-- 1) A preferência, por pessoa
-- ------------------------------------------------------------

alter table public.membros_equipe
  add column if not exists explicacoes boolean not null default true;

comment on column public.membros_equipe.explicacoes is
  'A pessoa quer ver o "?" de explicacao ao lado dos itens do menu. '
  'Padrao true: o sistema abre conduzindo, e quem ja conhece desliga.';

-- ------------------------------------------------------------
-- 2) O interruptor
-- ------------------------------------------------------------
-- Escopo de UMA pessoa: as linhas de membro do próprio auth.uid(). Se ela
-- for membro de duas empresas, a escolha vale nas duas — é preferência
-- dela, não da conta.
--
-- SECURITY DEFINER porque a política de `membros_equipe` (021) deixa só a
-- dona da empresa escrever na tabela: sem isto, a assistente e a
-- cerimonialista não conseguiriam desligar as próprias explicações.
-- O `where user_id = auth.uid()` é o que mantém o escopo estreito — a
-- função não aceita alvo por argumento, então não há como pedir a
-- preferência de outra pessoa.

create or replace function public.definir_explicacoes(p_ativo boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ativo boolean := coalesce(p_ativo, true);
  v_tem   boolean;
begin
  if auth.uid() is null then
    raise exception 'Sessao expirada. Entre de novo.';
  end if;

  select exists (
           select 1
             from public.membros_equipe m
            where m.user_id = auth.uid()
              and m.status = 'ativo'
         )
    into v_tem;

  if not v_tem then
    raise exception 'Perfil nao encontrado.';
  end if;

  update public.membros_equipe m
     set explicacoes = v_ativo
   where m.user_id = auth.uid()
     and m.status = 'ativo';

  return v_ativo;
end $$;

revoke all on function public.definir_explicacoes(boolean) from public, anon;
grant execute on function public.definir_explicacoes(boolean) to authenticated;

-- ------------------------------------------------------------
-- 3) A leitura
-- ------------------------------------------------------------
-- Uma função só para ler evita que o app precise acrescentar a coluna ao
-- `select` de `getMeuCargo` — e esse detalhe não é estético: o PostgREST
-- derruba a CONSULTA INTEIRA quando um dos campos pedidos não existe. Se
-- o deploy chegar antes desta migração, um `select` ampliado deixaria
-- todo mundo sem cargo; uma função ausente falha sozinha, e o app assume
-- o padrão (ligado).

create or replace function public.minhas_explicacoes()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
           (select m.explicacoes
              from public.membros_equipe m
             where m.user_id = auth.uid()
               and m.status = 'ativo'
             order by m.created_at asc
             limit 1),
           true
         );
$$;

revoke all on function public.minhas_explicacoes() from public, anon;
grant execute on function public.minhas_explicacoes() to authenticated;

commit;

-- ============================================================
-- CONFERENCIA — cada linha deve devolver ok = true
-- ============================================================
-- Nada de `coalesce(..., true)` aqui: a conferencia existe para acusar o
-- que faltou, e um coalesce generoso transforma "nao achei" em "passou".

select 'coluna explicacoes existe' as verificacao,
       exists (
         select 1 from information_schema.columns
          where table_schema = 'public'
            and table_name = 'membros_equipe'
            and column_name = 'explicacoes'
       ) as ok

union all
select 'explicacoes e not null com default true',
       exists (
         select 1 from information_schema.columns
          where table_schema = 'public'
            and table_name = 'membros_equipe'
            and column_name = 'explicacoes'
            and is_nullable = 'NO'
            and column_default like '%true%'
       )

union all
select 'ninguem nasceu sem preferencia',
       not exists (
         select 1 from public.membros_equipe where explicacoes is null
       )

union all
select 'funcao definir_explicacoes existe',
       exists (
         select 1 from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'definir_explicacoes'
       )

union all
select 'funcao minhas_explicacoes existe',
       exists (
         select 1 from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'minhas_explicacoes'
       )

union all
-- As duas sao SECURITY DEFINER: sem isso, quem nao e dona da empresa nao
-- consegue mexer na propria preferencia (a policy de 021 e por empresa).
select 'as duas funcoes sao security definer',
       (
         select count(*) = 2
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.proname in ('definir_explicacoes', 'minhas_explicacoes')
            and p.prosecdef
       )

union all
-- anon nao pode executar nenhuma das duas: preferencia e de quem esta
-- logada, e `auth.uid()` nulo nao pode virar escrita em ninguem.
select 'anon nao executa',
       not exists (
         select 1
           from information_schema.routine_privileges
          where routine_schema = 'public'
            and routine_name in ('definir_explicacoes', 'minhas_explicacoes')
            and grantee = 'anon'
       );
