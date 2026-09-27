"use client";

// O roteiro do dia andando com a rolagem (27/09/2026, pedido do dono: "a
// cada rolagem vai guiando e encantando"). A lista é a do Roteiro do dia
// do sistema — hora, duração, categoria, fornecedor e o estado de cada
// item (Concluído, Em andamento com AGORA, Problema reportado,
// Planejado), com o progresso "X de Y itens concluídos" ao lado. Os itens
// e os fornecedores são os do casamento da conta-vitrine.

import { trecho, useRolagem } from "./useRolagem";

type Item = { h: string; dur: string; titulo: string; cat: string; forn: string; problema?: string };

const ITENS: Item[] = [
  { h: "10:30", dur: "1h30", titulo: "Montagem da decoração", cat: "Decoração", forn: "Cenário Vivo Decorações" },
  { h: "13:00", dur: "2h", titulo: "Buffet inicia a montagem", cat: "Buffet", forn: "Buffet Villa Gourmet" },
  { h: "15:30", dur: "1h", titulo: "Chegada da equipe de foto e vídeo", cat: "Fotografia", forn: "Estúdio Luz & Lente" },
  { h: "16:30", dur: "30min", titulo: "Prova de som com o DJ", cat: "Música", forn: "DJ Rafael Prado" },
  {
    h: "17:00",
    dur: "30min",
    titulo: "Chegada dos bem-casados",
    cat: "Lembrancinhas",
    forn: "Doce Encanto Bem-casados",
    problema: "van parada no trânsito, chega 30 min depois",
  },
  { h: "18:00", dur: "1h", titulo: "Portaria e recepção dos convidados", cat: "Segurança", forn: "Alerta Serviços" },
  { h: "19:00", dur: "45min", titulo: "Cerimônia", cat: "Cerimônia", forn: "Celebrante Paulo Andrade" },
  { h: "20:15", dur: "1h15", titulo: "Abertura do jantar", cat: "Buffet", forn: "Buffet Villa Gourmet" },
  { h: "21:30", dur: "30min", titulo: "Valsa e dança dos noivos", cat: "Música", forn: "DJ Rafael Prado" },
  { h: "22:00", dur: "15min", titulo: "Corte do bolo", cat: "Fotografia", forn: "Estúdio Luz & Lente" },
  { h: "22:15", dur: "3h", titulo: "Pista liberada", cat: "Música", forn: "DJ Rafael Prado" },
];

const ALTURA_ITEM = 136; // px de cada cartão com o espaço entre eles

const CSS = `
.ra{position:relative;height:340vh;background:#F2EEE9;border-top:1px solid rgba(34,30,27,.1)}
.ra-fixo{position:sticky;top:0;height:100vh;overflow:hidden}
.ra-in{max-width:1200px;height:100%;margin:0 auto;padding:96px 32px 32px;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:56px;align-items:center}
.ra-txt{display:flex;flex-direction:column;gap:18px}
.ra-txt>p:first-child{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#6E2E34}
.ra-txt h2{font:400 clamp(32px,4vw,50px)/1.08 var(--eo-serif);letter-spacing:-.01em}
.ra-txt>p{font-size:17px;line-height:1.6;color:#4A443F;font-weight:300;max-width:440px}
.ra-prog{display:flex;align-items:center;gap:18px;margin-top:10px;background:#fff;border:1px solid rgba(34,30,27,.1);border-radius:14px;padding:16px 20px;max-width:360px;font-family:var(--font-ui),system-ui,sans-serif}
.ra-prog b{font-size:28px;font-weight:700;color:#221E1B;display:block;line-height:1}
.ra-prog small{font-size:13px;color:#6B6259}
.ra-lista{position:relative;height:min(74vh,640px);overflow:hidden;-webkit-mask-image:linear-gradient(transparent,#000 12%,#000 82%,transparent);mask-image:linear-gradient(transparent,#000 12%,#000 82%,transparent);font-family:var(--font-ui),system-ui,sans-serif}
.ra-trilho{position:absolute;left:14px;top:0;bottom:0;width:2px;background:rgba(34,30,27,.1)}
.ra-mover{position:absolute;left:0;right:0;top:0;transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.ra-item{position:relative;height:${ALTURA_ITEM - 12}px;margin:0 0 12px 38px;background:#fff;border:1px solid #E6E0D8;border-radius:12px;padding:12px 16px;display:flex;flex-direction:column;gap:6px;overflow:hidden;transition:border-color .3s,box-shadow .3s,opacity .3s}
.ra-item[data-e="agora"]{border-color:#7C6FE0;box-shadow:0 0 0 3px rgba(124,111,224,.15)}
.ra-item[data-e="plan"]{opacity:.78}
.ra-ponto{position:absolute;left:-31px;top:16px;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #CFC8BF}
.ra-item[data-e="ok"] .ra-ponto{background:#2E9D5B;border-color:#2E9D5B}
.ra-item[data-e="agora"] .ra-ponto{background:#5B4BD1;border-color:#5B4BD1;box-shadow:0 0 0 5px rgba(91,75,209,.18)}
.ra-item[data-e="prob"] .ra-ponto{background:#D0433A;border-color:#D0433A}
.ra-l1{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ra-hora{background:#2A2622;color:#fff;font-weight:700;font-size:14px;padding:3px 8px;border-radius:6px}
.ra-item[data-e="agora"] .ra-hora{background:#5B4BD1}
.ra-dur{font-size:12px;color:#928A81}
.ra-tit{font-size:15.5px;font-weight:600;color:#221E1B}
.ra-cat{font-size:11.5px;color:#5B4BD1;background:#EFEDFB;padding:2px 8px;border-radius:6px}
.ra-agora{font-size:11px;font-weight:700;color:#fff;background:#5B4BD1;padding:3px 8px;border-radius:6px;letter-spacing:.04em}
.ra-forn{font-size:13px;color:#6B6259}
.ra-est{flex:none;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px}
.ra-est[data-e="ok"]{background:#E6F5EC;color:#1E7B42}
.ra-est[data-e="agora"]{background:#E7EDFD;color:#2F55C4}
.ra-est[data-e="prob"]{background:#FCE7E6;color:#B8322A}
.ra-est[data-e="plan"]{background:#F2EEE9;color:#6B6259}
.ra-l3{display:flex;align-items:center;gap:10px;min-width:0}
.ra-obs{font-size:12px;color:#8A3A33;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:900px){
  .ra{height:300vh}
  .ra-in{grid-template-columns:1fr;gap:18px;padding:76px 18px 18px;align-content:start}
  .ra-txt{gap:10px}
  .ra-txt>p{font-size:15px}
  .ra-prog{padding:10px 14px}
  .ra-lista{height:56vh}
}
@media (prefers-reduced-motion:reduce){.ra-mover,.ra-item{transition:none}}
`;

