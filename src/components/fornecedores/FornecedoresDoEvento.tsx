"use client";

// Fornecedores do evento — tabela densa, uma linha por fornecedor.
//
// A tela antiga dava duas alturas e duas pílulas coloridas a cada
// fornecedor; com oito no evento, virava rolagem para descobrir quem
// falta confirmar. Agora: 50px por linha, status em ponto + texto, e o
// que é secundário só aparece quando ela abre a linha.
//
// Regra de cor desta tela (decisão do dono): cinza-chumbo carrega tudo,
// nada de ameixa — nem no toggle, nem no botão de enviar. O único uso
// de cor é --state-late, em quem está sem e-mail ou recusou.
//
// Nada aqui calcula status, grupo ou contagem: tudo vem de
// fornecedores-core.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/celebra";
import {
  acoesDe,
  contratoAnexado,
  dinheiroEmPalavras,
  pedidosEmPalavras,
  canaisDe,
  contagens,
  corDoTom,
  estadoConvite,
  estadoPresenca,
  filtrar,
  historicoDe,
  notaDoLink,
  podeEnviarConvite,
  textoRodape,
  type Acao,
  type Automacao,
  type Filtro,
  type Fornecedor,
} from "@/lib/fornecedores-core";
import {
  desvincularFornecedor,
  enviarConfirmacaoAgora,
  salvarDiasAntecedencia,
  salvarEmailAuto,
  salvarEmailFornecedor,
  salvarWhatsappAuto,
  setSupplierConfirmed,
} from "@/app/(app)/eventos/[id]/fornecedores/actions";
import {
  pedirAoFornecedor,
  pedirHorarioAoFornecedor,
} from "@/app/(app)/solicitacoes/actions";

const F_UI = "var(--font-ui)";
const F_MONO = "var(--font-mono)";
const F_TITLE = "var(--font-title)";

/** o mesmo grid no cabeçalho e em cada linha — sem coluna de ação,
 *  que era o que estourava a largura ao lado da sidebar */
const GRID =
  "minmax(120px,1.1fr) minmax(200px,1.8fr) minmax(104px,130px) minmax(104px,130px) 20px";

const DIAS = [3, 5, 7, 10, 14, 21, 30];

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "confirmados", label: "Confirmados" },
  { key: "pendentes", label: "Aguardando" },
  { key: "atencao", label: "Atenção" },
];

