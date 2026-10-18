"use client";

// O que entra na folha do evento: as seções e "sem valores". Fica no
// endereço (?fora=…&semvalores=1) para a folha recarregar já certa, e não
// sai no papel (imp-acoes some na impressão).

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const SECOES = [
  { id: "fornecedores", rotulo: "Fornecedores" },
  { id: "planejamento", rotulo: "Planejamento" },
  { id: "tarefas", rotulo: "Tarefas" },
  { id: "roteiro", rotulo: "Roteiro do dia" },
  { id: "cerimonia", rotulo: "Cerimônia" },
  { id: "convidados", rotulo: "Convidados" },
  { id: "pagamentos", rotulo: "Pagamentos" },
] as const;

export function EscolhaDaFolha() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const params = useSearchParams();
  const fora = new Set((params?.get("fora") ?? "").split(",").filter(Boolean));
  const semValores = params?.get("semvalores") === "1";

  const ir = (novoFora: Set<string>, novoSem: boolean) => {
    const q = new URLSearchParams();
    if (novoFora.size) q.set("fora", [...novoFora].join(","));
    if (novoSem) q.set("semvalores", "1");
    router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "center", fontSize: 13, color: "#44403c" }}>
      {SECOES.map((s) => (
        <label key={s.id} style={{ display: "inline-flex", gap: 5, alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!fora.has(s.id)}
            onChange={(e) => {
              const n = new Set(fora);
              if (e.target.checked) n.delete(s.id);
              else n.add(s.id);
              ir(n, semValores);
            }}
          />
          {s.rotulo}
        </label>
      ))}
      <label style={{ display: "inline-flex", gap: 5, alignItems: "center", cursor: "pointer", fontWeight: 600 }}>
        <input type="checkbox" checked={semValores} onChange={(e) => ir(fora, e.target.checked)} />
        Sem valores
      </label>
    </div>
  );
}
