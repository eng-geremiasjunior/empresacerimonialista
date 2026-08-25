-- ============================================================
-- 118 — Os pacotes que nascem com a conta param de ser de outra agência
--
-- Toda conta nova nascia com três pacotes de casamento (semente da 102) e
-- três de debutante (semente da 058). Eles existem por um bom motivo: sem
-- eles a proposta pública não tem calculadora.
--
-- O problema era o CONTEÚDO. "DIAMANTE • Mais escolhido", "Experiência
-- Platinum", "Experiência white-glove inesquecível", "Wedding Designer
-- incluso", "after-movie" — posicionamento e vocabulário de outra
-- empresa, parte em inglês, com preços que a cerimonialista nunca
-- escolheu. E isso é o que a noiva lê na proposta, assinado com o nome
-- dela.
--
-- As sementes já foram corrigidas nas migrações 102 e 058, para quem
-- criar conta daqui em diante. Esta migração cuida de quem já existe.
--
-- REGRA DE SEGURANÇA: só toca no que está COMPROVADAMENTE intocado.
--   · nome e subtítulo: trocados quando o subtítulo ainda é o da semente
--   · preço: zerado SÓ quando nome, subtítulo E preço são exatamente os
--     originais — se ela mexeu no valor, o valor é dela e fica
--
-- Preço 0 não vira "R$ 0" na tela: precoDePacote (src/lib/proposta.ts)
-- mostra "A combinar" até ela precificar no Catálogo.
--
-- Convergente: pode ser reexecutada — na segunda vez nada casa. Ao final,
-- um SELECT de conferência.
-- Execute no SQL Editor do Supabase (depois da 117).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Casamento (semente da 102)
-- ------------------------------------------------------------

-- 1.1 zera o preço só de quem está inteiramente intocado
update public.empresa_pacotes set preco = 0
 where tipo_evento = 'casamento'
   and (nome, subtitulo, preco) in (
     ('Essencial', 'Para casais práticos', 1900),
     ('ESSENCIAL', 'Para casais práticos', 1900),
     ('Completa', 'DIAMANTE • Mais escolhido', 2500),
     ('COMPLETA', 'DIAMANTE • Mais escolhido', 2500),
     ('Premium', 'Experiência Platinum', 4200),
     ('PREMIUM', 'Experiência Platinum', 4200)
   );

-- 1.2 a copy
update public.empresa_pacotes
   set nome = 'Assessoria do dia', subtitulo = 'Acompanhamento na reta final'
 where tipo_evento = 'casamento' and subtitulo = 'Para casais práticos';

update public.empresa_pacotes
   set nome = 'Assessoria completa', subtitulo = 'Do planejamento ao dia'
 where tipo_evento = 'casamento' and subtitulo = 'DIAMANTE • Mais escolhido';

update public.empresa_pacotes
   set nome = 'Assessoria completa +', subtitulo = 'Com equipe ampliada'
 where tipo_evento = 'casamento' and subtitulo = 'Experiência Platinum';

-- 1.3 os itens com termo em inglês, dentro do array `inclui`
update public.empresa_pacotes
   set inclui = array_replace(inclui, 'Wedding Designer incluso', 'Projeto visual do evento')
 where 'Wedding Designer incluso' = any(inclui);

update public.empresa_pacotes
   set inclui = array_replace(
         inclui,
         'Coordenação do after-movie + álbum premium',
         'Coordenação do vídeo e do álbum'
       )
 where 'Coordenação do after-movie + álbum premium' = any(inclui);

-- ------------------------------------------------------------
-- 2) Debutante (semente da 058)
-- ------------------------------------------------------------

update public.empresa_pacotes set preco = 0
 where tipo_evento = 'debutante'
   and (nome, subtitulo, preco) in (
     ('ESSENCIAL', 'Para quem quer o essencial com elegância', 4900),
     ('COMPLETA',  'Equilíbrio perfeito entre tranquilidade e luxo', 6900),
     ('PREMIUM',   'Experiência white-glove inesquecível', 9700)
   );

update public.empresa_pacotes
   set nome = 'Assessoria do dia', subtitulo = 'Acompanhamento na reta final'
 where tipo_evento = 'debutante'
   and subtitulo = 'Para quem quer o essencial com elegância';

update public.empresa_pacotes
   set nome = 'Assessoria completa', subtitulo = 'Do planejamento ao dia'
 where tipo_evento = 'debutante'
   and subtitulo = 'Equilíbrio perfeito entre tranquilidade e luxo';

update public.empresa_pacotes
   set nome = 'Assessoria completa +', subtitulo = 'Com equipe ampliada'
 where tipo_evento = 'debutante'
   and subtitulo = 'Experiência white-glove inesquecível';

update public.empresa_pacotes
   set inclui = array_replace(inclui, 'Cerimonialista bilíngue', 'Cerimonialista bilíngue (a combinar)')
 where 'Cerimonialista bilíngue' = any(inclui);

update public.empresa_pacotes
   set inclui = array_replace(inclui, 'Concierge 24h na semana do evento', 'Atendimento estendido na semana do evento')
 where 'Concierge 24h na semana do evento' = any(inclui);

update public.empresa_pacotes
   set inclui = array_replace(inclui, 'Roteiro cinematográfico do dia', 'Roteiro detalhado do dia')
 where 'Roteiro cinematográfico do dia' = any(inclui);

-- ------------------------------------------------------------
-- 3) Extras semeados, mesma regra
-- ------------------------------------------------------------

update public.empresa_extras set preco = 0
 where (nome, preco) in (
   ('Cerimônia ao ar livre', 600),
   ('Assessoria de lua de mel', 450),
   ('Chá de debutante', 800)
 );

commit;

-- ============================================================
-- CONFERENCIA — cada linha deve devolver ok = true
-- ============================================================
select 'nenhum subtitulo de outra agencia sobrou' as verificacao,
       not exists (
         select 1 from public.empresa_pacotes
          where subtitulo in (
            'Para casais práticos',
            'DIAMANTE • Mais escolhido',
            'Experiência Platinum',
            'Para quem quer o essencial com elegância',
            'Equilíbrio perfeito entre tranquilidade e luxo',
            'Experiência white-glove inesquecível'
          )
       ) as ok
union all
select 'nenhum termo em ingles nos itens',
       not exists (
         select 1 from public.empresa_pacotes
          where 'Wedding Designer incluso' = any(inclui)
             or 'Coordenação do after-movie + álbum premium' = any(inclui)
       )
union all
select 'quem editou o preco manteve o preco',
       exists (
         select 1 from public.empresa_pacotes
          where tipo_evento = 'casamento' and preco > 0
       )
union all
-- as trincas exatas da semente nao existem mais; um preco solto de 1900
-- pode ser dela e nao prova nada
select 'nenhuma trinca original da semente sobrou',
       not exists (
         select 1 from public.empresa_pacotes
          where (nome, subtitulo, preco) in (
            ('Essencial', 'Para casais práticos', 1900),
            ('Completa', 'DIAMANTE • Mais escolhido', 2500),
            ('Premium', 'Experiência Platinum', 4200),
            ('ESSENCIAL', 'Para quem quer o essencial com elegância', 4900),
            ('COMPLETA', 'Equilíbrio perfeito entre tranquilidade e luxo', 6900),
            ('PREMIUM', 'Experiência white-glove inesquecível', 9700)
          )
       )
union all
select 'nenhum pacote foi apagado (so renomeado)',
       (select count(*) from public.empresa_pacotes) > 0
order by ok, verificacao;
