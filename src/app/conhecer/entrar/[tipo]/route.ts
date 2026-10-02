// A porta do catálogo vivo: /conhecer/entrar/casamento leva quem tocou
// no cartão para dentro do portal de exemplo daquele tipo, já logado como
// o visitante (nível 'vitrine', 195: vê tudo, não grava nada).
//
// O link mágico é de uso único e gerado a cada toque; a sessão é por
// endereço (o portal do tipo), então quem já tem conta no eorganizei.com.br
// não perde a dela.

import { NextResponse, type NextRequest } from "next/server";
import { eventosDoCatalogo, linkMagicoDoVisitante } from "@/lib/catalogo-vivo";
import { portalBase, publicBase } from "@/lib/app-url";

export const dynamic = "force-dynamic";

// amortecedor contra rajada (memória do processo, como o do RSVP)
const ultimos = new Map<string, number[]>();
function demais(ip: string): boolean {
  const agora = Date.now();
  const lista = (ultimos.get(ip) ?? []).filter((t) => agora - t < 60_000);
  lista.push(agora);
  ultimos.set(ip, lista);
  if (ultimos.size > 5000) ultimos.clear();
  return lista.length > 10;
}

export async function GET(request: NextRequest, { params }: { params: { tipo: string } }) {
  const voltar = NextResponse.redirect(`${publicBase()}/conhecer`);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
  if (demais(ip)) return voltar;

  const evento = (await eventosDoCatalogo()).find((e) => e.tipo === params.tipo);
  if (!evento) return voltar;

  const hash = await linkMagicoDoVisitante();
  if (!hash) return voltar;

  const destino = `/portal/${evento.id}`;
  return NextResponse.redirect(
    `${portalBase(evento.tipo)}/auth/confirm?token_hash=${hash}&type=magiclink&next=${encodeURIComponent(destino)}`
  );
}
