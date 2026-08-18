-- 099 — A planta baixa do local por baixo do croqui
--
-- Salão de festa raramente é retângulo. Tem L, tem coluna no meio, tem
-- varanda. Desenhar mesa sobre um retângulo inventado dá um croqui
-- bonito e inútil para a montagem.
--
-- Muitos espaços entregam a planta em PDF ou vetor. Ela sobe o arquivo,
-- calibra a escala uma vez (marca uma medida que conhece e diz quantos
-- metros são) e o croqui passa a ficar POR CIMA da planta real. A
-- geometria de circulação continua valendo, agora contra o espaço certo.
--
-- Como a escala é guardada: o tamanho real que a planta cobre, em cm
-- (largura e altura já calibradas). Nada de matriz de transformação —
-- dois números que ela entende são mais fáceis de consertar quando a
-- calibração sair torta.
--
-- PDF não chega aqui: o navegador rasteriza a página em PNG antes de
-- subir. Menos superfície no servidor e nada de leitor de PDF no back.
--
-- Segurança do SVG: o arquivo é de terceiro (o espaço mandou), e SVG
-- aceita <script>. Por isso ele NUNCA é embutido no DOM — entra como
-- <image href="url-assinada">, e imagem referenciada não executa
-- script nem carrega recurso externo. O bucket é privado, preso ao
-- evento, com o mesmo molde da 085.
--
-- Execute no SQL Editor do Supabase (depois da 098).

begin;

-- ============================================================
-- 1) A PLANTA NO SALÃO
-- ============================================================
alter table public.evento_salao
  add column if not exists planta_path text;

alter table public.evento_salao
  add column if not exists planta_tipo text
    check (planta_tipo is null or planta_tipo in ('svg', 'imagem'));

-- tamanho REAL que a planta representa, em cm — o resultado da
-- calibração (a altura sai da proporção do arquivo, calculada na hora
-- de calibrar). Nulo com planta_path preenchido = subiu mas ainda não
-- calibrou, e a tela pede a medida antes de confiar no croqui.
alter table public.evento_salao
  add column if not exists planta_largura_cm int
    check (planta_largura_cm is null or planta_largura_cm between 100 and 50000);
alter table public.evento_salao
  add column if not exists planta_altura_cm int
    check (planta_altura_cm is null or planta_altura_cm between 100 and 50000);

-- onde o canto superior esquerdo da planta cai dentro do salão
alter table public.evento_salao
  add column if not exists planta_x_cm int not null default 0;
alter table public.evento_salao
  add column if not exists planta_y_cm int not null default 0;

-- planta forte demais compete com as mesas; fraca demais não serve de guia
alter table public.evento_salao
  add column if not exists planta_opacidade smallint not null default 45
    check (planta_opacidade between 10 and 100);

comment on column public.evento_salao.planta_largura_cm is
  'Largura real da planta em cm (resultado da calibração de dois pontos). Nulo com planta_path preenchido = subiu mas falta calibrar.';

create or replace function public.trg_salao_defaults()
returns trigger
language plpgsql
as $$
begin
  new.largura_cm       := coalesce(new.largura_cm, 2000);
  new.altura_cm        := coalesce(new.altura_cm, 1500);
  new.planta_x_cm      := coalesce(new.planta_x_cm, 0);
  new.planta_y_cm      := coalesce(new.planta_y_cm, 0);
  new.planta_opacidade := coalesce(new.planta_opacidade, 45);
  return new;
end $$;

drop trigger if exists trg_salao_defaults on public.evento_salao;
create trigger trg_salao_defaults
  before insert or update on public.evento_salao
  for each row execute function public.trg_salao_defaults();

-- ============================================================
-- 2) BUCKET PRIVADO DA PLANTA
-- ============================================================
-- Bucket próprio, e não o 'planejamento' da 085, por um motivo só:
-- aceitar SVG lá ampliaria o que pode entrar no bucket de contratos.
-- Aqui SVG é esperado e o consumo é controlado (<image>, nunca inline).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plantas', 'plantas', false, 15728640,
  array['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 15728640,
      allowed_mime_types = array['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];

-- Wrappers com nome neutro (servem a qualquer bucket cuja pasta seja o
-- event_id). A REGRA não é duplicada: delegam ao par canônico
-- pode_ver_evento / pode_editar_evento, como os da 085 já fazem.
create or replace function public.pode_ver_arquivo_do_evento(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id::text = p_folder and public.pode_ver_evento(e.id)
  );
$$;

create or replace function public.pode_editar_arquivo_do_evento(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id::text = p_folder and public.pode_editar_evento(e.id)
  );
$$;

revoke all on function public.pode_ver_arquivo_do_evento(text) from public, anon;
revoke all on function public.pode_editar_arquivo_do_evento(text) from public, anon;
grant execute on function public.pode_ver_arquivo_do_evento(text) to authenticated;
grant execute on function public.pode_editar_arquivo_do_evento(text) to authenticated;

drop policy if exists "Plantas select" on storage.objects;
create policy "Plantas select"
  on storage.objects for select
  using (
    bucket_id = 'plantas'
    and public.pode_ver_arquivo_do_evento((storage.foldername(name))[1])
  );

drop policy if exists "Plantas insert" on storage.objects;
create policy "Plantas insert"
  on storage.objects for insert
  with check (
    bucket_id = 'plantas'
    and public.pode_editar_arquivo_do_evento((storage.foldername(name))[1])
  );

drop policy if exists "Plantas update" on storage.objects;
create policy "Plantas update"
  on storage.objects for update
  using (
    bucket_id = 'plantas'
    and public.pode_editar_arquivo_do_evento((storage.foldername(name))[1])
  );

drop policy if exists "Plantas delete" on storage.objects;
create policy "Plantas delete"
  on storage.objects for delete
  using (
    bucket_id = 'plantas'
    and public.pode_editar_arquivo_do_evento((storage.foldername(name))[1])
  );

commit;

do $$
begin
  raise notice '099 aplicada: evento_salao com planta (path, tipo, largura calibrada, offset, opacidade) e bucket privado plantas.';
end $$;
