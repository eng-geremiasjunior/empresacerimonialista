"use client";

// Drawer da decisão (handoff §10). Sempre lateral à direita, 420px — nunca
// inline: expandir inline empurra a timeline e a usuária perde a posição.
// Os campos vazios SÃO o roteiro da conversa com os noivos; o rótulo mostra
// NOME · TIPO para ela saber que resposta buscar. Contagem é de "campos
// vazios", nunca "% preenchido". Sem asterisco, sem validação agressiva.

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Decisao } from "@/lib/supabase/planejamento";
import {
  valorDoCampo,
  type Campo,
  type TipoCampo,
} from "@/lib/planejamento-shared";
import {
  brl,
  C,
  dataBr,
  F_MONO,
  F_TITLE,
  F_UI,
  idCurto,
  monoLabel,
  prazoRelativo,
  TIPO_ROTULO,
  tituloStyle,
} from "./celebra";
import { BlocoCuradoria, type AcoesCuradoria } from "./BlocoCuradoria";
import type { Curadoria } from "@/lib/supabase/curadoria";

const RESP: Record<string, string> = {
  noivos: "noivos",
  cerimonialista: "cerimonialista",
  ambos: "ambos",
};

export type SupplierRef = { id: string; name: string };

type Salvar = (
  campo: Campo,
  valor: string | number | boolean | null
) => Promise<void>;

// ------------------------------------------------------------------
// Controles por tipo
// ------------------------------------------------------------------

const inputBase: React.CSSProperties = {
  height: 40,
  width: "100%",
  border: `1.5px solid ${C.bordaMedia}`,
  borderRadius: 8,
  padding: "0 11px",
  fontFamily: F_UI,
  fontSize: 13,
  color: C.tinta,
  background: "#fff",
  outline: "none",
};

function useCampoFoco() {
  const [foco, setFoco] = useState(false);
  return {
    foco,
    props: {
      onFocus: () => setFoco(true),
      onBlurCapture: () => setFoco(false),
    },
    style: foco
      ? {
          borderColor: C.ameixa,
          boxShadow: "0 0 0 3px rgba(110,63,95,.18)",
        }
      : undefined,
  };
}

function CampoTexto({
  campo,
  salvar,
  disabled,
}: {
  campo: Campo;
  salvar: Salvar;
  disabled?: boolean;
}) {
  const [v, setV] = useState(campo.valorTexto ?? "");
  const foco = useCampoFoco();
  useEffect(() => setV(campo.valorTexto ?? ""), [campo.valorTexto]);
  return (
    <input
      type="text"
      value={v}
      disabled={disabled}
      placeholder="—"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if ((campo.valorTexto ?? "") !== v.trim()) salvar(campo, v.trim());
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      {...foco.props}
      style={{ ...inputBase, ...foco.style }}
    />
  );
}

