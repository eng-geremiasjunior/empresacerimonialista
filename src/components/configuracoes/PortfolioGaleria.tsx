"use client";

// Configurações > Portfólio: grid de fotos de eventos realizados.
// Reordenação por botões ←/→ (funciona no toque do celular, ao contrário
// de drag-and-drop, e é o mesmo padrão das listas da Etapa 7).
// Foto inativa continua existindo — só não vai para a proposta.

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  atualizarFoto,
  excluirFoto,
  salvarOrdem,
  MAX_FOTOS_ATIVAS,
  type PortfolioFoto,
} from "@/lib/portfolio";
import { UploadFotosPortfolio } from "./UploadFotosPortfolio";

export function PortfolioGaleria({
  empresaId,
  inicial,
}: {
  empresaId: string;
  inicial: PortfolioFoto[];
}) {
  const [fotos, setFotos] = useState<PortfolioFoto[]>(inicial);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  // Dois refs: a sheet do celular e o dropdown do desktop existem no DOM ao
  // mesmo tempo (o dropdown só some via `hidden lg:block`). Com um ref só, o
  // último render venceria e clicar DENTRO da sheet fecharia o menu.
  const sheetRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora (mesmo padrão do cronograma).
  useEffect(() => {
    if (!menuAberto) return;
    function fora(e: MouseEvent) {
      const alvo = e.target as Node;
      const dentro =
        sheetRef.current?.contains(alvo) || dropRef.current?.contains(alvo);
      if (!dentro) setMenuAberto(null);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [menuAberto]);

  const ativas = fotos.filter((f) => f.ativo).length;

  async function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= fotos.length) return;
    const copia = [...fotos];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setFotos(copia);
    setMenuAberto(null);
    const res = await salvarOrdem(copia.map((f) => f.id));
    if (res.error) {
      setErro(res.error);
      setFotos(fotos); // desfaz na tela se o banco recusou
    }
  }

  async function alternarAtivo(foto: PortfolioFoto) {
    setMenuAberto(null);
    const novo = !foto.ativo;
    setFotos((prev) =>
      prev.map((f) => (f.id === foto.id ? { ...f, ativo: novo } : f))
    );
    const res = await atualizarFoto(foto.id, { ativo: novo });
    if (res.error) {
      setErro(res.error);
      setFotos((prev) =>
        prev.map((f) => (f.id === foto.id ? { ...f, ativo: foto.ativo } : f))
      );
    }
  }

  async function remover(foto: PortfolioFoto) {
    setMenuAberto(null);
    if (!confirm("Excluir esta foto do portfólio?")) return;
    const antes = fotos;
    setFotos((prev) => prev.filter((f) => f.id !== foto.id));
    const res = await excluirFoto(foto);
    if (res.error) {
      setErro(res.error);
      setFotos(antes);
    }
  }

  async function salvarLegenda(foto: PortfolioFoto) {
    const texto = rascunho.trim();
    setEditando(null);
    setFotos((prev) =>
      prev.map((f) => (f.id === foto.id ? { ...f, legenda: texto || null } : f))
    );
    const res = await atualizarFoto(foto.id, { legenda: texto || null });
    if (res.error) setErro(res.error);
  }

  const acoes = (foto: PortfolioFoto, i: number) => (
    <>
      <button
        onClick={() => {
          setRascunho(foto.legenda ?? "");
          setEditando(foto.id);
          setMenuAberto(null);
        }}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
      >
        <Pencil size={15} /> Editar legenda
      </button>
      <button
        onClick={() => alternarAtivo(foto)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
      >
        {foto.ativo ? <EyeOff size={15} /> : <Eye size={15} />}
        {foto.ativo ? "Desativar" : "Ativar"}
      </button>
      <button
        onClick={() => mover(i, -1)}
        disabled={i === 0}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
      >
        <ArrowLeft size={15} /> Mover para trás
      </button>
      <button
        onClick={() => mover(i, 1)}
        disabled={i === fotos.length - 1}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
      >
        <ArrowRight size={15} /> Mover para frente
      </button>
      <button
        onClick={() => remover(foto)}
        className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
      >
        <Trash2 size={15} /> Excluir
      </button>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <UploadFotosPortfolio
          empresaId={empresaId}
          proximaOrdem={fotos.length}
          onEnviadas={(novas) => setFotos((prev) => [...prev, ...novas])}
        />
        {fotos.length > 0 && (
          <span className="text-xs text-gray-500">
            {ativas} {ativas === 1 ? "foto ativa" : "fotos ativas"}
          </span>
        )}
      </div>

      {ativas > MAX_FOTOS_ATIVAS && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Você tem {ativas} fotos ativas. Acima de {MAX_FOTOS_ATIVAS} a seção
          “Eventos realizados” fica longa e a proposta demora a carregar no
          celular — considere desativar as menos representativas.
        </p>
      )}

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {fotos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">
          Nenhuma foto ainda. Adicione fotos dos seus eventos para mostrar
          seu trabalho nas propostas.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {fotos.map((foto, i) => (
            <div key={foto.id} className="space-y-1.5">
              <div
                className={`group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 ${
                  foto.ativo ? "" : "opacity-40"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto.url}
                  alt={foto.legenda ?? `Foto ${i + 1} do portfólio`}
                  className="h-full w-full object-cover"
                />

                {!foto.ativo && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-gray-900/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Inativa
                  </span>
                )}

                <button
                  onClick={() =>
                    setMenuAberto(menuAberto === foto.id ? null : foto.id)
                  }
                  aria-label="Opções da foto"
                  className="absolute right-1.5 top-1.5 rounded-md bg-white/90 p-1 text-gray-700 shadow-sm hover:bg-white"
                >
                  <MoreVertical size={16} />
                </button>

                {menuAberto === foto.id && (
                  <>
                    {/* Celular/tablet: bottom sheet — dropdown em miniatura
                        sai da tela nas colunas da direita. */}
                    <div className="fixed inset-0 z-50 flex items-end bg-black/30 lg:hidden">
                      <div
                        ref={sheetRef}
                        className="w-full rounded-t-2xl bg-white pb-2 pt-1"
                      >
                        <div className="mx-auto my-2 h-1 w-10 rounded-full bg-gray-300" />
                        {acoes(foto, i)}
                      </div>
                    </div>
                    {/* Desktop: dropdown ancorado no botão. */}
                    <div
                      ref={dropRef}
                      className="absolute right-1.5 top-9 z-20 hidden w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg lg:block"
                    >
                      {acoes(foto, i)}
                    </div>
                  </>
                )}
              </div>

              {editando === foto.id ? (
                <div className="space-y-1">
                  <input
                    autoFocus
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") salvarLegenda(foto);
                      if (e.key === "Escape") setEditando(null);
                    }}
                    placeholder="Casamento Marina & Pedro"
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:border-gray-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => salvarLegenda(foto)}
                      className="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-700"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditando(null)}
                      className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="truncate text-xs text-gray-500">
                  {foto.legenda || <span className="text-gray-300">Sem legenda</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
