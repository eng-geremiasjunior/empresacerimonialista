// O lado do navegador da mesma costura.
//
// O arquivo vai do aparelho do fornecedor direto para o armazenamento,
// sem passar pelo eOrganizei: contrato de casamento passa fácil dos 4,5 MB que
// uma função serverless aguenta no corpo da requisição.
//
// Este arquivo já sabe executar os dois modos de envio. Quando o
// armazenamento mudar para S3, o servidor passa a devolver `modo: "url"`
// e nada aqui — nem nos componentes — precisa ser reescrito.

import { createClient } from "@/lib/supabase/client";
import {
  BALDE_CONTRATOS,
  LIMITE_BYTES,
  type PermissaoDeEnvio,
} from "@/lib/contratos";

export async function enviarArquivo(
  permissao: PermissaoDeEnvio,
  arquivo: File
): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (arquivo.size > LIMITE_BYTES) {
    return { ok: false, erro: "O arquivo passa de 10 MB. Tente enviar em PDF." };
  }

  if (permissao.modo === "token") {
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(BALDE_CONTRATOS)
      .uploadToSignedUrl(permissao.caminho, permissao.token, arquivo);
    if (error) return { ok: false, erro: "Não deu para enviar o arquivo. Tente de novo." };
    return { ok: true };
  }

  // URL pré-assinada (S3 e afins)
  if (permissao.campos) {
    const form = new FormData();
    for (const [k, v] of Object.entries(permissao.campos)) form.append(k, v);
    form.append("file", arquivo);
    const r = await fetch(permissao.url, { method: permissao.metodo, body: form });
    return r.ok ? { ok: true } : { ok: false, erro: "Não deu para enviar o arquivo." };
  }

  const r = await fetch(permissao.url, {
    method: permissao.metodo,
    body: arquivo,
    headers: { "Content-Type": arquivo.type || "application/octet-stream" },
  });
  return r.ok ? { ok: true } : { ok: false, erro: "Não deu para enviar o arquivo." };
}
