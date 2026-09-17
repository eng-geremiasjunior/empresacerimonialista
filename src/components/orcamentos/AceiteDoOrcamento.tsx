import { FileText } from "lucide-react";
import { formatBRL } from "@/lib/orcamentos";
import { mascararCpf, verificadorDe } from "@/lib/aceite-termo";
import { MarcarAceiteVisto } from "./MarcarAceiteVisto";

// O aceite, na tela do orçamento: quem assinou, o que fechou, e o
// documento que prova.
//
// Um cartão só. Até a 162 a assinatura ficava no banco e nenhuma tela
// mostrava — a cerimonialista sabia que "aprovou" e só. Aqui ela vê a
// assinatura desenhada, o pacote e o valor que a cliente aceitou, e abre
// o termo em PDF. O CPF sai mascarado: na tela ele não decide nada, e o
// completo fica no documento (LGPD art. 7º, V). IP, navegador e hash
// ficam no rodapé, em letra pequena — são a prova, não a informação.
//
// Componente de servidor de propósito: as assinaturas são data URI de
// dezenas de KB e só devem ir ao navegador uma vez, no HTML. A marca de
// "visto" fica no MarcarAceiteVisto, que é o único pedaço de cliente.

/**
 * A linha de `orcamento_aceites` (056 + 162), como `select *` devolve.
 * As colunas da 162 são opcionais: antes da migração elas não existem e
 * a leitura continua funcionando — cada campo ausente vale null.
 */
export type LinhaAceite = {
  id: string;
  orcamento_id: string;
  recibo_codigo: string;
  pacote_nome: string;
  pacote_preco: number | string;
  convidados: number;
  convidados_inclusos: number;
  valor_por_convidado_extra: number | string;
  valor_convidados_extra: number | string | null;
  extras: unknown;
  valor_extras: number | string | null;
  forma_pagamento: string;
  parcelas: number | null;
  desconto_percentual: number | string | null;
  valor_desconto: number | string | null;
  valor_total: number | string;
  valor_entrada: number | string | null;
  valor_parcela: number | string | null;
  nome_noiva: string;
  nome_noivo: string | null;
  assinatura_noiva: string | null;
  assinatura_noivo: string | null;
  observacoes: string | null;
  ip_origem: string | null;
  created_at: string;
  user_agent?: string | null;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  termos_versao?: string | null;
  termos_aceitos?: boolean | null;
  sha256_conteudo?: string | null;
  /** 162 item 9: calculadora | proposta | pacote_recomendado */
  origem_valor?: string | null;
  itens?: unknown;
};

/** O que a tela precisa de `evento_documento` para montar os links. */
export type LinhaDocumento = {
  id: string;
  categoria: string;
  nome: string;
  orcamento_aceite_id: string | null;
  created_at: string;
};

type Props = {
  orcamentoId: string;
  aceite: LinhaAceite;
  documentos: LinhaDocumento[];
  /** true enquanto ninguém da equipe abriu o orçamento depois do aceite */
  marcarVisto: boolean;
};

const FUSO = "America/Sao_Paulo";

/** "14/09/2026 às 10:32", em Brasília — o servidor roda em UTC. */
function quandoBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const data = d.toLocaleDateString("pt-BR", { timeZone: FUSO });
  const hora = d.toLocaleTimeString("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${data} às ${hora}`;
}

/** "Chrome no iPhone" — o navegador inteiro tem 300 caracteres e não cabe. */
function navegadorCurto(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const navegador = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox|FxiOS/.test(ua)
        ? "Firefox"
        : /Chrome|CriOS/.test(ua)
          ? "Chrome"
          : /Safari/.test(ua)
            ? "Safari"
            : "navegador";
  const aparelho = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Macintosh|Mac OS/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : null;
  return aparelho ? `${navegador} no ${aparelho}` : navegador;
}

