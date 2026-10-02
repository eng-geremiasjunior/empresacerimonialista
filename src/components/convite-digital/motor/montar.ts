// O motor dos convites: pega a marcação do desenho (modelos/cNN/template.ts),
// a lógica literal (modelos/cNN/logica.ts) e dá vida aos dois na página, com
// a mesma semântica do runtime do Claude Design (support.js), que fazia isso
// com React:
//
//  - {{ expr }} em atributo e em texto, avaliado contra { ...props,
//    ...renderVals() }; texto entra por textContent (nunca como HTML), num
//    <span class="sc-interp"> como no runtime (no SVG, texto puro);
//  - style ligado é aplicado propriedade a propriedade, só no que mudou —
//    como o React —, para não apagar o que a lógica muda direto no elemento;
//  - <sc-if> é resolvido uma vez (nos 9 desenhos ele só depende de props);
//  - <sc-for> redesenha por índice (o key={i} do runtime): reaproveita os
//    itens que já existem, cria os novos no fim, remove as sobras;
//  - <image-slot> vira uma div com a foto (object-fit: cover, o padrão do
//    image-slot) ou, na prévia, a vaga "Foto do casal";
//  - texto só de quebra de linha, sem espaço, some (como no runtime);
//  - setState muda o state na hora e o redesenho sai em lote (microtarefa),
//    seguido de componentDidUpdate e dos callbacks.
//
// Roda só no navegador. Um convite por documento: a lógica do desenho usa o
// document inteiro (querySelector, innerWidth, position:fixed) — por isso as
// prévias abrem o convite numa página própria, dentro de um iframe.

import { avaliar, compilarAtributo, partesDoTexto } from "./expressao";
import { ajustarValores } from "./ajuste";
import type { ClasseDoConvite } from "./dc-logic";

type Escopo = Record<string, unknown>;
type Ligacao = { atualizar(escopo: Escopo): void };

export type FotoDoConvite = { url: string; posicao?: string | null } | null;

export type Montagem = {
  /** a marcação do modelo, já com as trocas de texto fixo por campos */
  marcacao: string;
  /** o <style> do <helmet> do desenho (regras de body, a, button) */
  estiloGlobal: string;
  Logica: ClasseDoConvite;
  props: Record<string, unknown>;
  /** paleta + fontes locais (motor/ajuste.ts) */
  ajuste: (s: string) => string;
  foto: FotoDoConvite;
  /** prévia: a vaga sem foto mostra "Foto do casal"; no público fica vazia */
  mostrarVaga: boolean;
};

type Contexto = { foto: FotoDoConvite; mostrarVaga: boolean };

const SVG_NS = "http://www.w3.org/2000/svg";
const ATRIBUTOS_DE_ENDERECO = new Set(["href", "src", "xlink:href", "action", "formaction"]);

function enderecoSeguro(nome: string, valor: string): string {
  if (!ATRIBUTOS_DE_ENDERECO.has(nome)) return valor;
  return /^\s*(javascript|vbscript|data):/i.test(valor) ? "#" : valor;
}

function declaracoes(css: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const d of css.split(";")) {
    const i = d.indexOf(":");
    if (i < 0) continue;
    const prop = d.slice(0, i).trim();
    if (!prop) continue;
    m.set(prop.startsWith("--") ? prop : prop.toLowerCase(), d.slice(i + 1).trim());
  }
  return m;
}

function ligarEstilo(el: Element, bruto: string, escopo: Escopo, ligs: Ligacao[]) {
  const calcular = compilarAtributo(bruto);
  const estilo = (el as HTMLElement | SVGElement).style;
  let anterior = new Map<string, string>();
  const lig: Ligacao = {
    atualizar(esc) {
      const v = calcular(esc);
      const novo = declaracoes(v == null ? "" : String(v));
      for (const [p, valor] of novo) if (anterior.get(p) !== valor) estilo.setProperty(p, valor);
      for (const p of anterior.keys()) if (!novo.has(p)) estilo.removeProperty(p);
      anterior = novo;
    },
  };
  el.removeAttribute("style");
  lig.atualizar(escopo);
  ligs.push(lig);
}

function ligarAtributo(el: Element, nome: string, bruto: string, escopo: Escopo, ligs: Ligacao[]) {
  const calcular = compilarAtributo(bruto);
  let ultimo: string | null | undefined;
  const lig: Ligacao = {
    atualizar(esc) {
      const v = calcular(esc);
      const s = v == null ? null : String(v);
      if (s === ultimo) return;
      ultimo = s;
      if (s === null) el.removeAttribute(nome);
      else el.setAttribute(nome, enderecoSeguro(nome, s));
    },
  };
  lig.atualizar(escopo);
  ligs.push(lig);
}

