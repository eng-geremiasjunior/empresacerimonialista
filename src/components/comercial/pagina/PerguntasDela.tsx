"use client";

// O serviço e as perguntas DELA no formulário da página (214, 18/10/2026).
// Um componente só para os três modelos: cada um passa as próprias classes
// (e o Capítulos, o cabeçalho numerado), e o desenho segue o do modelo.
//
// Escolha única vira lista suspensa, como o tipo do evento; várias
// escolhas e sim/não viram caixas e botões de opção. O id do grupo é o
// que recebe o foco quando há erro (usePedidoDaVitrine.focarPrimeiro).

import { Fragment, type ReactNode } from "react";
import { LIMITES_DO_FORMULARIO, campoDaPergunta, type PerguntaDoFormulario } from "@/lib/comercial/formulario";
import type { usePedidoDaVitrine } from "./usePedidoDaVitrine";

type Formulario = ReturnType<typeof usePedidoDaVitrine>;

export type ClassesDoModelo = {
  campo: string;
  largo: string;
  rotulo: string;
  entrada: string;
  selecao: string;
  area: string;
  erro: string;
  caixa: string;
};

export type CabecaDoModelo = (p: { n: string; para?: string; children: ReactNode }) => ReactNode;

const linhaDeOpcao: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, fontSize: "0.95em", cursor: "pointer" };
const grupoDeOpcoes: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 8, marginTop: 8 };
const ajuda: React.CSSProperties = { margin: "2px 0 6px", fontSize: "0.85em", opacity: 0.75 };

export function PerguntasDela({
  f,
  cl,
  cabeca,
  inicio = 1,
}: {
  f: Formulario;
  cl: ClassesDoModelo;
  /** o cabeçalho numerado do Capítulos; os outros usam o rótulo simples */
  cabeca?: CabecaDoModelo;
  /** o número do primeiro campo daqui (Capítulos) */
  inicio?: number;
}) {
  const { formulario } = f;
  let n = inicio;
  const proximo = () => String(n++).padStart(2, "0");

  // funções chamadas direto, nunca componentes criados aqui dentro: um
  // componente novo a cada desenho faria a caixa perder o foco a cada letra
  const rotulo = (children: ReactNode, para?: string) => {
    const numero = proximo();
    if (cabeca) return <>{cabeca({ n: numero, para, children })}</>;
    return para ? (
      <label htmlFor={para} className={cl.rotulo}>
        {children}
      </label>
    ) : (
      <span className={cl.rotulo}>{children}</span>
    );
  };

  const erroDe = (campo: string) =>
    f.erros[campo] ? (
      <p id={`pedido-${campo}-erro`} className={cl.erro}>
        {f.erros[campo]}
      </p>
    ) : null;

  function pergunta(p: PerguntaDoFormulario) {
    const campo = campoDaPergunta(p.id);
    const id = `pedido-${campo}`;
    const valor = f.respostas[p.id];
    const titulo = `${p.titulo}${p.obrigatoria ? " *" : " (opcional)"}`;
    const marcas = f.marcasDeErro(campo);

    if (p.tipo === "multipla" || p.tipo === "sim_nao") {
      const opcoes = p.tipo === "sim_nao" ? ["Sim", "Não"] : (p.opcoes ?? []);
      const marcadas = Array.isArray(valor) ? valor : [];
      return (
        <div className={cl.campo}>
          {rotulo(titulo)}
          {p.descricao && <p style={ajuda}>{p.descricao}</p>}
          <div
            id={id}
            tabIndex={-1}
            role={p.tipo === "sim_nao" ? "radiogroup" : "group"}
            aria-label={p.titulo}
            style={grupoDeOpcoes}
            {...marcas}
          >
            {opcoes.map((o) => {
              const chave = p.tipo === "sim_nao" ? (o === "Sim" ? "sim" : "nao") : o;
              const marcada = p.tipo === "sim_nao" ? valor === chave : marcadas.includes(o);
              return (
                <label key={o} style={linhaDeOpcao}>
                  <input
                    type={p.tipo === "sim_nao" ? "radio" : "checkbox"}
                    name={id}
                    className={cl.caixa}
                    checked={marcada}
                    disabled={f.travado}
                    onChange={(e) => {
                      if (p.tipo === "sim_nao") f.responder(p.id, chave);
                      else
                        f.responder(
                          p.id,
                          e.target.checked ? [...marcadas, o] : marcadas.filter((m) => m !== o)
                        );
                    }}
                  />
                  {o}
                </label>
              );
            })}
          </div>
          {erroDe(campo)}
        </div>
      );
    }

    const texto = typeof valor === "string" ? valor : "";
    return (
      <div className={p.tipo === "texto_longo" ? cl.largo : cl.campo}>
        {rotulo(titulo, id)}
        {p.descricao && <p style={ajuda}>{p.descricao}</p>}
        {p.tipo === "escolha" ? (
          <select
            id={id}
            className={cl.selecao}
            value={texto}
            disabled={f.travado}
            onChange={(e) => f.responder(p.id, e.target.value)}
            {...marcas}
          >
            <option value="">Selecione</option>
            {(p.opcoes ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : p.tipo === "texto_longo" ? (
          <textarea
            id={id}
            className={cl.area}
            rows={3}
            value={texto}
            maxLength={LIMITES_DO_FORMULARIO.resposta}
            disabled={f.travado}
            onChange={(e) => f.responder(p.id, e.target.value)}
            {...marcas}
          />
        ) : (
          <input
            id={id}
            type={p.tipo === "data" ? "date" : "text"}
            className={cl.entrada}
            value={texto}
            maxLength={p.tipo === "texto_curto" ? 200 : undefined}
            disabled={f.travado}
            onChange={(e) => f.responder(p.id, e.target.value)}
            {...marcas}
          />
        )}
        {erroDe(campo)}
      </div>
    );
  }

  return (
    <>
      {formulario.mostrar.servico && formulario.servico_opcoes.length > 0 && (
        <div className={cl.campo}>
          {rotulo("Que tipo de serviço procura? (opcional)", "pedido-servico")}
          <select
            id="pedido-servico"
            className={cl.selecao}
            value={f.servico}
            disabled={f.travado}
            onChange={(e) => f.editar("servico", f.setServico)(e.target.value)}
            {...f.marcasDeErro("servico")}
          >
            <option value="">Selecione</option>
            {formulario.servico_opcoes.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {erroDe("servico")}
        </div>
      )}
      {formulario.perguntas.map((p) => (
        <Fragment key={p.id}>{pergunta(p)}</Fragment>
      ))}
    </>
  );
}

/** Quantos campos este componente desenha (para a numeração do Capítulos). */
export function camposDela(f: Formulario): number {
  return (f.formulario.mostrar.servico && f.formulario.servico_opcoes.length > 0 ? 1 : 0) + f.formulario.perguntas.length;
}
