"use client";

// O menu do site (27/09/2026): o site deixa de ser uma página só. No
// computador, links no cabeçalho com "Funcionalidades" abrindo a lista;
// no celular, um botão "Menu" que abre tudo numa tela, à vista (regra do
// dono: menu destacado, tudo à vista no celular).
//
// As âncoras apontam para a /planos (a home do site, que abre também para
// quem está logado), para funcionarem de qualquer página.
//
// A tela do celular vai para fora do cabeçalho por portal: o cabeçalho tem
// backdrop-filter, e isso prende um position:fixed dentro dele.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ItemDoMenu = { rotulo: string; href: string; nota?: string; destaque?: boolean };
export type GrupoDoMenu = { rotulo: string; itens: ItemDoMenu[] };
export type EntradaDoMenu = ItemDoMenu | GrupoDoMenu;

export const MENU_DO_SITE: EntradaDoMenu[] = [
  {
    rotulo: "Eventos",
    itens: [
      { rotulo: "Casamento", href: "/para/casamento", nota: "do sim ao fim da festa" },
      { rotulo: "15 anos", href: "/para/15-anos", nota: "com a família junto" },
      { rotulo: "Corporativo e outros", href: "/para/outros-eventos", nota: "aniversário, formatura e o que vier" },
    ],
  },
  {
    rotulo: "Funcionalidades",
    itens: [
      { rotulo: "Roteiro do dia e fornecedores", href: "/funcionalidades/roteiro-do-dia", nota: "cada um com a hora dele" },
      { rotulo: "Portal da família", href: "/funcionalidades/portal-da-familia", nota: "a família acompanha tudo" },
      { rotulo: "Planejamento", href: "/funcionalidades/planejamento", nota: "as decisões, com prazo" },
      { rotulo: "Financeiro", href: "/funcionalidades/financeiro", nota: "o dinheiro de cada evento" },
    ],
  },
  { rotulo: "Como funciona", href: "/planos#apresentacao" },
  // o catálogo vivo (195): os portais e os modelos de site de exemplo
  { rotulo: "Conheça por dentro", href: "/conhecer", destaque: true },
  { rotulo: "Planos", href: "/planos#a-planos" },
  { rotulo: "Parcerias", href: "/parceiras" },
];

const eGrupo = (e: EntradaDoMenu): e is GrupoDoMenu => "itens" in e;

const CSS = `
.ms{display:flex;align-items:center;gap:30px;font-size:14px;letter-spacing:.02em}
.ms-grupo{position:relative}
.ms-grupo>button{background:none;border:0;padding:0;font:inherit;letter-spacing:inherit;color:inherit;cursor:pointer;display:flex;align-items:center;gap:6px}
.ms-grupo>button span{font-size:10px;transition:transform .2s}
.ms-grupo[data-aberto="1"]>button span{transform:rotate(180deg)}
.ms-lista{position:absolute;top:calc(100% + 18px);left:-24px;width:330px;background:#FAF8F5;border:1px solid rgba(34,30,27,.12);box-shadow:0 24px 50px rgba(34,30,27,.14);padding:10px;display:flex;flex-direction:column;opacity:0;pointer-events:none;transform:translateY(-6px);transition:opacity .18s,transform .18s}
.ms-grupo[data-aberto="1"] .ms-lista{opacity:1;pointer-events:auto;transform:none}
/* a ponte sobre o vão entre o botão e a lista: sem ela, o mouse saía do
   menu no caminho e a lista fechava antes do clique (dono, 27/09/2026) */
.ms-lista::before{content:"";position:absolute;left:0;right:0;top:-22px;height:22px}
.ms-lista a{display:flex;flex-direction:column;gap:3px;padding:11px 14px}
.ms-lista a:hover{background:#F2EEE9;opacity:1!important}
.ms-lista b{font-weight:400;font-size:15px}
.ms-lista small{font-size:12.5px;color:#928A81}
.ms-botao{display:none;background:none;border:1px solid rgba(34,30,27,.25);padding:9px 14px;font:inherit;font-size:14px;letter-spacing:.03em;color:#221E1B;cursor:pointer}
.ms-tela{--eo-serif:var(--font-newsreader),Newsreader,Georgia,serif;color:#221E1B;position:fixed;inset:0;z-index:60;background:#FAF8F5;display:flex;flex-direction:column;padding:18px 20px 28px;overflow:auto}
.ms-tela-topo{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
.ms-tela-topo p{font:500 24px/1 var(--eo-serif)}
.ms-tela-topo button{background:none;border:1px solid rgba(34,30,27,.25);padding:9px 14px;font:inherit;font-size:14px;color:#221E1B}
.ms-tela a.ms-grande{display:block;padding:16px 0;border-bottom:1px solid rgba(34,30,27,.1);font:400 26px/1.1 var(--eo-serif)}
.ms-tela .ms-sub{padding:14px 0 6px;border-bottom:1px solid rgba(34,30,27,.1)}
.ms-tela .ms-sub p{font:400 26px/1.1 var(--eo-serif);margin-bottom:8px}
.ms-tela .ms-sub a{display:flex;flex-direction:column;padding:9px 0 9px 14px;border-left:2px solid rgba(110,46,52,.25)}
.ms-tela .ms-sub small{font-size:13px;color:#928A81}
.ms-tela .ms-acoes{display:flex;flex-direction:column;gap:10px;margin-top:26px}
.ms-tela .ms-acoes a{text-align:center;padding:15px;font-size:15px;border:1px solid #221E1B}
.ms-tela .ms-acoes a.ms-cta{background:#6E2E34;border-color:#6E2E34;color:#FAF8F5}
.ms-links a.ms-destaque{color:#6E2E34;font-weight:600;display:inline-flex;align-items:center;gap:7px}
.ms-links a.ms-destaque::before{content:"";width:7px;height:7px;border-radius:99px;background:#6E2E34}
.ms-tela a.ms-grande.ms-destaque{color:#6E2E34}
@media (max-width:760px){.ms-links{display:none!important}.ms-botao{display:block}}
`;

