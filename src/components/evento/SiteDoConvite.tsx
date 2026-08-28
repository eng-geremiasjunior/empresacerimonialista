"use client";

// O site do casamento pelo lado da equipe, dentro da Área do cliente.
//
// A regra de publicação: tudo é rascunho até ELA publicar; publicar
// congela a fotografia que o público vê. Se o casal (ou ela) editar
// depois, o ar não muda — o estado avisa e ela republica. O casal
// escreve a parte dele pelo portal; aqui mora o profissional: espaço,
// hospedagens, blocos práticos, endereço e a publicação.

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Globe, Plus, Trash2 } from "lucide-react";
import {
  adicionarHospedagem,
  criarEspaco,
  definirSlug,
  garantirSite,
  publicarSite,
  removerHospedagem,
  salvarBlocosSite,
  salvarEspaco,
  vincularEspaco,
} from "@/app/(app)/eventos/[id]/site-actions";

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200";
const botaoPrimario =
  "rounded-[9px] bg-[#17162A] px-3.5 py-2 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
const botaoLeve =
  "rounded-[9px] border border-stone-300 bg-white px-3 py-2 text-[13px] font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50";

export type EspacoLinha = {
  id: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  transporte: string | null;
};

export type HospedagemLinha = {
  id: string;
  nome: string;
  distancia: string | null;
  faixa_preco: string | null;
  nota: string | null;
  link: string | null;
};

export type SiteEstado = {
  existe: boolean;
  publicado: boolean;
  temAlteracao: boolean;
  divergenciaEvento: string | null;
  slug: string | null;
  mensagem: string | null;
  historia: string | null;
  dressCode: string | null;
  blocos: { titulo: string; texto: string }[];
};

