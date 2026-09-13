-- ============================================================
-- 158 — O link do fornecedor leva ao roteiro dele
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- O DEFEITO, medido em 11/09/2026. A tela de fornecedores oferece o link
-- público em dois lugares (no fornecedor e no fim do Roteiro) e monta o
-- endereço com o hash de `roteiro_links`. A página `/fornecedor/[hash]`
-- resolve o hash em `fornecedor_acesso` — que é outra tabela, com outro
-- hash, criada só quando uma solicitação é enviada. Resultado: dos 74
-- vínculos existentes no banco, ZERO abriam. Todo fornecedor que recebeu
-- esse link viu "Link inválido".
--
-- A DECISÃO (dono, 11/09/2026), depois de eu mostrar as três saídas: o
-- fornecedor abre o link e vê as PENDÊNCIAS quando existirem, e o
-- ROTEIRO DELE sempre. É a promessa original do produto ("link público
-- filtrado por fornecedor, que atualiza sozinho"), e é o que faz o link
-- servir para alguma coisa ANTES de ela pedir qualquer confirmação.
--
-- O QUE MUDA AQUI
--
--   1) Todo fornecedor já vinculado a um evento ganha a sua linha de
--      acesso — o link passa a existir por fornecedor, como a página
--      sempre pressupôs ("o único link que atravessa os eventos dela").
--   2) A validade deixa de ser 90 dias contados da criação e passa a
--      cobrir o último evento dele. Link que expira antes da festa é
--      pior que link nenhum: morre exatamente quando seria usado.
--   3) A leitura pública passa a devolver o roteiro do fornecedor, e a
--      aceitar TAMBÉM o hash antigo de `roteiro_links` — quem já mandou
--      aquele link para um fornecedor não precisa mandar outro. Nesse
--      caso a página mostra só o evento daquele vínculo, que é o que o
--      link antigo prometia.
--
-- NADA É APAGADO e nenhum hash muda. `roteiro_links` continua sendo o
-- vínculo (e a confirmação por evento, da 157); `fornecedor_acesso`
-- continua sendo o acesso.

begin;

-- ------------------------------------------------------------
-- 1) Uma linha de acesso para cada fornecedor já vinculado
-- ------------------------------------------------------------
-- `on conflict do nothing` porque quem já tem acesso (recebeu
-- solicitação) mantém o hash dele: trocar invalidaria o link que já está
-- no WhatsApp de alguém.

insert into public.fornecedor_acesso (empresa_id, supplier_id, expira_em)
select rl.empresa_id,
       rl.supplier_id,
       greatest(
         now() + interval '180 days',
         (max(ev.date) + interval '30 days')::timestamptz
       )
  from public.roteiro_links rl
  join public.events ev on ev.id = rl.event_id
 where rl.empresa_id is not null
 group by rl.empresa_id, rl.supplier_id
    on conflict (empresa_id, supplier_id) do nothing;

-- ------------------------------------------------------------
-- 2) A validade cobre o último evento do fornecedor
-- ------------------------------------------------------------
-- Vale para as linhas que já existiam, criadas com 90 dias fixos: um
-- casamento marcado para daqui a oito meses expiraria o link antes da
-- data. Só estende, nunca encurta, e não ressuscita link revogado.

update public.fornecedor_acesso fa
   set expira_em = greatest(fa.expira_em, u.ate)
  from (
        select rl.empresa_id,
               rl.supplier_id,
               (max(ev.date) + interval '30 days')::timestamptz as ate
          from public.roteiro_links rl
          join public.events ev on ev.id = rl.event_id
         where rl.empresa_id is not null
         group by rl.empresa_id, rl.supplier_id
       ) u
 where fa.empresa_id = u.empresa_id
   and fa.supplier_id = u.supplier_id
   and fa.revogado_em is null;

-- ------------------------------------------------------------
-- 3) A leitura pública: pendências + roteiro, e o hash antigo também
-- ------------------------------------------------------------
-- Mesmo nome e mesma assinatura da 114: a página já chama esta função, e
-- trocar o nome obrigaria a publicar código e banco no mesmo segundo.

create or replace function public.consultar_pendencias_fornecedor(p_hash text)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_acesso   public.fornecedor_acesso%rowtype;
  v_empresa  uuid;
  v_supplier uuid;
  -- preenchido só quando o hash é de um vínculo (link antigo): aí a
  -- fatia é a daquele evento, que é o que aquele link prometia
  v_evento   uuid;
