-- ============================================================
-- 156 — Os preços de setembro, e o fim do teto de login
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- A DECISÃO (dono, 10/09/2026), depois de ler a página da concorrente
-- direta lado a lado com a nossa:
--
--            ANTES                      AGORA
--   Essencial     R$  97 · 10 ev · 1  → R$  59,90 ·  6 ev · sem limite
--   Profissional  R$ 149 · 25 ev · 3  → R$  99,90 · 12 ev · sem limite
--   Master        R$ 199 · ∞  ev · 10 → R$ 149,90 ·  ∞ ev · sem limite
--
-- POR QUE O TETO DE LOGIN CAIU, que é a parte que importa mais do que o
-- preço. A concorrente dá usuários ilimitados nos TRÊS planos e cobra só
-- por quantidade de evento. Metade do nosso público declarado trabalha
-- em dupla (CLAUDE.md: "cerimonialistas solo ou em dupla"), e cobrar
-- pela sócia empurrava para o plano do meio justamente quem lá entra no
-- mais barato. Login não nos custa nada; evento em andamento custa —
-- então é por evento que se cobra, e só por ele.
--
-- `logins = null` é como o sistema já escreve "sem limite": `teto_do_plano`
-- devolve nulo, `pode_adicionar_login` faz `coalesce(x < null, true)` e
-- libera, e a página de vendas já sabe dizer "você e toda a equipe".
-- Nenhuma linha de código muda por causa desta migração.
--
-- NINGUÉM É AFETADO NO BOLSO. Conferido em 10/09/2026: não há assinatura
-- paga em essencial, profissional ou master — as duas contas ativas são
-- cortesia e a terceira é um teste. Quando houver assinante, mudança de
-- preço aqui NÃO mexe no que a operadora cobra dela: o valor da
-- assinatura vive em `assinaturas.valor_mensal` e só muda pela troca de
-- plano ou pela escada (153).
--
-- EFEITO DE BORDA, e é bom: a escada de lançamento passa a ser R$ 27,90
-- por três meses e depois R$ 59,90. O salto cai de 3,5× para 2,1×, que é
-- o susto que fazia cancelar no quarto mês.
--
-- POR QUE UPDATE E NÃO EDITAR A SEMENTE DA 147. Lá o insert é
-- `where not exists`, de propósito: re-executar a 147 não pode desfazer
-- um preço ajustado à mão. A semente foi atualizada para estes mesmos
-- valores (instalação nova nasce certa), e a mudança do banco que já
-- existe é este arquivo.

begin;

update public.plano_catalogo
   set valor_mensal = 59.90, eventos_em_andamento = 6, logins = null
 where codigo = 'essencial';

update public.plano_catalogo
   set valor_mensal = 99.90, eventos_em_andamento = 12, logins = null
 where codigo = 'profissional';

update public.plano_catalogo
   set valor_mensal = 149.90, eventos_em_andamento = null, logins = null
 where codigo = 'master';

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'Essencial: R$ 59,90 · 6 eventos · sem teto de login' as item,
       exists (select 1 from public.plano_catalogo
               where codigo = 'essencial' and valor_mensal = 59.90
                 and eventos_em_andamento = 6 and logins is null) as ok
union all
select 'Profissional: R$ 99,90 · 12 eventos · sem teto de login',
       exists (select 1 from public.plano_catalogo
               where codigo = 'profissional' and valor_mensal = 99.90
                 and eventos_em_andamento = 12 and logins is null)
union all
select 'Master: R$ 149,90 · eventos sem limite · sem teto de login',
       exists (select 1 from public.plano_catalogo
               where codigo = 'master' and valor_mensal = 149.90
                 and eventos_em_andamento is null and logins is null)
union all
select 'nenhum plano à venda ainda cobra por login',
       (select count(*) = 0 from public.plano_catalogo where ativo and logins is not null)
union all
select 'a escada continua descontando (27,90 abaixo do Essencial)',
       (select p.valor_mensal < c.valor_mensal
        from public.plano_promocao p, public.plano_catalogo c
        where p.codigo = 'lancamento' and p.ordem = 1 and c.codigo = 'essencial')
union all
-- o preço do catálogo é vitrine; o que cada assinante paga vive na
-- própria assinatura e não foi tocado aqui
select 'nenhuma assinatura teve o valor alterado por esta migração',
       (select count(*) = 0 from public.assinaturas
        where status = 'ativa' and plano in ('essencial','profissional','master')
          and valor_mensal in (97, 149, 199));
