// Sistema — a saúde do que sustenta o produto.
//
// Duas fontes, sempre separadas na tela:
//   · o que NÓS registramos: rotinas diárias, e-mails, avisos da
//     operadora, erros, uso da IA, tamanho do banco e dos arquivos;
//   · o que o PROVEDOR publica na página de status dele — que é a
//     situação GERAL do serviço, não a do nosso projeto.
//
// O que não dá para saber daqui fica escrito na tela, em vez de virar um
// número inventado: tempo de resposta e uso da Vercel ficam no painel
// dela, e os erros que nunca chegam à tela nem ao código não aparecem.

import Link from "next/link";
import {
  AlertTriangle,
  Brain,
  Database,
  Mail,
  Repeat,
  ServerCog,
  Wallet,
} from "lucide-react";
import {
  getEnvios,
  getErros,
  getExecucoes,
  getLogDaOperadora,
  getMedidas,
  getNomesDasContas,
  getSituacaoDosProvedores,
  getTamanhoDoBanco,
  getUsoDaIa,
} from "@/lib/supabase/admin-sistema";
import { getAjustes } from "@/lib/supabase/admin-receita";
import { getMedicaoDeAnuncio } from "@/lib/supabase/admin-medicao";
import { bytesEmTexto, diaEHoraBR, diaMesBR, plural, porcento } from "@/lib/admin/formatos";
import { hojeBR, somarDias } from "@/lib/tempo";
import { Abas, Aviso, Barra, Cabecalho, Fatos, Numero, Secao, Vazio } from "@/components/admin/pecas";

export const dynamic = "force-dynamic";

const MONO = "var(--font-mono), ui-monospace, monospace";

type AbaDoSistema = "resumo" | "rotinas" | "emails" | "operadora" | "banco" | "erros" | "ia";
const ABAS: AbaDoSistema[] = ["resumo", "rotinas", "emails", "operadora", "banco", "erros", "ia"];

const SITUACAO_EM_PALAVRAS: Record<string, string> = {
  operacional: "operacional",
  atencao: "instável",
  fora: "fora do ar",
};

function horas(iso: string, agora: Date): number {
  return (agora.getTime() - new Date(iso).getTime()) / 3_600_000;
}

