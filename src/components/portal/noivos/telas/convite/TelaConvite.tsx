"use client";

// A tela Convite do portal dos noivos: o convite animado que chega pelo
// WhatsApp (os 9 desenhos de design_handoff_convites). Outra coisa que o
// site: um botão só, que leva ao site; a confirmação de presença é lá.
//
// À esquerda os ajustes, à direita o convite de verdade num celular (um
// iframe de /convites/…?ao-vivo=1, que recebe os dados por postMessage:
// nada do casal na URL). Salvar põe no ar — por isso só o casal salva
// (como o site, a equipe não escreve); o banco confere (portal_salvar_convite, 196).

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FAMILIAS } from "@/lib/fontes-site";
import { ORDEM_DOS_PARES, PARES_DE_FONTE, type ParDeFonte } from "@/lib/site-pares";
import {
  CONVITES,
  MODOS_DO_NOME,
  ORDEM_DOS_CONVITES,
  paletaDoConvite,
  type IdDoConvite,
  type ModoDoNome,
} from "@/components/convite-digital/catalogo";
import { modeloDoSalvo, fonteDoSalvo } from "@/components/convite-digital/do-site";
import { Eyebrow, Icone } from "../../primitivas";
import { usePortalNoivos } from "../../contexto";
import type { DadosDaTelaConvite } from "./dados";
import { salvarConvite } from "@/app/(portal)/portal/[eventoId]/convite/actions";
import "./convite.css";

type Campos = {
  modelo: IdDoConvite;
  fonte: ParDeFonte;
  paleta: string;
  modoNome: ModoDoNome;
  forma: string;
  hora: string;
  frase: string;
  referencia: string;
  local: string;
  endereco: string;
  cidade: string;
  localRecepcao: string;
  enderecoRecepcao: string;
  pais1: string;
  pais2: string;
  foto: string;
};

const LIMITE = { frase: 220, referencia: 60, local: 80, endereco: 120, cidade: 60, pais: 120 } as const;

function camposIniciais(d: DadosDaTelaConvite): Campos {
  const s = d.salvo;
  const modelo = modeloDoSalvo(s);
  return {
    modelo,
    fonte: fonteDoSalvo(s),
    paleta: paletaDoConvite(modelo, s?.paleta).id,
    modoNome: MODOS_DO_NOME.find((m) => m === s?.modo_nome) ?? d.nomes.modo,
    forma: s?.forma === "Nota musical" ? "Nota musical" : "Violino",
    hora: s?.hora ?? d.horaDoEvento ?? "",
    frase: s?.frase ?? "",
    referencia: s?.referencia ?? "",
    local: s?.local ?? d.doEvento.local,
    endereco: s?.endereco ?? d.doEvento.endereco,
    cidade: s?.cidade ?? d.doEvento.cidade,
    localRecepcao: s?.local_recepcao ?? "",
    enderecoRecepcao: s?.endereco_recepcao ?? "",
    pais1: s?.pais1 ?? "",
    pais2: s?.pais2 ?? "",
    // a foto salva que saiu do site também sai do convite (a página pública
    // cai na da capa): a tela mostra o mesmo que o convidado vai ver
    foto: s?.foto && d.fotos.some((f) => f.caminho === s.foto) ? s.foto : (d.fotoDaCapa ?? ""),
  };
}

/**
 * O que vai para portal_salvar_convite (as chaves da 196). Hora, local,
 * endereço e cidade iguais aos do evento vão null: o convite continua
 * seguindo o evento se a cerimonialista mudar o local depois. Só o que a
 * noiva mudou fica gravado ('' = ela apagou de propósito).
 */
function paraSalvar(
  c: Campos,
  d: DadosDaTelaConvite,
  temPais: boolean,
  temRecepcao: boolean,
  temForma: boolean
) {
  const doEvento = (v: string, doEv: string) => (v.trim() === doEv.trim() ? null : v.trim());
  return {
    modelo: c.modelo,
    fonte: c.fonte,
    paleta: c.paleta === "original" ? null : c.paleta,
    modo_nome: c.modoNome,
    forma: temForma ? c.forma : null,
    hora: c.hora && c.hora !== d.horaDoEvento ? c.hora : null,
    frase: c.frase.trim() || null,
    referencia: c.frase.trim() ? c.referencia.trim() || null : null,
    local: doEvento(c.local, d.doEvento.local),
    endereco: doEvento(c.endereco, d.doEvento.endereco),
    cidade: doEvento(c.cidade, d.doEvento.cidade),
    local_recepcao: temRecepcao ? c.localRecepcao.trim() : null,
    endereco_recepcao: temRecepcao ? c.enderecoRecepcao.trim() : null,
    pais1: temPais ? c.pais1.trim() || null : null,
    pais2: temPais ? c.pais2.trim() || null : null,
    foto: c.foto || null,
  };
}

