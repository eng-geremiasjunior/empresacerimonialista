"use client";

// Uma forma para todas as entradas.
//
// Nove operações (pagar, receber, entrada do casal, despesa, parcela,
// gerar parcelas, contrato do fornecedor, verba total, contrato de
// assessoria) e um modal só. O cabeçalho sempre diz A QUE CONTA a
// operação pertence, e a sub-linha diz o que ela faz com o dinheiro —
// é o que permite usar a tela sem tutorial.
//
// O leitor de comprovante fica no TOPO do corpo, antes dos campos,
// porque é o caminho mais curto: anexar preenche o resto. A leitura é a
// mesma do drawer antigo (140): PDF com camada de texto é lido aqui, no
// navegador, e o texto nunca sai desta máquina.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { desmascararDinheiro, mascararDinheiro } from "@/lib/format";
import { extrairTextoDePdf } from "@/lib/pdf-texto-cliente";
import { fmtData, money, normalizarComprovante } from "@/lib/financeiro-core";
import type { ItemFinanceiro, LinhaDeFornecedor } from "@/lib/financeiro-tela";
import {
  confirmarPagamento,
  salvarComprovante,
} from "@/app/(app)/eventos/[id]/financeiro/comprovante-actions";
import { salvarVerbaTotal } from "@/app/(app)/eventos/[id]/financeiro/lancamento-actions";
import {
  gerarParcelasDaAssessoria,
  gerarParcelasDoFornecedor,
  lancarNaVerba,
  lancarParcelaDaAssessoria,
  registrarEntradaDoCasal,
  salvarContratoAssessoria,
  salvarContratoFornecedor,
} from "@/app/(app)/eventos/[id]/financeiro/tela-actions";

export type Operacao =
  | { tipo: "pagar"; item?: ItemFinanceiro }
  | { tipo: "receber"; item?: ItemFinanceiro }
  | { tipo: "entrada" }
  | {
      tipo: "despesa";
      descricao?: string;
      valor?: number;
      objetivoId?: string | null;
      pendenciaId?: string;
    }
  | { tipo: "parcela"; fornecedor: LinhaDeFornecedor }
  | { tipo: "gerar"; fornecedor: LinhaDeFornecedor }
  | {
      tipo: "contrato";
      fornecedor?: LinhaDeFornecedor;
      objetivoId?: string | null;
      nome?: string;
    }
  | { tipo: "verba" }
  | { tipo: "assContrato" }
  | { tipo: "parcelaAssessoria" }
  | { tipo: "gerarAssessoria"; falta: number; jaLancadas: number };

type Passo = "vazio" | "lendo" | "lido";

const TEXTOS: Record<
  Operacao["tipo"],
  { eyebrow: string; titulo: string; sub: string; acao: string }
> = {
  pagar: {
    eyebrow: "Verba do evento",
    titulo: "Marcar pagamento",
    sub: "Registra a saída da verba e guarda o comprovante para a prestação de contas.",
    acao: "Confirmar pagamento",
  },
  receber: {
    eyebrow: "Minha assessoria",
    titulo: "Registrar recebimento",
    sub: "O que o casal já pagou a você. Não entra na verba do evento.",
    acao: "Confirmar recebimento",
  },
  entrada: {
    eyebrow: "Caixa do evento",
    titulo: "Registrar entrada do casal",
    sub: "O dinheiro que o casal repassou para você pagar os fornecedores.",
    acao: "Registrar entrada",
  },
  despesa: {
    eyebrow: "Verba do evento",
    titulo: "Lançar despesa",
    sub: "Gasto fora das parcelas de contrato. Ligando a um fornecedor, vira parcela dele.",
    acao: "Lançar",
  },
  parcela: {
    eyebrow: "Verba do evento",
    titulo: "Lançar parcela",
    sub: "Um vencimento do contrato deste fornecedor.",
    acao: "Lançar",
  },
  gerar: {
    eyebrow: "Verba do evento",
    titulo: "Gerar parcelas",
    sub: "Divide o que falta do contrato em vencimentos mensais iguais.",
    acao: "Gerar",
  },
  contrato: {
    eyebrow: "Verba do evento",
    titulo: "Contrato do fornecedor",
    sub: "O valor fechado com ele. É daqui que sai o Contratado da faixa de números.",
    acao: "Salvar contrato",
  },
  verba: {
    eyebrow: "Verba do evento",
    titulo: "Ajustar verba total",
    sub: "O teto combinado com o casal. Livre = verba − contratado − despesas avulsas.",
    acao: "Salvar",
  },
  assContrato: {
    eyebrow: "Minha assessoria",
    titulo: "Contrato de assessoria",
    sub: "O que você cobra deste casal. Este dinheiro é seu.",
    acao: "Salvar",
  },
  parcelaAssessoria: {
    eyebrow: "Minha assessoria",
    titulo: "Lançar parcela do casal",
    sub: "Um vencimento do que o casal tem a pagar a você.",
    acao: "Lançar",
  },
  gerarAssessoria: {
    eyebrow: "Minha assessoria",
    titulo: "Gerar parcelas",
    sub: "Divide o que falta do contrato de assessoria em vencimentos mensais iguais.",
    acao: "Gerar",
  },
};

