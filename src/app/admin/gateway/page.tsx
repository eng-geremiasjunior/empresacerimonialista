import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { emailDoSuperAdmin } from "@/lib/supabase/admin-painel";

export const dynamic = "force-dynamic";

// O log do gateway — a caixa-preta da cobrança, no estilo do log do
// WooCommerce. Dois lados na mesma linha do tempo:
//
//   → o que NÓS mandamos (gateway_log): cada chamada à API, com status
//     e, nas falhas, o corpo do erro — o "The customer Document is
//     required" que antes morria no console da Vercel.
//   ← o que ELES mandam (gateway_evento): cada webhook, com o tipo e o
//     que o processamento decidiu.
//
// Só leitura, via service role, atrás do gate de SUPER_ADMIN_EMAILS — o
// mesmo desenho do resto do /admin. Nenhum segredo aparece: chave não é
// logada, cartão nunca passa por aqui.

function servico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type Linha = {
  quando: string;
  direcao: "→ enviado" | "← webhook";
  titulo: string;
  ok: boolean;
  detalhe: string | null;
  duracao: string | null;
};

function resumo(v: unknown): string | null {
  if (v == null) return null;
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 600 ? `${s.slice(0, 600)}…` : s;
}

export default async function AdminGatewayPage() {
  const email = await emailDoSuperAdmin();
  if (!email) notFound();

  const db = servico();
  const [chamadas, webhooks] = await Promise.all([
    db
      .from("gateway_log")
      .select("metodo, caminho, status, ok, resposta, excecao, duracao_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("gateway_evento")
      .select("tipo, evento_id, processado_em, erro, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const linhas: Linha[] = [
    ...(chamadas.data ?? []).map((c): Linha => {
      const r = c.resposta as { message?: string; errors?: Record<string, string[]> } | null;
      const erroCurto = r?.errors
        ? Object.entries(r.errors)
            .map(([campo, msgs]) => `${campo}: ${msgs?.[0] ?? ""}`)
            .join(" · ")
        : r?.message ?? null;
      return {
        quando: c.created_at as string,
        direcao: "→ enviado",
        titulo: `${c.metodo} ${c.caminho} — HTTP ${c.status ?? "sem resposta"}`,
        ok: Boolean(c.ok),
        detalhe: c.ok
          ? null
          : (c.excecao as string | null) ?? erroCurto ?? resumo(c.resposta),
        duracao: c.duracao_ms != null ? `${c.duracao_ms} ms` : null,
      };
    }),
    ...(webhooks.data ?? []).map(
      (w): Linha => ({
        quando: w.created_at as string,
        direcao: "← webhook",
        titulo: w.tipo as string,
        // "erro" preenchido com nota de descarte ("sem assinatura no
        // payload") não é falha — falha de webhook é não ser processado
        ok: w.processado_em != null || w.erro == null,
        detalhe: (w.erro as string | null) ?? null,
        duracao: null,
      })
    ),
  ].sort((a, b) => (a.quando < b.quando ? 1 : -1));

  const fmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Gateway</h1>
          <p className="mt-1 text-sm text-stone-500">
            Tudo o que saiu para o Pagar.me e tudo o que voltou — as falhas
            com o motivo que a operadora deu, palavra por palavra.
          </p>
        </div>
        <p className="text-xs text-stone-400">
          últimas {linhas.length} entradas · horário de Brasília
        </p>
      </div>

      {linhas.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
          Nada registrado ainda. A partir de agora, cada chamada e cada
          webhook aparecem aqui.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
                <th className="px-3 py-2 font-medium">Quando</th>
                <th className="px-3 py-2 font-medium">Direção</th>
                <th className="px-3 py-2 font-medium">O quê</th>
                <th className="px-3 py-2 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr
                  key={i}
                  className={`border-b border-stone-100 align-top ${l.ok ? "" : "bg-red-50/60"}`}
                >
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-stone-500">
                    {fmt.format(new Date(l.quando))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-stone-500">
                    {l.direcao}
                  </td>
                  <td className="px-3 py-2 font-medium text-stone-800">
                    {l.titulo}
                    {l.duracao && (
                      <span className="ml-2 text-xs font-normal text-stone-400">
                        {l.duracao}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {l.ok ? (
                      <span className="text-emerald-700">ok</span>
                    ) : (
                      <span className="font-medium text-red-700">falhou</span>
                    )}
                    {l.detalhe && (
                      <pre className="mt-1 max-w-xl whitespace-pre-wrap break-words rounded bg-stone-100 px-2 py-1 font-mono text-xs text-stone-700">
                        {l.detalhe}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
