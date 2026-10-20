"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import {
  atualizarMeuPerfil,
  removeAvatar,
  uploadAvatar,
  validateAvatarFile,
} from "@/lib/avatar";
import { definirAvisoWhatsapp } from "@/lib/avisos-cliente";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-100";

type Props = {
  initialAvatarUrl: string | null;
  initialName: string;
  initialWhatsapp: string;
  initialAvisarWhatsapp: boolean;
  /** o número oficial do sistema já existe no ambiente */
  transporteWhatsappAtivo: boolean;
  /** o resumo diário de tarefas por e-mail (19/10/2026); ligado por padrão */
  initialResumoEmail?: boolean;
  email: string;
  initials: string;
};

export function ProfileSection({
  initialAvatarUrl,
  initialName,
  initialWhatsapp,
  initialAvisarWhatsapp,
  transporteWhatsappAtivo,
  initialResumoEmail = true,
  email,
  initials,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null
  );
  const [name, setName] = useState(initialName);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [avisar, setAvisar] = useState(initialAvisarWhatsapp);
  const [resumoEmail, setResumoEmail] = useState(initialResumoEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    kind: "error" | "ok";
    text: string;
  } | null>(null);

  function pickFile(file: File | undefined) {
    setMessage(null);
    if (!file) return;
    const invalid = validateAvatarFile(file);
    if (invalid) {
      setMessage({ kind: "error", text: invalid });
      return;
    }
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview({ file, url: URL.createObjectURL(file) });
  }

  async function confirmUpload() {
    if (!preview) return;
    setBusy(true);
    const result = await uploadAvatar(preview.file);
    setBusy(false);
    if (result.error) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    URL.revokeObjectURL(preview.url);
    setPreview(null);
    setAvatarUrl(result.url ?? null);
    setMessage({ kind: "ok", text: "Foto atualizada." });
    router.refresh(); // atualiza o avatar do header
  }

  function cancelPreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  async function handleRemove() {
    if (!confirm("Remover a foto de perfil?")) return;
    setBusy(true);
    const result = await removeAvatar();
    setBusy(false);
    if (result.error) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    setAvatarUrl(null);
    setMessage({ kind: "ok", text: "Foto removida." });
    router.refresh();
  }

  // Salva na hora: interruptor que só vale depois de "Salvar alterações"
  // é interruptor que a pessoa acha que ligou e não ligou.
  async function handleAvisar(proximo: boolean) {
    const anterior = avisar;
    setAvisar(proximo); // otimista
    setMessage(null);
    const r = await definirAvisoWhatsapp(proximo);
    if ("error" in r) {
      setAvisar(anterior);
      setMessage({ kind: "error", text: r.error });
      return;
    }
    setAvisar(r.ativo);
  }

  // O resumo de tarefas por e-mail mora na conta (user_metadata): é da
  // pessoa, não da empresa. Salva na hora, como o aviso do WhatsApp.
  async function handleResumoEmail(proximo: boolean) {
    const anterior = resumoEmail;
    setResumoEmail(proximo);
    setMessage(null);
    const { error } = await createBrowserClient().auth.updateUser({ data: { resumo_tarefas_email: proximo } });
    if (error) {
      setResumoEmail(anterior);
      setMessage({ kind: "error", text: "Não foi possível mudar o resumo agora." });
    }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await atualizarMeuPerfil(name, whatsapp);
    setBusy(false);
    setMessage(
      result.error
        ? { kind: "error", text: result.error }
        : { kind: "ok", text: "Salvo." }
    );
    if (!result.error) router.refresh();
  }

  // O interruptor depende do número JÁ SALVO, não do que está digitado:
  // é o valor gravado que a rotina diária vai ler.
  const numeroSalvo = initialWhatsapp.trim().length > 0;
  const motivoBloqueio = !numeroSalvo
    ? "Salve seu WhatsApp acima para ligar o aviso."
    : !transporteWhatsappAtivo
      ? "O WhatsApp do sistema ainda não está no ar. O aviso continua chegando no sino."
      : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-gray-700">Meu perfil</h2>

      <div className="mt-5 flex flex-wrap items-center gap-5">
        <Avatar
          src={preview ? preview.url : avatarUrl}
          fallback={initials}
          size="lg"
        />

        <div className="space-y-2">
          {preview ? (
            <div className="flex items-center gap-2">
              <button
                onClick={confirmUpload}
                disabled={busy}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {busy ? "Enviando..." : "Confirmar foto"}
              </button>
              <button
                onClick={cancelPreview}
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-900"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-50"
              >
                <Camera size={15} />
                Alterar foto
              </button>
              {avatarUrl && (
                <button
                  onClick={handleRemove}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  Remover foto
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400">
            JPG, PNG ou WebP · máximo 2 MB
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <form onSubmit={handleSaveName} className="mt-6 max-w-md space-y-4">
        <div>
          <label
            htmlFor="profile_name"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Nome
          </label>
          <input
            id="profile_name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-400">
            É o nome que a cliente vê no portal dela.
          </p>
        </div>
        <div>
          <label
            htmlFor="profile_whatsapp"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            WhatsApp
          </label>
          <input
            id="profile_whatsapp"
            type="tel"
            inputMode="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="(31) 99999-0000"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-400">
            É por aqui que a cliente fala com você.
          </p>

          <label className="mt-3 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={avisar}
              disabled={busy || !numeroSalvo || !transporteWhatsappAtivo}
              onChange={(e) => handleAvisar(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 accent-gray-900 disabled:opacity-40"
            />
            <span className="text-sm text-gray-700">
              Avisar neste número
              <span className="mt-0.5 block text-xs text-gray-400">
                {motivoBloqueio ??
                  "Um aviso por dia, na véspera, com o que vence amanhã."}
              </span>
            </span>
          </label>
        </div>
        <div>
          <label
            htmlFor="profile_email"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            E-mail
          </label>
          <input
            id="profile_email"
            type="email"
            value={email}
            readOnly
            disabled
            className={`${inputClass} cursor-not-allowed bg-gray-50 text-gray-500`}
          />
          <label className="mt-3 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={resumoEmail}
              onChange={(e) => handleResumoEmail(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 accent-gray-900"
            />
            <span className="text-sm text-gray-700">
              Resumo das tarefas por e-mail
              <span className="mt-0.5 block text-xs text-gray-400">
                Às 9h, só quando algo vence amanhã ou atrasou.
              </span>
            </span>
          </label>
        </div>

        {message && (
          <p
            role="status"
            className={`text-sm ${message.kind === "error" ? "text-red-600" : "text-emerald-600"}`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Salvar alterações
        </button>
      </form>
    </div>
  );
}
