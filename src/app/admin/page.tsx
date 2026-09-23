// Visão geral — o centro de controle do dono.
//
// A pergunta da tela é "o que precisa de mim hoje". Por isso a lista de
// atenção vem antes dos números do negócio, e cada linha diz o fato e há
// quanto tempo, com o caminho para agir (a ficha da conta, o WhatsApp).
//
// As contas da casa ficam fora de tudo aqui (regra dele): elas têm a
// própria aba em Contas.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAgoraDasContas, getPortaoDoTeste, getSerieMensal } from "@/lib/supabase/admin-painel";
import { getResumoDasContas } from "@/lib/supabase/admin-contas";
import {
  GRUPOS_DE_ATENCAO,
  PASSOS,
  ativada,
  banida,
  diasAte,
  emTeste,
  motivosDeAtencao,
  pagante,
  passosDaConta,
} from "@/lib/admin/saude-da-conta";
import { hrefDaLista, lerFiltros } from "@/lib/admin/lista-de-contas";
import { diaPorExtenso, mesPorExtenso, plural, porcento, reais } from "@/lib/admin/formatos";
import { contarDatasNoMes, metrica, rotuloMesAno, variacaoEmTexto, variacaoPct } from "@/lib/admin-metricas";
import { hojeBR } from "@/lib/tempo";
import { linkWhatsapp, primeiroNome } from "@/lib/whatsapp-link";
import { getCadastrosInterrompidos, type CadastroInterrompido } from "@/lib/supabase/admin-cadastro-interrompido";
import { descreverEventos3Meses } from "@/lib/cadastro-qualificacao";
import { haQuantoTempo } from "@/lib/presenca";
import { JaFalei } from "./JaFalei";
import { Aviso, Barra, Cabecalho, Numero, Secao, Vazio } from "@/components/admin/pecas";

export const dynamic = "force-dynamic";

const MONO = "var(--font-mono), ui-monospace, monospace";

