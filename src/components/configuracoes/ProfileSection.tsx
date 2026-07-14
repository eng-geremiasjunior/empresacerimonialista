"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import {
  removeAvatar,
  updateDisplayName,
  uploadAvatar,
  validateAvatarFile,
} from "@/lib/avatar";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-100";

type Props = {
  initialAvatarUrl: string | null;
  initialName: string;
  email: string;
  initials: string;
};

export function ProfileSection({
  initialAvatarUrl,
  initialName,
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

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await updateDisplayName(name);
    setBusy(false);
    setMessage(
      result.error
        ? { kind: "error", text: result.error }
        : { kind: "ok", text: "Nome salvo." }
    );
    if (!result.error) router.refresh();
  }

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
