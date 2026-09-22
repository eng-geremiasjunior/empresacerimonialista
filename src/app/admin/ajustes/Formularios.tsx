"use client";

// Os formulários de Ajustes: custo, saldo de caixa e os limites. Tudo o
// que o dono digita mora aqui; o resto do painel só lê.

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { mascararDinheiro } from "@/lib/format";
import {
  apagarCusto,
  copiarRecorrentes,
  marcarCustoPago,
  salvarAjustes,
  salvarCusto,
  salvarDegrau,
  salvarPlano,
  salvarSaldo,
  type ResultadoAdmin,
} from "../actions";

const CAMPO = "h-8 rounded-md border border-[#d3d3cf] bg-white px-2 text-[13px] text-[#1c1d21]";
const ROTULO = "flex flex-col gap-1 text-[11.5px] text-[#84858b]";
const BOTAO = "h-8 rounded-md bg-[#33343a] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#4d4e55] disabled:opacity-50";
const BOTAO_CLARO =
  "rounded-md border border-[#d3d3cf] bg-white px-3 py-1.5 text-[12px] font-medium text-[#3d3e44] hover:border-[#9a9ba1] disabled:opacity-50";

function Enviar({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={BOTAO}>
      {pending ? "…" : rotulo}
    </button>
  );
}

export function FormCusto({
  mes,
  categorias,
}: {
  mes: string;
  categorias: { chave: string; rotulo: string }[];
}) {
  const [estado, agir] = useFormState<ResultadoAdmin, FormData>(salvarCusto, {});
  const [valor, setValor] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (estado.ok) {
      form.current?.reset();
      setValor("");
      router.refresh();
    }
  }, [estado, router]);

  return (
    <form ref={form} action={agir} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="mes" value={mes} />
      <label className={ROTULO}>
        De que é
        <input name="servico" required maxLength={60} placeholder="ex.: Supabase Pro" className={`${CAMPO} w-[200px]`} />
      </label>
      <label className={ROTULO}>
        Categoria
        <select name="categoria" defaultValue="infraestrutura" className={CAMPO}>
          {categorias.map((c) => (
            <option key={c.chave} value={c.chave}>
              {c.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label className={ROTULO}>
        Valor (R$)
        <input
          name="valor"
          value={valor}
          onChange={(e) => setValor(mascararDinheiro(e.target.value))}
          inputMode="numeric"
          required
          className={`${CAMPO} w-28`}
          style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
        />
      </label>
      <label className="flex items-center gap-1.5 pb-1.5 text-[12.5px] text-[#3d3e44]">
        <input type="checkbox" name="recorrente" value="1" defaultChecked className="h-3.5 w-3.5" />
        todo mês
      </label>
      <label className="flex items-center gap-1.5 pb-1.5 text-[12.5px] text-[#3d3e44]">
        <input type="checkbox" name="pago" value="1" defaultChecked className="h-3.5 w-3.5" />
        já pago
      </label>
      <label className={ROTULO}>
        Nota
        <input name="nota" maxLength={300} className={`${CAMPO} w-[180px]`} />
      </label>
      <Enviar rotulo="Lançar" />
      {estado.error && <p className="w-full text-[12px] text-red-700">{estado.error}</p>}
    </form>
  );
}

export function AcoesDoCusto({ id, pago }: { id: string; pago: boolean }) {
  const [ocupado, comecar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const router = useRouter();

  return (
    <span className="flex items-center gap-2 text-[12px]">
      <button
        type="button"
        disabled={ocupado}
        onClick={() =>
          comecar(async () => {
            const r = await marcarCustoPago(id, !pago);
            if (r.error) setErro(r.error);
            else router.refresh();
          })
        }
        className="text-[#5c5d63] underline underline-offset-2 disabled:opacity-50"
      >
        {pago ? "marcar a pagar" : "marcar pago"}
      </button>
      {confirmando ? (
        <>
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              comecar(async () => {
                const r = await apagarCusto(id);
                if (r.error) setErro(r.error);
                else router.refresh();
              })
            }
            className="font-medium text-red-700 underline underline-offset-2"
          >
            apagar mesmo
          </button>
          <button type="button" onClick={() => setConfirmando(false)} className="text-[#84858b]">
            não
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setConfirmando(true)} className="text-[#84858b] underline underline-offset-2">
          apagar
        </button>
      )}
      {erro && <span className="text-red-700">{erro}</span>}
    </span>
  );
}

export function BotaoCopiarRecorrentes({ mes }: { mes: string }) {
  const [ocupado, comecar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const router = useRouter();
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={ocupado}
        className={BOTAO_CLARO}
        onClick={() =>
          comecar(async () => {
            const r = await copiarRecorrentes(mes);
            setAviso(r.error ?? (r.copiados ? `${r.copiados} copiados` : "nada novo para copiar"));
            if (!r.error) router.refresh();
          })
        }
      >
        {ocupado ? "…" : "Copiar os do mês passado"}
      </button>
      {aviso && <span className="text-[12px] text-[#5c5d63]">{aviso}</span>}
    </span>
  );
}

export function FormSaldo({ hoje }: { hoje: string }) {
  const [estado, agir] = useFormState<ResultadoAdmin, FormData>(salvarSaldo, {});
  const [valor, setValor] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (estado.ok) router.refresh();
  }, [estado, router]);

  return (
    <form action={agir} className="flex flex-wrap items-end gap-3">
      <label className={ROTULO}>
        Dia
        <input type="date" name="dia" defaultValue={hoje} required className={CAMPO} />
      </label>
      <label className={ROTULO}>
        Saldo (R$)
        <input
          name="valor"
          value={valor}
          onChange={(e) => setValor(mascararDinheiro(e.target.value))}
          inputMode="numeric"
          required
          className={`${CAMPO} w-32`}
          style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
        />
      </label>
      <label className={ROTULO}>
        Nota
        <input name="nota" maxLength={200} className={`${CAMPO} w-[200px]`} />
      </label>
      <Enviar rotulo="Guardar saldo" />
      {estado.error && <p className="w-full text-[12px] text-red-700">{estado.error}</p>}
    </form>
  );
}

