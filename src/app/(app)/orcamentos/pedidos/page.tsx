// Pedidos de orçamento — a fila de quem pediu pela página pública.
//
// Visão de Orçamentos, ao lado de Propostas: o pedido é o que vem ANTES da
// proposta. Ninguém cadastra nada aqui; o pedido chega sozinho, e sai da
// fila quando vira proposta ou quando é encerrado.

import Link from "next/link";
import { SubNav } from "@/components/SubNav";
import { VISOES_ORCAMENTOS } from "@/lib/visoes";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { contarPedidos, lerPedidos } from "@/lib/supabase/pedidos";
import { PedidoCartao } from "@/components/comercial/pedidos/PedidoCartao";
import type { PedidoStatus } from "@/lib/comercial/pedidos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pedidos de orçamento — eorganizei" };

const RESPONDEM = ["proprietaria", "coordenadora", "cerimonialista"];

const ESTADOS: { chave: string; status: PedidoStatus; rotulo: string; vazio: string }[] = [
  { chave: "abertos", status: "novo", rotulo: "Esperando resposta", vazio: "Nenhum pedido esperando resposta." },
  { chave: "respondidos", status: "em_proposta", rotulo: "Com proposta", vazio: "Nenhum pedido virou proposta ainda." },
  { chave: "encerrados", status: "encerrado", rotulo: "Encerrados", vazio: "Nenhum pedido encerrado." },
];

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: { estado?: string };
}) {
  const { cargo } = await getMeuCargo();

  if (!cargo || !RESPONDEM.includes(cargo)) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <SubNav itens={VISOES_ORCAMENTOS} cargo={cargo} />
        <h1 className="text-xl font-semibold text-gray-900">Pedidos de orçamento</h1>
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Os pedidos ficam com quem responde as propostas.
        </p>
      </div>
    );
  }

  const estado = ESTADOS.find((e) => e.chave === searchParams.estado) ?? ESTADOS[0];
  const [{ pedidos, falhou }, contagem] = await Promise.all([
    lerPedidos(estado.status),
    contarPedidos(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SubNav itens={VISOES_ORCAMENTOS} cargo={cargo} />
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Pedidos de orçamento</h1>
        <p className="text-sm text-gray-500">Quem pediu orçamento pela sua página pública</p>
      </div>

      <nav aria-label="Situação dos pedidos" className="flex flex-wrap gap-2">
        {ESTADOS.map((e) => {
          const ativo = e.chave === estado.chave;
          const n = contagem[e.status];
          return (
            <Link
              key={e.chave}
              href={e.chave === "abertos" ? "/orcamentos/pedidos" : `/orcamentos/pedidos?estado=${e.chave}`}
              aria-current={ativo ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                ativo
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {e.rotulo}
              {n > 0 && <span className={ativo ? "ml-1.5 text-white/70" : "ml-1.5 text-gray-400"}>{n}</span>}
            </Link>
          );
        })}
      </nav>

      {falhou ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar os pedidos agora. Recarregue a página em alguns instantes.
        </p>
      ) : pedidos.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          <p>{estado.vazio}</p>
          {estado.status === "novo" && cargo === "proprietaria" && (
            <p className="mt-2">
              Os pedidos chegam pela{" "}
              <Link href="/orcamentos/pagina" className="underline hover:text-gray-800">
                página pública
              </Link>
              .
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {pedidos.map((p) => (
            <PedidoCartao key={p.id} pedido={p} />
          ))}
        </ul>
      )}
    </div>
  );
}