function CampoNumero({
  campo,
  salvar,
  disabled,
  moeda,
}: {
  campo: Campo;
  salvar: Salvar;
  disabled?: boolean;
  moeda?: boolean;
}) {
  const [v, setV] = useState(
    campo.valorNumero !== null ? String(campo.valorNumero) : ""
  );
  const foco = useCampoFoco();
  useEffect(
    () => setV(campo.valorNumero !== null ? String(campo.valorNumero) : ""),
    [campo.valorNumero]
  );
  const mostra =
    !foco.foco && moeda && v !== "" && !Number.isNaN(Number(v))
      ? brl(Number(v))
      : v;
  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        inputMode="decimal"
        value={mostra}
        disabled={disabled}
        placeholder="—"
        onChange={(e) => setV(e.target.value.replace(/[^\d.,-]/g, ""))}
        onBlur={() => {
          const num = v === "" ? null : Number(v.replace(/\./g, "").replace(",", "."));
          const atual = campo.valorNumero !== null ? Number(campo.valorNumero) : null;
          const novo = num !== null && !Number.isNaN(num) ? num : null;
          if (novo !== atual) salvar(campo, novo);
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        {...foco.props}
        style={{
          ...inputBase,
          fontFamily: F_MONO,
          paddingRight: campo.unidade ? 64 : 11,
          ...foco.style,
        }}
      />
      {campo.unidade && (
        <span
          style={{
            position: "absolute",
            right: 11,
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: F_MONO,
            fontSize: 12,
            color: C.meta,
            pointerEvents: "none",
          }}
        >
          {campo.unidade}
        </span>
      )}
    </div>
  );
}

function CampoSimNao({
  campo,
  salvar,
  disabled,
}: {
  campo: Campo;
  salvar: Salvar;
  disabled?: boolean;
}) {
  const v = campo.valorBool;
  const btn = (rotulo: string, valor: boolean) => {
    const ativo = v === valor;
    return (
      <button
        type="button"
        disabled={disabled}
        // clicar de novo no selecionado limpa (volta a "não respondido")
        onClick={() => salvar(campo, ativo ? null : valor)}
        style={{
          flex: 1,
          height: 40,
          borderRadius: 8,
          border: `1.5px solid ${ativo ? C.ameixa : C.bordaMedia}`,
          background: "#fff",
          fontFamily: F_UI,
          fontSize: 13,
          fontWeight: ativo ? 600 : 400,
          color: ativo ? C.tinta : C.secundario,
          cursor: disabled ? "default" : "pointer",
          transition: "border-color 150ms ease, color 150ms ease",
        }}
      >
        {rotulo}
      </button>
    );
  };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {btn("Sim", true)}
      {btn("Não", false)}
    </div>
  );
}

function CampoEscolha({
  campo,
  salvar,
  disabled,
}: {
  campo: Campo;
  salvar: Salvar;
  disabled?: boolean;
}) {
  const foco = useCampoFoco();
  return (
    <div style={{ position: "relative" }}>
      <select
        value={campo.valorOpcao ?? ""}
        disabled={disabled}
        onChange={(e) => salvar(campo, e.target.value || null)}
        {...foco.props}
        style={{
          ...inputBase,
          appearance: "none",
          color: campo.valorOpcao ? C.tinta : C.fantasma,
          cursor: disabled ? "default" : "pointer",
          ...foco.style,
        }}
      >
        <option value="">selecionar</option>
        {(campo.opcoes ?? []).map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 11,
          top: "50%",
          transform: "translateY(-50%)",
          color: C.meta,
          fontSize: 11,
          pointerEvents: "none",
        }}
      >
        ▾
      </span>
    </div>
  );
}

function CampoData({
  campo,
  salvar,
  disabled,
}: {
  campo: Campo;
  salvar: Salvar;
  disabled?: boolean;
}) {
  const foco = useCampoFoco();
  return (
    <input
      type="date"
      value={campo.valorData ?? ""}
      disabled={disabled}
      onChange={(e) => salvar(campo, e.target.value || null)}
      {...foco.props}
      style={{
        ...inputBase,
        fontFamily: F_MONO,
        color: campo.valorData ? C.tinta : C.fantasma,
        ...foco.style,
      }}
    />
  );
}

function CampoFornecedor({
  campo,
  salvar,
  suppliers,
  disabled,
}: {
  campo: Campo;
  salvar: Salvar;
  suppliers: SupplierRef[];
  disabled?: boolean;
}) {
  const atual = suppliers.find((s) => s.id === campo.valorSupplierId) ?? null;
  const foco = useCampoFoco();
  return (
    <div style={{ position: "relative" }}>
      {atual && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: C.tint,
            color: C.ameixa,
            fontFamily: F_UI,
            fontSize: 10,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {atual.name.charAt(0).toUpperCase()}
        </span>
      )}
      <select
        value={campo.valorSupplierId ?? ""}
        disabled={disabled}
        onChange={(e) => salvar(campo, e.target.value || null)}
        {...foco.props}
        style={{
          ...inputBase,
          appearance: "none",
          paddingLeft: atual ? 38 : 11,
          borderColor: atual ? C.ameixa : C.bordaMedia,
          color: atual ? C.tinta : C.fantasma,
          cursor: disabled ? "default" : "pointer",
          ...foco.style,
        }}
      >
        <option value="">selecionar no CRM</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 11,
          top: "50%",
          transform: "translateY(-50%)",
          color: C.meta,
          fontSize: 11,
          pointerEvents: "none",
        }}
      >
        ▾
      </span>
    </div>
  );
}

