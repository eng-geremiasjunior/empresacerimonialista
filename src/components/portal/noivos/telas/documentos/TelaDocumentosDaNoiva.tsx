"use client";

// Os documentos da noiva que abriu a conta sozinha (04/10/2026), no
// desenho da tela Documentos do portal (os dois cartões, a linha creme
// com o ícone): à esquerda os contratos — um por fornecedor dos gastos,
// "Anexar o contrato" ou "Ver" e "Trocar", e "Anexar outro contrato" de
// quem ainda não está lá —; à direita os comprovantes dos pagamentos
// feitos. O arquivo sobe do aparelho direto para o armazenamento (como o
// do fornecedor) e abre pela rota do portal.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContratoDaNoiva, DocumentosDaNoiva } from "@/lib/supabase/portal-documentos-da-noiva";
import type { PagamentoDaNoiva } from "@/lib/supabase/portal-orcamento";
import { createClient } from "@/lib/supabase/client";
import { enviarArquivo } from "@/lib/contratos-cliente";
import { LIMITE_BYTES, MIMES_ACEITOS } from "@/lib/contratos";
import { brl } from "@/components/planejamento/celebra";
import {
  confirmarContratoDaNoiva,
  prepararContratoDaNoiva,
  salvarComprovanteDaNoiva,
} from "@/app/(portal)/portal/[eventoId]/documentos/noiva-actions";
import { Eyebrow, Icone } from "../../primitivas";
import { usePortalNoivos } from "../../contexto";
import "./documentos.css";
import "./documentos-noiva.css";

const ACEITA_CONTRATO = MIMES_ACEITOS.join(",");
const ACEITA_COMPROVANTE = "application/pdf,image/jpeg,image/png,image/webp";
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Um botão que abre o seletor de arquivo (o input fica escondido). */
function BotaoArquivo({
  rotulo,
  aceita,
  desligado,
  escolher,
  rotuloAria,
}: {
  rotulo: string;
  aceita: string;
  desligado: boolean;
  escolher: (f: File) => void;
  rotuloAria: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={aceita}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) escolher(f);
        }}
      />
      <button type="button" className="pn-docn-anexar" disabled={desligado} onClick={() => ref.current?.click()} aria-label={rotuloAria}>
        {rotulo}
      </button>
    </>
  );
}

