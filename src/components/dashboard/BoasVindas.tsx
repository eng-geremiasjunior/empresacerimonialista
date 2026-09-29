// O painel de quem acaba de chegar (handoff "Dashboard · primeiro acesso",
// versão 2a, 29/09/2026). Aparece enquanto a conta não tem evento de
// verdade e ela não pulou (lib/supabase/primeiro-acesso.ts): no lugar de
// números zerados, por onde começar e o que o sistema entrega.
//
// Adaptações ao desenho, combinadas com o dono: o cartão "Importar dados"
// só volta quando a importação completa existir (eventos, clientes,
// convidados e fornecedores); o "Conheça o eOrganizei por dentro" (os
// exemplos) fica logo abaixo das áreas. Os textos não estreitam para
// casamento: o sistema é de eventos (regra do dono, 12/09/2026).

import Image from "next/image";
import Link from "next/link";
import { ConhecaPorDentro } from "@/components/evento/ConhecaPorDentro";
import { pularBoasVindas } from "@/app/(app)/eventos/dashboard/actions";
import { MENU_DO_APP } from "@/lib/menu-do-app";
import type { Cargo } from "@/lib/equipe-shared";

const TINTA = "#221E1B";
const CORPO = "#57534E";
const APOIO = "#78716C";
const LINHA = "#E6E0D8";
const NEVOA = "#F2EEE9";
const SALVIA = "#6E7F63";

const F_TITLE = "var(--font-title), Inter, system-ui, sans-serif";
const F_MONO = "var(--font-mono), 'IBM Plex Mono', ui-monospace, monospace";

// As fotos são de eventos reais, do próprio site (public/site, public/
// images, public/portal), alternando os tipos. O dono troca quando tiver
// as definitivas: é só o caminho e o enquadramento.
const FOTO_COMECE = { src: "/site/foto-casamento.webp", posicao: "50% 38%" };
const AREAS: { href: string; titulo: string; texto: string; foto: string; posicao: string }[] = [
  {
    href: "/eventos",
    titulo: "Eventos",
    texto: "Casamentos, 15 anos, formaturas e outras festas, com tarefas, convidados, mesas e o dia do evento.",
    foto: "/site/foto-palco.webp",
    posicao: "40% 40%",
  },
  {
    href: "/clientes",
    titulo: "Clientes",
    texto: "Noivos, famílias, empresas e contatos, com o histórico de cada um.",
    foto: "/site/foto-15-anos.webp",
    posicao: "50% 32%",
  },
  {
    href: "/orcamentos",
    titulo: "Gestão comercial",
    texto: "Orçamentos e propostas até virarem contrato fechado.",
    foto: "/images/hero-padrao.jpg",
    posicao: "62% 40%",
  },
  {
    href: "/fornecedores",
    titulo: "Fornecedores",
    texto: "Sua lista de parceiros, pronta para vincular a cada evento.",
    foto: "/portal/flores.jpg",
    posicao: "50% 50%",
  },
  {
    href: "/cerimonialistas",
    titulo: "Equipe",
    texto: "Quem trabalha com você e o que cada pessoa tem para fazer.",
    foto: "/site/foto-outros.webp",
    posicao: "50% 58%",
  },
  {
    href: "/financeiro",
    titulo: "Financeiro",
    texto: "Recebimentos dos clientes e pagamentos aos fornecedores.",
    foto: "/site/foto-casamento.webp",
    posicao: "50% 80%",
  },
];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function podeVer(href: string, cargo: Cargo | null): boolean {
  const item = MENU_DO_APP.find((i) => i.href === href);
  return !item?.cargos || (cargo !== null && item.cargos.includes(cargo));
}

