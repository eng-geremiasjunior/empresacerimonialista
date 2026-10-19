// Oportunidades — a primeira aba do Comercial (18/10/2026, pedido dele com a
// Wedy de referência). O funil que anda sozinho: a coluna de cada cartão
// sai do que o sistema comprova, e cada cartão tem uma próxima ação. No
// alto, só o que passou do tempo ("Precisa de retorno").
//
// Quem conduz proposta (dona, coordenadora, cerimonialista) vê; a RLS
// entrega a cada cargo as propostas que ele já vê em Propostas.

import Link from "next/link";
import { SubNav } from "@/components/SubNav";
import { VISOES_ORCAMENTOS } from "@/lib/visoes";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { lerOportunidades } from "@/lib/supabase/oportunidades";
import {
  DIAS_DO_HISTORICO,
  montarOportunidades,
  type CartaoDaOportunidade,
} from "@/lib/comercial/oportunidades";
import { EncerrarPedido } from "@/components/comercial/oportunidades/EncerrarPedido";
import { MarcarReuniao } from "@/components/comercial/oportunidades/MarcarReuniao";
import { AvisosVistos } from "@/components/comercial/oportunidades/AvisosVistos";
import { formatCurrency } from "@/lib/format";
import { hojeBR } from "@/lib/tempo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Oportunidades — eorganizei" };

const CONDUZEM = ["proprietaria", "coordenadora", "cerimonialista"];

