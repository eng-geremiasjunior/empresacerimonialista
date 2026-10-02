-- ============================================================
-- 191 — Os 6 modelos do site: o conteúdo de cada bloco, o tema e o
--       balde das fotos (01/10/2026)
-- ============================================================
-- Plano em .claude/plans/modelos-de-site.md (decisões do dono, 30/09).
-- O site da noiva passa a guardar NA ESTRUTURA (e por isso na fotografia
-- que o dono revisa) o que os 6 modelos desenham: os nomes do casal e a
-- frase da capa, os marcos da história, a programação, as cenas do T04,
-- o "Nosso jeito", as fotos do traje, do local, da galeria e dos
-- padrinhos, os presentes com valor, o prazo e o menu da confirmação.
--
-- O que muda:
--   1) portal_salvar_estrutura_site_base — a MESMA assinatura e o mesmo
--      comportamento de hoje (186, renomeada pela 189), com:
--        · os tipos novos 'cenas' (o "Nossos momentos" do T04) e 'jeito';
--        · uma regra de conteúdo POR BLOCO: só as chaves conhecidas, o
--          tipo certo (texto é texto, lista é lista) e o teto de cada
--          campo — os mesmos de LIMITES em src/lib/site-conteudo.ts;
--        · toda foto é um caminho do PRÓPRIO evento no balde 'site'
--          ({evento}/{uuid}.jpg|webp), no máximo 60 por estrutura;
--        · o id de presente não repete na estrutura inteira, e mudar os
--          itens de presente pede 'gestao' (a régua da 190 para o Pix);
--        · o tema ganha 'nome' (a forma do nome), 'abertura' e 'paleta',
--          e 'modelo' passa a ser um dos 7 desenhos.
--      A regra mora em site_erro_da_estrutura (interna, sem grant): a
--      _base chama, e a conferência daqui roda a mesma régua contra
--      estruturas de exemplo e contra os sites já salvos.
--      O EMBRULHO da 189 (portal_salvar_estrutura_site, que confere o
--      nível) NÃO é recriado: a 189 avisou — mudar a RPC = mudar a _base.
--   2) O balde 'site': privado, 3 MB, jpeg e webp. Nenhuma policy para
--      quem entra: a foto sobe por URL de envio assinada que o SERVIDOR
--      emite (chave de serviço, depois de conferir o nível), e é lida por
--      URL assinada também. Sem update nem delete, o que o dono aprovou
--      não é regravado nem apagado no ar.
--   3) site_montado (não é uma das 27 embrulhadas): o endereço do espaço
--      sai em evento.endereco, ao vivo como o local, só quando a
--      fotografia é de um modelo novo com o bloco 'local' visível; o prazo
--      e o menu da confirmação vêm do bloco rsvp da fotografia e, sem ele
--      (ou vazio), das colunas de antes. O resto é o corpo da 185, igual.
--   site_fotografia não muda: estrutura e tema já entram nela.
--   4) Depois da revisão por céticos (01/10), antes de aplicar:
--        · a _base só aceita foto que JÁ ESTÁ no balde (um caminho só
--          reservado subiria depois da aprovação do dono);
--        · o bloco 'historia' aceita a 'foto' da história (o quadro 4/5
--          do Clássico);
--        · site_publico (o que o ANÔNIMO recebe) manda só o conteúdo do
--          que aparece: bloco escondido, ou que o modelo não desenha, sai
--          sem 'conteudo'; com o bloco escondido, as colunas dele (Pix,
--          titular, link, textos) saem nulas. A prévia da noiva e a
--          revisão do dono continuam com tudo (site_montado não muda);
--        · evento nulo não passa na régua;
--        · (2ª revisão) a capa e o rodapé não se escondem; a foto do
--          casal de antes (balde 'inspiracoes', que aceita troca) não vai
--          ao anônimo nos modelos novos nem com a história escondida; o
--          álbum e o mural escondidos não mandam fotos nem recados.
--   5) Depois de no ar (01/10, pedido do dono): a capa aceita 'mascara',
--      o quanto a noiva escurece a foto (inteiro de 0 a 80). Muda só
--      site_erro_da_estrutura; o anônimo já recebia o conteúdo da capa.
--      Reaplicar a 191 inteira por cima é seguro (tudo create or replace).
--
-- ORDEM: aplicar a 191 ANTES de o ramo modelos-de-site ir ao ar (o
-- editor novo grava 'cenas', 'jeito' e o tema novo, que a _base da 186
-- recusa). Com o main de hoje no ar, a 191 funciona: ele só grava cores
-- e texto livre.
--
-- Os textos de sempre (mensagem, história, traje, Pix, titular, link)
-- continuam nas colunas, escritos por portal_salvar_site e
-- portal_ajustar_convite. Nada disso passa a ser aceito na estrutura: a
-- chave Pix por aqui pularia a trava de 'gestao' que a 190 põe no
-- portal_ajustar_convite.
--
-- Vem depois da 189 e não depende da 190 (que não toca nesta função nem
-- em site_montado). Aditiva e convergente: pode rodar de novo.
-- Termina com a conferência (tudo true).
-- ============================================================

-- a 191 vem depois da 189 (sem ela, não há _base para trocar)
do $$
begin
  if to_regprocedure('public.portal_salvar_estrutura_site_base(uuid, jsonb, jsonb)') is null
     or to_regprocedure('public.portal_salvar_estrutura_site(uuid, jsonb, jsonb)') is null then
    raise exception 'a 191 vem depois da 189: aplique a 189 primeiro';
  end if;
end $$;

begin;

