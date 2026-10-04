"use client";

// Um capítulo do planejamento da noiva (04/10/2026): a capa (foto ou o tom
// do capítulo), e as decisões de cada assunto como uma lista simples —
// tocar abre as perguntas, "Feito" fecha.
// O link de "Agora" chega com #d-<id>: aquela decisão já abre.

import { useEffect, useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CapituloDaNoiva, DecisaoDaNoiva } from "@/lib/supabase/portal-planejamento";
import { mudarDecisaoDaNoiva } from "@/app/(portal)/portal/[eventoId]/planejamento/actions";
import { usePortalNoivos } from "../../contexto";
import { CampoDaDecisao } from "./CampoDaDecisao";
import "./planejamento.css";

function ItemDecisao({
  decisao,
  aberto,
  alternar,
  fornecedores,
}: {
  decisao: DecisaoDaNoiva;
  aberto: boolean;
  alternar: () => void;
  fornecedores: { id: string; nome: string }[];
}) {
  const { eventoId, avisar } = usePortalNoivos();
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const feita = decisao.estado === "decidida";
  const fora = decisao.estado === "nao_se_aplica";

  function mudar(estado: "pendente" | "decidida" | "nao_se_aplica", aviso: string) {
    iniciar(async () => {
      const r = await mudarDecisaoDaNoiva(eventoId, decisao.id, estado);
      if ("error" in r) {
        avisar(r.error, true);
        return;
      }
      avisar(aviso);
      router.refresh();
    });
  }

  const quando = feita ? "Feito" : fora ? "Não vamos ter" : decisao.prazo;
  return (
    <li id={`d-${decisao.id}`} className={`pn-plan-dec${feita ? " feita" : ""}${fora ? " fora" : ""}${aberto ? " aberta" : ""}`}>
      <div className="pn-plan-dec-linha">
        {fora ? (
          // fora do planejamento: volta pelo "Voltar a ter", lá dentro
          <span className="pn-plan-marca so-leitura" aria-hidden="true" />
        ) : (
          <button
            type="button"
            className="pn-plan-marca"
            aria-label={feita ? `Reabrir: ${decisao.titulo}` : `Marcar como feito: ${decisao.titulo}`}
            disabled={enviando}
            onClick={() => mudar(feita ? "pendente" : "decidida", feita ? "Reaberto" : "Feito")}
          >
            {feita && (
              <span className="pn-ic" aria-hidden="true">
                check
              </span>
            )}
          </button>
        )}
        <button type="button" className="pn-plan-dec-abrir" aria-expanded={aberto} onClick={alternar}>
          <span className="tit">{decisao.titulo}</span>
          {quando && <span className={`pn-plan-quando${feita ? " ok" : fora || !decisao.perto ? " longe" : ""}`}>{quando}</span>}
          <span className="pn-ic seta" aria-hidden="true">
            expand_more
          </span>
        </button>
      </div>

      {aberto && (
        <div className="pn-plan-dec-corpo">
          {decisao.descricao && <p className="pn-plan-desc">{decisao.descricao}</p>}
          {decisao.campos.map((c) => (
            <CampoDaDecisao key={c.id} campo={c} podeEditar={!fora} fornecedores={fornecedores} />
          ))}
          <div className="pn-plan-acoes">
            {decisao.estado === "pendente" && (
              <>
                <button type="button" className="pn-btn" disabled={enviando} onClick={() => mudar("decidida", "Feito")}>
                  Feito
                </button>
                <button type="button" className="pn-plan-link" disabled={enviando} onClick={() => mudar("nao_se_aplica", "Fora do planejamento")}>
                  Não vamos ter isso
                </button>
              </>
            )}
            {decisao.estado !== "pendente" && (
              <button type="button" className="pn-plan-link" disabled={enviando} onClick={() => mudar("pendente", "Reaberto")}>
                {fora ? "Voltar a ter" : "Reabrir"}
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function TelaCapitulo({
  capitulo,
  fornecedores,
}: {
  capitulo: CapituloDaNoiva;
  fornecedores: { id: string; nome: string }[];
}) {
  const { base } = usePortalNoivos();
  const [aberta, setAberta] = useState<string | null>(null);

  // vindo de "Agora": abre a decisão do endereço e leva a tela até ela
  useEffect(() => {
    const id = /^#d-([0-9a-f-]{36})$/i.exec(window.location.hash)?.[1];
    if (!id) return;
    setAberta(id);
    requestAnimationFrame(() => document.getElementById(`d-${id}`)?.scrollIntoView({ block: "center" }));
  }, []);

  return (
    <section id="capitulo" className="pn-plan pn-plan-capitulo" aria-labelledby="pn-plan-cap-titulo">
      <Link href={`${base}/planejamento#planejamento`} className="pn-plan-voltar">
        <span className="pn-ic" aria-hidden="true">
          arrow_back
        </span>
        Planejamento
      </Link>

      <div className="pn-plan-capa" style={{ "--tom": capitulo.tom } as CSSProperties}>
        {capitulo.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capitulo.foto} alt="" />
        ) : (
          <span className="pn-ic pn-plan-capa-icone" aria-hidden="true">
            {capitulo.icone}
          </span>
        )}
        <div className="pn-plan-capa-texto">
          <h1 id="pn-plan-cap-titulo" className="pn-t">
            {capitulo.nome}
          </h1>
          <p>{capitulo.sub}</p>
          {capitulo.total > 0 && (
            <p className="conta">{capitulo.feitas === capitulo.total ? "Tudo feito" : `${capitulo.feitas} de ${capitulo.total} feitas`}</p>
          )}
        </div>
      </div>

      {capitulo.assuntos.map((a) => (
        <div key={a.id} className="pn-plan-assunto">
          {capitulo.assuntos.length > 1 && <h2 className="pn-plan-rotulo">{a.nome}</h2>}
          <ul className="pn-plan-decisoes">
            {a.decisoes.map((d) => (
              <ItemDecisao
                key={d.id}
                decisao={d}
                aberto={aberta === d.id}
                alternar={() => setAberta((x) => (x === d.id ? null : d.id))}
                fornecedores={fornecedores}
              />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
