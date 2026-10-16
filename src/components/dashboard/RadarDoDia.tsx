import Link from "next/link";

// O Dashboard em cartões (16/10/2026, pedido dele com o Google Ads de
// referência): camadas brancas, cada uma com um assunto, sobre o fundo da
// moldura; o filtro de evento no alto deixa tudo dinâmico. As linhas falam
// em tempo ("há 3 dias", "sáb 17"), nunca em status.

export type LinhaDoRadar = { chave: string; quando: string; destaque?: boolean; evento?: string | null; texto: string; href: string };

export const CSS_DO_DASHBOARD = `
.db-grade{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;font-family:var(--font-ui),"Instrument Sans",sans-serif}
.db-largo{grid-column:span 2}
.db-inteiro{grid-column:1 / -1}
.db-cartao{background:#fff;border:1px solid var(--mo-linha,#E6E0D8);border-radius:8px;display:flex;flex-direction:column;min-width:0}
.db-cabeca{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid var(--mo-linha,#E6E0D8)}
.db-cabeca h2{margin:0;font-size:13px;font-weight:600;color:var(--mo-tinta,#221E1B)}
.db-conta{font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:12px;color:var(--mo-cinza-2,#928A81)}
.db-corpo{padding:4px 16px 8px;flex:1}
.db-pe{padding:10px 16px;border-top:1px solid var(--mo-linha,#E6E0D8)}
.db-pe a{font-size:13px;font-weight:600;color:var(--mo-tinta,#221E1B);text-decoration:none}
.db-pe a:hover{text-decoration:underline;text-underline-offset:3px}
.db-lista{list-style:none;margin:0;padding:0}
.db-lista li a{display:grid;grid-template-columns:78px 1fr;gap:10px;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--mo-linha,#E6E0D8);
  text-decoration:none;color:var(--mo-tinta,#221E1B);font-size:14px}
.db-lista li:last-child a{border-bottom:0}
.db-lista li a:hover .db-texto{text-decoration:underline;text-underline-offset:3px}
.db-quando{font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:12.5px;color:var(--mo-cinza-1,#6B6259)}
.db-quando.forte{color:var(--mo-tinta,#221E1B);font-weight:500}
.db-evento{display:block;font-size:12px;font-weight:600;color:var(--mo-cinza-1,#6B6259);margin-bottom:1px}
.db-vazio{margin:0;padding:14px 0;font-size:14px;color:var(--mo-cinza-1,#6B6259)}
.db-duas{display:grid;grid-template-columns:1fr 1fr;gap:0 28px}
.db-sub{margin:12px 0 2px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--mo-cinza-2,#928A81)}
.db-numeros{display:grid;grid-template-columns:1fr;gap:0}
.db-numero{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:12px 0;border-bottom:1px solid var(--mo-linha,#E6E0D8)}
.db-numero:last-child{border-bottom:0}
.db-numero span{font-size:13px;color:var(--mo-cinza-1,#6B6259)}
.db-numero b{font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:18px;font-weight:500;color:var(--mo-tinta,#221E1B)}
.db-filtro{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mo-cinza-1,#6B6259)}
.db-filtro select{border:1px solid var(--mo-linha,#E6E0D8);border-radius:6px;background:#fff;padding:6px 10px;font:inherit;font-size:13px;color:var(--mo-tinta,#221E1B);max-width:260px}
@media (max-width:1100px){.db-grade{grid-template-columns:1fr 1fr}.db-largo{grid-column:1 / -1}}
@media (max-width:760px){.db-grade{grid-template-columns:1fr}.db-largo,.db-inteiro{grid-column:auto}.db-duas{grid-template-columns:1fr}}
`;

export function Cartao({
  titulo,
  conta,
  pe,
  classe,
  children,
}: {
  titulo: string;
  conta?: number;
  pe?: { href: string; rotulo: string };
  classe?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`db-cartao ${classe ?? ""}`} aria-label={titulo}>
      <div className="db-cabeca">
        <h2>{titulo}</h2>
        {conta !== undefined && conta > 0 && <span className="db-conta">{conta}</span>}
      </div>
      <div className="db-corpo">{children}</div>
      {pe && (
        <div className="db-pe">
          <Link href={pe.href}>{pe.rotulo} →</Link>
        </div>
      )}
    </section>
  );
}

export function ListaDoRadar({ linhas, vazio }: { linhas: LinhaDoRadar[]; vazio: string }) {
  if (linhas.length === 0) return <p className="db-vazio">{vazio}</p>;
  return (
    <ul className="db-lista">
      {linhas.map((l) => (
        <li key={l.chave}>
          <Link href={l.href}>
            <span className={`db-quando ${l.destaque ? "forte" : ""}`}>{l.quando}</span>
            <span>
              {l.evento && <span className="db-evento">{l.evento}</span>}
              <span className="db-texto">{l.texto}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