const CSS = `
.op{display:flex;flex-direction:column;gap:18px;font-family:var(--font-ui),Inter,sans-serif;color:var(--mo-tinta,#252525)}
.op-titulo{margin:0;font-family:var(--font-title),Inter,sans-serif;font-weight:700;font-size:28px;letter-spacing:-0.02em}
.op-frase{margin:4px 0 0;font-size:15px;color:var(--mo-cinza-1,#68645E)}
.op-frase b{font-weight:600;color:var(--mo-tinta,#252525)}
.op-retorno{background:var(--mo-papel,#FFFEFC);border:1px solid var(--mo-linha,#D8D1C7);border-left:3px solid var(--mo-destaque,#A34F3E);border-radius:6px}
.op-retorno h2{margin:0;padding:12px 16px;font-size:15px;font-weight:600;border-bottom:1px solid var(--mo-linha,#D8D1C7);display:flex;gap:8px;align-items:baseline}
.op-retorno h2 span{font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:12px;font-weight:500;color:var(--mo-cinza-1,#68645E)}
.op-retorno ul{list-style:none;margin:0;padding:0 16px}
.op-retorno li{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;padding:10px 0;border-bottom:1px solid var(--mo-linha,#D8D1C7)}
.op-retorno li:last-child{border-bottom:0}
.op-retorno .op-quem{flex:1 1 260px;min-width:0;font-size:14px}
.op-retorno .op-quem b{font-weight:600}
.op-retorno .op-quem span{display:block;font-size:13px;color:var(--mo-atraso,#9A3B2E);font-weight:500}
.op-quadro{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:start}
.op-coluna{background:var(--mo-nevoa,#F1EEE9);border:1px solid var(--mo-linha,#D8D1C7);border-radius:6px;padding:10px;min-width:0;display:flex;flex-direction:column;gap:8px}
.op-coluna-cabeca{display:flex;align-items:baseline;gap:8px;padding:2px 4px 6px}
.op-coluna-cabeca h2{margin:0;font-size:14px;font-weight:600}
.op-conta{font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:12px;color:var(--mo-cinza-1,#68645E)}
.op-coluna-valor{margin-left:auto;font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:12px;color:var(--mo-cinza-1,#68645E);font-variant-numeric:tabular-nums}
.op-vazio{margin:0;padding:14px 6px;font-size:13.5px;color:var(--mo-cinza-1,#68645E)}
.op-cartao{background:var(--mo-papel,#FFFEFC);border:1px solid var(--mo-linha,#D8D1C7);border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:4px;min-width:0}
.op-cartao.urgente{border-color:var(--mo-destaque,#A34F3E)}
.op-nome{display:flex;gap:8px;align-items:baseline;justify-content:space-between}
.op-nome a{font-size:14.5px;font-weight:600;color:var(--mo-tinta,#252525);text-decoration:none;min-width:0;overflow-wrap:anywhere}
.op-nome a:hover{text-decoration:underline;text-underline-offset:3px}
.op-valor{flex:none;font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:12.5px;font-variant-numeric:tabular-nums;color:var(--mo-tinta,#252525)}
.op-evento{font-size:13px;color:var(--mo-cinza-1,#68645E)}
.op-origem{font-size:12.5px;color:var(--mo-cinza-2,#736D65)}
.op-reuniao{font-size:12.5px;font-weight:600;color:var(--mo-destaque-escuro,#86402F)}
.op-linha{font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:12px;color:var(--mo-cinza-1,#68645E)}
.op-cartao.urgente .op-linha{color:var(--mo-atraso,#9A3B2E);font-weight:600}
.op-acoes{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:6px}
.op-acao{display:inline-block;border-radius:6px;padding:7px 12px;font-size:13px;font-weight:600;text-decoration:none;border:1px solid var(--mo-linha,#D8D1C7);color:var(--mo-tinta,#252525);background:var(--mo-papel,#FFFEFC)}
.op-acao:hover{background:var(--mo-marfim,#F8F6F2)}
.op-acao.forte{background:var(--mo-destaque,#A34F3E);border-color:var(--mo-destaque,#A34F3E);color:#fff}
.op-acao.forte:hover{background:var(--mo-destaque-escuro,#86402F)}
.op-acao:focus-visible,.op-encerrar:focus-visible{outline:2px solid var(--mo-destaque,#A34F3E);outline-offset:2px}
.op-encerrar{border:0;background:none;padding:4px 2px;font-size:12.5px;color:var(--mo-cinza-1,#68645E);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.op-encerrar-caixa{width:100%;display:flex;flex-direction:column;gap:6px;margin-top:4px}
.op-encerrar-caixa label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--mo-cinza-1,#68645E)}
.op-encerrar-caixa input{border:1px solid var(--mo-linha,#D8D1C7);border-radius:6px;padding:7px 9px;font:inherit;font-size:13.5px;color:var(--mo-tinta,#252525);background:var(--mo-papel,#FFFEFC)}
.op-encerrar-botoes{display:flex;gap:8px}
.op-encerrar-botoes button{border-radius:6px;padding:6px 10px;font-size:13px;font-weight:600;border:1px solid var(--mo-tinta,#252525);background:var(--mo-tinta,#252525);color:#fff;cursor:pointer}
.op-encerrar-botoes .op-voltar{background:none;color:var(--mo-tinta,#252525);border-color:var(--mo-linha,#D8D1C7)}
.op-erro{margin:0;font-size:12.5px;color:var(--mo-atraso,#9A3B2E)}
.op-rodape{font-size:13.5px;color:var(--mo-cinza-1,#68645E)}
.op-rodape a{color:var(--mo-destaque,#A34F3E);font-weight:600;text-decoration:none}
.op-rodape a:hover{text-decoration:underline;text-underline-offset:3px}
@media (max-width:1180px){.op-quadro{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:700px){.op-quadro{grid-template-columns:1fr}}
`;

function Acao({ c, forte }: { c: CartaoDaOportunidade; forte: boolean }) {
  if (!c.acao) return null;
  const classe = `op-acao ${forte ? "forte" : ""}`;
  return c.acao.fora ? (
    <a href={c.acao.href} target="_blank" rel="noopener noreferrer" className={classe}>
      {c.acao.rotulo}
    </a>
  ) : (
    <Link href={c.acao.href} className={classe}>
      {c.acao.rotulo}
    </Link>
  );
}

// o pedido abre na fila completa, na situação certa, com a mensagem inteira
const hrefDoCartao = (c: CartaoDaOportunidade) =>
  c.tipo === "proposta"
    ? `/orcamentos/${c.id}`
    : c.encerravel
      ? `/orcamentos/pedidos#pedido-${c.id}`
      : `/orcamentos/pedidos?estado=encerrados#pedido-${c.id}`;