type Estado = "ok" | "agora" | "prob" | "plan";
const ROTULO: Record<Estado, string> = {
  ok: "✓ Concluído",
  agora: "◐ Em andamento",
  prob: "! Problema reportado",
  plan: "Planejado",
};

export function RoteiroAoVivo() {
  const [ref, p] = useRolagem<HTMLElement>();
  const q = trecho(p, 0.2, 0.8);
  const agora = Math.min(ITENS.length - 1, Math.floor(q * ITENS.length));
  const estado = (i: number): Estado => {
    if (i === agora) return "agora";
    if (i < agora) return ITENS[i].problema ? "prob" : "ok";
    return "plan";
  };
  const feitos = ITENS.filter((_, i) => i < agora).length;
  const pct = Math.round((feitos / ITENS.length) * 100);
  // o item de agora fica no terço de cima da lista
  const desloca = Math.max(0, agora - 1) * ALTURA_ITEM;

  return (
    <section className="ra" ref={ref} aria-label="O roteiro do dia">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ra-fixo">
        <div className="ra-in">
          <div className="ra-txt">
            <p>Roteiro do dia</p>
            <h2>O dia inteiro, na ordem, com quem faz cada coisa.</h2>
            <p>
              Cada item diz a hora, o fornecedor e como está. Quem teve um problema avisa pelo link dele, e o aviso
              chega para você na hora.
            </p>
            <div className="ra-prog">
              <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden>
                <circle cx="27" cy="27" r="22" fill="none" stroke="#E6E0D8" strokeWidth="6" />
                <circle
                  cx="27"
                  cy="27"
                  r="22"
                  fill="none"
                  stroke="#2E9D5B"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * 138.2} 138.2`}
                  transform="rotate(-90 27 27)"
                />
              </svg>
              <div>
                <b>{pct}%</b>
                <small>
                  {feitos} de {ITENS.length} itens concluídos
                </small>
              </div>
            </div>
          </div>
          <div className="ra-lista">
            <div className="ra-trilho" />
            <div className="ra-mover" style={{ transform: `translateY(${-desloca}px)` }}>
              {ITENS.map((it, i) => {
                const e = estado(i);
                return (
                  <div key={it.h + it.titulo} className="ra-item" data-e={e}>
                    <span className="ra-ponto" />
                    <div className="ra-l1">
                      <span className="ra-hora">{it.h}</span>
                      <span className="ra-dur">{it.dur}</span>
                      <span className="ra-tit">{it.titulo}</span>
                      <span className="ra-cat">{it.cat}</span>
                      {e === "agora" ? <span className="ra-agora">AGORA</span> : null}
                    </div>
                    <span className="ra-forn">{it.forn}</span>
                    <div className="ra-l3">
                      <span className="ra-est" data-e={e}>
                        {ROTULO[e]}
                      </span>
                      {e === "prob" && it.problema ? <span className="ra-obs">{it.problema}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