export function ModalFinanceiro({
  eventId,
  operacao,
  hoje,
  objetivos,
  fornecedoresCadastro,
  emAberto,
  temCaixa,
  onFechar,
  onPronto,
}: {
  eventId: string;
  operacao: Operacao;
  hoje: string;
  objetivos: { id: string; nome: string }[];
  fornecedoresCadastro: { id: string; name: string }[];
  /** parcelas em aberto, para o select de "pagar"/"receber" */
  emAberto: ItemFinanceiro[];
  /** o evento opera com caixa: a despesa nova sai do caixa dela */
  temCaixa: boolean;
  onFechar: () => void;
  onPronto: (mensagem: string) => void;
}) {
  const t = TEXTOS[operacao.tipo];
  const forn = "fornecedor" in operacao ? operacao.fornecedor : undefined;

  const alvoInicial =
    "item" in operacao && operacao.item ? operacao.item : emAberto[0] ?? null;

  const [parcelaId, setParcelaId] = useState(alvoInicial?.id ?? "");
  const [valor, setValor] = useState(() => {
    if ("item" in operacao && operacao.item) {
      return mascararDinheiro(operacao.item.valor.toFixed(2).replace(".", ","));
    }
    if (operacao.tipo === "despesa" && operacao.valor != null) {
      return mascararDinheiro(operacao.valor.toFixed(2).replace(".", ","));
    }
    if (operacao.tipo === "contrato" && forn?.contrato != null) {
      return mascararDinheiro(forn.contrato.toFixed(2).replace(".", ","));
    }
    if (operacao.tipo === "gerar") {
      return mascararDinheiro((forn?.faltaLancar ?? 0).toFixed(2).replace(".", ","));
    }
    if (operacao.tipo === "gerarAssessoria") {
      return mascararDinheiro(operacao.falta.toFixed(2).replace(".", ","));
    }
    return "";
  });
  const [data, setData] = useState(hoje);
  const [descricao, setDescricao] = useState(
    operacao.tipo === "despesa"
      ? (operacao.descricao ?? "")
      : operacao.tipo === "parcela"
        ? `Parcela ${(forn?.parcelas.length ?? 0) + 1}`
        : operacao.tipo === "parcelaAssessoria"
          ? "Parcela"
          : ""
  );
  const [objetivoId, setObjetivoId] = useState(
    ("objetivoId" in operacao ? operacao.objetivoId : null) ??
      forn?.objetivoId ??
      ""
  );
  const [supplierId, setSupplierId] = useState(forn?.supplierId ?? "");
  const [nome, setNome] = useState(
    forn?.nome ?? (operacao.tipo === "contrato" ? (operacao.nome ?? "") : "")
  );
  const [quantidade, setQuantidade] = useState(3);
  const [jaPaga, setJaPaga] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // comprovante
  const [passo, setPasso] = useState<Passo>("vazio");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [lido, setLido] = useState<string | null>(null);

  const usaComprovante = ["pagar", "receber", "entrada", "despesa"].includes(
    operacao.tipo
  );
  const alvo = emAberto.find((i) => i.id === parcelaId) ?? alvoInicial;

  async function anexar(file: File) {
    setErro(null);
    setArquivo(file);
    setPasso("lendo");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const caminho = `${eventId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("comprovantes")
        .upload(caminho, file, { contentType: file.type, upsert: false });
      if (error) {
        setPasso("vazio");
        setErro("Não foi possível enviar o arquivo.");
        return;
      }
      setPath(caminho);

      let resumo = "anexado";
      if (file.type === "application/pdf") {
        try {
          const texto = await extrairTextoDePdf(await file.arrayBuffer());
          if (texto.trim().length >= 50) {
            const auto = normalizarComprovante({ texto, confianca: {} });
            const partes: string[] = [];
            if (auto.valor != null) {
              setValor(mascararDinheiro(auto.valor.toFixed(2).replace(".", ",")));
              partes.push(money(auto.valor));
            }
            if (auto.data) {
              setData(auto.data.split("/").reverse().join("-"));
              partes.push(auto.data.slice(0, 5));
            }
            resumo = partes.length ? "lido · " + partes.join(" · ") : "anexado";
          } else {
            resumo = "PDF digitalizado — confira e preencha";
          }
        } catch {
          resumo = "não consegui ler — confira e preencha";
        }
      } else {
        resumo = "a leitura automática só lê PDF — preencha abaixo";
      }
      setLido(resumo);
      setPasso("lido");
    } catch {
      setPasso("vazio");
      setErro("Não foi possível enviar o arquivo.");
    }
  }

  async function confirmar() {
    const n = desmascararDinheiro(valor);
    setErro(null);
    setSalvando(true);
    try {
      const comprovante =
        path && arquivo
          ? {
              path,
              nome: arquivo.name,
              dados: { valor: n, data, origem: "anexado" },
            }
          : null;

      if (operacao.tipo === "pagar" || operacao.tipo === "receber") {
        if (!alvo) return falhar("Escolha a parcela.");
        if (!n) return falhar("Informe o valor.");
        if (comprovante) await salvarComprovante(eventId, alvo.id, comprovante);
        const r = await confirmarPagamento(eventId, alvo.id, {
          valor: n,
          data,
          forma: "pix",
        });
        if ("error" in r) return falhar(r.error);
        return pronto(
          operacao.tipo === "pagar"
            ? "Pagamento registrado" + (comprovante ? " com comprovante" : "")
            : "Recebimento registrado"
        );
      }

      if (operacao.tipo === "entrada") {
        if (!n) return falhar("Informe o valor recebido.");
        const r = await registrarEntradaDoCasal(eventId, { valor: n, data });
        if ("error" in r) return falhar(r.error);
        if (comprovante && r.id) await salvarComprovante(eventId, r.id, comprovante);
        return pronto("Entrada registrada no caixa");
      }

      if (operacao.tipo === "despesa" || operacao.tipo === "parcela") {
        if (!descricao.trim()) return falhar("Informe a descrição.");
        if (!n) return falhar("Informe o valor.");
        const r = await lancarNaVerba(eventId, {
          descricao,
          valor: n,
          vencimento: data,
          supplierId:
            operacao.tipo === "parcela" ? (forn?.supplierId ?? null) : supplierId || null,
          objetivoId: objetivoId || null,
          doCaixa: temCaixa,
          jaPaga: operacao.tipo === "parcela" ? false : jaPaga,
        });
        if ("error" in r) return falhar(r.error);
        if (comprovante && r.id) await salvarComprovante(eventId, r.id, comprovante);
        return pronto(
          operacao.tipo === "parcela" ? "Parcela lançada" : "Despesa lançada"
        );
      }

      if (operacao.tipo === "gerar") {
        if (!forn) return falhar("Fornecedor não encontrado.");
        const restante = n ?? forn.faltaLancar;
        const r = await gerarParcelasDoFornecedor(eventId, {
          supplierId: forn.supplierId,
          objetivoId: forn.objetivoId,
          restante,
          quantidade,
          primeiroVencimento: data,
          nomeBase: forn.nome,
          jaLancadas: forn.parcelas.length,
        });
        if ("error" in r) return falhar(r.error);
        return pronto(`${quantidade} parcelas geradas`);
      }

      if (operacao.tipo === "gerarAssessoria") {
        const r = await gerarParcelasDaAssessoria(eventId, {
          restante: n ?? operacao.falta,
          quantidade,
          primeiroVencimento: data,
          jaLancadas: operacao.jaLancadas,
        });
        if ("error" in r) return falhar(r.error);
        return pronto(`${quantidade} parcelas geradas`);
      }

      if (operacao.tipo === "contrato") {
        if (!n) return falhar("Informe o valor do contrato.");
        const r = await salvarContratoFornecedor(eventId, {
          supplierId: supplierId || null,
          nome,
          objetivoId: objetivoId || null,
          valor: n,
          assinadoEm: data || null,
        });
        if ("error" in r) return falhar(r.error);
        return pronto("Contrato salvo");
      }

      if (operacao.tipo === "verba") {
        if (!n) return falhar("Informe a verba.");
        const r = await salvarVerbaTotal(eventId, n);
        if ("error" in r) return falhar(r.error);
        return pronto("Verba ajustada");
      }

      if (operacao.tipo === "assContrato") {
        if (!n) return falhar("Informe o valor do contrato.");
        const r = await salvarContratoAssessoria(eventId, {
          valor: n,
          assinadoEm: data || null,
        });
        if ("error" in r) return falhar(r.error);
        return pronto("Contrato de assessoria salvo");
      }

      if (operacao.tipo === "parcelaAssessoria") {
        if (!n) return falhar("Informe o valor.");
        const r = await lancarParcelaDaAssessoria(eventId, {
          descricao,
          valor: n,
          vencimento: data,
          jaPaga,
        });
        if ("error" in r) return falhar(r.error);
        return pronto("Parcela lançada");
      }
    } finally {
      setSalvando(false);
    }
  }

  function falhar(mensagem: string) {
    setErro(mensagem);
  }
  function pronto(mensagem: string) {
    onPronto(mensagem);
  }

  const restanteGerar =
    desmascararDinheiro(valor) ??
    (operacao.tipo === "gerarAssessoria" ? operacao.falta : forn?.faltaLancar ?? 0);
  const cada = quantidade > 0 ? restanteGerar / quantidade : 0;

  return (
    <div
      className="fe-scrim"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className="fe-modal" role="dialog" aria-modal="true" aria-label={t.titulo}>
        <div className="fe-modal-topo">
          <p className="fe-modal-eyebrow">
            {forn ? `Fornecedor · ${forn.nome}` : t.eyebrow}
          </p>
          <h2 className="fe-modal-titulo">{t.titulo}</h2>
          <p className="fe-modal-sub">{t.sub}</p>
        </div>

        <div className="fe-modal-corpo">
          {usaComprovante && (
            <div className="fe-leitor">
              {passo === "lendo" ? (
                <>
                  <span className="fe-spinner" aria-hidden />
                  <div style={{ flex: 1 }}>
                    <p className="fe-leitor-titulo">Lendo {arquivo?.name}…</p>
                  </div>
                </>
              ) : passo === "lido" ? (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="fe-leitor-titulo">{arquivo?.name}</p>
                    <p className="fe-leitor-meta lido">{lido}</p>
                  </div>
                  <label className="fe-link" style={{ cursor: "pointer" }}>
                    trocar
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) anexar(f);
                      }}
                    />
                  </label>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="fe-leitor-titulo">Comprovante</p>
                    <p className="fe-leitor-meta">
                      Anexe o PIX ou boleto em PDF: o leitor preenche valor e data.
                    </p>
                  </div>
                  <label className="fe-leitor-botao">
                    Ler comprovante
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) anexar(f);
                      }}
                    />
                  </label>
                </>
              )}
            </div>
          )}

          {(operacao.tipo === "pagar" || operacao.tipo === "receber") && (
            <div className="fe-campo">
              <label htmlFor="fe-parcela">
                {operacao.tipo === "pagar" ? "Parcela a pagar" : "Parcela a receber"}
              </label>
              <select
                id="fe-parcela"
                value={parcelaId}
                onChange={(e) => {
                  setParcelaId(e.target.value);
                  const novo = emAberto.find((i) => i.id === e.target.value);
                  if (novo) {
                    setValor(mascararDinheiro(novo.valor.toFixed(2).replace(".", ",")));
                  }
                }}
              >
                {emAberto.length === 0 && <option value="">Nada em aberto</option>}
                {emAberto.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.avulso ? i.titulo : `${i.fornecedor} · ${i.titulo}`} ·{" "}
                    {money(i.valor)} · {fmtData(i.vencimento)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {operacao.tipo === "contrato" && (
            <div className="fe-campo">
              <label htmlFor="fe-forn">Fornecedor</label>
              {forn ? (
                <input id="fe-forn" value={forn.nome} disabled />
              ) : (
                <select
                  id="fe-forn"
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value);
                    const achado = fornecedoresCadastro.find(
                      (f) => f.id === e.target.value
                    );
                    if (achado) setNome(achado.name);
                  }}
                >
                  <option value="">— escolher do cadastro —</option>
                  {fornecedoresCadastro.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {operacao.tipo === "contrato" && !forn && !supplierId && (
            <div className="fe-campo">
              <label htmlFor="fe-nome">Ou cadastre um novo</label>
              <input
                id="fe-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do fornecedor"
              />
            </div>
          )}

          {(operacao.tipo === "despesa" ||
            operacao.tipo === "parcela" ||
            operacao.tipo === "parcelaAssessoria") && (
            <div className="fe-campo">
              <label htmlFor="fe-desc">Descrição</label>
              <input
                id="fe-desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder={
                  operacao.tipo === "despesa" ? "Taxa de cartório" : "Parcela 2 de 4"
                }
              />
            </div>
          )}

          {(operacao.tipo === "despesa" || operacao.tipo === "contrato") &&
            objetivos.length > 0 && (
              <div className="fe-campo">
                <label htmlFor="fe-cat">Categoria da verba</label>
                <select
                  id="fe-cat"
                  value={objetivoId}
                  onChange={(e) => setObjetivoId(e.target.value)}
                >
                  <option value="">— sem categoria —</option>
                  {objetivos.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

          {operacao.tipo === "despesa" && fornecedoresCadastro.length > 0 && (
            <div className="fe-campo">
              <label htmlFor="fe-desp-forn">Fornecedor</label>
              <select
                id="fe-desp-forn"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">— avulso —</option>
                {fornecedoresCadastro.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="fe-linha-campos">
            <div className="fe-campo fe-campo-dinheiro">
              <label htmlFor="fe-valor">
                {operacao.tipo === "gerar" || operacao.tipo === "gerarAssessoria"
                  ? "Valor a dividir"
                  : operacao.tipo === "contrato" || operacao.tipo === "assContrato"
                    ? "Valor do contrato"
                    : operacao.tipo === "verba"
                      ? "Verba total"
                      : "Valor"}
              </label>
              <div style={{ position: "relative" }}>
                <span>R$</span>
                <input
                  id="fe-valor"
                  value={valor}
                  onChange={(e) => setValor(mascararDinheiro(e.target.value))}
                  inputMode="decimal"
                  placeholder="0,00"
                  autoFocus
                />
              </div>
            </div>

            {operacao.tipo !== "verba" && (
              <div className="fe-campo">
                <label htmlFor="fe-data">
                  {operacao.tipo === "pagar"
                    ? "Data do pagamento"
                    : operacao.tipo === "receber"
                      ? "Data do recebimento"
                      : operacao.tipo === "entrada"
                        ? "Data"
                        : operacao.tipo === "contrato" || operacao.tipo === "assContrato"
                          ? "Assinado em"
                          : operacao.tipo === "gerar" ||
                              operacao.tipo === "gerarAssessoria"
                            ? "Primeiro vencimento"
                            : "Vencimento"}
                </label>
                <input
                  id="fe-data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
            )}

            {(operacao.tipo === "gerar" || operacao.tipo === "gerarAssessoria") && (
              <div className="fe-campo">
                <label htmlFor="fe-qtd">Parcelas</label>
                <input
                  id="fe-qtd"
                  type="number"
                  min={1}
                  max={24}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          {(operacao.tipo === "gerar" || operacao.tipo === "gerarAssessoria") && (
            <p className="fe-previa">
              {restanteGerar > 0
                ? `Falta lançar ${money(restanteGerar)} · ${quantidade} × ${money(
                    Math.round((cada + Number.EPSILON) * 100) / 100
                  )}, uma por mês a partir de ${fmtData(data)}.`
                : "Este contrato já tem todas as parcelas lançadas."}
            </p>
          )}

          {(operacao.tipo === "despesa" || operacao.tipo === "parcelaAssessoria") && (
            <label className="fe-checkbox">
              <input
                type="checkbox"
                checked={jaPaga}
                onChange={(e) => setJaPaga(e.target.checked)}
              />
              {operacao.tipo === "despesa" ? "Já foi paga" : "Já foi recebida"}
            </label>
          )}

          {erro && <p className="fe-erro">{erro}</p>}
        </div>

        <div className="fe-modal-pe">
          <button type="button" className="fe-btn fe-btn-fantasma" onClick={onFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className="fe-btn fe-btn-primario"
            disabled={salvando || passo === "lendo"}
            onClick={confirmar}
          >
            {salvando ? "Salvando…" : t.acao}
          </button>
        </div>
      </div>
    </div>
  );
}
