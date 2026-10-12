-- ============================================================
-- 206 — Os baldes públicos de imagem só aceitam imagem, com teto
-- ============================================================
-- Varredura de segurança (12/10/2026): 'empresa-logos' e 'landing-imagens'
-- são PÚBLICOS (qualquer um com o endereço abre) e aceitavam qualquer tipo
-- de arquivo, sem limite de tamanho. Quem sobe é a dona (as policies de
-- 042 e 048), mas um login de proprietária qualquer — e o cadastro esteve
-- aberto a contas falsas — podia hospedar ali um HTML ou um arquivo enorme
-- com o nosso endereço do Supabase. Agora: só imagem (sem SVG, que carrega
-- script), até 5 MB. O que já está lá não muda.
--
-- Convergente: pode rodar mais de uma vez.

update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
 where id in ('empresa-logos', 'landing-imagens');

-- ------------------------------------------------------------
-- Conferência — as duas linhas devem voltar 'true'.
-- ------------------------------------------------------------
select id as item,
       file_size_limit = 5242880
       and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'] as ok
  from storage.buckets
 where id in ('empresa-logos', 'landing-imagens');
