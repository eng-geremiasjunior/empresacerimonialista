// Os logins (02/10/2026): achar uma pessoa pelo e-mail e corrigir o
// acesso dela sem depender de ninguém — trocar o e-mail, mandar o link de
// nova senha, confirmar o e-mail, apagar um cadastro de festa pendente.
// Cada busca e cada ação ficam na auditoria (admin-logins.ts).

import Link from "next/link";
import { buscarLoginPorIdDb, buscarLoginsDb, type LoginDoPainel } from "@/lib/supabase/admin-logins";
import { AcoesDoLogin } from "./AcoesDoLogin";

export const dynamic = "force-dynamic";

const DIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const DIA_E_HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const CARGO: Record<string, string> = {
  proprietaria: "dona",
  coordenadora: "coordenadora",
  cerimonialista: "cerimonialista",
  assistente: "assistente",
};

function dataDoEvento(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function linhas(l: LoginDoPainel): string[] {
  const out: string[] = [];
  if (l.dono) out.push(`Dona da conta ${l.dono.nome || "sem nome"} (${l.dono.tipo === "familia" ? "conta de família" : "cerimonial"})`);
  for (const m of l.equipe) {
    if (l.dono && m.empresaId === l.dono.empresaId) continue;
    out.push(`Equipe de ${m.empresa || "uma conta"} (${CARGO[m.cargo] ?? m.cargo}${m.status !== "ativo" ? `, ${m.status}` : ""})`);
  }
  for (const a of l.acessos) {
    const [nome, data] = a.evento.split(" · ");
    out.push(`Portal: ${nome || "evento"}${data ? `, ${dataDoEvento(data)}` : ""} (${a.papel}${a.status !== "ativo" ? `, ${a.status}` : ""})`);
  }
  if (l.festaPendente) {
    out.push(`Cadastro de festa esperando o link do e-mail: ${l.festaPendente.festa}, ${dataDoEvento(l.festaPendente.data)}`);
  }
  if (l.festaNoPrimeiroLogin) {
    out.push(`Festa que nasce no primeiro login: ${l.festaNoPrimeiroLogin.festa}, ${dataDoEvento(l.festaNoPrimeiroLogin.data)}`);
  }
  if (out.length === 0) out.push("Sem conta, equipe nem acesso ao portal.");
  return out;
}

export default async function LoginsPage({ searchParams }: { searchParams?: { busca?: string; id?: string } }) {
  const busca = (searchParams?.busca ?? "").trim();
  // ?id= vem do aviso de conflito: abre aquele login sem pôr o e-mail na URL
  const porId = (searchParams?.id ?? "").trim();
  const logins = porId ? await buscarLoginPorIdDb(porId) : busca.length >= 3 ? await buscarLoginsDb(busca) : [];
  const donos = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return (
    <div data-adm-secao="logins" className="flex max-w-4xl flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-stone-900">Logins</h1>
        <form method="get" className="flex flex-wrap gap-2">
          <input
            name="busca"
            defaultValue={busca}
            placeholder="parte do e-mail (3 letras ou mais)"
            aria-label="Buscar login pelo e-mail"
            autoComplete="off"
            className="h-9 min-w-[260px] flex-1 rounded-md border border-[#d3d3cf] bg-white px-3 text-[14px] text-[#1c1d21]"
          />
          <button
            type="submit"
            className="h-9 rounded-md bg-[#33343a] px-4 text-[13px] font-semibold text-white hover:bg-[#4d4e55]"
          >
            Buscar
          </button>
        </form>
        {busca.length > 0 && busca.length < 3 && <p className="text-sm text-stone-500">Digite pelo menos 3 letras.</p>}
        {busca.length >= 3 && logins.length === 0 && (
          <p className="text-sm text-stone-500">Nenhum login com &ldquo;{busca}&rdquo;.</p>
        )}
      </section>

      {logins.length > 0 && (
        <ul className="flex flex-col gap-3">
          {logins.map((l) => {
            const doDono = donos.includes(l.email.toLowerCase());
            return (
              <li key={l.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="break-all text-sm font-semibold text-stone-900">{l.email}</span>
                  <span className="text-xs text-stone-500">
                    {l.confirmado ? "e-mail confirmado" : <span className="text-amber-800">falta confirmar o e-mail</span>}
                    {l.banido && <span className="text-red-700"> · suspenso</span>}
                    {doDono && " · dono do sistema"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  criado em {DIA.format(new Date(l.criadoEm))}
                  {" · "}
                  {l.ultimoAcesso ? `último acesso ${DIA_E_HORA.format(new Date(l.ultimoAcesso))}` : "nunca entrou"}
                  {" · "}
                  entra com {l.provedores.includes("google") ? "Google" : "e-mail e senha"}
                  {l.provedores.includes("google") && l.provedores.includes("email") ? " ou e-mail e senha" : ""}
                </p>
                <ul className="mt-2 flex flex-col gap-0.5 text-[13px] text-stone-700">
                  {linhas(l).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                {l.dono && l.dono.tipo !== "familia" && (
                  <Link
                    href={`/admin/contas/${l.dono.empresaId}`}
                    className="mt-1 inline-block text-[12.5px] text-[#6e3f5f] underline underline-offset-2"
                  >
                    Abrir a ficha da conta
                  </Link>
                )}
                <AcoesDoLogin userId={l.id} confirmado={l.confirmado} pendente={!!l.festaPendente} doDono={doDono} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
