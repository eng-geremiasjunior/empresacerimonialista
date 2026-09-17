"use client";

// As alavancas da ficha: assinatura, prorrogar teste, conta da casa e
// suspender. Suspender pede confirmação explícita: é a ação mais dura do
// sistema (derruba todos os logins da conta).

import { useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  definirBanimento,
  definirContaDaCasa,
  prorrogarTeste,
  type ResultadoAdmin,
} from "../../actions";
import { EditorAssinatura, type AssinaturaEditavel, type OpcaoDePlano } from "../EditorAssinatura";

const BOTAO =
  "rounded-md border border-[#d3d3cf] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#1c1d21] hover:border-[#9a9ba1] disabled:opacity-50";

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

function Prorrogar({ empresaId, onFechar }: { empresaId: string; onFechar: () => void }) {
  const [estado, agir] = useFormState<ResultadoAdmin & { novoFim?: string }, FormData>(prorrogarTeste, {});
  const router = useRouter();
  useEffect(() => {
    if (estado.ok) router.refresh();
  }, [estado.ok, router]);

  if (estado.ok) {
    return (
      <p className="mt-3 text-[13px] text-[#3d3e44]">
        Teste prorrogado até {estado.novoFim?.split("-").reverse().join("/")}.{" "}
        <button type="button" onClick={onFechar} className="text-[#6e3f5f] underline underline-offset-2">
          fechar
        </button>
      </p>
    );
  }
  return (
    <form action={agir} className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-[#e4e4e0] bg-[#fafaf8] p-3">
      <input type="hidden" name="empresa_id" value={empresaId} />
      <label className="flex flex-col gap-1 text-[11.5px] text-[#84858b]">
        Mais quantos dias
        <input
          name="dias"
          inputMode="numeric"
          defaultValue="7"
          className="h-8 w-20 rounded-md border border-[#d3d3cf] bg-white px-2 text-[13px] text-[#1c1d21]"
          style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
        />
      </label>
      <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[11.5px] text-[#84858b]">
        Motivo (fica na auditoria)
        <input
          name="motivo"
          required
          minLength={3}
          maxLength={500}
          placeholder="ex.: pediu mais tempo pelo suporte"
          className="h-8 rounded-md border border-[#d3d3cf] bg-white px-2 text-[13px] text-[#1c1d21]"
        />
      </label>
      <Enviar rotulo="Prorrogar" />
      <button type="button" onClick={onFechar} className={BOTAO}>
        Cancelar
      </button>
      {estado.error && <p className="w-full text-[12px] text-red-700">{estado.error}</p>}
    </form>
  );
}

export function AcoesDaConta({
  empresaId,
  assinatura,
  planos,
  emTeste,
  daCasa,
  suspensa,
}: {
  empresaId: string;
  assinatura: AssinaturaEditavel;
  planos: OpcaoDePlano[];
  emTeste: boolean;
  daCasa: boolean;
  suspensa: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<null | "assinatura" | "prorrogar" | "suspender">(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, comecar] = useTransition();

  function alternarCasa() {
    setErro(null);
    comecar(async () => {
      const r = await definirContaDaCasa(empresaId, !daCasa);
      if (r.error) setErro(r.error);
      else router.refresh();
    });
  }

  function alternarSuspensao() {
    setErro(null);
    comecar(async () => {
      const r = await definirBanimento(empresaId, !suspensa);
      if (r.error) setErro(r.error);
      else {
        setAberto(null);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BOTAO} onClick={() => setAberto(aberto === "assinatura" ? null : "assinatura")}>
          {assinatura ? "Editar assinatura" : "Registrar assinatura"}
        </button>
        {emTeste && (
          <button type="button" className={BOTAO} onClick={() => setAberto(aberto === "prorrogar" ? null : "prorrogar")}>
            Prorrogar teste
          </button>
        )}
        <button type="button" className={BOTAO} disabled={ocupado} onClick={alternarCasa}>
          {daCasa ? "Não é minha: voltar para clientes" : "É minha: mover para as contas da casa"}
        </button>
        {aberto === "suspender" ? (
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={ocupado}
              onClick={alternarSuspensao}
              className="rounded-md bg-red-700 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {ocupado ? "…" : suspensa ? "Confirmar reativação" : "Confirmar: suspender todos os logins"}
            </button>
            <button type="button" className={BOTAO} onClick={() => setAberto(null)}>
              Cancelar
            </button>
          </span>
        ) : (
          <button
            type="button"
            className={`${BOTAO} ${suspensa ? "" : "text-red-700"}`}
            onClick={() => setAberto("suspender")}
          >
            {suspensa ? "Reativar a conta" : "Suspender a conta"}
          </button>
        )}
      </div>

      {erro && <p className="mt-2 text-[12px] text-red-700">{erro}</p>}

      {aberto === "assinatura" && (
        <EditorAssinatura
          empresaId={empresaId}
          atual={assinatura}
          planos={planos}
          onFechar={() => {
            setAberto(null);
            router.refresh();
          }}
        />
      )}
      {aberto === "prorrogar" && <Prorrogar empresaId={empresaId} onFechar={() => setAberto(null)} />}
    </div>
  );
}