export default async function AdminVisaoGeralPage() {
  const agora = new Date();
  const hoje = hojeBR(agora);
  const mes = hoje.slice(0, 7);
  const [leitura, serie, portao, agoraPor, interrompidos] = await Promise.all([
    getResumoDasContas(),
    getSerieMensal(mes, 2),
    getPortaoDoTeste(),
    getAgoraDasContas(),
    // sem a 169 aplicada, a seção some; a Visão geral nunca cai por ela
    getCadastrosInterrompidos().catch(() => ({ ok: false as const, mensagem: "" })),
  ]);

  if (!leitura.ok) {
    return (
      <div data-adm-secao="visao" className="flex flex-col gap-4">
        <Cabecalho titulo="Visão geral" />
        <Aviso>{leitura.mensagem}</Aviso>
        <p className="text-[13px] text-[#5c5d63]">
          Enquanto isso, a <Link href="/admin/receita" className="underline underline-offset-2">Receita</Link> e as{" "}
          <Link href="/admin/contas" className="underline underline-offset-2">Contas</Link> continuam abrindo.
        </p>
      </div>
    );
  }

  const todas = leitura.dados;
  const clientes = todas.filter((c) => !c.da_casa);
  const daCasa = todas.length - clientes.length;
  const m = serie.meses[serie.meses.length - 1];
  const mesPassado = serie.meses[0];

  const emTesteAgora = clientes.filter((c) => emTeste(c) && !banida(c, agora));
  const acabandoEm48h = emTesteAgora.filter((c) => {
    const f = diasAte(c.assinatura?.teste_termina_em, agora);
    return f !== null && f >= 0 && f <= 2;
  });
  const pagantes = clientes.filter((c) => pagante(c) && !banida(c, agora));
  const ativadas = clientes.filter((c) => ativada(c));
  const comAtencao = clientes
    .map((c) => ({ conta: c, motivos: motivosDeAtencao(c, agora) }))
    .filter((x) => x.motivos.length > 0);
  const aoVivo = clientes.filter((c) => agoraPor[c.empresa_id]?.aoVivo);

  // o funil, resumido: cada passo conta quantas contas chegaram nele
  const passosDoFunil = ["criou_evento", "decidiu", "tarefa_nasceu", "compartilhou", "assinou"] as const;
  const feitosPorConta = clientes.map((c) => passosDaConta(c));
  const funil = passosDoFunil.map((chave) => ({
    chave,
    rotulo: PASSOS.find((p) => p.chave === chave)?.rotulo ?? chave,
    quantas: feitosPorConta.filter((passos) => passos.find((p) => p.chave === chave)?.feito).length,
  }));

  // o movimento do mês, do jeito que o dono pergunta
  const criadasNoMes = contarDatasNoMes(serie.criadasEm, mes);
  const criadasNoMesPassado = contarDatasNoMes(serie.criadasEm, mesPassado.mes);
  const testesIniciados = clientes.filter(
    (c) => c.assinatura?.teste_ia_ate && (c.assinatura.created_at ?? c.criada_em).slice(0, 7) === mes
  ).length;
  const convertidasNoMes = clientes.filter((c) => c.historico.convertida_em?.slice(0, 7) === mes).length;
  const encerradosNoMes = clientes.filter((c) => {
    const a = c.assinatura;
    if (!a?.teste_ia_ate) return false;
    if (c.historico.convertida_em?.slice(0, 7) === mes) return true;
    return a.teste_ia_ate.slice(0, 7) === mes && a.teste_ia_ate < hoje && !c.historico.convertida_em;
  }).length;

  const f = lerFiltros({});
  const linkDaAtencao = (chave: string) => hrefDaLista(f, { situacao: "todas", atencao: chave as never });

  return (
    <div data-adm-secao="visao" className="flex flex-col gap-[22px]">
      <Cabecalho
        titulo="Visão geral"
        linha={
          <>
            {diaPorExtenso(hoje)} · {plural(clientes.length, "conta de cliente", "contas de clientes")}
            {daCasa > 0 && ` · ${plural(daCasa, "conta da casa", "contas da casa")}, fora de todos os números`}
            {aoVivo.length > 0 && (
              <span className="block">
                {plural(aoVivo.length, "conta de cliente", "contas de clientes")} no sistema agora:{" "}
                {aoVivo.map((c) => `${c.nome} (${agoraPor[c.empresa_id]?.area})`).join(", ")}
              </span>
            )}
          </>
        }
        lado={
          portao ? (
            <Link
              href="/admin/ajustes"
              className="rounded-md border border-[#d3d3cf] bg-white px-3 py-[7px] text-[12px] font-medium text-[#3d3e44] hover:border-[#9a9ba1]"
            >
              Teste grátis: {portao.aberto ? `aberto · ${portao.dias} dias` : "fechado"} · mudar
            </Link>
          ) : null
        }
      />

      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <Numero
          rotulo="Precisam de atenção"
          valor={String(comAtencao.length)}
          destaque={comAtencao.length > 0}
          legenda={comAtencao.length === 0 ? "nenhuma conta pedindo ação hoje" : "contas com pelo menos um motivo"}
          href={hrefDaLista(f, { situacao: "atencao" })}
        />
        <Numero
          rotulo="Em teste"
          valor={String(emTesteAgora.length)}
          legenda={
            acabandoEm48h.length > 0
              ? `${plural(acabandoEm48h.length, "acaba", "acabam")} em até 2 dias`
              : "nenhum teste acabando nos próximos 2 dias"
          }
          href={hrefDaLista(f, { situacao: "teste" })}
        />
        <Numero
          rotulo="Pagantes"
          valor={String(pagantes.length)}
          legenda={
            <>
              MRR {metrica(m.mrr, "R$ ")}
              {" · "}
              {variacaoPct(mesPassado.mrr, m.mrr) === null
                ? `sem MRR em ${rotuloMesAno(mesPassado.mes)} para comparar`
                : `${variacaoEmTexto(variacaoPct(mesPassado.mrr, m.mrr))} vs ${rotuloMesAno(mesPassado.mes)}`}
            </>
          }
          href="/admin/receita"
        />
        <Numero
          rotulo="Ativadas"
          valor={`${ativadas.length} de ${clientes.length}`}
          legenda="chegaram à tarefa que nasce de uma decisão"
          href="/admin/ativacao"
        />
      </section>

      <Secao
        titulo="Precisa de atenção"
        nota="Cada linha diz o fato e há quanto tempo. Contas da casa não entram."
        lado={comAtencao.length > 0 ? `${plural(comAtencao.length, "conta", "contas")}` : undefined}
      >
        {comAtencao.length === 0 ? (
          <Vazio>Nenhuma conta pedindo ação agora.</Vazio>
        ) : (
          <div className="flex flex-col gap-4">
            {GRUPOS_DE_ATENCAO.map((g) => {
              const doGrupo = comAtencao.filter((x) => x.motivos.some((mo) => mo.chave === g.chave));
              if (doGrupo.length === 0) return null;
              return (
                <div key={g.chave}>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#6e3f5f]">
                    {g.titulo} · {doGrupo.length}
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {doGrupo.slice(0, 5).map(({ conta, motivos }) => {
                      const wa = linkWhatsapp(conta.dona.whatsapp);
                      const motivo = motivos.find((mo) => mo.chave === g.chave)!;
                      return (
                        <li
                          key={conta.empresa_id}
                          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[#f0f0ec] pb-1.5 last:border-0"
                        >
                          <span className="min-w-0 text-[13px]">
                            <Link href={`/admin/contas/${conta.empresa_id}`} className="font-semibold text-[#1c1d21] hover:underline">
                              {conta.nome}
                            </Link>
                            <span className="text-[#5c5d63]"> — {motivo.texto}</span>
                          </span>
                          <span className="flex shrink-0 gap-2 text-[12px]">
                            {wa && (
                              <a href={wa} target="_blank" rel="noopener noreferrer" className="text-[#6e3f5f] underline underline-offset-2">
                                WhatsApp
                              </a>
                            )}
                            <Link href={`/admin/contas/${conta.empresa_id}`} className="text-[#5c5d63] underline underline-offset-2">
                              ficha
                            </Link>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {doGrupo.length > 5 && (
                    <Link href={linkDaAtencao(g.chave)} className="mt-1 inline-flex items-center gap-1 text-[12.5px] text-[#5c5d63] underline underline-offset-2">
                      ver as {doGrupo.length} <ArrowRight size={13} aria-hidden />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Secao>

      {interrompidos.ok && (interrompidos.pendentes.length > 0 || interrompidos.falados.length > 0) && (
        <Secao
          titulo="Pararam no cartão"
          nota="Preencheram a primeira etapa do cadastro e não criaram a conta. Últimos 30 dias."
          lado={
            interrompidos.pendentes.length > 0
              ? `${interrompidos.pendentes.length} para chamar`
              : undefined
          }
        >
          <ul className="flex flex-col gap-1.5">
            {[...interrompidos.pendentes, ...interrompidos.falados].slice(0, 15).map((c) => (
              <LinhaInterrompida key={c.id} c={c} agora={agora.getTime()} />
            ))}
          </ul>
        </Secao>
      )}

      <section className="grid gap-2.5 xl:grid-cols-2">
        <Secao
          titulo="Ativação"
          nota="Quantas contas de clientes chegaram a cada passo, desde sempre."
          lado={
            <Link href="/admin/ativacao" className="underline underline-offset-2">
              ver o funil
            </Link>
          }
        >
          {clientes.length === 0 ? (
            <Vazio>Nenhuma conta de cliente ainda.</Vazio>
          ) : (
            <ul className="flex flex-col gap-2">
              <li>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-[#1c1d21]">Contas criadas</span>
                  <span style={{ fontFamily: MONO }}>{clientes.length}</span>
                </div>
                <Barra fracao={1} forte />
              </li>
              {funil.map((p) => (
                <li key={p.chave}>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-[#1c1d21]">{p.rotulo}</span>
                    <span style={{ fontFamily: MONO }}>
                      {p.quantas}
                      <span className="ml-1.5 text-[11.5px] text-[#84858b]">{porcento(p.quantas, clientes.length)}</span>
                    </span>
                  </div>
                  <Barra fracao={clientes.length ? p.quantas / clientes.length : 0} />
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo={`Movimento de ${mesPorExtenso(mes)}`} nota="Contas de clientes, no mês corrente.">
          <ul className="flex flex-col gap-1 text-[13px]">
            {[
              { rotulo: "Contas criadas", valor: criadasNoMes, antes: criadasNoMesPassado },
              { rotulo: "Testes iniciados", valor: testesIniciados, antes: null },
              { rotulo: "Testes encerrados", valor: encerradosNoMes, antes: null },
              { rotulo: "Viraram pagantes", valor: convertidasNoMes, antes: null },
              { rotulo: "Cancelamentos", valor: m.canceladasNoMes, antes: mesPassado.canceladasNoMes },
            ].map((l) => (
              <li key={l.rotulo} className="flex items-baseline justify-between gap-3">
                <span className="text-[#3d3e44]">{l.rotulo}</span>
                <span style={{ fontFamily: MONO }}>
                  {l.valor}
                  {l.antes !== null && (
                    <span className="ml-2 text-[11.5px] text-[#84858b]">
                      {rotuloMesAno(mesPassado.mes)}: {l.antes}
                    </span>
                  )}
                </span>
              </li>
            ))}
            <li className="mt-1 flex items-baseline justify-between gap-3 border-t border-[#ecece8] pt-1.5">
              <span className="font-semibold text-[#1c1d21]">Taxa de conversão do mês</span>
              <span style={{ fontFamily: MONO }}>
                {encerradosNoMes === 0 ? "—" : `${convertidasNoMes} de ${encerradosNoMes} · ${porcento(convertidasNoMes, encerradosNoMes)}`}
              </span>
            </li>
          </ul>
          <p className="mt-2 text-[11.5px] leading-snug text-[#84858b]">
            Teste encerrado é o que venceu sem assinar ou virou assinatura neste mês. Sem teste encerrado, a taxa fica em
            “—”: dividir por zero não é zero.
          </p>
          <p className="mt-3 text-[12.5px]">
            <Link href="/admin/receita" className="text-[#6e3f5f] underline underline-offset-2">
              Receita: {reais(m.mrr)} de MRR, o movimento do mês e os custos
            </Link>
          </p>
        </Secao>
      </section>
    </div>
  );
}

/** Uma pessoa que parou no cartão: quem é, quando, de onde veio, e o WhatsApp. */
function LinhaInterrompida({ c, agora }: { c: CadastroInterrompido; agora: number }) {
  const nome = primeiroNome(c.nome);
  const wa = linkWhatsapp(
    c.whatsapp,
    `Oi${nome ? `, ${nome}` : ""}! Aqui é do eOrganizei. Vi que você começou o cadastro e parou na parte do cartão. Ficou alguma dúvida?`
  );
  const anuncio = c.origem?.utm_campaign || c.origem?.utm_source || (c.origem?.gclid ? "Google Ads" : null);
  const detalhes = [
    c.negocio,
    descreverEventos3Meses(c.eventos_3_meses),
    anuncio ? `veio de ${anuncio}` : null,
    c.tentativas > 1 ? `chegou ao cartão ${c.tentativas} vezes` : null,
  ].filter(Boolean);
  return (
    <li
      className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[#f0f0ec] pb-1.5 last:border-0 ${
        c.contatado_em ? "opacity-60" : ""
      }`}
    >
      <span className="min-w-0 text-[13px]">
        <span className="font-semibold text-[#1c1d21]">{c.nome || c.email}</span>
        <span className="text-[#5c5d63]">
          {" "}
          — {haQuantoTempo(c.atualizado_em, agora)}
          {detalhes.length > 0 && ` · ${detalhes.join(" · ")}`}
          {c.contatado_em && ` · você falou ${haQuantoTempo(c.contatado_em, agora)}`}
        </span>
        <span className="block text-[12px] text-[#84858b]">{c.email}</span>
      </span>
      <span className="flex shrink-0 gap-2 text-[12px]">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="text-[#6e3f5f] underline underline-offset-2">
            WhatsApp
          </a>
        )}
        <JaFalei id={c.id} falou={Boolean(c.contatado_em)} />
      </span>
    </li>
  );
}