function Grupo({ g }: { g: GrupoDoMenu }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // fechar com uma pequena espera: um desvio do mouse não derruba a lista
  const fechar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abrir = () => {
    if (fechar.current) clearTimeout(fechar.current);
    setAberto(true);
  };
  const sair = () => {
    if (fechar.current) clearTimeout(fechar.current);
    fechar.current = setTimeout(() => setAberto(false), 220);
  };
  useEffect(() => () => {
    if (fechar.current) clearTimeout(fechar.current);
  }, []);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);
  return (
    <div
      ref={ref}
      className="ms-grupo"
      data-aberto={aberto ? "1" : "0"}
      onMouseEnter={abrir}
      onMouseLeave={sair}
    >
      <button type="button" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        {g.rotulo} <span aria-hidden>▾</span>
      </button>
      <div className="ms-lista" role="menu">
        {g.itens.map((i) => (
          <a key={i.href} href={i.href} role="menuitem" onClick={() => setAberto(false)}>
            <b>{i.rotulo}</b>
            {i.nota ? <small>{i.nota}</small> : null}
          </a>
        ))}
      </div>
    </div>
  );
}

export function MenuDoSite({ entradas = MENU_DO_SITE, hrefConta }: { entradas?: EntradaDoMenu[]; hrefConta: string }) {
  const [tela, setTela] = useState(false);
  useEffect(() => {
    if (!tela) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [tela]);

  return (
    <div className="ms">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="ms ms-links" aria-label="Site">
        {entradas.map((e) =>
          eGrupo(e) ? (
            <Grupo key={e.rotulo} g={e} />
          ) : (
            <a key={e.href} href={e.href} className={e.destaque ? "ms-destaque" : undefined}>
              {e.rotulo}
            </a>
          )
        )}
      </nav>
      <button type="button" className="ms-botao" onClick={() => setTela(true)} aria-expanded={tela}>
        Menu
      </button>
      {tela
        ? createPortal(
        <div className="ms-tela" role="dialog" aria-label="Menu">
          <div className="ms-tela-topo">
            <p>eOrganizei</p>
            <button type="button" onClick={() => setTela(false)}>
              Fechar
            </button>
          </div>
          {entradas.map((e) =>
            eGrupo(e) ? (
              <div key={e.rotulo} className="ms-sub">
                <p>{e.rotulo}</p>
                {e.itens.map((i) => (
                  <a key={i.href} href={i.href} onClick={() => setTela(false)}>
                    {i.rotulo}
                    {i.nota ? <small>{i.nota}</small> : null}
                  </a>
                ))}
              </div>
            ) : (
              <a key={e.href} className={e.destaque ? "ms-grande ms-destaque" : "ms-grande"} href={e.href} onClick={() => setTela(false)}>
                {e.rotulo}
              </a>
            )
          )}
          <div className="ms-acoes">
            <a href={hrefConta} className="ms-cta">
              Começar com 1 evento
            </a>
            <a href="/login">Entrar</a>
          </div>
        </div>,
            // dentro do .s2/.ps (sem filtro): herda as fontes do site
            document.querySelector(".s2, .ps") ?? document.body
          )
        : null}
    </div>
  );
}
