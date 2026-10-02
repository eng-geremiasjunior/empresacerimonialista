// A moldura de todas as folhas impressas (01/10/2026, pedido do dono:
// "quando imprimir, deve ter nossa logomarca, um rodapé bonitinho com
// nosso site — precisamos ser mais profissionais").
//
// Em cima, a marca; embaixo, quem preparou a folha (a empresa dela) e o
// endereço do eorganizei. No papel o rodapé se repete em toda página
// (position: fixed na impressão) e a margem de baixo da página abre
// espaço para ele. As folhas continuam monocromáticas de propósito
// (impressora de recepção de hotel): o "e" sai em cinza escuro no papel.

import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { Simbolo, Palavra } from "@/components/marca/Marca";

const CSS = `
.imp-moldura-topo{max-width:210mm;margin:0 auto;padding:18px 24px 0;display:flex;justify-content:flex-end;align-items:center}
.imp-moldura-rodape{max-width:210mm;margin:24px auto 0;padding:10px 24px 18px;border-top:1px solid #e7e5e4;display:flex;justify-content:space-between;align-items:center;gap:16px;font-family:var(--font-ui,system-ui,sans-serif);font-size:10.5px;color:#78716c}
.imp-moldura-rodape b{color:#44403c;font-weight:600}
.imp-moldura-folha{width:100%;border-collapse:collapse}
.imp-moldura-folha>tbody>tr>td{padding:0}
.imp-moldura-folha>tfoot{display:none}
.imp-moldura-marca{display:inline-flex;align-items:center;gap:6px;color:#44403c;font-weight:600;letter-spacing:-.01em}
@media print{
  @page{margin:12mm 12mm 14mm}
  html,body{background:#fff!important}
  .imp-moldura-topo{padding:0 0 6px;background:#fff}
  /* o rodapé se repete no pé de cada página; o conteúdo deixa o espaço dele */
  .imp-pagina{background:#fff}
  /* a faixa vazia que se repete no pé de cada página: o conteúdo para
     antes do rodapé em vez de passar por baixo dele */
  .imp-moldura-folha>tfoot{display:table-footer-group}
  .imp-moldura-folha>tfoot td{height:11mm;padding:0}
  .imp-moldura-rodape{position:fixed;left:0;right:0;bottom:0;max-width:none;margin:0;padding:5px 0 0;background:#fff}
}
`;

async function nomeDaEmpresa(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: m } = await supabase
      .from("membros_equipe")
      .select("empresa_id")
      .eq("user_id", user.id)
      .eq("status", "ativo")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const empresaId = (m as { empresa_id?: string } | null)?.empresa_id;
    if (!empresaId) return null;
    const { data: e } = await supabase.from("empresas").select("nome").eq("id", empresaId).maybeSingle();
    const nome = ((e as { nome?: string | null } | null)?.nome ?? "").trim();
    return nome || null;
  } catch {
    return null;
  }
}

export default async function MolduraDasFolhas({ children }: { children: ReactNode }) {
  const empresa = await nomeDaEmpresa();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="imp-moldura-topo" aria-label="eorganizei">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Simbolo tamanho={22} />
          <Palavra tamanho={15} />
        </span>
      </div>
      <table className="imp-moldura-folha" role="presentation">
        <tbody>
          <tr>
            <td>{children}</td>
          </tr>
        </tbody>
        <tfoot aria-hidden>
          <tr>
            <td />
          </tr>
        </tfoot>
      </table>
      <footer className="imp-moldura-rodape">
        <span>{empresa ? <>Preparado por <b>{empresa}</b></> : "Folha do evento"}</span>
        <span className="imp-moldura-marca">
          <Simbolo tamanho={14} />
          eorganizei.com.br
        </span>
      </footer>
    </>
  );
}
