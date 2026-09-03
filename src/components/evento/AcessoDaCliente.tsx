"use client";

// Painel de acesso ao Portal da Cliente, dentro de "Editar evento".
//
// A senha provisória aparece UMA vez, na resposta da action — não fica
// guardada em lugar nenhum legível depois. A cerimonialista copia e passa
// para a cliente; se perder, gera outra.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PAPEL_PORTAL_LABELS, type PapelPortal } from "@/lib/portal-admin";
import { papeisPortalDoTipo } from "@/lib/papel";
import {
  criarAcessoDaCliente,
  novaSenhaProvisoria,
  reativarAcessoDaCliente,
  revogarAcessoDaCliente,
} from "@/app/(app)/eventos/[id]/acesso-cliente-actions";

export type AcessoLinha = {
  id: string;
  nome: string;
  email: string;
  papel: string;
  status: string;
};

const PAPEIS = Object.keys(PAPEL_PORTAL_LABELS) as PapelPortal[];

export function AcessoDaCliente({
  eventId,
  tipo,
  acessos,
  clienteSugerido,
}: {
  eventId: string;
  /** tipo do evento — decide os papéis oferecidos; sem ele, a lista completa */
  tipo?: string | null;
  acessos: AcessoLinha[];
  clienteSugerido: { id: string; nome: string; email: string | null } | null;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [abrindo, setAbrindo] = useState(false);
  const [nome, setNome] = useState(clienteSugerido?.nome ?? "");
  const [email, setEmail] = useState(clienteSugerido?.email ?? "");
  const papeis = tipo === undefined ? PAPEIS : papeisPortalDoTipo(tipo);
  const [papel, setPapel] = useState<PapelPortal>(papeis[0]);
  const [erro, setErro] = useState<string | null>(null);
  const [senha, setSenha] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  function tratar(r: Awaited<ReturnType<typeof criarAcessoDaCliente>>) {
    if ("error" in r) {
      setErro(r.error);
      setSenha(null);
      return;
    }
    setErro(null);
    setAviso(r.mensagem);
    if (r.senhaProvisoria) setSenha(r.senhaProvisoria);
    setAbrindo(false);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Acesso da cliente
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Quem da família acompanha o evento pelo portal.
          </p>
        </div>
        {!abrindo && (
          <button
            type="button"
            onClick={() => {
              setAbrindo(true);
              setSenha(null);
              setAviso(null);
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400"
          >
            Dar acesso
          </button>
        )}
      </div>

      {senha && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium text-emerald-800">
            Senha provisória — passe para a cliente e peça que ela troque no
            primeiro acesso.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded bg-white px-2 py-1 font-mono text-sm text-emerald-900">
              {senha}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(senha);
                setCopiado(true);
              }}
              className="text-xs text-emerald-700 underline"
            >
              {copiado ? "Copiada" : "Copiar"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-emerald-700">
            Ela aparece só agora. Se perder, gere outra.
          </p>
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-rose-600">{erro}</p>}
      {aviso && !senha && (
        <p className="mt-3 text-sm text-gray-600">{aviso}</p>
      )}

      {abrindo && (
        <div className="mt-3 space-y-2 rounded-lg border border-dashed border-gray-300 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-gray-500">Nome</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Marina Oliveira"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">E-mail</span>
              <input
                type="email"
                value={email ?? ""}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          {papeis.length > 1 && (
            <label className="block">
              <span className="text-xs text-gray-500">Papel no evento</span>
              <select
                value={papel}
                onChange={(e) => setPapel(e.target.value as PapelPortal)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {papeis.map((p) => (
                  <option key={p} value={p}>
                    {PAPEL_PORTAL_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={pendente}
              onClick={() =>
                startTransition(async () => {
                  const r = await criarAcessoDaCliente(eventId, {
                    nome,
                    email: email ?? "",
                    papel,
                    clientId: clienteSugerido?.id ?? null,
                  });
                  tratar(r);
                })
              }
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pendente ? "Criando…" : "Criar acesso"}
            </button>
            <button
              type="button"
              onClick={() => setAbrindo(false)}
              className="px-2 text-sm text-gray-500"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {acessos.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100">
          {acessos.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-900">
                  {a.nome}
                  <span className="ml-2 text-xs text-gray-500">
                    {PAPEL_PORTAL_LABELS[a.papel as PapelPortal] ?? a.papel}
                  </span>
                </p>
                <p className="truncate text-xs text-gray-500">{a.email}</p>
              </div>
              <div className="flex items-center gap-3">
                {a.status === "revogado" ? (
                  <>
                    <span className="text-xs text-gray-400">Revogado</span>
                    <button
                      type="button"
                      disabled={pendente}
                      onClick={() =>
                        startTransition(async () =>
                          tratar(await reativarAcessoDaCliente(eventId, a.id))
                        )
                      }
                      className="text-xs text-gray-600 underline"
                    >
                      Reativar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={pendente}
                      onClick={() =>
                        startTransition(async () =>
                          tratar(await novaSenhaProvisoria(eventId, a.id))
                        )
                      }
                      className="text-xs text-gray-600 underline"
                    >
                      Nova senha
                    </button>
                    <button
                      type="button"
                      disabled={pendente}
                      onClick={() =>
                        startTransition(async () =>
                          tratar(await revogarAcessoDaCliente(eventId, a.id))
                        )
                      }
                      className="text-xs text-gray-500 underline"
                    >
                      Revogar
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {acessos.length === 0 && !abrindo && (
        <p className="mt-3 text-sm text-gray-500">
          Ninguém tem acesso ainda.
        </p>
      )}
    </section>
  );
}
