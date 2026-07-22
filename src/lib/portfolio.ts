// Galeria de portfólio — fotos de eventos realizados usadas como prova
// social na proposta. Mesmo padrão de lib/empresa-logo.ts: bucket público,
// path {empresa_id}/{arquivo} (a pasta é o que a policy de storage valida).
//
// As fotos vêm da câmera do celular (5–10 MB cada), então comprimimos no
// browser antes de subir: sem isso, 12 fotos viram ~100 MB de storage e uma
// landing page que não carrega no 4G do salão de festas.

import { createClient } from "@/lib/supabase/client";

export type PortfolioFoto = {
  id: string;
  url: string;
  storage_path: string | null;
  legenda: string | null;
  ordem: number;
  ativo: boolean;
};

// Limite sugerido de fotos ATIVAS — não bloqueia, só avisa (a seção
// "Eventos realizados" perde impacto se virar galeria infinita).
export const MAX_FOTOS_ATIVAS = 12;

const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024; // sanidade: 20 MB antes de comprimir
const MAX_FINAL_BYTES = 5 * 1024 * 1024; // 5 MB depois de comprimir
const MAX_LADO = 1600; // px — suficiente para exibição full-width
const QUALIDADE = 0.82;

export function validarArquivo(file: File): string | null {
  if (!file.type.startsWith("image/")) return "não é uma imagem";
  if (file.size > MAX_ORIGINAL_BYTES) return "maior que 20 MB";
  return null;
}

// Redimensiona para no máximo MAX_LADO no maior lado e reencoda em JPEG.
// Se qualquer etapa falhar (formato exótico, canvas indisponível), devolve
// o arquivo original — upload funcionando importa mais que compressão.
async function comprimir(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALIDADE)
    );
    // Só troca se realmente ficou menor.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function listarFotos(
  empresaId: string
): Promise<PortfolioFoto[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("portfolio_fotos")
    .select("id, url, storage_path, legenda, ordem, ativo")
    .eq("empresa_id", empresaId)
    .order("ordem")
    .order("created_at");
  return (data ?? []) as PortfolioFoto[];
}

// Upload em lote. Processa uma foto por vez (não satura a conexão do
// celular) e reporta progresso a cada arquivo concluído.
export async function uploadFotos(
  empresaId: string,
  arquivos: File[],
  ordemInicial: number,
  onProgresso?: (feitos: number, total: number) => void
): Promise<{ fotos: PortfolioFoto[]; erros: string[] }> {
  const supabase = createClient();
  const fotos: PortfolioFoto[] = [];
  const erros: string[] = [];

  for (let i = 0; i < arquivos.length; i++) {
    const file = arquivos[i];
    const invalido = validarArquivo(file);
    if (invalido) {
      erros.push(`${file.name}: ${invalido}`);
      onProgresso?.(i + 1, arquivos.length);
      continue;
    }

    const blob = await comprimir(file);
    if (blob.size > MAX_FINAL_BYTES) {
      erros.push(`${file.name}: ainda maior que 5 MB depois de comprimir`);
      onProgresso?.(i + 1, arquivos.length);
      continue;
    }

    const ext = blob.type === "image/jpeg" ? "jpg" : file.name.split(".").pop() || "jpg";
    const path = `${empresaId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErro } = await supabase.storage
      .from("portfolio-fotos")
      .upload(path, blob, { contentType: blob.type, upsert: false });

    if (upErro) {
      erros.push(`${file.name}: falha no envio`);
      onProgresso?.(i + 1, arquivos.length);
      continue;
    }

    const { data: pub } = supabase.storage
      .from("portfolio-fotos")
      .getPublicUrl(path);

    const { data: linha, error: dbErro } = await supabase
      .from("portfolio_fotos")
      .insert({
        empresa_id: empresaId,
        url: pub.publicUrl,
        storage_path: path,
        ordem: ordemInicial + fotos.length,
      })
      .select("id, url, storage_path, legenda, ordem, ativo")
      .single();

    if (dbErro || !linha) {
      // Não deixa arquivo órfão no bucket se a linha não entrou.
      await supabase.storage.from("portfolio-fotos").remove([path]);
      erros.push(`${file.name}: enviada, mas não foi possível salvar`);
    } else {
      fotos.push(linha as PortfolioFoto);
    }
    onProgresso?.(i + 1, arquivos.length);
  }

  return { fotos, erros };
}

export async function atualizarFoto(
  id: string,
  campos: { legenda?: string | null; ativo?: boolean }
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("portfolio_fotos")
    .update(campos)
    .eq("id", id);
  return error ? { error: "Não foi possível salvar a alteração." } : {};
}

export async function excluirFoto(
  foto: PortfolioFoto
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("portfolio_fotos")
    .delete()
    .eq("id", foto.id);
  if (error) return { error: "Não foi possível excluir a foto." };
  // O arquivo só sai do bucket depois que a linha some — órfão no storage
  // é bem menos ruim que foto fantasma na galeria.
  if (foto.storage_path) {
    await supabase.storage.from("portfolio-fotos").remove([foto.storage_path]);
  }
  return {};
}

// Grava a ordem da tela: posição no array vira o campo `ordem`.
export async function salvarOrdem(
  ids: string[]
): Promise<{ error?: string }> {
  const supabase = createClient();
  const res = await Promise.all(
    ids.map((id, i) =>
      supabase.from("portfolio_fotos").update({ ordem: i }).eq("id", id)
    )
  );
  return res.some((r) => r.error)
    ? { error: "Não foi possível salvar a nova ordem." }
    : {};
}