export function TelaDocumentosDaNoiva({ documentos }: { documentos: DocumentosDaNoiva }) {
  const { eventoId, base, avisar } = usePortalNoivos();
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [subindo, setSubindo] = useState<string | null>(null);
  const [outro, setOutro] = useState(false);
  const [deQuem, setDeQuem] = useState("");
  const ocupado = enviando || subindo !== null;

  function grande(f: File): boolean {
    if (f.size <= LIMITE_BYTES) return false;
    avisar("O arquivo passa de 10 MB. Tente em PDF.", true);
    return true;
  }

  function anexarContrato(chave: string, fornecedor: { supplierId: string | null; nome: string }, f: File) {
    if (grande(f)) return;
    if (!(MIMES_ACEITOS as readonly string[]).includes(f.type)) {
      avisar("Envie PDF, foto ou documento do Word.", true);
      return;
    }
    setSubindo(chave);
    iniciar(async () => {
      try {
        const prep = await prepararContratoDaNoiva(eventoId, fornecedor, { nome: f.name, tipo: f.type });
        if ("error" in prep) return avisar(prep.error, true);
        const env = await enviarArquivo(prep.permissao, f);
        if (!env.ok) return avisar(env.erro, true);
        const r = await confirmarContratoDaNoiva(eventoId, prep.solicitacaoId, prep.permissao.caminho, f.name);
        if ("error" in r) return avisar(r.error, true);
        avisar("Contrato anexado");
        setOutro(false);
        setDeQuem("");
        router.refresh();
      } finally {
        setSubindo(null);
      }
    });
  }

  function anexarComprovante(p: PagamentoDaNoiva, f: File) {
    if (grande(f)) return;
    if (!ACEITA_COMPROVANTE.split(",").includes(f.type)) {
      avisar("Envie PDF ou foto.", true);
      return;
    }
    setSubindo(p.id);
    iniciar(async () => {
      try {
        const ext = f.type === "application/pdf" ? "pdf" : f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
        const caminho = `${eventoId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await createClient().storage.from("comprovantes").upload(caminho, f, { contentType: f.type, upsert: false });
        if (error) return avisar("Não deu para enviar o arquivo. Tente de novo.", true);
        const r = await salvarComprovanteDaNoiva(eventoId, p.id, caminho, f.name);
        if ("error" in r) return avisar(r.error, true);
        avisar("Comprovante anexado");
        router.refresh();
      } finally {
        setSubindo(null);
      }
    });
  }

  const arquivo = (q: string) => `${base}/documentos/arquivo?${q}`;

  return (
    <div className="pn-documentos pn-docn">
      {/* ---------- os contratos ---------- */}
      <section className="pn-documentos-card" aria-labelledby="pn-docn-contratos">
        <Eyebrow>Documentos</Eyebrow>
        <h1 id="pn-docn-contratos" className="pn-t pn-documentos-titulo">
          Contratos
        </h1>
        {documentos.contratos.length === 0 && !outro && <p className="pn-docn-vazio">Nenhum contrato ainda.</p>}
        {documentos.contratos.length > 0 && (
          <div className="pn-documentos-lista">
            {documentos.contratos.map((c: ContratoDaNoiva) => (
              <div key={c.supplierId} className="pn-documentos-doc">
                <div className="pn-documentos-doc-icone">
                  <Icone nome="contract" tamanho={22} />
                </div>
                <div className="pn-documentos-doc-texto">
                  <div className="pn-documentos-doc-nome">{c.fornecedor}</div>
                  <div className="pn-documentos-doc-info">{c.arquivo ? c.arquivo : (c.assunto ?? "sem contrato ainda")}</div>
                </div>
                {c.arquivo && (
                  <a className="pn-documentos-ver" href={arquivo(`contrato=${c.supplierId}`)} target="_blank" rel="noopener noreferrer">
                    Ver
                  </a>
                )}
                <BotaoArquivo
                  rotulo={subindo === c.supplierId ? "Enviando…" : c.arquivo ? "Trocar" : "Anexar"}
                  rotuloAria={`${c.arquivo ? "Trocar" : "Anexar"} o contrato de ${c.fornecedor}`}
                  aceita={ACEITA_CONTRATO}
                  desligado={ocupado}
                  escolher={(f) => anexarContrato(c.supplierId, { supplierId: c.supplierId, nome: c.fornecedor }, f)}
                />
              </div>
            ))}
          </div>
        )}
        {outro ? (
          <div className="pn-docn-outro">
            <label htmlFor="pn-docn-dequem" className="pn-docn-rotulo">
              De quem é o contrato
            </label>
            <input
              id="pn-docn-dequem"
              className="pn-docn-campo"
              value={deQuem}
              maxLength={80}
              list="pn-docn-fornecedores"
              onChange={(e) => setDeQuem(e.target.value)}
              placeholder="O fornecedor"
            />
            <datalist id="pn-docn-fornecedores">
              {documentos.fornecedores.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <div className="pn-docn-acoes">
              <BotaoArquivo
                rotulo={subindo === "outro" ? "Enviando…" : "Escolher o arquivo"}
                rotuloAria="Escolher o arquivo do contrato"
                aceita={ACEITA_CONTRATO}
                desligado={ocupado || !deQuem.trim()}
                escolher={(f) => anexarContrato("outro", { supplierId: null, nome: deQuem }, f)}
              />
              <button type="button" className="pn-docn-link" onClick={() => setOutro(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="pn-docn-mais" onClick={() => setOutro(true)}>
            <Icone nome="add" tamanho={20} />
            Anexar outro contrato
          </button>
        )}
      </section>

      {/* ---------- os comprovantes ---------- */}
      <section className="pn-documentos-card" aria-labelledby="pn-docn-comprovantes">
        <Eyebrow>Pagamentos feitos</Eyebrow>
        <h2 id="pn-docn-comprovantes" className="pn-t pn-documentos-titulo">
          Comprovantes
        </h2>
        {documentos.pagos.length === 0 ? (
          <p className="pn-docn-vazio">Nenhum pagamento feito ainda.</p>
        ) : (
          <div className="pn-documentos-lista">
            {documentos.pagos.map((p) => (
              <div key={p.id} className="pn-documentos-doc">
                <div className="pn-documentos-doc-icone">
                  <Icone nome="receipt_long" tamanho={22} />
                </div>
                <div className="pn-documentos-doc-texto">
                  <div className="pn-documentos-doc-nome">{p.fornecedor ? `${p.titulo} · ${p.fornecedor}` : p.titulo}</div>
                  <div className="pn-documentos-doc-info">
                    {ddmm(p.vencimento)} · {brl(p.valor)}
                    {p.comprovante ? ` · ${p.comprovante}` : ""}
                  </div>
                </div>
                {p.comprovante ? (
                  <a className="pn-documentos-ver" href={arquivo(`comprovante=${p.id}`)} target="_blank" rel="noopener noreferrer">
                    Ver
                  </a>
                ) : (
                  <BotaoArquivo
                    rotulo={subindo === p.id ? "Enviando…" : "Anexar"}
                    rotuloAria={`Anexar o comprovante de ${p.titulo}`}
                    aceita={ACEITA_COMPROVANTE}
                    desligado={ocupado}
                    escolher={(f) => anexarComprovante(p, f)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