export function BoasVindas({
  saudacao,
  primeiroNome,
  meta,
  mesAtual,
  cargo,
  porDentro,
}: {
  /** "Bom dia" · "Boa tarde" · "Boa noite", no horário de Brasília */
  saudacao: string;
  primeiroNome: string | null;
  /** "TERÇA · 29/09/2026 · 10:08" */
  meta: string;
  /** 0–11, em Brasília: o exemplo compara com o mês anterior */
  mesAtual: number;
  cargo: Cargo | null;
  porDentro: { mostrar: boolean; exemploCasamento: string | null } | null;
}) {
  const areas = AREAS.filter((a) => podeVer(a.href, cargo));
  const mesAnterior = MESES[(mesAtual + 11) % 12];

  return (
    // data-guia-silencio: esta tela já conduz; o guia do primeiro acesso espera
    <div data-guia-silencio="" style={{ display: "flex", flexDirection: "column", gap: 28, color: TINTA }}>
      {/* 1. a saudação */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "12px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <span style={{ fontFamily: F_MONO, fontSize: 12, color: APOIO, letterSpacing: "0.02em" }}>{meta}</span>
          <h1 className="pa-titulo" style={{ margin: 0, fontFamily: F_TITLE, fontWeight: 500, fontSize: 40, lineHeight: 1.05, letterSpacing: "-0.025em" }}>
            {primeiroNome ? `${saudacao}, ${primeiroNome}.` : `${saudacao}.`}
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: CORPO }}>
            Seu espaço está pronto. Comece pelo primeiro evento ou traga o que você já tem.
          </p>
        </div>
        <form action={pularBoasVindas} style={{ flex: "none" }}>
          <button
            type="submit"
            className="pa-pular"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: 0, background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: CORPO, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Pular e ir para o painel
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>

      {/* 2. a ação: o primeiro evento (o "Importar" volta com a importação completa) */}
      <section
        aria-label="Comece aqui"
        className="pa-comece"
        style={{ display: "flex", minHeight: 230, background: "#fff", border: `1px solid ${LINHA}`, borderRadius: 14, overflow: "hidden" }}
      >
        <div className="pa-comece-foto" style={{ flex: "0 1 36%", maxWidth: 420, minWidth: 180, position: "relative", background: NEVOA }}>
          <Image
            src={FOTO_COMECE.src}
            alt="Cerimônia montada ao ar livre, com o arco de flores"
            fill
            sizes="(max-width: 640px) 100vw, 420px"
            priority
            style={{ objectFit: "cover", objectPosition: FOTO_COMECE.posicao }}
          />
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center", minWidth: 0 }}>
          <span style={{ fontFamily: F_MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: SALVIA }}>COMECE AQUI</span>
          <h2 style={{ margin: 0, fontFamily: F_TITLE, fontWeight: 600, fontSize: 22, letterSpacing: "-0.02em" }}>Cadastre seu primeiro evento</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: CORPO, maxWidth: "52ch", textWrap: "pretty" }}>
            Nome do cliente, tipo de evento, data e local. O resto do sistema se organiza a partir dele.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
            <Link
              href="/eventos/novo"
              className="ev-btn-primario ev-foco"
              style={{ display: "inline-flex", alignItems: "center", height: 40, padding: "0 18px", borderRadius: 10, background: "var(--ev-accent)", color: "#fff", fontSize: 14, fontWeight: 600, transition: "background 140ms ease" }}
            >
              Criar evento
            </Link>
            <span style={{ fontFamily: F_MONO, fontSize: 12, color: APOIO }}>cerca de 2 min</span>
          </div>
        </div>
      </section>

      {/* 3. o que ela encontra aqui */}
      <section aria-label="O que você encontra aqui" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0, fontFamily: F_TITLE, fontWeight: 600, fontSize: 15 }}>O que você encontra aqui</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(max(220px, calc((100% - 24px) / 3)), 1fr))", gap: 12 }}>
          {areas.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="pa-cartao"
              style={{ display: "flex", minHeight: 84, background: "#fff", border: `1px solid ${LINHA}`, borderRadius: 12, overflow: "hidden", color: TINTA, transition: "border-color 140ms ease" }}
            >
              <span style={{ width: 84, flex: "none", position: "relative", background: NEVOA }}>
                <Image src={a.foto} alt="" fill sizes="84px" style={{ objectFit: "cover", objectPosition: a.posicao }} />
              </span>
              <span style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ fontFamily: F_TITLE, fontWeight: 600, fontSize: 14 }}>{a.titulo}</span>
                <span style={{ fontSize: 12, lineHeight: 1.4, color: CORPO }}>{a.texto}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* os exemplos de verdade (27/09/2026): o evento pronto e os portais */}
      {porDentro?.mostrar && <ConhecaPorDentro exemploCasamento={porDentro.exemploCasamento} />}

      {/* 4. o painel depois do primeiro evento — exemplo estático, nunca dado real */}
      <section aria-label="Seu painel depois do primeiro evento" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontFamily: F_TITLE, fontWeight: 600, fontSize: 15 }}>Seu painel depois do primeiro evento</h2>
          <span style={{ fontFamily: F_MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: APOIO, background: NEVOA, padding: "3px 8px", borderRadius: 999 }}>EXEMPLO</span>
        </div>
        <div style={{ border: "1px dashed #D6CFC6", borderRadius: 14, padding: 18, background: "#FAF8F5" }}>
          <div aria-hidden="true" style={{ opacity: 0.6, pointerEvents: "none", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {[
                { l: "Eventos em andamento", v: "4", s: "2 este mês" },
                { l: "Faturamento do mês", v: "R$ 86.400", s: `+12% sobre ${mesAnterior}` },
                { l: "Em orçamento", v: "3", s: "aguardando confirmação" },
              ].map((k) => (
                <div key={k.l} style={{ background: "#fff", border: `1px solid ${LINHA}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, color: APOIO }}>{k.l}</span>
                  <span style={{ fontFamily: F_TITLE, fontWeight: 600, fontSize: 22 }}>{k.v}</span>
                  <span style={{ fontSize: 11, color: "#4F6147" }}>{k.s}</span>
                </div>
              ))}
            </div>
            {[
              { t: "Casamento · Marina e Pedro", m: "18/04/2027 · Espaço Jardim Imperial", s: "Em dia", c: "#4F6147", bg: "#EDF0EA" },
              { t: "15 anos · Laura", m: "22/05/2027 · Villa Toscana", s: "2 pendências", c: "#8A6A2E", bg: "#F6EFE1" },
              { t: "Corporativo · Convenção Aurora", m: "09/07/2027 · Centro de Eventos Santa Clara", s: "Em dia", c: "#4F6147", bg: "#EDF0EA" },
            ].map((e) => (
              <div key={e.t} style={{ background: "#fff", border: `1px solid ${LINHA}`, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ fontFamily: F_TITLE, fontWeight: 600, fontSize: 14 }}>{e.t}</span>
                  <span style={{ fontFamily: F_MONO, fontSize: 11, color: APOIO }}>{e.m}</span>
                </span>
                <span style={{ flex: "none", fontSize: 12, fontWeight: 600, color: e.c, background: e.bg, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>● {e.s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
