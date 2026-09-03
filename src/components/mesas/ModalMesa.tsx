"use client";

// Adicionar mesa: forma, nome, cadeiras. Nada mais.
//
// A miniatura de cada forma é desenhada pela MESMA função do croqui
// (posicoesDasCadeiras) — o que ela escolhe aqui é exatamente o que vai
// aparecer no salão, sem ícone decorativo mentindo sobre o resultado.
//
// Tudo já vem preenchido: o próximo número, os lugares do tipo, uma
// mesa. Abrir e dar Enter resolve o caso comum; a quantidade existe
// para quando são dez iguais.

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  caixaDaMesa,
  LARGURA_CADEIRA_CM,
  MEDIDA_PADRAO,
  nomeTipoMesa,
  posicoesDasCadeiras,
  type Mesa,
  type TipoMesa,
} from "@/lib/croqui-core";
import { rotuloMesaPrincipalCurto } from "@/lib/papel";

const TIPOS: TipoMesa[] = [
  "redonda_8",
  "redonda_10",
  "retangular",
  "imperial",
  "noivos",
  "bolo",
];

/** desenho de cima da mesa com as cadeiras, no tamanho de um ícone */
export function MiniMesa({
  tipo,
  lugares,
  tamanho = 52,
}: {
  tipo: TipoMesa;
  lugares: number;
  tamanho?: number;
}) {
  const mesa = {
    id: "mini",
    rotulo: "",
    tipo,
    lugares,
    xCm: 0,
    yCm: 0,
    rotacao: 0,
    larguraCm: null,
    alturaCm: null,
    assentoMarcado: false,
    ordem: 0,
  } satisfies Mesa;
  const caixa = caixaDaMesa(mesa);
  const cadeiras = posicoesDasCadeiras(mesa);
  const folga = 80;
  const vb = [
    -folga,
    -folga,
    caixa.largura + folga * 2,
    caixa.altura + folga * 2,
  ].join(" ");

  return (
    <svg
      viewBox={vb}
      width={tamanho}
      height={(tamanho * (caixa.altura + folga * 2)) / (caixa.largura + folga * 2)}
      aria-hidden
    >
      {cadeiras.map((c, i) => (
        <rect
          key={i}
          x={c.x - LARGURA_CADEIRA_CM / 2}
          y={c.y - LARGURA_CADEIRA_CM / 2}
          width={LARGURA_CADEIRA_CM}
          height={LARGURA_CADEIRA_CM}
          rx={10}
          transform={`rotate(${c.angulo} ${c.x} ${c.y})`}
          fill="none"
          stroke="currentColor"
          strokeWidth={7}
        />
      ))}
      {caixa.raio != null ? (
        <circle
          cx={caixa.raio}
          cy={caixa.raio}
          r={caixa.raio}
          fill="none"
          stroke="currentColor"
          strokeWidth={7}
        />
      ) : (
        <rect
          width={caixa.largura}
          height={caixa.altura}
          rx={12}
          fill="none"
          stroke="currentColor"
          strokeWidth={7}
        />
      )}
    </svg>
  );
}

export function ModalMesa({
  proximoNumero,
  tipoEvento,
  pendente,
  aoSalvar,
  aoFechar,
}: {
  proximoNumero: number;
  /** tipo do evento — como esta festa chama a mesa 'noivos' */
  tipoEvento: string;
  pendente: boolean;
  aoSalvar: (input: {
    tipo: TipoMesa;
    rotulo: string;
    lugares: number;
    quantidade: number;
  }) => void;
  aoFechar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoMesa>("redonda_8");
  const [rotulo, setRotulo] = useState(String(proximoNumero).padStart(2, "0"));
  const [lugares, setLugares] = useState(MEDIDA_PADRAO.redonda_8.lugares);
  const [quantidade, setQuantidade] = useState(1);

  // trocar a forma repõe os lugares típicos dela (ela ainda pode ajustar)
  function escolherTipo(t: TipoMesa) {
    setTipo(t);
    setLugares(MEDIDA_PADRAO[t].lugares);
    if (t === "noivos") setRotulo(rotuloMesaPrincipalCurto(tipoEvento));
    else if (t === "bolo") setRotulo("Bolo");
    else setRotulo(String(proximoNumero).padStart(2, "0"));
  }

  useEffect(() => {
    const fecharNoEsc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", fecharNoEsc);
    return () => window.removeEventListener("keydown", fecharNoEsc);
  }, [aoFechar]);

  function salvar() {
    if (!rotulo.trim()) return;
    aoSalvar({ tipo, rotulo: rotulo.trim(), lugares, quantidade });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div
        role="dialog"
        aria-label="Adicionar mesa"
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-base font-semibold text-gray-900">Adicionar mesa</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Forma
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => escolherTipo(t)}
                  aria-pressed={tipo === t}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-colors ${
                    tipo === t
                      ? "border-gray-900 bg-gray-50 text-gray-900"
                      : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  <MiniMesa tipo={t} lugares={MEDIDA_PADRAO[t].lugares} />
                  <span
                    className={`text-[11px] leading-tight ${tipo === t ? "text-gray-900" : "text-gray-500"}`}
                  >
                    {nomeTipoMesa(t, tipoEvento)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <label className="flex-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              Nome da mesa
              <input
                autoFocus
                value={rotulo}
                onChange={(e) => setRotulo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && salvar()}
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-gray-900 focus:border-gray-500 focus:outline-none"
              />
            </label>
            <label className="w-28 text-xs font-medium uppercase tracking-wide text-gray-500">
              Cadeiras
              <input
                type="number"
                min={0}
                max={40}
                value={lugares}
                onChange={(e) => setLugares(Math.max(0, Math.min(40, Number(e.target.value))))}
                onKeyDown={(e) => e.key === "Enter" && salvar()}
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal tracking-normal text-gray-900 focus:border-gray-500 focus:outline-none"
              />
            </label>
          </div>

          {/* prévia do que vai entrar no salão */}
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-gray-400">
            <MiniMesa tipo={tipo} lugares={lugares} tamanho={64} />
            <p className="text-xs text-gray-500">
              {caixaDaMesa({
                tipo,
                xCm: 0,
                yCm: 0,
                larguraCm: null,
                alturaCm: null,
              }).raio != null
                ? `${MEDIDA_PADRAO[tipo].largura / 100} m de diâmetro`
                : `${MEDIDA_PADRAO[tipo].largura / 100} × ${MEDIDA_PADRAO[tipo].altura / 100} m`}
              {lugares > 0 && ` · ${lugares} ${lugares === 1 ? "lugar" : "lugares"}`}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            Adicionar
            <input
              type="number"
              min={1}
              max={30}
              value={quantidade}
              onChange={(e) => setQuantidade(Math.max(1, Math.min(30, Number(e.target.value))))}
              onKeyDown={(e) => e.key === "Enter" && salvar()}
              className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
            />
            {quantidade === 1 ? "mesa" : "mesas iguais"}
            {quantidade > 1 && (
              <span className="text-xs text-gray-400">numeradas em sequência</span>
            )}
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={pendente || !rotulo.trim()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
