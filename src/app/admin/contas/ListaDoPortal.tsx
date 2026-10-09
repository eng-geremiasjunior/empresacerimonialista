// A lista do portal da noiva: quem abriu a conta pelo portal (187), com a
// conta pronta ou com o cadastro esperando o link do e-mail.
//
// Desde 08/10/2026 (pedido do dono: "igual os da cerimonialista, mais
// completo — se está online, mexendo no que, construindo o que"): o ao
// vivo com a tela, o uso dos últimos 7 dias por tela, de onde veio e o que
// a festa já tem (site, convite, convidados e respostas, lista de
// presentes, planejamento…). Os textos são montados aqui, no servidor, com
// o "agora" de quem pediu a tela; a lista se renova sozinha a cada 30 s.

import Link from "next/link";
import type { ContaDoPortal } from "@/lib/supabase/admin-contas";
import type { PecaConstruida } from "@/lib/supabase/admin-portal";
import { dataBR } from "@/lib/admin/formatos";
import { diasDesde, diasEmPalavras } from "@/lib/admin/saude-da-conta";
import { haQuantoTempo, minutosEmPalavras } from "@/lib/presenca";
import { RenovarSozinha } from "./RenovarSozinha";

const MONO = "var(--font-mono), ui-monospace, monospace";

const TIPO: Record<string, string> = { casamento: "Casamento", debutante: "15 anos" };
const PAPEL: Record<string, string> = { noiva: "noiva", noivo: "noivo", mae: "mãe", pai: "pai", outro: "família" };

type Linha = {
  id: string;
  festa: string;
  quem: string;
  desde: string;
  evento: string;
  faltam: string | null;
  cidade: string | null;
  situacao: string;
  /** pede ação (cadastro parado ou conta suspensa): sai na cor de destaque */
  pede: boolean;
  aoVivo: string | null;
  visto: string;
  uso: string;
  areas: string | null;
  construcao: PecaConstruida[];
  origem: string | null;
  logins: string;
};

function linhaDoPortal(c: ContaDoPortal, agora: Date): Linha {
  const dias = diasDesde(c.criadaEm, agora) ?? 0;
  const situacao =
    c.situacao === "esperando_email"
      ? dias <= 0
        ? "esperando o link do e-mail desde hoje"
        : `esperando o link do e-mail ${diasEmPalavras(dias)}`
      : c.situacao === "nasce_no_primeiro_login"
        ? "e-mail confirmado; a festa nasce no primeiro login"
        : c.situacao === "suspensa"
          ? "suspensa"
          : "conta aberta";
  const d = c.detalhe;
  const login = diasDesde(c.ultimoLogin, agora);
  const faltamDias = c.dataDoEvento
    ? Math.round((new Date(`${c.dataDoEvento}T12:00:00`).getTime() - agora.getTime()) / 86_400_000)
    : null;
  return {
    id: c.userId,
    festa: c.festa,
    quem: [c.quem, c.papel ? PAPEL[c.papel] ?? c.papel : null, c.email].filter(Boolean).join(" · ") || "—",
    desde: dataBR(c.criadaEm),
    evento: [c.tipoDoEvento ? TIPO[c.tipoDoEvento] ?? c.tipoDoEvento : null, c.dataDoEvento ? dataBR(c.dataDoEvento) : null]
      .filter(Boolean)
      .join(" · ") || "—",
    faltam:
      faltamDias === null ? null : faltamDias < 0 ? "já aconteceu" : faltamDias === 0 ? "é hoje" : `faltam ${faltamDias} dias`,
    cidade: c.cidade,
    situacao,
    pede: c.situacao !== "aberta",
    aoVivo: d?.aoVivo ? d.aoVivo.area.replace(/^Portal › /, "") : null,
    visto: d?.vistoEm
      ? `no portal ${haQuantoTempo(d.vistoEm, agora.getTime())}`
      : login === null
        ? "nunca entrou"
        : `último login ${diasEmPalavras(login)}`,
    uso: d && d.uso7 > 0 ? `${minutosEmPalavras(d.uso7)} em ${d.dias7} ${d.dias7 === 1 ? "dia" : "dias"}` : "nada em 7 dias",
    areas: d && d.areas7.length ? d.areas7.map((a) => `${a.area} ${a.minutos} min`).join(" · ") : null,
    construcao: d?.construcao ?? [],
    origem: d?.origem ?? null,
    logins: `/admin/logins?id=${encodeURIComponent(c.userId)}`,
  };
}

function Pecas({ pecas }: { pecas: PecaConstruida[] }) {
  if (pecas.length === 0) return <span className="text-[#9a9ba1]">nada ainda</span>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {pecas.map((p) => (
        <li
          key={p.rotulo}
          className={`rounded-md border px-2 py-1 text-[12px] leading-tight ${
            p.forte ? "border-[#cdb8c6] bg-[#f7f1f5] text-[#4d2a42]" : "border-[#e4e4df] bg-[#fafaf8] text-[#3d3e44]"
          }`}
        >
          <span className="font-semibold">{p.rotulo}</span>
          {p.detalhe && <span className="block text-[11px] font-normal opacity-80">{p.detalhe}</span>}
        </li>
      ))}
    </ul>
  );
}

