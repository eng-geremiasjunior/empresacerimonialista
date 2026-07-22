-- ============================================================
-- Vela — Migração 045: conteúdo institucional da empresa (Etapa 7 de 10)
--
-- Textos fixos reaproveitados em TODA proposta (Sobre nós, Como funciona,
-- FAQ, condições de pagamento, WhatsApp). Não variam por orçamento.
--
-- CORREÇÕES sobre o rascunho:
--  * Policy FOR ALL precisa de WITH CHECK além de USING — USING não se
--    aplica a INSERT, então só com USING a tela de configuração nunca
--    conseguiria criar nada.
--  * O seed do rascunho usa `SELECT ... UNION ALL ... WHERE id NOT IN`:
--    esse WHERE só filtra o ÚLTIMO SELECT da cadeia, então re-executar
--    duplicaria as 5 primeiras etapas. Aqui é VALUES + NOT EXISTS por
--    empresa — idempotente de verdade.
--  * Trigger para empresas NOVAS também nascerem com o conteúdo padrão
--    (senão só as existentes na data da migração teriam seed).
--
-- Execute no SQL Editor do Supabase (depois da 044).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Conteúdo institucional (1 linha por empresa)
-- ------------------------------------------------------------
create table if not exists public.empresa_conteudo_institucional (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null unique references public.empresas (id) on delete cascade,

  -- "Sobre nós"
  sobre_nos_texto            text,
  stat_anos_experiencia      int,
  stat_eventos_realizados    int,
  stat_dedicacao_percentual  int not null default 100,
  stat_equipe_texto          text not null default 'Equipe Especializada',

  -- Condições de pagamento padrão
  condicao_entrada_percentual          int not null default 30,
  condicao_parcelas_maximo             int not null default 7,
  condicao_desconto_a_vista_percentual int not null default 5,
  condicao_prazo_parcelas_texto        text not null default 'até 5 dias antes do evento',

  -- Contato (botões de ação da Etapa 10)
  whatsapp_contato text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.empresa_conteudo_institucional enable row level security;

drop policy if exists "conteudo_institucional_proprietaria"
  on public.empresa_conteudo_institucional;
create policy "conteudo_institucional_proprietaria"
  on public.empresa_conteudo_institucional
  for all
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- ------------------------------------------------------------
-- 2) Etapas do processo ("Como funciona")
-- ------------------------------------------------------------
create table if not exists public.empresa_processo_etapas (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  ordem      int not null,
  titulo     text not null,
  descricao  text,
  created_at timestamptz not null default now()
);

create index if not exists idx_processo_etapas_empresa
  on public.empresa_processo_etapas (empresa_id, ordem);

alter table public.empresa_processo_etapas enable row level security;

drop policy if exists "processo_etapas_proprietaria"
  on public.empresa_processo_etapas;
create policy "processo_etapas_proprietaria"
  on public.empresa_processo_etapas
  for all
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- ------------------------------------------------------------
-- 3) FAQ
-- ------------------------------------------------------------
create table if not exists public.empresa_faq (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  ordem      int not null,
  pergunta   text not null,
  resposta   text not null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_faq_empresa
  on public.empresa_faq (empresa_id, ordem);

alter table public.empresa_faq enable row level security;

drop policy if exists "faq_proprietaria" on public.empresa_faq;
create policy "faq_proprietaria"
  on public.empresa_faq
  for all
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- ------------------------------------------------------------
-- 4) Seed padrão — idempotente, por empresa
-- ------------------------------------------------------------
create or replace function public.semear_conteudo_institucional(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.empresa_conteudo_institucional
    (empresa_id, stat_anos_experiencia, stat_eventos_realizados)
  values (p_empresa_id, 1, 0)
  on conflict (empresa_id) do nothing;

  if not exists (
    select 1 from public.empresa_processo_etapas where empresa_id = p_empresa_id
  ) then
    insert into public.empresa_processo_etapas (empresa_id, ordem, titulo, descricao)
    select p_empresa_id, v.ordem, v.titulo, v.descricao
    from (values
      (1, 'Briefing', 'Reunião inicial para entendermos seus sonhos e expectativas.'),
      (2, 'Planejamento', 'Criamos o budget, cronograma e checklist personalizados.'),
      (3, 'Contratações', 'Indicação, negociação e acompanhamento com os fornecedores.'),
      (4, 'Organização', 'Visitas técnicas, degustações, contratos e alinhamento de todos os detalhes.'),
      (5, 'Evento', 'Coordenação completa do dia para que vocês só aproveitem.'),
      (6, 'Pós-evento', 'Relatório final com todos os detalhes e informações importantes.')
    ) as v(ordem, titulo, descricao);
  end if;

  if not exists (
    select 1 from public.empresa_faq where empresa_id = p_empresa_id
  ) then
    insert into public.empresa_faq (empresa_id, ordem, pergunta, resposta)
    select p_empresa_id, v.ordem, v.pergunta, v.resposta
    from (values
      (1, 'Como funciona o pagamento?',
          'A entrada é de 30% do valor total, com o restante parcelado em até 7x sem juros.'),
      (2, 'Posso adicionar extras depois?',
          'Sim! Itens adicionais podem ser incluídos a qualquer momento, conforme sua necessidade.'),
      (3, 'A equipe acompanha reuniões com fornecedores?',
          'Sim, nossa equipe acompanha e coordena todas as reuniões e contratações.')
    ) as v(ordem, pergunta, resposta);
  end if;
end;
$$;

-- Empresas já existentes
do $$
declare
  r record;
begin
  for r in select id from public.empresas loop
    perform public.semear_conteudo_institucional(r.id);
  end loop;
end $$;

-- Empresas novas nascem com o conteúdo padrão
create or replace function public.trg_semear_conteudo_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.semear_conteudo_institucional(new.id);
  return new;
end;
$$;

drop trigger if exists trg_semear_conteudo on public.empresas;
create trigger trg_semear_conteudo
  after insert on public.empresas
  for each row execute function public.trg_semear_conteudo_empresa();

commit;
