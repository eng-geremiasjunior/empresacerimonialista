"use client";

// A escolha de um presente, sem desenho. Cada modelo veste os cards e o
// painel dele por cima.
//
// A ação depois da escolha é plugável: hoje 'pix' (o Pix estático do
// casal, já com o valor do item, montado aqui no navegador); na fatia C,
// 'pagarme', sem mudar o desenho. Ninguém confirma o pagamento, então
// nenhum estado diz que o presente foi dado: depois de copiar, só
// "Código copiado" e a volta para escolher outro.
//
// Sem chave Pix que feche com um formato conhecido, não há ação: os
// cards são só vitrine (não clicáveis), e o modelo mostra o link da loja
// se houver.

import { useCallback, useMemo, useState } from "react";
import { montarPixEstatico, normalizarChavePix } from "@/lib/pix-brcode";
import { formatarReais, type ItemDePresente } from "@/lib/site-conteudo";

export type AcaoDoPresente = "pix";

export type PixDoCasal = {
  chave: string | null;
  titular: string | null;
  cidade: string | null;
};

export type EscolhaDoPresente =
  | { tipo: "item"; item: ItemDePresente; valorCentavos: number }
  /** o valor livre do T01 (R$ 150/300/500/1.000) */
  | { tipo: "valor"; valorCentavos: number };

export function usePresente({ itens, pix }: { itens: ItemDePresente[]; pix: PixDoCasal }) {
  const chave = useMemo(() => (pix.chave ? normalizarChavePix(pix.chave) : null), [pix.chave]);
  const acao: AcaoDoPresente | null = chave ? "pix" : null;

  const [escolha, setEscolha] = useState<EscolhaDoPresente | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  /** tocar de novo no escolhido desmarca (T05/T06) */
  const escolher = useCallback(
    (id: string | null) => {
      if (!acao) return;
      setCopiado(false);
      setPainelAberto(false);
      setEscolha((atual) => {
        if (id == null || (atual?.tipo === "item" && atual.item.id === id)) return null;
        const item = itens.find((x) => x.id === id);
        return item ? { tipo: "item", item, valorCentavos: item.valor_centavos } : null;
      });
    },
    [acao, itens]
  );

  const escolherValor = useCallback(
    (valorCentavos: number | null) => {
      if (!acao) return;
      setCopiado(false);
      setPainelAberto(false);
      setEscolha(valorCentavos && valorCentavos > 0 ? { tipo: "valor", valorCentavos: Math.round(valorCentavos) } : null);
    },
    [acao]
  );

  /** "Escolher outro presente": volta ao começo */
  const recomecar = useCallback(() => {
    setEscolha(null);
    setPainelAberto(false);
    setCopiado(false);
  }, []);

  const codigo = useMemo(() => {
    if (!chave || !escolha) return null;
    return montarPixEstatico({
      chave: chave.valor,
      titular: pix.titular ?? "",
      cidade: pix.cidade ?? "",
      valorCentavos: escolha.valorCentavos,
    });
  }, [chave, escolha, pix.titular, pix.cidade]);

  const copiar = useCallback(async () => {
    if (!codigo) return;
    if (await copiarTexto(codigo)) setCopiado(true);
  }, [codigo]);

  const valorEscolhido = escolha?.valorCentavos ?? null;

  return {
    /** null = vitrine */
    acao,
    escolha,
    escolhidoId: escolha?.tipo === "item" ? escolha.item.id : null,
    escolher,
    escolherValor,
    /** "Presentear com Pix · R$ 480" (null sem escolha ou sem Pix) */
    rotuloDoBotao: acao && valorEscolhido ? `Presentear com Pix · ${formatarReais(valorEscolhido)}` : null,
    painelAberto,
    abrirPainel: () => codigo && setPainelAberto(true),
    fecharPainel: () => setPainelAberto(false),
    recomecar,
    /** o BR Code com o valor (texto do QR e do copia-e-cola) */
    codigo,
    titular: pix.titular?.trim() || null,
    copiado,
    copiar,
  };
}

/** A área de transferência; no navegador sem permissão, o jeito antigo. */
async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // cai no jeito antigo
  }
  try {
    const t = document.createElement("textarea");
    t.value = texto;
    t.setAttribute("readonly", "");
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  } catch {
    return false;
  }
}
