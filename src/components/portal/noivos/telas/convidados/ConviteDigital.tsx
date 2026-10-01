"use client";

// O convite digital (README §10.3): os passos, o link do evento, o
// celular e "O que as respostas já contam".
//
// O celular é uma PRÉVIA do fluxo do convidado com os dados do casal (os
// nomes, a data, o local, a foto) e o primeiro nome de um convidado de
// verdade. Nada aqui grava: confirmar na prévia não entra na lista nem em
// "Chegando agora". O link é o único do evento (/confirmar/evento/<hash>).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eyebrow, Icone } from "../../primitivas";
import { usePortalNoivos } from "../../contexto";
import type { ContagemDasRespostas, DadosConvidados } from "./montar";
import { levarPedidosParaODJ } from "./acoes";

const PASSOS = [
  "Abre o convite com o nome dele",
  "Diz quem vem e o que come",
  "Pede uma música e deixa recado",
  "Recebe a confirmação",
];
// a tela do celular → o passo aceso à esquerda (4 e 5 são o "não vou")
const PASSO_DA_TELA = [0, 1, 2, 3, 0, 3];
const DIETAS = ["Nenhuma", "Vegetariana", "Vegana", "Sem glúten", "Sem lactose"];
const MAX_ACOMP = 4;
const CONFETE = Array.from({ length: 18 }, (_, k) => ({
  x: `${(k * 37) % 100}%`,
  d: `${(k * 0.13) % 1.2}s`,
  c: ["#e9ae88", "#f5f0e8", "#f6dccb", "#7f978a"][k % 4],
}));

type Tela = 0 | 1 | 2 | 3 | 4 | 5;