export function FornecedoresDoEvento({
  eventId,
  fornecedores,
  automacao,
  botaoAdicionar,
}: {
  eventId: string;
  fornecedores: Fornecedor[];
  automacao: Automacao;
  /** o botão de vincular vem pronto do servidor (abre o modal de busca) */
  botaoAdicionar: React.ReactNode;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [aberto, setAberto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Ação que dá certo em silêncio ensina a clicar de novo. O que ela
  // precisa saber é onde o pedido foi parar.
  const [feito, setFeito] = useState<string | null>(null);

  // espelho otimista dos toggles: o trilho anda na hora, o servidor confirma
  const [canais, setCanais] = useState({
    email: automacao.email,
    whatsapp: automacao.whatsapp,
  });
  const [dias, setDias] = useState(automacao.diasAntes);

  const cont = useMemo(() => contagens(fornecedores), [fornecedores]);
  const visiveis = useMemo(
    () => filtrar(fornecedores, filtro),
    [fornecedores, filtro]
  );

  function rodar(
    acao: () => Promise<{ error?: string } | { success: true } | void>,
    sucesso?: string
  ) {
    iniciar(async () => {
      const r = await acao();
      if (r && "error" in r && r.error) {
        setAviso(r.error);
        setFeito(null);
      } else {
        setAviso(null);
        setFeito(sucesso ?? null);
        router.refresh();
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ---------------- cabeçalho ---------------- */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 620 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: F_TITLE,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--tinta)",
            }}
          >
            Fornecedores do evento
          </h1>
          <p style={{ margin: 0, fontFamily: F_UI, fontSize: 13, lineHeight: 1.5, color: "var(--cinza)" }}>
            Vincule fornecedores do cadastro global. E-mail e WhatsApp habilitam
            convite automático — a resposta alimenta a{" "}
            <span style={{ color: "var(--cinza-3)", fontWeight: 500 }}>Saúde do Evento</span>.
          </p>
        </div>
        {botaoAdicionar}
      </div>

      {fornecedores.length === 0 ? (
        <VazioInicial botaoAdicionar={botaoAdicionar} />
      ) : (
        <>
          {/* ---------------- barra de automação ---------------- */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
              padding: "12px 16px",
              border: "1px solid var(--linha)",
              borderRadius: 10,
              background: "var(--papel)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: F_UI, fontSize: 13, fontWeight: 600, color: "var(--tinta)" }}>
                Enviar confirmação automática
              </span>
              <label style={{ position: "relative", display: "inline-flex" }}>
                <select
                  value={dias}
                  disabled={pendente}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setDias(v);
                    rodar(() => salvarDiasAntecedencia(eventId, v));
                  }}
                  aria-label="Dias de antecedência"
                  style={{
                    appearance: "none",
                    padding: "5px 26px 5px 10px",
                    border: "1px solid var(--linha)",
                    borderRadius: 8,
                    background: "var(--papel)",
                    fontFamily: F_MONO,
                    fontSize: 12,
                    color: "var(--tinta)",
                    cursor: "pointer",
                  }}
                >
                  {DIAS.map((d) => (
                    <option key={d} value={d}>
                      {d} dias
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    right: 9,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 10,
                    color: "var(--cinza)",
                    pointerEvents: "none",
                  }}
                >
                  ▾
                </span>
              </label>
              <span style={{ fontFamily: F_UI, fontSize: 13, color: "var(--cinza)" }}>
                antes do evento
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <Canal
                rotulo="E-mail"
                ligado={canais.email}
                aoAlternar={(v) => {
                  setCanais((c) => ({ ...c, email: v }));
                  rodar(() => salvarEmailAuto(eventId, v));
                }}
              />
              <Canal
                rotulo="WhatsApp"
                ligado={canais.whatsapp}
                aoAlternar={(v) => {
                  setCanais((c) => ({ ...c, whatsapp: v }));
                  rodar(() => salvarWhatsappAuto(eventId, v));
                }}
              />
              <span style={{ fontFamily: F_MONO, fontSize: 11, color: "var(--cinza)" }}>
                magic link sem login
              </span>
            </div>
          </div>

          {/* ---------------- filtros ---------------- */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FILTROS.map((f) => {
                const ativo = filtro === f.key;
                const n = cont[f.key === "todos" ? "todos" : f.key];
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFiltro(f.key)}
                    aria-pressed={ativo}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "6px 12px",
                      border: `1px solid ${ativo ? "var(--cinza-2)" : "var(--linha)"}`,
                      borderRadius: 99,
                      background: ativo ? "var(--nevoa)" : "var(--papel)",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: F_UI,
                        fontSize: 13,
                        fontWeight: 600,
                        color: ativo ? "var(--tinta)" : "var(--cinza-3)",
                      }}
                    >
                      {f.label}
                    </span>
                    <span
                      style={{
                        fontFamily: F_MONO,
                        fontSize: 12,
                        color: ativo ? "var(--cinza-3)" : "var(--cinza)",
                      }}
                    >
                      {n}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {feito && (
            <p
              style={{
                fontFamily: F_UI,
                fontSize: 13,
                color: "var(--tinta)",
                background: "var(--nevoa)",
                border: "1px solid var(--linha)",
                borderRadius: 8,
                padding: "8px 12px",
                margin: 0,
              }}
            >
              {feito}
            </p>
          )}

          {aviso && (
            <p
              style={{
                fontFamily: F_UI,
                fontSize: 13,
                color: "var(--state-late)",
                background: "var(--state-late-bg)",
                border: "1px solid var(--state-late)",
                borderRadius: 8,
                padding: "8px 12px",
                margin: 0,
              }}
            >
              {aviso}
            </p>
          )}

          {/* ---------------- tabela ---------------- */}
          <div
            style={{
              border: "1px solid var(--linha)",
              borderRadius: 14,
              background: "var(--papel)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                gap: 12,
                alignItems: "center",
                padding: "8px 18px",
                background: "var(--nevoa)",
                borderBottom: "1px solid var(--linha)",
                fontFamily: F_MONO,
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--cinza)",
              }}
            >
              <span>Fornecedor</span>
              <span>Contato</span>
              <span>Convite</span>
              <span>Presença</span>
              <span />
            </div>

            {visiveis.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  padding: "18px",
                  fontFamily: F_UI,
                  fontSize: 13,
                  color: "var(--cinza)",
                }}
              >
                Nenhum fornecedor neste filtro.
              </p>
            ) : (
              visiveis.map((f) => (
                <Linha
                  key={f.supplierId}
                  eventId={eventId}
                  f={f}
                  canais={canais}
                  aberto={aberto === f.supplierId}
                  pendente={pendente}
                  aoAbrir={() =>
                    setAberto(aberto === f.supplierId ? null : f.supplierId)
                  }
                  rodar={rodar}
                  setAviso={setAviso}
                />
              ))
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "11px 18px",
                fontFamily: F_MONO,
                fontSize: 11,
                color: "var(--cinza)",
                flexWrap: "wrap",
              }}
            >
              <span>{textoRodape(fornecedores)}</span>
              <span>
                confirmação sem login via magic link · resposta atualiza a Saúde do
                Evento
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================
 * Toggle de canal — 34×20, trilho chumbo. Nada de ameixa nesta tela.
 * ================================================================ */

function Canal({
  rotulo,
  ligado,
  aoAlternar,
}: {
  rotulo: string;
  ligado: boolean;
  aoAlternar: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={`Canal ${rotulo}`}
      onClick={() => aoAlternar(!ligado)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          position: "relative",
          width: 34,
          height: 20,
          borderRadius: 99,
          background: ligado ? "var(--tinta)" : "var(--linha)",
          transition: "background 150ms ease",
          flex: "none",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: ligado ? 16 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--papel)",
            boxShadow: "0 1px 3px rgba(34,30,27,.05)",
            transition: "left 150ms ease",
          }}
        />
      </span>
      <span
        style={{
          fontFamily: F_UI,
          fontSize: 12,
          fontWeight: 500,
          color: ligado ? "var(--tinta)" : "var(--cinza)",
        }}
      >
        {rotulo}
      </span>
    </button>
  );
}

