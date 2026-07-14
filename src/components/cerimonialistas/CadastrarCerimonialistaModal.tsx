"use client";

// Modal de cadastro (com criação de login) e de edição de membro.
// No cadastro, a proprietária define a senha inicial; não há link de
// auto-cadastro nem e-mail automático nesta etapa.

import { useState, useTransition } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import {
  cadastrarCerimonialista,
  editarMembro,
} from "@/app/(app)/cerimonialistas/actions";
import {
  CARGO_LABELS,
  CARGOS_CADASTRO,
  ESPECIALIDADES,
  type MembroEquipe,
} from "@/lib/equipe-shared";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export function CadastrarCerimonialistaModal({
  editar,
  onClose,
  onSuccess,
}: {
  editar?: MembroEquipe; // presente = modo edição (sem e-mail/senha)
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [nome, setNome] = useState(editar?.nome ?? "");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState<string>(editar?.cargo ?? "cerimonialista");
  const [especialidades, setEspecialidades] = useState<string[]>(
    editar?.especialidades ?? []
  );
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleEspecialidade(tag: string) {
    setEspecialidades((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function salvar() {
    setErro(null);
    if (!editar && senha !== confirmar) {
      setErro("As senhas não conferem");
      return;
    }
    startTransition(async () => {
      const r = editar
        ? await editarMembro(editar.id, { nome, cargo, especialidades })
        : await cadastrarCerimonialista({
            nome,
            email,
            senha,
            cargo,
            especialidades,
          });
      if (r.error) {
        setErro(r.error);
        return;
      }
      onSuccess(
        editar
          ? "Alterações salvas."
          : "Cerimonialista cadastrada! Informe a ela o e-mail e a senha definida para que possa acessar o sistema."
      );
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {editar ? "Editar cerimonialista" : "Cadastrar cerimonialista"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Nome completo *
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Ana Paula Souza"
              autoFocus
              className={inputClass}
            />
          </div>

          {!editar && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                E-mail (será o login dela) *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana@exemplo.com"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Cargo *
            </label>
            <select
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className={inputClass}
            >
              {CARGOS_CADASTRO.map((c) => (
                <option key={c} value={c}>
                  {CARGO_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Especialidades
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ESPECIALIDADES.map((tag) => {
                const ativa = especialidades.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleEspecialidade(tag)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      ativa
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {!editar && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Senha inicial *
                </label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Confirmar senha *
                </label>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  minLength={6}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {erro && <p className="text-sm text-rose-600">{erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={pending}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {pending
                ? "Salvando…"
                : editar
                  ? "Salvar alterações"
                  : "Cadastrar e criar login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