export function ConviteDigital({
  eventoId,
  convite,
  contagens,
  musicas,
  confirmados,
}: {
  eventoId: string;
  convite: DadosConvidados["convite"];
  contagens: ContagemDasRespostas[];
  musicas: DadosConvidados["musicas"];
  confirmados: number;
}) {
  const { avisar } = usePortalNoivos();
  const [tela, setTela] = useState<Tela>(0);
  const [acomp, setAcomp] = useState(0);
  const [dieta, setDieta] = useState<Record<string, boolean>>({ Nenhuma: true });
  const [musica, setMusica] = useState("");
  const [recado, setRecado] = useState("");

  const { casalA, casalB, nomeConvidado: quem, link } = convite;
  const ir = (t: Tela) => setTela(t);
  const escolhidas = DIETAS.filter((d) => dieta[d] && d !== "Nenhuma");
  const resumo =
    "Você" +
    (acomp ? ` + ${acomp}` : "") +
    " · " +
    (escolhidas.join(", ") || "sem restrição") +
    (musica.trim() ? ` · pediu ${musica.trim()}` : "");
  const lugares = Math.max(3, acomp + 1);

  function trocarDieta(d: string) {
    if (d === "Nenhuma") setDieta({ Nenhuma: true });
    else setDieta({ ...dieta, Nenhuma: false, [d]: !dieta[d] });
  }

  function recomecar() {
    setTela(0);
  }

  function copiar() {
    if (!link) return;
    navigator.clipboard
      ?.writeText(link)
      .then(() => avisar("Link copiado"))
      .catch(() => avisar("Não foi possível copiar o link", true));
  }

  const vaoSentir = casalA
    ? casalB
      ? `${casalA} e ${casalB} vão sentir sua falta. Quer deixar um recado para eles?`
      : `${casalA} vai sentir sua falta. Quer deixar um recado?`
    : "Os noivos vão sentir sua falta. Quer deixar um recado para eles?";
  const zap = link
    ? `https://wa.me/?text=${encodeURIComponent(`Você vem celebrar com a gente? Confirme sua presença: ${link}`)}`
    : null;

  return (
    <div className="pn-convidados-convite">
      {/* esquerda: os passos e o link */}
      <div className="esq">
        <div>
          <Eyebrow>O convite digital</Eyebrow>
          <div className="pn-t titulo">O que o convidado vê</div>
          <div className="texto">O convidado responde em menos de um minuto, sem baixar nada.</div>
        </div>
        <div className="passos">
          {PASSOS.map((l, k) => {
            const on = PASSO_DA_TELA[tela] === k;
            return (
              <button
                key={l}
                type="button"
                className={`passo${on ? " on" : ""}`}
                aria-pressed={on}
                onClick={() => ir(k as Tela)}
              >
                <span className="n">{k + 1}</span>
                <span className="l">{l}</span>
              </button>
            );
          })}
        </div>
        {link && (
          <div className="link">
            <div className="copiar">
              <span className="url">{link.replace(/^https?:\/\//, "")}</span>
              <button type="button" onClick={copiar}>
                Copiar
              </button>
            </div>
            {zap && (
              <a className="zap" href={zap} target="_blank" rel="noopener noreferrer">
                <Icone nome="send_to_mobile" tamanho={19} />
                Mandar um teste para o meu WhatsApp
              </a>
            )}
          </div>
        )}
      </div>

      {/* centro: o celular */}
      <div className="pn-convidados-celular">
        <div className="tela">
          <div className="ilha" />

          {tela === 0 && (
            <div className="t0">
              <div className="foto">
                <div className="kb">
                  {convite.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={convite.fotoUrl} alt="" />
                  ) : null}
                </div>
                <div className="veu" />
              </div>
              <div className="base">
                <div className="pn-t nomes">
                  {casalA ? (
                    <>
                      {casalA}
                      {casalB && (
                        <>
                          {" "}
                          <span className="e">&amp;</span> {casalB}
                        </>
                      )}
                    </>
                  ) : (
                    "Nosso casamento"
                  )}
                </div>
                {convite.dataCurta && <div className="data">{convite.dataCurta}</div>}
                <div className="pn-t pergunta">
                  {quem ? `Oi, ${quem}! ` : "Oi! "}Você vem celebrar com a gente?
                </div>
                <button type="button" className="sim" onClick={() => ir(1)}>
                  Sim, eu vou!
                </button>
                <button type="button" className="nao" onClick={() => ir(4)}>
                  Não vou poder
                </button>
              </div>
            </div>
          )}

          {tela === 1 && (
            <div className="passo-tela">
              <div className="prog">
                <span className="on" />
                <span />
              </div>
              <div className="pn-t h">Quem vem com você?</div>
              <div className="caixa">
                <div className="mini">Quantos vêm no seu convite</div>
                <div className="stepper">
                  <div className="voce">
                    Você + <b>{acomp}</b>
                  </div>
                  <div className="botoes">
                    <button
                      type="button"
                      className="menos"
                      aria-label="Menos um acompanhante"
                      onClick={() => setAcomp(Math.max(0, acomp - 1))}
                    >
                      <Icone nome="remove" tamanho={20} />
                    </button>
                    <button
                      type="button"
                      className="mais"
                      aria-label="Mais um acompanhante"
                      onClick={() => setAcomp(Math.min(MAX_ACOMP, acomp + 1))}
                    >
                      <Icone nome="add" tamanho={20} />
                    </button>
                  </div>
                </div>
                <div className="lugares">
                  {Array.from({ length: lugares }, (_, k) => (
                    <span key={k} className={k <= acomp ? "on" : undefined}>
                      <Icone nome="person" tamanho={18} />
                    </span>
                  ))}
                </div>
              </div>
              <div className="pergunta-2">Alguma restrição alimentar?</div>
              <div className="dietas">
                {DIETAS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={dieta[d] ? "on" : undefined}
                    aria-pressed={!!dieta[d]}
                    onClick={() => trocarDieta(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button type="button" className="seguir" onClick={() => ir(2)}>
                Continuar
              </button>
            </div>
          )}

          {tela === 2 && (
            <div className="passo-tela g12">
              <div className="prog">
                <span className="on" />
                <span className="on" />
              </div>
              <div className="pn-t h">Quase lá</div>
              <div className="rot">Uma música que não pode faltar</div>
              <div className="campo">
                <Icone nome="music_note" tamanho={20} cor="#9a5a34" />
                <input
                  value={musica}
                  onChange={(e) => setMusica(e.target.value)}
                  placeholder="Ex.: Evidências"
                  aria-label="Uma música que não pode faltar"
                  maxLength={80}
                />
              </div>
              <div className="rot mt4">Um recado para os noivos</div>
              <textarea
                value={recado}
                onChange={(e) => setRecado(e.target.value)}
                placeholder="Escreva algo carinhoso…"
                aria-label="Um recado para os noivos"
                maxLength={500}
                style={{ height: 120 }}
              />
              <button type="button" className="seguir pessego" onClick={() => ir(3)}>
                Confirmar presença
              </button>
            </div>
          )}

          {tela === 3 && (
            <div className="t3">
              {CONFETE.map((c, k) => (
                <span key={k} className="confete" style={{ left: c.x, background: c.c, animationDelay: c.d }} />
              ))}
              <div className="conteudo">
                <div className="ok">
                  <Icone nome="check" tamanho={52} />
                </div>
                <div className="pn-t ate">
                  {convite.diaMes ? `Até dia ${convite.diaMes}` : "Até o grande dia"}
                  {quem ? `, ${quem}!` : "!"}
                </div>
                <div className="resumo">{resumo}</div>
                <div className="acoes">
                  <div className="agenda">
                    <Icone nome="event" tamanho={19} />
                    Salvar na minha agenda
                  </div>
                  <div className="chegar">
                    <Icone nome="map" tamanho={19} />
                    {convite.local ? `Como chegar em ${convite.local}` : "Como chegar"}
                  </div>
                  <button type="button" className="denovo" onClick={recomecar}>
                    Testar de novo
                  </button>
                </div>
              </div>
            </div>
          )}

          {tela === 4 && (
            <div className="t4">
              <div className="pn-t h28">{quem ? `Que pena, ${quem}.` : "Que pena."}</div>
              <div className="txt">{vaoSentir}</div>
              <textarea
                value={recado}
                onChange={(e) => setRecado(e.target.value)}
                placeholder="Escreva algo carinhoso…"
                aria-label="Um recado para os noivos"
                maxLength={500}
                style={{ height: 150 }}
              />
              <button type="button" className="seguir" onClick={() => ir(5)}>
                Enviar recado
              </button>
              <button type="button" className="voltar" onClick={recomecar}>
                Voltar
              </button>
            </div>
          )}

          {tela === 5 && (
            <div className="t5">
              <div className="coracao">
                <Icone nome="favorite" tamanho={42} cheio />
              </div>
              <div className="pn-t h26">Recado entregue.</div>
              <div className="txt">Os noivos recebem na hora.</div>
              <button type="button" className="denovo-2" onClick={recomecar}>
                Testar de novo
              </button>
            </div>
          )}

          <div className="barra-casa" />
        </div>
      </div>

      {/* direita: o que as respostas já contam */}
      <div className="dir">
        <div className="pn-t titulo-2">O que as respostas já contam</div>
        {contagens.length > 0 ? (
          <Contagens itens={contagens} />
        ) : (
          <div className="pn-convidados-vazio">
            {confirmados > 0 ? "Nenhuma restrição nem criança até agora." : "Ninguém confirmou ainda."}
          </div>
        )}
        {musicas.pedidos.length > 0 && <Pedidos eventoId={eventoId} musicas={musicas} />}
      </div>
    </div>
  );
}

function Contagens({ itens }: { itens: ContagemDasRespostas[] }) {
  const maior = Math.max(1, ...itens.map((i) => i.n));
  return (
    <div className="pn-convidados-contagens">
      {itens.map((i) => (
        <div key={i.chave} className="item">
          <Icone nome={i.icone} tamanho={21} cor="#1b2a23" />
          <div>
            <div className="l">{i.rotulo}</div>
            <div className="barra">
              <div style={{ width: `${Math.max(6, (i.n / maior) * 80)}%` }} />
            </div>
          </div>
          <span className="pn-t n">{i.n}</span>
        </div>
      ))}
    </div>
  );
}

function Pedidos({ eventoId, musicas }: { eventoId: string; musicas: DadosConvidados["musicas"] }) {
  const router = useRouter();
  const { avisar } = usePortalNoivos();
  const [pendente, iniciar] = useTransition();

  function levar() {
    if (pendente) return;
    iniciar(async () => {
      const r = await levarPedidosParaODJ(eventoId);
      if ("error" in r) {
        avisar(r.error, true);
        return;
      }
      avisar(r.quantos === 1 ? "1 pedido levado para a trilha do DJ" : `${r.quantos} pedidos levados para a trilha do DJ`);
      router.refresh();
    });
  }

  return (
    <div className="pn-convidados-pedidos">
      <div className="cab">
        <Icone nome="queue_music" tamanho={18} />
        Pedidos de música
      </div>
      <div className="chips">
        {musicas.pedidos.slice(0, 8).map((m) => (
          <span key={m.titulo} className="chip">
            {m.titulo}
            {m.n > 1 && <span className="conta">{m.n}</span>}
          </span>
        ))}
      </div>
      {musicas.sugeridas > 0 ? (
        <button type="button" className="levar" onClick={levar} disabled={pendente}>
          Levar para a trilha do DJ
        </button>
      ) : (
        <div className="levado">
          <Icone nome="check" tamanho={18} />
          Na trilha do DJ
        </div>
      )}
    </div>
  );
}
