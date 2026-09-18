// A ficha de uma conta: quem é, em que situação está, o que fez e o que o
// painel fez com ela. Só números e nomes de área: nada do conteúdo dela
// (nome de evento, de cliente, de convidado) aparece aqui. Do próximo
// evento, só tipo, data e cidade.
//
// Abrir a ficha mostra e-mail e WhatsApp da dona, e por isso fica na
// auditoria (uma linha por conta por dia).

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  Check,
  CreditCard,
  LayoutList,
  LifeBuoy,
  Minus,
  NotebookPen,
} from "lucide-react";
import { getAgoraDasContas, registrarFichaAberta } from "@/lib/supabase/admin-painel";
import { getLinhaDoTempo, getResumoDaConta, PRORROGACAO_MAXIMA } from "@/lib/supabase/admin-contas";
import { ROTULO_DA_ETAPA } from "@/lib/etapas-da-assinatura";
import { getCatalogoDePlanos, reais as reaisDoCatalogo, tetoEmTexto } from "@/lib/planos";
import {
  aparelhoDoAgente,
  banida,
  cidadesDaConta,
  diasAte,
  diasDesde,
  emTeste,
  motivosDeAtencao,
  passosDaConta,
  situacaoDaConta,
  valorMensal,
  type ResumoDaConta,
} from "@/lib/admin/saude-da-conta";
import {
  canalDaConta,
  hrefDaLista,
  lerFiltros,
  planoOuTeste,
  ultimaAcaoEmTexto,
  ultimoAcessoEmTexto,
} from "@/lib/admin/lista-de-contas";
import { montarLinhaDoTempo } from "@/lib/admin/linha-do-tempo";
import { acaoEmPalavras, mudancaEmTexto } from "@/lib/admin/auditoria";
import {
  dataBR,
  diaEHoraBR,
  diaPorExtenso,
  minutosEmTexto,
  plural,
  reais,
} from "@/lib/admin/formatos";
import { descreverEventos3Meses } from "@/lib/cadastro-qualificacao";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { Abas, Aviso, Fatos, Secao, Vazio } from "@/components/admin/pecas";
import type { OpcaoDePlano } from "../EditorAssinatura";
import { AcoesDaConta } from "./AcoesDaConta";
import { NotaDaConta } from "./NotaDaConta";

export const dynamic = "force-dynamic";

type AbaDaFicha = "resumo" | "atividade" | "assinatura" | "suporte" | "registro";
const ABAS: AbaDaFicha[] = ["resumo", "atividade", "assinatura", "suporte", "registro"];

const BOTAO_LINK =
  "rounded-md border border-[#d3d3cf] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#1c1d21] hover:border-[#9a9ba1]";

function tipoDoEvento(tipo: string | null): string {
  if (!tipo) return "evento";
  return (EVENT_TYPE_LABELS as Record<string, string>)[tipo] ?? tipo;
}

