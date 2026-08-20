-- 110 — onde o contrato assinado fica guardado.
--
-- Pedir o contrato sem ter onde recebê-lo deixava o ciclo pela metade: o
-- fornecedor respondia "já enviei" e o arquivo continuava no WhatsApp dela.
--
-- Duas decisões que mudam o desenho:
--
-- 1) O balde é PRIVADO. Os outros baldes do sistema (capas, avatares,
--    logos) são públicos porque são imagens de vitrine. Contrato é
--    documento com valor, nome e cláusula de gente — link público seria
--    vazamento por descuido. A leitura sai por URL assinada, gerada na
--    hora para quem tem sessão.
--
-- 2) O fornecedor NÃO fala com o Storage. Ele não tem login, e abrir
--    política para 'anon' aqui daria escrita a qualquer um. O envio dele
--    passa por uma rota do Vela que revalida o hash e devolve uma URL de
--    upload assinada, válida para UM caminho só.
--
-- Caminho do arquivo: contratos/{empresa_id}/{event_id}/{solicitacao_id}/{nome}
-- O primeiro segmento é a empresa, e é ele que as políticas conferem.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contratos', 'contratos', false, 10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = excluded.allowed_mime_types;

-- Só a equipe da empresa dona da pasta enxerga e mexe.
drop policy if exists "Equipe le contratos da empresa" on storage.objects;
create policy "Equipe le contratos da empresa"
  on storage.objects for select
  using (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] =
        (select mc.empresa_id::text from public.meu_cargo() mc)
  );

drop policy if exists "Equipe anexa contratos da empresa" on storage.objects;
create policy "Equipe anexa contratos da empresa"
  on storage.objects for insert
  with check (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] =
        (select mc.empresa_id::text from public.meu_cargo() mc)
  );

drop policy if exists "Equipe substitui contratos da empresa" on storage.objects;
create policy "Equipe substitui contratos da empresa"
  on storage.objects for update
  using (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] =
        (select mc.empresa_id::text from public.meu_cargo() mc)
  );

drop policy if exists "Equipe apaga contratos da empresa" on storage.objects;
create policy "Equipe apaga contratos da empresa"
  on storage.objects for delete
  using (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] =
        (select mc.empresa_id::text from public.meu_cargo() mc)
  );

-- Conferência: deve voltar uma linha com public = false.
select id, public, file_size_limit from storage.buckets where id = 'contratos';
