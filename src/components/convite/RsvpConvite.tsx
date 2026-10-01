"use client";

// O RSVP do convite: a confirmação com o desenho do casamento.
//
// A lógica (estado, envio, acompanhantes, menu, recado, QR) mora no
// useRsvp, que os modelos novos também usam; aqui fica só o desenho.

import { CredencialEntrada } from "@/components/rsvp/ConfirmacaoConvidado";
import { formatarPrazo, useRsvp } from "@/components/site/pecas/useRsvp";

/** .ics de uma linha só — funciona no iPhone e no Outlook. */
function arquivoDeAgenda(titulo: string, dataIso: string, hora: string | null) {
  const [a, m, d] = dataIso.split("-");
  const hhmm = (hora ?? "12:00").slice(0, 5).replace(":", "");
  const inicio = `${a}${m}${d}T${hhmm}00`;
  const corpo = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `DTSTART:${inicio}`,
    `SUMMARY:${titulo}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(corpo)}`;
}

function linkGoogleAgenda(titulo: string, dataIso: string, hora: string | null, local: string | null) {
  const [a, m, d] = dataIso.split("-");
  const hhmm = (hora ?? "12:00").slice(0, 5).replace(":", "");
  const inicio = `${a}${m}${d}T${hhmm}00`;
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo,
    dates: `${inicio}/${inicio}`,
  });
  if (local) p.set("location", local);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function RsvpConvite({
  hash,
  aberto,
  prazo,
  menu,
  tituloAgenda,
  data,
  hora,
  local,
}: {
  hash: string;
  aberto: boolean;
  prazo: string | null;
  menu: string[];
  tituloAgenda: string;
  data: string;
  hora: string | null;
  local: string | null;
}) {
  const {
    vai,
    setVai,
    nome,
    setNome,
    email,
    setEmail,
    acompanhantes,
    adicionarAcompanhante,
    mudarAcompanhante,
    removerAcompanhante,
    menuEscolhido,
    setMenuEscolhido,
    restricao,
    setRestricao,
    recado,
    setRecado,
    total,
    enviando,
    erro,
    pronto,
    credencial,
    enviar,
  } = useRsvp(hash);

  if (!aberto) {
    return (
      <p className="cv-texto" style={{ textAlign: "center" }}>
        As confirmações foram encerradas. Se ainda precisar avisar alguma
        coisa, fale direto com os anfitriões.
      </p>
    );
  }

  if (pronto) {
    return (
      <div style={{ textAlign: "center" }}>
        <p className="cv-obrigado">
          {vai
            ? total > 1
              ? `Que alegria! Estamos esperando vocês ${total}.`
              : "Que alegria! Estamos esperando você."
            : "Obrigado por avisar — vamos sentir sua falta."}
        </p>
        {vai && credencial && <CredencialEntrada credencial={credencial} />}
        {vai && (
          <div className="cv-agenda">
            <div className="cv-rotulo">Para não esquecer a data</div>
            <div className="cv-agenda-acoes">
              <a
                className="cv-botao-leve"
                href={linkGoogleAgenda(tituloAgenda, data, hora, local)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Agenda
              </a>
              <a
                className="cv-botao-leve"
                href={arquivoDeAgenda(tituloAgenda, data, hora)}
                download="convite.ics"
              >
                Apple / Outlook
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {prazo && (
        <p className="cv-nota" style={{ textAlign: "center", marginTop: 10 }}>
          Pedimos a gentileza de responder até {formatarPrazo(prazo)}.
        </p>
      )}

      <div className="cv-escolha">
        <button
          type="button"
          className="cv-escolha-botao"
          aria-pressed={vai === true}
          onClick={() => setVai(true)}
        >
          Sim, eu vou
        </button>
        <button
          type="button"
          className="cv-escolha-botao"
          aria-pressed={vai === false}
          onClick={() => setVai(false)}
        >
          Infelizmente não posso
        </button>
      </div>

      {vai !== null && (
        <>
          <div className="cv-grade-2">
            <input
              className="cv-campo"
              placeholder="Seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <input
              className="cv-campo"
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {vai && (
            <>
              <div className="cv-acompanhantes">
                <div className="cv-acompanhantes-topo">
                  <span className="cv-rotulo">Quem vem com você</span>
                  <span className="cv-rotulo">
                    {total} {total === 1 ? "pessoa" : "pessoas"} no total
                  </span>
                </div>

                {acompanhantes.map((a, i) => (
                  <div className="cv-acompanhante-linha" key={i}>
                    <input
                      className="cv-campo cv-campo-caixa"
                      placeholder="Nome do acompanhante"
                      value={a.nome}
                      onChange={(e) => mudarAcompanhante(i, { nome: e.target.value })}
                    />
                    <label className="cv-nota" style={{ marginTop: 0, whiteSpace: "nowrap" }}>
                      <input
                        type="checkbox"
                        checked={a.crianca}
                        onChange={(e) => mudarAcompanhante(i, { crianca: e.target.checked })}
                      />{" "}
                      criança
                    </label>
                    <button
                      type="button"
                      className="cv-remover"
                      onClick={() => removerAcompanhante(i)}
                    >
                      Remover
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="cv-adicionar"
                  onClick={adicionarAcompanhante}
                >
                  + Adicionar acompanhante
                </button>
                <p className="cv-nota">
                  Informe todos, inclusive crianças — os nomes são conferidos na entrada.
                </p>
              </div>

              <div className="cv-grade-menu" style={{ marginTop: 18 }}>
                {menu.length > 0 ? (
                  <select
                    className="cv-campo"
                    value={menuEscolhido}
                    onChange={(e) => setMenuEscolhido(e.target.value)}
                  >
                    <option value="">Escolha o menu</option>
                    {menu.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span />
                )}
                <input
                  className="cv-campo"
                  placeholder="Restrição alimentar (opcional)"
                  value={restricao}
                  onChange={(e) => setRestricao(e.target.value)}
                />
              </div>
            </>
          )}

          <input
            className="cv-campo"
            style={{ marginTop: 18 }}
            placeholder="Um recado para o casal (opcional)"
            value={recado}
            onChange={(e) => setRecado(e.target.value)}
          />

          {erro && <p className="cv-erro">{erro}</p>}

          <button
            type="button"
            className="cv-botao cv-enviar"
            onClick={enviar}
            disabled={enviando}
          >
            {enviando ? "Enviando…" : "Enviar confirmação"}
          </button>
        </>
      )}
    </div>
  );
}