export function FormAjustes({
  aliquota,
  bancoMb,
  arquivosMb,
  emailsMes,
}: {
  aliquota: number | null;
  bancoMb: number | null;
  arquivosMb: number | null;
  emailsMes: number | null;
}) {
  const [estado, agir] = useFormState<ResultadoAdmin, FormData>(salvarAjustes, {});
  const router = useRouter();
  useEffect(() => {
    if (estado.ok) router.refresh();
  }, [estado, router]);

  return (
    <form action={agir} className="flex flex-wrap items-end gap-3">
      <label className={ROTULO}>
        Imposto estimado (%)
        <input name="aliquota_imposto" defaultValue={aliquota ?? ""} inputMode="decimal" className={`${CAMPO} w-24`} />
      </label>
      <label className={ROTULO}>
        Limite do banco (MB)
        <input name="supabase_banco_mb" defaultValue={bancoMb ?? ""} inputMode="numeric" className={`${CAMPO} w-28`} />
      </label>
      <label className={ROTULO}>
        Limite de arquivos (MB)
        <input name="supabase_arquivos_mb" defaultValue={arquivosMb ?? ""} inputMode="numeric" className={`${CAMPO} w-32`} />
      </label>
      <label className={ROTULO}>
        E-mails por mês (plano do Resend)
        <input name="resend_emails_mes" defaultValue={emailsMes ?? ""} inputMode="numeric" className={`${CAMPO} w-32`} />
      </label>
      <Enviar rotulo="Salvar ajustes" />
      {estado.error && <p className="w-full text-[12px] text-red-700">{estado.error}</p>}
      {estado.ok && <p className="w-full text-[12px] text-[#5c5d63]">Salvo.</p>}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Os preços (22/09/2026)                                              */
/* ------------------------------------------------------------------ */

/**
 * Uma linha por plano. Salvar vale para quem assinar DAQUI PARA FRENTE —
 * quem já assina continua no valor da assinatura dela, e é isso que a
 * nota da seção diz. Por isso o botão só acende quando algo muda: é para
 * ele não salvar sem querer e ficar achando que mexeu no preço de todo
 * mundo.
 */
export function FormPlano({
  plano,
}: {
  plano: { codigo: string; nome: string; valorMensal: number; eventosEmAndamento: number | null; logins: number | null; ativo: boolean };
}) {
  const [estado, agir] = useFormState<ResultadoAdmin, FormData>(salvarPlano, {});
  const router = useRouter();
  const [mexeu, setMexeu] = useState(false);
  useEffect(() => {
    if (estado.ok) {
      setMexeu(false);
      router.refresh();
    }
  }, [estado.ok, router]);

  return (
    <form action={agir} onChange={() => setMexeu(true)} className="flex flex-wrap items-end gap-3 border-t border-[#ededea] py-3 first:border-t-0">
      <input type="hidden" name="codigo" value={plano.codigo} />
      <label className={`${ROTULO} w-[150px]`}>
        Nome
        <input name="nome" defaultValue={plano.nome} maxLength={40} className={`${CAMPO} w-full`} />
      </label>
      <label className={`${ROTULO} w-[110px]`}>
        R$ por mês
        <input
          name="valor_mensal"
          defaultValue={plano.valorMensal.toFixed(2).replace(".", ",")}
          inputMode="decimal"
          className={`${CAMPO} w-full`}
        />
      </label>
      <label className={`${ROTULO} w-[130px]`}>
        Eventos de pé
        <input
          name="eventos"
          defaultValue={plano.eventosEmAndamento ?? ""}
          placeholder="sem limite"
          inputMode="numeric"
          className={`${CAMPO} w-full`}
        />
      </label>
      <label className={`${ROTULO} w-[110px]`}>
        Logins
        <input
          name="logins"
          defaultValue={plano.logins ?? ""}
          placeholder="sem limite"
          inputMode="numeric"
          className={`${CAMPO} w-full`}
        />
      </label>
      <label className="flex items-center gap-1.5 pb-1.5 text-[12.5px] text-[#3d3e44]">
        <input type="checkbox" name="ativo" defaultChecked={plano.ativo} className="h-3.5 w-3.5" />
        à venda
      </label>
      <button
        type="submit"
        disabled={!mexeu}
        className={`${BOTAO} ${mexeu ? "" : "opacity-40"}`}
      >
        Salvar
      </button>
      {estado.error && <p className="w-full text-[12px] text-[#8a3b3b]">{estado.error}</p>}
      {estado.ok && !mexeu && <p className="w-full text-[12px] text-[#2f5d3a]">Preço salvo — já vale na página de vendas.</p>}
    </form>
  );
}

/** Um degrau da escada de lançamento: por quanto e por quantos meses. */
export function FormDegrau({
  degrau,
}: {
  degrau: { codigo: string; ordem: number; valorMensal: number; meses: number; ativo: boolean };
}) {
  const [estado, agir] = useFormState<ResultadoAdmin, FormData>(salvarDegrau, {});
  const router = useRouter();
  const [mexeu, setMexeu] = useState(false);
  useEffect(() => {
    if (estado.ok) {
      setMexeu(false);
      router.refresh();
    }
  }, [estado.ok, router]);

  return (
    <form action={agir} onChange={() => setMexeu(true)} className="flex flex-wrap items-end gap-3 border-t border-[#ededea] py-3 first:border-t-0">
      <input type="hidden" name="codigo" value={degrau.codigo} />
      <input type="hidden" name="ordem" value={degrau.ordem} />
      <label className={`${ROTULO} w-[110px]`}>
        R$ por mês
        <input
          name="valor_mensal"
          defaultValue={degrau.valorMensal.toFixed(2).replace(".", ",")}
          inputMode="decimal"
          className={`${CAMPO} w-full`}
        />
      </label>
      <label className={`${ROTULO} w-[110px]`}>
        Por quantos meses
        <input name="meses" defaultValue={degrau.meses} inputMode="numeric" className={`${CAMPO} w-full`} />
      </label>
      <label className="flex items-center gap-1.5 pb-1.5 text-[12.5px] text-[#3d3e44]">
        <input type="checkbox" name="ativo" defaultChecked={degrau.ativo} className="h-3.5 w-3.5" />
        oferecendo
      </label>
      <button type="submit" disabled={!mexeu} className={`${BOTAO} ${mexeu ? "" : "opacity-40"}`}>
        Salvar
      </button>
      {estado.error && <p className="w-full text-[12px] text-[#8a3b3b]">{estado.error}</p>}
      {estado.ok && !mexeu && <p className="w-full text-[12px] text-[#2f5d3a]">Degrau salvo.</p>}
    </form>
  );
}
