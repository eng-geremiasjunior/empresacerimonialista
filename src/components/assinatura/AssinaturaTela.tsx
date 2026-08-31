"use client";

// A assinatura, do lado de quem paga.
//
// O cartão vai do formulário DIRETO para o gateway (chave pública), que
// devolve um token de uso único; só o token chega ao nosso servidor. O
// número do cartão nunca passa por aqui — nem pelo nosso banco, nem
// pelos nossos logs.
//
// A tela fala em tempo e em consequência, não em estado: "sua próxima
// cobrança é dia 12", não "status: ativa".

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assinar, atualizarCartao, cancelar } from "@/app/(app)/assinatura/actions";
import { documentoValido } from "@/lib/documento";
import { cepValido, telefoneValido, ufValida } from "@/lib/contato";
import {
  COBRANCA_VAZIA,
  DadosDeCobranca,
  type Cobranca,
} from "@/components/assinatura/DadosDeCobranca";

export type EstadoAssinatura = {
  status: string;
  plano: string;
  valor_mensal: number;
  proximo_vencimento: string | null;
  ultimo_pagamento_em: string | null;
  cartao_final: string | null;
  cartao_bandeira: string | null;
  falhas_seguidas: number;
  tem_gateway: boolean;
  eventos: number;
  pode_criar_evento: boolean;
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dataLonga(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]}` : iso;
}

const input =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200";
const botao =
  "rounded-[9px] bg-[#17162A] px-4 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
const botaoLeve =
  "rounded-[9px] border border-stone-300 bg-white px-3.5 py-2 text-[13px] font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50";

/** Troca o cartão por um token, direto com o gateway. */
async function tokenizar(cartao: {
  numero: string;
  nome: string;
  mes: string;
  ano: string;
  cvv: string;
}): Promise<{ token?: string; erro?: string }> {
  const pk = process.env.NEXT_PUBLIC_PAGARME_PUBLIC_KEY;
  if (!pk) return { erro: "Pagamento não configurado. Fale com o suporte." };
  try {
    const r = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${pk}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "card",
        card: {
          number: cartao.numero.replace(/\s/g, ""),
          holder_name: cartao.nome,
          exp_month: Number(cartao.mes),
          exp_year: Number(cartao.ano),
          cvv: cartao.cvv,
        },
      }),
    });
    const d = (await r.json()) as { id?: string; message?: string };
    if (!r.ok || !d.id) {
      return { erro: "Confira os dados do cartão e tente de novo." };
    }
    return { token: d.id };
  } catch {
    return { erro: "Não conseguimos falar com a operadora. Tente de novo." };
  }
}

export function AssinaturaTela({
  estado,
  valorMensal,
  emailDaConta,
  nomeDaConta,
}: {
  estado: EstadoAssinatura;
  valorMensal: number;
  /** só para começar o formulário preenchido — ela pode trocar */
  emailDaConta?: string;
  nomeDaConta?: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [form, setForm] = useState({ numero: "", nome: "", mes: "", ano: "", cvv: "" });
  // O gateway exige CPF/CNPJ de quem paga ("The customer Document is
  // required"). O sistema nao guarda esse dado em lugar nenhum, entao ele
  // e pedido aqui, na hora de assinar -- e nao fica no nosso banco: vai
  // para o gateway e acabou.
  const [cobranca, setCobranca] = useState<Cobranca>({
    ...COBRANCA_VAZIA,
    nome: nomeDaConta ?? "",
    email: emailDaConta ?? "",
  });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");

  const ativa = estado.status === "ativa";
  const inadimplente = estado.status === "inadimplente";
  const cortesia = estado.status === "pausada";
  // A regra que faltava: se existe assinatura no GATEWAY, ela precisa
  // poder trocar o cartao e CANCELAR -- qualquer que seja o status aqui
  // dentro. Amarrar isso a "ativa" deixou uma assinatura real presa,
  // cobrando por fora, sem botao de saida na tela.
  const temAssinaturaLa = estado.tem_gateway;
  const jaCancelada = estado.status === "cancelada";
  // Assinatura encerrada nao pode virar um segundo beco: quem cancelou
  // precisa poder voltar. E nao faz sentido oferecer "cancelar" de novo.
  const podeAssinar = !ativa && !inadimplente && (!temAssinaturaLa || jaCancelada);
  const podeCancelar = temAssinaturaLa && !jaCancelada;

  function enviarCartao(troca: boolean) {
    setErro(null);
    setOk(null);
    iniciar(async () => {
      const t = await tokenizar(form);
      if (t.erro || !t.token) {
        setErro(t.erro ?? "Não foi possível validar o cartão.");
        return;
      }
      const r = troca
        ? await atualizarCartao(t.token)
        : await assinar(t.token, cobranca);
      if (r.error) {
        setErro(r.error);
        return;
      }
      setForm({ numero: "", nome: "", mes: "", ano: "", cvv: "" });
      setMostrarForm(false);
      setOk(troca ? "Cartão atualizado." : "Assinatura ativa. Obrigado!");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Assinatura</h1>
        <p className="mt-1 text-sm text-gray-500">
          {ativa
            ? `Sua próxima cobrança é ${dataLonga(estado.proximo_vencimento) || "no próximo ciclo"}.`
            : inadimplente
              ? "A última cobrança não passou. Nada foi bloqueado — atualize o cartão quando puder."
              : cortesia
                ? "Sua conta está liberada como cortesia."
                : estado.pode_criar_evento
                  ? "Seu primeiro evento é por nossa conta."
                  : "Você já usou o evento gratuito. Assine para criar os próximos."}
        </p>
      </div>

      {/* o estado, em uma linha de fatos */}
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-400">Plano</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {ativa || inadimplente
                ? `R$ ${estado.valor_mensal.toFixed(2).replace(".", ",")} por mês`
                : cortesia
                  ? "Cortesia"
                  : "Gratuito · 1 evento"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Eventos criados</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{estado.eventos}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Cartão</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {estado.cartao_final
                ? `${estado.cartao_bandeira ?? "cartão"} •••• ${estado.cartao_final}`
                : "—"}
            </dd>
          </div>
        </dl>

        {inadimplente && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {estado.falhas_seguidas > 1
              ? `A cobrança falhou ${estado.falhas_seguidas} vezes.`
              : "A última cobrança falhou."}{" "}
            Seus eventos continuam funcionando normalmente — a gente não
            trava nada no meio de um casamento.
          </p>
        )}
      </section>

      {/* Enquanto o preço não está configurado, a tela não inventa um:
          mostrar "R$ 0,00" seria mentira, e esconder sem explicar seria
          pior. A conta segue funcionando; quem destrava é o suporte. */}
      {podeAssinar && valorMensal <= 0 && (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            A assinatura ainda não está aberta
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {cortesia
              ? "Sua conta segue liberada como cortesia. Quando a assinatura abrir, você verá o valor aqui."
              : estado.pode_criar_evento
                ? "Seu primeiro evento continua liberado. Quando a assinatura abrir, você verá o valor aqui."
                : "Fale com a gente para liberar os próximos eventos — a assinatura abre em breve."}
          </p>
        </section>
      )}

      {/* o que fazer agora
          A cortesia também vê este bloco. Ela era uma porta sem saída: a
          conta liberada nunca era oferecida a assinar, e quando a
          cortesia acabasse a pessoa ficaria olhando "liberada como
          cortesia" para sempre. Cortesia é um presente, não uma tranca. */}
      {podeAssinar && valorMensal > 0 && (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {cortesia
              ? `Assinar por R$ ${valorMensal.toFixed(2).replace(".", ",")} por mês`
              : `Assine por R$ ${valorMensal.toFixed(2).replace(".", ",")} por mês`}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {cortesia
              ? "Sua cortesia continua valendo. Assine quando quiser — a cobrança começa no dia em que você assinar."
              : "Eventos ilimitados. Cancele quando quiser, sem multa."}
          </p>
          {!mostrarForm ? (
            <button className={`mt-3 ${botao}`} onClick={() => setMostrarForm(true)}>
              Assinar
            </button>
          ) : (
            <FormCartao
              form={form}
              setForm={setForm}
              pendente={pendente}
              onEnviar={() => enviarCartao(false)}
              cobranca={cobranca}
              setCobranca={setCobranca}
              onCancelar={() => setMostrarForm(false)}
              rotulo="Assinar"
            />
          )}
        </section>
      )}

      {temAssinaturaLa && !jaCancelada && (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Forma de pagamento</h2>
          {!mostrarForm ? (
            <button className={`mt-3 ${botaoLeve}`} onClick={() => setMostrarForm(true)}>
              {inadimplente ? "Atualizar cartão" : "Trocar cartão"}
            </button>
          ) : (
            <FormCartao
              form={form}
              setForm={setForm}
              pendente={pendente}
              onEnviar={() => enviarCartao(true)}
              onCancelar={() => setMostrarForm(false)}
              rotulo="Salvar cartão"
            />
          )}
        </section>
      )}

      {erro && <p className="text-sm text-rose-600">{erro}</p>}
      {ok && <p className="text-sm text-emerald-700">{ok}</p>}

      {podeCancelar && (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Cancelar assinatura</h2>
          <p className="mt-1 text-sm text-gray-500">
            Seus eventos e tudo o que está dentro deles continuam seus. Você
            só não poderá criar eventos novos.
          </p>
          {!cancelando ? (
            <button className={`mt-3 ${botaoLeve}`} onClick={() => setCancelando(true)}>
              Cancelar
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <input
                className={input}
                placeholder="Se quiser, conte o motivo (ajuda muito)"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  className={botao}
                  disabled={pendente}
                  onClick={() =>
                    iniciar(async () => {
                      // limpar antes: sem isto, a mensagem vermelha de uma
                      // tentativa anterior fica na tela e o cancelamento
                      // que deu certo parece ter falhado
                      setErro(null);
                      setOk(null);
                      const r = await cancelar(motivo);
                      if (r.error) {
                        setErro(r.error);
                        return;
                      }
                      setCancelando(false);
                      setMotivo("");
                      setOk("Assinatura cancelada. Você pode voltar quando quiser.");
                      router.refresh();
                    })
                  }
                >
                  Confirmar cancelamento
                </button>
                <button className={botaoLeve} onClick={() => setCancelando(false)}>
                  Voltar
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <p className="text-xs text-gray-400">
        O pagamento é processado pela Pagar.me. Os dados do seu cartão não
        passam pelos nossos servidores.
      </p>
    </div>
  );
}

function FormCartao({
  form,
  setForm,
  cobranca,
  setCobranca,
  pendente,
  onEnviar,
  onCancelar,
  rotulo,
}: {
  form: { numero: string; nome: string; mes: string; ano: string; cvv: string };
  setForm: (f: { numero: string; nome: string; mes: string; ano: string; cvv: string }) => void;
  pendente: boolean;
  onEnviar: () => void;
  onCancelar: () => void;
  rotulo: string;
  /** so no fluxo de assinar: trocar cartao nao recadastra o pagador */
  cobranca?: Cobranca;
  setCobranca?: (c: Cobranca) => void;
}) {
  const pedeCobranca = typeof setCobranca === "function";
  const c = cobranca;
  const cobrancaOk =
    !pedeCobranca ||
    Boolean(
      c &&
        c.nome.trim() &&
        c.email.trim().includes("@") &&
        documentoValido(c.documento) &&
        telefoneValido(c.telefone) &&
        cepValido(c.cep) &&
        c.rua.trim() &&
        c.numero.trim() &&
        c.bairro.trim() &&
        c.cidade.trim() &&
        ufValida(c.estado)
    );
  const completo =
    form.numero.replace(/\s/g, "").length >= 13 &&
    form.nome.trim() &&
    form.mes &&
    form.ano &&
    form.cvv.length >= 3 &&
    cobrancaOk;

  return (
    <div className="mt-3 space-y-2">
      <input
        className={input}
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="Número do cartão"
        value={form.numero}
        onChange={(e) =>
          setForm({
            ...form,
            numero: e.target.value
              .replace(/\D/g, "")
              .slice(0, 19)
              .replace(/(\d{4})(?=\d)/g, "$1 "),
          })
        }
      />
      <input
        className={input}
        autoComplete="cc-name"
        placeholder="Nome como está no cartão"
        value={form.nome}
        onChange={(e) => setForm({ ...form, nome: e.target.value.toUpperCase() })}
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          className={input}
          inputMode="numeric"
          autoComplete="cc-exp-month"
          placeholder="Mês"
          maxLength={2}
          value={form.mes}
          onChange={(e) => setForm({ ...form, mes: e.target.value.replace(/\D/g, "") })}
        />
        <input
          className={input}
          inputMode="numeric"
          autoComplete="cc-exp-year"
          placeholder="Ano"
          maxLength={4}
          value={form.ano}
          onChange={(e) => setForm({ ...form, ano: e.target.value.replace(/\D/g, "") })}
        />
        <input
          className={input}
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="CVV"
          maxLength={4}
          value={form.cvv}
          onChange={(e) => setForm({ ...form, cvv: e.target.value.replace(/\D/g, "") })}
        />
      </div>
      {pedeCobranca && c && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <DadosDeCobranca
            valor={c}
            onChange={setCobranca!}
            desabilitado={pendente}
          />
        </div>
      )}
      <div className="flex gap-2">
        <button className={botao} disabled={pendente || !completo} onClick={onEnviar}>
          {pendente ? "Processando…" : rotulo}
        </button>
        <button className={botaoLeve} onClick={onCancelar} disabled={pendente}>
          Voltar
        </button>
      </div>
    </div>
  );
}