export default async function FichaDaConta({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const agora = new Date();
  const abaPedida = String(searchParams?.aba ?? "resumo");
  const aba: AbaDaFicha = ABAS.includes(abaPedida as AbaDaFicha) ? (abaPedida as AbaDaFicha) : "resumo";
  const diasPedidos = Number(searchParams?.dias);
  const dias = [60, 180, 400].includes(diasPedidos) ? diasPedidos : 60;

  const leitura = await getResumoDaConta(params.id);
  if (!leitura.ok) {
    return (
      <div data-adm-secao="contas" className="flex flex-col gap-4">
        <Link href="/admin/contas" className="text-[12.5px] text-[#5c5d63] hover:text-[#1c1d21]">
          ← Contas
        </Link>
        <Aviso>{leitura.mensagem}</Aviso>
      </div>
    );
  }
  const c = leitura.dados;
  if (!c) notFound();

  await registrarFichaAberta(c.empresa_id);
  const [lt, agoraPor, catalogo] = await Promise.all([
    getLinhaDoTempo(c.empresa_id, dias),
    getAgoraDasContas(),
    aba === "assinatura" ? getCatalogoDePlanos() : Promise.resolve([]),
  ]);

  const sit = situacaoDaConta(c, agora);
  const motivos = motivosDeAtencao(c, agora);
  const aoVivo = agoraPor[c.empresa_id] ?? null;
  const voltar = hrefDaLista(lerFiltros({}), { grupo: c.da_casa ? "casa" : "clientes" });
  const wa = linkWhatsapp(c.dona.whatsapp);
  const hrefAba = (a: AbaDaFicha) => (a === "resumo" ? `/admin/contas/${c.empresa_id}` : `/admin/contas/${c.empresa_id}?aba=${a}`);

  return (
    <div data-adm-secao="contas" className="flex flex-col gap-4">
      <Link href={voltar} className="text-[12.5px] text-[#5c5d63] hover:text-[#1c1d21]">
        ← {c.da_casa ? "Contas da casa" : "Contas de clientes"}
      </Link>

      {/* cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#1c1d21]">{c.nome}</h1>
          <p className="mt-1 text-[13px] text-[#3d3e44]">
            <strong className="font-semibold">{sit.rotulo}</strong>
            {" · "}
            {planoOuTeste(c, agora)}
          </p>
          <p className="mt-1 break-words text-[13px] text-[#5c5d63]">
            {[c.dona.nome, c.dona.email].filter(Boolean).join(" · ") || "sem responsável registrada"}
          </p>
          <p className="mt-1 text-[13px] text-[#5c5d63]">
            Última ação útil: {ultimaAcaoEmTexto(c, agora)} · Último acesso: {ultimoAcessoEmTexto(c, agora)}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px]">
            <span
              aria-hidden
              className={`h-2 w-2 shrink-0 rounded-full ${aoVivo?.aoVivo ? "bg-emerald-500" : "bg-stone-300"}`}
            />
            {aoVivo?.aoVivo ? (
              <span className="text-emerald-700">
                no sistema agora · {aoVivo.area}
                {aoVivo.pessoas > 1 ? ` · ${aoVivo.pessoas} pessoas` : ""}
              </span>
            ) : (
              <span className="text-[#84858b]">
                {aoVivo ? `fora do sistema · visto ${aoVivo.quando}, em ${aoVivo.area}` : "fora do sistema · sem registro de tela ainda"}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={BOTAO_LINK}>
              WhatsApp
            </a>
          ) : (
            <span className="px-1 py-1.5 text-[12px] text-[#84858b]">sem WhatsApp completo</span>
          )}
          {c.dona.email && (
            <a href={`mailto:${c.dona.email}`} className={BOTAO_LINK}>
              E-mail
            </a>
          )}
          {c.dona.instagram && (
            <a
              href={`https://instagram.com/${encodeURIComponent(c.dona.instagram)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={BOTAO_LINK}
            >
              @{c.dona.instagram}
            </a>
          )}
        </div>
      </div>

      {motivos.length > 0 && (
        <div className="rounded-lg border border-[#d9c2d2] bg-[#f3ebf0] px-4 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#6e3f5f]">Pede atenção</p>
          <ul className="mt-1 list-disc pl-5 text-[13px] text-[#3d3e44]">
            {motivos.map((m) => (
              <li key={m.chave}>{m.texto}</li>
            ))}
          </ul>
        </div>
      )}

      <Abas
        rotulo="Partes da ficha"
        atual={aba}
        abas={[
          { chave: "resumo", rotulo: "Resumo", href: hrefAba("resumo"), Icone: LayoutList },
          { chave: "atividade", rotulo: "Atividade", href: hrefAba("atividade"), Icone: CalendarClock },
          { chave: "assinatura", rotulo: "Assinatura", href: hrefAba("assinatura"), Icone: CreditCard },
          { chave: "suporte", rotulo: "Suporte", href: hrefAba("suporte"), Icone: LifeBuoy },
          { chave: "registro", rotulo: "Notas e registro", href: hrefAba("registro"), Icone: NotebookPen },
        ]}
      />

      {!lt.ok && <Aviso>{lt.mensagem}</Aviso>}

      {aba === "resumo" && <Resumo c={c} agora={agora} />}

      {aba === "atividade" && lt.ok && (
        <Secao
          titulo="Atividade"
          nota="Contagens por dia e nomes de área. Os dias sem abrir o sistema só aparecem desde 16/09/2026, quando o registro de uso começou."
          lado={
            <span className="flex gap-2">
              {[60, 180, 400].map((d) => (
                <Link
                  key={d}
                  href={`/admin/contas/${c.empresa_id}?aba=atividade&dias=${d}`}
                  className={d === dias ? "font-semibold text-[#1c1d21]" : "underline underline-offset-2"}
                >
                  {d === 400 ? "13 meses" : `${d} dias`}
                </Link>
              ))}
            </span>
          }
        >
          {(() => {
            const linha = montarLinhaDoTempo(c, lt.dados, agora, dias);
            if (linha.length === 0) return <Vazio>Nada registrado neste período.</Vazio>;
            return (
              <ol className="flex flex-col gap-3">
                {linha.map((d) => (
                  <li key={d.dia} className="grid gap-1 sm:grid-cols-[170px_1fr]">
                    <span className="text-[12.5px] font-medium text-[#1c1d21]">{diaPorExtenso(d.dia)}</span>
                    <ul className="flex flex-col gap-0.5 text-[13px]">
                      {d.linhas.map((l, i) => (
                        <li
                          key={i}
                          className={
                            l.tipo === "ausencia"
                              ? "text-[#9a9ba1]"
                              : l.tipo === "futuro"
                                ? "text-[#6e3f5f]"
                                : l.tipo === "marco" || l.tipo === "assinatura"
                                  ? "font-medium text-[#1c1d21]"
                                  : "text-[#3d3e44]"
                          }
                        >
                          {l.texto}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            );
          })()}
        </Secao>
      )}

      {aba === "assinatura" && (
        <>
          <Secao titulo="Assinatura">
            <Fatos
              linhas={[
                { rotulo: "Situação", valor: sit.rotulo },
                { rotulo: "Plano", valor: c.assinatura ? `${c.assinatura.plano} · ${valorMensal(c) > 0 ? `${reais(valorMensal(c))} por mês` : "R$ 0"}` : "sem assinatura" },
                ...(c.assinatura?.teste_ia_ate
                  ? [{ rotulo: "Teste", valor: `até ${dataBR(c.assinatura.teste_termina_em ?? c.assinatura.teste_ia_ate)}${emTeste(c) && c.assinatura.teste_termina_em ? ` (${(() => { const f = diasAte(c.assinatura!.teste_termina_em, agora) ?? 0; return f < 0 ? "acabou" : f === 0 ? "acaba hoje" : `faltam ${plural(f, "dia", "dias")}`; })()})` : ""}` }]
                  : []),
                ...(c.historico.convertida_em ? [{ rotulo: "Começou a pagar", valor: dataBR(c.historico.convertida_em) }] : []),
                ...(c.assinatura?.cancelada_em ? [{ rotulo: "Cancelou", valor: `${dataBR(c.assinatura.cancelada_em)}${c.assinatura.motivo_cancelamento ? ` · motivo: ${c.assinatura.motivo_cancelamento}` : ""}` }] : []),
                ...(c.congela_em ? [{ rotulo: "Congela", valor: `${dataBR(c.congela_em)}${c.congelada ? " (já congelada: lê tudo, não altera nada)" : ""}` }] : []),
                ...(c.assinatura?.promocao_codigo ? [{ rotulo: "Promoção", valor: c.assinatura.promocao_codigo }] : []),
                ...(c.assinatura?.observacao ? [{ rotulo: "Observação", valor: c.assinatura.observacao }] : []),
              ]}
            />
            <div className="mt-4">
              <AcoesDaConta
                empresaId={c.empresa_id}
                assinatura={
                  c.assinatura
                    ? {
                        plano: c.assinatura.plano,
                        valorMensal: valorMensal(c),
                        status: c.assinatura.status,
                        observacao: c.assinatura.observacao ?? null,
                      }
                    : null
                }
                planos={[
                  ...(catalogo as Awaited<ReturnType<typeof getCatalogoDePlanos>>).map(
                    (p): OpcaoDePlano => ({
                      codigo: p.codigo,
                      rotulo: `${p.nome} — ${reaisDoCatalogo(p.valorMensal)} · ${tetoEmTexto(p.eventosEmAndamento)} eventos · ${tetoEmTexto(p.logins)} ${p.logins === 1 ? "login" : "logins"}`,
                      valorMensal: p.valorMensal,
                    })
                  ),
                  { codigo: "cortesia", rotulo: "Cortesia — sem limite", valorMensal: null },
                  { codigo: "piloto", rotulo: "Piloto — sem limite", valorMensal: null },
                ]}
                emTeste={emTeste(c)}
                daCasa={c.da_casa}
                suspensa={banida(c, agora)}
              />
              {emTeste(c) && (
                <p className="mt-2 text-[12px] text-[#84858b]">
                  Prorrogar soma dias ao fim do teste (até {PRORROGACAO_MAXIMA} de uma vez); teste que já acabou volta a correr a partir de hoje.
                </p>
              )}
            </div>
          </Secao>

          <Secao titulo="Cobrança">
            {c.assinatura?.tem_gateway ? (
              <Fatos
                linhas={[
                  { rotulo: "Cartão", valor: c.assinatura.cartao_final ? `${c.assinatura.cartao_bandeira ?? "cartão"} final ${c.assinatura.cartao_final}${c.assinatura.cartao_mes && c.assinatura.cartao_ano ? ` · vale até ${String(c.assinatura.cartao_mes).padStart(2, "0")}/${c.assinatura.cartao_ano}` : ""}` : "—" },
                  { rotulo: "Próxima cobrança", valor: dataBR(c.assinatura.proximo_vencimento) },
                  { rotulo: "Último pagamento", valor: dataBR(c.assinatura.ultimo_pagamento_em) },
                  { rotulo: "Recusas seguidas", valor: String(c.assinatura.falhas_seguidas ?? 0) },
                ]}
              />
            ) : (
              <Vazio>Sem assinatura na operadora.</Vazio>
            )}
          </Secao>

          {lt.ok && (
            <Secao titulo="Histórico da assinatura" nota="O que alimenta o MRR do painel, e os avisos da operadora desta conta.">
              {lt.dados.assinatura.length === 0 && lt.dados.gateway.length === 0 ? (
                <Vazio>Nenhum movimento de assinatura ainda.</Vazio>
              ) : (
                <ul className="flex flex-col gap-1 text-[13px] text-[#3d3e44]">
                  {lt.dados.assinatura.map((e, i) => (
                    <li key={`a${i}`}>
                      <span className="text-[#84858b]">{dataBR(e.em)}</span> · {e.tipo}
                      {e.valor_depois !== null ? ` · ${reais(Number(e.valor_depois))}` : ""}
                      {e.nota ? ` · ${e.nota}` : ""}
                    </li>
                  ))}
                  {lt.dados.gateway.map((g, i) => (
                    <li key={`g${i}`} className="text-[#5c5d63]">
                      <span className="text-[#84858b]">{diaEHoraBR(g.em)}</span> · operadora: {g.tipo}
                      {g.erro ? ` · ${g.erro}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </Secao>
          )}
        </>
      )}

      {aba === "suporte" && (
        <Secao titulo="Suporte">
          <Fatos
            linhas={[
              { rotulo: "Mensagens em 30 dias", valor: String(c.suporte.mensagens_30d ?? 0) },
              { rotulo: "Não lidas", valor: String(c.suporte.nao_lidas ?? 0) },
              {
                rotulo: "Sem resposta",
                valor: c.suporte.sem_resposta ? `${plural(c.suporte.sem_resposta, "conversa", "conversas")} esperando desde ${diaEHoraBR(c.suporte.esperando_desde)}` : "nenhuma",
              },
              { rotulo: "Última mensagem", valor: diaEHoraBR(c.suporte.ultima_em) },
            ]}
          />
          <div className="mt-3">
            <Link href={`/admin/suporte?u=${c.dona.user_id}`} className={BOTAO_LINK}>
              Abrir a conversa da responsável
            </Link>
          </div>
        </Secao>
      )}

      {aba === "registro" && lt.ok && (
        <>
          <Secao titulo="Notas" nota="Só você vê. Nota não se apaga: para corrigir, escreva outra.">
            <NotaDaConta empresaId={c.empresa_id} />
            {lt.dados.notas.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2">
                {lt.dados.notas.map((n) => (
                  <li key={n.id} className="rounded-md border border-[#ecece8] bg-[#fafaf8] px-3 py-2">
                    <p className="whitespace-pre-wrap text-[13px] text-[#1c1d21]">{n.texto}</p>
                    <p className="mt-1 text-[11.5px] text-[#84858b]">{diaEHoraBR(n.em)} · {n.autor}</p>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
          <Secao titulo="O que o painel fez com esta conta" nota="Registro que não se altera nem se apaga.">
            {lt.dados.registro.length === 0 ? (
              <Vazio>Nada registrado ainda.</Vazio>
            ) : (
              <ul className="flex flex-col gap-1.5 text-[13px]">
                {lt.dados.registro.map((r, i) => {
                  const mudanca = mudancaEmTexto(r.antes, r.depois);
                  return (
                    <li key={i} className="text-[#3d3e44]">
                      <span className="text-[#84858b]">{diaEHoraBR(r.em)}</span> · {r.quem} · {acaoEmPalavras(r.acao)}
                      {mudanca && <span className="text-[#5c5d63]"> · {mudanca}</span>}
                      {r.motivo && <span className="text-[#5c5d63]"> · motivo: {r.motivo}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Secao>
        </>
      )}
    </div>
  );
}

function Resumo({ c: conta, agora }: { c: ResumoDaConta; agora: Date }) {
  const passos = passosDaConta(conta);
  const cidades = cidadesDaConta(conta);
  const aparelho = aparelhoDoAgente(conta.origem?.user_agent ?? null);
  const prox = conta.proximo_evento;
  const faltam = prox ? diasAte(prox.data, agora) : null;
  const idade = diasDesde(conta.criada_em, agora) ?? 0;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Secao titulo="Cadastro">
        <Fatos
          linhas={[
            { rotulo: "Criada em", valor: `${diaEHoraBR(conta.criada_em)} (${idade === 0 ? "hoje" : `há ${plural(idade, "dia", "dias")}`})` },
            { rotulo: "Veio de", valor: [canalDaConta(conta), aparelho ? `pelo ${aparelho}` : null].filter(Boolean).join(" · ") },
            ...(conta.origem?.utm_campaign ? [{ rotulo: "Campanha", valor: <span className="font-mono text-[12px]">{conta.origem.utm_campaign}</span> }] : []),
            ...(conta.dona.eventos_3_meses
              ? [{ rotulo: "Disse que tem", valor: descreverEventos3Meses(conta.dona.eventos_3_meses) ?? conta.dona.eventos_3_meses }]
              : []),
            { rotulo: "Eventos em", valor: cidades.length ? cidades.join(", ") : "—" },
            {
              rotulo: "Guia",
              valor: conta.dona.guia_concluido_em
                ? `concluiu em ${dataBR(conta.dona.guia_concluido_em)}`
                : conta.dona.guia_dispensado_em
                  ? `pulou em ${dataBR(conta.dona.guia_dispensado_em)}`
                  : "em andamento",
            },
            { rotulo: "WhatsApp", valor: conta.dona.whatsapp || "não preencheu" },
          ]}
        />
      </Secao>

      <Secao titulo="Passos" nota="Os do guia do primeiro acesso, e o que vem depois. Contexto e andamento não guardam data.">
        <ol className="flex flex-col gap-1.5 text-[13px]">
          {passos.map((p) => (
            <li key={p.chave} className="flex items-center gap-2">
              {p.feito ? (
                <Check size={15} aria-label="feito" className="shrink-0 text-[#6e3f5f]" />
              ) : (
                <Minus size={15} aria-label="ainda não" className="shrink-0 text-[#b0b1b0]" />
              )}
              <span className={p.feito ? "text-[#1c1d21]" : "text-[#84858b]"}>{p.rotulo}</span>
              {p.em && <span className="text-[12px] text-[#84858b]">· {dataBR(p.em)}</span>}
              {/* o carrinho abandonado: até onde ela foi antes de parar */}
              {p.chave === "assinou" && !p.feito && conta.checkout && (
                <span className="text-[12px] text-[#6e3f5f]">
                  ·{" "}
                  {conta.checkout.etapa === "planos"
                    ? `viu os planos em ${dataBR(conta.checkout.dia)}`
                    : conta.checkout.etapa === "nao_passou"
                      ? `tentou pagar em ${dataBR(conta.checkout.dia)} e não passou`
                      : `parou em ${ROTULO_DA_ETAPA[conta.checkout.etapa]} em ${dataBR(conta.checkout.dia)}`}
                </span>
              )}
            </li>
          ))}
        </ol>
      </Secao>

      <Secao titulo="Números">
        <Fatos
          linhas={[
            {
              rotulo: "Eventos",
              valor: conta.eventos.total
                ? `${conta.eventos.total} no total · ${conta.eventos.em_andamento} em andamento · ${conta.eventos.concluidos} ${conta.eventos.concluidos === 1 ? "concluído" : "concluídos"}`
                : "nenhum",
            },
            {
              rotulo: "Próximo evento",
              valor: prox
                ? `${tipoDoEvento(prox.tipo)} · ${dataBR(prox.data)}${prox.cidade ? ` · ${prox.cidade}` : ""}${faltam !== null ? ` (${faltam === 0 ? "hoje" : `em ${plural(faltam, "dia", "dias")}`})` : ""}`
                : "nenhum marcado",
            },
            { rotulo: "Decisões", valor: `${conta.decisoes.tomadas} tomadas` },
            { rotulo: "Tarefas", valor: `${conta.tarefas.total} no total · ${conta.tarefas.de_decisao} nascidas de decisões` },
            { rotulo: "Fornecedores", valor: `${conta.fornecedores.total} cadastrados · ${conta.fornecedores.vinculos} vínculos com eventos · ${conta.fornecedores.responderam} responderam pelo link` },
            { rotulo: "Clientes", valor: String(conta.clientes) },
            { rotulo: "Convidados", valor: `${conta.convidados} nomes na lista${conta.eventos.convidados_previstos ? ` (${conta.eventos.convidados_previstos} previstos)` : ""}` },
            { rotulo: "Propostas", valor: `${conta.propostas.total} criadas · ${conta.propostas.enviadas} enviadas · ${conta.propostas.aceitas} aceitas` },
            { rotulo: "Dias com ação", valor: `${conta.acoes.dias_7} nos últimos 7 · ${conta.acoes.dias_30} nos últimos 30` },
            {
              rotulo: "Uso do sistema",
              valor: conta.acesso.dias_total
                ? `${conta.acesso.dias_7} dias e ${minutosEmTexto(conta.acesso.minutos_7)} em 7 dias · ${conta.acesso.dias_30} dias e ${minutosEmTexto(conta.acesso.minutos_30)} em 30`
                : "sem registro (o uso por tela é registrado desde 16/09/2026)",
            },
          ]}
        />
      </Secao>

      <Secao titulo="Equipe" nota="Sem nomes: cargo e último login de cada pessoa.">
        {(conta.equipe.cargos ?? []).length === 0 ? (
          <Vazio>Sem pessoas vinculadas.</Vazio>
        ) : (
          <ul className="flex flex-col gap-1 text-[13px] text-[#3d3e44]">
            {(conta.equipe.cargos ?? []).map((p, i) => (
              <li key={i}>
                {p.dona ? "Responsável" : p.cargo ?? "pessoa"}
                {p.status !== "ativo" ? ` (${p.status})` : ""}
                <span className="text-[#84858b]"> · último login {p.ultimo_login ? diaEHoraBR(p.ultimo_login) : "nunca"}</span>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}
