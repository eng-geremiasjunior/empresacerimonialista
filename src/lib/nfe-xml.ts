// O XML da NF-e / NFC-e (layout 4.0), lido no navegador, sem IA.
//
// É o caminho mais preciso: o atacado manda o XML por e-mail junto com
// a nota, e nele cada item vem com quantidade, unidade e valor unitário
// já separados. Só o que interessa ao estoque sai daqui: quem vendeu,
// quando, o número, a chave, o total e os itens. CNPJ, endereço e o
// documento de quem comprou ficam no arquivo — nunca no nosso banco.

import type { NotaLida } from "@/lib/estoque-leitura-core";
import type { LinhaLida } from "@/lib/estoque-core";

// a unidade comercial da nota → a nossa
const UNIDADE_DA_NOTA: Record<string, string> = {
  UN: "unidades", UND: "unidades", UNID: "unidades", PC: "unidades", "PÇ": "unidades", PCS: "unidades", PE: "unidades", JG: "jogos", PR: "pares", PAR: "pares",
  KG: "kg", G: "g", GR: "g",
  L: "litros", LT: "litros", LTS: "litros", LTR: "litros", ML: "ml",
  CX: "caixas", CXA: "caixas", PCT: "pacotes", PT: "pacotes", PAC: "pacotes", FD: "fardos", FDO: "fardos",
  GF: "garrafas", GRF: "garrafas", GAR: "garrafas", LA: "latas", LAT: "latas",
  M: "metros", MT: "metros", MTS: "metros", RL: "rolos",
};

const numero = (s: string | null | undefined): number | null => {
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Lê o XML (string). Devolve null quando não é uma NF-e/NFC-e. */
export function lerNfeXml(xml: string): NotaLida | null {
  if (typeof DOMParser === "undefined") return null;
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) return null;
  const infNFe = doc.getElementsByTagName("infNFe")[0];
  if (!infNFe) return null;

  const texto = (pai: Element | Document, tag: string): string | null => {
    const el = pai.getElementsByTagName(tag)[0];
    return el?.textContent?.trim() || null;
  };

  const ide = infNFe.getElementsByTagName("ide")[0];
  const emit = infNFe.getElementsByTagName("emit")[0];
  const total = infNFe.getElementsByTagName("ICMSTot")[0];

  const chaveBruta = (infNFe.getAttribute("Id") ?? "").replace(/\D/g, "");
  const emissao = (ide && (texto(ide, "dhEmi") ?? texto(ide, "dEmi"))) ?? null;

  const itens: LinhaLida[] = [];
  for (const det of Array.from(infNFe.getElementsByTagName("det"))) {
    const prod = det.getElementsByTagName("prod")[0];
    if (!prod) continue;
    const nome = texto(prod, "xProd");
    const quantidade = numero(texto(prod, "qCom"));
    if (!nome || quantidade == null || quantidade <= 0) continue;
    const uCom = (texto(prod, "uCom") ?? "UN").toUpperCase();
    const unitario = numero(texto(prod, "vUnCom"));
    const linha = numero(texto(prod, "vProd"));
    itens.push({
      nome: nome.slice(0, 80),
      quantidade,
      unidade: UNIDADE_DA_NOTA[uCom] ?? uCom.toLowerCase().slice(0, 20),
      custoUnitario:
        unitario != null && unitario >= 0
          ? Math.round(unitario * 100) / 100
          : linha != null && linha >= 0
            ? Math.round((linha / quantidade) * 100) / 100
            : null,
      categoriaNome: null,
    });
  }

  return {
    fornecedor: emit ? texto(emit, "xNome")?.slice(0, 120) ?? null : null,
    data: emissao ? emissao.slice(0, 10) : null,
    numero: ide ? texto(ide, "nNF") : null,
    chave: chaveBruta.length === 44 ? chaveBruta : null,
    total: total ? numero(texto(total, "vNF")) : null,
    itens,
  };
}
