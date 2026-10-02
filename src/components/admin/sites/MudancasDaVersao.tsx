// O que a revisão do dono lê em cima das prévias: a troca de aparência em
// palavras, as fotos desta versão (as que não estavam no ar marcadas
// "nova") e os presentes com o valor em reais. Componentes de servidor,
// sem estado; as URLs chegam assinadas.

import { lerEstrutura } from "@/lib/site-blocos";
import { fotosDaEstrutura, formatarReais, lerPresentes } from "@/lib/site-conteudo";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { trocasDeAparencia } from "./aparencia";

function Titulo({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-stone-700">{children}</h2>;
}

export function TrocaDeAparencia({
  pendente,
  noAr,
}: {
  pendente: SitePublico;
  noAr: SitePublico | null;
}) {
  const linhas = trocasDeAparencia(pendente.site?.tema, noAr?.site?.tema, !!noAr, pendente.evento?.tipo);
  if (!linhas.length) return null;
  return (
    <section className="flex flex-col gap-1">
      <Titulo>Aparência</Titulo>
      <ul className="flex flex-col gap-0.5 text-sm text-stone-800">
        {linhas.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  );
}

export function FotosDaVersao({
  pendente,
  noAr,
  urls,
}: {
  pendente: SitePublico;
  noAr: SitePublico | null;
  urls: Record<string, string>;
}) {
  const fotos = fotosDaEstrutura(lerEstrutura(pendente.site?.estrutura));
  if (!fotos.length) return null;
  const antes = noAr ? new Set(fotosDaEstrutura(lerEstrutura(noAr.site?.estrutura))) : null;
  const novas = antes ? fotos.filter((f) => !antes.has(f)).length : 0;

  return (
    <section className="flex flex-col gap-2">
      <Titulo>
        Fotos desta versão
        <span className="ml-2 font-normal text-stone-500">
          {fotos.length}
          {antes ? ` · ${novas === 1 ? "1 nova" : `${novas} novas`}` : ""}
        </span>
      </Titulo>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {fotos.map((f) => {
          const url = urls[f];
          const nova = antes ? !antes.has(f) : false;
          return (
            <li key={f} className="relative shrink-0">
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="block">
                  {/* URL assinada do balde privado: o otimizador do next não a busca */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className={`h-28 w-auto max-w-[200px] rounded object-cover ${nova ? "ring-2 ring-stone-900" : ""}`}
                  />
                </a>
              ) : (
                <div className="flex h-28 w-20 items-center justify-center rounded bg-stone-100 text-center text-[11px] text-stone-500">
                  sem prévia
                </div>
              )}
              {nova && (
                <span className="absolute left-1 top-1 rounded bg-stone-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  nova
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PresentesDaVersao({
  pendente,
  noAr,
}: {
  pendente: SitePublico;
  noAr: SitePublico | null;
}) {
  const bloco = lerEstrutura(pendente.site?.estrutura).find((b) => b.tipo === "presentes");
  const itens = lerPresentes(bloco?.conteudo).itens;
  if (!itens.length) return null;

  const blocoNoAr = noAr ? lerEstrutura(noAr.site?.estrutura).find((b) => b.tipo === "presentes") : undefined;
  const valorNoAr = new Map(lerPresentes(blocoNoAr?.conteudo).itens.map((p) => [p.id, p.valor_centavos]));

  return (
    <section className="flex flex-col gap-2">
      <Titulo>
        Presentes
        {bloco?.visivel === false && <span className="ml-2 font-normal text-stone-500">escondidos no site</span>}
      </Titulo>
      <ul className="flex flex-col divide-y divide-stone-200 text-sm">
        {itens.map((p) => {
          const antes = noAr ? valorNoAr.get(p.id) : undefined;
          const novo = !!noAr && antes === undefined;
          const mudou = antes !== undefined && antes !== p.valor_centavos;
          return (
            <li key={p.id} className="flex flex-col gap-0.5 py-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-stone-900">{p.titulo}</span>
                <span className="shrink-0 tabular-nums text-stone-900">
                  {mudou && <span className="mr-2 text-stone-400 line-through">{formatarReais(antes)}</span>}
                  {formatarReais(p.valor_centavos)}
                </span>
              </div>
              {p.descricao && <p className="text-stone-600">{p.descricao}</p>}
              {novo && <p className="text-xs text-stone-500">novo</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
