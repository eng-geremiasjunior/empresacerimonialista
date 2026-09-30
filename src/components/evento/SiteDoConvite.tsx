"use client";

// O site do evento pelo lado da equipe, dentro da Área do cliente.
//
// Desde 30/09/2026 (migrações 185 e 186) o site é da FAMÍLIA: ela monta,
// escolhe o endereço e publica pelo portal, e cada publicação passa pela
// revisão do dono do sistema. A cerimonialista não mexe no site — aqui ela
// vê o estado e o link, e cuida do que é dela e aparece ao vivo no site:
// o espaço e as hospedagens.

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Globe, Plus, Trash2 } from "lucide-react";
import {
  adicionarHospedagem,
  criarEspaco,
  removerHospedagem,
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
  liberacao_montagem: string | null;
  termino_som: string | null;
  desmontagem_ate: string | null;
  restricoes: string | null;
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
  /** rascunho | em_analise | aprovado | recusado (185) */
  revisao: string;
  /** o dono do sistema tirou do ar */
  retirado: boolean;
  divergenciaEvento: string | null;
  slug: string | null;
  mensagem: string | null;
  historia: string | null;
  dressCode: string | null;
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

  const [novoEspaco, setNovoEspaco] = useState(false);
  const [formEspaco, setFormEspaco] = useState({
    nome: espacoAtual?.nome ?? "",
    endereco: espacoAtual?.endereco ?? "",
    cidade: espacoAtual?.cidade ?? "",
    transporte: espacoAtual?.transporte ?? "",
    liberacaoMontagem: espacoAtual?.liberacao_montagem?.slice(0, 5) ?? "",
    terminoSom: espacoAtual?.termino_som?.slice(0, 5) ?? "",
    desmontagemAte: espacoAtual?.desmontagem_ate?.slice(0, 5) ?? "",
    restricoes: espacoAtual?.restricoes ?? "",
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
    liberacaoMontagem: espacoAtual?.liberacao_montagem?.slice(0, 5) ?? "",
    terminoSom: espacoAtual?.termino_som?.slice(0, 5) ?? "",
    desmontagemAte: espacoAtual?.desmontagem_ate?.slice(0, 5) ?? "",
    restricoes: espacoAtual?.restricoes ?? "",
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

  // o estado do site, em palavras — quem publica é a família
  const estado = !site.existe
    ? { rotulo: "A família ainda não começou o site", cor: "bg-stone-100 text-stone-600 border-stone-200" }
    : site.retirado
      ? { rotulo: "Tirado do ar pelo eorganizei", cor: "bg-rose-50 text-rose-700 border-rose-200" }
      : site.revisao === "em_analise"
        ? { rotulo: site.publicado ? "No ar · nova versão em análise" : "Em análise", cor: "bg-amber-50 text-amber-700 border-amber-200" }
        : site.publicado
          ? { rotulo: "No ar", cor: "bg-emerald-50 text-emerald-700 border-emerald-200" }
          : site.revisao === "recusado"
            ? { rotulo: "Voltou para ajustes da família", cor: "bg-stone-100 text-stone-600 border-stone-200" }
            : site.revisao === "aprovado"
              ? { rotulo: "Fora do ar", cor: "bg-stone-100 text-stone-600 border-stone-200" }
              : { rotulo: "Rascunho da família", cor: "bg-stone-100 text-stone-600 border-stone-200" };

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <Globe size={15} className="text-indigo-500" />
          Site do evento
        </h3>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${estado.cor}`}>
          {estado.rotulo}
        </span>
      </div>

      {site.divergenciaEvento && site.publicado && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {site.divergenciaEvento} O cabeçalho do site já mostra o dado novo;
          confira se a mensagem do casal cita o antigo.
        </p>
      )}

      {/* os links (a família publica pelo portal) */}
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
                setFormEspaco({ nome: "", endereco: "", cidade: "", transporte: "", liberacaoMontagem: "", terminoSom: "", desmontagemAte: "", restricoes: "" });
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
              placeholder="Transporte e transfer (sai no convite, na seção Vindo de fora)"
              rows={2}
              className={inputCls}
            />

            {/* os horários do LUGAR: descobertos uma vez, valem para todo
                evento aqui — e é daqui que o cronograma vai puxar */}
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Horários do espaço
              <span className="ml-1.5 normal-case tracking-normal text-gray-400">
                (uso interno — não saem no convite)
              </span>
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { k: "liberacaoMontagem" as const, r: "Libera montagem" },
                { k: "terminoSom" as const, r: "Som até" },
                { k: "desmontagemAte" as const, r: "Desmontar até" },
              ].map((c) => (
                <label key={c.k} className="text-xs text-gray-500">
                  {c.r}
                  <input
                    type="time"
                    value={formEspaco[c.k]}
                    onChange={(e) => setFormEspaco({ ...formEspaco, [c.k]: e.target.value })}
                    className={inputCls}
                  />
                </label>
              ))}
            </div>
            <textarea
              value={formEspaco.restricoes}
              onChange={(e) => setFormEspaco({ ...formEspaco, restricoes: e.target.value })}
              placeholder="Restrições do lugar (ex.: carga a 80m, não furar parede)"
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

      {/* a parte do casal — só leitura aqui */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          O que a família escreveu
        </p>
        <div className="mt-1.5 space-y-1 text-sm text-gray-600">
          <p>
            <span className="text-gray-400">Mensagem:</span>{" "}
            {site.mensagem || <span className="text-gray-400">ainda nada</span>}
          </p>
          <p>
            <span className="text-gray-400">História:</span>{" "}
            {site.historia || <span className="text-gray-400">ainda nada</span>}
          </p>
          <p>
            <span className="text-gray-400">O que vestir:</span>{" "}
            {site.dressCode || <span className="text-gray-400">ainda nada</span>}
          </p>
        </div>
      </div>

      {erro && <p className="text-sm text-rose-600">{erro}</p>}
    </section>
  );
}