function ligarTexto(no: Text, escopo: Escopo, ligs: Ligacao[]) {
  const pai = no.parentNode;
  if (!pai) return;
  const noSvg = (pai as Element).namespaceURI === SVG_NS;
  const frag = document.createDocumentFragment();
  partesDoTexto(no.data).forEach((parte, i) => {
    if (!(i & 1)) {
      if (parte) frag.appendChild(document.createTextNode(parte));
      return;
    }
    const expr = parte;
    if (noSvg) {
      // no SVG um <span> não desenha texto: o valor entra como texto puro
      const t = document.createTextNode("");
      let ultimo: string | undefined;
      const lig: Ligacao = {
        atualizar(esc) {
          const v = avaliar(esc, expr);
          const s = v == null || typeof v === "boolean" ? "" : String(v);
          if (s !== ultimo) t.data = ultimo = s;
        },
      };
      frag.appendChild(t);
      lig.atualizar(escopo);
      ligs.push(lig);
      return;
    }
    const ancora = document.createComment("");
    const span = document.createElement("span");
    span.className = "sc-interp";
    frag.appendChild(ancora);
    let ultimo: string | null | undefined;
    const lig: Ligacao = {
      atualizar(esc) {
        const v = avaliar(esc, expr);
        // como o runtime: null, undefined e booleano não desenham nada
        const s = v == null || typeof v === "boolean" ? null : String(v);
        if (s === ultimo) return;
        ultimo = s;
        if (s === null) {
          span.remove();
          return;
        }
        span.textContent = s;
        if (span.parentNode !== ancora.parentNode) ancora.after(span);
      },
    };
    lig.atualizar(escopo);
    ligs.push(lig);
  });
  pai.replaceChild(frag, no);
}

function ligarLista(el: Element, escopo: Escopo, ligs: Ligacao[], ctx: Contexto) {
  const lista = compilarAtributo(el.getAttribute("list") || "");
  const como = el.getAttribute("as") || "item";
  const molde = document.createDocumentFragment();
  while (el.firstChild) molde.appendChild(el.firstChild);
  const fimDaLista = document.createComment("/sc-for");
  el.replaceWith(fimDaLista);
  const itens: { inicio: Comment; fim: Comment; ligs: Ligacao[] }[] = [];
  const lig: Ligacao = {
    atualizar(esc) {
      const v = lista(esc);
      const l = Array.isArray(v) ? v : [];
      for (let i = 0; i < l.length; i++) {
        const sub = { ...esc, [como]: l[i], $index: i };
        if (i < itens.length) {
          for (const b of itens[i].ligs) b.atualizar(sub);
          continue;
        }
        const frag = molde.cloneNode(true) as DocumentFragment;
        const ligsDoItem: Ligacao[] = [];
        processarFilhos(frag, sub, ligsDoItem, ctx);
        const inicio = document.createComment("");
        const fim = document.createComment("");
        frag.prepend(inicio);
        frag.append(fim);
        fimDaLista.parentNode!.insertBefore(frag, fimDaLista);
        itens.push({ inicio, fim, ligs: ligsDoItem });
      }
      while (itens.length > l.length) {
        const sai = itens.pop()!;
        let no: ChildNode | null = sai.inicio;
        while (no) {
          const prox: ChildNode | null = no.nextSibling;
          no.remove();
          if (no === sai.fim) break;
          no = prox;
        }
      }
    },
  };
  lig.atualizar(escopo);
  ligs.push(lig);
}

function vagaDaFoto(el: Element, ctx: Contexto): HTMLElement {
  const div = document.createElement("div");
  for (const a of [...el.attributes]) {
    if (a.name === "shape" || a.name === "placeholder" || a.name === "fit" || a.name === "radius") continue;
    div.setAttribute(a.name, a.value);
  }
  div.setAttribute("data-foto-convite", "");
  div.style.display = "block";
  div.style.overflow = "hidden";
  if (ctx.foto) {
    const img = document.createElement("img");
    img.src = ctx.foto.url;
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;
    img.style.cssText = "display:block;width:100%;height:100%;object-fit:cover;user-select:none;";
    if (ctx.foto.posicao) img.style.objectPosition = ctx.foto.posicao;
    div.appendChild(img);
  } else if (ctx.mostrarVaga) {
    div.style.background = "rgba(128,128,128,.14)";
    div.style.boxShadow = "inset 0 0 0 1px rgba(128,128,128,.28)";
    div.style.color = "rgba(110,110,110,.9)";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.font = "500 11px/1.4 system-ui,sans-serif";
    div.style.letterSpacing = ".14em";
    div.style.textTransform = "uppercase";
    div.textContent = el.getAttribute("placeholder") || "Foto do casal";
  }
  return div;
}

