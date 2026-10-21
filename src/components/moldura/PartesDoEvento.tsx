"use client";

// As partes do evento (15/10/2026, handoff design_handoff_eorganizei): a
// segunda linha da moldura dentro do evento — Planejamento, Roteiro,
// Cerimônia, Fornecedores, Convidados e "Mais ▾". No celular viram a barra
// do rodapé, com 5 colunas. Substitui o cabeçalho com capa e o bloco das
// três fases: as rotas continuam as mesmas, só a navegação mudou.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { tem } from "@/lib/capacidades";
import { segmentoDoCaminho } from "@/lib/fases-do-evento";
import { abrirAbaExtra } from "@/lib/abas-de-evento";
import { useMoldura } from "./contexto";

type Parte = { label: string; seg: string };

const PARTES_CSS = `
.mo-partes{display:flex; align-items:center; gap:28px; padding:10px 24px;
  font-size:14px; flex-wrap:wrap; width:100%}
.mo-parte{color:var(--mo-cinza-1); font-weight:500; text-decoration:none; padding:2px 0}
.mo-parte:focus-visible{outline:2px solid var(--mo-destaque); outline-offset:3px; border-radius:2px}
.mo-parte:hover{color:var(--mo-tinta)}
.mo-parte-ativa{color:var(--mo-tinta); font-weight:600; text-decoration:underline; text-decoration-thickness:2px;
  text-underline-offset:13px; text-decoration-color:var(--mo-destaque)}
.mo-mais{position:relative}
.mo-mais>button{border:0; background:none; padding:2px 0; font-size:14px; color:var(--mo-cinza-1); cursor:pointer}
.mo-mais>button:hover{color:var(--mo-tinta)}
.mo-mais .mo-menu{top:calc(100% + 8px); left:0}
.mo-partes-dir{margin-left:auto; display:flex; gap:18px; align-items:center}
.mo-barra-cel{display:none}
.mo-folha-cel{display:none}
@media (max-width:1023px){
  .mo-partes{display:none}
  /* no celular vale o modelo anterior (18/10/2026): os blocos das fases no
     topo do evento (BlocoDeFases, no layout); a barra de baixo não aparece */
  .mo-barra-cel{display:none}
  .mo-barra-cel-status{background:var(--mo-nevoa); border-top:1px solid var(--mo-linha); padding:6px 16px; font-size:12px; color:var(--mo-cinza-1);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
  .mo-barra-cel-partes{display:grid; grid-template-columns:repeat(5,1fr); background:var(--mo-marfim); border-top:1px solid var(--mo-linha)}
  .mo-barra-cel-partes a,.mo-barra-cel-partes button{display:block; text-align:center; padding:14px 0; font-size:11.5px; color:var(--mo-cinza-1);
    text-decoration:none; border:0; border-top:2px solid transparent; background:none; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
  .mo-barra-cel-partes .ativa{color:var(--mo-tinta); font-weight:600; border-top-color:var(--mo-tinta)}
  .mo-folha-cel{position:fixed; inset:0; z-index:60; background:var(--mo-veu); display:flex; align-items:flex-end}
  .mo-folha-cel nav{width:100%; background:var(--mo-papel); border-top:1px solid var(--mo-linha); border-radius:4px 4px 0 0;
    max-height:75vh; overflow-y:auto; padding:8px 0 16px}
  .mo-folha-cel a{display:block; padding:12px 16px; font-size:15px; color:var(--mo-tinta); text-decoration:none; border-top:1px solid var(--mo-linha)}
  .mo-folha-cel a:first-child{border-top:0}
}
`;

