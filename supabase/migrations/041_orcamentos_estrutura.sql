-- ============================================================
-- Vela — Migração 041: Orçamentos — estrutura de dados (Etapa 1 de 6)
--
-- Orçamento/Cotação como entidade SEPARADA do Evento: nem toda cotação
-- vira evento. Fluxo completo (próximas etapas): montar orçamento com
-- itens (modelos reutilizáveis ou avulsos) → PDF com logo → link
-- público de aprovação → na aprovação, Evento criado automaticamente.
--
-- DECISÕES (lições das migrações 034–039, para não repetir os bugs):
--  * `criado_por` (auth.uid) em orcamentos + policy de SELECT que
--    reconhece a criadora — sem isso, INSERT ... RETURNING falha para
--    cerimonialista que cria sem se marcar responsável (o mesmo bug
--    que quebrou a criação de eventos).
--  * Policies só com subconsultas NÃO correlacionadas em meu_cargo()
--    (InitPlan: 1 avaliação por consulta, não por linha).
--  * hash_publico usa o MESMO padrão de supplier_confirmations
--    (gen_random_uuid duplo) — pgcrypto/gen_random_bytes nunca foi
--    usado neste banco; não introduzir dependência nova.
--  * data_validade como coluna gerada usa `data_criacao + validade_dias`
--    (date + int = date, imutável); a forma com ::interval do rascunho
--    produz timestamp e não é aceita como generated column.
--  * timestamptz (padrão do projeto), CHECKs explícitos, índices.
--
-- Execute no SQL Editor do Supabase (depois da 040).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Modelos de precificação (reutilizáveis por empresa)
-- ------------------------------------------------------------
create table if not exists public.modelos_precificacao (
  id                   uuid primary key default gen_random_uuid(),
  empresa_id           uuid not null references public.empresas (id) on delete cascade,
  nome                 text not null,
  tipo_calculo         text not null default 'fixo'
                       check (tipo_calculo in ('fixo', 'por_convidado')),
  valor_fixo           numeric,
  valor_por_convidado  numeric,
  taxa_fixa_adicional  numeric not null default 0,
  descricao            text,
  categoria            text,  -- mesmos slugs de Fornecedores, sem FK (listas independentes)
  ativo                boolean not null default true,
  created_at           timestamptz not null default now()
);

create index if not exists idx_modelos_precificacao_empresa
  on public.modelos_precificacao (empresa_id);

alter table public.modelos_precificacao enable row level security;

drop policy if exists "modelos_precificacao_empresa" on public.modelos_precificacao;
create policy "modelos_precificacao_empresa" on public.modelos_precificacao
  for all
  using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc))
  with check (empresa_id = (select mc.empresa_id from public.meu_cargo() mc));

-- ------------------------------------------------------------
-- 2) Orçamentos
-- ------------------------------------------------------------
create table if not exists public.orcamentos (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references public.empresas (id) on delete cascade,

  -- Contato do potencial cliente (ainda NÃO é um cadastro de Cliente)
  contato_nome       text not null,
  contato_telefone   text,
  contato_email      text,

  -- Evento potencial
  tipo_evento        text not null,
  data_evento        date,
  local_evento       text,
  cidade_evento      text,
  numero_convidados  int,

  -- Controle do orçamento
  data_criacao       date not null default current_date,
  validade_dias      int not null default 30
                     check (validade_dias in (7, 14, 30, 60, 90)),
  data_validade      date generated always as (data_criacao + validade_dias) stored,

  valor_total        numeric not null default 0,

  status             text not null default 'rascunho'
                     check (status in ('rascunho', 'enviado', 'aprovado', 'recusado', 'expirado')),

  hash_publico       text unique not null
                     default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),

  evento_gerado_id   uuid references public.events (id),

  cerimonialista_responsavel_id uuid references public.membros_equipe (id),

  -- Quem criou (para RETURNING e visibilidade da criadora — lição da 035)
  criado_por         uuid not null default auth.uid(),

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_orcamentos_empresa on public.orcamentos (empresa_id);
create index if not exists idx_orcamentos_status  on public.orcamentos (empresa_id, status);
create index if not exists idx_orcamentos_criado_por on public.orcamentos (criado_por);
create index if not exists idx_orcamentos_responsavel
  on public.orcamentos (cerimonialista_responsavel_id);

alter table public.orcamentos enable row level security;