function processarNo(no: ChildNode, escopo: Escopo, ligs: Ligacao[], ctx: Contexto) {
  if (no.nodeType === Node.TEXT_NODE) {
    const t = no as Text;
    if (t.data.includes("{{")) ligarTexto(t, escopo, ligs);
    else if (!t.data.trim() && !t.data.includes(" ")) t.remove();
    return;
  }
  if (no.nodeType !== Node.ELEMENT_NODE) {
    no.remove();
    return;
  }
  const el = no as Element;
  const tag = el.localName.toLowerCase();

  if (tag === "sc-if") {
    const v = compilarAtributo(el.getAttribute("value") || "")(escopo);
    if (!v) {
      el.remove();
      return;
    }
    const filhos = [...el.childNodes];
    el.replaceWith(...filhos);
    for (const f of filhos) processarNo(f, escopo, ligs, ctx);
    return;
  }
  if (tag === "sc-for") {
    ligarLista(el, escopo, ligs, ctx);
    return;
  }
  if (tag === "image-slot") {
    el.replaceWith(vagaDaFoto(el, ctx));
    return;
  }

  for (const a of [...el.attributes]) {
    if (a.name.startsWith("hint-placeholder-")) {
      el.removeAttribute(a.name);
      continue;
    }
    if (!a.value.includes("{{")) continue;
    if (a.name === "style") ligarEstilo(el, a.value, escopo, ligs);
    else ligarAtributo(el, a.name, a.value, escopo, ligs);
  }
  processarFilhos(el, escopo, ligs, ctx);
}

function processarFilhos(pai: ParentNode, escopo: Escopo, ligs: Ligacao[], ctx: Contexto) {
  let no = pai.firstChild;
  while (no) {
    const prox: ChildNode | null = no.nextSibling;
    processarNo(no, escopo, ligs, ctx);
    no = prox;
  }
}

// O documento do desenho era uma página limpa: sem o preflight do Tailwind
// (box-sizing, line-height 1.5, svg e img em bloco…) nem as classes que o
// layout raiz põe no body. Dentro do convite tudo volta ao padrão do
// navegador — menos o SVG, porque no SVG d, x, y, transform e companhia
// também são CSS e o "revert" apagaria a geometria. A especificidade é a
// mínima (:where), para as regras do próprio desenho ganharem.
const BASE = [
  "html[data-convite],html[data-convite] body{height:100%;margin:0}",
  "html[data-convite] body{line-height:normal}",
  "[data-convite-raiz]{height:100%}",
  ":where(html[data-convite] [data-convite-raiz]) :not(svg,svg *){all:revert}",
  ":where(html[data-convite] [data-convite-raiz]) svg{display:revert;vertical-align:revert}",
  ":where(html[data-convite] [data-convite-raiz]) :is(svg,svg *){box-sizing:revert;border-color:revert;border-style:revert;border-width:revert}",
].join("\n");

/** As regras do <helmet> do desenho; a do body ganha das classes do layout raiz. */
function estiloDoDesenho(css: string): string {
  return css.replace(/(^|\})\s*body\s*\{/g, "$1html[data-convite] body{");
}

/** Monta o convite dentro de `raiz` e devolve a desmontagem. */
export function montarConvite(raiz: HTMLElement, m: Montagem): () => void {
  const html = document.documentElement;
  html.setAttribute("data-convite", "");
  const estilo = document.createElement("style");
  estilo.setAttribute("data-convite-global", "");
  estilo.textContent = BASE + "\n" + estiloDoDesenho(m.ajuste(m.estiloGlobal));
  document.head.appendChild(estilo);

  const inst = new m.Logica(m.props);
  inst.__ajustar = m.ajuste;
  const valores = (): Escopo => {
    let rv: Escopo = {};
    try {
      rv = (inst.renderVals() as Escopo) || {};
    } catch (e) {
      console.error(e);
    }
    return ajustarValores({ ...inst.props, ...rv }, m.ajuste);
  };

  const tpl = document.createElement("template");
  tpl.innerHTML = m.ajuste(m.marcacao);
  const ligs: Ligacao[] = [];
  processarFilhos(tpl.content, valores(), ligs, { foto: m.foto, mostrarVaga: m.mostrarVaga });

  raiz.setAttribute("data-convite-raiz", "");
  raiz.classList.add("sc-host");
  raiz.replaceChildren(tpl.content);

  let desmontado = false;
  let agendado = false;
  const depois: (() => void)[] = [];
  inst.__agendar = (cb) => {
    if (cb) depois.push(cb);
    if (agendado) return;
    agendado = true;
    queueMicrotask(() => {
      agendado = false;
      if (desmontado) return;
      const esc = valores();
      for (const l of ligs) l.atualizar(esc);
      try {
        inst.componentDidUpdate(inst.props);
      } catch (e) {
        console.error(e);
      }
      for (const f of depois.splice(0)) f();
    });
  };

  try {
    inst.componentDidMount();
  } catch (e) {
    console.error(e);
  }

  return () => {
    desmontado = true;
    try {
      inst.componentWillUnmount();
    } catch (e) {
      console.error(e);
    }
    raiz.replaceChildren();
    raiz.removeAttribute("data-convite-raiz");
    raiz.classList.remove("sc-host");
    estilo.remove();
    html.removeAttribute("data-convite");
  };
}
