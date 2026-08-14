-- ============================================================
-- Vela — Migração 093: publicar várias opções de uma vez
--
-- Achado no teste da 092: publicar 3 opções numa tacada só falhava com
--
--   null value in column "recomendada" violates not-null constraint
--
-- Não é erro de quem chama. Em insert de VÁRIAS linhas, o PostgREST monta
-- um comando com a união das colunas de todas as linhas e preenche com
-- NULL explícito o que faltou em cada uma — e NULL explícito não aciona o
-- DEFAULT da coluna. Como só a opção recomendada carrega
-- `recomendada: true`, as outras chegavam com NULL numa coluna NOT NULL.
--
-- Poderia ser resolvido mandando todos os campos em toda linha, mas isso
-- deixa o banco dependendo de o código lembrar — e a próxima tela que
-- inserir em lote quebra de novo. O saneamento fica aqui: NULL em coluna
-- com default vira o default.
--
-- Execute no SQL Editor do Supabase (depois da 092).
-- ============================================================

begin;

create or replace function public.trg_opcao_defaults()
returns trigger
language plpgsql
as $$
begin
  new.recomendada := coalesce(new.recomendada, false);
  new.ordem       := coalesce(new.ordem, 0);
  return new;
end $$;

drop trigger if exists trg_opcao_defaults on public.decisao_opcao;
create trigger trg_opcao_defaults
  before insert or update on public.decisao_opcao
  for each row execute function public.trg_opcao_defaults();

-- Mesmo cuidado nas outras tabelas da 092 que a tela preenche em lote:
-- a lista de convidados e o cortejo entram várias linhas por vez.
create or replace function public.trg_convidado_defaults()
returns trigger
language plpgsql
as $$
begin
  new.confirmacao   := coalesce(new.confirmacao, 'aguardando');
  new.acompanhantes := coalesce(new.acompanhantes, 0);
  new.criancas      := coalesce(new.criancas, 0);
  new.origem        := coalesce(new.origem, 'equipe');
  return new;
end $$;

drop trigger if exists trg_convidado_defaults on public.evento_convidado;
create trigger trg_convidado_defaults
  before insert or update on public.evento_convidado
  for each row execute function public.trg_convidado_defaults();

create or replace function public.trg_cortejo_defaults()
returns trigger
language plpgsql
as $$
begin
  new.ordem  := coalesce(new.ordem, 0);
  new.origem := coalesce(new.origem, 'cliente');
  return new;
end $$;

drop trigger if exists trg_cortejo_defaults on public.evento_cortejo_pessoa;
create trigger trg_cortejo_defaults
  before insert or update on public.evento_cortejo_pessoa
  for each row execute function public.trg_cortejo_defaults();

create or replace function public.trg_inspiracao_defaults()
returns trigger
language plpgsql
as $$
begin
  new.assunto := coalesce(new.assunto, 'geral');
  new.ordem   := coalesce(new.ordem, 0);
  new.origem  := coalesce(new.origem, 'cliente');
  return new;
end $$;

drop trigger if exists trg_inspiracao_defaults on public.evento_inspiracao;
create trigger trg_inspiracao_defaults
  before insert or update on public.evento_inspiracao
  for each row execute function public.trg_inspiracao_defaults();

commit;
