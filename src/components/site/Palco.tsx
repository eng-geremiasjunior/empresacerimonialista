"use client";

// O palco (27/09/2026, pedido do dono com a wedy.com/negocios de
// referência): o dia da festa, com luz de palco que acompanha a rolagem.
// Os feixes giram conforme a seção passa, o foco anda pela foto e os
// avisos do sistema chegam um a um, como chegam para a cerimonialista no
// dia — com os nomes e os textos do roteiro da conta-vitrine.

/* eslint-disable @next/next/no-img-element */
import { trecho, useRolagem } from "./useRolagem";

const AVISOS: { de: number; cor: string; titulo: string; nota: string; lugar: string }[] = [
  { de: 0.3, cor: "#6E7F63", titulo: "Buffet Villa Gourmet confirmou", nota: "13:00 · Buffet inicia a montagem", lugar: "pa-a" },
  { de: 0.42, cor: "#A5813C", titulo: "Doce Encanto reportou um problema", nota: "van parada no trânsito, chega 30 min depois", lugar: "pa-b" },
  { de: 0.54, cor: "#6E7F63", titulo: "Isabelly viu o roteiro no portal", nota: "agora · cliente", lugar: "pa-c" },
];

const CSS = `
.pa{position:relative;height:230vh;background:#0E0A0B;color:#FAF8F5}
.pa-fixo{position:sticky;top:0;height:100vh;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;padding:88px 20px 40px}
.pa-luz{position:absolute;top:-12vh;width:44vw;height:130vh;transform-origin:50% 0;filter:blur(18px);pointer-events:none;mix-blend-mode:screen}
.pa-luz1{left:4vw;background:conic-gradient(from 180deg at 50% 0,rgba(214,150,196,.62) 0deg,transparent 13deg,transparent 347deg,rgba(214,150,196,.62) 360deg)}
.pa-luz2{right:4vw;background:conic-gradient(from 180deg at 50% 0,rgba(255,236,214,.5) 0deg,transparent 10deg,transparent 350deg,rgba(255,236,214,.5) 360deg)}
.pa-cab{position:relative;z-index:3;text-align:center;display:flex;flex-direction:column;gap:12px;max-width:760px}
.pa-cab p{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#C9A9BC}
.pa-cab h2{font:400 clamp(32px,4.4vw,54px)/1.08 var(--eo-serif);letter-spacing:-.01em}
.pa-quadro{position:relative;z-index:2;width:min(880px,100%);aspect-ratio:16/10;border-radius:28px;overflow:visible}
.pa-foto{position:absolute;inset:0;border-radius:28px;overflow:hidden;border:1px solid rgba(250,248,245,.14);box-shadow:0 40px 120px rgba(0,0,0,.6)}
.pa-foto img{width:100%;height:100%;object-fit:cover;object-position:50% 38%;filter:brightness(.62) saturate(1.05)}
.pa-foco{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen}
.pa-tag{position:absolute;left:28px;top:26px;font-size:14px;padding:8px 14px;border-radius:10px;background:rgba(250,248,245,.12);backdrop-filter:blur(6px)}
.pa-rodape{position:absolute;left:28px;right:28px;bottom:26px;display:flex;flex-direction:column;gap:6px}
.pa-rodape b{font:400 clamp(24px,3vw,36px)/1.05 var(--eo-serif)}
.pa-rodape span{font-size:16px;color:rgba(250,248,245,.8)}
.pa-barra{height:3px;border-radius:9px;background:rgba(250,248,245,.2);margin-top:12px;overflow:hidden}
.pa-barra i{display:block;height:100%;background:#FAF8F5;transform-origin:left}
.pa-aviso{position:absolute;z-index:3;display:flex;gap:12px;align-items:flex-start;background:#FAF8F5;color:#221E1B;border-radius:14px;padding:14px 16px;width:300px;box-shadow:0 20px 50px rgba(0,0,0,.45);transition:opacity .5s ease,transform .6s cubic-bezier(.2,.8,.2,1)}
.pa-aviso i{width:9px;height:9px;border-radius:50%;margin-top:6px;flex:none}
.pa-aviso b{display:block;font-size:14.5px;font-weight:500}
.pa-aviso small{display:block;font-size:12.5px;color:#6B6259;margin-top:3px}
.pa-a{left:-12%;top:18%}
.pa-b{right:-10%;top:42%}
.pa-c{left:6%;bottom:-8%}
@media (max-width:760px){
  .pa{height:200vh}
  .pa-quadro{aspect-ratio:4/5}
  .pa-aviso{width:250px;padding:11px 13px}
  .pa-a{left:-2%;top:4%}
  .pa-b{right:-2%;top:29%}
  .pa-c{left:2%;top:55%;bottom:auto}
  .pa-luz{width:80vw}
}
@media (prefers-reduced-motion:reduce){.pa-aviso{transition:none}}
`;

export function Palco() {
  const [ref, p] = useRolagem<HTMLElement>();
  // a seção prende por 130vh: o "palco" é o miolo da rolagem
  const q = trecho(p, 0.18, 0.82);
  const giro1 = -22 + 38 * q;
  const giro2 = 20 - 36 * q;
  const focoX = 25 + 50 * q;

  return (
    <section className="pa" ref={ref} aria-label="O dia do evento">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="pa-fixo">
        <div className="pa-luz pa-luz1" style={{ transform: `rotate(${giro1}deg)`, opacity: 0.35 + 0.65 * trecho(p, 0.1, 0.3) }} />
        <div className="pa-luz pa-luz2" style={{ transform: `rotate(${giro2}deg)`, opacity: 0.3 + 0.7 * trecho(p, 0.15, 0.35) }} />
        <div className="pa-cab" style={{ opacity: trecho(p, 0.08, 0.22), transform: `translateY(${(1 - trecho(p, 0.08, 0.22)) * 24}px)` }}>
          <p>No dia do evento</p>
          <h2>Cada um sabe a hora dele. Você sabe de tudo.</h2>
        </div>
        <div className="pa-quadro">
          <div className="pa-foto">
            <img src="/site/foto-palco.webp" alt="Noiva dançando com os convidados na pista" loading="lazy" />
            <div
              className="pa-foco"
              style={{ background: `radial-gradient(38% 55% at ${focoX}% 42%, rgba(255,240,225,.32), transparent 70%)` }}
            />
            <span className="pa-tag">Casamento</span>
            <div className="pa-rodape">
              <b>Isabelly e Jonas</b>
              <span>Acontecendo agora</span>
              <div className="pa-barra">
                <i style={{ transform: `scaleX(${0.08 + 0.92 * q})` }} />
              </div>
            </div>
          </div>
          {AVISOS.map((a) => {
            const v = trecho(p, a.de, a.de + 0.06);
            return (
              <div
                key={a.titulo}
                className={`pa-aviso ${a.lugar}`}
                style={{ opacity: v, transform: `translateY(${(1 - v) * 26}px) scale(${0.96 + 0.04 * v})` }}
              >
                <i style={{ background: a.cor }} />
                <div>
                  <b>{a.titulo}</b>
                  <small>{a.nota}</small>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