function Cartao({ c, emAberto }: { c: CartaoDaOportunidade; emAberto: boolean }) {
  return (
    <article className={`op-cartao ${c.urgente ? "urgente" : ""}`}>
      <div className="op-nome">
        <Link href={hrefDoCartao(c)}>{c.nome}</Link>
        {c.valor ? <span className="op-valor">{formatCurrency(c.valor)}</span> : null}
      </div>
      <span className="op-evento">{c.evento}</span>
      {c.origem && <span className="op-origem">{c.origem}</span>}
      {c.servico && <span className="op-origem">serviço: {c.servico}</span>}
      {c.reuniao && <span className="op-reuniao">{c.reuniao}</span>}
      <span className="op-linha">{c.linha}</span>
      {(c.acao || c.encerravel || emAberto) && (
        <div className="op-acoes">
          <Acao c={c} forte={c.urgente || c.tipo === "pedido"} />
          {emAberto && !c.reuniao && <MarcarReuniao tipo={c.tipo} id={c.id} />}
          {c.encerravel && <EncerrarPedido id={c.id} />}
        </div>
      )}
    </article>
  );
}

export default async function OportunidadesPage() {
  const { cargo } = await getMeuCargo();
  if (!cargo || !CONDUZEM.includes(cargo)) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <SubNav itens={VISOES_ORCAMENTOS} cargo={cargo} />
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          As oportunidades ficam com quem conduz as propostas.
        </p>
      </div>
    );
  }

  const agora = new Date();
  const { dados, falhou } = await lerOportunidades();
  const { colunas, retorno } = montarOportunidades(dados, hojeBR(agora), agora);
  const negociacao = colunas.find((c) => c.chave === "negociacao");
  const novos = colunas.find((c) => c.chave === "novos")?.cartoes.length ?? 0;

  const frase: React.ReactNode[] = [];
  if (retorno.length > 0)
    frase.push(
      <span key="r">
        <b>{retorno.length}</b> {retorno.length === 1 ? "precisa" : "precisam"} de retorno
      </span>
    );
  if (novos > 0)
    frase.push(
      <span key="n">
        <b>{novos}</b> {novos === 1 ? "pedido novo" : "pedidos novos"}
      </span>
    );
  if (negociacao && negociacao.valor > 0)
    frase.push(
      <span key="v">
        <b>{formatCurrency(negociacao.valor)}</b> em negociação
      </span>
    );

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      <SubNav itens={VISOES_ORCAMENTOS} cargo={cargo} />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <AvisosVistos />
      <div className="op">
        <header>
          <h1 className="op-titulo">Oportunidades</h1>
          <p className="op-frase">
            {frase.length === 0
              ? "Nada esperando você agora."
              : frase.flatMap((f, i) => (i === 0 ? [f] : [" · ", f]))}
          </p>
        </header>

        {falhou && <p className="op-erro">Parte das oportunidades não carregou. Recarregue a página.</p>}

        {retorno.length > 0 && (
          <section className="op-retorno" aria-label="Precisa de retorno">
            <h2>
              Precisa de retorno <span>{retorno.length}</span>
            </h2>
            <ul>
              {retorno.map((c) => (
                <li key={`r-${c.chave}`}>
                  <div className="op-quem">
                    <Link href={hrefDoCartao(c)} style={{ color: "inherit", textDecoration: "none" }}>
                      <b>{c.nome}</b>
                    </Link>
                    {" · "}
                    {c.evento}
                    <span>{c.linha}</span>
                  </div>
                  <Acao c={c} forte />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="op-quadro">
          {colunas.map((col) => (
            <section key={col.chave} className="op-coluna" aria-label={col.titulo}>
              <div className="op-coluna-cabeca">
                <h2>{col.titulo}</h2>
                <span className="op-conta">{col.cartoes.length}</span>
                {col.valor > 0 && <span className="op-coluna-valor">{formatCurrency(col.valor)}</span>}
              </div>
              {col.cartoes.length === 0 ? (
                <p className="op-vazio">{col.vazio}</p>
              ) : (
                col.cartoes.map((c) => (
                  <Cartao key={c.chave} c={c} emAberto={col.chave === "novos" || col.chave === "negociacao"} />
                ))
              )}
            </section>
          ))}
        </div>

        <p className="op-rodape">
          Fechados e não fechou mostram os últimos {DIAS_DO_HISTORICO} dias. O histórico completo está em{" "}
          <Link href="/orcamentos">Propostas</Link> e em <Link href="/orcamentos/pedidos">todos os pedidos</Link>.
        </p>
      </div>
    </div>
  );
}
