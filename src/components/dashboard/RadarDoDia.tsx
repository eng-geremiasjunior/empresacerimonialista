import Link from "next/link";

// O radar do Dashboard (16/10/2026, desenho 7a do handoff
// design_handoff_eorganizei): linhas finas, sem cartão. "Esperando
// resposta" e "Atrasado" vêm dos prazos do Copiloto (a fonte única);
// "Próximos 7 dias" junta as tarefas e os eventos da semana. Sempre em
// tempo ("há 3 dias", "sáb 17"), nunca em status.

export type LinhaDoRadar = { chave: string; quando: string; destaque?: boolean; evento?: string | null; texto: string; href: string };

const CSS = `
.rd{display:flex;flex-direction:column;gap:26px;font-family:var(--font-ui),"Instrument Sans",sans-serif}
.rd h2{margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--mo-cinza-2,#928A81)}
.rd ul{list-style:none;margin:0;padding:0;border-top:1px solid var(--mo-tinta,#221E1B)}
.rd li a{display:grid;grid-template-columns:90px 190px 1fr;gap:12px;align-items:baseline;padding:11px 0;border-bottom:1px solid var(--mo-linha,#E6E0D8);
  text-decoration:none;color:var(--mo-tinta,#221E1B);font-size:14px}
.rd ul.so-texto li a{grid-template-columns:90px 1fr}
.rd li a:hover .rd-texto{text-decoration:underline;text-underline-offset:3px}
.rd-quando{font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:13px;color:var(--mo-cinza-1,#6B6259)}
.rd-quando.forte{color:var(--mo-tinta,#221E1B);font-weight:500}
.rd-evento{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rd-texto{color:var(--mo-tinta,#221E1B)}
.rd-vazio{margin:0;padding:11px 0;border-top:1px solid var(--mo-tinta,#221E1B);font-size:14px;color:var(--mo-cinza-1,#6B6259)}
@media (max-width:760px){
  .rd li a{grid-template-columns:1fr;gap:2px}
  .rd-quando,.rd-evento{font-size:12px}
}
`;

function Bloco({ titulo, linhas, vazio }: { titulo: string; linhas: LinhaDoRadar[]; vazio?: string }) {
  if (linhas.length === 0 && !vazio) return null;
  return (
    <section aria-label={titulo}>
      <h2>{titulo}</h2>
      {linhas.length === 0 ? (
        <p className="rd-vazio">{vazio}</p>
      ) : (
        <ul className={linhas.every((l) => !l.evento) ? "so-texto" : undefined}>
          {linhas.map((l) => (
            <li key={l.chave}>
              <Link href={l.href}>
                <span className={`rd-quando ${l.destaque ? "forte" : ""}`}>{l.quando}</span>
                {l.evento ? <span className="rd-evento">{l.evento}</span> : null}
                <span className="rd-texto">{l.texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RadarDoDia({
  esperando,
  atrasado,
  semana,
}: {
  esperando: LinhaDoRadar[];
  atrasado: LinhaDoRadar[];
  semana: LinhaDoRadar[];
}) {
  return (
    <div className="rd">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Bloco titulo="Esperando resposta" linhas={esperando} />
      <Bloco titulo="Atrasado" linhas={atrasado} />
      <Bloco titulo="Próximos 7 dias" linhas={semana} vazio="Nada marcado para esta semana." />
    </div>
  );
}