begin
  select * into v_acesso
  from public.fornecedor_acesso
  where hash = p_hash;

  if found then
    if v_acesso.revogado_em is not null then return null; end if;
    if v_acesso.expira_em < now() then return null; end if;

    v_empresa  := v_acesso.empresa_id;
    v_supplier := v_acesso.supplier_id;

    -- Conta a abertura só quando faz diferença: sem o intervalo, cada F5
    -- do fornecedor era um UPDATE — e "abriu o link 47 vezes" viraria
    -- contador de refresh, não sinal.
    update public.fornecedor_acesso
    set aberturas = aberturas + 1, ultima_abertura = now()
    where id = v_acesso.id
      and (ultima_abertura is null or ultima_abertura < now() - interval '5 minutes');
  else
    select rl.empresa_id, rl.supplier_id, rl.event_id
      into v_empresa, v_supplier, v_evento
    from public.roteiro_links rl
    where rl.hash = p_hash;

    if not found then return null; end if;
  end if;

  return (
    select json_build_object(
      'fornecedor', (
        select json_build_object('nome', s.name)
        from public.suppliers s where s.id = v_supplier
      ),
      'empresa', (
        select json_build_object('nome', e.nome, 'logo_url', e.logo_url)
        from public.empresas e where e.id = v_empresa
      ),
      'pendencias', coalesce((
        select json_agg(
          json_build_object(
            'id', sf.id,
            'tipo', sf.tipo,
            'titulo', sf.titulo,
            'status', sf.status,
            'prazo_ate', sf.prazo_ate,
            'respondida_em', sf.respondida_em,
            -- snapshot do que o sistema acredita hoje: a solicitação de
            -- horário carrega o item, e o fornecedor confirma ou corrige
            'roteiro_item', case
              when sf.tipo = 'horario' and sf.roteiro_item_id is not null then (
                select json_build_object(
                  'titulo', ri.title,
                  'horario', ri.time,
                  'origem', ri.origem_horario
                )
                from public.roteiro_items ri
                where ri.id = sf.roteiro_item_id
              )
              else null
            end,
            'evento', json_build_object(
              'nome', coalesce(ev.name, c.name),
              'data', ev.date,
              'local', ev.location
            )
          ) order by ev.date, sf.created_at
        )
        from public.solicitacao_fornecedor sf
        join public.events ev on ev.id = sf.event_id
        left join public.clients c on c.id = ev.client_id
        where sf.supplier_id = v_supplier
          and sf.empresa_id = v_empresa
          and (v_evento is null or sf.event_id = v_evento)
          and ev.status <> 'concluido'
          and (
            sf.status in ('enviada', 'reenviada')
            -- Pendente que já venceu também aparece: a página é o lugar
            -- onde está tudo, e a cerimonialista pode ter mandado o link
            -- por fora, sem passar pela fila. O que ainda não venceu fica
            -- de fora — mostrar seria cobrar antes da hora.
            or (
              sf.status = 'pendente'
              and (
                sf.dispara_em is null
                or sf.dispara_em <= (now() at time zone 'America/Sao_Paulo')::date
              )
            )
            or (sf.status = 'respondida' and sf.respondida_em > now() - interval '7 days')
          )
      ), '[]'::json),

      -- O ROTEIRO DELE (158). Só os itens em que ele é o responsável:
      -- é a diferença entre "o dia inteiro da cerimonialista", que não
      -- lhe diz respeito e ele não vai ler no celular às seis da tarde,
      -- e "a sua parte", que é o que o link promete.
      --
      -- Evento sem item dele não entra: um evento vazio na tela faz o
      -- fornecedor procurar o que não existe.
      'roteiro', coalesce((
        select json_agg(t.bloco order by t.data)
        from (
          select ev.date as data,
                 json_build_object(
                   'evento', json_build_object(
                     'nome', coalesce(ev.name, c.name),
                     'data', ev.date,
                     'hora', ev.time,
                     'local', ev.location,
                     'cidade', ev.city
                   ),
                   'confirmado', coalesce(rl.confirmed, false),
                   'itens', (
                     select json_agg(
                       json_build_object(
                         'id', ri.id,
                         'hora', ri.time,
                         'titulo', ri.title,
                         'descricao', ri.description,
                         'duracao_minutos', ri.duracao_minutos
                       ) order by ri."order", ri.time
                     )
                     from public.roteiro_items ri
                     where ri.event_id = ev.id
                       and ri.supplier_id = v_supplier
                   )
                 ) as bloco
          from public.events ev
          left join public.clients c on c.id = ev.client_id
          left join public.roteiro_links rl
                 on rl.event_id = ev.id and rl.supplier_id = v_supplier
          where ev.empresa_id = v_empresa
            and (v_evento is null or ev.id = v_evento)
            and ev.status <> 'cancelado'
            -- o dia seguinte ainda mostra a festa de ontem: quem abre o
            -- link na manhã da desmontagem precisa dela
            and ev.date >= (now() at time zone 'America/Sao_Paulo')::date - 1
            and exists (
              select 1 from public.roteiro_items ri
              where ri.event_id = ev.id and ri.supplier_id = v_supplier
            )
        ) t
      ), '[]'::json)
    )
  );