export default async function AdminSistemaPage({
  searchParams,
}: {
  searchParams?: { aba?: string };
}) {
  const agora = new Date();
  const hoje = hojeBR(agora);
  const pedida = String(searchParams?.aba ?? "resumo");
  const aba: AbaDoSistema = ABAS.includes(pedida as AbaDoSistema) ? (pedida as AbaDoSistema) : "resumo";

  const desde30 = new Date(agora.getTime() - 30 * 86_400_000).toISOString();
  const [rotinas, envios, erros, banco, medidas, ia, provedores, ajustes, nomes, operadora, medicao] = await Promise.all([
    getExecucoes(300),
    getEnvios(desde30),
    getErros(desde30),
    getTamanhoDoBanco(),
    getMedidas(90),
    getUsoDaIa(somarDias(hoje, -30)),
    getSituacaoDosProvedores(),
    getAjustes(),
    getNomesDasContas(),
    aba === "operadora" || aba === "resumo" ? getLogDaOperadora() : Promise.resolve([]),
    aba === "resumo" ? getMedicaoDeAnuncio() : Promise.resolve(null),
  ]);

  const rotinasPorNome = new Map<string, typeof rotinas.execucoes>();
  for (const e of rotinas.execucoes) {
    rotinasPorNome.set(e.rotina, [...(rotinasPorNome.get(e.rotina) ?? []), e]);
  }
  const rotinasFalhando = [...rotinasPorNome.entries()].filter(([, lista]) => !lista[0]?.ok);
  const enviosOk = envios.envios.filter((e) => e.ok);
  const enviosFalha = envios.envios.filter((e) => !e.ok);
  const enviosMes = envios.envios.filter((e) => e.em.slice(0, 7) === hoje.slice(0, 7));
  const errosRecentes = erros.erros.filter((e) => horas(e.em, agora) <= 24);
  const avisosComFalha = operadora.filter((l) => !l.ok && horas(l.quando, agora) <= 7 * 24);
  const iaHoje = ia.uso.filter((u) => u.dia === hoje);
  const iaMes = ia.uso.filter((u) => u.dia.slice(0, 7) === hoje.slice(0, 7));
  const soma = (lista: typeof ia.uso, campo: "chamadas" | "falhas" | "tokensEntrada" | "tokensSaida") =>
    lista.reduce((s, u) => s + u[campo], 0);

  const limiteBanco = ajustes.supabaseBancoMb ? ajustes.supabaseBancoMb * 1024 * 1024 : null;
  const limiteArquivos = ajustes.supabaseArquivosMb ? ajustes.supabaseArquivosMb * 1024 * 1024 : null;
  const arquivosBytes = banco?.baldes.reduce((s, b) => s + b.bytes, 0) ?? 0;
  const medidaAntiga = medidas[0] ?? null;
  const href = (a: AbaDoSistema) => (a === "resumo" ? "/admin/sistema" : `/admin/sistema?aba=${a}`);

  return (
    <div data-adm-secao="sistema" className="flex flex-col gap-4">
      <Cabecalho
        titulo="Sistema"
        linha="O que o sistema registra, e o que cada provedor publica. Tempo de resposta e uso da Vercel ficam no painel dela: o plano Hobby não exporta esses números."
      />

      <Abas
        rotulo="Partes do sistema"
        atual={aba}
        abas={[
          { chave: "resumo", rotulo: "Resumo", href: href("resumo"), Icone: ServerCog },
          { chave: "rotinas", rotulo: "Rotinas", href: href("rotinas"), Icone: Repeat, contagem: rotinasFalhando.length || undefined },
          { chave: "emails", rotulo: "E-mails", href: href("emails"), Icone: Mail, contagem: enviosFalha.length || undefined },
          { chave: "operadora", rotulo: "Operadora", href: href("operadora"), Icone: Wallet },
          { chave: "banco", rotulo: "Banco e arquivos", href: href("banco"), Icone: Database },
          { chave: "erros", rotulo: "Erros", href: href("erros"), Icone: AlertTriangle, contagem: errosRecentes.length || undefined },
          { chave: "ia", rotulo: "IA", href: href("ia"), Icone: Brain },
        ]}
      />

      {aba === "resumo" && (
        <>
          <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <Numero
              rotulo="Rotinas falhando"
              valor={String(rotinasFalhando.length)}
              destaque={rotinasFalhando.length > 0}
              legenda={rotinas.tabela ? (rotinasFalhando.length ? rotinasFalhando.map(([n]) => n).join(", ") : "a última execução de cada rotina deu certo") : "sem registro ainda"}
              href={href("rotinas")}
            />
            <Numero
              rotulo="E-mails com falha (30 dias)"
              valor={String(enviosFalha.length)}
              destaque={enviosFalha.length > 0}
              legenda={`${enviosOk.length} sairam sem erro`}
              href={href("emails")}
            />
            <Numero
              rotulo="Erros em 24 h"
              valor={String(errosRecentes.length)}
              destaque={errosRecentes.length > 0}
              legenda={`${erros.erros.length} nos últimos 30 dias`}
              href={href("erros")}
            />
            <Numero
              rotulo="Banco"
              valor={bytesEmTexto(banco?.bancoBytes ?? null)}
              legenda={
                limiteBanco
                  ? `${porcento(banco?.bancoBytes ?? 0, limiteBanco)} do limite que você informou`
                  : "informe o limite do seu plano em Ajustes"
              }
              href={href("banco")}
            />
          </section>

          <Secao titulo="Serviços" nota="A situação geral vem da página de status pública de cada provedor. Os erros são os nossos.">
            <ul className="flex flex-col gap-2">
              {provedores.map((p) => {
                const meus =
                  p.servico === "Resend"
                    ? `${enviosFalha.length} falha${enviosFalha.length === 1 ? "" : "s"} de envio em 30 dias`
                    : p.servico === "Pagar.me"
                      ? `${avisosComFalha.length} falha${avisosComFalha.length === 1 ? "" : "s"} nos avisos em 7 dias`
                      : p.servico.startsWith("Groq")
                        ? `${soma(iaMes, "falhas")} falhas da IA no mês`
                        : p.servico === "Supabase"
                          ? `banco em ${bytesEmTexto(banco?.bancoBytes ?? null)}`
                          : p.servico === "Vercel"
                            ? "uso e limites ficam no painel da Vercel"
                            : "sem registro nosso";
                return (
                  <li key={p.servico} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-[#f0f0ec] pb-1.5 text-[13px] last:border-0">
                    <span className="font-medium text-[#1c1d21]">{p.servico}</span>
                    <span className="text-[#5c5d63]">{meus}</span>
                    <span className={p.situacao === "fora" ? "text-red-700" : p.situacao === "atencao" ? "text-[#6e3f5f]" : "text-[#84858b]"}>
                      {p.situacao ? SITUACAO_EM_PALAVRAS[p.situacao] : "sem consulta automática"}
                      {p.pagina && (
                        <>
                          {" · "}
                          <a href={p.pagina} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                            status
                          </a>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11.5px] leading-snug text-[#84858b]">
              A Meta não publica uma situação que se possa consultar automaticamente; o link abre a página dela.
            </p>
          </Secao>

          {medicao && (
            <Secao
              titulo="Medição de anúncio"
              nota="Sem uma destas chaves o sistema segue funcionando, mas a plataforma deixa de ver aquele fato. Os valores secretos nunca aparecem aqui."
            >
              <ul className="flex flex-col gap-2">
                {medicao.itens.map((m) => (
                  <li
                    key={m.nome}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-[#f0f0ec] pb-1.5 text-[13px] last:border-0"
                  >
                    <span className="font-medium text-[#1c1d21]">{m.nome}</span>
                    <span className="text-[#5c5d63]">{m.para}</span>
                    <span className={m.ok ? "text-[#84858b]" : "font-medium text-red-700"}>
                      {m.ok ? (m.valor ? `configurada · ${m.valor}` : "configurada") : "falta configurar"}
                    </span>
                  </li>
                ))}
              </ul>
              {medicao.comOrigem > 0 && (
                <p className="mt-2 text-[11.5px] leading-snug text-[#84858b]">
                  Das {medicao.comOrigem} contas mais recentes, {medicao.comIdDoGoogle} guardaram o id do Google — sem ele, a
                  venda daquela conta não volta ao anúncio do Google.
                </p>
              )}
            </Secao>
          )}
        </>
      )}

      {aba === "rotinas" && (
        <Secao titulo="Rotinas diárias" nota="Uma linha por execução, com o que a rotina devolveu em números.">
          {!rotinas.tabela ? (
            <Aviso>Reaplique a migração 123 para registrar as rotinas.</Aviso>
          ) : rotinas.execucoes.length === 0 ? (
            <Vazio>Nenhuma execução registrada ainda. A próxima rodada do despachante diário começa a preencher.</Vazio>
          ) : (
            <>
              <div className="mb-3 flex flex-col gap-1 text-[13px]">
                {[...rotinasPorNome.entries()].map(([nome, lista]) => {
                  const falhas = lista.filter((e) => !e.ok).length;
                  return (
                    <div key={nome} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-[#f0f0ec] pb-1 last:border-0">
                      <span className="font-medium text-[#1c1d21]">{nome}</span>
                      <span className={lista[0].ok ? "text-[#5c5d63]" : "text-red-700"}>
                        última em {diaEHoraBR(lista[0].inicio)} · {lista[0].ok ? "ok" : "falhou"}
                        {lista[0].duracaoMs != null && ` · ${(lista[0].duracaoMs / 1000).toFixed(1)} s`}
                      </span>
                      <span className="text-[12px] text-[#84858b]">{falhas ? `${falhas} falhas em ${lista.length}` : `${lista.length} execuções sem falha`}</span>
                    </div>
                  );
                })}
              </div>
              <ul className="flex flex-col gap-0.5 text-[12.5px]">
                {rotinas.execucoes.slice(0, 60).map((e, i) => (
                  <li key={i} className={e.ok ? "text-[#5c5d63]" : "text-red-700"}>
                    <span className="text-[#84858b]">{diaEHoraBR(e.inicio)}</span> · {e.rotina} · {e.ok ? "ok" : "falhou"}
                    {e.resumo ? ` · ${e.resumo}` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Secao>
      )}

      {aba === "emails" && (
        <Secao
          titulo="E-mails"
          nota="Sem destinatário e sem assunto: só o tipo, se saiu e o que o provedor disse depois. 'Entregue' é o provedor dela ter aceitado — não é leitura."
        >
          {!envios.tabela ? (
            <Aviso>Reaplique a migração 123 para registrar os e-mails.</Aviso>
          ) : envios.envios.length === 0 ? (
            <Vazio>Nenhum e-mail registrado nos últimos 30 dias.</Vazio>
          ) : (
            <>
              <p className="mb-2 text-[13px] text-[#3d3e44]">
                {plural(enviosMes.length, "envio neste mês", "envios neste mês")}
                {ajustes.resendEmailsMes
                  ? ` · ${porcento(enviosMes.length, ajustes.resendEmailsMes)} do limite mensal que você informou`
                  : " · informe o limite do plano do Resend em Ajustes"}
              </p>
              <ul className="flex flex-col gap-0.5 text-[12.5px]">
                {envios.envios.slice(0, 120).map((e) => (
                  <li key={e.id} className={e.ok ? "text-[#3d3e44]" : "text-red-700"}>
                    <span className="text-[#84858b]">{diaEHoraBR(e.em)}</span> · {e.tipo} ·{" "}
                    {e.ok ? e.situacao ?? "enviado" : `não saiu (${e.erro ?? "erro"})`}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Secao>
      )}

      {aba === "operadora" && (
        <Secao titulo="Operadora" nota="Tudo o que saiu para a Pagar.me e tudo o que voltou. Nenhum segredo: a chave não é registrada e o cartão nunca passa por aqui.">
          {operadora.length === 0 ? (
            <Vazio>Nada registrado ainda.</Vazio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#dededa] text-left text-[10.5px] uppercase tracking-[0.08em] text-[#84858b]" style={{ fontFamily: MONO }}>
                    <th className="px-2 py-2 font-medium">Quando</th>
                    <th className="px-2 py-2 font-medium">Direção</th>
                    <th className="px-2 py-2 font-medium">O quê</th>
                    <th className="px-2 py-2 font-medium">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {operadora.slice(0, 120).map((l, i) => (
                    <tr key={i} className={`border-b border-[#f0f0ec] align-top ${l.ok ? "" : "bg-[#fbf6f6]"}`}>
                      <td className="whitespace-nowrap px-2 py-2 text-[#5c5d63]" style={{ fontFamily: MONO }}>
                        {diaEHoraBR(l.quando)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-[#5c5d63]">{l.direcao === "enviado" ? "→ enviado" : "← aviso"}</td>
                      <td className="px-2 py-2 font-medium text-[#1c1d21]">
                        {l.titulo}
                        {l.duracao && <span className="ml-2 text-[11.5px] font-normal text-[#84858b]">{l.duracao}</span>}
                      </td>
                      <td className="px-2 py-2">
                        {l.ok ? <span className="text-[#5c5d63]">ok</span> : <span className="font-medium text-red-700">falhou</span>}
                        {l.detalhe && (
                          <pre className="mt-1 max-w-xl whitespace-pre-wrap break-words rounded bg-[#f4f4f2] px-2 py-1 text-[11.5px] text-[#3d3e44]" style={{ fontFamily: MONO }}>
                            {l.detalhe}
                          </pre>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Secao>
      )}

      {aba === "banco" && (
        <>
          <Secao titulo="Banco e arquivos" nota="Medido dentro do banco, uma vez por dia pela rotina. O tráfego de saída não se mede daqui.">
            {!banco ? (
              <Aviso>Reaplique a migração 123 para medir o banco.</Aviso>
            ) : (
              <>
                <Fatos
                  linhas={[
                    {
                      rotulo: "Banco",
                      valor: (
                        <>
                          {bytesEmTexto(banco.bancoBytes)}
                          {limiteBanco && (
                            <>
                              {" de "}
                              {bytesEmTexto(limiteBanco)} · {porcento(banco.bancoBytes, limiteBanco)}
                              <span className="mt-1 block max-w-[280px]">
                                <Barra fracao={banco.bancoBytes / limiteBanco} forte />
                              </span>
                            </>
                          )}
                        </>
                      ),
                    },
                    {
                      rotulo: "Arquivos",
                      valor: (
                        <>
                          {bytesEmTexto(arquivosBytes)}
                          {limiteArquivos && ` de ${bytesEmTexto(limiteArquivos)} · ${porcento(arquivosBytes, limiteArquivos)}`}
                        </>
                      ),
                    },
                    ...(medidaAntiga
                      ? [
                          {
                            rotulo: "Crescimento",
                            valor: `${bytesEmTexto(banco.bancoBytes - medidaAntiga.bancoBytes)} desde ${diaMesBR(medidaAntiga.dia)}`,
                          },
                        ]
                      : []),
                  ]}
                />
                <p className="mt-3 text-[12.5px] font-semibold text-[#1c1d21]">Pastas de arquivos</p>
                <ul className="mt-1 flex flex-col gap-0.5 text-[12.5px] text-[#3d3e44]">
                  {banco.baldes.map((b) => (
                    <li key={b.balde}>
                      {b.balde} · {bytesEmTexto(b.bytes)} · {plural(b.arquivos, "arquivo", "arquivos")}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[12.5px] font-semibold text-[#1c1d21]">Maiores tabelas</p>
                <ul className="mt-1 flex flex-col gap-0.5 text-[12.5px] text-[#3d3e44]">
                  {banco.tabelas.map((t) => (
                    <li key={t.tabela}>
                      {t.tabela} · {bytesEmTexto(t.bytes)} · cerca de {t.linhas.toLocaleString("pt-BR")} linhas
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Secao>
          {medidas.length > 1 && (
            <Secao titulo="Crescimento por dia" nota="Uma medida por dia, guardada pela rotina diária.">
              <ul className="flex flex-col gap-0.5 text-[12.5px] text-[#3d3e44]" style={{ fontFamily: MONO }}>
                {medidas
                  .slice(-14)
                  .reverse()
                  .map((m) => (
                    <li key={m.dia}>
                      {diaMesBR(m.dia)} · banco {bytesEmTexto(m.bancoBytes)} · arquivos {bytesEmTexto(m.arquivosBytes)}
                    </li>
                  ))}
              </ul>
            </Secao>
          )}
        </>
      )}

      {aba === "erros" && (
        <Secao
          titulo="Erros"
          nota="Os que chegaram à tela de alguém da equipe e os que as rotas registram. Nunca a mensagem: só a área e o código. Esta lista nunca é completa — é o que o sistema consegue ver."
        >
          {!erros.tabela ? (
            <Aviso>Reaplique a migração 123 para registrar os erros.</Aviso>
          ) : erros.erros.length === 0 ? (
            <Vazio>Nenhum erro registrado nos últimos 30 dias.</Vazio>
          ) : (
            <>
              <p className="mb-2 text-[13px] text-[#3d3e44]">
                {plural(errosRecentes.length, "erro nas últimas 24 h", "erros nas últimas 24 h")} ·{" "}
                {plural(erros.erros.length, "erro em 30 dias", "erros em 30 dias")}
              </p>
              <ul className="flex flex-col gap-0.5 text-[12.5px]">
                {erros.erros.slice(0, 120).map((e, i) => (
                  <li key={i} className="text-[#3d3e44]">
                    <span className="text-[#84858b]">{diaEHoraBR(e.em)}</span> · {e.origem === "tela" ? "tela" : "servidor"} · {e.area}
                    {e.codigo ? ` · ${e.codigo}` : ""}
                    {e.empresaId && (
                      <>
                        {" · "}
                        <Link href={`/admin/contas/${e.empresaId}`} className="underline underline-offset-2">
                          {nomes.get(e.empresaId) ?? "conta"}
                        </Link>
                        {e.daCasa && <span className="text-[#84858b]"> (conta da casa)</span>}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Secao>
      )}

      {aba === "ia" && (
        <Secao titulo="IA" nota="Chamadas e tokens que o provedor devolve. Nada da pergunta nem da resposta é guardado.">
          {!ia.tabela ? (
            <Aviso>Reaplique a migração 123 para medir a IA.</Aviso>
          ) : ia.uso.length === 0 ? (
            <Vazio>Nenhuma chamada registrada nos últimos 30 dias.</Vazio>
          ) : (
            <>
              <Fatos
                linhas={[
                  { rotulo: "Hoje", valor: `${plural(soma(iaHoje, "chamadas"), "chamada", "chamadas")} · ${soma(iaHoje, "tokensEntrada") + soma(iaHoje, "tokensSaida")} tokens` },
                  {
                    rotulo: "Neste mês",
                    valor: `${plural(soma(iaMes, "chamadas"), "chamada", "chamadas")} · ${(soma(iaMes, "tokensEntrada") + soma(iaMes, "tokensSaida")).toLocaleString("pt-BR")} tokens · ${soma(iaMes, "falhas")} falhas`,
                  },
                ]}
              />
              <p className="mt-3 text-[12.5px] font-semibold text-[#1c1d21]">Por conta, nos últimos 30 dias</p>
              <ul className="mt-1 flex flex-col gap-0.5 text-[12.5px] text-[#3d3e44]">
                {[...new Set(ia.uso.map((u) => u.empresaId))]
                  .map((id) => ({
                    id,
                    daCasa: ia.uso.find((u) => u.empresaId === id)?.daCasa ?? false,
                    linhas: ia.uso.filter((u) => u.empresaId === id),
                  }))
                  .sort((a, b) => soma(b.linhas, "chamadas") - soma(a.linhas, "chamadas"))
                  .slice(0, 15)
                  .map((c) => (
                    <li key={c.id}>
                      <Link href={`/admin/contas/${c.id}`} className="underline underline-offset-2">
                        {nomes.get(c.id) ?? "conta"}
                      </Link>
                      {c.daCasa && <span className="text-[#84858b]"> (conta da casa)</span>} ·{" "}
                      {plural(soma(c.linhas, "chamadas"), "chamada", "chamadas")} ·{" "}
                      {(soma(c.linhas, "tokensEntrada") + soma(c.linhas, "tokensSaida")).toLocaleString("pt-BR")} tokens
                    </li>
                  ))}
              </ul>
            </>
          )}
        </Secao>
      )}
    </div>
  );
}