function numero(v: number | string | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** `extras` é jsonb `[{nome, preco}]`; qualquer outra forma vira lista vazia. */
function extrasDe(bruto: unknown): { nome: string; preco: number }[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .map((x) => {
      const o = (x ?? {}) as { nome?: unknown; preco?: unknown };
      return { nome: String(o.nome ?? "").trim(), preco: numero(o.preco as number) };
    })
    .filter((x) => x.nome !== "");
}

/** Os itens gravados no aceite quando o valor é o da proposta. */
function itensDe(bruto: unknown): { nome: string; valor: number }[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .map((x) => {
      const o = (x ?? {}) as { nome?: unknown; valor?: unknown };
      return { nome: String(o.nome ?? "").trim(), valor: numero(o.valor as number) };
    })
    .filter((x) => x.nome !== "");
}

function Assinante({
  nome,
  png,
  detalhes,
}: {
  nome: string;
  png: string | null;
  detalhes: string[];
}) {
  return (
    <figure className="min-w-0">
      {png ? (
        // fundo branco e borda fina: o PNG é transparente, e sem a
        // borda a assinatura parece flutuar solta no cartão
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={png}
          alt={`Assinatura de ${nome}`}
          className="h-24 w-full max-w-xs rounded-lg border border-gray-200 bg-white object-contain p-2"
        />
      ) : (
        <div className="flex h-24 w-full max-w-xs items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
          Sem assinatura desenhada
        </div>
      )}
      <figcaption className="mt-2">
        <p className="font-medium text-gray-900">{nome}</p>
        {detalhes.length > 0 && (
          <p className="text-xs text-gray-500">{detalhes.join(" · ")}</p>
        )}
      </figcaption>
    </figure>
  );
}

export function AceiteDoOrcamento({
  orcamentoId,
  aceite,
  documentos,
  marcarVisto,
}: Props) {
  const total = numero(aceite.valor_total);
  const entrada = numero(aceite.valor_entrada);
  const parcela = numero(aceite.valor_parcela);
  const desconto = numero(aceite.valor_desconto);
  const descontoPct = numero(aceite.desconto_percentual);
  const extras = extrasDe(aceite.extras);
  // valor da própria proposta (Maison): o que ela aceitou são os itens
  const daProposta = aceite.origem_valor === "proposta";
  const itens = daProposta ? itensDe(aceite.itens) : [];
  const convidadosAlem = Math.max(
    0,
    numero(aceite.convidados) - numero(aceite.convidados_inclusos)
  );

  const cpf = mascararCpf(aceite.cpf);
  const documento = (aceite.cpf ?? "").replace(/\D/g, "").length === 14 ? "CNPJ" : "CPF";
  const detalhes1 = [cpf ? `${documento} ${cpf}` : "", aceite.email ?? "", aceite.telefone ?? ""]
    .map((s) => s.trim())
    .filter(Boolean);

  const pagamento =
    aceite.forma_pagamento === "vista"
      ? "À vista"
      : aceite.parcelas && parcela > 0
        ? `Entrada de ${formatBRL(entrada)} + ${aceite.parcelas}× de ${formatBRL(parcela)}`
        : "Parcelado";

  // O termo é do aceite; o contrato é da proposta inteira (pode ter sido
  // anexado depois). A lista vem em ordem decrescente: o primeiro que
  // casa é o mais novo.
  const termo = documentos.find(
    (d) =>
      d.categoria === "termo_aceite" &&
      (d.orcamento_aceite_id === aceite.id || d.orcamento_aceite_id === null)
  );
  const contrato = documentos.find((d) => d.categoria === "contrato_prestacao");

  const sha = aceite.sha256_conteudo?.trim() || null;
  const linkVerificacao = sha
    ? `/aceite/${encodeURIComponent(aceite.recibo_codigo)}?v=${verificadorDe(sha)}`
    : null;

  const navegador = navegadorCurto(aceite.user_agent);
  const prova = [
    aceite.ip_origem ? `IP ${aceite.ip_origem}` : "",
    navegador ?? "",
    aceite.termos_aceitos && aceite.termos_versao
      ? `termos aceitos (versão ${aceite.termos_versao})`
      : "",
  ].filter(Boolean);

  return (
    <section className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
      {marcarVisto && <MarcarAceiteVisto orcamentoId={orcamentoId} />}

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-100 px-8 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Aceite
        </h2>
        <p className="text-sm text-gray-600">
          {quandoBR(aceite.created_at)} · recibo{" "}
          <span className="font-mono">{aceite.recibo_codigo}</span>
        </p>
      </div>

      <div className="px-8 py-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <Assinante
            nome={aceite.nome_noiva}
            png={aceite.assinatura_noiva}
            detalhes={detalhes1}
          />
          {aceite.nome_noivo && (
            <Assinante
              nome={aceite.nome_noivo}
              png={aceite.assinatura_noivo}
              detalhes={[]}
            />
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          {daProposta ? (
            <div>
              <dt className="text-xs text-gray-400">Itens da proposta</dt>
              {itens.length === 0 ? (
                <dd className="font-medium text-gray-900">{aceite.pacote_nome}</dd>
              ) : (
                itens.map((x, i) => (
                  <dd key={i} className="text-gray-900">
                    {x.nome}{" "}
                    <span className="text-xs text-gray-500">{formatBRL(x.valor)}</span>
                  </dd>
                ))
              )}
            </div>
          ) : (
            <div>
              <dt className="text-xs text-gray-400">Pacote</dt>
              <dd className="font-medium text-gray-900">{aceite.pacote_nome}</dd>
              <dd className="text-xs text-gray-500">
                {formatBRL(numero(aceite.pacote_preco))}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-gray-400">Convidados</dt>
            <dd className="font-medium text-gray-900">{aceite.convidados}</dd>
            {convidadosAlem > 0 && (
              <dd className="text-xs text-gray-500">
                {convidadosAlem} além dos {aceite.convidados_inclusos} inclusos ·{" "}
                {formatBRL(numero(aceite.valor_convidados_extra))}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-gray-400">Extras</dt>
            {extras.length === 0 ? (
              <dd className="font-medium text-gray-900">Nenhum</dd>
            ) : (
              extras.map((x, i) => (
                <dd key={i} className="text-gray-900">
                  {x.nome}{" "}
                  <span className="text-xs text-gray-500">{formatBRL(x.preco)}</span>
                </dd>
              ))
            )}
          </div>
          <div>
            <dt className="text-xs text-gray-400">Pagamento</dt>
            <dd className="font-medium text-gray-900">{pagamento}</dd>
            {desconto > 0 && (
              <dd className="text-xs text-gray-500">
                {descontoPct > 0 ? `${descontoPct}% de desconto · ` : "Desconto de "}
                {formatBRL(desconto)}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-gray-400">Total aceito</dt>
            <dd className="text-lg font-semibold text-gray-900">{formatBRL(total)}</dd>
          </div>
        </dl>

        {aceite.observacoes && (
          <p className="mt-4 text-sm text-gray-600">
            <span className="text-xs text-gray-400">Observações da cliente: </span>
            {aceite.observacoes}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {termo ? (
            <a
              href={`/api/documento/${termo.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-gray-900 underline underline-offset-4 hover:text-gray-600"
            >
              <FileText size={15} /> Abrir termo (PDF)
            </a>
          ) : (
            <span className="text-gray-500">
              Termo em geração — fica pronto em até 24 horas
            </span>
          )}
          {contrato && (
            <a
              href={`/api/documento/${contrato.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-gray-900 underline underline-offset-4 hover:text-gray-600"
            >
              <FileText size={15} /> Abrir contrato
            </a>
          )}
        </div>
      </div>

      {(prova.length > 0 || sha) && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-8 py-3 text-xs text-gray-500">
          {prova.length > 0 && <p>{prova.join(" · ")}</p>}
          {sha && (
            <p className="mt-1 break-all font-mono">
              SHA-256 {sha}
              {linkVerificacao && (
                <>
                  {" "}
                  <a
                    href={linkVerificacao}
                    target="_blank"
                    rel="noreferrer"
                    className="font-sans underline underline-offset-2 hover:text-gray-900"
                  >
                    verificar
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
