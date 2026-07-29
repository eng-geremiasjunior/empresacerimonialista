-- 060 — Segundo template de casamento (Maison Lumière)
--
-- Casamento passa a ter dois templates, como debutante já tinha desde a
-- 059. Só amplia o check de orcamentos.template_proposta com os slugs de
-- casamento; nada mais muda (a RPC já devolve a coluna).
--
-- null continua sendo "padrão do tipo": casamento → V2, debutante →
-- clássico. Nenhuma proposta existente muda de aparência.

alter table public.orcamentos
  drop constraint if exists orcamentos_template_proposta_check;
alter table public.orcamentos
  add constraint orcamentos_template_proposta_check
  check (
    template_proposta is null
    or template_proposta in (
      'debutante_classico',
      'debutante_glam',
      'casamento_v2',
      'casamento_maison'
    )
  );

-- ------------------------------------------------------------
-- CPF na ficha
-- ------------------------------------------------------------
-- O modal deste template pede CPF (é o que o handoff especifica e o que
-- vai para o contrato). Sem a coluna, o campo seria coletado e jogado
-- fora — então entra agora, junto com o template que o pede.
alter table public.orcamentos
  add column if not exists ficha_cpf text;

-- A 043 fixou a assinatura da RPC da ficha; acrescentar um parâmetro cria
-- uma sobrecarga nova em vez de substituir, por isso o drop explícito.
drop function if exists public.preencher_ficha_orcamento_aprovado(
  text, text, text, text, text, text, text, text, text);

create or replace function public.preencher_ficha_orcamento_aprovado(
  p_hash      text,
  p_nome      text,
  p_telefone  text,
  p_whatsapp  text,
  p_email     text,
  p_instagram text,
  p_cep       text,
  p_endereco  text,
  p_cidade    text,
  p_cpf       text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orc public.orcamentos%rowtype;
begin
  select * into v_orc from public.orcamentos
  where hash_publico = p_hash and status = 'aprovado';

  if not found then
    return json_build_object('error', 'orçamento não encontrado ou não aprovado');
  end if;

  if coalesce(trim(p_nome), '') = '' or coalesce(trim(p_telefone), '') = '' then
    return json_build_object('error', 'nome e telefone são obrigatórios');
  end if;

  -- contato_* preserva o que a cerimonialista digitou; ficha_* guarda o
  -- que o cliente confirmou (a Etapa 6 usa ficha_* com fallback).
  update public.orcamentos
  set ficha_nome      = trim(p_nome),
      ficha_telefone  = nullif(trim(p_telefone), ''),
      ficha_whatsapp  = nullif(trim(coalesce(p_whatsapp, '')), ''),
      ficha_email     = nullif(trim(coalesce(p_email, '')), ''),
      ficha_instagram = nullif(trim(coalesce(p_instagram, '')), ''),
      ficha_cep       = nullif(trim(coalesce(p_cep, '')), ''),
      ficha_endereco  = nullif(trim(coalesce(p_endereco, '')), ''),
      ficha_cidade    = nullif(trim(coalesce(p_cidade, '')), ''),
      ficha_cpf       = nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), ''),
      ficha_preenchida_em = now(),
      updated_at = now()
  where id = v_orc.id;

  return json_build_object('success', true);
end;
$$;

revoke all on function public.preencher_ficha_orcamento_aprovado(
  text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.preencher_ficha_orcamento_aprovado(
  text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