export function SiteDoConvite({
  eventId,
  site,
  urlHash,
  urlSlugBase,
  espacos,
  espacoAtualId,
  hospedagens,
}: {
  eventId: string;
  site: SiteEstado;
  /** link completo pelo hash (sempre existe) */
  urlHash: string;
  /** base para montar o link bonito (sem o slug) */
  urlSlugBase: string;
  espacos: EspacoLinha[];
  espacoAtualId: string | null;
  hospedagens: HospedagemLinha[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const espacoAtual = useMemo(
    () => espacos.find((e) => e.id === espacoAtualId) ?? null,
    [espacos, espacoAtualId]
  );

  const [slug, setSlug] = useState(site.slug ?? "");
  const [blocos, setBlocos] = useState(site.blocos);
  const [novoEspaco, setNovoEspaco] = useState(false);
  const [formEspaco, setFormEspaco] = useState({
    nome: espacoAtual?.nome ?? "",
    endereco: espacoAtual?.endereco ?? "",
    cidade: espacoAtual?.cidade ?? "",
    transporte: espacoAtual?.transporte ?? "",
  });
  const [formHosp, setFormHosp] = useState({
    nome: "",
    distancia: "",
    faixaPreco: "",
    nota: "",
    link: "",
  });

  // Trocar de espaço no seletor tem que trocar o formulário junto: sem
  // isto, o form continuava com os dados do espaço ANTERIOR e "Salvar
  // espaço" renomeava o novo com o nome do velho — corrompendo um
  // cadastro que vale para todos os eventos daquele lugar.
  useEffect(() => {
    if (novoEspaco) return;
    setFormEspaco({
      nome: espacoAtual?.nome ?? "",
      endereco: espacoAtual?.endereco ?? "",
      cidade: espacoAtual?.cidade ?? "",
      transporte: espacoAtual?.transporte ?? "",
    });
  }, [espacoAtualId, espacoAtual, novoEspaco]);

  function rodar(fn: () => Promise<{ error?: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (r.error) setErro(r.error);
      else router.refresh();
    });
  }

  const estado = !site.existe
    ? null
    : site.publicado
      ? site.temAlteracao
        ? { rotulo: "No ar · com alterações não publicadas", cor: "bg-amber-50 text-amber-700 border-amber-200" }
        : { rotulo: "No ar", cor: "bg-emerald-50 text-emerald-700 border-emerald-200" }
      : { rotulo: "Rascunho", cor: "bg-stone-100 text-stone-600 border-stone-200" };

  if (!site.existe) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <Globe size={15} className="text-indigo-500" />
          Site do casamento
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          A página que os convidados abrem: informações, a mensagem do casal
          e a confirmação de presença — no link que a cliente já espalha.
        </p>
        <button
          onClick={() => rodar(() => garantirSite(eventId))}
          disabled={pendente}
          className={`mt-3 ${botaoPrimario}`}
        >
          Montar o site
        </button>
        {erro && <p className="mt-2 text-sm text-rose-600">{erro}</p>}
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <Globe size={15} className="text-indigo-500" />
          Site do casamento
        </h3>
        {estado && (
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${estado.cor}`}>
            {estado.rotulo}
          </span>
        )}
      </div>

      {site.divergenciaEvento && site.publicado && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {site.divergenciaEvento} O cabeçalho do site já mostra o dado novo;
          confira se a mensagem do casal cita o antigo.
        </p>
      )}

      {/* o link + publicar */}
      <div className="rounded-lg bg-stone-50 p-3">
        <p className="break-all text-xs text-stone-600">
          <a href={urlHash} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
            {urlHash} <ExternalLink size={11} />
          </a>
        </p>
        {site.slug && (
          <p className="mt-1 break-all text-xs text-stone-600">
            <a href={`${urlSlugBase}/${site.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
              {urlSlugBase}/{site.slug} <ExternalLink size={11} />
            </a>
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap gap-2">
          {/* a divergência do evento (data/hora/local) também destrava o
              botão: é republicando que o aviso se fecha */}
          <button
            onClick={() => rodar(() => publicarSite(eventId, true))}
            disabled={
              pendente ||
              (site.publicado && !site.temAlteracao && !site.divergenciaEvento)
            }
            className={botaoPrimario}
          >
            {site.publicado ? "Publicar alterações" : "Publicar"}
          </button>
          {site.publicado && (
            <button
              onClick={() => {
                if (confirm("Tirar o site do ar? Quem abrir o link verá só a confirmação de presença.")) {
                  rodar(() => publicarSite(eventId, false));
                }
              }}
              disabled={pendente}
              className={botaoLeve}
            >
              Despublicar
            </button>
          )}
        </div>
      </div>

      {/* endereço bonito */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Endereço
        </p>
        <div className="mt-1.5 flex gap-2">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="ana-e-bruno"
            disabled={site.publicado}
            className={inputCls}
          />
          <button
            onClick={() => rodar(() => definirSlug(eventId, slug))}
            disabled={pendente || site.publicado || !slug.trim() || slug === (site.slug ?? "")}
            className={botaoLeve}
          >
            Salvar
          </button>
        </div>
        {site.publicado && (
          <p className="mt-1 text-xs text-gray-400">
            Para mudar o endereço, despublique primeiro. O endereço antigo
            continua abrindo o site para sempre.
          </p>
        )}
      </div>

      {/* espaço + hospedagens */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Espaço e hospedagem
        </p>
        <div className="mt-1.5 flex gap-2">
          <select
            value={novoEspaco ? "__novo" : (espacoAtualId ?? "")}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__novo") {
                setNovoEspaco(true);
                setFormEspaco({ nome: "", endereco: "", cidade: "", transporte: "" });
              } else {
                setNovoEspaco(false);
                rodar(() => vincularEspaco(eventId, v || null));
              }
            }}
            className={inputCls}
          >
            <option value="">Sem espaço vinculado</option>
            {espacos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
                {e.cidade ? ` — ${e.cidade}` : ""}
              </option>
            ))}
            <option value="__novo">+ Cadastrar espaço</option>
          </select>
        </div>

        {(novoEspaco || espacoAtual) && (
          <div className="mt-2 space-y-2 rounded-lg bg-stone-50 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={formEspaco.nome}
                onChange={(e) => setFormEspaco({ ...formEspaco, nome: e.target.value })}
                placeholder="Nome do espaço"
                className={inputCls}
              />
              <input
                value={formEspaco.cidade}
                onChange={(e) => setFormEspaco({ ...formEspaco, cidade: e.target.value })}
                placeholder="Cidade"
                className={inputCls}
              />
            </div>
            <input
              value={formEspaco.endereco}
              onChange={(e) => setFormEspaco({ ...formEspaco, endereco: e.target.value })}
              placeholder="Endereço"
              className={inputCls}
            />
            <textarea
              value={formEspaco.transporte}
              onChange={(e) => setFormEspaco({ ...formEspaco, transporte: e.target.value })}
              placeholder="Transporte e transfer (sai no site, na seção Vindo de fora)"
              rows={2}
              className={inputCls}
            />
            <button
              onClick={() =>
                rodar(async () => {
                  const r = novoEspaco
                    ? await criarEspaco(eventId, formEspaco)
                    : await salvarEspaco(eventId, espacoAtual!.id, formEspaco);
                  if (!r.error && novoEspaco) setNovoEspaco(false);
                  return r;
                })
              }
              disabled={pendente || !formEspaco.nome.trim()}
              className={botaoPrimario}
            >
              {novoEspaco ? "Cadastrar espaço" : "Salvar espaço"}
            </button>

            {espacoAtual && !novoEspaco && (
              <div className="pt-1">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Hospedagens deste espaço
                  <span className="ml-1.5 normal-case tracking-normal text-gray-400">
                    (valem para todos os eventos aqui)
                  </span>
                </p>
                <ul className="mt-1.5 space-y-1">
                  {hospedagens.map((h) => (
                    <li key={h.id} className="flex items-start justify-between gap-2 text-sm">
                      <span>
                        <span className="font-medium text-gray-800">{h.nome}</span>
                        <span className="text-gray-500">
                          {[h.distancia, h.faixa_preco, h.nota].filter(Boolean).length > 0 &&
                            ` · ${[h.distancia, h.faixa_preco, h.nota].filter(Boolean).join(" · ")}`}
                        </span>
                      </span>
                      <button
                        onClick={() => rodar(() => removerHospedagem(eventId, h.id))}
                        disabled={pendente}
                        aria-label="Remover"
                        className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    value={formHosp.nome}
                    onChange={(e) => setFormHosp({ ...formHosp, nome: e.target.value })}
                    placeholder="Pousada ou hotel"
                    className={inputCls}
                  />
                  <input
                    value={formHosp.distancia}
                    onChange={(e) => setFormHosp({ ...formHosp, distancia: e.target.value })}
                    placeholder="Distância (ex.: 5 min de carro)"
                    className={inputCls}
                  />
                  <input
                    value={formHosp.faixaPreco}
                    onChange={(e) => setFormHosp({ ...formHosp, faixaPreco: e.target.value })}
                    placeholder="Faixa de preço (ex.: R$ 250–400)"
                    className={inputCls}
                  />
                  <input
                    value={formHosp.link}
                    onChange={(e) => setFormHosp({ ...formHosp, link: e.target.value })}
                    placeholder="Link (opcional)"
                    className={inputCls}
                  />
                </div>
                <input
                  value={formHosp.nota}
                  onChange={(e) => setFormHosp({ ...formHosp, nota: e.target.value })}
                  placeholder="Sua nota (sai no site — ex.: aceita pet, café bom)"
                  className={`mt-2 ${inputCls}`}
                />
                <button
                  onClick={() =>
                    rodar(async () => {
                      const r = await adicionarHospedagem(eventId, espacoAtual.id, formHosp);
                      if (!r.error)
                        setFormHosp({ nome: "", distancia: "", faixaPreco: "", nota: "", link: "" });
                      return r;
                    })
                  }
                  disabled={pendente || !formHosp.nome.trim()}
                  className={`mt-2 ${botaoLeve}`}
                >
                  <Plus size={13} className="mr-1 inline" />
                  Adicionar hospedagem
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* blocos práticos */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Informações práticas
        </p>
        <div className="mt-1.5 space-y-2">
          {blocos.map((b, i) => (
            <div key={i} className="space-y-1.5 rounded-lg bg-stone-50 p-2.5">
              <div className="flex items-center gap-2">
                <input
                  value={b.titulo}
                  onChange={(e) =>
                    setBlocos(blocos.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))
                  }
                  placeholder="Título (ex.: Estacionamento)"
                  className={inputCls}
                />
                <button
                  onClick={() => setBlocos(blocos.filter((_, j) => j !== i))}
                  aria-label="Remover bloco"
                  className="rounded p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                value={b.texto}
                onChange={(e) =>
                  setBlocos(blocos.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))
                }
                placeholder="Texto"
                rows={2}
                className={inputCls}
              />
            </div>
          ))}
          <div className="flex gap-2">
            {blocos.length < 8 && (
              <button
                onClick={() => setBlocos([...blocos, { titulo: "", texto: "" }])}
                className={botaoLeve}
              >
                <Plus size={13} className="mr-1 inline" />
                Bloco
              </button>
            )}
            <button
              onClick={() => rodar(() => salvarBlocosSite(eventId, blocos))}
              disabled={pendente}
              className={botaoPrimario}
            >
              Salvar informações
            </button>
          </div>
        </div>
      </div>

      {/* a parte do casal — só leitura aqui */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          A parte do casal
          <span className="ml-1.5 normal-case tracking-normal">
            (eles escrevem pelo portal)
          </span>
        </p>
        <div className="mt-1.5 space-y-1 text-sm text-gray-600">
          <p>
            <span className="text-gray-400">Mensagem:</span>{" "}
            {site.mensagem || <span className="text-gray-400">— ainda nada</span>}
          </p>
          <p>
            <span className="text-gray-400">História:</span>{" "}
            {site.historia || <span className="text-gray-400">— ainda nada</span>}
          </p>
          <p>
            <span className="text-gray-400">O que vestir:</span>{" "}
            {site.dressCode || <span className="text-gray-400">— ainda nada</span>}
          </p>
        </div>
      </div>

      {erro && <p className="text-sm text-rose-600">{erro}</p>}
    </section>
  );
}