export function PartesDoEvento({
  eventId,
  tipo,
  nome,
  data,
  modoEventoPerto,
  ia = false,
}: {
  eventId: string;
  tipo: string;
  nome: string;
  data: string | null;
  /** faltam 7 dias ou menos: o Modo Evento aparece na linha */
  modoEventoPerto: boolean;
  /** a IA nova liberada (contas da casa, até o dono ligar "para todos") */
  ia?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const seg = segmentoDoCaminho(pathname, eventId);
  const base = `/eventos/${eventId}`;
  const m = useMoldura();
  const fatos = m?.fatos ?? null;

  // aberto aqui = aba aberta na moldura (as 3 mais próximas já estão lá; a
  // moldura não mostra repetida)
  useEffect(() => {
    abrirAbaExtra({ id: eventId, nome, data });
  }, [eventId, nome, data]);

  const cerimonia = tem(tipo, "cortejo");
  const convidados = tem(tipo, "listaNominal");
  const principais: Parte[] = [
    { label: "Planejamento", seg: "planejamento" },
    { label: "Roteiro", seg: "roteiro" },
    ...(cerimonia ? [{ label: "Cerimônia", seg: "cortejo" }] : []),
    { label: "Fornecedores", seg: "fornecedores" },
    // "RSVP" (21/10/2026): é a palavra que o público busca e o mercado usa
    ...(convidados ? [{ label: "RSVP", seg: "rsvp" }] : []),
    // em evidência (16/10/2026): a cerimonialista abre e manda o acesso à cliente
    { label: "Portal da cliente", seg: "area-do-cliente" },
  ];
  const mais: Parte[] = [
    { label: "Resumo", seg: "" },
    { label: "Tarefas", seg: "organizacao" },
    { label: "Contratos", seg: "contratos" },
    { label: "Comunicação", seg: "comunicacao" },
    { label: "Financeiro", seg: "financeiro" },
    { label: "Operação", seg: "operacao" },
    ...(tem(tipo, "mesas") ? [{ label: "Mesas", seg: "mesas" }] : []),
    ...(ia ? [{ label: "Reuniões", seg: "reunioes" }] : []),
    { label: "Histórico", seg: "historico" },
  ];
  const href = (s: string) => (s ? `${base}/${s}` : base);
  const ativo = (s: string) => seg === s || (s === "organizacao" && seg === "tarefas");
  const maisAtivo = mais.some((p) => ativo(p.seg)) || seg === "editar";

  // As vistas na barra de status: Trabalho (a tela), Folha (a impressão,
  // quando a parte tem uma) e Família (o que a família vê).
  const setVistas = m?.setVistas;
  useEffect(() => {
    if (!setVistas) return;
    const FOLHA: Record<string, string> = {
      planejamento: `/imprimir/planejamento/${eventId}`,
      panorama: `/imprimir/evento/${eventId}`,
      roteiro: `/imprimir/roteiro/${eventId}`,
      mesas: `/imprimir/mesas/${eventId}`,
      operacao: `/imprimir/operacao/${eventId}`,
    };
    const naFamilia = seg === "area-do-cliente";
    const folha = FOLHA[seg];
    setVistas([
      { label: "Trabalho", href: naFamilia ? base : pathname, ativa: !naFamilia },
      ...(folha ? [{ label: "Folha", href: folha, ativa: false, novaAba: true }] : []),
      { label: "Família", href: `${base}/area-do-cliente`, ativa: naFamilia },
    ]);
    return () => setVistas(null);
  }, [setVistas, seg, pathname, base, eventId]);

  // a linha mora na moldura, logo abaixo das abas (largura inteira)
  const [alvo, setAlvo] = useState<HTMLElement | null>(null);
  useEffect(() => setAlvo(document.getElementById("mo-segunda-linha")), []);

  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setAberto(false), [pathname]);
  useEffect(() => {
    if (!aberto) return;
    const fn = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [aberto]);

  // celular: 5 colunas fixas — as 4 primeiras partes + Mais; o resto vai pro Mais
  // (Fornecedores fica no Mais no celular, pelo desenho; entra só se faltar parte)
  const ordemCel = ["planejamento", "roteiro", "cortejo", "rsvp", "fornecedores"];
  const noRodape = ordemCel
    .map((s) => principais.find((p) => p.seg === s))
    .filter((p): p is Parte => !!p)
    .slice(0, 4);
  const sobra = [...principais.filter((p) => !noRodape.includes(p)), ...mais];

  const extras = (
    <>
      <hr />
      <Link href={`${base}/editar`}>Editar dados do evento</Link>
      <Link href={`/eventos/${eventId}/modo-evento`}>Modo Evento</Link>
    </>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PARTES_CSS }} />
      {alvo && createPortal(
      <nav className="mo-partes" aria-label="Partes do evento">
        {principais.map((p) => (
          <Link key={p.seg} href={href(p.seg)} className={`mo-parte ${ativo(p.seg) ? "mo-parte-ativa" : ""}`}>
            {p.label}
          </Link>
        ))}
        <div className="mo-mais" ref={ref}>
          <button
            type="button"
            aria-expanded={aberto}
            className={maisAtivo ? "mo-parte-ativa" : ""}
            onClick={() => setAberto((a) => !a)}
          >
            Mais ▾
          </button>
          {aberto && (
            <div className="mo-menu">
              {mais.map((p) => (
                <Link key={p.seg || "resumo"} href={href(p.seg)}>{p.label}</Link>
              ))}
              {extras}
            </div>
          )}
        </div>
        {modoEventoPerto && (
          <div className="mo-partes-dir">
            <Link href={`/eventos/${eventId}/modo-evento`} className="mo-parte" style={{ color: "var(--mo-tinta)", fontWeight: 600 }}>
              Modo Evento
            </Link>
          </div>
        )}
      </nav>,
      alvo)}

      {/* celular: barra do rodapé, com os fatos em cima */}
      <div className="mo-barra-cel">
        {fatos && <div className="mo-barra-cel-status">{fatos}</div>}
        <nav className="mo-barra-cel-partes" aria-label="Partes do evento">
          {noRodape.map((p) => (
            <Link key={p.seg} href={href(p.seg)} className={ativo(p.seg) ? "ativa" : ""}>
              {p.label}
            </Link>
          ))}
          <button
            type="button"
            className={sobra.some((p) => ativo(p.seg)) || seg === "editar" ? "ativa" : ""}
            onClick={() => setAberto(true)}
          >
            Mais
          </button>
        </nav>
      </div>
      {aberto && (
        <div className="mo-folha-cel" onClick={() => setAberto(false)}>
          <nav onClick={(e) => e.stopPropagation()} aria-label="Mais do evento">
            {sobra.map((p) => (
              <Link key={p.seg || "resumo"} href={href(p.seg)}>{p.label}</Link>
            ))}
            <Link href={`${base}/editar`}>Editar dados do evento</Link>
            <Link href={`/eventos/${eventId}/modo-evento`}>Modo Evento</Link>
          </nav>
        </div>
      )}
    </>
  );
}
