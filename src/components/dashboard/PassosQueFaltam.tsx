// Os passos que faltam, num bloco compacto no topo do painel (handoff
// "Dashboard · primeiro acesso": com 1 evento ou mais, fornecedores e
// equipe ficam aqui até serem feitos ou dispensados). Some sozinho quando
// ela cadastra o primeiro fornecedor e convida a primeira pessoa.

import Link from "next/link";
import { dispensarPassos } from "@/app/(app)/eventos/dashboard/actions";

const PASSOS = {
  fornecedores: {
    titulo: "Traga seus fornecedores",
    texto: "Buffet, decoração, foto. Cadastre uma vez e use em todos os eventos.",
    acao: "Cadastrar fornecedor",
    href: "/fornecedores",
  },
  equipe: {
    titulo: "Convide sua equipe",
    texto: "Assessoras e recepcionistas recebem as tarefas no celular.",
    acao: "Convidar pessoa",
    href: "/cerimonialistas",
  },
};

export function PassosQueFaltam({
  passos,
}: {
  passos: { fornecedores: boolean; equipe: boolean };
}) {
  const lista = (["fornecedores", "equipe"] as const).filter((k) => passos[k]).map((k) => PASSOS[k]);
  if (lista.length === 0) return null;

  return (
    <section
      aria-label="Próximos passos"
      style={{ background: "#fff", border: "1px solid #E6E0D8", borderRadius: 14, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "var(--font-mono), 'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#6E7F63" }}>
          PRÓXIMOS PASSOS
        </span>
        <form action={dispensarPassos}>
          <button
            type="submit"
            className="pa-pular"
            style={{ padding: "4px 8px", borderRadius: 6, border: 0, background: "transparent", fontFamily: "inherit", fontSize: 12, color: "#78716C", cursor: "pointer" }}
          >
            Dispensar
          </button>
        </form>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px 24px" }}>
        {lista.map((p) => (
          <div key={p.href} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: "1 1 200px" }}>
              <span style={{ fontFamily: "var(--font-title), Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "#221E1B" }}>{p.titulo}</span>
              <span style={{ fontSize: 12, lineHeight: 1.4, color: "#57534E" }}>{p.texto}</span>
            </span>
            <Link href={p.href} style={{ flex: "none", fontSize: 13, fontWeight: 600, color: "#3B3835", whiteSpace: "nowrap" }}>
              {p.acao} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
