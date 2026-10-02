"use client";

// As alavancas de um login (02/10/2026): trocar o e-mail, mandar o link de
// senha nova, reenviar a confirmação (ou confirmar sem o link), encerrar as
// sessões e apagar um cadastro de festa pendente. Uma de cada vez, sempre
// com o motivo, que fica na auditoria.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { agirNoLogin, type ResultadoDoLogin } from "../actions";

type Acao = "trocar_email" | "link_de_senha" | "reenviar_confirmacao" | "confirmar" | "encerrar_sessoes" | "apagar_pendente";

const BOTAO =
  "rounded-md border border-[#d3d3cf] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#1c1d21] hover:border-[#9a9ba1] disabled:opacity-50";
const CAMPO = "h-8 rounded-md border border-[#d3d3cf] bg-white px-2 text-[13px] text-[#1c1d21]";

const ROTULO: Record<Acao, string> = {
  trocar_email: "Trocar o e-mail",
  link_de_senha: "Mandar link de senha nova",
  reenviar_confirmacao: "Reenviar o link de confirmação",
  confirmar: "Confirmar sem o link",
  encerrar_sessoes: "Encerrar as sessões",
  apagar_pendente: "Apagar cadastro pendente",
};
const BOTAO_DO_FORM: Record<Acao, string> = {
  trocar_email: "Trocar",
  link_de_senha: "Mandar",
  reenviar_confirmacao: "Reenviar",
  confirmar: "Confirmar",
  encerrar_sessoes: "Encerrar",
  apagar_pendente: "Apagar",
};
/** o que a ação faz, quando não é óbvio pelo nome */
const AVISO: Partial<Record<Acao, string>> = {
  trocar_email: "O login passa a entrar com o e-mail novo, e quem estiver dentro sai.",
  confirmar: "Só confirme sem o link se a pessoa provou que é a dona do endereço (escreveu dele, por exemplo).",
  encerrar_sessoes: "Sai de todos os aparelhos. Para entrar de novo, usa o e-mail e a senha.",
};

function Enviar({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-8 rounded-md bg-[#33343a] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#4d4e55] disabled:opacity-50"
    >
      {pending ? "…" : rotulo}
    </button>
  );
}

function Formulario({
  acao,
  userId,
  onFechar,
  onFeito,
}: {
  acao: Acao;
  userId: string;
  onFechar: () => void;
  /** a ação deu certo: a lista precisa recarregar quando a mensagem fechar */
  onFeito: () => void;
}) {
  const [estado, agir] = useFormState<ResultadoDoLogin, FormData>(agirNoLogin, {});
  useEffect(() => {
    if (estado.ok) onFeito();
  }, [estado.ok, onFeito]);

  // feito: a mensagem fica até ele fechar; só então a lista recarrega (o
  // cartão pode mudar de e-mail ou sumir, e a mensagem iria junto)
  if (estado.ok) {
    return (
      <p className="mt-3 text-[13px] text-[#3d3e44]" role="status">
        {estado.feito}{" "}
        <button type="button" onClick={onFechar} className="text-[#6e3f5f] underline underline-offset-2">
          fechar
        </button>
      </p>
    );
  }
  return (
    <form action={agir} className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-[#e4e4e0] bg-[#fafaf8] p-3">
      <input type="hidden" name="acao" value={acao} />
      <input type="hidden" name="user_id" value={userId} />
      {AVISO[acao] && <p className="w-full text-[12.5px] text-[#5d5e64]">{AVISO[acao]}</p>}
      {acao === "trocar_email" && (
        <>
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[11.5px] text-[#84858b]">
            E-mail novo
            <input name="email" type="email" required autoComplete="off" className={CAMPO} />
          </label>
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[11.5px] text-[#84858b]">
            Repita o e-mail novo
            <input name="confirmacao" type="email" required autoComplete="off" className={CAMPO} />
          </label>
        </>
      )}
      <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[11.5px] text-[#84858b]">
        Motivo (fica na auditoria)
        <input
          name="motivo"
          required
          minLength={3}
          maxLength={500}
          placeholder="ex.: e-mail digitado errado no cadastro"
          className={CAMPO}
        />
      </label>
      <Enviar rotulo={BOTAO_DO_FORM[acao]} />
      <button type="button" onClick={onFechar} className={BOTAO}>
        Cancelar
      </button>
      {estado.error && (
        <p className="w-full text-[12px] text-red-700" role="alert">
          {estado.error}
          {estado.conflito && (
            <>
              {" "}
              <Link href={`/admin/logins?id=${estado.conflito.id}`} className="font-medium underline underline-offset-2">
                Abrir o login {estado.conflito.email}
              </Link>
            </>
          )}
        </p>
      )}
    </form>
  );
}

export function AcoesDoLogin({
  userId,
  confirmado,
  pendente,
  doDono,
}: {
  userId: string;
  confirmado: boolean;
  /** cadastro de festa esperando o link */
  pendente: boolean;
  /** o login do dono do sistema: o e-mail não muda por aqui */
  doDono: boolean;
}) {
  const [aberta, setAberta] = useState<Acao | null>(null);
  const router = useRouter();
  // uma ação concluída deixa a lista velha: fechar a mensagem (por
  // "fechar", pelo botão da ação ou abrindo outra) recarrega
  const velha = useRef(false);
  const abrir = (proxima: Acao | null) => {
    if (velha.current) {
      velha.current = false;
      router.refresh();
    }
    setAberta(proxima);
  };
  const marcarFeito = useRef(() => {
    velha.current = true;
  }).current;
  const acoes: Acao[] = [
    ...(doDono ? [] : (["trocar_email"] as Acao[])),
    "link_de_senha",
    // o login do dono nunca se confirma à mão (só pelo link)
    ...(confirmado ? [] : (["reenviar_confirmacao", ...(doDono ? [] : ["confirmar"])] as Acao[])),
    "encerrar_sessoes",
    ...(pendente ? (["apagar_pendente"] as Acao[]) : []),
  ];
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {acoes.map((a) => (
          <button
            key={a}
            type="button"
            className={BOTAO}
            aria-expanded={aberta === a}
            onClick={() => abrir(aberta === a ? null : a)}
          >
            {ROTULO[a]}
          </button>
        ))}
      </div>
      {aberta && <Formulario key={aberta} acao={aberta} userId={userId} onFechar={() => abrir(null)} onFeito={marcarFeito} />}
    </div>
  );
}