function Agora({ l }: { l: Linha }) {
  return l.aoVivo ? (
    <span className="inline-flex items-center gap-1.5 font-semibold text-[#2f7a4c]">
      <span className="h-2 w-2 rounded-full bg-[#2f9a5c]" aria-hidden />
      ao vivo · {l.aoVivo}
    </span>
  ) : (
    <span className="text-[#3d3e44]">{l.visto}</span>
  );
}

export function ListaDoPortal({ contas, agora }: { contas: ContaDoPortal[]; agora: Date }) {
  const linhas = contas.map((c) => linhaDoPortal(c, agora));
  const aoVivo = linhas.filter((l) => l.aoVivo);
  return (
    <div className="flex flex-col gap-2">
      <RenovarSozinha />
      <p className="flex items-center gap-2 text-[12.5px] text-[#3d3e44]">
        <span className={`h-2 w-2 rounded-full ${aoVivo.length ? "bg-[#2f9a5c]" : "bg-[#c9c9c4]"}`} aria-hidden />
        {aoVivo.length === 0
          ? "Ninguém no portal agora"
          : `${aoVivo.length} no portal agora: ${aoVivo.map((l) => `${l.festa} (${l.aoVivo})`).join(", ")}`}
        <span className="text-[#9a9ba1]">· atualiza a cada 30 s</span>
      </p>

      {/* computador: tabela */}
      <div className="hidden overflow-x-auto rounded-lg border border-[#dededa] bg-white lg:block">
        <table className="w-full min-w-[1100px] border-collapse text-[13px]">
          <thead>
            <tr
              className="border-b border-[#dededa] text-left text-[10.5px] uppercase tracking-[0.08em] text-[#84858b]"
              style={{ fontFamily: MONO }}
            >
              <th className="px-3 py-2 font-medium">Conta</th>
              <th className="px-3 py-2 font-medium">Evento</th>
              <th className="px-3 py-2 font-medium">Agora</th>
              <th className="px-3 py-2 font-medium">Uso em 7 dias</th>
              <th className="px-3 py-2 font-medium">O que já construiu</th>
              <th className="px-3 py-2 font-medium">Origem</th>
              <th className="px-3 py-2 font-medium">
                <span className="sr-only">Acesso</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className="border-b border-[#ecece8] align-top last:border-0 hover:bg-[#fafaf8]">
                <td className="max-w-[240px] px-3 py-2.5">
                  <p className="font-semibold text-[#1c1d21]">{l.festa}</p>
                  <p className="mt-0.5 truncate text-[12px] text-[#84858b]">{l.quem}</p>
                  <p className="text-[11px] text-[#9a9ba1]">desde {l.desde}</p>
                  {l.pede && <p className="mt-1 text-[12px] text-[#6e3f5f]">{l.situacao}</p>}
                </td>
                <td className="px-3 py-2.5 text-[#3d3e44]">
                  <p>{l.evento}</p>
                  {l.faltam && <p className="mt-0.5 text-[12px] text-[#84858b]">{l.faltam}</p>}
                  {l.cidade && <p className="text-[12px] text-[#84858b]">{l.cidade}</p>}
                </td>
                <td className="max-w-[180px] px-3 py-2.5">
                  <Agora l={l} />
                </td>
                <td className="max-w-[200px] px-3 py-2.5 text-[#3d3e44]">
                  <p>{l.uso}</p>
                  {l.areas && <p className="mt-0.5 text-[11.5px] leading-snug text-[#84858b]">{l.areas}</p>}
                </td>
                <td className="max-w-[340px] px-3 py-2.5">
                  <Pecas pecas={l.construcao} />
                </td>
                <td className="max-w-[160px] px-3 py-2.5 text-[12px] text-[#5c5d63]">{l.origem ?? "—"}</td>
                <td className="px-3 py-2.5 text-right">
                  <Link href={l.logins} className="text-[12.5px] text-[#6e3f5f] underline underline-offset-2">
                    Abrir no Logins
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* celular e tela média: cartões, tudo à vista, sem rolagem lateral */}
      <ul className="flex flex-col gap-2 lg:hidden">
        {linhas.map((l) => (
          <li key={l.id} className="rounded-lg border border-[#dededa] bg-white px-4 py-3">
            <p className="text-[15px] font-semibold text-[#1c1d21]">{l.festa}</p>
            <p className="mt-0.5 break-words text-[12px] text-[#84858b]">
              {l.quem} · desde {l.desde}
            </p>
            {l.pede && <p className="mt-1.5 text-[13px] leading-snug text-[#6e3f5f]">{l.situacao}</p>}
            <p className="mt-2 text-[13px]">
              <Agora l={l} />
            </p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
              <dt className="text-[#84858b]">Evento</dt>
              <dd className="text-[#3d3e44]">{[l.evento, l.faltam, l.cidade].filter(Boolean).join(" · ")}</dd>
              <dt className="text-[#84858b]">Uso em 7 dias</dt>
              <dd className="text-[#3d3e44]">
                {l.uso}
                {l.areas && <span className="block text-[11.5px] text-[#84858b]">{l.areas}</span>}
              </dd>
              <dt className="text-[#84858b]">Origem</dt>
              <dd className="text-[#3d3e44]">{l.origem ?? "—"}</dd>
            </dl>
            <div className="mt-2">
              <Pecas pecas={l.construcao} />
            </div>
            <Link href={l.logins} className="mt-2 inline-block text-[12.5px] text-[#6e3f5f] underline underline-offset-2">
              Abrir no Logins
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
