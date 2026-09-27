"use client";

// "Conheça o eOrganizei por dentro" (27/09/2026, pedido do dono: "como vão
// indicar para as clientes se nem elas sabem como funciona por dentro").
// Três portas: o evento pronto, o portal da noiva e o da debutante, os dois
// abertos como a cliente vê, com o login dela, nos eventos de exemplo.
//
// No painel aparece para a conta nova (ou enquanto houver exemplo) e sai no
// "Agora não" (marca no navegador). Na Ajuda fica sempre.

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { verExemplo } from "@/app/(app)/eventos/exemplo-actions";
import { AbrirPortalDoExemplo } from "./AbrirPortalDoExemplo";

const MARCA = "eorg-conheca-por-dentro-fechado";

const cartao =
  "flex h-full w-full flex-col items-start gap-1.5 rounded-xl border border-[#E6E0D8] bg-white p-4 text-left transition hover:border-[#6E3F5F] hover:shadow-sm disabled:opacity-60";

function Conteudo({ titulo, texto, acao }: { titulo: string; texto: string; acao: string }) {
  return (
    <>
      <span className="text-[15px] font-semibold text-[#221E1B]">{titulo}</span>
      <span className="text-[13px] leading-snug text-[#6B6259]">{texto}</span>
      <span className="mt-auto pt-2 text-[13px] font-semibold text-[#6E3F5F]">{acao} →</span>
    </>
  );
}

export function ConhecaPorDentro({
  exemploCasamento,
  dispensavel = true,
}: {
  /** o id do exemplo de casamento, se existir */
  exemploCasamento: string | null;
  /** no painel sai no "Agora não"; na Ajuda fica */
  dispensavel?: boolean;
}) {
  const [fechado, setFechado] = useState(dispensavel);
  const [indo, iniciar] = useTransition();

  useEffect(() => {
    if (!dispensavel) return;
    try {
      setFechado(localStorage.getItem(MARCA) === "1");
    } catch {
      setFechado(false);
    }
  }, [dispensavel]);

  if (fechado) return null;

  return (
    <section className="rounded-2xl border border-[#E6E0D8] bg-[#FAF8F5] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-[#221E1B]">Conheça o eOrganizei por dentro</h2>
          <p className="mt-0.5 text-[13px] text-[#6B6259]">Veja o que as suas clientes veem antes de mostrar para elas.</p>
        </div>
        {dispensavel ? (
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(MARCA, "1");
              } catch {
                /* sem armazenamento: some só nesta tela */
              }
              setFechado(true);
            }}
            className="rounded-md px-2 py-1 text-xs text-[#928A81] hover:bg-[#F2EEE9] hover:text-[#221E1B]"
          >
            Agora não
          </button>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {exemploCasamento ? (
          <Link href={`/eventos/${exemploCasamento}/roteiro`} className={cartao}>
            <Conteudo
              titulo="Um evento pronto"
              texto="Um casamento preenchido: planejamento, roteiro do dia, fornecedores e financeiro."
              acao="Abrir o exemplo"
            />
          </Link>
        ) : (
          <button type="button" className={cartao} disabled={indo} onClick={() => iniciar(() => verExemplo("casamento"))}>
            <Conteudo
              titulo="Um evento pronto"
              texto="Um casamento preenchido: planejamento, roteiro do dia, fornecedores e financeiro."
              acao={indo ? "Preparando…" : "Abrir o exemplo"}
            />
          </button>
        )}
        <AbrirPortalDoExemplo modelo="casamento" className={cartao} envolver="flex flex-col gap-1">
          <Conteudo
            titulo="O portal da noiva"
            texto="Como a sua cliente vê: as escolhas, os convidados, a noite e o dinheiro da festa."
            acao="Ver como a noiva vê"
          />
        </AbrirPortalDoExemplo>
        <AbrirPortalDoExemplo modelo="debutante" className={cartao} envolver="flex flex-col gap-1">
          <Conteudo
            titulo="O portal da debutante"
            texto="A família dos 15 anos: a corte, as 15 velas, a trilha e a noite."
            acao="Ver como a família vê"
          />
        </AbrirPortalDoExemplo>
      </div>
    </section>
  );
}
