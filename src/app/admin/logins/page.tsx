// Os logins (02/10/2026): achar uma pessoa pelo e-mail e corrigir o
// acesso dela sem depender de ninguém — trocar o e-mail, mandar o link de
// nova senha, confirmar o e-mail, apagar um cadastro de festa pendente.
// Cada busca e cada ação ficam na auditoria (admin-logins.ts).

import Link from "next/link";
import { buscarLoginPorIdDb, buscarLoginsDb, type LoginDoPainel } from "@/lib/supabase/admin-logins";
import { getTentativasBarradas, type TentativaBarrada } from "@/lib/supabase/admin-tentativas";
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

const PORTA: Record<TentativaBarrada["porta"], string> = {
  site: "site",
  cadastro: "cadastro gratuito",
  assinatura: "cadastro com cartão",
  portal: "cadastro no portal da noiva/debutante",
};

const MOTIVO: Record<TentativaBarrada["motivo"], string> = {
  ip_bloqueado: "IP bloqueado",
  navegador_barrado: "navegador barrado",
  conta_suspensa: "mesmo navegador ou WhatsApp de conta suspensa",
  email_descartavel: "e-mail temporário",
  email_sem_caixa: "e-mail que não recebe mensagens",
  documento_repetido: "CPF/CNPJ de outra conta",
  conta_repetida: "já tem conta (mesmo navegador ou WhatsApp)",
  fora_do_brasil: "acesso de fora do Brasil",
  impressao_digital: "impressão digital do navegador",
};

function haQuanto(iso: string, agora: Date): string {
  const min = Math.max(0, Math.round((agora.getTime() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return min <= 1 ? "agora há pouco" : `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

/** As tentativas barradas dos últimos 7 dias (207): o resumo por motivo e as linhas. */
function TentativasBarradas({ tentativas, tabela }: { tentativas: TentativaBarrada[]; tabela: boolean }) {
  const agora = new Date();
  if (!tabela) {
    return <p className="text-sm text-stone-500">Ainda não há registro de tentativas barradas (falta aplicar a migração 207).</p>;
  }
  if (tentativas.length === 0) {
    return <p className="text-sm text-stone-500">Nenhuma tentativa barrada nos últimos 7 dias.</p>;
  }
  const porMotivo = new Map<TentativaBarrada["motivo"], { vezes: number; ultima: string }>();
  for (const t of tentativas) {
    const m = porMotivo.get(t.motivo);
    if (!m) porMotivo.set(t.motivo, { vezes: t.vezes, ultima: t.ultimaEm });
    else {
      m.vezes += t.vezes;
      if (t.ultimaEm > m.ultima) m.ultima = t.ultimaEm;
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-0.5 text-[13.5px] text-stone-800">
        {[...porMotivo.entries()].map(([motivo, m]) => (
          <li key={motivo}>
            <span className="font-semibold">{MOTIVO[motivo]}</span>: {m.vezes} {m.vezes === 1 ? "vez" : "vezes"}, a última{" "}
            {haQuanto(m.ultima, agora)}
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[12.5px] text-stone-700">
          <thead className="text-stone-500">
            <tr>
              <th className="py-1 pr-3 font-medium">Última vez</th>
              <th className="py-1 pr-3 font-medium">Onde</th>
              <th className="py-1 pr-3 font-medium">Motivo</th>
              <th className="py-1 pr-3 font-medium">IP</th>
              <th className="py-1 font-medium tabular-nums">Vezes na hora</th>
            </tr>
          </thead>
          <tbody>
            {tentativas.slice(0, 40).map((t) => (
              <tr key={`${t.hora}-${t.porta}-${t.motivo}-${t.ip}`} className="border-t border-stone-100">
                <td className="py-1 pr-3 whitespace-nowrap">{DIA_E_HORA.format(new Date(t.ultimaEm))}</td>
                <td className="py-1 pr-3">{PORTA[t.porta]}</td>
                <td className="py-1 pr-3">{MOTIVO[t.motivo]}</td>
                <td className="py-1 pr-3 whitespace-nowrap">
                  {t.ip || "—"}
                  {t.ipDaLista && <span className="text-stone-500"> · da lista de bloqueio</span>}
                </td>
                <td className="py-1 tabular-nums">{t.vezes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
  const [logins, barradas] = await Promise.all([
    porId ? buscarLoginPorIdDb(porId) : busca.length >= 3 ? buscarLoginsDb(busca) : Promise.resolve([] as LoginDoPainel[]),
    getTentativasBarradas(new Date(Date.now() - 7 * 86_400_000).toISOString()),
  ]);
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

      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold text-stone-900">Tentativas barradas</h2>
        <TentativasBarradas tentativas={barradas.tentativas} tabela={barradas.tabela} />
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
