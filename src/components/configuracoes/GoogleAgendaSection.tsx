"use client";

// A conexão com o Google Agenda (168), em Configurações. Por PESSOA: cada
// uma conecta a própria conta e recebe os eventos que enxerga no sistema.
// Fala em tempo e em consequência: "conectada desde 22/09", "o Google
// deixou de aceitar em 12/10" — nunca "status: ativo".

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { desconectarGoogle } from "@/app/(app)/configuracoes/google-actions";

export type ConexaoGoogleNaTela = {
  google_email: string | null;
  conectado_em: string;
  pode_ler_ocupado: boolean;
  falha: string | null;
  falha_em: string | null;
};

function diaMes(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}` : "";
}

const AVISOS: Record<string, string> = {
  ok: "Conectado. Seus eventos e compromissos estão indo para a agenda eOrganizei do seu Google.",
  ok_sem_ocupado:
    "Conectado. Seus eventos estão indo para o Google; como você não permitiu ler a disponibilidade, os horários da sua agenda pessoal não entram na oferta a fornecedores.",
  recusado:
    "A conexão não foi feita: sem a permissão de criar uma agenda, o sistema não tem onde gravar. Tente de novo e marque as permissões.",
  erro: "Não foi possível conectar agora. Tente de novo em instantes.",
};

const botao =
  "inline-block rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50";

export function GoogleAgendaSection({
  conexao,
  aviso,
  motivo = null,
}: {
  conexao: ConexaoGoogleNaTela | null;
  /** o que a volta do Google disse (?google=) */
  aviso: string | null;
  /** o código curto de onde a volta falhou (?motivo=), para o suporte */
  motivo?: string | null;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function desconectar() {
    if (!confirm("Desconectar? A agenda eOrganizei é apagada do seu Google. Suas outras agendas não mudam.")) return;
    iniciar(async () => {
      setErro(null);
      const r = await desconectarGoogle();
      if (r.error) {
        setErro(r.error);
        return;
      }
      router.replace("/configuracoes");
      router.refresh();
    });
  }

  const falhou = conexao?.falha === "token";

  return (
    <section className="rounded-xl border border-gray-200 bg-white px-6 py-5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <CalendarDays size={15} className="text-gray-500" />
        Google Agenda
      </h2>

      {aviso && AVISOS[aviso] && (
        <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700" role="status">
          {AVISOS[aviso]}
          {aviso === "erro" && motivo ? ` (código: ${motivo})` : ""}
        </p>
      )}
      {erro && (
        <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-900" role="alert">
          {erro}
        </p>
      )}

      {!conexao && (
        <>
          <p className="mt-0.5 text-xs text-gray-500">
            O dia de cada evento e os compromissos com hora aparecem no seu Google, numa agenda
            chamada eOrganizei, e no celular. Suas outras agendas não mudam.
          </p>
          <a href="/api/google/conectar" className={`${botao} mt-3`}>
            Conectar Google Agenda →
          </a>
        </>
      )}

      {conexao && falhou && (
        <>
          <p className="mt-0.5 text-xs text-gray-900">
            O Google deixou de aceitar a conexão em {diaMes(conexao.falha_em)}
            {conexao.google_email ? ` (${conexao.google_email})` : ""}. Conecte de novo para a agenda
            voltar a receber os eventos.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/api/google/conectar" className={botao}>
              Conectar de novo →
            </a>
            <button type="button" onClick={desconectar} disabled={pendente} className={botao}>
              {pendente ? "Desconectando…" : "Desconectar"}
            </button>
          </div>
        </>
      )}

      {conexao && !falhou && (
        <>
          <p className="mt-0.5 text-xs text-gray-500">
            Conectada{conexao.google_email ? ` como ${conexao.google_email}` : ""} desde{" "}
            {diaMes(conexao.conectado_em)}.{" "}
            {conexao.pode_ler_ocupado
              ? "Os horários ocupados da sua agenda principal contam quando o sistema oferece reunião a um fornecedor."
              : "Você não permitiu ler a sua disponibilidade: os horários da sua agenda pessoal não entram na oferta a fornecedores. Para permitir, conecte de novo."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!conexao.pode_ler_ocupado && (
              <a href="/api/google/conectar" className={botao}>
                Conectar de novo →
              </a>
            )}
            <button type="button" onClick={desconectar} disabled={pendente} className={botao}>
              {pendente ? "Desconectando…" : "Desconectar"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