end;
$$;

revoke all on function public.consultar_pendencias_fornecedor(text) from public;
grant execute on function public.consultar_pendencias_fornecedor(text) to anon, authenticated;

comment on function public.consultar_pendencias_fornecedor(text) is
  'O que o fornecedor vê no link sem login: as pendências dele (114) e o roteiro dele (158). Aceita o hash de fornecedor_acesso (todos os eventos) e o de roteiro_links (só aquele evento, para os links antigos já enviados).';


commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
--
-- SEM `WITH` AQUI, DE PROPÓSITO. A primeira versão desta conferência
-- declarava duas amostras num `with` no meio da cadeia, e o Postgres
-- recusou o arquivo inteiro:
--
--     ERROR: 42601: syntax error at or near "with"
--
-- `WITH` abre a INSTRUÇÃO, não um ramo dela: depois de um `union all` ele
-- não é SQL válido, por melhor que leia. Dava para mover as amostras para
-- o topo, mas a correção certa foi outra — cada linha voltou a ser um
-- subselect fechado, a mesma forma das que já passavam. Construção que
-- não existe não erra.

select 'todo fornecedor vinculado tem acesso' as item,
       not exists (
         select 1
         from public.roteiro_links rl
         where rl.empresa_id is not null
           and not exists (
             select 1 from public.fornecedor_acesso fa
             where fa.empresa_id = rl.empresa_id
               and fa.supplier_id = rl.supplier_id
           )
       ) as ok

union all
select 'nenhum acesso vivo expira antes do último evento do fornecedor',
       not exists (
         select 1
         from public.fornecedor_acesso fa
         join public.roteiro_links rl
           on rl.empresa_id = fa.empresa_id and rl.supplier_id = fa.supplier_id
         join public.events ev on ev.id = rl.event_id
         where fa.revogado_em is null
           and fa.expira_em < ev.date::timestamptz
       )

union all
-- Prova de fogo: um vínculo de evento que ainda vai acontecer, com item
-- do fornecedor no roteiro, tem de devolver roteiro NÃO VAZIO pelos dois
-- hashes — o do vínculo (link antigo) e o do acesso (link novo).
--
-- OS DOIS `coalesce` SÃO DIFERENTES, E A ORDEM IMPORTA:
--
--   * o de DENTRO cobre "há amostra, mas a função devolveu null" — e
--     devolve FALSE. É o defeito que esta migração existe para consertar;
--     se ele voltar, a conferência tem de acusar.
--   * o de FORA cobre "não há amostra nenhuma" — e devolve TRUE, porque
--     aí não há o que provar.
--
-- Escrito com um coalesce só, como eu tinha feito antes, os dois casos
-- viravam o mesmo `true` e a linha não conseguia falhar pelo motivo pelo
-- qual foi escrita.
select 'o hash antigo (vínculo) devolve o roteiro do fornecedor',
       coalesce(
         (
           select coalesce(
                    json_array_length(
                      public.consultar_pendencias_fornecedor(rl.hash) -> 'roteiro'
                    ) > 0,
                    false
                  )
             from public.roteiro_links rl
             join public.events ev on ev.id = rl.event_id
            where ev.date >= (now() at time zone 'America/Sao_Paulo')::date
              and ev.status <> 'cancelado'
              and exists (
                select 1 from public.roteiro_items ri
                where ri.event_id = rl.event_id and ri.supplier_id = rl.supplier_id
              )
            limit 1
         ),
         true
       )

union all
select 'o hash novo (acesso) devolve o roteiro do fornecedor',
       coalesce(
         (
           select coalesce(
                    json_array_length(
                      public.consultar_pendencias_fornecedor(fa.hash) -> 'roteiro'
                    ) > 0,
                    false
                  )
             from public.fornecedor_acesso fa
             join public.roteiro_links rl
               on rl.empresa_id = fa.empresa_id and rl.supplier_id = fa.supplier_id
             join public.events ev on ev.id = rl.event_id
            where fa.revogado_em is null
              and ev.date >= (now() at time zone 'America/Sao_Paulo')::date
              and ev.status <> 'cancelado'
              and exists (
                select 1 from public.roteiro_items ri
                where ri.event_id = rl.event_id and ri.supplier_id = rl.supplier_id
              )
            limit 1
         ),
         true
       )

union all
select 'hash inventado continua sem resposta',
       public.consultar_pendencias_fornecedor('naoexiste00000000000000000000000') is null;

-- NOTA, para quem rodar isto: as duas linhas do meio CHAMAM a função, e a
-- função conta abertura. Rodar a conferência soma 1 em `aberturas` de um
-- fornecedor real (o guarda de 5 minutos impede que rodar duas vezes
-- seguidas some duas). É pequeno e conhecido — não é falha de leitura
-- dela, é ruído meu; se incomodar, zere a linha depois.