-- Visibilidade: dona/coordenadora veem tudo da empresa; cerimonialista
-- vê os que criou ou pelos quais é responsável (mesmo padrão de events).
drop policy if exists "orcamentos_visibilidade" on public.orcamentos;
drop policy if exists "orcamentos_select" on public.orcamentos;
create policy "orcamentos_select" on public.orcamentos
  for select using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (
      (select mc.cargo from public.meu_cargo() mc)
        in ('proprietaria', 'coordenadora')
      or criado_por = (select auth.uid())
      or cerimonialista_responsavel_id =
         (select mc.membro_equipe_id from public.meu_cargo() mc)
    )
  );

drop policy if exists "orcamentos_criar" on public.orcamentos;
drop policy if exists "orcamentos_insert" on public.orcamentos;
create policy "orcamentos_insert" on public.orcamentos
  for insert with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc)
        in ('proprietaria', 'coordenadora', 'cerimonialista')
  );

drop policy if exists "orcamentos_editar" on public.orcamentos;
drop policy if exists "orcamentos_update" on public.orcamentos;
create policy "orcamentos_update" on public.orcamentos
  for update
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (
      (select mc.cargo from public.meu_cargo() mc)
        in ('proprietaria', 'coordenadora')
      or criado_por = (select auth.uid())
      or cerimonialista_responsavel_id =
         (select mc.membro_equipe_id from public.meu_cargo() mc)
    )
  )
  with check (empresa_id = (select mc.empresa_id from public.meu_cargo() mc));

drop policy if exists "orcamentos_delete" on public.orcamentos;
create policy "orcamentos_delete" on public.orcamentos
  for delete using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (
      (select mc.cargo from public.meu_cargo() mc)
        in ('proprietaria', 'coordenadora')
      or criado_por = (select auth.uid())
    )
  );

-- ------------------------------------------------------------
-- 3) Itens do orçamento
-- ------------------------------------------------------------
create table if not exists public.orcamento_itens (
  id                      uuid primary key default gen_random_uuid(),
  orcamento_id            uuid not null references public.orcamentos (id) on delete cascade,
  modelo_precificacao_id  uuid references public.modelos_precificacao (id) on delete set null,

  -- Snapshot: preserva o texto/valores mesmo se o modelo mudar depois
  nome                    text not null,
  descricao               text,
  tipo_calculo            text not null
                          check (tipo_calculo in ('fixo', 'por_convidado', 'manual')),
  valor_unitario          numeric,
  quantidade_convidados_aplicada int,
  taxa_fixa               numeric not null default 0,
  valor_calculado         numeric not null,

  ordem                   int not null default 0,
  created_at              timestamptz not null default now()
);

create index if not exists idx_orcamento_itens_orcamento
  on public.orcamento_itens (orcamento_id, ordem);

alter table public.orcamento_itens enable row level security;

-- Acesso segue o orçamento-pai. O IN sobre orcamentos reaplica a RLS do
-- pai (uma vez por consulta), então cerimonialista só mexe nos itens dos
-- orçamentos que ela enxerga.
drop policy if exists "orcamento_itens_via_orcamento" on public.orcamento_itens;
create policy "orcamento_itens_via_orcamento" on public.orcamento_itens
  for all
  using (orcamento_id in (select o.id from public.orcamentos o))
  with check (orcamento_id in (select o.id from public.orcamentos o));

-- ------------------------------------------------------------
-- 4) Trigger: valor_total sempre em dia
--    SECURITY DEFINER: o recálculo não pode falhar por RLS (ex.: fluxo
--    público de aprovação na Etapa 5 mexendo via RPC).
-- ------------------------------------------------------------
create or replace function public.recalcular_valor_total_orcamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orcamentos
  set valor_total = (
        select coalesce(sum(valor_calculado), 0)
        from public.orcamento_itens
        where orcamento_id = coalesce(new.orcamento_id, old.orcamento_id)
      ),
      updated_at = now()
  where id = coalesce(new.orcamento_id, old.orcamento_id);
  return null;
end;
$$;

drop trigger if exists trigger_recalcular_valor_total on public.orcamento_itens;
create trigger trigger_recalcular_valor_total
  after insert or update or delete on public.orcamento_itens
  for each row execute function public.recalcular_valor_total_orcamento();

-- ------------------------------------------------------------
-- 5) Logo da empresa (usada no PDF, Etapa 4)
-- ------------------------------------------------------------
alter table public.empresas add column if not exists logo_url text;

commit;