export function TelaConvite({ dados }: { dados: DadosDaTelaConvite }) {
  const { base, avisar } = usePortalNoivos();
  const [campos, setCampos] = useState<Campos>(() => camposIniciais(dados));
  const [guardado, setGuardado] = useState<string>(() =>
    dados.salvo ? JSON.stringify(camposIniciais(dados)) : ""
  );
  const [salvando, comecar] = useTransition();
  const modelo = CONVITES[campos.modelo];
  const alterado = JSON.stringify(campos) !== guardado;
  const salvoAlgumaVez = guardado !== "";
  const faltaHora = !campos.hora;

  const mudar = <K extends keyof Campos>(k: K, v: Campos[K]) => setCampos((c) => ({ ...c, [k]: v }));

  function escolherModelo(id: IdDoConvite) {
    setCampos((c) => {
      // a fonte segue o padrão do modelo, a menos que ela já tenha escolhido outra
      const fonteEraPadrao = c.fonte === CONVITES[c.modelo].fontePadrao;
      return { ...c, modelo: id, paleta: "original", fonte: fonteEraPadrao ? CONVITES[id].fontePadrao : c.fonte };
    });
  }

  function salvar() {
    if (faltaHora) {
      avisar("Falta o horário da cerimônia", true);
      return;
    }
    // no Tradicional de luxo são os pais que convidam: sem eles a frase fica sem quem convida
    if (modelo.pais && (!campos.pais1.trim() || !campos.pais2.trim())) {
      avisar("Este modelo pede os nomes dos pais", true);
      return;
    }
    const envio = paraSalvar(campos, dados, modelo.pais, modelo.recepcao, !!modelo.formas);
    comecar(async () => {
      const r = await salvarConvite(dados.eventoId, envio);
      if ("erro" in r) {
        avisar(r.erro, true);
        return;
      }
      setGuardado(JSON.stringify(campos));
      avisar("Convite salvo");
    });
  }

  // ---------------------------------------------------------------- prévia
  // Cada mudança RECARREGA o iframe (documento novo) em vez de remontar o
  // convite no mesmo documento: a lógica do desenho deixa temporizadores
  // da abertura soltos, que mexeriam no convite seguinte. O iframe avisa
  // quando está pronto ("convite-previa-pronta") e recebe a última versão.
  const iframe = useRef<HTMLIFrameElement>(null);
  const [rodada, setRodada] = useState(0);
  const fotoUrl = dados.fotos.find((f) => f.caminho === campos.foto)?.url ?? null;
  const mensagem = useMemo(
    () => ({
      tipo: "convite-previa",
      modelo: campos.modelo,
      fonte: campos.fonte,
      paleta: campos.paleta,
      foto: fotoUrl ? { url: fotoUrl } : null,
      dados: {
        nome1: dados.nomes.nome1,
        nome2: dados.nomes.nome2,
        modoNome: campos.modoNome,
        dataISO: `${dados.data}T${campos.hora || "00:00"}:00`,
        siteUrl: "#",
        frase: campos.frase,
        referencia: campos.frase.trim() ? campos.referencia : "",
        local: campos.local,
        endereco: campos.endereco,
        cidade: campos.cidade,
        localRecepcao: campos.localRecepcao,
        enderecoRecepcao: campos.enderecoRecepcao,
        pais1: campos.pais1,
        pais2: campos.pais2,
        formaAbertura: campos.forma,
      },
    }),
    [campos, dados, fotoUrl]
  );
  const ultima = useRef(mensagem);
  ultima.current = mensagem;

  useEffect(() => {
    const ouvir = (e: MessageEvent) => {
      const alvo = iframe.current?.contentWindow;
      if (e.origin !== window.location.origin || !alvo || e.source !== alvo) return;
      if ((e.data as { tipo?: string } | null)?.tipo === "convite-previa-pronta") {
        alvo.postMessage(ultima.current, window.location.origin);
      }
    };
    window.addEventListener("message", ouvir);
    // o iframe pode ter ficado pronto antes desta tela: manda já (se ele
    // ainda não ouve, o "pronta" dele chega depois e pede de novo)
    iframe.current?.contentWindow?.postMessage(ultima.current, window.location.origin);
    return () => window.removeEventListener("message", ouvir);
  }, []);

  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    const t = setTimeout(() => iframe.current?.contentWindow?.location.reload(), 450);
    return () => clearTimeout(t);
  }, [mensagem, rodada]);

  // ---------------------------------------------------------------- envio
  async function copiarLink() {
    if (!dados.link) return;
    try {
      await navigator.clipboard.writeText(dados.link);
      avisar("Link copiado");
    } catch {
      avisar("Não foi possível copiar agora", true);
    }
  }
  const zap = dados.link
    ? `https://wa.me/?text=${encodeURIComponent(`Um convite para você: ${dados.link}`)}`
    : null;

  const podeEnviar = !!dados.link && salvoAlgumaVez && !alterado;

  // a faixa de fotos abre com a escolhida à vista (só rola a faixa, nunca a página)
  const faixaDeFotos = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const faixa = faixaDeFotos.current;
    const on = faixa?.querySelector<HTMLElement>(".pn-convite-foto.on");
    if (faixa && on) faixa.scrollLeft = on.offsetLeft - faixa.clientWidth / 2 + on.clientWidth / 2;
  }, []);

  return (
    <section className="pn-convite" aria-label="Convite">
      <header className="pn-convite-cabeca">
        <Eyebrow>Convite</Eyebrow>
        <h1 className="pn-t pn-convite-titulo">O convite dos convidados</h1>
        <p className="pn-convite-sub">Chega pelo WhatsApp e leva ao site.</p>
      </header>

      {dados.semMigracao && (
        <p className="pn-convite-aviso" role="alert">
          O convite ainda não pode ser salvo neste sistema. Fale com a cerimonialista.
        </p>
      )}

      <div className="pn-convite-grade">
        <div className="pn-convite-ajustes">
          {/* ---- modelo ---- */}
          <div className="pn-convite-bloco">
            <h2 className="pn-convite-rotulo">Modelo</h2>
            <div className="pn-convite-modelos" role="radiogroup" aria-label="Modelo do convite">
              {ORDEM_DOS_CONVITES.map((id) => {
                const m = CONVITES[id];
                const p = m.paletas[0];
                const on = campos.modelo === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`pn-convite-modelo${on ? " on" : ""}`}
                    onClick={() => escolherModelo(id)}
                  >
                    <span className="pn-convite-amostra" aria-hidden="true">
                      {m.amostra.map((papel) => (
                        <span key={papel} style={{ background: (p.cores as Record<string, string>)[papel] }} />
                      ))}
                    </span>
                    <span className="pn-convite-modelo-nome">{m.nome}</span>
                    <span className="pn-convite-modelo-resumo">{m.resumo}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---- cores ---- */}
          {modelo.paletas.length > 1 && (
            <div className="pn-convite-bloco">
              <h2 className="pn-convite-rotulo">Cores</h2>
              <div className="pn-convite-opcoes" role="radiogroup" aria-label="Cores do convite">
                {modelo.paletas.map((p) => {
                  const on = campos.paleta === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={`pn-convite-opcao${on ? " on" : ""}`}
                      onClick={() => mudar("paleta", p.id)}
                    >
                      <span className="pn-convite-amostra" aria-hidden="true">
                        {modelo.amostra.map((papel) => (
                          <span key={papel} style={{ background: (p.cores as Record<string, string>)[papel] }} />
                        ))}
                      </span>
                      {p.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- letras ---- */}
          <div className="pn-convite-bloco">
            <h2 className="pn-convite-rotulo">Letras</h2>
            <div className="pn-convite-letras" role="radiogroup" aria-label="Letras do convite">
              {ORDEM_DOS_PARES.map((par) => {
                const on = campos.fonte === par;
                return (
                  <button
                    key={par}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`pn-convite-letra${on ? " on" : ""}`}
                    onClick={() => mudar("fonte", par)}
                  >
                    <span className="pn-convite-letra-nome" style={{ fontFamily: FAMILIAS[PARES_DE_FONTE[par].base.nf] }}>
                      {dados.nomes.nome1 || "Ana"}
                    </span>
                    <span className="pn-convite-letra-par">{PARES_DE_FONTE[par].nome}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---- nomes ---- */}
          <div className="pn-convite-bloco">
            <h2 className="pn-convite-rotulo">Nomes</h2>
            <div className="pn-convite-segmento" role="radiogroup" aria-label="Como os nomes aparecem">
              {MODOS_DO_NOME.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={campos.modoNome === m}
                  className={campos.modoNome === m ? "on" : ""}
                  onClick={() => mudar("modoNome", m)}
                >
                  {m}
                </button>
              ))}
            </div>
            {(!dados.nomes.nome1 || !dados.nomes.nome2) && (
              <p className="pn-convite-nota">
                Os nomes vêm da capa do site. <Link href={`${base}/site`}>Conferir no site</Link>
              </p>
            )}
          </div>

          {/* ---- abertura (só o Violino) ---- */}
          {modelo.formas && (
            <div className="pn-convite-bloco">
              <h2 className="pn-convite-rotulo">Abertura</h2>
              <div className="pn-convite-segmento" role="radiogroup" aria-label="Formato da abertura">
                {modelo.formas.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={campos.forma === f}
                    className={campos.forma === f ? "on" : ""}
                    onClick={() => mudar("forma", f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ---- foto ---- */}
          <div className="pn-convite-bloco">
            <h2 className="pn-convite-rotulo">Foto</h2>
            {dados.fotos.length > 0 ? (
              <div className="pn-convite-fotos" role="radiogroup" aria-label="Foto do convite" ref={faixaDeFotos}>
                {dados.fotos.map((f, k) => {
                  const on = campos.foto === f.caminho;
                  return (
                    <button
                      key={f.caminho}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={k === 0 && f.caminho === dados.fotoDaCapa ? "A foto da capa do site" : `Foto ${k + 1} do site`}
                      className={`pn-convite-foto${on ? " on" : ""}`}
                      onClick={() => mudar("foto", f.caminho)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt="" loading="lazy" decoding="async" />
                      {on && <Icone nome="check" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="pn-convite-nota">
                {dados.site.publicado
                  ? "O site no ar ainda não tem fotos."
                  : "Com o site no ar, as fotos dele aparecem aqui."}{" "}
                <Link href={`${base}/site`}>Ir para o site</Link>
              </p>
            )}
          </div>

          {/* ---- frase ---- */}
          <div className="pn-convite-bloco">
            <h2 className="pn-convite-rotulo">Frase</h2>
            <textarea
              className="pn-convite-campo"
              rows={3}
              maxLength={LIMITE.frase}
              value={campos.frase}
              placeholder="A frase do modelo"
              aria-label="Frase do convite"
              onChange={(e) => mudar("frase", e.target.value)}
            />
            {campos.frase.trim() !== "" && (
              <input
                className="pn-convite-campo"
                maxLength={LIMITE.referencia}
                value={campos.referencia}
                placeholder="De quem é a frase (opcional)"
                aria-label="De quem é a frase"
                onChange={(e) => mudar("referencia", e.target.value)}
              />
            )}
          </div>

          {/* ---- data e local ---- */}
          <div className="pn-convite-bloco">
            <h2 className="pn-convite-rotulo">Data e local</h2>
            <div className="pn-convite-linha">
              <span className="pn-convite-data">{dados.dataLegivel}</span>
              <label className="pn-convite-hora">
                às
                <input
                  type="time"
                  className="pn-convite-campo"
                  value={campos.hora}
                  aria-label="Horário da cerimônia"
                  aria-invalid={faltaHora}
                  onChange={(e) => mudar("hora", e.target.value)}
                />
              </label>
            </div>
            <input
              className="pn-convite-campo"
              maxLength={LIMITE.local}
              value={campos.local}
              placeholder={modelo.recepcao ? "Local da cerimônia" : "Local"}
              aria-label={modelo.recepcao ? "Local da cerimônia" : "Local"}
              onChange={(e) => mudar("local", e.target.value)}
            />
            <input
              className="pn-convite-campo"
              maxLength={LIMITE.endereco}
              value={campos.endereco}
              placeholder="Endereço"
              aria-label="Endereço"
              onChange={(e) => mudar("endereco", e.target.value)}
            />
            {!modelo.recepcao && (
              <input
                className="pn-convite-campo"
                maxLength={LIMITE.cidade}
                value={campos.cidade}
                placeholder="Cidade"
                aria-label="Cidade"
                onChange={(e) => mudar("cidade", e.target.value)}
              />
            )}
            {modelo.recepcao && (
              <>
                <input
                  className="pn-convite-campo"
                  maxLength={LIMITE.local}
                  value={campos.localRecepcao}
                  placeholder="Local da recepção"
                  aria-label="Local da recepção"
                  onChange={(e) => mudar("localRecepcao", e.target.value)}
                />
                <input
                  className="pn-convite-campo"
                  maxLength={LIMITE.endereco}
                  value={campos.enderecoRecepcao}
                  placeholder="Endereço da recepção"
                  aria-label="Endereço da recepção"
                  onChange={(e) => mudar("enderecoRecepcao", e.target.value)}
                />
              </>
            )}
          </div>

          {/* ---- pais (09) ---- */}
          {modelo.pais && (
            <div className="pn-convite-bloco">
              <h2 className="pn-convite-rotulo">Pais</h2>
              <input
                className="pn-convite-campo"
                maxLength={LIMITE.pais}
                value={campos.pais1}
                placeholder={`Pais de ${dados.nomes.nome1 || "um dos noivos"}`}
                aria-label={`Pais de ${dados.nomes.nome1 || "um dos noivos"}`}
                onChange={(e) => mudar("pais1", e.target.value)}
              />
              <input
                className="pn-convite-campo"
                maxLength={LIMITE.pais}
                value={campos.pais2}
                placeholder={`Pais de ${dados.nomes.nome2 || "outro dos noivos"}`}
                aria-label={`Pais de ${dados.nomes.nome2 || "outro dos noivos"}`}
                onChange={(e) => mudar("pais2", e.target.value)}
              />
            </div>
          )}

          {/* ---- salvar ---- */}
          {dados.podeSalvar && !dados.semMigracao && (
            <div className="pn-convite-salvar">
              <button
                type="button"
                className="pn-convite-botao"
                disabled={salvando || (!alterado && salvoAlgumaVez)}
                onClick={salvar}
              >
                {salvando ? "Salvando…" : "Salvar o convite"}
              </button>
              <span className="pn-convite-estado" aria-live="polite">
                {alterado ? (salvoAlgumaVez ? "Alterações não salvas" : "Ainda não salvo") : "Salvo"}
              </span>
            </div>
          )}

          {/* ---- enviar ---- */}
          <div className="pn-convite-bloco pn-convite-envio">
            <h2 className="pn-convite-rotulo">Enviar aos convidados</h2>
            {podeEnviar && dados.link ? (
              <>
                <div className="pn-convite-link">{dados.link.replace(/^https?:\/\//, "")}</div>
                <div className="pn-convite-acoes">
                  <button type="button" className="pn-convite-botao" onClick={() => void copiarLink()}>
                    <Icone nome="content_copy" /> Copiar o link
                  </button>
                  {zap && (
                    <a className="pn-convite-botao claro" href={zap} target="_blank" rel="noopener noreferrer">
                      <Icone nome="send_to_mobile" /> Enviar pelo WhatsApp
                    </a>
                  )}
                  <a className="pn-convite-botao claro" href={dados.link} target="_blank" rel="noopener noreferrer">
                    <Icone nome="open_in_new" /> Abrir
                  </a>
                </div>
              </>
            ) : (
              <p className="pn-convite-nota">
                {!dados.site.publicado ? (
                  <>
                    O convite leva ao site: com o site no ar, ele fica pronto para enviar.{" "}
                    <Link href={`${base}/site`}>Ir para o site</Link>
                  </>
                ) : alterado ? (
                  "Salve o convite para enviar."
                ) : (
                  "Salve o convite para enviar."
                )}
              </p>
            )}
          </div>
        </div>

        {/* ---- o celular ---- */}
        <div className="pn-convite-previa">
          <div className="pn-convite-celular">
            <iframe
              ref={iframe}
              src="/convites/c01?ao-vivo=1"
              title="Prévia do convite"
              className="pn-convite-iframe"
            />
          </div>
          <button type="button" className="pn-convite-de-novo" onClick={() => setRodada((r) => r + 1)}>
            Ver de novo
          </button>
        </div>
      </div>
    </section>
  );
}
