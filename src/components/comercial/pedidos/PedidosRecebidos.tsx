// O bloco "Pedidos recebidos", no topo de Propostas.
//
// Só aparece quando há pedido esperando resposta: sem pedido, a tela de
// Propostas continua exatamente como era. Mostra os mais recentes e leva à
// fila inteira.

import Link from "next/link";
import { lerPedidos } from "@/lib/supabase/pedidos";
import { PedidoCartao } from "./PedidoCartao";

const NO_BLOCO = 3;

export async function PedidosRecebidos() {
  const { pedidos } = await lerPedidos("novo", 50);
  if (pedidos.length === 0) return null;

  return (
    <section aria-labelledby="pedidos-recebidos" className="mt-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="pedidos-recebidos" className="text-[15px] font-semibold">
          {pedidos.length === 1
            ? "1 pedido de orçamento esperando resposta"
            : `${pedidos.length} pedidos de orçamento esperando resposta`}
        </h2>
        {pedidos.length > NO_BLOCO && (
          <Link href="/orcamentos/pedidos" className="text-sm text-gray-500 underline hover:text-gray-800">
            Ver todos
          </Link>
        )}
      </div>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {pedidos.slice(0, NO_BLOCO).map((p) => (
          <PedidoCartao key={p.id} pedido={p} compacto />
        ))}
      </ul>
    </section>
  );
}
