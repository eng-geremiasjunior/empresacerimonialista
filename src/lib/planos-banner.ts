import "server-only";

// Os dados da tela de planos (23/09/2026), montados no servidor e passados
// PRONTOS ao banner: preços e limites vêm do catálogo que o dono edita no
// painel (Ajustes), nunca da imagem. O Gratuito não está no catálogo — é a
// regra que o banco já tem para quem não paga nem testa (154: 1 evento).

import {
  PLANO_DA_PROMOCAO,
  PROMOCAO_LANCAMENTO,
  comTetoDoPlano,
  getCatalogoDePlanos,
  getEscadaDaPromocao,
  reais,
} from "@/lib/planos";

export type PlanoNoBanner = {
  codigo: "gratuito" | "essencial" | "profissional" | "master";
  nome: string;
  /** "1 evento", "2 a 6 eventos", "Até 12 eventos", "Eventos ilimitados" */
  eventos: string;
  /** limite de eventos (null = sem limite) — para saber o próximo plano */
  limite: number | null;
  /** "R$ 0" / "R$ 47" + ",90" para o desenho */
  inteiro: string;
  centavos: string;
  maisEscolhido: boolean;
};

export type DadosDoBanner = {
  planos: PlanoNoBanner[];
  /** a faixa "3 primeiros meses R$ 27,90/mês"; null sem promoção */
  promocao: { meses: number; valor: string; aPartirDe: string } | null;
};

function partes(valor: number): { inteiro: string; centavos: string } {
  const [i, c] = reais(valor).replace(/^R\$\s?/, "").split(",");
  return { inteiro: i ?? "0", centavos: c ? `,${c}` : ",00" };
}

export async function dadosDoBanner(): Promise<DadosDoBanner> {
  const catalogo = await getCatalogoDePlanos();
  const pagos = [...catalogo].sort((a, b) => a.ordem - b.ordem);

  const planos: PlanoNoBanner[] = [
    { codigo: "gratuito", nome: "Gratuito", eventos: "1 evento", limite: 1, inteiro: "0", centavos: "", maisEscolhido: false },
    ...pagos.map((p, i) => ({
      codigo: p.codigo,
      nome: p.nome,
      // o primeiro plano pago começa onde o Gratuito termina (decisão do
      // dono: "o segundo plano terá de 2 a 6 eventos")
      eventos:
        p.eventosEmAndamento === null
          ? "Eventos ilimitados"
          : i === 0
            ? `2 a ${p.eventosEmAndamento} eventos`
            : `Até ${p.eventosEmAndamento} eventos`,
      limite: p.eventosEmAndamento,
      ...partes(p.valorMensal),
      maisEscolhido: p.codigo === "profissional",
    })),
  ];

  let promocao: DadosDoBanner["promocao"] = null;
  const doPlano = pagos.find((p) => p.codigo === PLANO_DA_PROMOCAO);
  if (doPlano) {
    try {
      const escada = await getEscadaDaPromocao(PROMOCAO_LANCAMENTO);
      const degrau = escada?.degraus[0] ?? null;
      if (degrau) {
        const valor = comTetoDoPlano(degrau.valorMensal, doPlano.valorMensal);
        if (valor > 0 && valor < doPlano.valorMensal) {
          promocao = { meses: degrau.meses, valor: reais(valor), aPartirDe: reais(doPlano.valorMensal) };
        }
      }
    } catch {
      /* sem a faixa: o banner continua com os cartões */
    }
  }

  return { planos, promocao };
}