/* ================================================================
 * A linha
 * ================================================================ */

function Linha({
  eventId,
  f,
  canais,
  aberto,
  pendente,
  aoAbrir,
  rodar,
  setAviso,
}: {
  eventId: string;
  f: Fornecedor;
  canais: { email: boolean; whatsapp: boolean };
  aberto: boolean;
  pendente: boolean;
  aoAbrir: () => void;
  rodar: (
    a: () => Promise<{ error?: string } | { success: true } | void>,
    sucesso?: string
  ) => void;
  setAviso: (s: string | null) => void;
}) {
  const convite = estadoConvite(f);
  const presenca = estadoPresenca(f);
  const cConvite = corDoTom(convite.tom);
  const cPresenca = corDoTom(presenca.tom);
  const semEmail = !f.email;

  return (
    <div style={{ borderBottom: "1px solid var(--linha)", background: aberto ? "var(--nevoa)" : "transparent" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={aoAbrir}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            aoAbrir();
          }
        }}
        style={{
          display: "grid",
          gridTemplateColumns: GRID,
          gap: 12,
          alignItems: "center",
          padding: "8px 18px",
          height: 50,
          boxSizing: "border-box",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <span
            style={{
              fontFamily: F_TITLE,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--tinta)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {f.nome}
          </span>
          <span
            style={{
              fontFamily: F_UI,
              fontSize: 12,
              color: "var(--cinza)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {f.categoria ?? "sem categoria"}
          </span>
        </div>

        <span
          title={f.email ?? "sem e-mail cadastrado"}
          style={{
            minWidth: 0,
            fontFamily: F_MONO,
            fontSize: 12,
            color: semEmail ? "var(--cinza-2)" : "var(--text-body)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {f.email ?? "sem e-mail cadastrado"}
        </span>

        <Status estado={convite} cor={cConvite} />
        <Status estado={presenca} cor={cPresenca} />

        <span
          aria-hidden
          style={{ textAlign: "center", fontSize: 11, color: "var(--cinza-2)" }}
        >
          {aberto ? "▴" : "▾"}
        </span>
      </div>

      {aberto && (
        <Detalhe
          eventId={eventId}
          f={f}
          canais={canais}
          pendente={pendente}
          rodar={rodar}
          setAviso={setAviso}
        />
      )}
    </div>
  );
}

function Status({
  estado,
  cor,
}: {
  estado: { label: string; meta: string };
  cor: { texto: string; ponto: string };
}) {
  return (
    <div
      title={estado.meta}
      style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}
    >
      <span
        aria-hidden
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: cor.ponto,
          flex: "none",
        }}
      />
      <span
        style={{
          fontFamily: F_UI,
          fontSize: 13,
          color: cor.texto,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {estado.label}
      </span>
    </div>
  );
}

/* ================================================================
 * O bloco expandido: metas, histórico e as ações
 * ================================================================ */

function Detalhe({
  eventId,
  f,
  canais,
  pendente,
  rodar,
  setAviso,
}: {
  eventId: string;
  f: Fornecedor;
  canais: { email: boolean; whatsapp: boolean };
  pendente: boolean;
  rodar: (
    a: () => Promise<{ error?: string } | { success: true } | void>,
    sucesso?: string
  ) => void;
  setAviso: (s: string | null) => void;
}) {
  const [editandoEmail, setEditandoEmail] = useState(false);
  const [email, setEmail] = useState(f.email ?? "");
  const convite = estadoConvite(f);
  const presenca = estadoPresenca(f);
  const historico = historicoDe(f);
  const acoes = acoesDe(f);
  const envio = podeEnviarConvite(f, canais);

  function executar(a: Acao) {
    if (a.id === "editar-email") {
      setEditandoEmail(true);
      return;
    }
    if (a.id === "enviar" || a.id === "reenviar") {
      if (!envio.ok) {
        setAviso(envio.motivo);
        return;
      }
      rodar(() => enviarConfirmacaoAgora(eventId, f.supplierId));
      return;
    }
    if (a.id === "pedir-horario") {
      rodar(
        () => pedirHorarioAoFornecedor(eventId, f.supplierId),
        "Pedido criado. A mensagem está na fila, em Solicitações."
      );
      return;
    }
    if (a.id === "pedir-contrato") {
      rodar(
        () => pedirAoFornecedor(eventId, f.supplierId, "contrato"),
        "Pedido criado. A mensagem está na fila, em Solicitações."
      );
      return;
    }
    if (a.id === "confirmar") {
      rodar(() => setSupplierConfirmed(eventId, f.supplierId, true));
      return;
    }
    if (a.id === "desmarcar") {
      rodar(() => setSupplierConfirmed(eventId, f.supplierId, false));
      return;
    }
    if (a.id === "remover") {
      rodar(() => desvincularFornecedor(eventId, f.supplierId));
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "2px 18px 16px 34px",
        background: "var(--nevoa)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 18px",
          fontFamily: F_MONO,
          fontSize: 11,
          color: "var(--cinza)",
        }}
      >
        <span>{canaisDe(f)}</span>
        <span style={{ color: f.email ? "var(--cinza)" : "var(--state-late)" }}>
          convite: {convite.meta}
        </span>
        <span>presença: {presenca.meta}</span>
      </div>

      {/* O dinheiro dele e o que está pendurado com ele. Vem do Financeiro
          do evento e da Central de Solicitações: ela decide sobre o
          fornecedor sem sair de onde está olhando para ele. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 18px",
          fontFamily: F_MONO,
          fontSize: 11,
          color: "var(--cinza)",
        }}
      >
        <span
          style={{
            color: f.dinheiro ? "var(--tinta)" : "var(--cinza)",
          }}
        >
          {dinheiroEmPalavras(f.dinheiro)}
        </span>
        {pedidosEmPalavras(f) && (
          <span style={{ color: "var(--tinta)" }}>{pedidosEmPalavras(f)}</span>
        )}
        {contratoAnexado(f) && (
          <a
            href={`/api/contrato?path=${encodeURIComponent(contratoAnexado(f)!.path)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--tinta)", textDecoration: "underline" }}
          >
            contrato: {contratoAnexado(f)!.nome}
          </a>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span
          style={{
            fontFamily: F_MONO,
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--cinza)",
          }}
        >
          Histórico
        </span>
        {historico.map((h, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span
              style={{
                width: 132,
                flex: "none",
                fontFamily: F_MONO,
                fontSize: 11,
                color: "var(--cinza)",
              }}
            >
              {h.quando}
            </span>
            <span style={{ fontFamily: F_UI, fontSize: 13, color: "var(--cinza-3)" }}>
              {h.texto}
            </span>
          </div>
        ))}
      </div>

      {editandoEmail ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contato@fornecedor.com"
            style={{
              height: 34,
              minWidth: 240,
              padding: "0 10px",
              border: "1px solid var(--linha)",
              borderRadius: 8,
              fontFamily: F_MONO,
              fontSize: 12,
              color: "var(--tinta)",
              background: "var(--papel)",
            }}
          />
          <Button
            size="sm"
            style={{ background: "var(--tinta)" }}
            disabled={pendente || !email.trim()}
            onClick={() => {
              rodar(() => salvarEmailFornecedor(eventId, f.supplierId, email.trim()));
              setEditandoEmail(false);
            }}
          >
            Salvar e-mail
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditandoEmail(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {acoes.map((a) => (
            <Button
              key={a.id}
              size="sm"
              variant={a.variante}
              disabled={pendente}
              onClick={() => executar(a)}
              // primary desta tela é chumbo, não ameixa
              style={a.variante === "primary" ? { background: "var(--tinta)" } : undefined}
            >
              {a.label}
            </Button>
          ))}
          <span
            style={{
              fontFamily: F_MONO,
              fontSize: 11,
              color: "var(--cinza)",
              marginLeft: 4,
            }}
          >
            {notaDoLink(f)}
          </span>
        </div>
      )}
    </div>
  );
}

/* ================================================================ */

function VazioInicial({ botaoAdicionar }: { botaoAdicionar: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px dashed var(--cinza-2)",
        borderRadius: 14,
        background: "var(--papel)",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <p style={{ margin: 0, fontFamily: F_UI, fontSize: 14, color: "var(--cinza-3)" }}>
        Nenhum fornecedor vinculado ainda.
      </p>
      <p style={{ margin: "4px 0 16px", fontFamily: F_UI, fontSize: 13, color: "var(--cinza)" }}>
        Busque no seu cadastro global e vincule ao evento.
      </p>
      <div style={{ display: "flex", justifyContent: "center" }}>{botaoAdicionar}</div>
    </div>
  );
}
