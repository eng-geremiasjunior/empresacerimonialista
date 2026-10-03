// A lista do portal da noiva: quem abriu a conta pelo portal (187), com a
// conta pronta ou com o cadastro esperando o link do e-mail. Sem ficha:
// a ponte de cada linha é o Logins, onde o acesso se corrige. Os textos
// são montados aqui, no servidor, com o "agora" de quem pediu a tela.

import Link from "next/link";
import type { ContaDoPortal } from "@/lib/supabase/admin-contas";
import { dataBR } from "@/lib/admin/formatos";
import { diasDesde, diasEmPalavras } from "@/lib/admin/saude-da-conta";

const MONO = "var(--font-mono), ui-monospace, monospace";

const TIPO: Record<string, string> = { casamento: "Casamento", debutante: "15 anos" };
const PAPEL: Record<string, string> = { noiva: "noiva", noivo: "noivo", mae: "mãe", pai: "pai", outro: "família" };

type Linha = {
  id: string;
  festa: string;
  quem: string;
  desde: string;
  evento: string;
  cidade: string | null;
  situacao: string;
  /** pede ação (cadastro parado ou conta suspensa): sai na cor de destaque */
  pede: boolean;
  ultimoLogin: string;
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
  const login = diasDesde(c.ultimoLogin, agora);
  return {
    id: c.userId,
    festa: c.festa,
    quem: [c.quem, c.papel ? PAPEL[c.papel] ?? c.papel : null, c.email].filter(Boolean).join(" · ") || "—",
    desde: dataBR(c.criadaEm),
    evento: [c.tipoDoEvento ? TIPO[c.tipoDoEvento] ?? c.tipoDoEvento : null, c.dataDoEvento ? dataBR(c.dataDoEvento) : null]
      .filter(Boolean)
      .join(" · ") || "—",
    cidade: c.cidade,
    situacao,
    pede: c.situacao !== "aberta",
    ultimoLogin: login === null ? "nunca entrou" : diasEmPalavras(login),
    logins: `/admin/logins?id=${encodeURIComponent(c.userId)}`,
  };
}

export function ListaDoPortal({ contas, agora }: { contas: ContaDoPortal[]; agora: Date }) {
  const linhas = contas.map((c) => linhaDoPortal(c, agora));
  return (
    <div className="flex flex-col gap-2">
      {/* computador: tabela */}
      <div className="hidden overflow-x-auto rounded-lg border border-[#dededa] bg-white lg:block">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <thead>
            <tr
              className="border-b border-[#dededa] text-left text-[10.5px] uppercase tracking-[0.08em] text-[#84858b]"
              style={{ fontFamily: MONO }}
            >
              <th className="px-3 py-2 font-medium">Conta</th>
              <th className="px-3 py-2 font-medium">Evento</th>
              <th className="px-3 py-2 font-medium">Situação</th>
              <th className="px-3 py-2 font-medium">Último login</th>
              <th className="px-3 py-2 font-medium">
                <span className="sr-only">Acesso</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className="border-b border-[#ecece8] align-top last:border-0 hover:bg-[#fafaf8]">
                <td className="max-w-[300px] px-3 py-2.5">
                  <p className="font-semibold text-[#1c1d21]">{l.festa}</p>
                  <p className="mt-0.5 truncate text-[12px] text-[#84858b]">{l.quem}</p>
                  <p className="text-[11px] text-[#9a9ba1]">desde {l.desde}</p>
                </td>
                <td className="px-3 py-2.5 text-[#3d3e44]">
                  <p>{l.evento}</p>
                  {l.cidade && <p className="mt-0.5 text-[12px] text-[#84858b]">{l.cidade}</p>}
                </td>
                <td className={`max-w-[240px] px-3 py-2.5 ${l.pede ? "text-[#6e3f5f]" : "text-[#3d3e44]"}`}>{l.situacao}</td>
                <td className="px-3 py-2.5 text-[#3d3e44]">{l.ultimoLogin}</td>
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
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
              <dt className="text-[#84858b]">Evento</dt>
              <dd className="text-[#3d3e44]">{[l.evento, l.cidade].filter(Boolean).join(" · ")}</dd>
              <dt className="text-[#84858b]">Último login</dt>
              <dd className="text-[#3d3e44]">{l.ultimoLogin}</dd>
            </dl>
            <Link href={l.logins} className="mt-2 inline-block text-[12.5px] text-[#6e3f5f] underline underline-offset-2">
              Abrir no Logins
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