// Anexo: upload REAL para o bucket privado 'planejamento' (085), caminho
// {eventId}/{campoId}/{nome}. Download por URL assinada — contrato é
// documento sério, fica dentro do sistema.
function CampoAnexo({
  campo,
  eventId,
  salvar,
  disabled,
}: {
  campo: Campo;
  eventId: string;
  salvar: Salvar;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState<"subindo" | "abrindo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const path = campo.valorTexto;
  const nome = path ? path.split("/").pop() : null;

  async function subir(file: File) {
    setOcupado("subindo");
    setErro(null);
    const supabase = createClient();
    const seguro = file.name.replace(/[^\w.\-()]+/g, "_").slice(-80);
    const novoPath = `${eventId}/${campo.id}/${seguro}`;
    // troca de arquivo: remove o anterior antes (caminhos diferentes)
    if (path && path !== novoPath) {
      await supabase.storage.from("planejamento").remove([path]);
    }
    const { error } = await supabase.storage
      .from("planejamento")
      .upload(novoPath, file, { upsert: true });
    if (error) {
      setErro("Não foi possível enviar o arquivo.");
      setOcupado(null);
      return;
    }
    await salvar(campo, novoPath);
    setOcupado(null);
  }

  async function abrir() {
    if (!path) return;
    setOcupado("abrindo");
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("planejamento")
      .createSignedUrl(path, 60 * 10);
    setOcupado(null);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) subir(f);
          e.target.value = "";
        }}
      />
      <div
        role={disabled ? undefined : "button"}
        onClick={() => {
          if (disabled || ocupado) return;
          if (path) abrir();
          else fileRef.current?.click();
        }}
        style={{
          minHeight: 40,
          border: `1.5px dashed ${C.bordaMedia}`,
          borderRadius: 8,
          padding: "0 11px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          fontFamily: F_UI,
          fontSize: 13,
          color: nome ? C.tinta : C.fantasma,
          cursor: disabled ? "default" : "pointer",
          background: "#fff",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {ocupado === "subindo"
            ? "enviando…"
            : ocupado === "abrindo"
              ? "abrindo…"
              : nome ?? "anexar arquivo (PDF, imagem, DOCX)"}
        </span>
        {nome && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
            style={{
              fontFamily: F_MONO,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: C.meta,
              background: "none",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            trocar
          </button>
        )}
      </div>
      {erro && (
        <p style={{ marginTop: 4, fontFamily: F_UI, fontSize: 12, color: C.atrasadaFg }}>
          {erro}
        </p>
      )}
    </div>
  );
}

function Controle({
  campo,
  eventId,
  salvar,
  suppliers,
  disabled,
}: {
  campo: Campo;
  eventId: string;
  salvar: Salvar;
  suppliers: SupplierRef[];
  disabled?: boolean;
}) {
  switch (campo.tipo) {
    case "numero":
      return <CampoNumero campo={campo} salvar={salvar} disabled={disabled} />;
    case "moeda":
      return (
        <CampoNumero campo={campo} salvar={salvar} disabled={disabled} moeda />
      );
    case "sim_nao":
      return <CampoSimNao campo={campo} salvar={salvar} disabled={disabled} />;
    case "escolha":
      return <CampoEscolha campo={campo} salvar={salvar} disabled={disabled} />;
    case "data":
      return <CampoData campo={campo} salvar={salvar} disabled={disabled} />;
    case "fornecedor":
      return (
        <CampoFornecedor
          campo={campo}
          salvar={salvar}
          suppliers={suppliers}
          disabled={disabled}
        />
      );
    case "anexo":
      return (
        <CampoAnexo
          campo={campo}
          eventId={eventId}
          salvar={salvar}
          disabled={disabled}
        />
      );
    default:
      return <CampoTexto campo={campo} salvar={salvar} disabled={disabled} />;
  }
}

// ------------------------------------------------------------------
// Drawer
// ------------------------------------------------------------------

const TIPOS_NOVO: { valor: TipoCampo; rotulo: string }[] = [
  { valor: "texto", rotulo: "Texto" },
  { valor: "numero", rotulo: "Número" },
  { valor: "moeda", rotulo: "Moeda" },
  { valor: "sim_nao", rotulo: "Sim/não" },
  { valor: "escolha", rotulo: "Escolha" },
  { valor: "data", rotulo: "Data" },
  { valor: "anexo", rotulo: "Anexo" },
  { valor: "fornecedor", rotulo: "Fornecedor" },
];

export type LinhaDiffDrawer = {
  campo_id: string;
  campo_label: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  origem: string;
  quando: string;
};

export function DrawerDecisao({
  decisao,
  objetivoNome,
  eventId,
  suppliers,
  ehDataDoCasamento,
  dataEvento,
  onFechar,
  onSalvarCampo,
  onDefinirData,
  onDecidir,
  onNaoSeAplica,
  onReabrir,
  onCriarCampo,
  onConferir,
  onVerDiff,
  onAlternarVisivel,
  curadoria,
  acoesCuradoria,
}: {
  decisao: Decisao;
  objetivoNome: string;
  eventId: string;
  suppliers: SupplierRef[];
  /** decisão 'data': o campo data grava em events.date, não no campo. */
  ehDataDoCasamento: boolean;
  dataEvento: string | null;
  onFechar: () => void;
  onSalvarCampo: Salvar;
  onDefinirData: (data: string) => Promise<void>;
  onDecidir: () => void;
  onNaoSeAplica: () => void;
  onReabrir: () => void;
  onCriarCampo: (label: string, tipo: TipoCampo) => Promise<void>;
  /** conferência do bloco (091): aceita as respostas da cliente */
  onConferir: () => Promise<void>;
  onVerDiff: () => Promise<LinhaDiffDrawer[]>;
  onAlternarVisivel: (campoId: string, visivel: boolean) => Promise<void>;
  /** rodada de opções desta decisão (092); null = ainda não montada */
  curadoria: Curadoria | null;
  acoesCuradoria: AcoesCuradoria;
}) {
  const na = decisao.estado === "nao_se_aplica";
  const decidida = decisao.estado === "decidida";
  const vazios = decisao.campos.length - decisao.camposPreenchidos;
  const daCliente = decisao.aguardamConferencia;

  // fantasma "+ adicionar campo"
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<TipoCampo>("texto");
  const [criando, setCriando] = useState(false);

  // conferência: o diff abre sob demanda, e some quando confere
  const [diff, setDiff] = useState<LinhaDiffDrawer[] | null>(null);
  const [conferindo, setConferindo] = useState(false);

  // Esc fecha (handoff §10)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  const metaPartes = [
    idCurto(decisao.id),
    RESP[decisao.responsavel] ?? decisao.responsavel,
  ];
  if (na) {
    metaPartes.push("marcada como não se aplica");
  } else {
    const prazo = prazoRelativo(decisao.prazoPrevisto);
    if (prazo) metaPartes.push(prazo);
    metaPartes.push(
      vazios > 0
        ? `${vazios} ${vazios === 1 ? "campo vazio" : "campos vazios"}`
        : `${decisao.camposPreenchidos} de ${decisao.campos.length} campos preenchidos`
    );
    if (daCliente > 0) {
      metaPartes.push(
        `${daCliente} ${daCliente === 1 ? "resposta da cliente" : "respostas da cliente"}`
      );
    }
  }

  return (
    <>
      {/* scrim — clique fecha; a timeline atrás NÃO se move */}
      <div
        onClick={onFechar}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(35,38,42,.28)",
          zIndex: 60,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          maxWidth: "94vw",
          background: "#fff",
          boxShadow: "0 8px 32px rgba(35,38,42,.16)",
          zIndex: 61,
          display: "flex",
          flexDirection: "column",
          animation: "planoDrawerIn 160ms ease-out",
        }}
      >
        <style>{`@keyframes planoDrawerIn { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>

        {/* cabeçalho */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${C.bordaSutil}`,
            opacity: na ? 0.62 : 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span style={monoLabel}>
              {objetivoNome} · decisão
            </span>
            <button
              onClick={onFechar}
              aria-label="Fechar"
              style={{
                border: "none",
                background: "none",
                color: C.meta,
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={16} />
            </button>
          </div>
          <h2
            style={{
              ...tituloStyle(17, 23),
              marginTop: 4,
              textDecoration: na ? "line-through" : "none",
            }}
          >
            {decisao.titulo}
          </h2>
          <p
            style={{
              marginTop: 4,
              fontFamily: F_MONO,
              fontSize: 10,
              lineHeight: "14px",
              color: C.meta,
            }}
          >
            {metaPartes.join(" · ")}
          </p>
        </div>

        {/* faixa de roteiro — só quando há campo vazio (e não n-a) */}
        {!na && vazios > 0 && (
          <div
            style={{
              background: C.tint,
              padding: "12px 16px",
              fontFamily: F_UI,
              fontSize: 13,
              lineHeight: "18px",
              color: C.corpo,
            }}
          >
            Estes campos são o roteiro da conversa com os noivos. Preencha
            durante a reunião.
          </div>
        )}

        {/* campos */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            opacity: na ? 0.55 : 1,
          }}
        >
          {/* Conferência (091): as respostas da cliente entram valendo,
              mas ficam marcadas até este gesto. Conferir NÃO decide. */}
          {daCliente > 0 && !na && (
            <div
              style={{
                border: `1px solid ${C.pendenteFg}`,
                background: C.pendenteBg,
                borderRadius: 8,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span style={{ fontFamily: F_UI, fontSize: 13, color: C.corpo }}>
                {daCliente === 1
                  ? "A cliente respondeu 1 campo deste bloco."
                  : `A cliente respondeu ${daCliente} campos deste bloco.`}
              </span>
              {diff && diff.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    borderTop: `1px solid ${C.bordaSutil}`,
                    paddingTop: 8,
                  }}
                >
                  {diff.map((l) => (
                    <div key={l.campo_id} style={{ fontFamily: F_UI, fontSize: 12 }}>
                      <span style={{ color: C.secundario }}>{l.campo_label}: </span>
                      {l.valor_anterior !== null && (
                        <span
                          style={{
                            color: C.meta,
                            textDecoration: "line-through",
                            marginRight: 6,
                          }}
                        >
                          {l.valor_anterior}
                        </span>
                      )}
                      <span style={{ color: C.tinta }}>{l.valor_novo ?? "—"}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                {!diff && (
                  <button
                    type="button"
                    onClick={async () => setDiff(await onVerDiff())}
                    style={{
                      border: `1px solid ${C.bordaMedia}`,
                      background: C.card,
                      borderRadius: 6,
                      padding: "6px 10px",
                      fontFamily: F_UI,
                      fontSize: 12,
                      color: C.corpo,
                      cursor: "pointer",
                    }}
                  >
                    Ver o que mudou
                  </button>
                )}
                <button
                  type="button"
                  disabled={conferindo}
                  onClick={async () => {
                    setConferindo(true);
                    await onConferir();
                    setConferindo(false);
                    setDiff(null);
                  }}
                  style={{
                    border: `1px solid ${C.pendenteFg}`,
                    background: C.card,
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontFamily: F_UI,
                    fontSize: 12,
                    color: C.pendenteFg,
                    cursor: "pointer",
                  }}
                >
                  {conferindo ? "Conferindo…" : "Conferir bloco"}
                </button>
              </div>
            </div>
          )}

          {ehDataDoCasamento && (
            <div>
              <label style={{ ...monoLabel, display: "block", marginBottom: 6 }}>
                data do casamento · data
              </label>
              <input
                type="date"
                defaultValue={dataEvento ?? ""}
                disabled={na}
                onChange={(e) => {
                  if (e.target.value) onDefinirData(e.target.value);
                }}
                style={{ ...inputBase, fontFamily: F_MONO }}
              />
              <p
                style={{
                  marginTop: 4,
                  fontFamily: F_UI,
                  fontSize: 12,
                  color: C.meta,
                }}
              >
                Recalcula todos os prazos do método.
              </p>
            </div>
          )}

          {decisao.campos.map((campo) => (
            <div key={campo.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <label style={{ ...monoLabel, display: "flex", alignItems: "center", gap: 6 }}>
                  {campo.aguardaConferencia && (
                    <span
                      title="Resposta da cliente, ainda não conferida"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: C.pendenteFg,
                        flex: "none",
                      }}
                    />
                  )}
                  {campo.label} · {TIPO_ROTULO[campo.tipo] ?? campo.tipo}
                </label>
                {/* o olho do portal (089): esconder este campo da cliente */}
                <button
                  type="button"
                  title={
                    campo.visivelPortal === false
                      ? "Oculto do portal — clique para mostrar"
                      : "Visível no portal — clique para ocultar"
                  }
                  onClick={() =>
                    onAlternarVisivel(campo.id, campo.visivelPortal === false)
                  }
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontFamily: F_MONO,
                    fontSize: 10,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: campo.visivelPortal === false ? C.atrasadaFg : C.fantasma,
                    padding: "2px 4px",
                  }}
                >
                  {campo.visivelPortal === false ? "oculto do portal" : "portal"}
                </button>
              </div>
              <Controle
                campo={campo}
                eventId={eventId}
                salvar={onSalvarCampo}
                suppliers={suppliers}
                disabled={na}
              />
            </div>
          ))}

          {decisao.campos.length === 0 && !ehDataDoCasamento && (
            <p style={{ fontFamily: F_UI, fontSize: 13, color: C.fantasma }}>
              Esta decisão ainda não tem campos.
            </p>
          )}

          {/* + adicionar campo (fantasma inline — liberdade §2.7) */}
          {!na &&
            (novoAberto ? (
              <div
                style={{
                  border: `1px dashed ${C.bordaMedia}`,
                  borderRadius: 8,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <input
                  autoFocus
                  type="text"
                  value={novoNome}
                  placeholder="nome do campo"
                  onChange={(e) => setNovoNome(e.target.value)}
                  style={{ ...inputBase, height: 36 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    value={novoTipo}
                    onChange={(e) => setNovoTipo(e.target.value as TipoCampo)}
                    style={{ ...inputBase, height: 36, flex: 1 }}
                  >
                    {TIPOS_NOVO.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.rotulo}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={criando || !novoNome.trim()}
                    onClick={async () => {
                      setCriando(true);
                      await onCriarCampo(novoNome, novoTipo);
                      setCriando(false);
                      setNovoNome("");
                      setNovoAberto(false);
                    }}
                    style={{
                      height: 36,
                      padding: "0 14px",
                      borderRadius: 8,
                      border: "none",
                      background: C.ameixa,
                      color: "#fff",
                      fontFamily: F_TITLE,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      opacity: criando || !novoNome.trim() ? 0.5 : 1,
                    }}
                  >
                    {criando ? "…" : "Adicionar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovoAberto(false)}
                    style={{
                      height: 36,
                      padding: "0 8px",
                      border: "none",
                      background: "none",
                      color: C.meta,
                      fontFamily: F_UI,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNovoAberto(true)}
                style={{
                  textAlign: "left",
                  border: "none",
                  background: "none",
                  padding: 0,
                  fontFamily: F_TITLE,
                  fontWeight: 500,
                  fontSize: 13,
                  lineHeight: "18px",
                  color: C.fantasma,
                  cursor: "pointer",
                }}
              >
                + adicionar campo
              </button>
            ))}

          {na && (
            <p style={{ fontFamily: F_UI, fontSize: 12, color: C.meta }}>
              Some da fila e do progresso; continua listada no fim da jornada,
              recuada e tachada.
            </p>
          )}

          {/* Opções para a cliente (092) — depois dos campos porque é a
              conversa que vem DEPOIS de a decisão existir. */}
          {!na && (
            <BlocoCuradoria
              curadoria={curadoria}
              decidida={decidida}
              acoes={acoesCuradoria}
            />
          )}
        </div>

        {/* Aviso NOMEADO antes de decidir (decisão do dono: aviso genérico
            se aprende a ignorar). Não bloqueia — ela é soberana. */}
        {daCliente > 0 && !na && !decidida && (
          <p
            style={{
              margin: 0,
              padding: "8px 16px",
              borderTop: `1px solid ${C.bordaSutil}`,
              fontFamily: F_UI,
              fontSize: 12,
              color: C.pendenteFg,
            }}
          >
            Sem conferir:{" "}
            {decisao.campos
              .filter((c) => c.aguardaConferencia)
              .map((c) => c.label)
              .join(", ")}
          </p>
        )}

        {/* rodapé fixo — os dois botões têm o MESMO peso (decisão de
            produto: dizer "não se aplica" vale tanto quanto decidir) */}
        <div
          style={{
            padding: "14px 16px",
            borderTop: `1px solid ${C.bordaSutil}`,
            display: "flex",
            gap: 10,
          }}
        >
          {na ? (
            <button
              type="button"
              onClick={onReabrir}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 8,
                border: `1.5px solid ${C.bordaForte}`,
                background: "#fff",
                fontFamily: F_TITLE,
                fontWeight: 600,
                fontSize: 13,
                color: C.tinta,
                cursor: "pointer",
              }}
            >
              Reativar decisão
            </button>
          ) : decidida ? (
            <button
              type="button"
              onClick={onReabrir}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 8,
                border: `1.5px solid ${C.bordaForte}`,
                background: "#fff",
                fontFamily: F_TITLE,
                fontWeight: 600,
                fontSize: 13,
                color: C.tinta,
                cursor: "pointer",
              }}
            >
              Reabrir decisão
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onDecidir}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 8,
                  border: "none",
                  background: C.ameixa,
                  color: "#fff",
                  fontFamily: F_TITLE,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Marcar como decidida
              </button>
              <button
                type="button"
                onClick={onNaoSeAplica}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 8,
                  border: `1.5px solid ${C.bordaForte}`,
                  background: "#fff",
                  fontFamily: F_TITLE,
                  fontWeight: 600,
                  fontSize: 13,
                  color: C.tinta,
                  cursor: "pointer",
                }}
              >
                Não se aplica
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

// resumo curto dos campos preenchidos — subtítulo da linha da decisão
export function resumoCampos(
  campos: Campo[],
  suppliers: SupplierRef[]
): string | null {
  const partes: string[] = [];
  for (const c of campos) {
    const v = valorDoCampo(c);
    if (v === null) continue;
    if (c.tipo === "moeda") partes.push(brl(Number(v)));
    else if (c.tipo === "numero")
      partes.push(`${v}${c.unidade ? ` ${c.unidade}` : ""}`);
    else if (c.tipo === "sim_nao") partes.push(`${c.label}: ${v ? "sim" : "não"}`);
    else if (c.tipo === "data") partes.push(dataBr(String(v)));
    else if (c.tipo === "fornecedor") {
      const s = suppliers.find((s) => s.id === v);
      if (s) partes.push(s.name);
    } else if (c.tipo === "escolha") partes.push(String(v).replace(/_/g, " "));
    else if (c.tipo === "anexo") partes.push(String(v).split("/").pop() ?? "anexo");
    else partes.push(String(v));
    if (partes.length >= 2) break;
  }
  return partes.length > 0 ? partes.join(" · ") : null;
}