-- ------------------------------------------------------------
-- 1) AS PEÇAS DA REGRA (internas)
-- ------------------------------------------------------------
-- Texto opcional: ausente, ou texto com no máximo p_max letras
-- (char_length, como o cortar() do site-conteudo.ts).
create or replace function public.site_texto_ok(p_valor jsonb, p_max int)
returns boolean
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_valor is null then true
    when jsonb_typeof(p_valor) = 'string' then char_length(p_valor #>> '{}') <= p_max
    else false
  end;
$$;

-- Foto opcional: ausente, nula (o espaço vazio) ou um caminho do PRÓPRIO
-- evento no balde 'site'. O uuid em texto só tem hex e hífen: entra no
-- padrão sem escapar.
create or replace function public.site_foto_ok(p_valor jsonb, p_event_id uuid)
returns boolean
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_valor is null or jsonb_typeof(p_valor) = 'null' then true   -- o espaço vazio
    when p_event_id is null then false                                 -- sem evento, nenhuma foto é dele
    when jsonb_typeof(p_valor) = 'string' then
      coalesce(p_valor #>> '{}' ~ ('^' || p_event_id::text || '/[0-9a-f-]{36}\.(jpg|webp)$'), false)
    else false
  end;
$$;

-- Lista de fotos opcional: ausente, ou lista de até p_max caminhos do
-- evento (sem nulos no meio).
create or replace function public.site_fotos_ok(p_valor jsonb, p_max int, p_event_id uuid)
returns boolean
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_valor is null then true
    when jsonb_typeof(p_valor) = 'array' then
      jsonb_array_length(p_valor) <= p_max
      and not exists (select 1 from jsonb_array_elements(p_valor) f
                       where jsonb_typeof(f) <> 'string'
                          or not public.site_foto_ok(f, p_event_id))
    else false
  end;
$$;

-- Lista opcional: ausente, ou lista com no máximo p_max itens (o que vai
-- dentro de cada item é conferido por quem chama).
create or replace function public.site_lista_ok(p_valor jsonb, p_max int)
returns boolean
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_valor is null then true
    when jsonb_typeof(p_valor) = 'array' then jsonb_array_length(p_valor) <= p_max
    else false
  end;
$$;

-- Objeto só com as chaves conhecidas (chave desconhecida = recusa). O
-- case garante a ordem: jsonb_object_keys num texto ou número dá erro.
create or replace function public.site_so_chaves(p_valor jsonb, p_chaves text[])
returns boolean
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when jsonb_typeof(p_valor) = 'object' then
      not exists (select 1 from jsonb_object_keys(p_valor) k where not (k = any (p_chaves)))
    else false
  end;
$$;

-- Os itens de presente de uma estrutura, de todos os blocos 'presentes'
-- na ordem em que aparecem (o que a trava de 'gestao' da _base compara).
create or replace function public.site_itens_de_presente(p_estrutura jsonb)
returns jsonb
language sql
immutable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(i.item order by b.n, i.m), '[]'::jsonb)
    from jsonb_array_elements(
           case when jsonb_typeof(p_estrutura) = 'array' then p_estrutura else '[]'::jsonb end
         ) with ordinality b(bloco, n)
   cross join lateral jsonb_array_elements(
           case when jsonb_typeof(b.bloco->'conteudo'->'itens') = 'array'
                then b.bloco->'conteudo'->'itens' else '[]'::jsonb end
         ) with ordinality i(item, m)
   where b.bloco->>'tipo' = 'presentes';
$$;

-- ------------------------------------------------------------
-- 2) A REGRA (interna): nulo = pode salvar; texto = o motivo
-- ------------------------------------------------------------
-- O motivo aparece na tela da noiva (o portal mostra a mensagem do
-- P0001) e no log do servidor: só diz o bloco e a regra, nunca o que foi
-- escrito.
create or replace function public.site_erro_da_estrutura(
  p_event_id  uuid,
  p_estrutura jsonb,
  p_tema      jsonb
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tipos constant text[] := array[
    'capa', 'contagem', 'mensagem', 'historia', 'momentos', 'cenas', 'local',
    'dress_code', 'rsvp', 'presentes', 'hospedagem', 'galeria', 'especiais',
    'jeito', 'video', 'enquete', 'perguntas', 'album', 'playlist', 'mural',
    'texto', 'rodape'];
  v_icones  constant text[] := array['cafe', 'aviao', 'casa', 'anel', 'coracao'];
  v_modelos constant text[] := array[
    'convite', 'classico', 'aliancas', 'cartoes', 'monograma', 'franca', 'violino'];
  v_hex  constant text := '^#[0-9a-fA-F]{6}$';
  v_hora constant text := '^([01][0-9]|2[0-3]):[0-5][0-9]$';
  v_bloco jsonb;
  v_tipo  text;
  v_c     jsonb;
  v_item  jsonb;
  -- os ids de presente da estrutura INTEIRA: a fatia C acha o preço pelo
  -- id, e dois blocos 'presentes' com o mesmo id deixariam a busca ambígua
  v_ids   text[] := array[]::text[];
  v_fotos int := 0;
  v_chave text;
  v_valor jsonb;
begin
  if p_event_id is null then
    return 'evento inválido';
  end if;
  if p_estrutura is null or jsonb_typeof(p_estrutura) <> 'array' then
    return 'estrutura inválida';
  end if;
  if jsonb_array_length(p_estrutura) > 40 or octet_length(p_estrutura::text) > 100000 then
    return 'o site passou do tamanho — tire um bloco ou encurte um texto';
  end if;

  for v_bloco in select * from jsonb_array_elements(p_estrutura) loop
    -- o bloco: as mesmas regras da 186 (coalesce: sem "tipo" a
    -- comparação dá nulo, e nulo não recusa)
    if not public.site_so_chaves(v_bloco, array['id', 'tipo', 'variante', 'visivel', 'conteudo'])
       or not coalesce(v_bloco->>'tipo' = any (v_tipos), false)
       or (v_bloco ? 'id' and (jsonb_typeof(v_bloco->'id') <> 'string'
                               or v_bloco->>'id' !~ '^[A-Za-z0-9_-]{1,40}$'))
       or (v_bloco ? 'variante' and (jsonb_typeof(v_bloco->'variante') <> 'string'
                                     or v_bloco->>'variante' !~ '^[a-z0-9-]{1,30}$'))
       or (v_bloco ? 'visivel' and jsonb_typeof(v_bloco->'visivel') <> 'boolean') then
      return 'bloco inválido';
    end if;
    -- a capa e o rodapé são fixos: os modelos desenham sempre (e a régua
    -- do público tiraria o conteúdo de um bloco escondido)
    if v_bloco->>'tipo' in ('capa', 'rodape') and v_bloco->'visivel' = 'false'::jsonb then
      return 'a capa e o rodapé não se escondem';
    end if;

    continue when not v_bloco ? 'conteudo';

    v_tipo := v_bloco->>'tipo';
    v_c    := v_bloco->'conteudo';
    if jsonb_typeof(v_c) <> 'object' then
      return 'conteúdo do bloco inválido';
    end if;

    -- o texto livre: como na 186
    if v_tipo = 'texto' then
      if not public.site_so_chaves(v_c, array['titulo', 'texto']) then
        return 'texto livre: conteúdo inválido';
      end if;
      if not public.site_texto_ok(v_c->'titulo', 120)
         or not public.site_texto_ok(v_c->'texto', 4000) then
        return 'texto livre: título até 120 letras e texto até 4000';
      end if;

    elsif v_tipo = 'capa' then
      if not public.site_so_chaves(v_c, array['nome1', 'nome2', 'frase', 'foto', 'mascara']) then
        return 'capa: conteúdo inválido';
      end if;
      if not public.site_texto_ok(v_c->'nome1', 40)
         or not public.site_texto_ok(v_c->'nome2', 40)
         or not public.site_texto_ok(v_c->'frase', 200) then
        return 'capa: nomes até 40 letras e frase até 200';
      end if;
      -- a máscara: o quanto a noiva escurece a foto da capa, de 0 a 80
      -- (por cento), inteira
      if v_c ? 'mascara' then
        if jsonb_typeof(v_c->'mascara') <> 'number' then
          return 'capa: a máscara vai de 0 a 80';
        end if;
        if (v_c->>'mascara')::numeric <> trunc((v_c->>'mascara')::numeric)
           or (v_c->>'mascara')::numeric not between 0 and 80 then
          return 'capa: a máscara vai de 0 a 80';
        end if;
      end if;
      if not public.site_foto_ok(v_c->'foto', p_event_id) then
        return 'foto inválida';
      end if;
      v_fotos := v_fotos + case when jsonb_typeof(v_c->'foto') = 'string' then 1 else 0 end;

    elsif v_tipo = 'historia' then
      -- 'foto': o quadro único da história (o 4/5 do Clássico)
      if not public.site_so_chaves(v_c, array['marcos', 'foto']) then
        return 'história: conteúdo inválido';
      end if;
      if not public.site_foto_ok(v_c->'foto', p_event_id) then
        return 'foto inválida';
      end if;
      v_fotos := v_fotos + case when jsonb_typeof(v_c->'foto') = 'string' then 1 else 0 end;
      if not public.site_lista_ok(v_c->'marcos', 10) then
        return 'história: até 10 marcos';
      end if;
      for v_item in select * from jsonb_array_elements(coalesce(v_c->'marcos', '[]'::jsonb)) loop
        if not public.site_so_chaves(v_item, array['ano', 'cidade', 'curto', 'titulo', 'texto', 'icone', 'foto'])
           or not public.site_texto_ok(v_item->'ano', 10)
           or not public.site_texto_ok(v_item->'cidade', 40)
           or not public.site_texto_ok(v_item->'curto', 24)
           or not public.site_texto_ok(v_item->'titulo', 80)
           or not public.site_texto_ok(v_item->'texto', 600)
           or not (v_item->'icone' is null
                   or jsonb_typeof(v_item->'icone') = 'null'
                   or (jsonb_typeof(v_item->'icone') = 'string' and v_item->>'icone' = any (v_icones))) then
          return 'história: marco inválido';
        end if;
        if not public.site_foto_ok(v_item->'foto', p_event_id) then
          return 'foto inválida';
        end if;
        v_fotos := v_fotos + case when jsonb_typeof(v_item->'foto') = 'string' then 1 else 0 end;
      end loop;

    elsif v_tipo = 'momentos' then
      if not public.site_so_chaves(v_c, array['itens']) then
        return 'momentos do dia: conteúdo inválido';
      end if;
      if not public.site_lista_ok(v_c->'itens', 8) then
        return 'momentos do dia: até 8 itens';
      end if;
      for v_item in select * from jsonb_array_elements(coalesce(v_c->'itens', '[]'::jsonb)) loop
        if not public.site_so_chaves(v_item, array['rotulo', 'hora', 'nota'])
           or not public.site_texto_ok(v_item->'rotulo', 40)
           or not public.site_texto_ok(v_item->'nota', 80) then
          return 'momentos do dia: item inválido';
        end if;
        -- hora ausente, nula ou vazia = item ainda sem horário (o rascunho
        -- salva; o leitor do site só mostra o que tem hora)
        if v_item ? 'hora' and jsonb_typeof(v_item->'hora') <> 'null'
           and (jsonb_typeof(v_item->'hora') <> 'string'
                or (v_item->>'hora' <> '' and v_item->>'hora' !~ v_hora)) then
          return 'momentos do dia: hora inválida';
        end if;
      end loop;

    elsif v_tipo = 'cenas' then
      if not public.site_so_chaves(v_c, array['itens']) then
        return 'nossos momentos: conteúdo inválido';
      end if;
      if not public.site_lista_ok(v_c->'itens', 8) then
        return 'nossos momentos: até 8 cenas';
      end if;
      for v_item in select * from jsonb_array_elements(coalesce(v_c->'itens', '[]'::jsonb)) loop
        if not public.site_so_chaves(v_item, array['frase', 'foto'])
           or not public.site_texto_ok(v_item->'frase', 140) then
          return 'nossos momentos: cena inválida';
        end if;
        if not public.site_foto_ok(v_item->'foto', p_event_id) then
          return 'foto inválida';
        end if;
        v_fotos := v_fotos + case when jsonb_typeof(v_item->'foto') = 'string' then 1 else 0 end;
      end loop;

    elsif v_tipo = 'local' then
      if not public.site_so_chaves(v_c, array['foto']) then
        return 'o local: conteúdo inválido';
      end if;
      if not public.site_foto_ok(v_c->'foto', p_event_id) then
        return 'foto inválida';
      end if;
      v_fotos := v_fotos + case when jsonb_typeof(v_c->'foto') = 'string' then 1 else 0 end;

    elsif v_tipo = 'dress_code' then
      if not public.site_so_chaves(v_c, array['fotos']) then
        return 'o que vestir: conteúdo inválido';
      end if;
      if not public.site_fotos_ok(v_c->'fotos', 3, p_event_id) then
        return 'o que vestir: até 3 fotos';
      end if;
      v_fotos := v_fotos + coalesce(jsonb_array_length(v_c->'fotos'), 0);

    elsif v_tipo = 'galeria' then
      if not public.site_so_chaves(v_c, array['frase', 'fotos']) then
        return 'galeria: conteúdo inválido';
      end if;
      if not public.site_texto_ok(v_c->'frase', 160) then
        return 'galeria: frase até 160 letras';
      end if;
      if not public.site_fotos_ok(v_c->'fotos', 12, p_event_id) then
        return 'galeria: até 12 fotos';
      end if;
      v_fotos := v_fotos + coalesce(jsonb_array_length(v_c->'fotos'), 0);

    elsif v_tipo = 'especiais' then
      if not public.site_so_chaves(v_c, array['pares']) then
        return 'padrinhos: conteúdo inválido';
      end if;
      if not public.site_lista_ok(v_c->'pares', 12) then
        return 'padrinhos: até 12 pares';
      end if;
      for v_item in select * from jsonb_array_elements(coalesce(v_c->'pares', '[]'::jsonb)) loop
        if not public.site_so_chaves(v_item, array['nomes', 'fotos'])
           or not public.site_texto_ok(v_item->'nomes', 60) then
          return 'padrinhos: par inválido';
        end if;
        if not public.site_fotos_ok(v_item->'fotos', 2, p_event_id) then
          return 'padrinhos: até 2 fotos por par';
        end if;
        v_fotos := v_fotos + coalesce(jsonb_array_length(v_item->'fotos'), 0);
      end loop;

    elsif v_tipo = 'presentes' then
      -- o valor é o que a fatia C cobra, lido da fotografia pelo id: o id
      -- é obrigatório e não repete em NENHUM bloco de presentes; o valor,
      -- quando vem, é inteiro em centavos de R$ 50 a R$ 50.000
      if not public.site_so_chaves(v_c, array['itens']) then
        return 'presentes: conteúdo inválido';
      end if;
      if not public.site_lista_ok(v_c->'itens', 24) then
        return 'presentes: até 24 itens';
      end if;
      for v_item in select * from jsonb_array_elements(coalesce(v_c->'itens', '[]'::jsonb)) loop
        if not public.site_so_chaves(v_item, array['id', 'titulo', 'descricao', 'valor_centavos', 'foto'])
           or jsonb_typeof(v_item->'id') is distinct from 'string'
           or v_item->>'id' !~ '^[a-z0-9-]{1,40}$'
           or not public.site_texto_ok(v_item->'titulo', 60)
           or not public.site_texto_ok(v_item->'descricao', 160) then
          return 'presentes: item inválido';
        end if;
        if v_item->>'id' = any (v_ids) then
          return 'presentes: item repetido';
        end if;
        v_ids := v_ids || (v_item->>'id');
        -- ifs aninhados: o cast só roda depois de saber que é número
        if v_item ? 'valor_centavos' then
          if jsonb_typeof(v_item->'valor_centavos') <> 'number' then
            return 'presentes: valor de R$ 50 a R$ 50.000';
          end if;
          if (v_item->>'valor_centavos')::numeric <> trunc((v_item->>'valor_centavos')::numeric)
             or (v_item->>'valor_centavos')::numeric not between 5000 and 5000000 then
            return 'presentes: valor de R$ 50 a R$ 50.000';
          end if;
        end if;
        if not public.site_foto_ok(v_item->'foto', p_event_id) then
          return 'foto inválida';
        end if;
        v_fotos := v_fotos + case when jsonb_typeof(v_item->'foto') = 'string' then 1 else 0 end;
      end loop;

    elsif v_tipo = 'jeito' then
      if not public.site_so_chaves(v_c, array['frases']) then
        return 'nosso jeito: conteúdo inválido';
      end if;
      if not public.site_lista_ok(v_c->'frases', 8) then
        return 'nosso jeito: até 8 frases de até 80 letras';
      end if;
      if exists (select 1 from jsonb_array_elements(coalesce(v_c->'frases', '[]'::jsonb)) f
                  where not public.site_texto_ok(f, 80)) then
        return 'nosso jeito: até 8 frases de até 80 letras';
      end if;

    elsif v_tipo = 'rsvp' then
      if not public.site_so_chaves(v_c, array['prazo', 'menu']) then
        return 'confirmação: conteúdo inválido';
      end if;
      if not public.site_lista_ok(v_c->'menu', 6) then
        return 'confirmação: até 6 opções de menu de até 60 letras';
      end if;
      if exists (select 1 from jsonb_array_elements(coalesce(v_c->'menu', '[]'::jsonb)) m
                  where not public.site_texto_ok(m, 60)) then
        return 'confirmação: até 6 opções de menu de até 60 letras';
      end if;
      if v_c->'prazo' is not null and jsonb_typeof(v_c->'prazo') <> 'null' then
        if jsonb_typeof(v_c->'prazo') <> 'string'
           or v_c->>'prazo' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
          return 'confirmação: prazo inválido';
        end if;
        begin
          if to_char((v_c->>'prazo')::date, 'YYYY-MM-DD') <> v_c->>'prazo' then
            return 'confirmação: prazo inválido';
          end if;
        exception when others then
          return 'confirmação: prazo inválido';
        end;
      end if;

    else
      -- os outros blocos leem as colunas ou o evento: conteúdo não entra
      return 'conteúdo do bloco inválido';
    end if;
  end loop;

  if v_fotos > 60 then
    return 'o site passou de 60 fotos — tire algumas';
  end if;

  if p_tema is null or jsonb_typeof(p_tema) <> 'object' then
    return 'tema inválido';
  end if;
  for v_chave, v_valor in select * from jsonb_each(p_tema) loop
    if v_chave = 'modelo' then
      if jsonb_typeof(v_valor) <> 'string' or not (v_valor #>> '{}' = any (v_modelos)) then
        return 'modelo inválido';
      end if;
    elsif v_chave = 'cores' then
      if jsonb_typeof(v_valor) <> 'object'
         or exists (select 1 from jsonb_each(v_valor) c
                    where c.key not in ('fundo', 'superficie', 'tinta', 'suave', 'acento')
                       or jsonb_typeof(c.value) <> 'string'
                       or c.value #>> '{}' !~ v_hex) then
        return 'cor inválida: use o formato #rrggbb';
      end if;
    elsif v_chave = 'fontes' then
      -- os 8 pares (src/lib/site-pares.ts) cabem aqui; par desconhecido
      -- cai no padrão do modelo na tela
      if jsonb_typeof(v_valor) <> 'string' or v_valor #>> '{}' !~ '^[a-z0-9-]{1,30}$' then
        return 'fontes inválidas';
      end if;
    elsif v_chave = 'nome' then
      if jsonb_typeof(v_valor) <> 'string'
         or not (v_valor #>> '{}' in ('nomes', 'iniciais', 'iniciais-nomes')) then
        return 'forma do nome inválida';
      end if;
    elsif v_chave = 'abertura' then
      if jsonb_typeof(v_valor) <> 'boolean' then
        return 'abertura inválida';
      end if;
    elsif v_chave = 'paleta' then
      -- paleta que o modelo não tem cai na padrão (site-paletas.ts)
      if jsonb_typeof(v_valor) <> 'string' or v_valor #>> '{}' !~ '^[a-z0-9-]{1,30}$' then
        return 'paleta inválida';
      end if;
    else
      return 'tema inválido';
    end if;
  end loop;

  return null;
end $$;

revoke all on function public.site_texto_ok(jsonb, int) from public, anon, authenticated;
revoke all on function public.site_foto_ok(jsonb, uuid) from public, anon, authenticated;
revoke all on function public.site_fotos_ok(jsonb, int, uuid) from public, anon, authenticated;
revoke all on function public.site_lista_ok(jsonb, int) from public, anon, authenticated;
revoke all on function public.site_so_chaves(jsonb, text[]) from public, anon, authenticated;
revoke all on function public.site_itens_de_presente(jsonb) from public, anon, authenticated;
revoke all on function public.site_erro_da_estrutura(uuid, jsonb, jsonb) from public, anon, authenticated;

-- ------------------------------------------------------------
-- 3) A _BASE: o corpo da 186 com a regra nova
-- ------------------------------------------------------------
-- Quem chama é o embrulho da 189 (portal_pode_fazer 'escrever'). A
-- conferência de "é do evento" fica, como sempre esteve.
-- Os itens de presente (título, descrição, valor que a fatia C cobra)
-- seguem a régua que a 190 põe na chave Pix, no titular e no link: só
-- 'gestao' (o casal) muda. O editor reenvia a estrutura inteira a cada
-- salvamento, por isso a trava compara com o que está salvo: reenviar os
-- mesmos itens passa (mãe e padrinho mexem no resto do site), mudar
-- exige a área. 'for update': a comparação e a gravação veem a mesma
-- linha.
create or replace function public.portal_salvar_estrutura_site_base(
  p_event_id  uuid,
  p_estrutura jsonb,
  p_tema      jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_erro   text;
  v_salvos jsonb;
begin
  if not public.sou_cliente_do_evento(p_event_id) then
    raise exception 'sem permissão para este evento';
  end if;

  v_erro := public.site_erro_da_estrutura(p_event_id, p_estrutura, p_tema);
  if v_erro is not null then
    raise exception '%', v_erro;
  end if;

  -- toda foto da estrutura já precisa ESTAR no balde: um caminho só
  -- reservado (a URL de envio ainda valendo) subiria depois da aprovação
  -- do dono. O arquivo que existe não muda (sem upsert, sem policy de
  -- update ou delete), então o que se salva é o que o dono revisa.
  -- Os cinco caminhos são todos os lugares onde a régua aceita foto.
  if exists (
    select 1
      from (select jsonb_path_query(p_estrutura, 'lax $[*].conteudo.foto') as f
            union all select jsonb_path_query(p_estrutura, 'lax $[*].conteudo.fotos[*]')
            union all select jsonb_path_query(p_estrutura, 'lax $[*].conteudo.marcos[*].foto')
            union all select jsonb_path_query(p_estrutura, 'lax $[*].conteudo.itens[*].foto')
            union all select jsonb_path_query(p_estrutura, 'lax $[*].conteudo.pares[*].fotos[*]')) x
     where jsonb_typeof(x.f) = 'string'
       and not exists (select 1 from storage.objects o
                        where o.bucket_id = 'site' and o.name = x.f #>> '{}')
  ) then
    raise exception 'uma foto ainda não terminou de subir — envie de novo';
  end if;

  select public.site_itens_de_presente(s.estrutura) into v_salvos
    from public.evento_site s
   where s.event_id = p_event_id
     for update;
  if public.site_itens_de_presente(p_estrutura) is distinct from coalesce(v_salvos, '[]'::jsonb)
     and not public.portal_pode_fazer(p_event_id, 'gestao') then   -- ou 'presentes': decisão do dono, como na 190
    raise exception 'A chave Pix e a lista de presentes são do casal.';
  end if;

  insert into public.evento_site (event_id, atualizado_por)
  values (p_event_id, auth.uid())
  on conflict (event_id) do nothing;

  update public.evento_site
     set estrutura      = p_estrutura,
         tema           = p_tema,
         atualizado_por = auth.uid(),
         updated_at     = now()
   where event_id = p_event_id;
end $$;

-- como a 189 deixou: a _base sem grant para ninguém
revoke all on function public.portal_salvar_estrutura_site_base(uuid, jsonb, jsonb) from public, anon, authenticated;

-- ------------------------------------------------------------
-- 4) O BALDE 'site'
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site', 'site', false, 3145728, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set name               = 'site',
      public             = false,
      file_size_limit    = 3145728,
      allowed_mime_types = array['image/jpeg', 'image/webp'];

-- nenhuma policy para quem entra: subir e ler é por URL assinada que o
-- servidor emite. Se uma execução de rascunho criou alguma, sai.
drop policy if exists "site_fotos_ver"    on storage.objects;
drop policy if exists "site_fotos_subir"  on storage.objects;
drop policy if exists "site_fotos_trocar" on storage.objects;
drop policy if exists "site_fotos_apagar" on storage.objects;

-- ------------------------------------------------------------
-- 5) A PÁGINA MONTADA: endereço, prazo e menu
-- ------------------------------------------------------------
-- O corpo da 185, com duas mudanças:
--   · evento.endereco: o do espaço, ao vivo como o local (é da
--     cerimonialista; a noiva não edita) — mas SÓ quando o conteúdo
--     recebido (a fotografia aprovada) é de um dos 6 modelos novos, que
--     desenham o endereço, e tem o bloco 'local' visível. O "Convite" não
--     desenha endereço: os sites já no ar não passam a mandá-lo ao
--     navegador sem uma revisão nova que escolha um modelo novo;
--   · rsvp.prazo e rsvp.menu: os do bloco rsvp do conteúdo recebido e,
--     quando o bloco não tem (prazo nulo ou ausente; menu ausente, vazio
--     ou só com opções em branco), as colunas de antes. A mesma regra
--     nos dois: vazio = usa a coluna. As opções saem aparadas, sem as
--     em branco.
create or replace function public.site_montado(p_event_id uuid, p_conteudo jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'evento', (
      select json_build_object(
        'tipo', e.type::text,
        'anfitrioes', coalesce(nullif(trim(e.name), ''), 'os anfitriões'),
        'data', e.date, 'hora', e.time,
        'local', e.location, 'cidade', e.city,
        'endereco', case
          when p_conteudo->'tema'->>'modelo' in
                 ('classico', 'aliancas', 'cartoes', 'monograma', 'franca', 'violino')
           and exists (select 1
                         from jsonb_array_elements(
                                case when jsonb_typeof(p_conteudo->'estrutura') = 'array'
                                     then p_conteudo->'estrutura' else '[]'::jsonb end) b
                        where b->>'tipo' = 'local'
                          and b->'visivel' is distinct from 'false'::jsonb)
          then (
            select nullif(btrim(esp.endereco), '')
            from public.espacos esp
            where esp.id = e.espaco_id and esp.empresa_id = e.empresa_id
          ) end,
        'capa_url', e.cover_image_url
      )
      from public.events e where e.id = s.event_id
    ),
    'empresa', (
      select json_build_object('nome', emp.nome, 'logo_url', emp.logo_url)
      from public.events e
      join public.empresas emp on emp.id = e.empresa_id
      where e.id = s.event_id
    ),
    'site', p_conteudo,
    'cores', json_build_object(
      'acento', s.cor_acento, 'tinta', s.cor_tinta, 'fundo', s.cor_fundo
    ),
    'paleta', (
      select json_agg(json_build_object(
               'nome', c.nome, 'papel', c.papel, 'hex', c.hex)
             order by c.ordem)
      from public.evento_guia_estilo g
      join public.evento_guia_cor c on c.guia_id = g.id
      where g.event_id = s.event_id
        and g.situacao in ('aprovado', 'alterado')
    ),
    'espaco', (
      select json_build_object(
        'transporte', esp.transporte,
        'hospedagens', (
          select json_agg(json_build_object(
                   'nome', h.nome, 'distancia', h.distancia,
                   'faixa_preco', h.faixa_preco, 'nota', h.nota,
                   'link', h.link)
                 order by h.ordem, h.nome)
          from public.espaco_hospedagem h
          where h.espaco_id = esp.id
            and h.empresa_id = esp.empresa_id
        )
      )
      from public.events e
      join public.espacos esp
        on esp.id = e.espaco_id and esp.empresa_id = e.empresa_id
      where e.id = s.event_id
    ),
    'rsvp', (
      select jsonb_build_object(
               'aberto', e.rsvp_aberto is not false,
               'hash', e.rsvp_hash,
               'prazo', coalesce(
                  case when jsonb_typeof(r.c->'prazo') = 'string'
                            and r.c->>'prazo' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                       then r.c->'prazo' end,
                  to_jsonb(s.rsvp_prazo)),
               'menu', coalesce(
                  (select jsonb_agg(btrim(m.v) order by m.n)
                     from jsonb_array_elements_text(
                            case when jsonb_typeof(r.c->'menu') = 'array'
                                 then r.c->'menu' else '[]'::jsonb end
                          ) with ordinality m(v, n)
                    where btrim(m.v) <> ''),
                  to_jsonb(s.menu_opcoes)))
      from public.events e
      left join lateral (
        select x.b->'conteudo' as c
          from jsonb_array_elements(
                 case when jsonb_typeof(p_conteudo->'estrutura') = 'array'
                      then p_conteudo->'estrutura' else '[]'::jsonb end
               ) with ordinality x(b, n)
         where x.b->>'tipo' = 'rsvp'
         order by x.n
         limit 1
      ) r on true
      where e.id = s.event_id
    ),
    'blocos', json_build_object(
      'album', s.album_aberto,
      'playlist', s.playlist_aberta,
      'recados', s.recados_aberto
    ),
    'album', case when s.album_aberto then (
      select json_agg(json_build_object('path', f.storage_path, 'autor', f.autor)
             order by f.created_at desc)
      from (select * from public.evento_album_foto
            where event_id = s.event_id and not oculta
            order by created_at desc limit 120) f
    ) else null end,
    'recados', case when s.recados_aberto then (
      select json_agg(json_build_object('nome', r.nome, 'texto', r.texto)
             order by r.created_at desc)
      from (select * from public.evento_recado
            where event_id = s.event_id and not oculto
            order by created_at desc limit 60) r
    ) else null end,
    'slug_atual', (select slug from public.site_slugs
                   where event_id = s.event_id and atual),
    'indexavel', s.indexavel
  )
  from public.evento_site s
  where s.event_id = p_event_id
$$;

revoke all on function public.site_montado(uuid, jsonb) from public, anon, authenticated;

-- ------------------------------------------------------------
-- 6) O QUE O ANÔNIMO RECEBE: só o conteúdo do que aparece
-- ------------------------------------------------------------
-- A fotografia aprovada guarda o site inteiro, inclusive o que o casal
-- escondeu com o olho e o que o modelo escolhido não desenha. O
-- convidado não vê, mas o navegador dele receberia (a página serializa os
-- dados, e a RPC abre para a chave pública). Aqui o bloco fica e só sai
-- o 'conteudo' (sem o bloco, a tela recriaria o tipo como visível):
--   · bloco escondido (visivel = false);
--   · modelo 'convite' (ou sem modelo): ele só lê o conteúdo do texto
--     livre — o resto ele tira das colunas;
--   · 'cenas' fora do Monograma, 'jeito' fora do Clássico e das Alianças
--     (espelha MODELOS[*].desenha em src/lib/site-modelos.ts; o texto
--     livre e os blocos de hoje os modelos novos desenham no estilo deles).
-- E as colunas de cada bloco escondido saem nulas quando não há nenhum
-- bloco visível do mesmo tipo: a chave Pix costuma ser CPF ou telefone.
-- Com a estrutura vazia vale a ordem padrão (tudo visível): nada sai.
-- A prévia da noiva e a revisão do dono usam site_montado direto, com
-- tudo; esta régua vale só para a site_publico.
create or replace function public.site_so_o_que_aparece(p_conteudo jsonb)
returns jsonb
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_conteudo is null or coalesce(jsonb_typeof(p_conteudo->'estrutura'), '') <> 'array'
      then p_conteudo
    else
      jsonb_set(p_conteudo, '{estrutura}', coalesce((
        select jsonb_agg(
                 case
                   when jsonb_typeof(x.b) <> 'object' then x.b
                   when x.b->'visivel' = 'false'::jsonb
                     or (coalesce(p_conteudo->'tema'->>'modelo', '') not in
                           ('classico', 'aliancas', 'cartoes', 'monograma', 'franca', 'violino')
                         and x.b->>'tipo' is distinct from 'texto')
                     or (x.b->>'tipo' = 'cenas'
                         and p_conteudo->'tema'->>'modelo' is distinct from 'monograma')
                     or (x.b->>'tipo' = 'jeito'
                         and coalesce(p_conteudo->'tema'->>'modelo', '') not in ('classico', 'aliancas'))
                   then x.b - 'conteudo'
                   else x.b
                 end
                 order by x.n)
          from jsonb_array_elements(p_conteudo->'estrutura') with ordinality x(b, n)
      ), '[]'::jsonb))
      || (select coalesce(jsonb_object_agg(c.k, null::jsonb), '{}'::jsonb)
            from (values ('presentes', 'pix_chave'), ('presentes', 'pix_titular'),
                         ('presentes', 'presentes_link'), ('presentes', 'presentes_texto'),
                         ('historia', 'historia'), ('historia', 'historia_titulo'),
                         ('historia', 'foto_casal_path'),
                         ('dress_code', 'dress_code'), ('dress_code', 'dress_code_titulo'),
                         ('mensagem', 'mensagem')) c(tipo, k)
           where exists (select 1 from jsonb_array_elements(p_conteudo->'estrutura') b
                          where b->>'tipo' = c.tipo and b->'visivel' = 'false'::jsonb)
             and not exists (select 1 from jsonb_array_elements(p_conteudo->'estrutura') b
                              where b->>'tipo' = c.tipo
                                and b->'visivel' is distinct from 'false'::jsonb))
      -- os modelos novos só desenham fotos do balde 'site', que passam
      -- pela régua (a foto já precisa estar lá) e pela revisão; a foto do
      -- casal de antes (balde 'inspiracoes', que aceita troca) não vai
      || case when p_conteudo->'tema'->>'modelo' in
                ('classico', 'aliancas', 'cartoes', 'monograma', 'franca', 'violino')
              then '{"foto_casal_path": null}'::jsonb
              else '{}'::jsonb end
  end
$$;

revoke all on function public.site_so_o_que_aparece(jsonb) from public, anon, authenticated;

-- o corpo da 185, trocando só a chave 'site' pela versão limpa
create or replace function public.site_publico(p_ref text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with alvo as (
    select e.id as event_id, false as por_slug, null::text as slug_usado
    from public.events e
    where e.rsvp_hash = p_ref
    union all
    select s.event_id, true, s.slug
    from public.site_slugs s
    where s.slug = lower(p_ref)
    limit 1
  ),
  s as (
    select es.event_id as ev_id, es.publicado_conteudo, a.por_slug, a.slug_usado
    from alvo a
    join public.evento_site es on es.event_id = a.event_id
    where es.publicado
  )
  select (
    public.site_montado(s.ev_id, s.publicado_conteudo)
    || jsonb_build_object('site', public.site_so_o_que_aparece(s.publicado_conteudo))
    -- o álbum e o mural escondidos: as fotos e os recados dos convidados
    -- não vão (a chave do site continua ligada; o olho é do bloco)
    || (select coalesce(jsonb_object_agg(c.k, null::jsonb), '{}'::jsonb)
          from (values ('album', 'album'), ('mural', 'recados')) c(tipo, k)
         where jsonb_typeof(s.publicado_conteudo->'estrutura') = 'array'
           and exists (select 1 from jsonb_array_elements(s.publicado_conteudo->'estrutura') b
                        where b->>'tipo' = c.tipo and b->'visivel' = 'false'::jsonb)
           and not exists (select 1 from jsonb_array_elements(s.publicado_conteudo->'estrutura') b
                            where b->>'tipo' = c.tipo
                              and b->'visivel' is distinct from 'false'::jsonb))
    || jsonb_build_object(
         'ref_e_slug_antigo',
         (s.por_slug and s.slug_usado is distinct from
            (select slug from public.site_slugs where event_id = s.ev_id and atual)))
  )::json
  from s
$$;

revoke all on function public.site_publico(text) from public;
grant execute on function public.site_publico(text) to anon, authenticated;

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
-- As estruturas de exemplo usam um evento inventado (…0191) e uma foto
-- dele; '@F' vira o caminho da foto.
with ex as (
  select '00000000-0000-4000-8000-000000000191'::uuid as ev,
         '00000000-0000-4000-8000-000000000191/11111111-1111-4111-8111-111111111111.jpg' as f,
         '00000000-0000-4000-8000-000000000999/11111111-1111-4111-8111-111111111111.jpg' as f_outro
),
completo as (
  select replace($j$[
    {"id": "capa", "tipo": "capa", "conteudo": {"nome1": "Ana", "nome2": "Bia", "frase": "Vamos casar", "foto": "@F", "mascara": 35}},
    {"id": "historia", "tipo": "historia", "conteudo": {"foto": "@F", "marcos": [
      {"ano": "2019", "cidade": "Rio", "curto": "O café", "titulo": "Onde tudo começou", "texto": "…", "icone": "cafe", "foto": "@F"},
      {"titulo": "O pedido", "icone": null, "foto": null}]}},
    {"id": "momentos", "tipo": "momentos", "conteudo": {"itens": [{"rotulo": "Cerimônia", "hora": "16:30", "nota": "Na capela"}, {"rotulo": "Festa", "hora": "23:59"}]}},
    {"id": "cenas", "tipo": "cenas", "conteudo": {"itens": [{"frase": "A primeira viagem", "foto": "@F"}]}},
    {"id": "local", "tipo": "local", "conteudo": {"foto": "@F"}},
    {"id": "dress-code", "tipo": "dress_code", "conteudo": {"fotos": ["@F", "@F", "@F"]}},
    {"id": "rsvp", "tipo": "rsvp", "conteudo": {"prazo": "2026-11-30", "menu": ["Carne", "Peixe", "Vegetariano"]}},
    {"id": "presentes", "tipo": "presentes", "conteudo": {"itens": [
      {"id": "jantar-em-paris", "titulo": "Jantar", "descricao": "Na lua de mel", "valor_centavos": 15000, "foto": "@F"},
      {"id": "cota-1", "titulo": "Cota", "valor_centavos": 5000},
      {"id": "teto", "valor_centavos": 5000000.0}]}},
    {"id": "galeria", "tipo": "galeria", "conteudo": {"frase": "Nós", "fotos": ["@F", "@F"]}},
    {"id": "especiais", "tipo": "especiais", "conteudo": {"pares": [{"nomes": "Caio e Duda", "fotos": ["@F", "@F"]}]}},
    {"id": "jeito", "tipo": "jeito", "conteudo": {"frases": ["Café antes de tudo", "Domingo é sagrado"]}},
    {"id": "texto-1", "tipo": "texto", "conteudo": {"titulo": "Recado", "texto": "Venham!"}},
    {"id": "album", "tipo": "album", "visivel": false},
    {"id": "rodape", "tipo": "rodape"}
  ]$j$, '@F', (select f from ex))::jsonb as e
),
recusados(caso, estrutura, tema) as (
  select x.caso, replace(x.estrutura, '@F', (select f from ex))::jsonb, x.tema::jsonb
    from (values
      ('tipo desconhecido',        '[{"tipo": "carrossel"}]', '{}'),
      ('capa escondida',           '[{"tipo": "capa", "visivel": false}]', '{}'),
      ('rodapé escondido',         '[{"tipo": "rodape", "visivel": false}]', '{}'),
      ('chave desconhecida',       '[{"tipo": "capa", "conteudo": {"titulo": "x"}}]', '{}'),
      ('número no lugar de texto', '[{"tipo": "capa", "conteudo": {"nome1": 5}}]', '{}'),
      ('nome com 41 letras',       '[{"tipo": "capa", "conteudo": {"nome1": "' || repeat('a', 41) || '"}}]', '{}'),
      ('conteúdo em lista',        '[{"tipo": "capa", "conteudo": ["x"]}]', '{}'),
      ('máscara acima de 80',      '[{"tipo": "capa", "conteudo": {"mascara": 81}}]', '{}'),
      ('máscara negativa',         '[{"tipo": "capa", "conteudo": {"mascara": -5}}]', '{}'),
      ('máscara quebrada',         '[{"tipo": "capa", "conteudo": {"mascara": 35.5}}]', '{}'),
      ('máscara em texto',         '[{"tipo": "capa", "conteudo": {"mascara": "35"}}]', '{}'),
      ('11 marcos',                '[{"tipo": "historia", "conteudo": {"marcos": [' || rtrim(repeat('{"titulo": "x"},', 11), ',') || ']}}]', '{}'),
      ('ícone fora da lista',      '[{"tipo": "historia", "conteudo": {"marcos": [{"icone": "estrela"}]}}]', '{}'),
      ('marco que não é objeto',   '[{"tipo": "historia", "conteudo": {"marcos": ["x"]}}]', '{}'),
      ('marcos em objeto',         '[{"tipo": "historia", "conteudo": {"marcos": {"a": 1}}}]', '{}'),
      ('título e texto na história (ficam nas colunas)', '[{"tipo": "historia", "conteudo": {"titulo": "x"}}]', '{}'),
      ('foto da história de outro evento', '[{"tipo": "historia", "conteudo": {"foto": "' || (select f_outro from ex) || '"}}]', '{}'),
      ('hora 24:00',               '[{"tipo": "momentos", "conteudo": {"itens": [{"rotulo": "x", "hora": "24:00"}]}}]', '{}'),
      ('hora 7:30',                '[{"tipo": "momentos", "conteudo": {"itens": [{"rotulo": "x", "hora": "7:30"}]}}]', '{}'),
      ('9 momentos',               '[{"tipo": "momentos", "conteudo": {"itens": [' || rtrim(repeat('{"rotulo": "x"},', 9), ',') || ']}}]', '{}'),
      ('cena com 141 letras',      '[{"tipo": "cenas", "conteudo": {"itens": [{"frase": "' || repeat('a', 141) || '"}]}}]', '{}'),
      ('foto de outro evento',     '[{"tipo": "local", "conteudo": {"foto": "' || (select f_outro from ex) || '"}}]', '{}'),
      ('foto .png',                '[{"tipo": "local", "conteudo": {"foto": "' || replace((select f from ex), '.jpg', '.png') || '"}}]', '{}'),
      ('foto em pasta solta',      '[{"tipo": "local", "conteudo": {"foto": "../@F"}}]', '{}'),
      ('4 fotos do traje',         '[{"tipo": "dress_code", "conteudo": {"fotos": ["@F", "@F", "@F", "@F"]}}]', '{}'),
      ('título no traje (fica na coluna)', '[{"tipo": "dress_code", "conteudo": {"titulo": "x"}}]', '{}'),
      ('fotos em objeto',          '[{"tipo": "galeria", "conteudo": {"fotos": {"a": "@F"}}}]', '{}'),
      ('13 fotos na galeria',      '[{"tipo": "galeria", "conteudo": {"fotos": [' || rtrim(repeat('"@F",', 13), ',') || ']}}]', '{}'),
      ('par com 3 fotos',          '[{"tipo": "especiais", "conteudo": {"pares": [{"nomes": "x", "fotos": ["@F", "@F", "@F"]}]}}]', '{}'),
      ('presente sem id',          '[{"tipo": "presentes", "conteudo": {"itens": [{"titulo": "x", "valor_centavos": 10000}]}}]', '{}'),
      ('id de presente repetido',  '[{"tipo": "presentes", "conteudo": {"itens": [{"id": "a", "valor_centavos": 10000}, {"id": "a", "valor_centavos": 10000}]}}]', '{}'),
      ('id repetido em dois blocos de presentes', '[{"tipo": "presentes", "conteudo": {"itens": [{"id": "a", "valor_centavos": 5000}]}}, {"tipo": "presentes", "conteudo": {"itens": [{"id": "a", "valor_centavos": 500000}]}}]', '{}'),
      ('hora em número',           '[{"tipo": "momentos", "conteudo": {"itens": [{"rotulo": "x", "hora": 1630}]}}]', '{}'),
      ('id com maiúscula',         '[{"tipo": "presentes", "conteudo": {"itens": [{"id": "Jantar"}]}}]', '{}'),
      ('valor abaixo de R$ 50',    '[{"tipo": "presentes", "conteudo": {"itens": [{"id": "a", "valor_centavos": 4999}]}}]', '{}'),
      ('valor acima de R$ 50 mil', '[{"tipo": "presentes", "conteudo": {"itens": [{"id": "a", "valor_centavos": 5000001}]}}]', '{}'),
      ('valor quebrado',           '[{"tipo": "presentes", "conteudo": {"itens": [{"id": "a", "valor_centavos": 15000.5}]}}]', '{}'),
      ('valor em texto',           '[{"tipo": "presentes", "conteudo": {"itens": [{"id": "a", "valor_centavos": "15000"}]}}]', '{}'),
      ('chave Pix na estrutura',   '[{"tipo": "presentes", "conteudo": {"pix_chave": "x"}}]', '{}'),
      ('25 presentes',             '[{"tipo": "presentes", "conteudo": {"itens": [' || (select string_agg('{"id": "p' || g || '"}', ',') from generate_series(1, 25) g) || ']}}]', '{}'),
      ('frase do jeito com 81',    '[{"tipo": "jeito", "conteudo": {"frases": ["' || repeat('a', 81) || '"]}}]', '{}'),
      ('frase do jeito em número', '[{"tipo": "jeito", "conteudo": {"frases": [1]}}]', '{}'),
      ('9 frases do jeito',        '[{"tipo": "jeito", "conteudo": {"frases": [' || rtrim(repeat('"x",', 9), ',') || ']}}]', '{}'),
      ('prazo 30/02',              '[{"tipo": "rsvp", "conteudo": {"prazo": "2026-02-30"}}]', '{}'),
      ('prazo fora do formato',    '[{"tipo": "rsvp", "conteudo": {"prazo": "30/11/2026"}}]', '{}'),
      ('7 opções de menu',         '[{"tipo": "rsvp", "conteudo": {"menu": [' || rtrim(repeat('"x",', 7), ',') || ']}}]', '{}'),
      ('conteúdo na contagem',     '[{"tipo": "contagem", "conteudo": {}}]', '{}'),
      ('texto livre com 121',      '[{"tipo": "texto", "conteudo": {"titulo": "' || repeat('a', 121) || '"}}]', '{}'),
      ('61 fotos somadas',         '[' || rtrim(repeat('{"tipo": "galeria", "conteudo": {"fotos": [' || rtrim(repeat('"@F",', 12), ',') || ']}},', 5), ',')
                                     || ', {"tipo": "local", "conteudo": {"foto": "@F"}}]', '{}'),
      ('modelo desconhecido',      '[]', '{"modelo": "romantico"}'),
      ('forma do nome desconhecida', '[]', '{"nome": "apelido"}'),
      ('abertura em texto',        '[]', '{"abertura": "sim"}'),
      ('paleta fora do formato',   '[]', '{"paleta": "Marfim!"}'),
      ('fontes fora do formato',   '[]', '{"fontes": "Comic Sans"}'),
      ('cor curta',                '[]', '{"cores": {"acento": "#fff"}}'),
      ('chave de tema desconhecida', '[]', '{"extra": true}')
    ) x(caso, estrutura, tema)
)
select 'a _base tem a mesma assinatura, security definer e search_path, usa a regra nova, trava os presentes em gestao e exige a foto no balde' as item,
       coalesce((select p.prosecdef
                        and p.prorettype = 'void'::regtype
                        and 'search_path=public' = any (p.proconfig)
                        and p.prosrc like '%sou_cliente_do_evento%'
                        and p.prosrc like '%site_erro_da_estrutura(p_event_id, p_estrutura, p_tema)%'
                        and p.prosrc like '%site_itens_de_presente(p_estrutura)%'
                        and p.prosrc like '%portal_pode_fazer(p_event_id, ''gestao'')%'
                        and p.prosrc like '%storage.objects%'
                        and p.prosrc like '%conteudo.pares[*].fotos[*]%'
                   from pg_proc p
                  where p.oid = to_regprocedure('public.portal_salvar_estrutura_site_base(uuid, jsonb, jsonb)')), false) as ok
union all
select 'o embrulho da 189 continua embrulho (confere o nível e chama a _base)',
       coalesce((select p.prosrc like '%portal_pode_fazer(p_event_id, ''escrever'')%'
                        and p.prosrc like '%portal_salvar_estrutura_site_base(%'
                        and p.prosrc not like '%site_erro_da_estrutura%'
                   from pg_proc p
                  where p.oid = to_regprocedure('public.portal_salvar_estrutura_site(uuid, jsonb, jsonb)')), false)
       and has_function_privilege('authenticated', 'public.portal_salvar_estrutura_site(uuid, jsonb, jsonb)', 'execute')
       and not has_function_privilege('anon', 'public.portal_salvar_estrutura_site(uuid, jsonb, jsonb)', 'execute')
union all
select 'a _base e as peças da regra estão fechadas para a sessão e para o anon',
       not has_function_privilege('authenticated', 'public.portal_salvar_estrutura_site_base(uuid, jsonb, jsonb)', 'execute')
       and not has_function_privilege('anon', 'public.portal_salvar_estrutura_site_base(uuid, jsonb, jsonb)', 'execute')
       and not has_function_privilege('authenticated', 'public.site_erro_da_estrutura(uuid, jsonb, jsonb)', 'execute')
       and not has_function_privilege('anon', 'public.site_erro_da_estrutura(uuid, jsonb, jsonb)', 'execute')
       and not has_function_privilege('authenticated', 'public.site_texto_ok(jsonb, int)', 'execute')
       and not has_function_privilege('authenticated', 'public.site_foto_ok(jsonb, uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.site_fotos_ok(jsonb, int, uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.site_lista_ok(jsonb, int)', 'execute')
       and not has_function_privilege('authenticated', 'public.site_so_chaves(jsonb, text[])', 'execute')
       and not has_function_privilege('authenticated', 'public.site_itens_de_presente(jsonb)', 'execute')
       and not has_function_privilege('anon', 'public.site_itens_de_presente(jsonb)', 'execute')
union all
select 'aceita o site completo dos modelos (cenas e jeito incluídos) e o vazio',
       public.site_erro_da_estrutura((select ev from ex), (select e from completo),
         '{"modelo": "classico", "fontes": "caligrafia", "nome": "iniciais-nomes", "abertura": true, "paleta": "marfim", "cores": {"acento": "#aabbcc"}}'::jsonb) is null
       and public.site_erro_da_estrutura((select ev from ex), '[]'::jsonb, '{}'::jsonb) is null
       -- item da programação ainda sem horário (hora ausente, nula ou vazia)
       and public.site_erro_da_estrutura((select ev from ex),
         '[{"tipo": "momentos", "conteudo": {"itens": [{"rotulo": "Festa", "hora": "", "nota": ""}, {"rotulo": "Bolo", "hora": null}, {"rotulo": "Valsa"}]}}]'::jsonb,
         '{}'::jsonb) is null
       -- o que o editor de hoje grava (texto livre e blocos sem conteúdo)
       and public.site_erro_da_estrutura((select ev from ex),
         '[{"id": "capa", "tipo": "capa"}, {"id": "texto-abc", "tipo": "texto", "conteudo": {"titulo": "", "texto": ""}}, {"id": "rodape", "tipo": "rodape", "visivel": true}]'::jsonb,
         '{"cores": {"fundo": "#ffffff", "tinta": "#222222", "acento": "#aa8855"}}'::jsonb) is null
union all
select 'aceita 60 fotos e recusa a 61ª',
       public.site_erro_da_estrutura((select ev from ex),
         replace('[' || rtrim(repeat('{"tipo": "galeria", "conteudo": {"fotos": [' || rtrim(repeat('"@F",', 12), ',') || ']}},', 5), ',') || ']',
                 '@F', (select f from ex))::jsonb, '{}'::jsonb) is null
       and (select public.site_erro_da_estrutura((select ev from ex), r.estrutura, r.tema) = 'o site passou de 60 fotos — tire algumas'
              from recusados r where r.caso = '61 fotos somadas')
union all
select 'recusa cada regra quebrada (' || (select count(*) from recusados) || ' casos, um por regra)',
       (select bool_and(public.site_erro_da_estrutura((select ev from ex), r.estrutura, r.tema) is not null)
          from recusados r)
union all
select 'o tema aceita os 7 modelos, as 3 formas do nome e os 8 pares de fonte',
       (select bool_and(public.site_erro_da_estrutura((select ev from ex), '[]'::jsonb,
                          jsonb_build_object('modelo', m)) is null)
          from unnest(array['convite', 'classico', 'aliancas', 'cartoes', 'monograma', 'franca', 'violino']) m)
       and (select bool_and(public.site_erro_da_estrutura((select ev from ex), '[]'::jsonb,
                              jsonb_build_object('nome', n)) is null)
              from unnest(array['nomes', 'iniciais', 'iniciais-nomes']) n)
       and (select bool_and(public.site_erro_da_estrutura((select ev from ex), '[]'::jsonb,
                              jsonb_build_object('fontes', f)) is null)
              from unnest(array['essencial', 'maison', 'atelier', 'caligrafia',
                                'riviera', 'bilhete', 'soiree', 'relicario']) f)
       and public.site_erro_da_estrutura((select ev from ex), '[]'::jsonb, '{"abertura": false, "paleta": "salvia"}'::jsonb) is null
union all
select 'nenhum site já salvo fica travado pela regra nova',
       not exists (select 1 from public.evento_site s
                    where public.site_erro_da_estrutura(s.event_id, s.estrutura, s.tema) is not null)
union all
select 'o balde site: privado, 3 MB, só jpeg e webp',
       exists (select 1 from storage.buckets b
                where b.id = 'site' and b.public = false
                  and b.file_size_limit = 3145728
                  and b.allowed_mime_types @> array['image/jpeg', 'image/webp']
                  and array_length(b.allowed_mime_types, 1) = 2)
union all
select 'nenhuma policy abre o balde site (sobe e lê só por URL assinada)',
       not exists (select 1 from pg_policies
                    where schemaname = 'storage' and tablename = 'objects'
                      and (coalesce(qual, '') ~ '''site'''
                           or coalesce(with_check, '') ~ '''site'''
                           or policyname like 'site\_fotos%'))
union all
select 'site_montado: endereço só nos modelos novos com o local visível, prazo/menu do bloco rsvp sem opção em branco, ainda interna',
       coalesce((select p.prosrc like '%esp.endereco%'
                        and p.prosrc like '%''tipo'' = ''local''%'
                        and p.prosrc like '%''monograma''%'
                        and p.prosrc not like '%''convite''%'
                        and p.prosrc like '%btrim(m.v) <> ''''%'
                        and p.prosrc like '%''tipo'' = ''rsvp''%'
                        and p.prosrc like '%to_jsonb(s.rsvp_prazo)%'
                        and p.prosrc like '%to_jsonb(s.menu_opcoes)%'
                        and p.prosecdef
                   from pg_proc p
                  where p.oid = to_regprocedure('public.site_montado(uuid, jsonb)')), false)
       and not has_function_privilege('anon', 'public.site_montado(uuid, jsonb)', 'execute')
       and not has_function_privilege('authenticated', 'public.site_montado(uuid, jsonb)', 'execute')
union all
select 'a régua recusa evento nulo e foto sem evento (o espaço vazio continua valendo)',
       public.site_erro_da_estrutura(null, '[]'::jsonb, '{}'::jsonb) is not null
       and public.site_foto_ok(to_jsonb((select f from ex)), null) = false
       and public.site_fotos_ok(jsonb_build_array((select f from ex)), 3, null) = false
       and public.site_foto_ok('null'::jsonb, null) = true
union all
select 'o anônimo recebe o bloco escondido sem conteúdo, e a chave Pix nula com os presentes escondidos',
       (select (r->'estrutura'->0) ? 'conteudo' = false
               and (r->'estrutura'->0->>'tipo') = 'especiais'
               and (r->'estrutura'->1->'conteudo'->>'titulo') = 'Recado'
               and (r->'estrutura'->2) ? 'conteudo' = false
               and r->'pix_chave' = 'null'::jsonb
               and r->'pix_titular' = 'null'::jsonb
               and r->>'mensagem' = 'Olá'
          from (select public.site_so_o_que_aparece(jsonb_build_object(
                  'mensagem', 'Olá', 'pix_chave', '11999990000', 'pix_titular', 'Ana',
                  'tema', jsonb_build_object('modelo', 'classico'),
                  'estrutura', jsonb_build_array(
                    jsonb_build_object('tipo', 'especiais', 'visivel', false,
                                       'conteudo', jsonb_build_object('pares', jsonb_build_array(jsonb_build_object('nomes', 'Caio e Duda')))),
                    jsonb_build_object('tipo', 'texto', 'conteudo', jsonb_build_object('titulo', 'Recado', 'texto', 'Venham!')),
                    jsonb_build_object('tipo', 'presentes', 'visivel', false,
                                       'conteudo', jsonb_build_object('itens', jsonb_build_array(jsonb_build_object('id', 'a', 'valor_centavos', 5000)))),
                    jsonb_build_object('tipo', 'mensagem')))) as r) t)
union all
select 'o anônimo não recebe o que o modelo não desenha (cenas fora do Monograma, jeito fora do Clássico e das Alianças, e no Convite só o texto livre)',
       (select (public.site_so_o_que_aparece(jsonb_build_object('tema', jsonb_build_object('modelo', 'franca'),
                  'estrutura', jsonb_build_array(
                    jsonb_build_object('tipo', 'cenas', 'conteudo', jsonb_build_object('itens', '[]'::jsonb)),
                    jsonb_build_object('tipo', 'jeito', 'conteudo', jsonb_build_object('frases', '["x"]'::jsonb)),
                    jsonb_build_object('tipo', 'momentos', 'conteudo', jsonb_build_object('itens', '[]'::jsonb)))))->'estrutura') as e) is not null
       and (select not (e->0 ? 'conteudo') and not (e->1 ? 'conteudo') and (e->2 ? 'conteudo')
              from (select public.site_so_o_que_aparece(jsonb_build_object('tema', jsonb_build_object('modelo', 'franca'),
                      'estrutura', jsonb_build_array(
                        jsonb_build_object('tipo', 'cenas', 'conteudo', jsonb_build_object('itens', '[]'::jsonb)),
                        jsonb_build_object('tipo', 'jeito', 'conteudo', jsonb_build_object('frases', '["x"]'::jsonb)),
                        jsonb_build_object('tipo', 'momentos', 'conteudo', jsonb_build_object('itens', '[]'::jsonb)))))->'estrutura' as e) t)
       and (select (e->0 ? 'conteudo') and (e->1 ? 'conteudo')
              from (select public.site_so_o_que_aparece(jsonb_build_object('tema', jsonb_build_object('modelo', 'monograma'),
                      'estrutura', jsonb_build_array(
                        jsonb_build_object('tipo', 'cenas', 'conteudo', jsonb_build_object('itens', '[]'::jsonb)),
                        jsonb_build_object('tipo', 'texto', 'conteudo', jsonb_build_object('texto', 'x')))))->'estrutura' as e) t)
       and (select not (e->0 ? 'conteudo') and (e->1 ? 'conteudo')
              from (select public.site_so_o_que_aparece(jsonb_build_object(
                      'estrutura', jsonb_build_array(
                        jsonb_build_object('tipo', 'capa', 'conteudo', jsonb_build_object('nome1', 'Ana')),
                        jsonb_build_object('tipo', 'texto', 'conteudo', jsonb_build_object('texto', 'x')))))->'estrutura' as e) t)
       -- sem estrutura (sites da 128/129): nada muda
       and public.site_so_o_que_aparece('{"mensagem": "Olá", "pix_chave": "x"}'::jsonb) = '{"mensagem": "Olá", "pix_chave": "x"}'::jsonb
       and not has_function_privilege('anon', 'public.site_so_o_que_aparece(jsonb)', 'execute')
       and not has_function_privilege('authenticated', 'public.site_so_o_que_aparece(jsonb)', 'execute')
union all
select 'um bloco de presentes escondido e outro visível: a chave Pix fica; jeito fica nas Alianças',
       (select r->>'pix_chave' = '11999990000'
               and not ((r->'estrutura'->0) ? 'conteudo')
               and ((r->'estrutura'->1) ? 'conteudo')
               and ((r->'estrutura'->2) ? 'conteudo')
          from (select public.site_so_o_que_aparece(jsonb_build_object(
                  'pix_chave', '11999990000',
                  'tema', jsonb_build_object('modelo', 'aliancas'),
                  'estrutura', jsonb_build_array(
                    jsonb_build_object('tipo', 'presentes', 'visivel', false, 'conteudo', jsonb_build_object('itens', '[]'::jsonb)),
                    jsonb_build_object('tipo', 'presentes', 'conteudo', jsonb_build_object('itens', '[]'::jsonb)),
                    jsonb_build_object('tipo', 'jeito', 'conteudo', jsonb_build_object('frases', '["x"]'::jsonb))))) as r) t)
union all
select 'a foto do casal de antes não vai nos modelos novos nem com a história escondida; no Convite com a história visível, fica',
       public.site_so_o_que_aparece('{"foto_casal_path": "a/b.jpg", "tema": {"modelo": "classico"}, "estrutura": [{"tipo": "texto"}]}'::jsonb)->'foto_casal_path' = 'null'::jsonb
       and public.site_so_o_que_aparece('{"foto_casal_path": "a/b.jpg", "estrutura": [{"tipo": "historia", "visivel": false}]}'::jsonb)->'foto_casal_path' = 'null'::jsonb
       and public.site_so_o_que_aparece('{"foto_casal_path": "a/b.jpg", "estrutura": [{"tipo": "historia"}]}'::jsonb)->>'foto_casal_path' = 'a/b.jpg'
union all
select 'cada site já publicado abre pela página pública nova, sem conteúdo de bloco escondido',
       coalesce((select bool_and(r is not null
                                 and not exists (select 1 from jsonb_array_elements(
                                                    case when jsonb_typeof(r::jsonb->'site'->'estrutura') = 'array'
                                                         then r::jsonb->'site'->'estrutura' else '[]'::jsonb end) b
                                                  where b->'visivel' = 'false'::jsonb and b ? 'conteudo'))
                   from (select public.site_publico(e.rsvp_hash) as r
                           from public.evento_site es
                           join public.events e on e.id = es.event_id
                          where es.publicado and e.rsvp_hash is not null) x), true)
union all
select 'a página pública continua só com o que está no ar, agora pela régua do que aparece, e aberta ao anon',
       pg_get_functiondef('public.site_publico(text)'::regprocedure) like '%where es.publicado%'
       and pg_get_functiondef('public.site_publico(text)'::regprocedure) like '%site_so_o_que_aparece(s.publicado_conteudo)%'
       and has_function_privilege('anon', 'public.site_publico(text)', 'execute');
